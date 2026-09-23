/**
 * Approvals page: approve or reject in place (POST /api/approvals/:id/…).
 * The decided card fades out of the Pending list and the tab counts update.
 */
import { ApiError, api } from '@/lib/api/browser';
import { openDialog } from './dialogs';
import { toast, toastError } from './toast';
import { setLoading } from './ui';

const list = document.querySelector<HTMLElement>('[data-approvals]');

function adjustCount(key: string, delta: number) {
  document.querySelectorAll<HTMLElement>(`[data-count="${key}"]`).forEach((badge) => {
    badge.textContent = String(Math.max(0, Number(badge.textContent || 0) + delta));
  });
}

function removeDecided(id: string, outcome: 'approved' | 'rejected') {
  const card = document.querySelector<HTMLElement>(`[data-approval="${id}"]`);
  if (!card) return;
  card.style.opacity = '0';
  setTimeout(() => {
    card.remove();
    const empty = document.querySelector<HTMLElement>('[data-approvals-empty]');
    if (empty && !document.querySelector('[data-approval]')) empty.hidden = false;
  }, 200);
  adjustCount('pending', -1);
  adjustCount(outcome, 1);
}

if (list) {
  let rejecting: { id: string; button: HTMLElement } | null = null;
  const form = document.getElementById('reject-form') as HTMLFormElement;
  const reason = document.getElementById('reject-reason') as HTMLTextAreaElement;
  const reasonError = document.getElementById('reject-reason-error')!;
  const setReasonError = (message: string) => {
    reasonError.textContent = message;
    if (message) reason.setAttribute('aria-invalid', 'true');
    else reason.removeAttribute('aria-invalid');
  };

  list.addEventListener('click', async (event) => {
    const target = event.target as Element;

    const approveButton = target.closest<HTMLElement>('[data-approve]');
    if (approveButton) {
      setLoading(approveButton, true);
      try {
        const approval = await api.approve(approveButton.dataset.approve!);
        removeDecided(approval.id, 'approved');
        toast({ title: 'Request approved', description: `${approval.request.title} moved to In progress.`, action: { label: 'Open request', href: `/requests/${approval.request_id}` } });
      } catch (error) {
        setLoading(approveButton, false);
        toastError(error, "Couldn't approve the request");
      }
      return;
    }

    const rejectButton = target.closest<HTMLElement>('[data-reject]');
    if (rejectButton) {
      rejecting = { id: rejectButton.dataset.reject!, button: rejectButton };
      document.querySelector('[data-reject-title]')!.textContent = rejectButton.dataset.title ?? '';
      openDialog('reject-approval');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const comment = reason.value.trim();
    if (comment.length < 3) {
      setReasonError('Give the requester a short reason (at least 3 characters).');
      reason.focus();
      return;
    }
    if (!rejecting) return;
    const submit = document.querySelector<HTMLButtonElement>('button[form="reject-form"]');
    setLoading(submit, true);
    try {
      const approval = await api.reject(rejecting.id, comment);
      (document.getElementById('reject-approval') as HTMLDialogElement).close();
      removeDecided(approval.id, 'rejected');
      toast({ title: 'Request rejected', description: approval.request.title });
    } catch (error) {
      if (error instanceof ApiError && error.fields?.comment) setReasonError(error.fields.comment);
      else toastError(error, "Couldn't reject the request");
    } finally {
      setLoading(submit, false);
    }
  });

  reason.addEventListener('input', () => setReasonError(''));
  document.getElementById('reject-approval')?.addEventListener('close', () => {
    form.reset();
    setReasonError('');
    rejecting = null;
  });
}
