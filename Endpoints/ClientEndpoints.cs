using Microsoft.EntityFrameworkCore;
using ProspectCRM.Data;
using ProspectCRM.Extensions;
using ProspectCRM.Models;
using ProspectCRM.Services;
using System.Security.Claims;

namespace ProspectCRM.Endpoints;

public static class ClientEndpoints
{
    public static void MapClientEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/clients").WithTags("Clients");

        group.MapGet("/", async (AppDbContext db, ClaimsPrincipal caller, int? agentId) =>
        {
            IQueryable<Client> query = db.Clients;

            if (caller.IsAdmin())
            {
                if (agentId.HasValue) query = query.Where(c => c.AgentId == agentId.Value);
            }
            else
            {
                query = query.Where(c => c.AgentId == caller.GetUserId());
            }

            var clients = await query.ToListAsync();
            return Results.Ok(clients);
        }).RequireAuthorization();

        // Policies expiring within the next N days (default 30) — powers the
        // notification bell. Returned with the owning customer's name attached,
        // since the raw Client entity has no navigation property to Customer.
        group.MapGet("/expiring", async (AppDbContext db, ClaimsPrincipal caller, int? agentId, int withinDays = 30) =>
        {
            var today = DateTime.UtcNow.Date;
            var cutoff = today.AddDays(withinDays);

            IQueryable<Client> query = db.Clients.Where(c =>
                c.PolicyExpiryDate != null &&
                c.PolicyExpiryDate.Value.Date >= today &&
                c.PolicyExpiryDate.Value.Date <= cutoff);

            if (caller.IsAdmin())
            {
                if (agentId.HasValue) query = query.Where(c => c.AgentId == agentId.Value);
            }
            else
            {
                query = query.Where(c => c.AgentId == caller.GetUserId());
            }

            var policies = await query.OrderBy(c => c.PolicyExpiryDate).ToListAsync();

            var customerIds = policies.Where(p => p.CustomerId.HasValue).Select(p => p.CustomerId!.Value).Distinct().ToList();
            var customerNames = await db.Customers
                .Where(cu => customerIds.Contains(cu.Id))
                .ToDictionaryAsync(cu => cu.Id, cu => cu.Name);

            var result = policies.Select(p => new ExpiringPolicyDto(
                p.Id,
                p.CustomerId.HasValue && customerNames.TryGetValue(p.CustomerId.Value, out var name) ? name : "Unknown",
                p.InsuredPersonName ?? p.InsuredName,
                p.ProductName,
                p.PolicyNo,
                p.PolicyExpiryDate
            ));

            return Results.Ok(result);
        }).RequireAuthorization();

        // All policies belonging to one customer — powers the customer's
        // expanded policy list on the Clients Board.
        group.MapGet("/by-customer/{customerId:int}", async (int customerId, AppDbContext db, ClaimsPrincipal caller) =>
        {
            var customer = await db.Customers.FindAsync(customerId);
            if (customer is null) return Results.NotFound();
            if (!caller.IsAdmin() && customer.AgentId != caller.GetUserId()) return Results.Forbid();

            var policies = await db.Clients
                .Where(c => c.CustomerId == customerId)
                .ToListAsync();

            return Results.Ok(policies);
        }).RequireAuthorization();

        // An Agent may only fetch their own client; an Admin may fetch any.
        group.MapGet("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller) =>
        {
            var client = await db.Clients.FindAsync(id);
            if (client is null) return Results.NotFound();
            if (!caller.IsAdmin() && client.AgentId != caller.GetUserId()) return Results.Forbid();

            return Results.Ok(client);
        }).RequireAuthorization();

