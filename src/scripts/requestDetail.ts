/**
 * Request detail interactions: status changes, approval, assignment,
 * comments, copy link and delete.
 *
 * After a successful change the page reloads so the workflow, timeline and
 * details all come fresh from the server (the single source of truth), and
 * a toast confirms what happened.
 */
import { actions } from 'astro:actions';
import type { RequestStatus } from '@/types';
import { REQUEST_STATUS_META } from '@/lib/meta';
import { flashToast, toast, toastError } from './toast';
import { setLoading } from './ui';

const root = document.querySelector<HTMLElement>('[data-request-id]');

if (root) {
  const id = root.dataset.requestId!;

  const reloadWith = (title: string, description?: string) => {
    flashToast({ title, description });
    window.location.reload();
  };

  document.addEventListener('click', async (event) => {
    const target = event.target as Element;

    // Status change (status menu or "Next step" buttons)
    const statusControl = target.closest<HTMLElement>('[data-request-status]');
    if (statusControl && !statusControl.hasAttribute('disabled')) {
      const status = statusControl.dataset.requestStatus as RequestStatus;
      if (statusControl.getAttribute('aria-checked') === 'true') return;
      setLoading(statusControl, true);
      const { error } = await actions.requests.update({ id, status });
      if (error) {
        setLoading(statusControl, false);
        toastError(error);
        return;
      }
      reloadWith('Request status updated', `Moved to ${REQUEST_STATUS_META[status].label}.`);
      return;
    }

    // Approve
    const approveButton = target.closest<HTMLElement>('[data-request-approve]');
    if (approveButton) {
      setLoading(approveButton, true);
      const { error } = await actions.requests.approve({ id });
      if (error) {
        setLoading(approveButton, false);
        toastError(error);
        return;
      }
      reloadWith('Request approved', 'It has moved to In progress.');
      return;
    }

    // Assignee
    const assigneeItem = target.closest<HTMLElement>('[data-request-assignee]');
    if (assigneeItem) {
      if (assigneeItem.getAttribute('aria-checked') === 'true') return;
      const assigneeId = assigneeItem.dataset.requestAssignee ?? '';
      const { error } = await actions.requests.update({ id, assigneeId });
      if (error) {
        toastError(error);
        return;
      }
      const name = assigneeItem.querySelector('.truncate')?.textContent?.trim();
      reloadWith(assigneeId ? 'Assignee updated' : 'Request unassigned', assigneeId ? `Assigned to ${name}.` : undefined);
      return;
    }

    // Copy link
    if (target.closest('[data-copy-link]')) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied', description: 'Share it with anyone in the workspace.', variant: 'info' });
      } catch {
        toast({ title: "Couldn't copy the link", description: window.location.href, variant: 'error' });
      }
      return;
    }

    // Delete (confirmed in the dialog)
    const deleteButton = target.closest<HTMLElement>('[data-confirm-delete]');
    if (deleteButton) {
      setLoading(deleteButton, true);
      const { error } = await actions.requests.delete({ id });
      if (error) {
        setLoading(deleteButton, false);
        toastError(error);
        return;
      }
      flashToast({ title: 'Request deleted', description: `${id} was removed.` });
      window.location.href = '/requests';
    }
  });

  // Comments
  const form = document.getElementById('comment-form') as HTMLFormElement | null;
  const input = document.getElementById('comment-input') as HTMLTextAreaElement | null;
  const errorEl = document.getElementById('comment-input-error');

  const showError = (message: string) => {
    if (errorEl) errorEl.textContent = message;
    input?.setAttribute('aria-invalid', String(Boolean(message)));
    if (!message) input?.removeAttribute('aria-invalid');
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const comment = input?.value.trim() ?? '';
    if (!comment) {
      showError('Write a comment first.');
      input?.focus();
      return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    setLoading(button, true);
    const { error } = await actions.requests.comment({ id, comment });
    if (error) {
      setLoading(button, false);
      toastError(error);
      return;
    }
    reloadWith('Comment added');
  });

  input?.addEventListener('input', () => showError(''));
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) form?.requestSubmit();
  });
}
