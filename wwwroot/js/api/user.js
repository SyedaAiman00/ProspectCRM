import { apiFetch } from './apiClient.js';
import { getUser } from '../auth/session.js';

const BASE_URL = '/api/users';

/**
 * @param {number|null} [viewingAgentId] - Admin only; fetches that agent's record instead of your own
 */
export async function getCurrentUser(viewingAgentId = null) {
    const currentUser = getUser();
    const targetId = viewingAgentId ?? currentUser.id;

    const response = await apiFetch(`${BASE_URL}/${targetId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user (status ${response.status})`);
    }

    return response.json();
}

/**
 * @param {number} monthlyTarget
 * @param {number|null} [viewingAgentId]
 */
export async function updateMonthlyTarget(monthlyTarget, viewingAgentId = null) {
    const currentUser = getUser();
    const targetId = viewingAgentId ?? currentUser.id;

    const response = await apiFetch(`${BASE_URL}/${targetId}/target`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyTarget }),
    });

    if (!response.ok) {
        throw new Error(`Failed to update monthly target (status ${response.status})`);
    }

    return response.json();
}

/** Admin only — powers the sidebar agent switcher. */
export async function getAgents() {
    const response = await apiFetch(`${BASE_URL}/agents`);
    if (!response.ok) {
        throw new Error(`Failed to fetch agents (status ${response.status})`);
    }

    return response.json();
}