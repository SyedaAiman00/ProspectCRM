import { getClients } from '../api/client.js';
import {
    calculateTotalCollectedPremium,
    calculateTotalAgentCommission,
    calculateAverageCommRate,
} from '../utils/clientMetrics.js';
import { isAdmin } from '../auth/session.js';
import { getViewingAgentId } from '../store/state.js';

/**
 * Entry point for the Commission Ledger page. Called by router.js
 * once commissions.html has been injected into the DOM.
 * Purely a read-only report — reuses the same GET /api/clients data
 * the Clients Pipeline page already has, just re-organized for reviewing
 * earnings rather than managing policies.
 */
export async function initCommissionLedger() {
    const agentId = isAdmin() ? getViewingAgentId() : null;

    try {
        const clients = await getClients(agentId);
        renderKpis(clients);
        renderLedgerTable(clients);
    } catch (err) {
        console.error('Commission Ledger load error:', err);
    }
}

/**
 * @param {object[]} clients
 */
function renderKpis(clients) {
    // Total Commission Earned uses the sum of total_commission — what the
    // insurer pays the agency overall (not the same as collected premium).
    const totalCommission = clients.reduce((total, c) => total + (Number(c.totalCommission) || 0), 0);
    const agentCommission = calculateTotalAgentCommission(clients);
    const avgCommRate = calculateAverageCommRate(clients);

    setText('kpi-total-commission-value', `AED ${totalCommission.toLocaleString()}`);
    setText('kpi-agent-commission-value', `AED ${agentCommission.toLocaleString()}`);
    setText('kpi-avg-rate-value', `${avgCommRate.toFixed(1)}%`);
}

/**
 * @param {object[]} clients
 */
function renderLedgerTable(clients) {
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return; // Guard clause — page not in DOM yet

    if (clients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-10 text-sm text-gray-400">No commission records yet</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = clients.map(renderLedgerRow).join('');
}

/**
 * @param {object} c
 * @returns {string}
 */
function renderLedgerRow(c) {
    const annualPremium = Number(c.annualPremium) || 0;
    const totalCommission = Number(c.totalCommission) || 0;
    const agentCommission = Number(c.agentCommission) || 0;
    const commRateStr = c.commRate != null ? `${c.commRate}%` : 'N/A';

    return `
        <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
            <td class="px-4 py-3 font-semibold text-gray-800">${escapeText(c.insuredName) || 'N/A'}</td>
            <td class="px-4 py-3 text-gray-600">${escapeText(c.insuranceCompany) || 'N/A'}</td>
            <td class="px-4 py-3 text-gray-500">${escapeText(c.policyNo) || 'N/A'}</td>
            <td class="px-4 py-3 text-right text-gray-600">AED ${annualPremium.toLocaleString()}</td>
            <td class="px-4 py-3 text-right text-gray-600">${escapeText(commRateStr)}</td>
            <td class="px-4 py-3 text-right font-semibold text-gray-800">AED ${totalCommission.toLocaleString()}</td>
            <td class="px-4 py-3 text-right font-bold text-teal-700">AED ${agentCommission.toLocaleString()}</td>
        </tr>
    `;
}

/** @param {string|null|undefined} value */
function escapeText(value) {
    if (value === null || value === undefined) return '';
    return value
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/**
 * @param {string} id
 * @param {string} value
 */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}