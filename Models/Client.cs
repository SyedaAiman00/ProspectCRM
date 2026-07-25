using System.ComponentModel.DataAnnotations.Schema;

namespace ProspectCRM.Models;

[Table("clients")]
public class Client
{
    [Column("id")]
    public int Id { get; set; }

    [Column("agent_id")]
    public int AgentId { get; set; }

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