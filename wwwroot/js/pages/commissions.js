import { getClients } from '../api/client.js';
import {
    calculateTotalCollectedPremium,
    calculateTotalAgentCommission,
    calculateAverageCommRate,
} from '../utils/clientMetrics.js';
import { isAdmin } from '../auth/session.js';
import { getViewingAgentId } from '../store/state.js';
import { exportCommissionsToExcel, exportCommissionsToPdf } from '../utils/exportCommissions.js';

// Cache of the most recently fetched policies, so the export buttons can
// work from the same data without refetching.
let currentPolicies = [];

/**
 * Entry point for the Commission Ledger page. Called by router.js
 * once commissions.html has been injected into the DOM.
 * Purely a read-only report — reuses the same GET /api/clients data
 * the Clients Pipeline page already has, just re-organized for reviewing
 * earnings rather than managing policies.
 */
export async function initCommissionLedger() {
    bindExportButton();

    const agentId = isAdmin() ? getViewingAgentId() : null;

    try {
        const policies = await getClients(agentId);
        currentPolicies = policies;
        renderKpis(policies);
        renderLedgerTable(policies);
    } catch (err) {
        console.error('Commission Ledger load error:', err);
    }
}

/**
 * Wires up the Export button's dropdown (Excel / PDF). Guarded against
 * double-binding, same as the Clients Board export button — this lives in
 * static HTML, not re-rendered, so without the guard every call to
 * initCommissionLedger() would stack another set of listeners.
 */
function bindExportButton() {
    const exportBtn = document.getElementById('btn-export-commissions');
    const menu = document.getElementById('export-commissions-menu');
    const excelBtn = document.getElementById('export-commissions-excel');
    const pdfBtn = document.getElementById('export-commissions-pdf');

    if (!exportBtn || !menu || exportBtn.dataset.bound) return;

    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !exportBtn.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    if (excelBtn) {
        excelBtn.addEventListener('click', () => {
            if (currentPolicies.length === 0) {
                alert('There are no commission records to export yet.');
                return;
            }
            exportCommissionsToExcel(buildExportRows());
            menu.classList.add('hidden');
        });
    }

    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (currentPolicies.length === 0) {
                alert('There are no commission records to export yet.');
                return;
            }
            exportCommissionsToPdf(buildExportRows());
            menu.classList.add('hidden');
        });
    }

    exportBtn.dataset.bound = 'true'; // guard against double-binding across re-inits
}

/**
 * Shapes the raw policy list into export-friendly rows, matching what
 * exportCommissions.js expects (an insuredLabel field instead of the raw
 * insuredPersonName/insuredName pair).
 * @returns {object[]}
 */
function buildExportRows() {
    return currentPolicies.map((p) => ({
        ...p,
        insuredLabel: p.insuredPersonName || p.insuredName || 'N/A',
    }));
}

/**
 * @param {object[]} policies
 */
function renderKpis(policies) {
    // Total Commission Earned uses the sum of total_commission — what the
    // insurer pays the agency overall (not the same as collected premium).
    const totalCommission = policies.reduce((total, c) => total + (Number(c.totalCommission) || 0), 0);
    const agentCommission = calculateTotalAgentCommission(policies);
    const avgCommRate = calculateAverageCommRate(policies);

    setText('kpi-total-commission-value', `AED ${totalCommission.toLocaleString()}`);
    setText('kpi-agent-commission-value', `AED ${agentCommission.toLocaleString()}`);
    setText('kpi-avg-rate-value', `${avgCommRate.toFixed(1)}%`);
}

/**
 * @param {object[]} policies
 */
function renderLedgerTable(policies) {
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return; // Guard clause — page not in DOM yet

    if (policies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-10 text-sm text-gray-400">No commission records yet</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = policies.map(renderLedgerRow).join('');
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
    const insuredLabel = c.insuredPersonName || c.insuredName || 'N/A';

    return `
        <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
            <td class="px-4 py-3 font-semibold text-gray-800">${escapeText(insuredLabel)}</td>
            <td class="px-4 py-3 text-gray-600">${escapeText(c.insuranceCompany) || 'N/A'}</td>
            <td class="px-4 py-3 text-gray-500">${escapeText(c.policyNo) || 'N/A'}</td>
            <td class="px-4 py-3 text-right text-gray-600">AED ${annualPremium.toLocaleString()}</td>
            <td class="px-4 py-3 text-right text-gray-600">${escapeText(commRateStr)}</td>
            <td class="px-4 py-3 text-right font-semibold text-gray-800">AED ${totalCommission.toLocaleString()}</td>
            <td class="px-4 py-3 text-right font-bold text-teal-700">AED ${agentCommission.toLocaleString()}</td>
        </tr>
    `;
}

/**
 * @param {string} id
 * @param {string} value
 */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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