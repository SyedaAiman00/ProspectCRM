import { getClients, createClient, updateClient, recordClientPayment, deleteClient } from '../api/client.js';
import { ClientCard } from '../components/cards.js';
import {
    calculateTotalCollectedPremium,
    calculateOutstandingBalance,
    calculateTotalAgentCommission,
} from '../utils/clientMetrics.js';
import { openModal, closeModal } from '../components/modal.js';
import { clientFormFieldsHtml, bindClientFormCalculations, bindClientFormDropdowns, readClientFormValues } from '../components/clientForm.js';
import { paymentFormFieldsHtml, readPaymentFormValue } from '../components/paymentForm.js';
import { openConfirmModal } from '../components/confirmModal.js';
import { exportClientsToExcel, exportClientsToPdf } from '../utils/exportClients.js';

import { isAdmin } from '../auth/session.js';
import { getViewingAgentId } from '../store/state.js';

// Cache of the most recently fetched clients, so edit/delete/payment modals
// (and the export buttons) can work from the same data without refetching.
let currentClients = [];

/**
 * Entry point for the Clients Pipeline page. Called by router.js
 * once clients.html has been injected into the DOM.
 */
export async function initClients() {
    bindAddClientButton();
    bindCardActionButtons();
    bindExportButton();

    const agentId = isAdmin() ? getViewingAgentId() : null;

    try {
        const clients = await getClients(agentId);
        currentClients = clients;
        renderKpis(clients);
        renderClientList(clients);
    } catch (err) {
        console.error('Clients Pipeline load error:', err);
    }
}

/**
 * Wires up the "Add New Client" button to open the client form, blank.
 */
function bindAddClientButton() {
    const addBtn = document.getElementById('btn-add-client');
    if (addBtn) addBtn.addEventListener('click', openAddClientModal);
}

/**
 * Wires up the Export button's dropdown (Excel / PDF) and closes it when
 * clicking elsewhere on the page.
 */
function bindExportButton() {
    const exportBtn = document.getElementById('btn-export-clients');
    const menu = document.getElementById('export-clients-menu');
    const excelBtn = document.getElementById('export-clients-excel');
    const pdfBtn = document.getElementById('export-clients-pdf');

    if (!exportBtn || !menu) return;

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
            if (currentClients.length === 0) {
                alert('There are no clients to export yet.');
                return;
            }
            exportClientsToExcel(currentClients);
            menu.classList.add('hidden');
        });
    }

    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (currentClients.length === 0) {
                alert('There are no clients to export yet.');
                return;
            }
            exportClientsToPdf(currentClients);
            menu.classList.add('hidden');
        });
    }
}

/**
 * Event delegation for every card's edit/delete/record-payment buttons.
 * Bound once on the list container rather than per-card, since cards
 * get replaced on every render — a direct binding would go stale.
 */
function bindCardActionButtons() {
    const listEl = document.getElementById('client-list');
    if (!listEl || listEl.dataset.actionsBound) return;

    listEl.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.client-edit-btn');
        if (editBtn) {
            const client = findClient(editBtn.dataset.clientId);
            if (client) openEditClientModal(client);
            return;
        }

        const deleteBtn = e.target.closest('.client-delete-btn');
        if (deleteBtn) {
            const client = findClient(deleteBtn.dataset.clientId);
            if (client) openDeleteClientConfirm(client);
            return;
        }

        const paymentBtn = e.target.closest('.btn-record-payment');
        if (paymentBtn) {
            const client = findClient(paymentBtn.dataset.clientId);
            if (client) openRecordPaymentModal(client);
        }
    });

    listEl.dataset.actionsBound = 'true'; // guard against double-binding across re-inits
}

/**
 * @param {string} idStr
 * @returns {object|undefined}
 */
function findClient(idStr) {
    const id = Number(idStr);
    return currentClients.find((c) => c.id === id);
}

/**
 * Opens the Add New Client modal (blank) and handles the save flow.
 */
