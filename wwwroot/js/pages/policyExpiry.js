import { getClients } from '../api/client.js';
import { getCustomers } from '../api/customer.js';
import { isAdmin } from '../auth/session.js';
import { getViewingAgentId } from '../store/state.js';
import { loadPage } from '../router.js';
import {
    groupPoliciesByExpiryMonth,
    monthKeyFromDate,
    formatMonthLabel,
    getExpiryUrgency,
    daysRemaining,
    URGENCY_META,
    EXPIRY_URGENCY,
} from '../utils/expiryUrgency.js';

// Cache of the most recently fetched policies (grouped by expiry month)
// and customers, so switching months doesn't need a refetch.
let currentCustomers = [];
let policiesByMonth = {};

// The month currently being viewed — always normalized to the 1st of
// the month so comparisons/formatting stay simple.
let selectedMonth = startOfMonth(new Date());

/**
 * Entry point for the Policy Expiry page. Called by router.js
 * once policyExpiry.html has been injected into the DOM.
 * Reuses the same getClients()/getCustomers() data the Clients Board
 * already uses, so this page can never drift out of sync with it.
 */
export async function initPolicyExpiry() {
    bindMonthNavButtons();

    selectedMonth = startOfMonth(new Date()); // always default to the current month on (re)entry

    const agentId = isAdmin() ? getViewingAgentId() : null;

    try {
        const [customers, policies] = await Promise.all([
            getCustomers(agentId),
            getClients(agentId),
        ]);
        currentCustomers = customers;
        policiesByMonth = groupPoliciesByExpiryMonth(policies);
        renderMonth();
    } catch (err) {
        console.error('Policy Expiry load error:', err);
    }
}

function bindMonthNavButtons() {
    const prevBtn = document.getElementById('pe-prev-month');
    const nextBtn = document.getElementById('pe-next-month');
    if (!prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', () => {
        selectedMonth = shiftMonth(selectedMonth, -1);
        renderMonth();
    });

    nextBtn.addEventListener('click', () => {
        selectedMonth = shiftMonth(selectedMonth, 1);
        renderMonth();
    });
}

/**
 * Renders the month label, summary counts, and policy list for whatever
 * month is currently selected.
 */
function renderMonth() {
    const labelEl = document.getElementById('pe-month-label');
    if (labelEl) labelEl.textContent = formatMonthLabel(selectedMonth);

    const monthPolicies = (policiesByMonth[monthKeyFromDate(selectedMonth)] || [])
        .slice()
        .sort((a, b) => new Date(a.policyExpiryDate) - new Date(b.policyExpiryDate));

    renderSummary(monthPolicies);
    renderPolicyList(monthPolicies);

    if (window.lucide) lucide.createIcons();
}

/**
 * @param {object[]} monthPolicies
 */
function renderSummary(monthPolicies) {
    const container = document.getElementById('pe-summary');
    if (!container) return;

    const counts = {
        [EXPIRY_URGENCY.EXPIRED]: 0,
        [EXPIRY_URGENCY.CRITICAL]: 0,
        [EXPIRY_URGENCY.URGENT]: 0,
        [EXPIRY_URGENCY.UPCOMING]: 0,
        [EXPIRY_URGENCY.PLANNED]: 0,
    };

    monthPolicies.forEach((p) => {
        counts[getExpiryUrgency(p.policyExpiryDate)] += 1;
    });

    const pillsHtml = Object.entries(counts)
        .map(([urgency, count]) => {
            const meta = URGENCY_META[urgency];
            return `
                <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.badgeClass}">
                    ${count} ${meta.label}
                </span>
            `;
        })
        .join('');

    container.innerHTML = `
        <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3" id="pe-summary-card">
            <div>
                <p class="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Policies Expiring</p>
                <h3 class="text-xl font-bold text-gray-900 tracking-tight">${monthPolicies.length}</h3>
            </div>
            <div class="flex flex-wrap gap-2">
                ${pillsHtml}
            </div>
        </div>
    `;
}

/**
 * @param {object[]} monthPolicies
 */
function renderPolicyList(monthPolicies) {
    const container = document.getElementById('pe-policy-list');
    if (!container) return;

    if (!monthPolicies.length) {
        container.innerHTML = `<p class="text-sm text-gray-400 text-center py-10">No policies expiring this month.</p>`;
        return;
    }

    container.innerHTML = monthPolicies.map(renderPolicyRow).join('');

    container.querySelectorAll('.pe-view-client-btn').forEach((btn) => {
        btn.addEventListener('click', () => goToClientsBoard());
    });
}

/**
 * @param {object} p - a Client/policy record (see Models/Client.cs)
 * @returns {string}
 */
function renderPolicyRow(p) {
    const customer = currentCustomers.find((c) => c.id === p.customerId);
    const customerName = customer ? customer.name : 'Unknown Customer';
    const insuredLabel = p.insuredPersonName || p.insuredName || '';

    const urgency = getExpiryUrgency(p.policyExpiryDate);
    const meta = URGENCY_META[urgency];
    const days = daysRemaining(p.policyExpiryDate);
    const daysLabel = days < 0
        ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
        : days === 0
            ? 'Expires today'
            : `${days} day${days === 1 ? '' : 's'} remaining`;

    return `
        <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="font-bold text-gray-900 text-sm truncate">${escapeText(customerName)}</h4>
                    ${insuredLabel && insuredLabel !== customerName ? `<span class="text-xs text-gray-400">(${escapeText(insuredLabel)})</span>` : ''}
                </div>
                <div class="flex gap-1.5 mt-1.5 flex-wrap">
                    <span class="text-[9px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold uppercase">${escapeText(p.productName) || 'N/A'}</span>
                    <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">${escapeText(p.insuranceCompany) || 'N/A'}</span>
                    <span class="text-[9px] text-gray-400 font-medium">Policy #${escapeText(p.policyNo) || 'N/A'}</span>
                </div>
            </div>

            <div class="flex items-center gap-4 flex-shrink-0">
                <div class="text-right">
                    <p class="text-xs font-semibold text-gray-700">${new Date(p.policyExpiryDate).toLocaleDateString()}</p>
                    <p class="text-[11px] text-gray-400">${daysLabel}</p>
                </div>

                <span class="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${meta.badgeClass}">${meta.label}</span>

                <button type="button" class="pe-view-client-btn py-1.5 px-3 rounded-lg text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50 transition-all" data-customer-id="${p.customerId ?? ''}">
                    View Client
                </button>
            </div>
        </div>
    `;
}

/**
 * Basic connection into the existing Clients Board — switches the SPA
 * to the Clients page, where the agent can find the customer/policy
 * via the existing customer cards. Deeper deep-linking (auto-expanding
 * the specific customer card) can be layered on later without touching
 * this page's structure.
 */
function goToClientsBoard() {
    document.querySelectorAll('.sidebar-link').forEach((link) => link.classList.remove('active'));
    document.getElementById('nav-clients')?.classList.add('active');
    loadPage('clients');
}

/** @param {Date} date */
function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** @param {Date} date @param {number} delta */
function shiftMonth(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
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