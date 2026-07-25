using System.ComponentModel.DataAnnotations.Schema;

namespace ProspectCRM.Models;

[Table("dropdown_options")]
public class DropdownOption
{
    [Column("id")]
    public int Id { get; set; }

    /// <summary>
    /// A string key identifying which list this value belongs to
    /// (e.g. "insurance_company", "product", "payment_mode", "mobile_prefix", "yes_no").
    /// Deliberately a string, not an enum/separate table — adding a 6th category
    /// later is just new rows with a new key, no migration required.
    /// </summary>
    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [Column("value")]
    public string Value { get; set; } = string.Empty;

    [Column("sort_order")]
    public int SortOrder { get; set; }
}