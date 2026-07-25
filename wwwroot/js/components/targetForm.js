/**
 * The "Edit Monthly Target" form — a tiny single-field modal that replaces
 * the old browser prompt() for setting an agent's monthly conversion goal.
 * Shared by both the Dashboard and Prospects Board pages, since both had
 * their own "edit target" button wired to the same prompt() before.
 */

export function targetFormFieldsHtml(currentTarget) {
    return `
        <form id="target-form" class="space-y-4">
            <div>
                <label class="form-label" for="tf-target">Monthly Conversion Target</label>
                <input class="form-input" type="number" min="1" step="1" id="tf-target" name="monthlyTarget" value="${currentTarget}" required />
                <p class="text-[11px] text-gray-400 mt-1">Number of qualified conversions you're aiming for each month.</p>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="tf-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all">
                    Save Target
                </button>
            </div>
        </form>
    `;
}

/**
 * @param {HTMLFormElement} formEl
 * @returns {number}
 */
export function readTargetFormValue(formEl) {
    const formData = new FormData(formEl);
    return Number(formData.get('monthlyTarget'));
}