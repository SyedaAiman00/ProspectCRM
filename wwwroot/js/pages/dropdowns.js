import { getDropdownOptions, createDropdownOption, deleteDropdownOption } from '../api/dropdown.js';
import { DROPDOWN_CATEGORIES } from '../config/constants.js';

// Cache of the most recently fetched options, grouped by category,
// so re-renders after add/delete don't need extra bookkeeping.
let optionsByCategory = {};

/**
 * Entry point for the Global Dropdowns page. Called by router.js
 * once dropdowns.html has been injected into the DOM.
 */
export async function initDropdowns() {
    await loadAndRenderCards();
}

/**
 * Fetches every option, groups them by category, and renders all 5 cards.
 * Always renders all 5 categories from DROPDOWN_CATEGORIES, even ones with
 * currently zero values, so a card never just silently disappears.
 */
async function loadAndRenderCards() {
    const container = document.getElementById('dropdown-cards-container');
    if (!container) return; // Guard clause — page not in DOM yet

    try {
        const options = await getDropdownOptions();
        optionsByCategory = groupByCategory(options);

        container.innerHTML = DROPDOWN_CATEGORIES.map(renderCategoryCard).join('');
        bindCardEvents(container);

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Global Dropdowns load error:', err);
        container.innerHTML = `<p class="text-sm text-rose-500 col-span-full text-center py-10">Failed to load dropdown lists. Please try again.</p>`;
    }
}

/**
 * @param {object[]} options
 * @returns {Object<string, object[]>}
 */
function groupByCategory(options) {
    const grouped = {};
    options.forEach((opt) => {
        if (!grouped[opt.category]) grouped[opt.category] = [];
        grouped[opt.category].push(opt);
    });
    return grouped;
}

/**
 * @param {{key: string, label: string}} category
 * @returns {string}
 */
function renderCategoryCard(category) {
    const values = optionsByCategory[category.key] || [];

    const pillsHtml = values.length
        ? values.map((opt) => `
            <span class="dropdown-pill">
                ${escapeText(opt.value)}
                <button type="button" class="dropdown-pill-remove" data-option-id="${opt.id}" title="Remove">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </span>
        `).join('')
        : `<p class="text-xs text-gray-400 italic">No values yet.</p>`;

    return `
        <div class="dropdown-card" data-category="${category.key}">
            <h3 class="dropdown-card-title">${category.label}</h3>

            <div class="dropdown-pill-list">
                ${pillsHtml}
            </div>

            <form class="dropdown-add-form" data-category="${category.key}">
                <input type="text" class="form-input dropdown-add-input" placeholder="Add new value..." required />
                <button type="submit" class="dropdown-add-btn" title="Add value">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
            </form>
        </div>
    `;
}

/**
 * Event delegation for every card's add-form and remove-buttons.
 * Rebound on every re-render since loadAndRenderCards() replaces the
 * container's innerHTML each time.
 * @param {HTMLElement} container
 */
function bindCardEvents(container) {
    container.querySelectorAll('.dropdown-add-form').forEach((form) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const input = form.querySelector('.dropdown-add-input');
            const value = input.value.trim();
            if (!value) return;

            const category = form.dataset.category;
            const submitBtn = form.querySelector('.dropdown-add-btn');
            submitBtn.disabled = true;

            try {
                await createDropdownOption(category, value);
                await loadAndRenderCards(); // simple, always-correct: full refresh
            } catch (err) {
                console.error('Failed to add dropdown value:', err);
                alert('Something went wrong adding that value. Please try again.');
                submitBtn.disabled = false;
            }
        });
    });

    container.querySelectorAll('.dropdown-pill-remove').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const confirmed = confirm('Remove this value from the dropdown list?');
            if (!confirmed) return;

            const optionId = Number(btn.dataset.optionId);

            try {
                await deleteDropdownOption(optionId);
                await loadAndRenderCards();
            } catch (err) {
                console.error('Failed to delete dropdown value:', err);
                alert('Something went wrong removing that value. Please try again.');
            }
        });
    });
}

/** @param {string} value */
function escapeText(value) {
    return (value || '').replace(/</g, '&lt;');
}