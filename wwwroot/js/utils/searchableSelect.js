/**
 * Generic, reusable searchable-dropdown widget — not tied to Nationality
 * specifically, so any future standardized list (Country, Lead Source,
 * Policy Type, etc. — see constants/) can reuse it the same way.
 *
 * Built as a small custom widget (text input + hidden input + filtered
 * options list) rather than a plain <select>, since a native select isn't
 * practical to search through for a ~190-item list, and rather than pulling
 * in a third-party library, since nothing like that already exists in the
 * project and the need here is simple.
 *
 * Expected markup inside wrapperEl (see components/prospectForm.js):
 *   <div class="searchable-select">
 *     <input type="text" class="form-input searchable-select-input" />
 *     <input type="hidden" name="..." />
 *     <div class="searchable-select-dropdown hidden"></div>
 *   </div>
 */

/**
 * @param {HTMLElement} wrapperEl - the `.searchable-select` container
 * @param {string[]} optionsList - the full list of selectable values
 * @param {object} [config]
 * @param {string} [config.currentValue] - preselects/preserves an existing value (see readme point 7 — must work even if the value isn't in optionsList)
 * @param {string} [config.placeholder]
 */
export function initSearchableSelect(wrapperEl, optionsList, config = {}) {
    const { currentValue = '', placeholder = 'Select...' } = config;

    const textInput = wrapperEl.querySelector('.searchable-select-input');
    const hiddenInput = wrapperEl.querySelector('input[type="hidden"]');
    const dropdown = wrapperEl.querySelector('.searchable-select-dropdown');
    if (!textInput || !hiddenInput || !dropdown) return;

    textInput.placeholder = placeholder;

    // Preserve whatever the record already has, even if it doesn't match
    // any option in the list (e.g. a legacy free-typed value entered
    // before this dropdown existed) — never silently discard existing data.
    hiddenInput.value = currentValue || '';
    textInput.value = currentValue || '';

    let filtered = optionsList;
    let highlightedIndex = -1;

    function renderOptions(query) {
        const q = query.trim().toLowerCase();
        filtered = q ? optionsList.filter((opt) => opt.toLowerCase().includes(q)) : optionsList;
        highlightedIndex = -1;

        dropdown.innerHTML = filtered.length
            ? filtered.map((opt, i) => `<div class="searchable-select-option" data-index="${i}" data-value="${escapeAttr(opt)}">${escapeText(opt)}</div>`).join('')
            : `<div class="searchable-select-empty">No matches found</div>`;
    }

    function openDropdown() {
        renderOptions('');
        dropdown.classList.remove('hidden');
    }

    function closeDropdown() {
        dropdown.classList.add('hidden');
    }

    function selectValue(value) {
        hiddenInput.value = value;
        textInput.value = value;
        closeDropdown();
    }

    function updateHighlight() {
        dropdown.querySelectorAll('.searchable-select-option').forEach((el, i) => {
            el.classList.toggle('highlighted', i === highlightedIndex);
        });
    }

    textInput.addEventListener('focus', openDropdown);

    textInput.addEventListener('input', () => {
        renderOptions(textInput.value);
        dropdown.classList.remove('hidden');
    });

    // Keyboard accessibility: arrow keys to move, Enter to select,
    // Escape to close — without this, typed text can never submit a
    // standardized value on its own, which is intentional (see readme point 1).
    textInput.addEventListener('keydown', (e) => {
        if (dropdown.classList.contains('hidden')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, filtered.length - 1);
            updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            updateHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
                selectValue(filtered[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    // mousedown (not click) with preventDefault so the text input doesn't
    // blur — and the dropdown close on blur — before the click on an
    // option gets a chance to register.
    dropdown.addEventListener('mousedown', (e) => e.preventDefault());

    dropdown.addEventListener('click', (e) => {
        const optionEl = e.target.closest('.searchable-select-option');
        if (!optionEl) return;
        selectValue(optionEl.dataset.value);
    });

    document.addEventListener('click', (e) => {
        if (!wrapperEl.contains(e.target)) closeDropdown();
    });
}

function escapeAttr(value) {
    return (value || '').toString().replace(/"/g, '&quot;');
}

function escapeText(value) {
    return (value || '').toString().replace(/</g, '&lt;');
}