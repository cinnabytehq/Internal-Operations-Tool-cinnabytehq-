/**
 * Light / Dark / System theme.
 * The initial theme is applied before paint by the inline script in
 * BaseLayout; this module handles switching and keeps every theme control
 * (sidebar switcher, top-bar menu, settings page) in sync.
 */
import { toast } from './toast';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'cinnabyte:theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePreference(): ThemePreference {
  const value = document.documentElement.dataset.themePreference;
  return value === 'light' || value === 'dark' ? value : 'system';
}

function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  const dark = preference === 'dark' || (preference === 'system' && media.matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.themePreference = preference;
  syncControls(preference);
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* not persisted */
  }
  applyTheme(preference);
}

function syncControls(preference: ThemePreference): void {
  document.querySelectorAll<HTMLElement>('[data-theme-option]').forEach((control) => {
    const selected = control.dataset.themeOption === preference;
    if (control.getAttribute('role') === 'menuitemradio') {
      control.setAttribute('aria-checked', String(selected));
      control.querySelector('[data-check]')?.classList.toggle('invisible', !selected);
    } else if (control instanceof HTMLInputElement) {
      control.checked = selected;
    } else {
      control.setAttribute('aria-pressed', String(selected));
    }
  });
}

export function initTheme(): void {
  syncControls(getThemePreference());

  document.addEventListener('click', (event) => {
    const control = (event.target as Element).closest<HTMLElement>('[data-theme-option]');
    if (!control || control instanceof HTMLInputElement) return;
    setThemePreference(control.dataset.themeOption as ThemePreference);
  });

  // Settings page radio cards
  document.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.matches?.('input[data-theme-option]')) {
      setThemePreference(input.value as ThemePreference);
      toast({ title: 'Appearance updated', description: `Theme set to ${input.dataset.label ?? input.value}.` });
    }
  });

  // Follow the OS when the preference is "system".
  media.addEventListener('change', () => {
    if (getThemePreference() === 'system') applyTheme('system');
  });

  // Keep multiple tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyTheme((event.newValue as ThemePreference) ?? 'system');
  });
}

export function toggleTheme(): void {
  setThemePreference(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}
