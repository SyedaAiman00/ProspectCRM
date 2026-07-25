/**
 * Pure calculation functions for the Premium Calculator.
 * Kept dependency-free so they're easy to unit test and reuse
 * (e.g. if the Add New Client form later needs the same math
 * to auto-fill total_premium / total_commission / agent_commission).
 */

/**
 * UAE standard-rated insurance VAT: 5% of the Annual Premium.
 * @param {number} annualPremium
 * @returns {number}
 */
export function calculateVat(annualPremium) {
    return annualPremium * 0.05;
}

/**
 * Total Premium = Annual Premium + Policy Fee + VAT + BASMAH.
 * @param {number} annualPremium
 * @param {number} policyFee
 * @param {number} vat
 * @param {number} basmah
 * @returns {number}
 */
export function calculateTotalPremium(annualPremium, policyFee, vat, basmah) {
    return annualPremium + policyFee + vat + basmah;
}

/**
 * Total Commission = the % of the Annual Premium the insurer pays the agency.
 * @param {number} annualPremium
 * @param {number} commRatePercent - e.g. 15 for 15%
 * @returns {number}
 */
export function calculateTotalCommission(annualPremium, commRatePercent) {
    return annualPremium * (commRatePercent / 100);
}

/**
 * Agent Commission = the agent's split share of the Total Commission.
 * @param {number} totalCommission
 * @param {number} agentSplitPercent - e.g. 50 for a 50% split
 * @returns {number}
 */
export function calculateAgentCommission(totalCommission, agentSplitPercent) {
    return totalCommission * (agentSplitPercent / 100);
}