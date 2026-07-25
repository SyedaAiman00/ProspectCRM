import { isAdmin } from '../auth/session.js';
import { getViewingAgentId } from '../store/state.js';
import { getProspects } from '../api/prospect.js';
import { getCurrentUser, updateMonthlyTarget } from '../api/user.js';
import { groupProspectsByStage, calculatePipelineValue, PIPELINE_STAGES } from '../utils/pipeline.js';

import { openModal, closeModal } from '../components/modal.js';
import { targetFormFieldsHtml, readTargetFormValue } from '../components/targetForm.js';

// The agent's monthly qualified-conversion target — loaded from their user
// record on init and kept here so renderKpis doesn't need to refetch it.
let currentMonthlyTarget = 5;

/**
 * Entry point for the Dashboard page. Called by router.js
 * once dashboard.html has been injected into the DOM.
 */
export async function initDashboard() {
    bindEditTargetButton();

    const agentId = isAdmin() ? getViewingAgentId() : null;

    try {
        const [prospects, user] = await Promise.all([getProspects(agentId), getCurrentUser(agentId)]);
        currentMonthlyTarget = user.monthlyTarget;
        renderKpis(prospects);
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
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
            await initDashboard(); // reload so the KPI reflects the new target immediately
        } catch (err) {
            console.error('Failed to update monthly target:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Target';
            alert('Something went wrong updating your target. Please try again.');
        }
    });
}

/**
 * Computes and renders the 3 KPI cards from the prospect list.
 * @param {object[]} prospects
 */
function renderKpis(prospects) {

    try{

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

    if (window.lucide) lucide.createIcons();

    }
    catch (e) {
        console.error("CRITICAL RENDER ERROR:", e); // Check console for this
    }
  
    }

/**
 * Small DOM helper — sets text content only if the element exists,
 * so this stays safe to call even before the page fully mounts.
 * @param {string} id
 * @param {string} value
 */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}