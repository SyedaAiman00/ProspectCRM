/**
 * Shared helpers for turning a plain <select> into an API-backed dropdown
 * that also supports an "Other (type your own)" fallback — used by any
 * form field that maps to a Global Dropdowns category.
 * Expects markup like:
 *   <div>
 *     <select class="dropdown-select" data-category="...">...</select>
 *     <input type="text" class="dropdown-other-input hidden" />
 *   </div>
 * i.e. the select and its "Other" text input are siblings inside the same wrapper.
 */
import { getDropdownOptions } from '../api/dropdown.js';

const OTHER_VALUE = '__other__';

/**
 * Fetches every dropdown option once and groups it by category — call this
 * once per form-open, then reuse the result for every field on that form
 * instead of each field re-fetching separately.
 * @returns {Promise<Object<string, object[]>>}
 */
export async function fetchOptionsByCategory() {
    const options = await getDropdownOptions();
    const grouped = {};
    options.forEach((opt) => {
        if (!grouped[opt.category]) grouped[opt.category] = [];
        grouped[opt.category].push(opt);
    });
    return grouped;
}

/**
 * Fills a <select> with <option> tags for the given category's values,
 * plus a trailing "Other (type your own)" option. If currentValue doesn't
 * match any option in the list, "Other" is preselected and the sibling
 * .dropdown-other-input is shown and prefilled with currentValue instead.
 * @param {HTMLSelectElement} selectEl
 * @param {object[]} categoryOptions - options for just this select's category
 * @param {string} [currentValue]
 */
export function populateDropdownSelect(selectEl, categoryOptions, currentValue = '') {
    const optionsHtml = categoryOptions
        .map((opt) => `<option value="${escapeAttr(opt.value)}">${escapeText(opt.value)}</option>`)
        .join('');

    selectEl.innerHTML = `
        <option value="">Select...</option>
        ${optionsHtml}
        <option value="${OTHER_VALUE}">Other (type your own)</option>
    `;

    const otherInput = getOtherInput(selectEl);
    const matchesKnownValue = categoryOptions.some((opt) => opt.value === currentValue);

    if (currentValue && !matchesKnownValue) {
        selectEl.value = OTHER_VALUE;
        if (otherInput) {
            otherInput.value = currentValue;
            otherInput.classList.remove('hidden');
        }
    } else {
        selectEl.value = currentValue || '';
        if (otherInput) otherInput.classList.add('hidden');
    }
}

/**
 * Wires up the show/hide behavior for a dropdown's "Other" text input.
 * @param {HTMLSelectElement} selectEl
 */
export function bindDropdownOtherToggle(selectEl) {
    const otherInput = getOtherInput(selectEl);
    if (!otherInput) return;

    selectEl.addEventListener('change', () => {
        if (selectEl.value === OTHER_VALUE) {
            otherInput.classList.remove('hidden');
            otherInput.focus();
        } else {
            otherInput.classList.add('hidden');
            otherInput.value = '';
        }
    });
}

/**
 * Reads the effective value of a dropdown+Other pair — the select's value,
 * unless "Other" is chosen, in which case the typed-in value is used instead.
 * @param {HTMLSelectElement} selectEl
 * @returns {string}
 */
export function readDropdownValue(selectEl) {
    if (selectEl.value === OTHER_VALUE) {
        const otherInput = getOtherInput(selectEl);
        return otherInput ? otherInput.value.trim() : '';
    }
    return selectEl.value;
}

/** @param {HTMLSelectElement} selectEl */
function getOtherInput(selectEl) {
    return selectEl.parentElement?.querySelector('.dropdown-other-input') ?? null;
}

function escapeAttr(value) {
    return (value || '').toString().replace(/"/g, '&quot;');
}

function escapeText(value) {
    return (value || '').toString().replace(/</g, '&lt;');
}