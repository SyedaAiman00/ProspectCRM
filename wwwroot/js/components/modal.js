/**
 * Minimal reusable modal utility. Not tied to any specific form —
 * pass in a title and a body HTML string, get back the overlay element
 * so the caller can attach its own listeners to whatever's inside.
 *
 * Usage:
 *   const overlay = openModal({ title: 'Add New Prospect', bodyHtml: someFormHtml });
 *   overlay.querySelector('#my-form').addEventListener('submit', ...);
 *   closeModal(); // when done
 */

const OVERLAY_ID = 'app-modal-overlay';

/**
 * Opens a modal, replacing any modal that's already open.
 * @param {{title: string, bodyHtml: string}} options
 * @returns {HTMLElement} the overlay element, so callers can query into it
 */
export function openModal({ title, bodyHtml }) {
    closeModal(); // guard against stacking multiple modals

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-panel">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Close">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#modal-close-btn').addEventListener('click', closeModal);

    // Click on the dark backdrop (not the panel itself) closes the modal
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', handleEscapeKey);

    if (window.lucide) lucide.createIcons();

    return overlay;
}

/**
 * Closes and removes the currently open modal, if any.
 */
export function closeModal() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
    document.removeEventListener('keydown', handleEscapeKey);
}

/**
 * @param {KeyboardEvent} e
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape') closeModal();
}