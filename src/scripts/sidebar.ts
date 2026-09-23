/**
 * Desktop sidebar collapse (≥1280px). The state is restored before paint by
 * BaseLayout; tablets always show the icon rail.
 */
const STORAGE_KEY = 'cinnabyte:sidebar';

function isCollapsed(): boolean {
  return document.documentElement.dataset.sidebar === 'collapsed';
}

function syncToggles(): void {
  document.querySelectorAll<HTMLElement>('[data-sidebar-toggle]').forEach((button) => {
    button.setAttribute('aria-pressed', String(isCollapsed()));
    button.setAttribute('aria-label', isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar');
  });
}

export function toggleSidebar(): void {
  const root = document.documentElement;
  if (isCollapsed()) delete root.dataset.sidebar;
  else root.dataset.sidebar = 'collapsed';
  try {
    localStorage.setItem(STORAGE_KEY, isCollapsed() ? 'collapsed' : 'expanded');
  } catch {
    /* not persisted */
  }
  syncToggles();
}

export function initSidebar(): void {
  syncToggles();
  document.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-sidebar-toggle]')) toggleSidebar();
  });
}
