import { NATIONALITIES } from '../constants/nationalities.js';
import { initSearchableSelect } from './searchableSelect.js';

/**
 * Thin, reusable wrapper around the generic searchable-select widget,
 * scoped to the Nationality list. Any form that needs a Nationality field
 * should call this instead of duplicating the list or the wiring logic —
 * e.g. a future Edit Prospect form, or a Client form, would just do:
 *
 *   populateNationalityDropdown(
 *       formEl.querySelector('#some-nationality-wrapper'),
 *       existingValue
 *   );
 *
 * @param {HTMLElement} wrapperEl
 * @param {string} [currentValue] - existing nationality value, if editing
 */
export function populateNationalityDropdown(wrapperEl, currentValue = '') {
    initSearchableSelect(wrapperEl, NATIONALITIES, {
        currentValue,
        placeholder: 'Select nationality',
    });
}