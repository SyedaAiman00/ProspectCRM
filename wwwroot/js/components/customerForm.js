/**
 * The "Add/Edit Customer" form — captures who the customer is (Individual
 * or Group/Corporate) before any policies are attached to them.
 */

export function customerFormFieldsHtml(prefill = {}) {
    const customerType = prefill.customerType || 'Individual';

    return `
        <form id="customer-form" class="space-y-4">
            <div>
                <label class="form-label" for="cuf-name">
                    ${customerType === 'Group' ? 'Company / Entity Name' : 'Full Name'}
                </label>
                <input class="form-input" type="text" id="cuf-name" name="name" value="${escapeAttr(prefill.name)}" required />
            </div>

            <div>
                <label class="form-label" for="cuf-type">Customer Type</label>
                <select class="form-input" id="cuf-type" name="customerType">
                    <option value="Individual" ${customerType === 'Individual' ? 'selected' : ''}>Individual</option>
                    <option value="Group" ${customerType === 'Group' ? 'selected' : ''}>Group / Corporate</option>
                </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="form-label" for="cuf-phone">Phone</label>
                    <input class="form-input" type="tel" id="cuf-phone" name="phone" value="${escapeAttr(prefill.phone)}" />
                </div>
                <div>
                    <label class="form-label" for="cuf-email">Email</label>
                    <input class="form-input" type="email" id="cuf-email" name="email" value="${escapeAttr(prefill.email)}" />
                </div>
            </div>

            <div>
                <label class="form-label" for="cuf-notes">Notes</label>
                <textarea class="form-input" id="cuf-notes" name="notes" rows="2">${escapeText(prefill.notes)}</textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="cuf-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all">
                    Save Customer
                </button>
            </div>
        </form>
    `;
}

/**
 * Swaps the "Full Name" label to "Company / Entity Name" live as the agent
 * changes the Customer Type dropdown, so the field always makes sense.
 * @param {HTMLElement} formEl
 */
export function bindCustomerTypeLabel(formEl) {
    const typeSelect = formEl.querySelector('#cuf-type');
    const nameLabel = formEl.querySelector('label[for="cuf-name"]');
    if (!typeSelect || !nameLabel) return;

    typeSelect.addEventListener('change', () => {
        nameLabel.textContent = typeSelect.value === 'Group' ? 'Company / Entity Name' : 'Full Name';
    });
}

/**
 * @param {HTMLFormElement} formEl
 * @returns {object}
 */
export function readCustomerFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        name: formData.get('name')?.trim() || '',
        customerType: formData.get('customerType') || 'Individual',
        phone: formData.get('phone')?.trim() || null,
        email: formData.get('email')?.trim() || null,
        notes: formData.get('notes')?.trim() || null,
    };
}

function escapeAttr(value) {
    return (value || '').toString().replace(/"/g, '&quot;');
}

function escapeText(value) {
    return (value || '').toString().replace(/</g, '&lt;');
}