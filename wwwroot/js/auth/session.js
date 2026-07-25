/**
 * Central place for everything related to the logged-in session.
 * Every page (auth pages + the SPA shell) reads/writes auth state
 * through here instead of touching localStorage directly.
 */

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

/** @returns {string|null} */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/** @returns {{id: number, name: string, email: string, role: string, monthlyTarget: number}|null} */
export function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Saves the auth response returned by /api/auth/login, /register, or /google.
 * @param {{token: string, id: number, name: string, email: string, role: string, monthlyTarget: number}} auth
 */
export function storeAuthSession(auth) {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify({
        id: auth.id,
        name: auth.name,
        email: auth.email,
        role: auth.role,
        monthlyTarget: auth.monthlyTarget,
    }));
}

/** Clears the session. Does not redirect — callers decide what happens next. */
export function clearAuthSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/**
 * True only if a token exists AND it isn't expired yet.
 * This is a client-side convenience check for UI/redirect purposes —
 * the backend re-validates the token's signature on every request regardless,
 * so this alone is never a real security boundary.
 * @returns {boolean}
 */
export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;

    const expiry = getTokenExpiry(token);
    if (!expiry) return false;

    return Date.now() < expiry;
}

/**
 * Reads the "exp" claim out of a JWT without verifying its signature
 * (verification is the backend's job — this is just so the UI can decide
 * whether to bother sending a request or redirect straight to login).
 * @param {string} token
 * @returns {number|null} expiry as epoch milliseconds, or null if unparseable
 */
function getTokenExpiry(token) {
    try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

/**
 * Guard for pages that require a logged-in user (the SPA shell).
 * Call at the very top of the page's boot sequence.
 */
export function requireAuth() {
    if (!isAuthenticated()) {
        clearAuthSession();
        window.location.href = '/login.html';
    }
}

/**
 * Guard for the auth pages (login/signup) — if someone's already logged in
 * and lands here, skip straight to the app instead of showing the form again.
 */
export function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        window.location.href = '/index.html';
    }
}

/** Clears the session and sends the user to login. Used by the logout button. */
export function logout() {
    clearAuthSession();
    window.location.href = '/login.html';
}

/** @returns {boolean} */
export function isAdmin() {
    const user = getUser();
    return user?.role === 'Admin';
}