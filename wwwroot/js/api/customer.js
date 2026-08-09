import { apiFetch } from './apiClient.js';

const BASE_URL = '/api/customers';

export async function getCustomers(agentId = null) {
    const url = agentId ? `${BASE_URL}?agentId=${agentId}` : BASE_URL;
    const response = await apiFetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch customers (status ${response.status})`);
    }

    return response.json();
}

export async function createCustomer(customerData) {
    const response = await apiFetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
    });

    if (!response.ok) {
        throw new Error(`Failed to create customer (status ${response.status})`);
    }

    return response.json();
}

export async function updateCustomer(id, customerData) {
    const response = await apiFetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
    });

    if (!response.ok) {
        throw new Error(`Failed to update customer (status ${response.status})`);
    }

    return response.json();
}

export async function deleteCustomer(id) {
    const response = await apiFetch(`${BASE_URL}/${id}`, { method: 'DELETE' });

    if (!response.ok) {
        throw new Error(`Failed to delete customer (status ${response.status})`);
    }
}