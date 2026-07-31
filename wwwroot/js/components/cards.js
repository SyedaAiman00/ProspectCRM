import { getPipelineStage } from '../utils/pipeline.js';

export const ClientCard = (c) => {
    const balanceOwed = Number(c.balance) || 0;
    const totalPremium = Number(c.totalPremium) || 0;
    const collectedPremium = Number(c.collectedPremium) || 0;
    const agentCommission = Number(c.agentCommission) || 0;
    const isPaidInFull = balanceOwed <= 0;

    return `
    <!-- The White Policy Card -->
    <div class="kanban-prospect-card flex flex-col gap-2" data-client-id="${c.id}">

        <!-- Header: Insurance Company / Product + Policy No + Edit/Delete -->
        <div class="flex items-center justify-between flex-wrap gap-y-1">
            <div class="flex gap-1 flex-wrap">
                <span class="text-[9px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold uppercase">${escapeText(c.insuranceCompany) || 'N/A'}</span>
                <span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">${escapeText(c.productName) || 'N/A'}</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-[10px] text-gray-400 font-semibold truncate max-w-[7rem]">Policy: ${escapeText(c.policyNo) || 'N/A'}</span>
                <button type="button" class="client-edit-btn flex-shrink-0" data-client-id="${c.id}" title="Edit client">
                    <i data-lucide="pencil" class="w-3 h-3 text-gray-400 hover:text-teal-600"></i>
                </button>
                <button type="button" class="client-delete-btn flex-shrink-0" data-client-id="${c.id}" title="Delete client">
                    <i data-lucide="trash-2" class="w-3 h-3 text-gray-400 hover:text-rose-600"></i>
                </button>
            </div>
        </div>

        <!-- Insured Info -->
        <div>
            <h4 class="font-bold text-gray-900 text-sm tracking-tight">${escapeText(c.insuredName)}</h4>
            <div class="text-[11px] text-gray-500 font-medium">
                ${escapeText(c.sponsorDetails) || 'Self'} • <span class="text-teal-700">${escapeText(c.modeOfPayment) || 'N/A'}</span>
            </div>
        </div>

        <!-- Financial Box -->
        <div class="bg-gray-50 p-2 rounded text-[11px] text-gray-600 border border-gray-100 space-y-1">
            <div class="flex justify-between">
                <span class="text-gray-500">Total Premium</span>
                <span class="font-bold text-gray-800">AED ${totalPremium.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-500">Collected</span>
                <span class="font-bold text-gray-800">AED ${collectedPremium.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="${isPaidInFull ? 'text-emerald-600' : 'text-rose-600'} font-semibold">
                    ${isPaidInFull ? 'Paid in Full' : 'Balance Due'}
                </span>
                <span class="font-bold ${isPaidInFull ? 'text-emerald-600' : 'text-rose-600'}">AED ${balanceOwed.toLocaleString()}</span>
            </div>
        </div>

        <!-- Footer: Commission -->
        <div class="flex items-center justify-between text-[11px] text-gray-500">
            <span class="font-medium">Comm Rate: ${c.commRate != null ? escapeText(String(c.commRate)) + '%' : 'N/A'}</span>
            <span class="font-bold text-gray-800">Agent Comm: AED ${agentCommission.toLocaleString()}</span>
        </div>

        <!-- Record Payment quick action — hidden once fully paid -->
        ${isPaidInFull ? '' : `
        <button type="button" class="btn-record-payment w-full border-2 border-dashed text-teal-700 hover:text-teal-800 hover:border-teal-400 hover:bg-teal-50 border-teal-200 rounded-lg py-2 transition-all flex items-center justify-center gap-1 text-[11px] font-semibold"
                data-client-id="${c.id}">
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