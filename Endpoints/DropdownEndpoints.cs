using Microsoft.EntityFrameworkCore;
using ProspectCRM.Data;
using ProspectCRM.Models;

namespace ProspectCRM.Endpoints;

public static class DropdownEndpoints
{
    public static void MapDropdownEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/dropdowns").WithTags("Dropdowns");

        // Any authenticated user (Agent or Admin) can read the lists —
        // they're reference data every form/page needs, not sensitive.
        group.MapGet("/", async (AppDbContext db) =>
        {
            var options = await db.DropdownOptions
                .OrderBy(o => o.Category)
                .ThenBy(o => o.SortOrder)
                .ToListAsync();

            return Results.Ok(options);
        }).RequireAuthorization();

        // Managing the lists themselves, however, is an Admin-only action —
        // agents use these values, they don't curate them.
        group.MapPost("/", async (AppDbContext db, CreateDropdownOptionRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Category) || string.IsNullOrWhiteSpace(request.Value))
            {
                return Results.BadRequest("Category and value are both required.");
            }

            var maxSortOrder = await db.DropdownOptions
                .Where(o => o.Category == request.Category)
                .Select(o => (int?)o.SortOrder)
                .MaxAsync() ?? -1;

            var newOption = new DropdownOption
            {
                Category = request.Category,
                Value = request.Value.Trim(),
                SortOrder = maxSortOrder + 1,
            };

            db.DropdownOptions.Add(newOption);
            await db.SaveChangesAsync();

            return Results.Created($"/api/dropdowns/{newOption.Id}", newOption);
        }).RequireAuthorization("AdminOnly");

        group.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var option = await db.DropdownOptions.FindAsync(id);
            if (option is null) return Results.NotFound();

            db.DropdownOptions.Remove(option);
            await db.SaveChangesAsync();

            return Results.NoContent();
        }).RequireAuthorization("AdminOnly");
    }
}

public record CreateDropdownOptionRequest(string Category, string Value);