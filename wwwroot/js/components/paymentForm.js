/**
 * The "Record Payment" form — a tiny single-field modal for logging a new
 * installment against a client's outstanding balance, without needing to
 * reopen and resubmit the entire policy form.
 */

export function paymentFormFieldsHtml(currentBalance) {
    return `
        <form id="payment-form" class="space-y-4">
            <p class="text-xs text-gray-500">
                Current balance due: <span class="font-bold text-rose-600">AED ${Number(currentBalance).toLocaleString()}</span>
            </p>

            <div>
                <label class="form-label" for="pmf-amount">Payment Amount (AED)</label>
                <input class="form-input" type="number" step="0.01" min="0.01" id="pmf-amount" name="amount" required />
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="pmf-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all">
                    Save Payment
                </button>
            </div>
        </form>
    `;
}

/**
 * @param {HTMLFormElement} formEl
 * @returns {number}
 */
export function readPaymentFormValue(formEl) {
    const formData = new FormData(formEl);
    return Number(formData.get('amount'));
}