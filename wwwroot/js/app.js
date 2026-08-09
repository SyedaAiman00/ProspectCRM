import { loadPage, getCurrentPage } from './router.js';
import { getUser, isAdmin, logout } from './auth/session.js';
import { initAgentSwitcher } from './components/agentSwitcher.js';
import { getExpiringClients } from './api/client.js';
import { getViewingAgentId } from './store/state.js';
import { renderNotificationsList } from './components/notificationsPanel.js';

const DEFAULT_PAGE = 'prospects';

// Cache of the most recently fetched expiring policies, so opening the
// dropdown doesn't need a fresh fetch every click.
let expiringPoliciesCache = [];

function bindNavigation() {
    document.querySelectorAll('[data-view]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.dataset.view;
            setActiveNavLink(link);
            loadPage(pageName);
            closeSidebarDrawer(); // tapping a nav link on mobile should close the drawer
        });
    });
}

function setActiveNavLink(activeLink) {
    document.querySelectorAll('.sidebar-link').forEach((link) => link.classList.remove('active'));
    activeLink.classList.add('active');
}

function toggleAppTheme() {
    document.body.classList.toggle('canvas-dark-theme');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        const isDark = document.body.classList.contains('canvas-dark-theme');
        themeIcon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    }
    if (window.lucide) lucide.createIcons();
}

/**
 * Fetches policies expiring in the next 30 days and updates the bell's
 * red count badge. Called once at boot — the dropdown itself renders from
 * this same cached list when opened, no extra fetch needed.
 */
async function loadNotifications() {
    try {
        const agentId = isAdmin() ? getViewingAgentId() : null;
        const policies = await getExpiringClients(30, agentId);
        expiringPoliciesCache = policies;
        renderNotificationsBadge(policies.length);
    } catch (err) {
        console.error('Failed to load expiry notifications:', err);
    }
}

function renderNotificationsBadge(count) {
    const badge = document.getElementById('notifications-badge');
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function toggleNotifications(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;

    const isOpening = dropdown.classList.contains('hidden');
    if (isOpening) {
        dropdown.innerHTML = renderNotificationsList(expiringPoliciesCache);
        dropdown.classList.remove('hidden');
        bindViewAllExpiringLink(dropdown);
        if (window.lucide) lucide.createIcons();
    } else {
        dropdown.classList.add('hidden');
    }
}

/**
 * Wires up the "View All Expiring Policies →" footer link rendered inside
 * the notifications dropdown — closes the dropdown and hands off to the
 * dedicated Policy Expiry workspace (pages/policyExpiry.js), which already
 * defaults to the current month on open.
 * @param {HTMLElement} dropdown
 */
function bindViewAllExpiringLink(dropdown) {
    const link = dropdown.querySelector('#notifications-view-all-btn');
    if (!link) return;

    link.addEventListener('click', () => {
        dropdown.classList.add('hidden');

        document.querySelectorAll('.sidebar-link').forEach((navLink) => navLink.classList.remove('active'));
        document.getElementById('nav-policyExpiry')?.classList.add('active');

        loadPage('policyExpiry');
    });
}

function bindTopbarControls() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleAppTheme);

    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    if (notificationsBtn) notificationsBtn.addEventListener('click', toggleNotifications);

    document.addEventListener('click', (e) => {
        if (
            notificationsDropdown &&
            !notificationsDropdown.contains(e.target) &&
            !notificationsBtn?.contains(e.target)
        ) {
            notificationsDropdown.classList.add('hidden');
        }
    });
}

/**
 * Wires up the mobile hamburger button, the drawer's own close button,
 * and the dark overlay — all three ways a user can open/close the
 * sidebar drawer on small screens.
 */
function bindSidebarDrawer() {
    const openBtn = document.getElementById('sidebar-open-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');
    const overlay = document.getElementById('sidebar-overlay');

    if (openBtn) openBtn.addEventListener('click', openSidebarDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarDrawer);
    if (overlay) overlay.addEventListener('click', closeSidebarDrawer);
}

function openSidebarDrawer() {
    document.getElementById('app-sidebar')?.classList.add('sidebar-open');
    document.getElementById('sidebar-overlay')?.classList.remove('hidden');
}

function closeSidebarDrawer() {
    document.getElementById('app-sidebar')?.classList.remove('sidebar-open');
    document.getElementById('sidebar-overlay')?.classList.add('hidden');
}

function renderCurrentUser() {
    const user = getUser();
    if (!user) return;

    const nameEl = document.getElementById('currentUserName');
    const roleEl = document.getElementById('currentUserRole');
    const initialsEl = document.getElementById('currentUserInitials');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role === 'Admin' ? 'Administrator' : 'Insurance Agent';
    if (initialsEl) initialsEl.textContent = getInitials(user.name);
}

function getInitials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function bindUserMenu() {
    const menuBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-menu-dropdown');
    const logoutBtn = document.getElementById('btn-logout');

    if (!menuBtn || !dropdown) return;

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// Boot sequence
window.onload = () => {
    if (window.lucide) lucide.createIcons();

    // Admin monitoring is view-only — hides Add/action buttons app-wide (see main.css).
   if (isAdmin()) {
        document.body.classList.add('admin-readonly');
        document.body.classList.add('is-admin');
    }

    renderCurrentUser();
    bindUserMenu();
    bindNavigation();
    bindTopbarControls();
    bindSidebarDrawer();
    initAgentSwitcher();
    loadNotifications();

    loadPage(DEFAULT_PAGE);
};