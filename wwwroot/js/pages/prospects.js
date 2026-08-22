import { getProspects, createProspect, logOutreach, scheduleAppointment, closeProspect, deleteProspect } from '../api/prospect.js';
import { createClient } from '../api/client.js';
import { getCurrentUser, updateMonthlyTarget } from '../api/user.js';
import { groupProspectsByStage, calculatePipelineValue, getPipelineStage, PIPELINE_STAGES } from '../utils/pipeline.js';
import { ProspectCard } from '../components/cards.js';
import { openModal, closeModal } from '../components/modal.js';
import { prospectFormFieldsHtml, readProspectFormValues, bindProspectFormNationality } from '../components/prospectForm.js';
import { outreachFormFieldsHtml, readOutreachFormValues } from '../components/outreachForm.js';
import { appointmentFormFieldsHtml, readAppointmentFormValues } from '../components/appointmentForm.js';
import { closingFormFieldsHtml, readClosingFormValues } from '../components/closingForm.js';
import { clientFormFieldsHtml, bindClientFormCalculations, bindClientFormDropdowns, bindClientFormDateGuards, validateClientFormDates, readClientFormValues } from '../components/clientForm.js';import { isAdmin } from '../auth/session.js';
import { getViewingAgentId } from '../store/state.js';
import { targetFormFieldsHtml, readTargetFormValue } from '../components/targetForm.js';
import { initContactPopovers } from '../components/contactPopover.js';
import { openConfirmModal } from '../components/confirmModal.js';
import { getCustomers, createCustomer } from '../api/customer.js';
import { convertCustomerStepHtml, bindConvertCustomerStepToggle, readConvertCustomerStepValue } from '../components/convertCustomerStep.js';


// Maps each pipeline stage to its column + counter element IDs in prospects.html
const COLUMN_MAP = {
    new: { columnId: 'col-new', countId: 'count-new' },
    contacted: { columnId: 'col-contacted', countId: 'count-contacted' },
    progress: { columnId: 'col-progress', countId: 'count-progress' },
    qualified: { columnId: 'col-qualified', countId: 'count-qualified' },
};

// The agent's monthly qualified-conversion target — loaded from their user
// record on init and kept here so renderKpis doesn't need to refetch it.
let currentMonthlyTarget = 5;

// Cache of the most recently fetched prospects, so modals can look up
// full record details (for prefilling) from just a data-prospect-id.
let currentProspects = [];

/**
 * Entry point for the Prospects Board page. Called by router.js
 * once prospects.html has been injected into the DOM.
 * Fetches prospects once and feeds both the KPI overview and the board.
 */
export async function initProspectsBoard() {
    bindAddProspectButton();
    bindStageActionButtons();
    bindDeleteButtons();
    bindColumnQuickPickButtons();
    bindEditTargetButton();

    const canvas = document.getElementById('view-prospects-canvas');
    if (canvas) initContactPopovers(canvas);

    // If an admin is viewing another agent's board,
    // fetch that agent's data instead.
    const agentId = isAdmin() ? getViewingAgentId() : null;

    try {
        const [prospects, user] = await Promise.all([
            getProspects(agentId),
            getCurrentUser(agentId)
        ]);

        currentProspects = prospects;
        currentMonthlyTarget = user.monthlyTarget;
        renderKpis(currentProspects);
        renderBoard(currentProspects);
    } catch (err) {
        console.error('Prospects Board load error:', err);
    }
}

/**
 * Wires up the "Add New Prospect" button to open the create-prospect modal.
 */
function bindAddProspectButton() {
    const addBtn = document.getElementById('btn-add-prospect');
    if (addBtn) addBtn.addEventListener('click', openAddProspectModal);
}

/**
 * Wires up the small edit control next to the target KPI so the agent
 * can set their own monthly conversion goal.
 */
/**
 * Wires up the small edit control next to the target KPI to open
 * the Edit Monthly Target modal.
 */
function bindEditTargetButton() {
    const btn = document.getElementById('btn-edit-target');
    if (!btn || btn.dataset.bound) return;

    btn.addEventListener('click', openEditTargetModal);

    btn.dataset.bound = 'true'; // guard against double-binding across re-inits
}

/**
 * Opens the Edit Monthly Target modal, prefilled with the current target,
 * and handles the save flow.
 */
