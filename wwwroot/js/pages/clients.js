import { getClients, createClient, updateClient, recordClientPayment, deleteClient } from '../api/client.js';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/customer.js';
import { CustomerCard } from '../components/cards.js';
import {
    calculateTotalCollectedPremium,
    calculateOutstandingBalance,
    calculateTotalAgentCommission,
} from '../utils/clientMetrics.js';
import { openModal, closeModal } from '../components/modal.js';
import { clientFormFieldsHtml, bindClientFormCalculations, bindClientFormDropdowns, readClientFormValues } from '../components/clientForm.js';
import { customerFormFieldsHtml, bindCustomerTypeLabel, readCustomerFormValues } from '../components/customerForm.js';
import { paymentFormFieldsHtml, readPaymentFormValue } from '../components/paymentForm.js';
import { openConfirmModal } from '../components/confirmModal.js';
import { exportClientsToExcel, exportClientsToPdf } from '../utils/exportClients.js';

import { isAdmin } from '../auth/session.js';
import { getViewingAgentId } from '../store/state.js';

// Cache of the most recently fetched customers + policies, so modals can
// look up full record details from just a data-*-id, and re-renders don't
// need extra round-trips.
let currentCustomers = [];
let currentPolicies = [];

// Which customer cards are currently expanded — persisted across re-renders
// within a page visit so toggling one doesn't collapse the others.
const expandedCustomerIds = new Set();

/**
 * Entry point for the Clients Pipeline page. Called by router.js
 * once clients.html has been injected into the DOM.
 */
export async function initClients() {
    bindAddCustomerButton();
    bindCardActionButtons();
    bindExportButton();

    const agentId = isAdmin() ? getViewingAgentId() : null;

    try {
        const [customers, policies] = await Promise.all([
            getCustomers(agentId),
            getClients(agentId),
        ]);
        currentCustomers = customers;
        currentPolicies = policies;
        renderKpis(customers, policies);
        renderCustomerList();
    } catch (err) {
        console.error('Clients Pipeline load error:', err);
    }
}

/**
 * Wires up the "Add New Customer" button to open the customer form, blank.
 */
function bindAddCustomerButton() {
    const addBtn = document.getElementById('btn-add-client');
    if (addBtn) addBtn.addEventListener('click', openAddCustomerModal);
}

/**
 * Wires up the Export button's dropdown (Excel / PDF). Guarded against
 * double-binding — this lives in static HTML (unlike the customer cards,
 * which get replaced on every render), so without this guard every call
 * to initClients() would stack another set of listeners on the same buttons.
 */
function bindExportButton() {
    const exportBtn = document.getElementById('btn-export-clients');
    const menu = document.getElementById('export-clients-menu');
    const excelBtn = document.getElementById('export-clients-excel');
    const pdfBtn = document.getElementById('export-clients-pdf');

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
                alert('There are no policies to export yet.');
                return;
            }
            exportClientsToExcel(buildExportRows());
            menu.classList.add('hidden');
        });
    }

   if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (currentPolicies.length === 0) {
                alert('There are no policies to export yet.');
                return;
            }
            exportClientsToPdf(buildExportRows());
            menu.classList.add('hidden');
        });
    }

    exportBtn.dataset.bound = 'true'; // guard against double-binding across re-inits
}

/**
 * Flattens policies back into export-friendly rows, stamping each with its
 * customer's name so the export still reads sensibly per-row.
 * @returns {object[]}
 */
function buildExportRows() {
    return currentPolicies.map((p) => {
        const customer = currentCustomers.find((c) => c.id === p.customerId);
        return {
            ...p,
            insuredName: customer ? `${customer.name} — ${p.insuredPersonName || p.insuredName}` : (p.insuredPersonName || p.insuredName),
        };
    });
}

/**
 * Event delegation for every customer/policy card action button. Bound once
 * on the list container rather than per-card, since cards get replaced on
 * every render — a direct binding would go stale.
 */
