/**
 * The "Schedule Appointment" form — records the 1st appointment date
 * plus Fact Find / Need Analysis notes. Saving this moves the prospect
 * from Contacted into In Progress.
 */

export function appointmentFormFieldsHtml(prospect) {
    const appointmentDateVal = toDateInputValue(prospect.firstAppointmentDate);

    return `
        <form id="appointment-form" class="space-y-4">
            <div>
                <label class="form-label" for="af-date">1st Appointment Date</label>
                <input class="form-input" type="date" id="af-date" name="firstAppointmentDate" value="${appointmentDateVal}" required />
            </div>

            <div>
                <label class="form-label" for="af-fact-find">Fact Find</label>
                <textarea class="form-input" id="af-fact-find" name="factFind" rows="3" placeholder="What did you learn about their needs, budget, existing coverage...">${escapeText(prospect.factFind)}</textarea>
            </div>

            <div>
                <label class="form-label" for="af-need-analysis">Need Analysis</label>
                <textarea class="form-input" id="af-need-analysis" name="needAnalysis" rows="3" placeholder="What product/coverage fits their situation...">${escapeText(prospect.needAnalysis)}</textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="af-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all">
                    Save Appointment
                </button>
            </div>
        </form>
    `;
}

export function readAppointmentFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        firstAppointmentDate: formData.get('firstAppointmentDate') || null,
        factFind: formData.get('factFind')?.trim() || null,
        needAnalysis: formData.get('needAnalysis')?.trim() || null,
    };
}

function toDateInputValue(value) {
    if (!value) return '';
    return value.split('T')[0];
}

function escapeText(value) {
    return (value || '').replace(/</g, '&lt;');
}