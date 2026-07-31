/**
 * The Client Policy form — shared by both "Add New Client" (blank) and
 * "Convert to Client" (prefilled from a closed prospect). Live-calculates
 * VAT, Total Premium, Total Commission, and Agent Commission as the agent
 * types, using the same pure functions the Premium Calculator will use.
 *
 * Insurance Company, Product Name, and Mode of Payment pull their options
 * from the Global Dropdowns categories (see utils/dropdownSelect.js) instead
 * of being hardcoded — each also offers an "Other (type your own)" fallback
 * so an agent is never blocked waiting on an Admin to add a missing value.
 */
import {
    calculateVat,
    calculateTotalPremium,
    calculateTotalCommission,
    calculateAgentCommission,
} from '../utils/premiumCalculator.js';
import {
    fetchOptionsByCategory,
    populateDropdownSelect,
    bindDropdownOtherToggle,
    readDropdownValue,
} from '../utils/dropdownSelect.js';

/**
 * @param {object} [prefill] - optional partial data to prefill (e.g. from a converted prospect, or an existing client being edited)
 * @returns {string}
 */
export function clientFormFieldsHtml(prefill = {}) {
    const annualPremium = prefill.annualPremium ?? 0;
    const policyFee = prefill.policyFee ?? 0;
    const basmah = prefill.basmah ?? 19;
    const collectedPremium = prefill.collectedPremium ?? 0;
    const commRate = prefill.commRate ?? 0;

    return `
        <form id="client-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="form-label" for="cf-insured-name">Insured Name</label>
                    <input class="form-input" type="text" id="cf-insured-name" name="insuredName" value="${escapeAttr(prefill.insuredName)}" required />
                </div>
                <div>
                    <label class="form-label" for="cf-sponsor">Sponsor Details</label>
                    <input class="form-input" type="text" id="cf-sponsor" name="sponsorDetails" value="${escapeAttr(prefill.sponsorDetails)}" placeholder="Self" />
                </div>

                <div>
                    <label class="form-label" for="cf-company">Insurance Company</label>
                    <select class="form-input dropdown-select" id="cf-company" data-category="insurance_company">
                        <option value="">Loading...</option>
                    </select>
                    <input type="text" class="form-input dropdown-other-input hidden mt-2" placeholder="Enter insurance company" />
                </div>
                <div>
                    <label class="form-label" for="cf-product">Product Name</label>
                    <select class="form-input dropdown-select" id="cf-product" data-category="product">
                        <option value="">Loading...</option>
                    </select>
                    <input type="text" class="form-input dropdown-other-input hidden mt-2" placeholder="Enter product name" />
                </div>

                <div>
                    <label class="form-label" for="cf-policy-no">Policy No</label>
                    <input class="form-input" type="text" id="cf-policy-no" name="policyNo" value="${escapeAttr(prefill.policyNo)}" />
                </div>
                <div>
                    <label class="form-label" for="cf-policy-date">Policy Issue Date</label>
                    <input class="form-input" type="date" id="cf-policy-date" name="policyIssueDate" value="${escapeAttr(prefill.policyIssueDate)}" />
                </div>

                <div class="col-span-2">
                    <label class="form-label" for="cf-payment-mode">Mode of Payment</label>
                    <select class="form-input dropdown-select" id="cf-payment-mode" data-category="payment_mode">
                        <option value="">Loading...</option>
                    </select>
                    <input type="text" class="form-input dropdown-other-input hidden mt-2" placeholder="Enter payment mode" />
                </div>
            </div>

            <div class="border-t border-gray-100 pt-4">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Premium &amp; Commission</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="form-label" for="cf-annual-premium">Annual Premium (AED)</label>
                        <input class="form-input calc-input" type="number" step="0.01" min="0" id="cf-annual-premium" name="annualPremium" value="${annualPremium}" />
                    </div>
                    <div>
                        <label class="form-label" for="cf-policy-fee">Policy Fee (AED)</label>
                        <input class="form-input calc-input" type="number" step="0.01" min="0" id="cf-policy-fee" name="policyFee" value="${policyFee}" />
                    </div>

                    <div>
                        <label class="form-label" for="cf-basmah">BASMAH (AED)</label>
                        <input class="form-input calc-input" type="number" step="0.01" min="0" id="cf-basmah" name="basmah" value="${basmah}" />
                    </div>
                    <div>
                        <label class="form-label" for="cf-collected">Collected Premium (AED)</label>
                        <input class="form-input calc-input" type="number" step="0.01" min="0" id="cf-collected" name="collectedPremium" value="${collectedPremium}" />
                    </div>

                    <div>
                        <label class="form-label" for="cf-comm-rate">Comm Rate (%)</label>
                        <input class="form-input calc-input" type="number" step="0.01" min="0" max="100" id="cf-comm-rate" name="commRate" value="${commRate}" />
                    </div>
                    <div>
                        <label class="form-label" for="cf-agent-split">Agent Split (%)</label>
                        <input class="form-input calc-input" type="number" step="0.01" min="0" max="100" id="cf-agent-split" name="agentSplit" value="0" />
                        <p class="text-[10px] text-gray-400 mt-1">Not stored on the record — re-enter if editing an existing policy.</p>
                    </div>
                </div>

                <!-- Live-calculated results — read only, recomputed on every input change -->
                <div class="bg-gray-50 rounded-lg border border-gray-100 p-3 mt-4 grid grid-cols-2 gap-y-2 text-xs">
                    <span class="text-gray-500">VAT (5%)</span>
                    <span class="text-right font-bold text-gray-800" id="cf-calc-vat">AED 0.00</span>

                    <span class="text-gray-500">Total Premium</span>
                    <span class="text-right font-bold text-gray-800" id="cf-calc-total-premium">AED 0.00</span>

                    <span class="text-gray-500">Balance</span>
                    <span class="text-right font-bold text-rose-600" id="cf-calc-balance">AED 0.00</span>

                    <span class="text-gray-500">Total Commission</span>
                    <span class="text-right font-bold text-gray-800" id="cf-calc-total-commission">AED 0.00</span>

                    <span class="text-gray-500">Agent Commission</span>
                    <span class="text-right font-bold text-teal-700" id="cf-calc-agent-commission">AED 0.00</span>
                </div>
            </div>

            <div>
                <label class="form-label" for="cf-remarks">Remarks</label>
                <textarea class="form-input" id="cf-remarks" name="remarks" rows="2">${escapeText(prefill.remarks)}</textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="cf-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all">
                    Save Client
                </button>
            </div>
        </form>
    `;
}

