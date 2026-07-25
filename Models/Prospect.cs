using System.ComponentModel.DataAnnotations.Schema;

namespace ProspectCRM.Models;

[Table("prospects")]
public class Prospect
{
    [Column("id")]
    public int Id { get; set; }

    [Column("agent_id")]
    public int AgentId { get; set; }

    [Column("date_entered")]
    public DateTime DateEntered { get; set; } = DateTime.UtcNow;

    // --- Always captured at creation time ---
    [Column("prospect_name")]
    public string ProspectName { get; set; } = string.Empty;

    [Column("nationality")]
    public string Nationality { get; set; } = string.Empty;

    [Column("mobile_no")]
    public string MobileNo { get; set; } = string.Empty;

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("designation")]
    public string Designation { get; set; } = string.Empty;

    [Column("income")]
    public decimal? Income { get; set; }

    // --- Telephone Call (nullable — not filled in until the prospect is contacted) ---
    [Column("call_date")]
    public DateTime? CallDate { get; set; }

    [Column("call_time")]
    public TimeSpan? CallTime { get; set; }

    [Column("call_response")]
    public string? CallResponse { get; set; }

    // --- 1st Appointment (nullable — only exists once the prospect reaches this stage) ---
    [Column("first_appointment_date")]
    public DateTime? FirstAppointmentDate { get; set; }

    [Column("fact_find")]
    public string? FactFind { get; set; }

    [Column("need_analysis")]
    public string? NeedAnalysis { get; set; }

    // --- 2nd Appointment (nullable) ---
    [Column("second_appointment_date")]
    public DateTime? SecondAppointmentDate { get; set; }

    [Column("plan_presentation")]
    public string? PlanPresentation { get; set; }

    // --- Closing / Follow-up (nullable) ---
    [Column("closing_date")]
    public DateTime? ClosingDate { get; set; }

    [Column("followup_date")]
    public DateTime? FollowupDate { get; set; }

    [Column("remarks")]
    public string? Remarks { get; set; }
}