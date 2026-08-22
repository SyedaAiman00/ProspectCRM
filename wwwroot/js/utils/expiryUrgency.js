/**
 * Pure utilities for classifying policies by expiry urgency and grouping
 * them by month — powers the Policy Expiry page. Kept separate from
 * notificationsPanel.js's lighter-weight urgency logic (which only needs
 * a 30-day "soon/urgent/upcoming" split for the bell dropdown) since this
 * page needs the fuller Critical/Urgent/Upcoming/Planned/Expired breakdown.
 */

export const EXPIRY_URGENCY = {
    EXPIRED: 'expired',
    CRITICAL: 'critical',
    URGENT: 'urgent',
    UPCOMING: 'upcoming',
    PLANNED: 'planned',
};

export const URGENCY_META = {
    [EXPIRY_URGENCY.EXPIRED]: { label: 'Expired', badgeClass: 'bg-gray-800 text-white', rowClass: 'pe-row-expired' },
    [EXPIRY_URGENCY.CRITICAL]: { label: 'Critical', badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200', rowClass: 'pe-row-critical' },
    [EXPIRY_URGENCY.URGENT]: { label: 'Urgent', badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200', rowClass: 'pe-row-urgent' },
    [EXPIRY_URGENCY.UPCOMING]: { label: 'Upcoming', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200', rowClass: 'pe-row-upcoming' },
    [EXPIRY_URGENCY.PLANNED]: { label: 'Planned', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200', rowClass: 'pe-row-planned' },
};

/**
 * @param {string} expiryDateStr
 * @returns {number} whole days remaining (negative if already expired)
 */
export function daysRemaining(expiryDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

/**
 * Classifies a policy into one of the 5 urgency buckets based on how many
 * days remain until its expiry date (relative to today, not the calendar
 * month it's grouped under).
 * @param {string} expiryDateStr
 * @returns {string} one of EXPIRY_URGENCY
 */
export function getExpiryUrgency(expiryDateStr) {
    const days = daysRemaining(expiryDateStr);

    if (days < 0) return EXPIRY_URGENCY.EXPIRED;
    if (days <= 7) return EXPIRY_URGENCY.CRITICAL;
    if (days <= 30) return EXPIRY_URGENCY.URGENT;
    if (days <= 60) return EXPIRY_URGENCY.UPCOMING;
    return EXPIRY_URGENCY.PLANNED; // 16+ days, including anything further out than 30
}

/**
 * Groups policies (that have a non-null policyExpiryDate) by "YYYY-MM" key.
 * @param {object[]} policies
 * @returns {Object<string, object[]>}
 */
export function groupPoliciesByExpiryMonth(policies) {
    const grouped = {};
    policies
        .filter((p) => Boolean(p.policyExpiryDate))
        .forEach((p) => {
            const key = monthKey(p.policyExpiryDate);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
        });
    return grouped;
}

/**
 * @param {string} dateStr
 * @returns {string} "YYYY-MM"
 */
export function monthKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {Date} date - any date within the target month
 * @returns {string} "YYYY-MM", matching monthKey()'s format
 */
export function monthKeyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {Date} date
 * @returns {string} e.g. "August 2026"
 */
export function formatMonthLabel(date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}