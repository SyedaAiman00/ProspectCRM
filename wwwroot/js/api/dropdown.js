/**
 * Centralized API layer for all Dropdown-option HTTP calls.
 */
import { apiFetch } from './apiClient.js';

const BASE_URL = '/api/dropdowns';

/**
 * Fetch every dropdown option across all categories.
 * @returns {Promise<object[]>}
 */
export async function getDropdownOptions() {
    const response = await apiFetch(BASE_URL);

    if (!response.ok) {
        throw new Error(`Failed to fetch dropdown options (status ${response.status})`);
    }

    return response.json();
}

/**
 * @param {string} category
 * @param {string} value
 * @returns {Promise<object>}
 */
export async function createDropdownOption(category, value) {
    const response = await apiFetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, value }),
    });

    if (!response.ok) {
        throw new Error(`Failed to add dropdown value (status ${response.status})`);
    }

    return response.json();
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteDropdownOption(id) {
    const response = await apiFetch(`${BASE_URL}/${id}`, { method: 'DELETE' });

    if (!response.ok) {
        throw new Error(`Failed to delete dropdown value (status ${response.status})`);
    }
}