using Microsoft.EntityFrameworkCore;
using ProspectCRM.Data;
using ProspectCRM.Extensions;
using ProspectCRM.Models;
using System.Security.Claims;

namespace ProspectCRM.Endpoints;

public static class ProspectEndpoints
{
    public static void MapProspectEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/prospects").WithTags("Prospects");

        // Agents see only their own prospects. Admins see everything by default,
        // or a single agent's prospects when ?agentId= is supplied (this is what
        // the sidebar "Access Scope" switcher uses to monitor one agent).
        group.MapGet("/", async (AppDbContext db, ClaimsPrincipal caller, int? agentId) =>
        {
            IQueryable<Prospect> query = db.Prospects;

            if (caller.IsAdmin())
            {
                if (agentId.HasValue) query = query.Where(p => p.AgentId == agentId.Value);
            }
            else
            {
                query = query.Where(p => p.AgentId == caller.GetUserId());
            }

            var prospects = await query.ToListAsync();
            return Results.Ok(prospects);
        }).RequireAuthorization();

        group.MapPost("/", async (AppDbContext db, Prospect newProspect, ClaimsPrincipal caller) =>
        {
            if (string.IsNullOrWhiteSpace(newProspect.ProspectName))
            {
                return Results.BadRequest("Prospect name is required.");
            }

            newProspect.AgentId = caller.GetUserId();
            newProspect.DateEntered = DateTime.UtcNow;

            db.Prospects.Add(newProspect);
            await db.SaveChangesAsync();

            return Results.Created($"/api/prospects/{newProspect.Id}", newProspect);
        }).RequireAuthorization();

        group.MapPatch("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller, LogOutreachRequest update) =>
        {
            var prospect = await db.Prospects.FindAsync(id);
            if (prospect is null) return Results.NotFound();
            if (!caller.IsAdmin() && prospect.AgentId != caller.GetUserId()) return Results.Forbid();

            if (update.CallDate.HasValue) prospect.CallDate = update.CallDate;
            if (update.CallTime.HasValue) prospect.CallTime = update.CallTime;
            if (update.CallResponse is not null) prospect.CallResponse = update.CallResponse;
            if (update.FollowupDate.HasValue) prospect.FollowupDate = update.FollowupDate;
            if (update.Remarks is not null) prospect.Remarks = update.Remarks;

            await db.SaveChangesAsync();
            return Results.Ok(prospect);
        }).RequireAuthorization();

        group.MapPatch("/{id:int}/appointment", async (int id, AppDbContext db, ClaimsPrincipal caller, ScheduleAppointmentRequest update) =>
        {
            var prospect = await db.Prospects.FindAsync(id);
            if (prospect is null) return Results.NotFound();
            if (!caller.IsAdmin() && prospect.AgentId != caller.GetUserId()) return Results.Forbid();

            if (update.FirstAppointmentDate.HasValue) prospect.FirstAppointmentDate = update.FirstAppointmentDate;
            if (update.FactFind is not null) prospect.FactFind = update.FactFind;
            if (update.NeedAnalysis is not null) prospect.NeedAnalysis = update.NeedAnalysis;

            await db.SaveChangesAsync();
            return Results.Ok(prospect);
        }).RequireAuthorization();

        group.MapPatch("/{id:int}/close", async (int id, AppDbContext db, ClaimsPrincipal caller, CloseProspectRequest update) =>
        {
            var prospect = await db.Prospects.FindAsync(id);
            if (prospect is null) return Results.NotFound();
            if (!caller.IsAdmin() && prospect.AgentId != caller.GetUserId()) return Results.Forbid();

            prospect.ClosingDate = update.ClosingDate ?? DateTime.UtcNow;
            if (update.Remarks is not null) prospect.Remarks = update.Remarks;

            await db.SaveChangesAsync();
            return Results.Ok(prospect);
        }).RequireAuthorization();

        group.MapDelete("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller) =>
        {
            var prospect = await db.Prospects.FindAsync(id);
            if (prospect is null) return Results.NotFound();
            if (!caller.IsAdmin() && prospect.AgentId != caller.GetUserId()) return Results.Forbid();

            db.Prospects.Remove(prospect);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }).RequireAuthorization();

        // Dev-only seed route — left open (no auth) purely for local convenience.
        if (app.Environment.IsDevelopment())
        {
            group.MapGet("/seed", async (AppDbContext db) =>
            {
                var testProspect = new Prospect
                {
                    AgentId = 1,
                    DateEntered = DateTime.UtcNow,
                    ProspectName = "Alice Vance",
                    Nationality = "Canadian",
                    MobileNo = "555-0199",
                    Email = "alice@prospect.com",
                    Designation = "Manager",
                    Income = 909m,
                    CallResponse = "Interested - Scheduled follow up",
                    Remarks = "Met at trade show"
                };
                db.Prospects.Add(testProspect);
                await db.SaveChangesAsync();
                return Results.Ok("Test Prospect successfully saved to MySQL Workbench!");
            });
        }
    }
}

public record LogOutreachRequest(DateTime? CallDate, TimeSpan? CallTime, string? CallResponse, DateTime? FollowupDate, string? Remarks);
public record ScheduleAppointmentRequest(DateTime? FirstAppointmentDate, string? FactFind, string? NeedAnalysis);
public record CloseProspectRequest(DateTime? ClosingDate, string? Remarks);