using Microsoft.EntityFrameworkCore;
using ProspectCRM.Data;
using ProspectCRM.Extensions;
using ProspectCRM.Models;
using System.Security.Claims;

namespace ProspectCRM.Endpoints;

public static class CustomerEndpoints
{
    public static void MapCustomerEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/customers").WithTags("Customers");

        group.MapGet("/", async (AppDbContext db, ClaimsPrincipal caller, int? agentId) =>
        {
            IQueryable<Customer> query = db.Customers;

            if (caller.IsAdmin())
            {
                if (agentId.HasValue) query = query.Where(c => c.AgentId == agentId.Value);
            }
            else
            {
                query = query.Where(c => c.AgentId == caller.GetUserId());
            }

            var customers = await query.OrderBy(c => c.Name).ToListAsync();
            return Results.Ok(customers);
        }).RequireAuthorization();

        group.MapGet("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller) =>
        {
            var customer = await db.Customers.FindAsync(id);
            if (customer is null) return Results.NotFound();
            if (!caller.IsAdmin() && customer.AgentId != caller.GetUserId()) return Results.Forbid();

            return Results.Ok(customer);
        }).RequireAuthorization();

        group.MapPost("/", async (AppDbContext db, CreateCustomerRequest request, ClaimsPrincipal caller) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest("Customer name is required.");
            }

            if (request.CustomerType != CustomerTypes.Individual && request.CustomerType != CustomerTypes.Group)
            {
                return Results.BadRequest("Customer type must be 'Individual' or 'Group'.");
            }

            var newCustomer = new Customer
            {
                AgentId = caller.GetUserId(),
                Name = request.Name.Trim(),
                CustomerType = request.CustomerType,
                Phone = request.Phone?.Trim(),
                Email = request.Email?.Trim(),
                Notes = request.Notes?.Trim(),
            };

            db.Customers.Add(newCustomer);
            await db.SaveChangesAsync();

            return Results.Created($"/api/customers/{newCustomer.Id}", newCustomer);
        }).RequireAuthorization();

        group.MapPut("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller, UpdateCustomerRequest request) =>
        {
            var customer = await db.Customers.FindAsync(id);
            if (customer is null) return Results.NotFound();
            if (!caller.IsAdmin() && customer.AgentId != caller.GetUserId()) return Results.Forbid();

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest("Customer name is required.");
            }

            if (request.CustomerType != CustomerTypes.Individual && request.CustomerType != CustomerTypes.Group)
            {
                return Results.BadRequest("Customer type must be 'Individual' or 'Group'.");
            }

            customer.Name = request.Name.Trim();
            customer.CustomerType = request.CustomerType;
            customer.Phone = request.Phone?.Trim();
            customer.Email = request.Email?.Trim();
            customer.Notes = request.Notes?.Trim();

            await db.SaveChangesAsync();

            return Results.Ok(customer);
        }).RequireAuthorization();

        // Deleting a customer only makes sense once we've linked Policies to
        // them in Step 2 — for now this just guards against orphaning nothing,
        // since no Client/Policy references CustomerId yet. We'll add a
        // "block delete if they still have policies" check once that link exists.
        group.MapDelete("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller) =>
        {
            var customer = await db.Customers.FindAsync(id);
            if (customer is null) return Results.NotFound();
            if (!caller.IsAdmin() && customer.AgentId != caller.GetUserId()) return Results.Forbid();

            db.Customers.Remove(customer);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }).RequireAuthorization();
    }
}

public record CreateCustomerRequest(string Name, string CustomerType, string? Phone, string? Email, string? Notes);
public record UpdateCustomerRequest(string Name, string CustomerType, string? Phone, string? Email, string? Notes);