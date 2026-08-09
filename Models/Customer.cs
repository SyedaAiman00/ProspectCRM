using System.ComponentModel.DataAnnotations.Schema;

namespace ProspectCRM.Models;

[Table("customers")]
public class Customer
{
    [Column("id")]
    public int Id { get; set; }

    [Column("agent_id")]
    public int AgentId { get; set; }

    /// <summary>
    /// Person's full name for an Individual customer, or the company/entity
    /// name for a Group/Corporate customer (e.g. "ABC Trading LLC").
    /// </summary>
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// "Individual" or "Group" — see CustomerTypes constants.
    /// A string, not an enum, so adding a 3rd type later is just a new
    /// constant + UI option, no migration required.
    /// </summary>
    [Column("customer_type")]
    public string CustomerType { get; set; } = ProspectCRM.Models.CustomerTypes.Individual;

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}