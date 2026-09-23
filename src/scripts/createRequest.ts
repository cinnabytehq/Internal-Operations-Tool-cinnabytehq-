/**
 * "New request" form: validation, submission (POST /api/requests) and
 * feedback.
 *
 * Validation runs in the browser for instant feedback; the API validates
 * again (the source of truth) and its per-field messages are shown the same
 * way. On the Requests page the list refreshes in place; anywhere else we
 * open the new request.
 */
import type { CreateRequestInput, Priority, RequestCategory, RequestWithRelations } from '@/types';
import { requestRef } from '@/lib/meta';
import { ApiError, api } from '@/lib/api/browser';
import { flashToast, toast, toastError } from './toast';
import { setLoading } from './ui';

type FieldName = 'title' | 'description' | 'category';

const RULES: Record<FieldName, (value: string) => string | null> = {
  title: (value) => {
    if (value.trim().length < 4) return 'Title must be at least 4 characters.';
    if (value.trim().length > 120) return 'Title must be at most 120 characters.';
    return null;
  },
  description: (value) => (value.trim().length < 10 ? 'Description must be at least 10 characters.' : null),
  category: (value) => (value ? null : 'Choose a category.'),
};

/** Fired on `document` after a request is created (the Requests page listens). */
export const REQUEST_CREATED_EVENT = 'cinnabyte:request-created';

export function initCreateRequest(): void {
  const form = document.getElementById('create-request-form') as HTMLFormElement | null;
  const dialog = document.getElementById('create-request') as HTMLDialogElement | null;
  if (!form || !dialog) return;

  const submitButton = dialog.querySelector<HTMLButtonElement>('button[type="submit"]');
  const charCount = form.querySelector<HTMLElement>('[data-char-count]');
  const approvalHint = form.querySelector<HTMLElement>('[data-approval-hint]');
  const control = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;

  function setError(name: string, message: string | null) {
    const element = control(name);
    if (!element) return;
    const errorEl = form!.querySelector<HTMLElement>(`[data-error-for="${element.id}"]`);
    if (errorEl) errorEl.textContent = message ?? '';
    if (message) element.setAttribute('aria-invalid', 'true');
    else element.removeAttribute('aria-invalid');
  }

  function validate(): boolean {
    let firstInvalid: HTMLElement | null = null;
    for (const name of Object.keys(RULES) as FieldName[]) {
      const message = RULES[name](control(name)?.value ?? '');
      setError(name, message);
      if (message && !firstInvalid) firstInvalid = control(name);
    }
    firstInvalid?.focus();
    return firstInvalid === null;
  }

  const updateCharCount = () => {
    if (charCount) charCount.textContent = `${control('description')?.value.length ?? 0} / 2000`;
  };
  const updateApprovalHint = () => {
    const option = (control('category') as HTMLSelectElement | null)?.selectedOptions[0];
    if (approvalHint) approvalHint.hidden = option?.dataset.requiresApproval !== 'true';
  };

  form.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    const rule = RULES[target.name as FieldName];
    if (rule && target.hasAttribute('aria-invalid') && !rule(target.value)) setError(target.name, null);
    if (target.name === 'description') updateCharCount();
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
    const input: CreateRequestInput = {
      title: String(data.get('title')).trim(),
      description: String(data.get('description')).trim(),
      category: data.get('category') as RequestCategory,
      priority: (data.get('priority') ?? 'medium') as Priority,
      assignee_id: String(data.get('assignee_id') ?? '') || null,
    };

    setLoading(submitButton, true);
    let request: RequestWithRelations;
    try {
      request = await api.createRequest(input);
    } catch (error) {
      setLoading(submitButton, false);
      if (error instanceof ApiError && error.fields) {
        for (const [name, message] of Object.entries(error.fields)) setError(name, message);
        if (Object.keys(error.fields).some((name) => name in RULES)) return;
      }
      toastError(error, "Couldn't create the request");
      return;
    }

    const message = { title: 'Request created successfully', description: `${requestRef(request.number)} · ${request.title}` };
    const onRequestsPage = document.querySelector('[data-requests-app]');
    if (onRequestsPage) {
      dialog.close();
      document.dispatchEvent(new CustomEvent<RequestWithRelations>(REQUEST_CREATED_EVENT, { detail: request }));
      toast({ ...message, action: { label: 'Open request', href: `/requests/${request.id}` } });
    } else {
      flashToast(message);
      window.location.href = `/requests/${request.id}`;
    }
  });

  dialog.addEventListener('close', () => {
    form.reset();
    (Object.keys(RULES) as FieldName[]).forEach((name) => setError(name, null));
    setLoading(submitButton, false);
    updateCharCount();
    updateApprovalHint();
  });
}
