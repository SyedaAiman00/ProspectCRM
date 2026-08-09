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
// and customers, so switching months/filters doesn't need a refetch.
let currentCustomers = [];
let policiesByMonth = {};

// The month currently being viewed — always normalized to the 1st of
// the month so comparisons/formatting stay simple.
let selectedMonth = startOfMonth(new Date());

// 'all' | one of EXPIRY_URGENCY values
let selectedUrgencyFilter = 'all';

// Free-text search, already lowercased for matching.
let searchQuery = '';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: EXPIRY_URGENCY.EXPIRED, label: 'Expired' },
    { key: EXPIRY_URGENCY.CRITICAL, label: 'Critical' },
    { key: EXPIRY_URGENCY.URGENT, label: 'Urgent' },
    { key: EXPIRY_URGENCY.UPCOMING, label: 'Upcoming' },
    { key: EXPIRY_URGENCY.PLANNED, label: 'Planned' },
];

/**
 * Entry point for the Policy Expiry page. Called by router.js
 * once policyExpiry.html has been injected into the DOM.
 * Reuses the same getClients()/getCustomers() data the Clients Board
 * already uses, so this page can never drift out of sync with it.
 */
export async function initPolicyExpiry() {
    bindMonthNavButtons();
    renderFilterPills();
    bindSearchInput();

    selectedMonth = startOfMonth(new Date()); // always default to the current month on (re)entry
    selectedUrgencyFilter = 'all';
    searchQuery = '';

    const searchInput = document.getElementById('pe-search-input');
    if (searchInput) searchInput.value = '';

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
 * Renders the filter pill row once. Re-renders happen only on click,
 * where each pill's own active state is toggled directly instead of
 * rebuilding the whole row.
 */
function renderFilterPills() {
    const container = document.getElementById('pe-filter-pills');
    if (!container) return;

    container.innerHTML = FILTERS.map(({ key, label }) => `
        <button type="button" class="pe-filter-pill ${key === selectedUrgencyFilter ? 'active' : ''}" data-filter-key="${key}">
            ${label}
        </button>
    `).join('');

    container.querySelectorAll('.pe-filter-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
            selectedUrgencyFilter = btn.dataset.filterKey;
            container.querySelectorAll('.pe-filter-pill').forEach((b) => {
                b.classList.toggle('active', b.dataset.filterKey === selectedUrgencyFilter);
            });
            renderMonth();
        });
    });
}

/**
 * Wires up the search box with a light debounce so re-rendering the list
 * doesn't happen on every single keystroke.
 */
function bindSearchInput() {
    const input = document.getElementById('pe-search-input');
    if (!input || input.dataset.bound) return;

    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = input.value.trim().toLowerCase();
            renderMonth();
        }, 200);
    });

    input.dataset.bound = 'true'; // guard against double-binding across re-inits
}

/**
 * Renders the month label, summary counts, and policy list for whatever
 * month is currently selected. The summary always reflects the FULL month
 * (unaffected by filter/search) so the agent keeps a true picture of the
 * month's workload; only the list below is narrowed by filter/search.
 */
function renderMonth() {
    const labelEl = document.getElementById('pe-month-label');
    if (labelEl) labelEl.textContent = formatMonthLabel(selectedMonth);

    const monthPolicies = (policiesByMonth[monthKeyFromDate(selectedMonth)] || [])
        .slice()
        .sort((a, b) => new Date(a.policyExpiryDate) - new Date(b.policyExpiryDate));

    renderSummary(monthPolicies);
    renderPolicyList(applyFilters(monthPolicies));

    if (window.lucide) lucide.createIcons();
}

/**
 * @param {object[]} monthPolicies
 * @returns {object[]}
 */
function applyFilters(monthPolicies) {
    return monthPolicies.filter((p) => {
        if (selectedUrgencyFilter !== 'all' && getExpiryUrgency(p.policyExpiryDate) !== selectedUrgencyFilter) {
            return false;
        }

        if (searchQuery) {
            const customer = currentCustomers.find((c) => c.id === p.customerId);
            const haystack = [
                customer?.name,
                p.insuredPersonName,
                p.insuredName,
                p.policyNo,
                p.insuranceCompany,
                p.productName,
            ].filter(Boolean).join(' ').toLowerCase();

            if (!haystack.includes(searchQuery)) return false;
        }

        return true;
    });
}

/**
 * @param {object[]} monthPolicies - the FULL month's policies, unfiltered
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
 * @param {object[]} filteredPolicies - already narrowed by urgency filter + search
 */
function renderPolicyList(filteredPolicies) {
    const container = document.getElementById('pe-policy-list');
    if (!container) return;

    if (!filteredPolicies.length) {
        container.innerHTML = `<p class="text-sm text-gray-400 text-center py-10">No policies match the current filter/search.</p>`;
        return;
    }

    container.innerHTML = filteredPolicies.map(renderPolicyRow).join('');

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
 * via the existing customer cards.
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