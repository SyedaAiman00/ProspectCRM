import {
    calculateVat,
    calculateTotalPremium,
    calculateTotalCommission,
    calculateAgentCommission,
} from '../utils/premiumCalculator.js';

/**
 * Entry point for the Premium Calculator page. Called by router.js
 * once calculator.html has been injected into the DOM.
 * Pure client-side tool — no backend call, no saved record.
 * Uses the same math as the Add New Client / Convert to Client form.
 */
export function initPremiumCalculator() {
    const inputs = document.querySelectorAll('.calc-input');
    inputs.forEach((input) => input.addEventListener('input', recalculate));
    recalculate(); // run once immediately so results aren't blank on load
}

function recalculate() {
    const annualPremium = getValue('pc-annual-premium');
    const policyFee = getValue('pc-policy-fee');
    const basmah = getValue('pc-basmah');
    const commRate = getValue('pc-comm-rate');
    const agentSplit = getValue('pc-agent-split');

    const vat = calculateVat(annualPremium);
    const totalPremium = calculateTotalPremium(annualPremium, policyFee, vat, basmah);
    const totalCommission = calculateTotalCommission(annualPremium, commRate);
    const agentCommission = calculateAgentCommission(totalCommission, agentSplit);

    setText('pc-result-vat', `AED ${vat.toFixed(2)}`);
    setText('pc-result-total-premium', `AED ${totalPremium.toFixed(2)}`);
    setText('pc-result-total-commission', `AED ${totalCommission.toFixed(2)}`);
    setText('pc-result-agent-commission', `AED ${agentCommission.toFixed(2)}`);
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? Number(el.value) || 0 : 0;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}