function openEditTargetModal() {
    const overlay = openModal({
        title: 'Edit Monthly Target',
        bodyHtml: targetFormFieldsHtml(currentMonthlyTarget),
    });

    const form = overlay.querySelector('#target-form');
    overlay.querySelector('#tf-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newTarget = readTargetFormValue(form);
        if (!Number.isInteger(newTarget) || newTarget < 1) {
            alert('Please enter a whole number of 1 or more.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            await updateMonthlyTarget(newTarget);
            closeModal();
           await initProspectsBoard();// reload so the KPI reflects the new target immediately
        } catch (err) {
            console.error('Failed to update monthly target:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Target';
            alert('Something went wrong updating your target. Please try again.');
        }
    });
}
/**
 * Event delegation for the per-card stage-aware action buttons
 * (Log Outreach / Schedule Appointment / Mark as Closed / Convert to Client).
 * Bound once on the board container rather than per-card, since cards
 * get replaced on every render — a direct binding would go stale.
 */
function bindStageActionButtons() {
    const canvas = document.getElementById('view-prospects-canvas');
    if (!canvas || canvas.dataset.stageActionsBound) return;

    canvas.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-stage-action');
        if (!btn || btn.disabled) return;

        const prospectId = Number(btn.dataset.prospectId);
        const prospect = currentProspects.find((p) => p.id === prospectId);
        if (prospect) dispatchStageAction(btn.dataset.stageAction, prospect);
    });

    canvas.dataset.stageActionsBound = 'true'; // guard against double-binding across re-inits
}

/**
 * Wires up the 3 generic column-footer buttons ("quick actions" that aren't
 * tied to a specific prospect yet — the agent picks one from a list first).
 */
function bindColumnQuickPickButtons() {
    bindQuickPick('btn-quick-outreach', PIPELINE_STAGES.NEW, 'outreach');
    bindQuickPick('btn-quick-appointment', PIPELINE_STAGES.CONTACTED, 'appointment');
    bindQuickPick('btn-quick-close', PIPELINE_STAGES.PROGRESS, 'close');
}

/**
 * @param {string} buttonId
 * @param {string} eligibleStage - only prospects currently in this stage show up in the picker
 * @param {string} action - which action modal to open once a prospect is picked
 */
function bindQuickPick(buttonId, eligibleStage, action) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.addEventListener('click', () => {
        const eligible = currentProspects.filter((p) => getPipelineStage(p) === eligibleStage);
        openQuickPickModal(eligible, action);
    });
}

/**
 * Shows a simple "pick a prospect" list, then opens the matching action
 * modal once one is selected.
 * @param {object[]} eligibleProspects
 * @param {string} action
 */
function openQuickPickModal(eligibleProspects, action) {
    const listHtml = eligibleProspects.length
        ? eligibleProspects.map((p) => `
            <button type="button" class="quick-pick-item w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100 flex items-center justify-between" data-prospect-id="${p.id}">
                <span class="font-semibold text-sm text-gray-800">${p.prospectName}</span>
                <span class="text-xs text-gray-400">ID: ${p.id}</span>
            </button>
        `).join('')
        : `<p class="text-sm text-gray-400 text-center py-6">No prospects currently in this stage.</p>`;

    const overlay = openModal({
        title: 'Select a Prospect',
        bodyHtml: `<div class="space-y-2">${listHtml}</div>`,
    });

    overlay.querySelectorAll('.quick-pick-item').forEach((item) => {
        item.addEventListener('click', () => {
            const prospectId = Number(item.dataset.prospectId);
            const prospect = currentProspects.find((p) => p.id === prospectId);
            closeModal();
            if (prospect) dispatchStageAction(action, prospect);
        });
    });
}

/**
 * Routes a stage-action to the right modal opener.
 * @param {string} action - 'outreach' | 'appointment' | 'close' | 'convert'
 * @param {object} prospect
 */
function dispatchStageAction(action, prospect) {
    if (action === 'outreach') return openLogOutreachModal(prospect);
    if (action === 'appointment') return openScheduleAppointmentModal(prospect);
    if (action === 'close') return openMarkClosedModal(prospect);
    if (action === 'convert') return openConvertToClientModal(prospect);
}

/**
 * Opens the Add New Prospect modal and handles the save flow.
 */
function openAddProspectModal() {
    const overlay = openModal({
        title: 'Add New Prospect',
        bodyHtml: prospectFormFieldsHtml(),
    });

    const form = overlay.querySelector('#prospect-form');
    bindProspectFormNationality(form);
    overlay.querySelector('#pf-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readProspectFormValues(form);
            await createProspect(values);
            closeModal();
            await initProspectsBoard();
        } catch (err) {
            console.error('Failed to create prospect:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Prospect';
            alert('Something went wrong saving this prospect. Please try again.');
        }
    });
}

/**
 * Opens the Log New Outreach modal, prefilled with the given prospect's
 * existing call/follow-up data, and handles the save flow.
 * @param {object} prospect
 */
