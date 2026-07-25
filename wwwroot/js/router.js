import { initDashboard } from './pages/dashboard.js';
import { initProspectsBoard } from './pages/prospects.js';
import { initClients } from './pages/clients.js';
import { initPremiumCalculator } from './pages/calculator.js';
import { initCommissionLedger } from './pages/commissions.js';
import { initDropdowns } from './pages/dropdowns.js';

const PAGES = {
    dashboard: {
        init: initDashboard,
        title: 'Executive Dashboard',
    },
    prospects: {
        init: initProspectsBoard,
        title: 'Prospects',
    },
    clients: {
        init: initClients,
        title: 'Clients Board',
    },
    calculator: {
        init: initPremiumCalculator,
        title: 'Premium Calculator',
    },
    commissions: {
        init: initCommissionLedger,
        title: 'Commission Ledger',
    },

    dropdowns: {
        init: initDropdowns,
        title: 'Global Dropdowns',
    },
};
// Tracks whichever page is currently loaded, so the Admin agent switcher
// can re-run the same page after switching who it's viewing.
let currentPage = null;

export async function loadPage(pageName) {
    const page = PAGES[pageName];

    if (!page) {
        console.error(`No page registered for "${pageName}"`);
        return;
    }

    const response = await fetch(`/pages/${pageName}.html?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
        console.error(`Failed to load page HTML for "${pageName}" (status ${response.status})`);
        return;
    }

    document.getElementById('app-content').innerHTML = await response.text();

    currentPage = pageName;
    updatePageTitle(page.title);

    if (window.lucide) lucide.createIcons();

    page.init();
}

export function getCurrentPage() {
    return currentPage;
}

function updatePageTitle(title) {
    const titleEl = document.getElementById('pageTitleContext');
    if (titleEl) titleEl.textContent = title;
}