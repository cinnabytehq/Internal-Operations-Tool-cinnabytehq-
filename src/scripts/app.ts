/**
 * Client entry point, loaded on every page by AppLayout.
 * Everything uses event delegation, so it also works for HTML that arrives
 * later (server islands on the Overview page).
 */
import { initCommandPalette } from './commandPalette';
import { initCreateRequest } from './createRequest';
import { initDialogs } from './dialogs';
import { initListFilters } from './listFilter';
import { initNotifications } from './notifications';
import { initPopovers } from './popovers';
import { initShortcuts } from './shortcuts';
import { initSidebar } from './sidebar';
import { initTasks } from './tasks';
import { initTheme } from './theme';
import { showFlashToast } from './toast';
import { readStorage } from './ui';

initTheme();
initSidebar();
initDialogs();
initPopovers();
initCommandPalette();
initShortcuts();
initNotifications();
initCreateRequest();
initTasks();
initListFilters();

// Workspace name is a local, frontend-only setting (see Settings → Workspace).
const workspaceName = readStorage<string | null>('cinnabyte:workspace-name', null);
if (workspaceName) {
  document.querySelectorAll('[data-workspace-name]').forEach((element) => (element.textContent = workspaceName));
}

document.addEventListener('click', (event) => {
  const target = event.target as Element;

  // "Try again" on error states.
  if (target.closest('[data-retry]')) window.location.reload();

  // Table rows open their record (the title link stays the keyboard target).
  const row = target.closest<HTMLElement>('[data-row-href]');
  if (row && !target.closest('a, button, input, label') && !window.getSelection()?.toString()) {
    if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey)) window.open(row.dataset.rowHref, '_blank');
    else window.location.href = row.dataset.rowHref!;
  }
});

showFlashToast();
