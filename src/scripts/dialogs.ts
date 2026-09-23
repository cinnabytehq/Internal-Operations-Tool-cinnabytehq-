/**
 * Modal dialogs (native <dialog>): open with [data-dialog-open="id"],
 * close with [data-dialog-close], Escape or a click on the backdrop.
 */

export function openDialog(id: string): void {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
  // Close any open menu first so it doesn't sit above the dialog.
  document.querySelectorAll<HTMLElement>('[popover]:popover-open').forEach((popover) => popover.hidePopover());
  // Only one modal at a time.
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((other) => other.close());
  dialog.showModal();
}

export function isDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null;
}

export function initDialogs(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as Element;

    const opener = target.closest<HTMLElement>('[data-dialog-open]');
    if (opener) {
      event.preventDefault();
      openDialog(opener.dataset.dialogOpen!);
      return;
    }

    const closer = target.closest<HTMLElement>('[data-dialog-close]');
    if (closer) {
      closer.closest('dialog')?.close();
      return;
    }

    // A click that lands on the <dialog> element itself is on the backdrop.
    if (target instanceof HTMLDialogElement && target.open) target.close();

    // Following a link inside the mobile drawer closes it.
    const link = target.closest('#mobile-nav a[href]');
    if (link) (document.getElementById('mobile-nav') as HTMLDialogElement | null)?.close();
  });
}
