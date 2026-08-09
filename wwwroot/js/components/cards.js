import { getPipelineStage } from '../utils/pipeline.js';

/**
 * Renders one Customer card — the top-level unit on the Clients Board now.
 * Shows the customer's identity, an aggregate financial summary across all
 * their policies, and an expandable list of individual PolicyRow entries.
 * @param {object} customer
 * @param {object[]} policies - this customer's policies (already filtered)
 * @param {boolean} isExpanded
 */
export const CustomerCard = (customer, policies, isExpanded) => {
    const totalCollected = policies.reduce((sum, p) => sum + (Number(p.collectedPremium) || 0), 0);
    const totalBalance = policies.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
    const totalAgentCommission = policies.reduce((sum, p) => sum + (Number(p.agentCommission) || 0), 0);
    const isFullyPaid = totalBalance <= 0;

    const typeBadgeClasses = customer.customerType === 'Group'
        ? 'bg-indigo-50 text-indigo-700'
        : 'bg-teal-50 text-teal-800';

    return `
    <div class="kanban-prospect-card flex flex-col gap-3" data-customer-id="${customer.id}">

        <!-- Header: Name, Type badge, Edit/Delete -->
        <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
                <button type="button" class="customer-expand-toggle flex-shrink-0" data-customer-id="${customer.id}" title="${isExpanded ? 'Collapse' : 'Expand'} policies">
                    <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" class="w-4 h-4 text-gray-400"></i>
                </button>
                <div class="min-w-0">
                    <h4 class="font-bold text-gray-900 text-sm tracking-tight truncate">${escapeText(customer.name)}</h4>
                    <span class="text-[9px] ${typeBadgeClasses} px-1.5 py-0.5 rounded font-bold uppercase inline-block mt-1">${escapeText(customer.customerType)}</span>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button type="button" class="customer-edit-btn" data-customer-id="${customer.id}" title="Edit customer">
                    <i data-lucide="pencil" class="w-3 h-3 text-gray-400 hover:text-teal-600"></i>
                </button>
                <button type="button" class="customer-delete-btn" data-customer-id="${customer.id}" title="Delete customer">
                    <i data-lucide="trash-2" class="w-3 h-3 text-gray-400 hover:text-rose-600"></i>
                </button>
            </div>
        </div>

        <!-- Aggregate Financial Box -->
        <div class="bg-gray-50 p-2 rounded text-[11px] text-gray-600 border border-gray-100 space-y-1">
            <div class="flex justify-between">
                <span class="text-gray-500">${policies.length} ${policies.length === 1 ? 'Policy' : 'Policies'}</span>
                <span class="font-bold text-gray-800">Collected: AED ${totalCollected.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="${isFullyPaid ? 'text-emerald-600' : 'text-rose-600'} font-semibold">
                    ${isFullyPaid ? 'Paid in Full' : 'Balance Due'}
                </span>
                <span class="font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-rose-600'}">AED ${totalBalance.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-500">Total Agent Commission</span>
                <span class="font-bold text-teal-700">AED ${totalAgentCommission.toLocaleString()}</span>
            </div>
        </div>

        <!-- Expandable policy list -->
        ${isExpanded ? `
        <div class="space-y-2 pl-2 border-l-2 border-gray-100">
            ${policies.length ? policies.map(PolicyRow).join('') : `<p class="text-[11px] text-gray-400 italic py-1">No policies yet.</p>`}
        </div>
        ` : ''}

        <button type="button" class="btn-add-policy w-full border-2 border-dashed text-teal-700 hover:text-teal-800 hover:border-teal-400 hover:bg-teal-50 border-teal-200 rounded-lg py-2 transition-all flex items-center justify-center gap-1 text-[11px] font-semibold"
                data-customer-id="${customer.id}">
            <i data-lucide="plus" class="w-3 h-3"></i> Add Policy
        </button>

    </div>
    `;
};

/**
 * Renders one compact policy row inside an expanded CustomerCard.
 * @param {object} p
 */
export const PolicyRow = (p) => {
    const balanceOwed = Number(p.balance) || 0;
    const agentCommission = Number(p.agentCommission) || 0;
    const isPaidInFull = balanceOwed <= 0;

    return `
    <div class="bg-gray-50/70 rounded-lg p-2.5 border border-gray-100" data-policy-id="${p.id}">
        <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
                <p class="text-xs font-bold text-gray-800 truncate">${escapeText(p.insuredPersonName) || escapeText(p.insuredName)}</p>
                <div class="flex gap-1 mt-1 flex-wrap">
                    <span class="text-[9px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold uppercase">${escapeText(p.productName) || 'N/A'}</span>
                    <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">${escapeText(p.insuranceCompany) || 'N/A'}</span>
                </div>
                ${p.policyExpiryDate ? `<p class="text-[10px] mt-1 ${expiryUrgencyClass(p.policyExpiryDate)}">Expires ${new Date(p.policyExpiryDate).toLocaleDateString()}</p>` : ''}
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
                <button type="button" class="policy-edit-btn" data-policy-id="${p.id}" title="Edit policy">
                    <i data-lucide="pencil" class="w-3 h-3 text-gray-400 hover:text-teal-600"></i>
                </button>
                <button type="button" class="policy-delete-btn" data-policy-id="${p.id}" title="Delete policy">
                    <i data-lucide="trash-2" class="w-3 h-3 text-gray-400 hover:text-rose-600"></i>
                </button>
            </div>
        </div>
        <div class="flex items-center justify-between text-[10px] mt-2">
            <span class="${isPaidInFull ? 'text-emerald-600' : 'text-rose-600'} font-semibold">
                ${isPaidInFull ? 'Paid in Full' : `Balance: AED ${balanceOwed.toLocaleString()}`}
            </span>
            <span class="font-bold text-gray-700">Comm: AED ${agentCommission.toLocaleString()}</span>
        </div>
        ${isPaidInFull ? '' : `
        <button type="button" class="policy-record-payment w-full mt-2 border border-dashed border-teal-200 text-teal-700 hover:bg-teal-50 rounded-md py-1.5 text-[10px] font-semibold flex items-center justify-center gap-1 transition-all" data-policy-id="${p.id}">
            <i data-lucide="banknote" class="w-3 h-3"></i> Record Payment
        </button>
        `}
    </div>
    `;
};