        group.MapPost("/", async (AppDbContext db, CreateClientRequest request, ClaimsPrincipal caller) =>
        {
            if (string.IsNullOrWhiteSpace(request.InsuredName))
            {
                return Results.BadRequest("Insured name is required.");
            }

            // Only enforced on brand-new policies — editing an existing one
            // (which may legitimately have been issued before this rule
            // existed) skips this check; see the PUT handler below.
            if (request.PolicyIssueDate.HasValue && request.PolicyIssueDate.Value.Date < DateTime.UtcNow.Date)
            {
                return Results.BadRequest("Policy issue date cannot be in the past.");
            }

            if (request.PolicyExpiryDate.HasValue && request.PolicyIssueDate.HasValue
                && request.PolicyExpiryDate.Value.Date < request.PolicyIssueDate.Value.Date)
            {
                return Results.BadRequest("Policy expiry date cannot be before the issue date.");
            }

            var customer = await db.Customers.FindAsync(request.CustomerId);
            if (customer is null)
            {
                return Results.BadRequest("The selected customer does not exist.");
            }
            if (!caller.IsAdmin() && customer.AgentId != caller.GetUserId())
            {
                return Results.Forbid();
            }

            var newClient = new Client
            {
                AgentId = caller.GetUserId(),
                CustomerId = request.CustomerId,
                InsuredPersonName = string.IsNullOrWhiteSpace(request.InsuredPersonName)
                    ? request.InsuredName
                    : request.InsuredPersonName,
                InsuranceCompany = request.InsuranceCompany,
                ProductName = request.ProductName,
                SponsorDetails = request.SponsorDetails,
                InsuredName = request.InsuredName,
                PolicyIssueDate = request.PolicyIssueDate,
                PolicyExpiryDate = request.PolicyExpiryDate,
                PolicyNo = request.PolicyNo,
                ModeOfPayment = request.ModeOfPayment,
                Remarks = request.Remarks,
            };

            ApplyCalculatedFinancials(newClient, request);

            db.Clients.Add(newClient);
            await db.SaveChangesAsync();

            return Results.Created($"/api/clients/{newClient.Id}", newClient);
        }).RequireAuthorization();

        // Full update of a client policy — used for correcting a typo, recording
        // a new payment against the balance, or updating any policy detail.
        // Same ownership rule as everywhere else: Agents only touch their own,
        // Admins can touch any. All premium/commission math is recomputed here
        // server-side. Note: unlike Create, this does NOT reject a past issue
        // date — an existing policy may have legitimately been issued before
        // today, and editing it shouldn't retroactively become impossible.
        group.MapPut("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller, UpdateClientRequest request) =>
        {
            var client = await db.Clients.FindAsync(id);
            if (client is null) return Results.NotFound();
            if (!caller.IsAdmin() && client.AgentId != caller.GetUserId()) return Results.Forbid();

            if (string.IsNullOrWhiteSpace(request.InsuredName))
            {
                return Results.BadRequest("Insured name is required.");
            }

            if (request.PolicyExpiryDate.HasValue && request.PolicyIssueDate.HasValue
                && request.PolicyExpiryDate.Value.Date < request.PolicyIssueDate.Value.Date)
            {
                return Results.BadRequest("Policy expiry date cannot be before the issue date.");
            }

            var customer = await db.Customers.FindAsync(request.CustomerId);
            if (customer is null)
            {
                return Results.BadRequest("The selected customer does not exist.");
            }
            if (!caller.IsAdmin() && customer.AgentId != caller.GetUserId())
            {
                return Results.Forbid();
            }

            client.CustomerId = request.CustomerId;
            client.InsuredPersonName = string.IsNullOrWhiteSpace(request.InsuredPersonName)
                ? request.InsuredName
                : request.InsuredPersonName;
            client.InsuranceCompany = request.InsuranceCompany;
            client.ProductName = request.ProductName;
            client.SponsorDetails = request.SponsorDetails;
            client.InsuredName = request.InsuredName;
            client.PolicyIssueDate = request.PolicyIssueDate;
            client.PolicyExpiryDate = request.PolicyExpiryDate;
            client.PolicyNo = request.PolicyNo;
            client.ModeOfPayment = request.ModeOfPayment;
            client.Remarks = request.Remarks;

            ApplyCalculatedFinancials(client, request);

            await db.SaveChangesAsync();

            return Results.Ok(client);
        }).RequireAuthorization();

        // Quick, single-field update — just recording a new payment against the
        // balance without re-submitting the entire policy form.
        group.MapPatch("/{id:int}/payment", async (int id, AppDbContext db, ClaimsPrincipal caller, RecordPaymentRequest payment) =>
        {
            var client = await db.Clients.FindAsync(id);
            if (client is null) return Results.NotFound();
            if (!caller.IsAdmin() && client.AgentId != caller.GetUserId()) return Results.Forbid();

            if (payment.Amount <= 0)
            {
                return Results.BadRequest("Payment amount must be greater than zero.");
            }

            client.CollectedPremium = (client.CollectedPremium ?? 0) + payment.Amount;
            client.Balance = client.Balance - payment.Amount;

            await db.SaveChangesAsync();

            return Results.Ok(client);
        }).RequireAuthorization();

