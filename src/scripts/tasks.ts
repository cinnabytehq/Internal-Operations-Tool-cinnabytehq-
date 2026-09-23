/**
 * Task interactions wherever tasks are listed (Overview, Tasks, Projects):
 * checkbox completion, the status menu and expandable details.
 *
 * Updates are optimistic — the row changes immediately and rolls back if
 * the server rejects the change.
 */
import { actions } from 'astro:actions';
import type { TaskStatus } from '@/types';
import { TASK_STATUS_META } from '@/lib/meta';
import { toast, toastError } from './toast';

function applyStatus(id: string, status: TaskStatus): void {
  document.querySelectorAll<HTMLElement>(`[data-task-row="${id}"]`).forEach((row) => {
    row.dataset.status = status;
    row.querySelectorAll<HTMLElement>('[data-status-label]').forEach((label) => {
      label.hidden = label.dataset.statusLabel !== status;
    });
    const checkbox = row.querySelector<HTMLInputElement>('input[data-task-toggle]');
    if (checkbox) checkbox.checked = status === 'done';
  });
  document.querySelectorAll<HTMLElement>(`[data-task-status][data-task-id="${id}"]`).forEach((item) => {
    const selected = item.dataset.taskStatus === status;
    item.setAttribute('aria-checked', String(selected));
    item.querySelector('[data-check]')?.classList.toggle('invisible', !selected);
  });
}

function adjustCount(key: string, delta: number): void {
  if (!delta) return;
  document.querySelectorAll<HTMLElement>(`[data-count="${key}"]`).forEach((element) => {
    element.textContent = String(Math.max(0, Number(element.textContent) + delta));
  });
}

async function setTaskStatus(id: string, next: TaskStatus, previous: TaskStatus): Promise<void> {
  if (next === previous) return;
  applyStatus(id, next);

  const { data, error } = await actions.tasks.setStatus({ id, status: next });
  if (error) {
    applyStatus(id, previous);
    toastError(error);
    return;
  }

  const doneDelta = Number(next === 'done') - Number(previous === 'done');
  adjustCount('completed', doneDelta);
  adjustCount('open', -doneDelta);

  const title =
    next === 'done'
      ? 'Task marked as completed'
      : previous === 'done'
        ? 'Task reopened'
        : `Task moved to ${TASK_STATUS_META[next].label}`;
  toast({ title, description: data.title });
}

export function initTasks(): void {
  document.addEventListener('change', (event) => {
    const checkbox = event.target as HTMLInputElement;
    if (!checkbox.matches?.('input[data-task-toggle]')) return;
    const row = checkbox.closest<HTMLElement>('[data-task-row]');
    if (!row) return;
    const previous = row.dataset.status as TaskStatus;
    setTaskStatus(row.dataset.taskRow!, checkbox.checked ? 'done' : 'todo', previous);
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Element;

    const statusItem = target.closest<HTMLElement>('[data-task-status]');
    if (statusItem) {
      const id = statusItem.dataset.taskId!;
      const row = document.querySelector<HTMLElement>(`[data-task-row="${id}"]`);
      setTaskStatus(id, statusItem.dataset.taskStatus as TaskStatus, (row?.dataset.status ?? 'todo') as TaskStatus);
      return;
    }

    const expand = target.closest<HTMLButtonElement>('[data-task-expand]');
    if (expand) {
      const details = document.getElementById(expand.getAttribute('aria-controls') ?? '');
      const open = expand.getAttribute('aria-expanded') !== 'true';
      expand.setAttribute('aria-expanded', String(open));
      if (details) details.hidden = !open;
    }
  });
}
