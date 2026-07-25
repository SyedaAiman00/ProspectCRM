using ProspectCRM.Models;

namespace ProspectCRM.Data;

/// <summary>
/// Seeds the dropdown_options table with the real categories/values pulled
/// directly from the business's existing Excel reference tabs ("Drop Down"
/// and "Sheet1"), so the app starts with the same lists already in use.
/// Only inserts if the table is empty — safe to leave this running on every
/// startup without duplicating rows on subsequent runs.
/// </summary>
public static class DropdownSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (db.DropdownOptions.Any()) return; // already seeded — don't duplicate

        var seedData = new List<DropdownOption>();
        seedData.AddRange(BuildCategory(DropdownCategories.InsuranceCompany, new[]
        {
            "Adamjee", "Oman", "Orient", "Watba", "Watnia", "Noor", "IAW", "DNIR", "NLGI",
            "Methaq", "Sagr", "Takaful Emarat", "Fidelity United", "Union", "Alliance",
            "MetLife", "Insurance House", "Qatar Insurance", "Salama",
        }));
        seedData.AddRange(BuildCategory(DropdownCategories.Product, new[]
        {
            "Individual Health", "Group Health", "Individual Life", "Group Life", "Motor", "General", "Marine",
        }));
        seedData.AddRange(BuildCategory(DropdownCategories.PaymentMode, new[]
        {
            "Annual", "Semi Annual", "Quarterly", "Monthly",
        }));
        seedData.AddRange(BuildCategory(DropdownCategories.MobilePrefix, new[]
        {
            "050", "052", "054", "055", "056", "058",
        }));
        seedData.AddRange(BuildCategory(DropdownCategories.YesNo, new[]
        {
            "Yes", "No",
        }));

        db.DropdownOptions.AddRange(seedData);
        await db.SaveChangesAsync();
    }

    private static IEnumerable<DropdownOption> BuildCategory(string category, string[] values)
    {
        return values.Select((value, index) => new DropdownOption
        {
            Category = category,
            Value = value,
            SortOrder = index,
        });
    }
}