/**
 * Fetches the Global Dropdowns options and populates the 3 dropdown fields
 * (Insurance Company, Product, Mode of Payment), preselecting prefill values
 * where given. Call this once, right after injecting the form HTML into the DOM.
 * @param {HTMLElement} formEl
 * @param {object} [prefill]
 */
export async function bindClientFormDropdowns(formEl, prefill = {}) {
    const fields = [
        { selectId: 'cf-company', category: 'insurance_company', prefillValue: prefill.insuranceCompany },
        { selectId: 'cf-product', category: 'product', prefillValue: prefill.productName },
        { selectId: 'cf-payment-mode', category: 'payment_mode', prefillValue: prefill.modeOfPayment },
    ];

    try {
        const optionsByCategory = await fetchOptionsByCategory();

        fields.forEach(({ selectId, category, prefillValue }) => {
            const selectEl = formEl.querySelector(`#${selectId}`);
            if (!selectEl) return;

            populateDropdownSelect(selectEl, optionsByCategory[category] || [], prefillValue || '');
            bindDropdownOtherToggle(selectEl);
        });
    } catch (err) {
        console.error('Failed to load dropdown options for client form:', err);
        fields.forEach(({ selectId }) => {
            const selectEl = formEl.querySelector(`#${selectId}`);
            if (selectEl) selectEl.innerHTML = `<option value="">Failed to load options</option>`;
        });
    }
}

/**
 * Wires up the live premium/commission recalculation. Call this once,
 * right after injecting the form HTML into the DOM.
 * @param {HTMLElement} formEl
 */
export function bindClientFormCalculations(formEl) {
    const recalculate = () => {
        const annualPremium = Number(formEl.querySelector('#cf-annual-premium').value) || 0;
        const policyFee = Number(formEl.querySelector('#cf-policy-fee').value) || 0;
        const basmah = Number(formEl.querySelector('#cf-basmah').value) || 0;
        const collectedPremium = Number(formEl.querySelector('#cf-collected').value) || 0;
        const commRate = Number(formEl.querySelector('#cf-comm-rate').value) || 0;
        const agentSplit = Number(formEl.querySelector('#cf-agent-split').value) || 0;

        const vat = calculateVat(annualPremium);
        const totalPremium = calculateTotalPremium(annualPremium, policyFee, vat, basmah);
        const balance = totalPremium - collectedPremium;
        const totalCommission = calculateTotalCommission(annualPremium, commRate);
        const agentCommission = calculateAgentCommission(totalCommission, agentSplit);

        formEl.querySelector('#cf-calc-vat').textContent = `AED ${vat.toFixed(2)}`;
        formEl.querySelector('#cf-calc-total-premium').textContent = `AED ${totalPremium.toFixed(2)}`;
        formEl.querySelector('#cf-calc-balance').textContent = `AED ${balance.toFixed(2)}`;
        formEl.querySelector('#cf-calc-total-commission').textContent = `AED ${totalCommission.toFixed(2)}`;
        formEl.querySelector('#cf-calc-agent-commission').textContent = `AED ${agentCommission.toFixed(2)}`;
    };

    formEl.querySelectorAll('.calc-input').forEach((input) => {
        input.addEventListener('input', recalculate);
    });

    recalculate(); // run once immediately so the panel isn't blank on open
}


 /**
 * Reads the form's raw inputs into a plain object matching the backend's
 * Create/UpdateClientRequest shape. Derived fields (VAT, Total Premium,
 * Total Commission, Agent Commission, Balance) are intentionally NOT sent —
 * the backend recalculates all of them server-side from these raw inputs,
 * so this is just for the agent's live preview, never what gets trusted.
 * @param {HTMLFormElement} formEl
 * @returns {object}
 */
export function readClientFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        insuredName: formData.get('insuredName')?.trim() || '',
        sponsorDetails: formData.get('sponsorDetails')?.trim() || null,
        insuranceCompany: readDropdownValue(formEl.querySelector('#cf-company')),
        productName: readDropdownValue(formEl.querySelector('#cf-product')),
        policyNo: formData.get('policyNo')?.trim() || '',
        policyIssueDate: formData.get('policyIssueDate') || null,
        modeOfPayment: readDropdownValue(formEl.querySelector('#cf-payment-mode')),
        annualPremium: Number(formData.get('annualPremium')) || 0,
        policyFee: Number(formData.get('policyFee')) || 0,
        basmah: Number(formData.get('basmah')) || 0,
        collectedPremium: Number(formData.get('collectedPremium')) || 0,
        commRate: Number(formData.get('commRate')) || 0,
        agentSplitPercent: Number(formData.get('agentSplit')) || 0,
        remarks: formData.get('remarks')?.trim() || null,
    };
}

function escapeAttr(value) {
    return (value || '').toString().replace(/"/g, '&quot;');
}

function escapeText(value) {
    return (value || '').toString().replace(/</g, '&lt;');
}