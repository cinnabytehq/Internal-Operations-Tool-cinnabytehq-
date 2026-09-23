/**
 * Tiny DOM helpers shared by the client scripts.
 */

/** Show a spinner inside a <Button> and block further clicks. */
export function setLoading(button: HTMLElement | null, loading: boolean): void {
  if (!button) return;
  button.dataset.loading = String(loading);
  button.setAttribute('aria-busy', String(loading));
  if (button instanceof HTMLButtonElement) button.disabled = loading;
}

/** True while the user is typing in a field (so shortcuts stay out of the way). */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export const isMac = /mac|iphone|ipad/i.test(navigator.userAgent);

/** Read JSON from localStorage without throwing (private mode, quota…). */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the setting just won't persist */
  }
}
