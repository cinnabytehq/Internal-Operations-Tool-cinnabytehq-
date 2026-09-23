/** Primary navigation — one entry per product area. */
export const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: 'overview', shortcut: 'G D' },
  { label: 'Requests', href: '/requests', icon: 'requests', shortcut: 'G R' },
  { label: 'Projects', href: '/projects', icon: 'projects', shortcut: 'G P' },
  { label: 'Tasks', href: '/tasks', icon: 'tasks', shortcut: 'G T' },
  { label: 'Activity', href: '/activity', icon: 'activity', shortcut: 'G A' },
  { label: 'Settings', href: '/settings', icon: 'settings', shortcut: 'G S' },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]['icon'];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface Crumb {
  label: string;
  href?: string;
}