function openAddClientModal() {
    const overlay = openModal({
        title: 'Add New Client',
        bodyHtml: clientFormFieldsHtml(),
    });

    const form = overlay.querySelector('#client-form');
    bindClientFormCalculations(form);
    bindClientFormDropdowns(form);
    overlay.querySelector('#cf-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readClientFormValues(form);
            await createClient(values);
            closeModal();
            await initClients();
        } catch (err) {
            console.error('Failed to create client:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Client';
            alert('Something went wrong saving this client. Please try again.');
        }
    });
}

/**
 * Opens the Edit Client modal, prefilled with the client's current values,
 * and handles the save flow via PUT.
 * @param {object} client
 */
function openEditClientModal(client) {
    const overlay = openModal({
        title: `Edit Client — ${client.insuredName}`,
        bodyHtml: clientFormFieldsHtml(client),
    });

    const form = overlay.querySelector('#client-form');
    bindClientFormCalculations(form);
    bindClientFormDropdowns(form, {
        insuranceCompany: client.insuranceCompany,
        productName: client.productName,
        modeOfPayment: client.modeOfPayment,
    });
    overlay.querySelector('#cf-cancel-btn').addEventListener('click', closeModal);

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Save Changes';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readClientFormValues(form);
            await updateClient(client.id, values);
            closeModal();
            await initClients();
        } catch (err) {
            console.error('Failed to update client:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
            alert('Something went wrong updating this client. Please try again.');
        }
    });
}

/**
 * Opens a confirm dialog before deleting a client record.
 * @param {object} client
 */
function openDeleteClientConfirm(client) {
    openConfirmModal({
        title: 'Delete Client',
        message: `Delete "<strong>${escapeText(client.insuredName)}</strong>"? This can't be undone.`,
        confirmLabel: 'Delete',
        onConfirm: async () => {
            try {
                await deleteClient(client.id);
                await initClients();
            } catch (err) {
                console.error('Failed to delete client:', err);
                alert('Something went wrong deleting this client. Please try again.');
                throw err; // re-throw so the confirm button re-enables itself
            }
        },
    });
}

/**
 * Opens the Record Payment modal for a client with an outstanding balance.
 * @param {object} client
 */
function openRecordPaymentModal(client) {
    const overlay = openModal({
        title: `Record Payment — ${client.insuredName}`,
        bodyHtml: paymentFormFieldsHtml(client.balance),
    });

    const form = overlay.querySelector('#payment-form');
    overlay.querySelector('#pmf-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');

        const amount = readPaymentFormValue(form);
        if (!amount || amount <= 0) {
            alert('Please enter a payment amount greater than zero.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            await recordClientPayment(client.id, amount);
            closeModal();
            await initClients();
        } catch (err) {
            console.error('Failed to record payment:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Payment';
            alert('Something went wrong recording this payment. Please try again.');
        }
    });
}

/**
 * Computes and renders the 3 KPI cards from the client list.
 * @param {object[]} clients
 */
function renderKpis(clients) {
    const totalCollected = calculateTotalCollectedPremium(clients);
    const outstandingBalance = calculateOutstandingBalance(clients);
    const totalCommission = calculateTotalAgentCommission(clients);

    setText('kpi-collected-value', `AED ${totalCollected.toLocaleString()}`);
    setText('kpi-active-clients', `${clients.length} Clients`);
    setText('kpi-outstanding-balance', `AED ${outstandingBalance.toLocaleString()}`);
    setText('kpi-total-commission', `AED ${totalCommission.toLocaleString()} Earned`);
}

/**
 * Renders the grid of client policy cards.
 * @param {object[]} clients
 */
function renderClientList(clients) {
    const listEl = document.getElementById('client-list');
    if (!listEl) return; // Guard clause — page not in DOM yet

    listEl.innerHTML = clients.length
        ? clients.map(ClientCard).join('')
        : `<p class="text-sm text-gray-400 col-span-full text-center py-10">No clients yet — add your first policy to get started.</p>`;

    if (window.lucide) lucide.createIcons();
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