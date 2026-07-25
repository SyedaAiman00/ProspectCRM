/**
 * Tiny piece of shared client-side state: which agent's data an Admin is
 * currently viewing. Only meaningful when the logged-in user is an Admin —
 * Agents always see their own data and never touch this.
 * Kept in sessionStorage so it resets naturally each browser session
 * instead of "sticking" to a stale agent choice.
 */

const VIEWING_AGENT_KEY = 'adminViewingAgentId';

/** @returns {number|null} */
export function getViewingAgentId() {
    const raw = sessionStorage.getItem(VIEWING_AGENT_KEY);
    return raw ? Number(raw) : null;
}

/** @param {number} agentId */
export function setViewingAgentId(agentId) {
    sessionStorage.setItem(VIEWING_AGENT_KEY, String(agentId));
}

export function clearViewingAgentId() {
    sessionStorage.removeItem(VIEWING_AGENT_KEY);
}