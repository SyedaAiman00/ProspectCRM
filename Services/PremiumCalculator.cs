namespace ProspectCRM.Services;

/// <summary>
/// Server-side source of truth for all derived premium/commission math.
/// Mirrors wwwroot/js/utils/premiumCalculator.js exactly. The frontend keeps
/// its own copy purely so the agent sees live numbers while typing — but
/// whatever gets saved to the database always goes through this class,
/// never through whatever the browser happened to send.
/// </summary>
public static class PremiumCalculator
{
    /// <summary>UAE standard-rated insurance VAT: 5% of the Annual Premium.</summary>
    public static decimal CalculateVat(decimal annualPremium)
    {
        return annualPremium * 0.05m;
    }

    /// <summary>Total Premium = Annual Premium + Policy Fee + VAT + BASMAH.</summary>
    public static decimal CalculateTotalPremium(decimal annualPremium, decimal policyFee, decimal vat, decimal basmah)
    {
        return annualPremium + policyFee + vat + basmah;
    }

    /// <summary>Total Commission = the % of the Annual Premium the insurer pays the agency.</summary>
    public static decimal CalculateTotalCommission(decimal annualPremium, decimal commRatePercent)
    {
        return annualPremium * (commRatePercent / 100m);
    }

    /// <summary>Agent Commission = the agent's split share of the Total Commission.</summary>
    public static decimal CalculateAgentCommission(decimal totalCommission, decimal agentSplitPercent)
    {
        return totalCommission * (agentSplitPercent / 100m);
    }
}