        group.MapDelete("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller) =>
        {
            var client = await db.Clients.FindAsync(id);
            if (client is null) return Results.NotFound();
            if (!caller.IsAdmin() && client.AgentId != caller.GetUserId()) return Results.Forbid();

            db.Clients.Remove(client);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }).RequireAuthorization();

        if (app.Environment.IsDevelopment())
        {
            group.MapGet("/seed", async (AppDbContext db) =>
            {
                var testClient = new Client
                {
                    AgentId = 1,
                    InsuranceCompany = "Allianz",
                    ProductName = "Health Premium",
                    SponsorDetails = "Self",
                    InsuredName = "Bob Wayne",
                    PolicyNo = "POL-12345",
                    ModeOfPayment = "Credit Card",
                    Balance = 0.00m,
                    Remarks = "First premium paid"
                };
                db.Clients.Add(testClient);
                await db.SaveChangesAsync();
                return Results.Ok("Test Client successfully saved to MySQL Workbench!");
            });
        }
    }

    /// <summary>
    /// Recomputes VAT, Total Premium, Total Commission, Agent Commission, and
    /// Balance from raw trusted inputs and writes them onto the entity.
    /// This is the one place derived financials are ever calculated —
    /// never trust these fields if they arrive pre-computed from the client.
    /// </summary>
    private static void ApplyCalculatedFinancials(Client client, IClientFinancialInputs input)
    {
        var annualPremium = input.AnnualPremium ?? 0;
        var policyFee = input.PolicyFee ?? 0;
        var basmah = input.Basmah ?? 0;
        var collectedPremium = input.CollectedPremium ?? 0;
        var commRate = input.CommRate ?? 0;
        var agentSplit = input.AgentSplitPercent ?? 0;

        var vat = PremiumCalculator.CalculateVat(annualPremium);
        var totalPremium = PremiumCalculator.CalculateTotalPremium(annualPremium, policyFee, vat, basmah);
        var totalCommission = PremiumCalculator.CalculateTotalCommission(annualPremium, commRate);
        var agentCommission = PremiumCalculator.CalculateAgentCommission(totalCommission, agentSplit);

        client.AnnualPremium = annualPremium;
        client.PolicyFee = policyFee;
        client.Vat5Percent = vat;
        client.Basmah = basmah;
        client.TotalPremium = totalPremium;
        client.CollectedPremium = collectedPremium;
        client.Balance = totalPremium - collectedPremium;
        client.CommRate = commRate;
        client.TotalCommission = totalCommission;
        client.AgentCommission = agentCommission;
    }
}

public interface IClientFinancialInputs
{
    decimal? AnnualPremium { get; }
    decimal? PolicyFee { get; }
    decimal? Basmah { get; }
    decimal? CollectedPremium { get; }
    decimal? CommRate { get; }
    decimal? AgentSplitPercent { get; }
}

public record CreateClientRequest(
    int CustomerId,
    string InsuredPersonName,
    string InsuranceCompany,
    string ProductName,
    string? SponsorDetails,
    string InsuredName,
    DateTime? PolicyIssueDate,
    DateTime? PolicyExpiryDate,
    string PolicyNo,
    string ModeOfPayment,
    decimal? AnnualPremium,
    decimal? PolicyFee,
    decimal? Basmah,
    decimal? CollectedPremium,
    decimal? CommRate,
    decimal? AgentSplitPercent,
    string? Remarks
) : IClientFinancialInputs;

public record UpdateClientRequest(
    int CustomerId,
    string InsuredPersonName,
    string InsuranceCompany,
    string ProductName,
    string? SponsorDetails,
    string InsuredName,
    DateTime? PolicyIssueDate,
    DateTime? PolicyExpiryDate,
    string PolicyNo,
    string ModeOfPayment,
    decimal? AnnualPremium,
    decimal? PolicyFee,
    decimal? Basmah,
    decimal? CollectedPremium,
    decimal? CommRate,
    decimal? AgentSplitPercent,
    string? Remarks
) : IClientFinancialInputs;

public record RecordPaymentRequest(decimal Amount);

public record ExpiringPolicyDto(
    int Id,
    string CustomerName,
    string InsuredPersonName,
    string ProductName,
    string PolicyNo,
    DateTime? PolicyExpiryDate
);