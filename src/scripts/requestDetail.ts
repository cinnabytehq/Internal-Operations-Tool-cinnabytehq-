/**
 * Request detail interactions, all through the REST API:
 * status, priority and assignee (PATCH /api/requests/:id), approve / reject
 * (POST /api/approvals/:id/…), comments, copy link and delete.
 *
 * After a successful change the page reloads so the workflow, timeline and
 * details all come fresh from the server, and a toast confirms the change.
 */
import type { Priority, RequestStatus, UpdateRequestInput } from '@/types';
import { ApiError, api } from '@/lib/api/browser';
import { PRIORITY_META, REQUEST_STATUS_META } from '@/lib/meta';
import { flashToast, toast, toastError } from './toast';
import { setLoading } from './ui';

const root = document.querySelector<HTMLElement>('[data-request-id]');

if (root) {
  const id = root.dataset.requestId!;
  const approvalId = root.dataset.approvalId;

  const reloadWith = (title: string, description?: string) => {
    flashToast({ title, description });
    window.location.reload();
  };

  async function update(control: HTMLElement, input: UpdateRequestInput, title: string, description?: string) {
    setLoading(control, true);
    try {
      await api.updateRequest(id, input);
      reloadWith(title, description);
    } catch (error) {
      setLoading(control, false);
      toastError(error, "Couldn't update the request");
    }
  }

  document.addEventListener('click', async (event) => {
    const target = event.target as Element;

    const statusControl = target.closest<HTMLElement>('[data-request-status]');
    if (statusControl && statusControl.getAttribute('aria-checked') !== 'true') {
      const status = statusControl.dataset.requestStatus as RequestStatus;
      await update(statusControl, { status }, 'Request status updated', `Moved to ${REQUEST_STATUS_META[status].label}.`);
      return;
    }

    const priorityControl = target.closest<HTMLElement>('[data-request-priority]');
    if (priorityControl && priorityControl.getAttribute('aria-checked') !== 'true') {
      const priority = priorityControl.dataset.requestPriority as Priority;
      await update(priorityControl, { priority }, 'Priority updated', `Set to ${PRIORITY_META[priority].label}.`);
      return;
    }

    const assigneeControl = target.closest<HTMLElement>('[data-request-assignee]');
    if (assigneeControl && assigneeControl.getAttribute('aria-checked') !== 'true') {
      const assigneeId = assigneeControl.dataset.requestAssignee || null;
      const name = assigneeControl.dataset.name;
      await update(
        assigneeControl,
        { assignee_id: assigneeId },
        assigneeId ? 'Assignee updated' : 'Request unassigned',
        name ? `Assigned to ${name}.` : undefined,
      );
      return;
    }

    const approveControl = target.closest<HTMLElement>('[data-approval-approve]');
    if (approveControl) {
      setLoading(approveControl, true);
      try {
        await api.approve(approveControl.dataset.approvalApprove!);
        reloadWith('Request approved', 'It has moved to In progress.');
      } catch (error) {
        setLoading(approveControl, false);
        toastError(error, "Couldn't approve the request");
      }
      return;
    }

    if (target.closest('[data-copy-link]')) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied', description: 'Share it with anyone in the workspace.', variant: 'info' });
      } catch {
        toast({ title: "Couldn't copy the link", description: window.location.href, variant: 'error' });
      }
      return;
    }

    const deleteButton = target.closest<HTMLElement>('[data-confirm-delete]');
    if (deleteButton) {
      setLoading(deleteButton, true);
      try {
        await api.deleteRequest(id);
        flashToast({ title: 'Request deleted', description: 'Its history is kept in the activity log.' });
        window.location.href = '/requests';
      } catch (error) {
        setLoading(deleteButton, false);
        toastError(error, "Couldn't delete the request");
      }
    }
  });

  /* ─── Reject (reason required) ─── */
  const rejectForm = document.getElementById('reject-form') as HTMLFormElement | null;
  const reason = document.getElementById('reject-reason') as HTMLTextAreaElement | null;
  const reasonError = document.getElementById('reject-reason-error');

  const setReasonError = (message: string) => {
    if (reasonError) reasonError.textContent = message;
    if (message) reason?.setAttribute('aria-invalid', 'true');
    else reason?.removeAttribute('aria-invalid');
  };

  rejectForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const comment = reason?.value.trim() ?? '';
    if (comment.length < 3) {
      setReasonError('Give the requester a short reason (at least 3 characters).');
      reason?.focus();
      return;
    }
    if (!approvalId) return;
    const button = document.querySelector<HTMLButtonElement>('button[form="reject-form"]');
    setLoading(button, true);
    try {
      await api.reject(approvalId, comment);
      reloadWith('Request rejected', 'The requester can see your reason.');
    } catch (error) {
      setLoading(button, false);
      if (error instanceof ApiError && error.fields?.comment) setReasonError(error.fields.comment);
      else toastError(error, "Couldn't reject the request");
    }
  });
  reason?.addEventListener('input', () => setReasonError(''));

  /* ─── Comments ─── */
  const form = document.getElementById('comment-form') as HTMLFormElement | null;
  const input = document.getElementById('comment-input') as HTMLTextAreaElement | null;
  const errorEl = document.getElementById('comment-input-error');

  const showError = (message: string) => {
    if (errorEl) errorEl.textContent = message;
    if (message) input?.setAttribute('aria-invalid', 'true');
    else input?.removeAttribute('aria-invalid');
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
    try {
      await api.addComment(id, comment);
      reloadWith('Comment added');
    } catch (error) {
      setLoading(button, false);
      toastError(error, "Couldn't add the comment");
    }
  });

  input?.addEventListener('input', () => showError(''));
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) form?.requestSubmit();
  });
}
