import { apiFetch } from './apiClient.js';

const BASE_URL = '/api/clients';

export async function getClients(agentId = null) {
    const url = agentId ? `${BASE_URL}?agentId=${agentId}` : BASE_URL;
    const response = await apiFetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch clients (status ${response.status})`);
    }

    return response.json();
}

export async function getClient(id) {
    const response = await apiFetch(`${BASE_URL}/${id}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch client (status ${response.status})`);
    }

    return response.json();
}

export async function getExpiringClients(withinDays = 30, agentId = null) {
    const params = new URLSearchParams();
    params.set('withinDays', withinDays);

    if (agentId) {
        params.set('agentId', agentId);
    }

    const response = await apiFetch(
        `${BASE_URL}/expiring?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch expiring policies (status ${response.status})`
        );
    }

    return response.json();
}
export async function createClient(clientData) {
    const response = await apiFetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
    });

    if (!response.ok) {
        throw new Error(`Failed to create client (status ${response.status})`);
    }

    return response.json();
}

export async function updateClient(id, clientData) {
    const response = await apiFetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
    });

    if (!response.ok) {
        throw new Error(`Failed to update client (status ${response.status})`);
    }

    return response.json();
}

/**
 * @param {number} id
 * @param {number} amount
 */
export async function recordClientPayment(id, amount) {
    const response = await apiFetch(`${BASE_URL}/${id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
        throw new Error(`Failed to record payment (status ${response.status})`);
    }

    return response.json();
}

export async function deleteClient(id) {
    const response = await apiFetch(`${BASE_URL}/${id}`, { method: 'DELETE' });

    if (!response.ok) {
        throw new Error(`Failed to delete client (status ${response.status})`);
    }
}