export const ProspectCard = (p, incomeVal, appointmentStr, followUpStr) => {
    return `
    <!-- The White Card (The "box" inside the colored column) -->
    <div class="bg-white rounded-lg p-3 border border-gray-200 shadow-sm flex flex-col gap-2">
        
        <!-- Header: Tags, ID, and Delete -->
        <div class="flex items-center justify-between">
            <div class="flex gap-1">
                <span class="text-[9px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold uppercase">${escapeText(p.nationality) || 'Canadian'}</span>
                <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">${escapeText(p.leadSource) || 'Direct'}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-gray-400 font-semibold">ID: ${p.id}</span>
                <button type="button" class="prospect-delete-btn" data-prospect-id="${p.id}" title="Delete prospect">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
            </div>
        </div>
        
        <!-- Prospect Info -->
        <div>
            <h4 class="font-bold text-gray-900 text-sm tracking-tight">${escapeText(p.prospectName)}</h4>
            <div class="text-[11px] text-gray-500 font-medium">
                ${escapeText(p.designation) || 'Manager'} • <span class="text-teal-700">${escapeText(p.productInterest) || 'General Line'}</span>
            </div>
        </div>
        
        <!-- Content Box: Last Action -->
        <div class="bg-gray-50 p-2 rounded text-[11px] text-gray-600 border border-gray-100">
            <p class="font-bold text-gray-500 uppercase text-[9px]">Last Action</p>
            <p class="font-bold text-gray-800">${escapeText(p.callResponse) || 'No Response'}</p>
            <p class="italic text-gray-400">"${escapeText(p.notes) || 'No notes added'}"</p>
        </div>
        
        <!-- Footer: Follow-up and Income -->
       <!-- Footer: Follow-up and Income -->
        <div class="flex items-center justify-between text-[11px] text-gray-500">
            <span class="font-medium">Follow-up: ${escapeText(followUpStr)}</span>
            <div class="flex items-center gap-2">
                <button type="button" class="contact-icon-btn" data-contact-type="phone" data-contact-value="${escapeAttr(p.mobileNo)}" title="Show phone number">
                    <i data-lucide="phone" class="w-3 h-3 text-gray-400"></i>
                </button>
                <button type="button" class="contact-icon-btn" data-contact-type="email" data-contact-value="${escapeAttr(p.email)}" title="Show email">
                    <i data-lucide="mail" class="w-3 h-3 text-gray-400"></i>
                </button>
                <span class="font-bold text-gray-800">AED ${incomeVal.toLocaleString()}</span>
            </div>
        </div>
        
        <!-- Stage-aware action button: New -> Log Outreach, Contacted -> Schedule Appointment,
             In Progress -> Mark as Closed, Qualified -> Convert to Client (stubbed for now) -->
        ${renderStageActionButton(p)}
    </div>
    `;
};

/**
 * Picks the one relevant next-step action for a prospect based on its
 * current pipeline stage, so the card only ever shows one clear next action
 * instead of a generic button that doesn't match where the prospect is.
 * @param {object} p
 * @returns {string}
 */
function renderStageActionButton(p) {
    const stage = getPipelineStage(p);

    const actionsByStage = {
        new: {
            label: 'Log New Outreach',
            icon: 'phone-outgoing',
            action: 'outreach',
            classes: 'text-gray-500 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50 border-gray-200',
        },
        contacted: {
            label: 'Schedule Appointment',
            icon: 'calendar-plus',
            action: 'appointment',
            classes: 'text-indigo-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 border-indigo-200',
        },
        progress: {
            label: 'Mark as Closed',
            icon: 'check-square',
            action: 'close',
            classes: 'text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 border-emerald-200',
        },
        qualified: {
            label: 'Convert to Client',
            icon: 'user-check',
            action: 'convert',
            classes: 'text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 border-emerald-200',
        },
    };

    const { label, icon, action, classes } = actionsByStage[stage];

    return `
        <button class="btn-stage-action w-full border-2 border-dashed ${classes} rounded-lg py-2 transition-all flex items-center justify-center gap-1 text-[11px] font-semibold"
                data-prospect-id="${p.id}" data-stage-action="${action}">
            <i data-lucide="${icon}" class="w-3 h-3"></i> ${label}
        </button>
    `;
}

/** @param {string|null|undefined} value */
function escapeAttr(value) {
    return (value || '').toString().replace(/"/g, '&quot;');
}

/** @param {string} dateStr */
function expiryUrgencyClass(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateStr);
    expiry.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 3) return 'text-rose-600 font-bold';
    if (daysLeft <= 14) return 'text-amber-600 font-semibold';
    if (daysLeft <= 30) return 'text-teal-700 font-medium';
    return 'text-gray-400';
}

/**
 * Escapes text being injected into HTML content (not attributes).
 * Covers all 5 characters that matter for breaking out of text nodes/attrs.
 * @param {string|null|undefined} value
 * @returns {string}
 */
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