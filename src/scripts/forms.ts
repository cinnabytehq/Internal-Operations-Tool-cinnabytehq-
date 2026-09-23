/**
 * Shared form helpers: show per-field errors (from client checks or from
 * the API's `error.fields`) under the matching <Field>, and clear them.
 */
import { ApiError } from '@/lib/api/browser';

export function setFieldError(form: HTMLFormElement, name: string, message: string | null): boolean {
  const control = form.elements.namedItem(name) as HTMLElement | null;
  if (!(control instanceof HTMLElement)) return false;
  const error = form.querySelector<HTMLElement>(`[data-error-for="${control.id}"]`);
  if (error) error.textContent = message ?? '';
  if (message) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
  return true;
}

export function clearFieldErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((error) => (error.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((control) => control.removeAttribute('aria-invalid'));
}

/** Show an API validation error on the form. Returns true if any field matched. */
export function showApiFieldErrors(form: HTMLFormElement, error: unknown): boolean {
  if (!(error instanceof ApiError) || !error.fields) return false;
  let matched = false;
  for (const [name, message] of Object.entries(error.fields)) {
    if (setFieldError(form, name, message)) matched = true;
  }
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  return matched;
}

/** Clear a field's error as soon as the person edits it. */
export function clearErrorsOnInput(form: HTMLFormElement): void {
  const clear = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.name && target.hasAttribute('aria-invalid')) setFieldError(form, target.name, null);
  };
  form.addEventListener('input', clear);
  form.addEventListener('change', clear);
}