function openLogOutreachModal(prospect) {
    const overlay = openModal({
        title: `Log Outreach — ${prospect.prospectName}`,
        bodyHtml: outreachFormFieldsHtml(prospect),
    });

    const form = overlay.querySelector('#outreach-form');
    overlay.querySelector('#of-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readOutreachFormValues(form);
            await logOutreach(prospect.id, values);
            closeModal();
            await initProspectsBoard(); // the card may move to a different column now
        } catch (err) {
            console.error('Failed to log outreach:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Outreach';
            alert('Something went wrong saving this outreach. Please try again.');
        }
    });
}

/**
 * Opens the Schedule Appointment modal for a Contacted prospect.
 * @param {object} prospect
 */
function openScheduleAppointmentModal(prospect) {
    const overlay = openModal({
        title: `Schedule Appointment — ${prospect.prospectName}`,
        bodyHtml: appointmentFormFieldsHtml(prospect),
    });

    const form = overlay.querySelector('#appointment-form');
    overlay.querySelector('#af-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readAppointmentFormValues(form);
            await scheduleAppointment(prospect.id, values);
            closeModal();
            await initProspectsBoard();
        } catch (err) {
            console.error('Failed to schedule appointment:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Appointment';
            alert('Something went wrong saving this appointment. Please try again.');
        }
    });
}

/**
 * Opens the Mark as Closed modal for an In Progress prospect.
 * @param {object} prospect
 */
function openMarkClosedModal(prospect) {
    const overlay = openModal({
        title: `Mark as Closed — ${prospect.prospectName}`,
        bodyHtml: closingFormFieldsHtml(prospect),
    });

    const form = overlay.querySelector('#closing-form');
    overlay.querySelector('#cf-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readClosingFormValues(form);
            await closeProspect(prospect.id, values);
            closeModal();
            await initProspectsBoard();
        } catch (err) {
            console.error('Failed to close prospect:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Mark as Closed';
            alert('Something went wrong closing this prospect. Please try again.');
        }
    });
}

/**
 * Opens the Convert to Client flow for a Qualified prospect. Two steps:
 * 1. Pick an existing Customer to attach the new policy to, or create a
 *    new one (defaulting to the prospect's name).
 * 2. Fill in the actual policy details, scoped to that customer.
 * On final save: creates the policy, then deletes the original prospect
 * (per product decision — once converted, the prospect record no longer
 * needs to exist separately).
 * @param {object} prospect
 */
async function openConvertToClientModal(prospect) {
    let customers = [];
    try {
        const agentId = isAdmin() ? getViewingAgentId() : null;
        customers = await getCustomers(agentId);
    } catch (err) {
        console.error('Failed to load customers for conversion:', err);
        alert('Could not load your customer list. Please try again.');
        return;
    }

    openConvertCustomerStep(prospect, customers);
}

/**
 * Step 1 of conversion — choose or create the Customer.
 * @param {object} prospect
 * @param {object[]} customers
 */
