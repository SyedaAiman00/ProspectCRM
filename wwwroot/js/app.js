import { loadPage } from './router.js';
import { getUser, isAdmin, logout } from './auth/session.js';
import { initAgentSwitcher } from './components/agentSwitcher.js';

const DEFAULT_PAGE = 'prospects';

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

function toggleNotifications() {
    console.log('Notifications panel not implemented yet.');
}

function bindTopbarControls() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleAppTheme);

    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) notificationsBtn.addEventListener('click', toggleNotifications);
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

    loadPage(DEFAULT_PAGE);
};