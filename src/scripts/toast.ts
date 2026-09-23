/**
 * Toast notifications.
 *
 *   toast({ title: 'Request created', description: 'REQ-1043', variant: 'success' })
 *   flashToast({...})  → shown after the next page load (for redirects)
 */

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

const FLASH_KEY = 'cinnabyte:flash-toast';
const MAX_VISIBLE = 3;

export function toast({ title, description = '', variant = 'success', duration = 4500 }: ToastOptions): void {
  const region = document.getElementById('toast-region');
  const template = document.getElementById('toast-template') as HTMLTemplateElement | null;
  if (!region || !template) return;

  const node = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
  node.querySelector('[data-toast-title]')!.textContent = title;
  node.querySelector('[data-toast-description]')!.textContent = description;
  node.querySelectorAll<SVGElement>('[data-toast-icon]').forEach((icon) => {
    if (icon.dataset.toastIcon !== variant) icon.remove();
  });
  if (variant === 'error') node.setAttribute('role', 'alert');

  // Keep the stack short.
  const existing = region.querySelectorAll('[data-toast]');
  if (existing.length >= MAX_VISIBLE) existing[0].remove();

  region.append(node);
  requestAnimationFrame(() => requestAnimationFrame(() => (node.dataset.state = 'open')));

  let remaining = duration;
  let startedAt = Date.now();
  let timer = window.setTimeout(dismiss, remaining);

  function dismiss() {
    window.clearTimeout(timer);
    node.dataset.state = 'closed';
    node.addEventListener('transitionend', () => node.remove(), { once: true });
    window.setTimeout(() => node.remove(), 400);
  }

  // Pause while hovered or focused so people can read it.
  const pause = () => {
    window.clearTimeout(timer);
    remaining -= Date.now() - startedAt;
  };
  const resume = () => {
    startedAt = Date.now();
    timer = window.setTimeout(dismiss, Math.max(remaining, 1200));
  };
  node.addEventListener('mouseenter', pause);
  node.addEventListener('mouseleave', resume);
  node.addEventListener('focusin', pause);
  node.addEventListener('focusout', resume);
  node.querySelector('[data-toast-close]')?.addEventListener('click', dismiss);
}

/** Queue a toast to show after navigation/reload. */
export function flashToast(options: ToastOptions): void {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(options));
  } catch {
    /* ignore */
  }
}

export function showFlashToast(): void {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FLASH_KEY);
    toast(JSON.parse(raw) as ToastOptions);
  } catch {
    /* ignore */
  }
}

/** Show an error toast for a failed action call. */
export function toastError(error: { message?: string } | undefined, fallback = 'Please try again in a moment.'): void {
  toast({ title: 'Something went wrong', description: error?.message || fallback, variant: 'error' });
}
