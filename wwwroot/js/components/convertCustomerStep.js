/**
 * The first step of "Convert to Client" — before creating the policy, the
 * agent must say which Customer it belongs to: an existing one, or a new
 * one (defaulting to the prospect's own name).
 */

const NEW_CUSTOMER_VALUE = '__new__';

/**
 * @param {object[]} customers - existing customers to offer in the dropdown
 * @param {string} defaultName - prospect's name, used as the default for a new customer
 * @returns {string}
 */
export function convertCustomerStepHtml(customers, defaultName) {
    const optionsHtml = customers
        .map((c) => `<option value="${c.id}">${escapeText(c.name)} (${escapeText(c.customerType)})</option>`)
        .join('');

    return `
        <form id="convert-customer-form" class="space-y-4">
            <div>
                <label class="form-label" for="ccs-customer">Attach To</label>
                <select class="form-input" id="ccs-customer" name="customerSelection">
                    <option value="${NEW_CUSTOMER_VALUE}">+ Create New Customer</option>
                    ${optionsHtml}
                </select>
            </div>

            <div id="ccs-new-customer-fields" class="space-y-4">
                <div>
                    <label class="form-label" for="ccs-name">Customer Name</label>
                    <input class="form-input" type="text" id="ccs-name" name="newCustomerName" value="${escapeAttr(defaultName)}" required />
                </div>
                <div>
                    <label class="form-label" for="ccs-type">Customer Type</label>
                    <select class="form-input" id="ccs-type" name="newCustomerType">
                        <option value="Individual" selected>Individual</option>
                        <option value="Group">Group / Corporate</option>
                    </select>
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="ccs-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all">
                    Continue
                </button>
            </div>
        </form>
    `;
}

/**
 * Shows/hides the "new customer" fields depending on whether an existing
 * customer is selected in the dropdown.
 * @param {HTMLElement} formEl
 */
export function bindConvertCustomerStepToggle(formEl) {
    const select = formEl.querySelector('#ccs-customer');
    const newFields = formEl.querySelector('#ccs-new-customer-fields');
    const nameInput = formEl.querySelector('#ccs-name');
    if (!select || !newFields) return;

    const sync = () => {
        const isNew = select.value === NEW_CUSTOMER_VALUE;
        newFields.classList.toggle('hidden', !isNew);
        if (nameInput) nameInput.required = isNew;
    };

    select.addEventListener('change', sync);
    sync(); // run once so it starts in the right state
}

/**
 * Reads this step's result. Either an existing customerId to reuse, or the
 * details needed to create a brand new customer.
 * @param {HTMLFormElement} formEl
 * @returns {{ isNew: boolean, customerId?: number, name?: string, customerType?: string }}
 */
export function readConvertCustomerStepValue(formEl) {
    const formData = new FormData(formEl);
    const selection = formData.get('customerSelection');

    if (selection === NEW_CUSTOMER_VALUE) {
        return {
            isNew: true,
            name: formData.get('newCustomerName')?.trim() || '',
            customerType: formData.get('newCustomerType') || 'Individual',
        };
    }

    return { isNew: false, customerId: Number(selection) };
}

function escapeAttr(value) {
    return (value || '').toString().replace(/"/g, '&quot;');
}

function escapeText(value) {
    return (value || '').toString().replace(/</g, '&lt;');
}