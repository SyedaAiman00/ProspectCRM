/**
 * Renders the policy-expiry notifications dropdown shown from the bell
 * icon in the topbar. Color-codes each entry by urgency based on how many
 * days remain until PolicyExpiryDate.
 */

/**
 * @param {object[]} policies - from GET /api/clients/expiring
 * @returns {string}
 */
export function renderNotificationsList(policies) {
    if (!policies.length) {
        return `<p class="notification-empty">No policies expiring in the next 30 days.</p>` + renderViewAllLink();
    }

    const itemsHtml = policies.map((p) => {
        const daysLeft = daysUntil(p.policyExpiryDate);
        const urgency = getUrgency(daysLeft);

        return `
            <div class="notification-item urgency-${urgency.className}">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-gray-800 truncate">${escapeText(p.customerName)}</span>
                    <span class="text-[10px] font-bold ${urgency.textClass} whitespace-nowrap">${urgency.label(daysLeft)}</span>
                </div>
                <span class="text-[11px] text-gray-500 truncate">${escapeText(p.insuredPersonName)} • ${escapeText(p.productName)}</span>
                <span class="text-[10px] text-gray-400">Policy ${escapeText(p.policyNo) || 'N/A'} • Expires ${formatDate(p.policyExpiryDate)}</span>
            </div>
        `;
    }).join('');

    return itemsHtml + renderViewAllLink();
}

/**
 * Footer link inside the notifications dropdown that hands off to the
 * full Policy Expiry workspace (see pages/policyExpiry.js) — the bell
 * stays a quick-glance surface, this is the way into the deeper view.
 * Click handling is bound in app.js, right after this HTML is injected.
 */
function renderViewAllLink() {
    return `
        <button type="button" id="notifications-view-all-btn" class="notifications-view-all-link">
            View All Expiring Policies
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
        </button>
    `;
}

/** @param {string} dateStr @returns {number} */
function daysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateStr);
    expiry.setHours(0, 0, 0, 0);
    return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function getUrgency(daysLeft) {
    if (daysLeft <= 3) {
        return { className: 'urgent', textClass: 'text-rose-600', label: (d) => (d <= 0 ? 'Expires today' : `${d}d left`) };
    }
    if (daysLeft <= 14) {
        return { className: 'soon', textClass: 'text-amber-600', label: (d) => `${d}d left` };
    }
    return { className: 'upcoming', textClass: 'text-teal-700', label: (d) => `${d}d left` };
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
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