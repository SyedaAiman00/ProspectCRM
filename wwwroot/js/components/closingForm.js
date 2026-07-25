/**
 * The "Mark as Closed" form — sets the Closing Date + final remarks.
 * Saving this moves the prospect into Qualified. "Convert to Client"
 * is intentionally a separate, disabled action for now — that flow
 * needs its own design (what happens to the prospect record, what
 * maps over to Client) and is coming as its own follow-up step.
 */

export function closingFormFieldsHtml(prospect) {
    const closingDateVal = toDateInputValue(prospect.closingDate) || todayIso();

    return `
        <form id="closing-form" class="space-y-4">
            <div>
                <label class="form-label" for="cf-date">Closing Date</label>
                <input class="form-input" type="date" id="cf-date" name="closingDate" value="${closingDateVal}" required />
            </div>

            <div>
                <label class="form-label" for="cf-remarks">Final Remarks</label>
                <textarea class="form-input" id="cf-remarks" name="remarks" rows="3">${escapeText(prospect.remarks)}</textarea>
            </div>

            <div class="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <span class="text-xs text-gray-500 font-medium">Convert this closed prospect into a Client record</span>
                <button type="button" disabled title="Coming soon" class="text-xs font-semibold text-gray-400 bg-gray-200 px-3 py-1.5 rounded-lg cursor-not-allowed">
                    Convert to Client
                </button>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="cf-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all">
                    Mark as Closed
                </button>
            </div>
        </form>
    `;
}

export function readClosingFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        closingDate: formData.get('closingDate') || null,
        remarks: formData.get('remarks')?.trim() || null,
    };
}

function toDateInputValue(value) {
    if (!value) return '';
    return value.split('T')[0];
}

function todayIso() {
    return new Date().toISOString().split('T')[0];
}

function escapeText(value) {
    return (value || '').replace(/</g, '&lt;');
}