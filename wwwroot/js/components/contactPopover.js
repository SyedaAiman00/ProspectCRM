/**
 * Small floating popover that shows a prospect's phone number or email
 * when the corresponding icon on a Kanban card is clicked. A single shared
 * popover element is reused across all cards (only one should ever be open
 * at a time) instead of building one per card.
 */

const POPOVER_ID = 'contact-popover';

/**
 * Wires up click delegation for every .contact-icon-btn inside the given
 * container. Safe to call once — event delegation means newly rendered
 * cards (after a board refresh) work automatically without rebinding.
 * @param {HTMLElement} containerEl
 */
export function initContactPopovers(containerEl) {
    if (!containerEl || containerEl.dataset.contactPopoversBound) return;

    containerEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.contact-icon-btn');
        if (!btn) return;

        e.stopPropagation(); // don't let the same click immediately close it via the document listener below
        const value = btn.dataset.contactValue;
        const type = btn.dataset.contactType;

        showPopover(btn, value || (type === 'phone' ? 'No phone number saved' : 'No email saved'));
    });

    document.addEventListener('click', closePopover);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePopover();
    });

    containerEl.dataset.contactPopoversBound = 'true';
}

/**
 * @param {HTMLElement} anchorEl - the icon button that was clicked
 * @param {string} text
 */
function showPopover(anchorEl, text) {
    closePopover(); // only one open at a time

    const popover = document.createElement('div');
    popover.id = POPOVER_ID;
    popover.className = 'contact-popover';
    popover.textContent = text;

    document.body.appendChild(popover);

    const anchorRect = anchorEl.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();

    let left = anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popoverRect.width - 8));

    popover.style.left = `${left + window.scrollX}px`;
    popover.style.top = `${anchorRect.top + window.scrollY - popoverRect.height - 8}px`;
}

function closePopover() {
    const existing = document.getElementById(POPOVER_ID);
    if (existing) existing.remove();
}