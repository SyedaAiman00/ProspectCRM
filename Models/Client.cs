using System.ComponentModel.DataAnnotations.Schema;

namespace ProspectCRM.Models;

[Table("clients")]
public class Client
{
    [Column("id")]
    public int Id { get; set; }

[Column("agent_id")]
    public int AgentId { get; set; }

    /// <summary>
    /// The Customer (Individual or Group/Corporate) this policy belongs to.
    /// Nullable during the transition — existing policies created before this
    /// field existed get backfilled by the AddCustomerLink migration; every
    /// new policy going forward must set this.
    /// </summary>
    [Column("customer_id")]
    public int? CustomerId { get; set; }

    /// <summary>
    /// Who is actually covered by THIS specific policy — e.g. "Ahmed (Self)",
    /// "Fatima (Spouse)" for an Individual customer's dependents, or
    /// "ABC Trading LLC" / "Owner" for a Group customer's various products.
    /// Distinct from the Customer's own Name, since one customer can have
    /// several policies each covering a different person or entity.
    /// </summary>
    [Column("insured_person_name")]
    public string? InsuredPersonName { get; set; }

    [Column("insurance_company")]
    public string InsuranceCompany { get; set; } = string.Empty;

    [Column("product_name")]
    public string ProductName { get; set; } = string.Empty;

    [Column("sponsor_details")]
    public string? SponsorDetails { get; set; }

    [Column("insured_name")]
    public string InsuredName { get; set; } = string.Empty;

    [Column("policy_issue_date")]
    public DateTime? PolicyIssueDate { get; set; }

[Column("policy_no")]
    public string PolicyNo { get; set; } = string.Empty;

    [Column("policy_expiry_date")]
    public DateTime? PolicyExpiryDate { get; set; }

    [Column("mode_of_payment")]
    public string ModeOfPayment { get; set; } = string.Empty;

    // --- Financials ---
    [Column("annual_premium")]
    public decimal? AnnualPremium { get; set; }

    [Column("policy_fee")]
    public decimal? PolicyFee { get; set; }

    [Column("vat_5_percent")]
    public decimal? Vat5Percent { get; set; }

    [Column("basmah")]
    public decimal? Basmah { get; set; }

    [Column("total_premium")]
    public decimal? TotalPremium { get; set; }

    [Column("collected_premium")]
    public decimal? CollectedPremium { get; set; }

    [Column("balance")]
    public decimal Balance { get; set; }

    [Column("remarks")]
    public string? Remarks { get; set; }

    // --- Commission ---
    [Column("comm_rate")]
    public decimal? CommRate { get; set; }

    [Column("total_commission")]
    public decimal? TotalCommission { get; set; }

    [Column("agent_commission")]
    public decimal? AgentCommission { get; set; }
}