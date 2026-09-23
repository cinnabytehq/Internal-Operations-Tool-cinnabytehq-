/**
 * "New request" form: validation, submission and feedback.
 *
 * Validation runs in the browser for instant feedback; the server
 * re-validates everything in the `requests.create` action (the source of
 * truth), and any field errors it returns are shown the same way.
 */
import { actions, isInputError } from 'astro:actions';
import type { Priority, RequestCategory } from '@/types';
import { flashToast, toastError } from './toast';
import { setLoading } from './ui';

type FieldName = 'title' | 'description' | 'category';

const RULES: Record<FieldName, (value: string) => string | null> = {
  title: (value) => {
    if (value.trim().length < 4) return 'Give the request a title of at least 4 characters.';
    if (value.trim().length > 120) return 'Keep the title under 120 characters.';
    return null;
  },
  description: (value) => {
    if (value.trim().length < 10) return 'Add a short description (at least 10 characters).';
    return null;
  },
  category: (value) => (value ? null : 'Choose a category.'),
};

export function initCreateRequest(): void {
  const form = document.getElementById('create-request-form') as HTMLFormElement | null;
  const dialog = document.getElementById('create-request') as HTMLDialogElement | null;
  if (!form || !dialog) return;

  const submitButton = dialog.querySelector<HTMLButtonElement>('button[type="submit"]');
  const charCount = form.querySelector<HTMLElement>('[data-char-count]');
  const approvalHint = form.querySelector<HTMLElement>('[data-approval-hint]');
  const control = (name: FieldName) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  function setError(name: FieldName, message: string | null) {
    const element = control(name);
    const errorEl = form!.querySelector<HTMLElement>(`[data-error-for="${element.id}"]`);
    if (errorEl) errorEl.textContent = message ?? '';
    if (message) element.setAttribute('aria-invalid', 'true');
    else element.removeAttribute('aria-invalid');
  }

  function validate(): boolean {
    let firstInvalid: HTMLElement | null = null;
    for (const name of Object.keys(RULES) as FieldName[]) {
      const message = RULES[name](control(name).value);
      setError(name, message);
      if (message && !firstInvalid) firstInvalid = control(name);
    }
    firstInvalid?.focus();
    return firstInvalid === null;
  }

  function updateCharCount() {
    if (charCount) charCount.textContent = `${control('description').value.length} / 2000`;
  }

  function updateApprovalHint() {
    const select = control('category') as HTMLSelectElement;
    const option = select.selectedOptions[0];
    if (approvalHint) approvalHint.hidden = option?.dataset.requiresApproval !== 'true';
  }

  // Clear an error as soon as the field is fixed.
  form.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    const name = target.name as FieldName;
    if (name in RULES && target.hasAttribute('aria-invalid') && !RULES[name](target.value)) setError(name, null);
    if (name === 'description') updateCharCount();
  });
  form.addEventListener('change', (event) => {
    const target = event.target as HTMLSelectElement;
    if (target.name === 'category') {
      updateApprovalHint();
      if (target.value) setError('category', null);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const data = new FormData(form);
    setLoading(submitButton, true);
    const { data: request, error } = await actions.requests.create({
      title: String(data.get('title')),
      description: String(data.get('description')),
      category: data.get('category') as RequestCategory,
      priority: (data.get('priority') ?? 'medium') as Priority,
      assigneeId: String(data.get('assigneeId') ?? '') || undefined,
    });

    if (error) {
      setLoading(submitButton, false);
      if (isInputError(error)) {
        for (const [name, messages] of Object.entries(error.fields)) {
          if (name in RULES) setError(name as FieldName, (messages as string[])[0] ?? null);
        }
        return;
      }
      toastError(error);
      return;
    }

    flashToast({ title: 'Request created successfully', description: `${request.id} · ${request.title}` });
    window.location.href = `/requests/${request.id}`;
  });

  // Start fresh every time the dialog closes.
  dialog.addEventListener('close', () => {
    form.reset();
    (Object.keys(RULES) as FieldName[]).forEach((name) => setError(name, null));
    setLoading(submitButton, false);
    updateCharCount();
    updateApprovalHint();
  });
}