function bindCardActionButtons() {
    const listEl = document.getElementById('client-list');
    if (!listEl || listEl.dataset.actionsBound) return;

    listEl.addEventListener('click', (e) => {
        const expandBtn = e.target.closest('.customer-expand-toggle');
        if (expandBtn) {
            toggleCustomerExpanded(Number(expandBtn.dataset.customerId));
            return;
        }

        const editCustomerBtn = e.target.closest('.customer-edit-btn');
        if (editCustomerBtn) {
            const customer = findCustomer(editCustomerBtn.dataset.customerId);
            if (customer) openEditCustomerModal(customer);
            return;
        }

        const deleteCustomerBtn = e.target.closest('.customer-delete-btn');
        if (deleteCustomerBtn) {
            const customer = findCustomer(deleteCustomerBtn.dataset.customerId);
            if (customer) openDeleteCustomerConfirm(customer);
            return;
        }

        const addPolicyBtn = e.target.closest('.btn-add-policy');
        if (addPolicyBtn) {
            openAddPolicyModal(Number(addPolicyBtn.dataset.customerId));
            return;
        }

        const editPolicyBtn = e.target.closest('.policy-edit-btn');
        if (editPolicyBtn) {
            const policy = findPolicy(editPolicyBtn.dataset.policyId);
            if (policy) openEditPolicyModal(policy);
            return;
        }

        const deletePolicyBtn = e.target.closest('.policy-delete-btn');
        if (deletePolicyBtn) {
            const policy = findPolicy(deletePolicyBtn.dataset.policyId);
            if (policy) openDeletePolicyConfirm(policy);
            return;
        }

        const paymentBtn = e.target.closest('.policy-record-payment');
        if (paymentBtn) {
            const policy = findPolicy(paymentBtn.dataset.policyId);
            if (policy) openRecordPaymentModal(policy);
        }
    });

    listEl.dataset.actionsBound = 'true';
}

function toggleCustomerExpanded(customerId) {
    if (expandedCustomerIds.has(customerId)) {
        expandedCustomerIds.delete(customerId);
    } else {
        expandedCustomerIds.add(customerId);
    }
    renderCustomerList();
}

/** @param {string} idStr @returns {object|undefined} */
function findCustomer(idStr) {
    return currentCustomers.find((c) => c.id === Number(idStr));
}

/** @param {string} idStr @returns {object|undefined} */
function findPolicy(idStr) {
    return currentPolicies.find((p) => p.id === Number(idStr));
}

/**
 * Opens the Add New Customer modal (blank) and handles the save flow.
 */
function openAddCustomerModal() {
    const overlay = openModal({
        title: 'Add New Customer',
        bodyHtml: customerFormFieldsHtml(),
    });

    const form = overlay.querySelector('#customer-form');
    bindCustomerTypeLabel(form);
    overlay.querySelector('#cuf-cancel-btn').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readCustomerFormValues(form);
            await createCustomer(values);
            closeModal();
            await initClients();
        } catch (err) {
            console.error('Failed to create customer:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Customer';
            alert('Something went wrong saving this customer. Please try again.');
        }
    });
}

/**
 * Opens the Edit Customer modal, prefilled, and handles the save flow.
 * @param {object} customer
 */
function openEditCustomerModal(customer) {
    const overlay = openModal({
        title: `Edit Customer — ${customer.name}`,
        bodyHtml: customerFormFieldsHtml(customer),
    });

    const form = overlay.querySelector('#customer-form');
    bindCustomerTypeLabel(form);
    overlay.querySelector('#cuf-cancel-btn').addEventListener('click', closeModal);

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Save Changes';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const values = readCustomerFormValues(form);
            await updateCustomer(customer.id, values);
            closeModal();
            await initClients();
        } catch (err) {
            console.error('Failed to update customer:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
            alert('Something went wrong updating this customer. Please try again.');
        }
    });
}

/**
 * Opens a confirm dialog before deleting a customer. Blocks the delete
 * client-side if they still have policies attached, since the backend's
 * foreign key would reject it anyway — this avoids a confusing failed
 * request and tells the agent exactly why upfront.
 * @param {object} customer
 */
function openDeleteCustomerConfirm(customer) {
    const hasPolicies = currentPolicies.some((p) => p.customerId === customer.id);

    if (hasPolicies) {
        alert('This customer still has policies attached. Delete or reassign their policies first.');
        return;
    }

    openConfirmModal({
        title: 'Delete Customer',
        message: `Delete "<strong>${escapeText(customer.name)}</strong>"? This can't be undone.`,
        confirmLabel: 'Delete',
        onConfirm: async () => {
            try {
                await deleteCustomer(customer.id);
                await initClients();
            } catch (err) {
                console.error('Failed to delete customer:', err);
                alert('Something went wrong deleting this customer. Please try again.');
                throw err;
            }
        },
    });
}

