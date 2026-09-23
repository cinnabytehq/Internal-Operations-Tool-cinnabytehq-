/**
 * Promise-based confirmation using the shared ConfirmDialog.
 *
 *   if (await confirmAction({ title: 'Delete task?', confirmLabel: 'Delete' })) { … }
 */
import { openDialog } from './dialogs';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
}

export function confirmAction({ title, description = '', confirmLabel = 'Confirm' }: ConfirmOptions): Promise<boolean> {
  const dialog = document.getElementById('confirm-dialog') as HTMLDialogElement | null;
  if (!dialog) return Promise.resolve(window.confirm(title));

  dialog.querySelector('#confirm-dialog-title')!.textContent = title;
  dialog.querySelector('[data-confirm-description]')!.textContent = description;
  const accept = dialog.querySelector<HTMLButtonElement>('[data-confirm-accept] [data-button-label]');
  if (accept) accept.textContent = confirmLabel;

  return new Promise((resolve) => {
    let accepted = false;
    const onAccept = () => {
      accepted = true;
      dialog.close();
    };
    dialog.querySelector('[data-confirm-accept]')!.addEventListener('click', onAccept, { once: true });
    dialog.addEventListener(
      'close',
      () => {
        dialog.querySelector('[data-confirm-accept]')!.removeEventListener('click', onAccept);
        resolve(accepted);
      },
      { once: true },
    );
    openDialog('confirm-dialog');
  });
}
