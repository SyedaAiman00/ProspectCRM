/**
 * The "Log New Outreach" form — records a call attempt against an
 * existing prospect: what happened on the call, and when to follow up next.
 *
 * Note: the Call Response text is what drives which column a prospect
 * lands in on the board (see utils/pipeline.js getPipelineStage) —
 * e.g. including "interested" moves it to Contacted, "meeting scheduled"
 * to In Progress, "closed"/"issued" to Qualified. So saving this form
 * may move the card to a different column, and that's expected.
 */

/**
 * @param {object} prospect - the existing prospect, used to prefill the form
 * @returns {string}
 */
export function outreachFormFieldsHtml(prospect) {
    const callDateVal = toDateInputValue(prospect.callDate);
    const callTimeVal = toTimeInputValue(prospect.callTime);
    const followupVal = toDateInputValue(prospect.followupDate);

    return `
        <form id="outreach-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="form-label" for="of-response">Call Response</label>
                    <input class="form-input" type="text" id="of-response" name="callResponse"
                           value="${escapeAttr(prospect.callResponse)}"
                           placeholder="e.g. Interested - Scheduled follow up" />
                </div>

                <div>
                    <label class="form-label" for="of-call-date">Call Date</label>
                    <input class="form-input" type="date" id="of-call-date" name="callDate" value="${callDateVal}" />
                </div>

                <div>
                    <label class="form-label" for="of-call-time">Call Time</label>
                    <input class="form-input" type="time" id="of-call-time" name="callTime" value="${callTimeVal}" />
                </div>

                <div class="col-span-2">
                    <label class="form-label" for="of-followup-date">Next Follow-up Date</label>
                    <input class="form-input" type="date" id="of-followup-date" name="followupDate" value="${followupVal}" />
                </div>

                <div class="col-span-2">
                    <label class="form-label" for="of-remarks">Remarks</label>
                    <textarea class="form-input" id="of-remarks" name="remarks" rows="2">${escapeText(prospect.remarks)}</textarea>
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="of-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all">
                    Save Outreach
                </button>
            </div>
        </form>
    `;
}

/**
 * Reads the form's current values into a plain object matching
 * the backend's LogOutreachRequest shape.
 * @param {HTMLFormElement} formEl
 * @returns {object}
 */
export function readOutreachFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        callDate: formData.get('callDate') || null,
        callTime: formData.get('callTime') ? `${formData.get('callTime')}:00` : null,
        callResponse: formData.get('callResponse')?.trim() || null,
        followupDate: formData.get('followupDate') || null,
        remarks: formData.get('remarks')?.trim() || null,
    };
}

/** @param {string|null} value */
function toDateInputValue(value) {
    if (!value) return '';
    return value.split('T')[0]; // "2024-01-01T00:00:00" -> "2024-01-01"
}

/** @param {string|null} value */
function toTimeInputValue(value) {
    if (!value) return '';
    return value.slice(0, 5); // "13:30:00" -> "13:30"
}

/** @param {string|null} value */
function escapeAttr(value) {
    return (value || '').replace(/"/g, '&quot;');
}

/** @param {string|null} value */
function escapeText(value) {
    return (value || '').replace(/</g, '&lt;');
}