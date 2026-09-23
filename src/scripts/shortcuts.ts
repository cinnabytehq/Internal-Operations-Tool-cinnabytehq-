/**
 * Global keyboard shortcuts. See ShortcutsDialog for the list shown to users.
 */
import { togglePalette, openPalette } from './commandPalette';
import { isDialogOpen, openDialog } from './dialogs';
import { toggleSidebar } from './sidebar';
import { isMac, isTyping } from './ui';

const GO_TO: Record<string, string> = {
  d: '/dashboard',
  r: '/requests',
  p: '/projects',
  t: '/tasks',
  a: '/activity',
  s: '/settings',
};

export function initShortcuts(): void {
  // Show ⌘ instead of Ctrl on Apple devices.
  if (isMac) document.querySelectorAll('[data-mod-key]').forEach((key) => (key.textContent = '⌘'));

  let pendingG = 0;

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      togglePalette();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
    if (isTyping(event.target) || isDialogOpen()) return;
    if (document.querySelector('[popover]:popover-open')) return;

    const key = event.key.toLowerCase();

    if (pendingG && GO_TO[key]) {
      event.preventDefault();
      window.clearTimeout(pendingG);
      pendingG = 0;
      window.location.href = GO_TO[key];
      return;
    }

    switch (event.key) {
      case 'g':
        pendingG = window.setTimeout(() => (pendingG = 0), 1000);
        break;
      case 'c':
        event.preventDefault();
        openDialog('create-request');
        break;
      case '/': {
        event.preventDefault();
        const listSearch = document.querySelector<HTMLInputElement>('[data-filter-input]');
        if (listSearch) listSearch.focus();
        else openPalette();
        break;
      }
      case '?':
        event.preventDefault();
        openDialog('shortcuts-dialog');
        break;
      case '[':
        if (window.matchMedia('(min-width: 80rem)').matches) toggleSidebar();
        break;
    }
  });
}
