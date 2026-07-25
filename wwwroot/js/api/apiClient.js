/**
 * Thin wrapper around fetch() that automatically attaches the JWT
 * and handles session expiry consistently. Every api/*.js file should
 * call this instead of the global fetch().
 */
import { getToken, clearAuthSession } from '../auth/session.js';

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Token missing/expired/rejected by the backend — the session is no
        // longer valid no matter what the UI thought a moment ago.
        clearAuthSession();
        window.location.href = '/login.html';
        // Throw so the calling code's try/catch stops instead of trying to
        // parse a response body that isn't coming.
        throw new Error('Session expired. Redirecting to login.');
    }

    return response;
}