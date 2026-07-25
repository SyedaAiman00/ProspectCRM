/**
 * A small reusable confirm dialog — replaces the browser's native confirm()
 * everywhere a destructive action needs a "are you sure?" step. Built on
 * top of the same openModal/closeModal utility every other modal uses,
 * so it matches the app's styling instead of looking like a browser popup.
 *
 * Usage:
 *   openConfirmModal({
 *       title: 'Delete Prospect',
 *       message: `Delete "${prospect.prospectName}"? This can't be undone.`,
 *       confirmLabel: 'Delete',
 *       onConfirm: async () => { ... },
 *   });
 */
import { openModal, closeModal } from './modal.js';

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmLabel]
 * @param {() => Promise<void>|void} options.onConfirm
 */
export function openConfirmModal({ title, message, confirmLabel = 'Confirm', onConfirm }) {
    const overlay = openModal({
        title,
        bodyHtml: `
            <div class="space-y-5">
                <p class="text-sm text-gray-600">${message}</p>
                <div class="flex justify-end gap-2">
                    <button type="button" id="confirm-modal-cancel-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                        Cancel
                    </button>
                    <button type="button" id="confirm-modal-confirm-btn" class="py-2 px-4 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all">
                        ${confirmLabel}
                    </button>
                </div>
            </div>
        `,
    });

    overlay.querySelector('#confirm-modal-cancel-btn').addEventListener('click', closeModal);

    overlay.querySelector('#confirm-modal-confirm-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = 'Please wait...';

        try {
            await onConfirm();
            closeModal();
        } catch (err) {
            // Let the caller's own error handling (alert, etc.) do its thing —
            // just make sure the button doesn't stay stuck disabled if it re-throws.
            btn.disabled = false;
            btn.textContent = confirmLabel;
            throw err;
        }
    });
}