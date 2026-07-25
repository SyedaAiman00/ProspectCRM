using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProspectCRM.Data;
using ProspectCRM.Extensions;
using ProspectCRM.Models;
using System.Security.Claims;

namespace ProspectCRM.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        // Admin-only — powers the sidebar "Access Scope" agent switcher.
        group.MapGet("/agents", async (UserManager<User> userManager) =>
        {
            var agents = await userManager.GetUsersInRoleAsync(Roles.Agent);
            var result = agents.Select(a => new { a.Id, a.Name, a.Email }).OrderBy(a => a.Name);
            return Results.Ok(result);
        }).RequireAuthorization("AdminOnly");

        group.MapGet("/", async (AppDbContext db) =>
        {
            var users = await db.Users
                .Select(u => new UserDto(u.Id, u.Name, u.Email!, u.MonthlyTarget, u.CreatedAt))
                .ToListAsync();

            return Results.Ok(users);
        }).RequireAuthorization("AdminOnly");

        // An Agent may only fetch their own record; an Admin may fetch any.
        group.MapGet("/{id:int}", async (int id, AppDbContext db, ClaimsPrincipal caller) =>
        {
            if (!caller.IsAdmin() && caller.GetUserId() != id) return Results.Forbid();

            var user = await db.Users
                .Where(u => u.Id == id)
                .Select(u => new UserDto(u.Id, u.Name, u.Email!, u.MonthlyTarget, u.CreatedAt))
                .FirstOrDefaultAsync();

            return user is null ? Results.NotFound() : Results.Ok(user);
        }).RequireAuthorization();

        group.MapPatch("/{id:int}/target", async (int id, AppDbContext db, ClaimsPrincipal caller, UpdateMonthlyTargetRequest update) =>
        {
            if (!caller.IsAdmin() && caller.GetUserId() != id) return Results.Forbid();

            if (update.MonthlyTarget < 1)
            {
                return Results.BadRequest("Monthly target must be at least 1.");
            }

            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            user.MonthlyTarget = update.MonthlyTarget;
            await db.SaveChangesAsync();

            var updatedDto = new UserDto(user.Id, user.Name, user.Email!, user.MonthlyTarget, user.CreatedAt);
            return Results.Ok(updatedDto);
        }).RequireAuthorization();
    }
}

public record UpdateMonthlyTargetRequest(int MonthlyTarget);

/// <summary>
/// Safe, external-facing shape of a User — deliberately excludes PasswordHash,
/// SecurityStamp, ConcurrencyStamp, and every other Identity internal that
/// should never be serialized back to the client.
/// </summary>
public record UserDto(int Id, string Name, string Email, int MonthlyTarget, DateTime CreatedAt);