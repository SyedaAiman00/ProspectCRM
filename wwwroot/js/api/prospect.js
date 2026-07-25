import { apiFetch } from './apiClient.js';

/**
 * Centralized API layer for all Prospect-related HTTP calls.
 * Pages should never call fetch('/api/prospects') directly —
 * they import from here instead. Keeps endpoint URLs, error handling,
 * and response parsing in one place.
 */

const BASE_URL = '/api/prospects';

/**
 * Fetch all prospects.
 * @returns {Promise<object[]>}
 */
export async function getProspects(agentId = null) {
    const url = agentId ? `${BASE_URL}?agentId=${agentId}` : BASE_URL;
    const response = await apiFetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch prospects (status ${response.status})`);
    }

    return response.json();
}

/**
 * Create a new prospect.
 * @param {object} prospectData
 * @returns {Promise<object>}
 */
export async function createProspect(prospectData) {
    const response = await apiFetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectData),
    });

    if (!response.ok) {
        throw new Error(`Failed to create prospect (status ${response.status})`);
    }

    return response.json();
}

/**
 * Log an outreach attempt (call date/time/response, follow-up date, remarks)
 * against an existing prospect. Only sends the fields that changed —
 * the backend leaves everything else untouched.
 * @param {number} id
 * @param {object} outreachData
 * @returns {Promise<object>}
 */
export async function logOutreach(id, outreachData) {
    const response = await apiFetch(`${BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outreachData),
    });

    if (!response.ok) {
        throw new Error(`Failed to log outreach (status ${response.status})`);
    }

    return response.json();
}

/**
 * Schedule the 1st appointment for a Contacted prospect.
 * @param {number} id
 * @param {object} appointmentData
 * @returns {Promise<object>}
 */
export async function scheduleAppointment(id, appointmentData) {
    const response = await apiFetch(`${BASE_URL}/${id}/appointment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
    });

    if (!response.ok) {
        throw new Error(`Failed to schedule appointment (status ${response.status})`);
    }

    return response.json();
}

/**
 * Close a prospect (moves it to Qualified).
 * @param {number} id
 * @param {object} closeData
 * @returns {Promise<object>}
 */
export async function closeProspect(id, closeData) {
    const response = await apiFetch(`${BASE_URL}/${id}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closeData),
    });

    if (!response.ok) {
        throw new Error(`Failed to close prospect (status ${response.status})`);
    }

    return response.json();
}

/**
 * Delete a prospect — used after a successful Convert to Client.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteProspect(id) {
    const response = await apiFetch(`${BASE_URL}/${id}`, { method: 'DELETE' });

    if (!response.ok) {
        throw new Error(`Failed to delete prospect (status ${response.status})`);
    }
}