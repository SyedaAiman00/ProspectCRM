/**
 * Sidebar "Access Scope" control. For a regular Agent this just shows
 * their own workspace name (nothing to switch). For an Admin, it becomes
 * a real switcher: "All Agents" for a combined overview, or a specific
 * agent to monitor exactly what that agent sees on their own dashboard.
 */
import { getUser, isAdmin } from '../auth/session.js';
import { getAgents } from '../api/user.js';
import { getViewingAgentId, setViewingAgentId, clearViewingAgentId } from '../store/state.js';
import { loadPage, getCurrentPage } from '../router.js';

export async function initAgentSwitcher() {
    const select = document.getElementById('agentSwitcher');
    const label = document.getElementById('access-scope-label');
    if (!select) return;

    const user = getUser();

    if (!isAdmin()) {
        select.innerHTML = `<option>${user.name}'s Workspace</option>`;
        select.disabled = true;
        return;
    }

    if (label) label.textContent = 'Admin — Viewing';

    try {
        const agents = await getAgents();
        const currentViewingId = getViewingAgentId();

        select.innerHTML = [
            `<option value="">All Agents (Overview)</option>`,
            ...agents.map((a) => `<option value="${a.id}">${a.name}</option>`),
        ].join('');

        select.value = currentViewingId ?? '';

        select.addEventListener('change', () => {
            const value = select.value;
            if (value) {
                setViewingAgentId(Number(value));
            } else {
                clearViewingAgentId();
            }

            const page = getCurrentPage();
            if (page) loadPage(page);
        });
    } catch (err) {
        console.error('Failed to load agents list:', err);
        select.innerHTML = `<option>Failed to load agents</option>`;
        select.disabled = true;
    }
}