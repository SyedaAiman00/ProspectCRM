/**
 * The "Add New Prospect" form — just the initial-capture fields
 * (name, contact info, income). Later pipeline-stage fields
 * (call response, appointments, closing) are filled in via
 * "Log New Outreach" as the prospect progresses, not here.
 */
import { populateNationalityDropdown } from '../utils/nationalityDropdown.js';

export function prospectFormFieldsHtml() {
    return `
      <form id="prospect-form" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="form-label" for="pf-name">Prospect Name</label>
                    <input class="form-input" type="text" id="pf-name" name="prospectName" required />
                </div>

                                <div>
                    <label class="form-label" for="pf-nationality-input">Nationality</label>
                    <div class="searchable-select" id="pf-nationality-wrapper">
                        <input type="text" class="form-input searchable-select-input" id="pf-nationality-input" autocomplete="off" />
                        <input type="hidden" name="nationality" id="pf-nationality-value" />
                        <div class="searchable-select-dropdown hidden" id="pf-nationality-dropdown"></div>
                    </div>
                </div>

                <div>
                    <label class="form-label" for="pf-designation">Designation</label>
                    <input class="form-input" type="text" id="pf-designation" name="designation" />
                </div>

                <div>
                    <label class="form-label" for="pf-mobile">Mobile No</label>
                    <input class="form-input" type="tel" id="pf-mobile" name="mobileNo" required />
                </div>

                <div>
                    <label class="form-label" for="pf-email">Email</label>
                    <input class="form-input" type="email" id="pf-email" name="email" />
                </div>

                <div class="col-span-2">
                    <label class="form-label" for="pf-income">Estimated Income</label>
                    <input class="form-input" type="number" step="0.01" min="0" id="pf-income" name="income" />
                </div>

                <div class="col-span-2">
                    <label class="form-label" for="pf-remarks">Remarks</label>
                    <textarea class="form-input" id="pf-remarks" name="remarks" rows="2"></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="pf-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all">
                    Save Prospect
                </button>
            </div>
        </form>
    `;
}

/**
 * Wires up the Nationality searchable dropdown. Call this once, right
 * after injecting the form HTML into the DOM (same pattern as
 * bindClientFormDropdowns in clientForm.js).
 * @param {HTMLElement} formEl
 * @param {string} [currentValue] - existing nationality, when editing; leave blank for a new prospect
 */
export function bindProspectFormNationality(formEl, currentValue = '') {
    const wrapper = formEl.querySelector('#pf-nationality-wrapper');
    if (wrapper) populateNationalityDropdown(wrapper, currentValue);
}

/**
 * Reads the form's current values into a plain object matching
 * the shape the backend Prospect model expects.
 * @param {HTMLFormElement} formEl
 * @returns {object}
 */
export function readProspectFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        prospectName: formData.get('prospectName')?.trim() || '',
        nationality: formData.get('nationality')?.trim() || '',
        designation: formData.get('designation')?.trim() || '',
        mobileNo: formData.get('mobileNo')?.trim() || '',
        email: formData.get('email')?.trim() || '',
        income: formData.get('income') ? Number(formData.get('income')) : null,
        remarks: formData.get('remarks')?.trim() || '',
    };
}