/**
 * Opens the Add New Policy modal, scoped to the given customer.
 * @param {number} customerId
 */
function openAddPolicyModal(customerId) {
    const customer = findCustomer(String(customerId));
    const overlay = openModal({
        title: `Add Policy — ${customer ? customer.name : ''}`,
        bodyHtml: clientFormFieldsHtml(customerId),
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
            expandedCustomerIds.add(customerId); // show the new policy immediately
            await initClients();
        } catch (err) {
            console.error('Failed to create policy:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Policy';
            alert('Something went wrong saving this policy. Please try again.');
        }
    });
}

/**
 * Opens the Edit Policy modal, prefilled with the policy's current values.
 * @param {object} policy
 */
function openEditPolicyModal(policy) {
    const customer = findCustomer(String(policy.customerId));
    const overlay = openModal({
        title: `Edit Policy — ${customer ? customer.name : ''}`,
        bodyHtml: clientFormFieldsHtml(policy.customerId, policy),
    });

    const form = overlay.querySelector('#client-form');
    bindClientFormCalculations(form);
    bindClientFormDropdowns(form, {
        insuranceCompany: policy.insuranceCompany,
        productName: policy.productName,
        modeOfPayment: policy.modeOfPayment,
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
            await updateClient(policy.id, values);
            closeModal();
            await initClients();
        } catch (err) {
            console.error('Failed to update policy:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
            alert('Something went wrong updating this policy. Please try again.');
        }
    });
}

/**
 * Opens a confirm dialog before deleting a single policy.
 * @param {object} policy
 */
function openDeletePolicyConfirm(policy) {
    const label = policy.insuredPersonName || policy.insuredName || 'this policy';

    openConfirmModal({
        title: 'Delete Policy',
        message: `Delete the policy for "<strong>${escapeText(label)}</strong>"? This can't be undone.`,
        confirmLabel: 'Delete',
        onConfirm: async () => {
            try {
                await deleteClient(policy.id);
                await initClients();
            } catch (err) {
                console.error('Failed to delete policy:', err);
                alert('Something went wrong deleting this policy. Please try again.');
                throw err;
            }
        },
    });
}

/**
 * Opens the Record Payment modal for a policy with an outstanding balance.
 * @param {object} policy
 */
function openRecordPaymentModal(policy) {
    const label = policy.insuredPersonName || policy.insuredName || '';
    const overlay = openModal({
        title: `Record Payment — ${label}`,
        bodyHtml: paymentFormFieldsHtml(policy.balance),
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
            await recordClientPayment(policy.id, amount);
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
 * Computes and renders the 3 KPI cards from the customer + policy lists.
 * "Active Clients" now means customer count, not policy count.
 * @param {object[]} customers
 * @param {object[]} policies
 */
function renderKpis(customers, policies) {
    const totalCollected = calculateTotalCollectedPremium(policies);
    const outstandingBalance = calculateOutstandingBalance(policies);
    const totalCommission = calculateTotalAgentCommission(policies);

    setText('kpi-collected-value', `AED ${totalCollected.toLocaleString()}`);
    setText('kpi-active-clients', `${customers.length} Customers`);
    setText('kpi-outstanding-balance', `AED ${outstandingBalance.toLocaleString()}`);
    setText('kpi-total-commission', `AED ${totalCommission.toLocaleString()} Earned`);
}

/**
 * Renders the grid of customer cards, each with its own expand state and
 * the policies that belong to it.
 */
function renderCustomerList() {
    const listEl = document.getElementById('client-list');
    if (!listEl) return; // Guard clause — page not in DOM yet

    listEl.innerHTML = currentCustomers.length
        ? currentCustomers.map((customer) => {
            const policies = currentPolicies.filter((p) => p.customerId === customer.id);
            const isExpanded = expandedCustomerIds.has(customer.id);
            return CustomerCard(customer, policies, isExpanded);
        }).join('')
        : `<p class="text-sm text-gray-400 col-span-full text-center py-10">No customers yet — add your first customer to get started.</p>`;

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