function openConvertCustomerStep(prospect, customers) {
    const overlay = openModal({
        title: `Convert to Client — ${prospect.prospectName}`,
        bodyHtml: convertCustomerStepHtml(customers, prospect.prospectName),
    });

    const form = overlay.querySelector('#convert-customer-form');
    bindConvertCustomerStepToggle(form);
    overlay.querySelector('#ccs-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Continuing...';

        try {
            const selection = readConvertCustomerStepValue(form);

            let customerId;
            if (selection.isNew) {
                if (!selection.name) {
                    alert('Please enter a customer name.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Continue';
                    return;
                }
                const newCustomer = await createCustomer({
                    name: selection.name,
                    customerType: selection.customerType,
                    phone: null,
                    email: null,
                    notes: null,
                });
                customerId = newCustomer.id;
            } else {
                customerId = selection.customerId;
            }

            closeModal();
            openConvertPolicyStep(prospect, customerId);
        } catch (err) {
            console.error('Failed to resolve customer for conversion:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continue';
            alert('Something went wrong setting up the customer. Please try again.');
        }
    });
}

/**
 * Step 2 of conversion — fill in the actual policy, now that we know
 * which Customer it belongs to.
 * @param {object} prospect
 * @param {number} customerId
 */
function openConvertPolicyStep(prospect, customerId) {
    const overlay = openModal({
        title: `Add Policy — ${prospect.prospectName}`,
        bodyHtml: clientFormFieldsHtml(customerId, {
            insuredPersonName: prospect.prospectName,
            remarks: prospect.remarks,
        }),
    });

    const form = overlay.querySelector('#client-form');
    bindClientFormCalculations(form);
    bindClientFormDropdowns(form, {
        insuranceCompany: prospect.insuranceCompany, // usually undefined on a prospect — fine, dropdown just opens blank
        productName: prospect.productName,
        modeOfPayment: prospect.modeOfPayment,
    });
    bindClientFormDateGuards(form);
    overlay.querySelector('#cf-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dateError = validateClientFormDates(form);
        if (dateError) {
            alert(dateError);
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Converting...';

        try {
            const values = readClientFormValues(form);
            await createClient(values);
            await deleteProspect(prospect.id);
            closeModal();
            await initProspectsBoard(); // the prospect is gone — board refreshes without it
        } catch (err) {
            console.error('Failed to convert prospect to client:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Policy';
            alert('Something went wrong converting this prospect. Please try again.');
        }
    });
}

/**
 * Computes and renders the 3 KPI cards from the prospect list.
 * @param {object[]} prospects
 */
function renderKpis(prospects) {
    const pipelineValue = calculatePipelineValue(prospects);
    const totalCount = prospects.length;
    const qualifiedCount = groupProspectsByStage(prospects)[PIPELINE_STAGES.QUALIFIED].length;
    const targetPct = Math.min(100, Math.round((qualifiedCount / currentMonthlyTarget) * 100));

    setText('kpi-total-value', `AED ${pipelineValue.toLocaleString()}`);
    setText('kpi-total-count', `${totalCount} Prospects`);
    setText('kpi-target-text', `${qualifiedCount} / ${currentMonthlyTarget}`);
    setText('kpi-target-pct', `${targetPct}% Achieved`);

    const targetBar = document.getElementById('kpi-target-bar');
    if (targetBar) targetBar.style.width = `${targetPct}%`;
}

/**
 * Small DOM helper — sets text content only if the element exists.
 * @param {string} id
 * @param {string} value
 */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/**
 * Groups prospects by stage and renders each column.
 * @param {object[]} prospects
 */
function renderBoard(prospects) {
    const grouped = groupProspectsByStage(prospects);

    Object.entries(COLUMN_MAP).forEach(([stage, { columnId, countId }]) => {
        const columnEl = document.getElementById(columnId);
        const countEl = document.getElementById(countId);

        if (!columnEl) return; // Guard clause — page not in DOM yet

        const stageProspects = grouped[stage];

        columnEl.innerHTML = stageProspects.map(renderCard).join('');

        if (countEl) countEl.textContent = stageProspects.length;
    });

    if (window.lucide) lucide.createIcons();
}


/**
 * Event delegation for the per-card delete buttons. Works at any pipeline
 * stage — unlike the stage-action button, delete isn't tied to where the
 * prospect currently sits in the funnel.
 */
/**
 * Event delegation for the per-card delete buttons. Works at any pipeline
 * stage — unlike the stage-action button, delete isn't tied to where the
 * prospect currently sits in the funnel.
 */
function bindDeleteButtons() {
    const canvas = document.getElementById('view-prospects-canvas');
    if (!canvas || canvas.dataset.deleteActionsBound) return;

    canvas.addEventListener('click', (e) => {
        const btn = e.target.closest('.prospect-delete-btn');
        if (!btn) return;

        const prospectId = Number(btn.dataset.prospectId);
        const prospect = currentProspects.find((p) => p.id === prospectId);
        if (!prospect) return;

        openConfirmModal({
                title: 'Delete Prospect',
                message: `Delete "<strong>${escapeText(prospect.prospectName)}</strong>"? This can't be undone.`,
                confirmLabel: 'Delete',
            onConfirm: async () => {
                try {
                    await deleteProspect(prospectId);
                    await initProspectsBoard(); // board refreshes without it
                } catch (err) {
                    console.error('Failed to delete prospect:', err);
                    alert('Something went wrong deleting this prospect. Please try again.');
                    throw err; // re-throw so the confirm button re-enables itself
                }
            },
        });
    });

    canvas.dataset.deleteActionsBound = 'true'; // guard against double-binding across re-inits
}
/**
 * Builds the HTML for a single prospect card, deriving the display fields
 * ProspectCard expects from the raw prospect record.
 * @param {object} p
 * @returns {string}
 */
function renderCard(p) {
    const incomeVal = p.income ? parseInt(p.income, 10) : 0;
    const followUpStr = p.followupDate
        ? new Date(p.followupDate).toLocaleDateString()
        : 'N/A';
    const appointmentStr = p.firstAppointmentDate
        ? new Date(p.firstAppointmentDate).toLocaleDateString()
        : '';

    return ProspectCard(p, incomeVal, appointmentStr, followUpStr);
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