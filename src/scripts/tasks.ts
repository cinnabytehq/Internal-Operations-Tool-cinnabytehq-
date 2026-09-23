/**
 * Task interactions wherever tasks are listed (Overview, Tasks, Projects):
 * checkbox completion, the status and assignee menus, expandable details
 * and delete — all through PATCH / DELETE /api/tasks/:id.
 *
 * Updates are optimistic: the row changes immediately and rolls back if the
 * API rejects the change.
 */
import type { TaskStatus } from '@/types';
import { api } from '@/lib/api/browser';
import { TASK_STATUS_META } from '@/lib/meta';
import { confirmAction } from './confirm';
import { toast, toastError } from './toast';

function rowsFor(id: string) {
  return document.querySelectorAll<HTMLElement>(`[data-task-row="${id}"]`);
}

function applyStatus(id: string, status: TaskStatus): void {
  rowsFor(id).forEach((row) => {
    row.dataset.status = status;
    row.querySelectorAll<HTMLElement>('[data-status-label]').forEach((label) => {
      label.hidden = label.dataset.statusLabel !== status;
    });
    const checkbox = row.querySelector<HTMLInputElement>('input[data-task-toggle]');
    if (checkbox) checkbox.checked = status === 'completed';
  });
  setChecked(`[data-task-status][data-task-id="${id}"]`, (item) => item.dataset.taskStatus === status);
}

function setChecked(selector: string, isChecked: (item: HTMLElement) => boolean): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((item) => {
    const selected = isChecked(item);
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
  try {
    const task = await api.updateTask(id, { status: next });
    const doneDelta = Number(next === 'completed') - Number(previous === 'completed');
    adjustCount('completed', doneDelta);
    adjustCount('open', -doneDelta);
    const title =
      next === 'completed'
        ? 'Task marked as completed'
        : previous === 'completed'
          ? 'Task reopened'
          : `Task moved to ${TASK_STATUS_META[next].label}`;
    toast({ title, description: task.title });
  } catch (error) {
    applyStatus(id, previous);
    toastError(error, "Couldn't update the task");
  }
}

async function assignTask(item: HTMLElement): Promise<void> {
  const id = item.dataset.taskId!;
  const assigneeId = item.dataset.taskAssignee || null;
  const menuAvatar = item.querySelector('[data-color], img');
  const rows = rowsFor(id);
  const previous = [...rows].map((row) => row.querySelector('[data-task-assignee-avatar]')?.innerHTML ?? '');

  // Optimistic: show the new avatar straight away (menu avatars are the same size).
  rows.forEach((row) => {
    const slot = row.querySelector('[data-task-assignee-avatar]');
    if (slot && menuAvatar) slot.replaceChildren(menuAvatar.cloneNode(true));
    else if (slot) slot.innerHTML = previous[0];
  });
  setChecked(`[data-task-assignee][data-task-id="${id}"]`, (candidate) => candidate === item);

  try {
    const task = await api.updateTask(id, { assignee_id: assigneeId });
    rows.forEach((row) => {
      const name = row.querySelector('[data-task-assignee-name]');
      if (name) name.textContent = task.assignee?.full_name ?? 'Unassigned';
    });
    toast({ title: task.assignee ? `Assigned to ${task.assignee.full_name}` : 'Task unassigned', description: task.title });
  } catch (error) {
    rows.forEach((row, index) => {
      const slot = row.querySelector('[data-task-assignee-avatar]');
      if (slot) slot.innerHTML = previous[index];
    });
    toastError(error, "Couldn't assign the task");
  }
}

async function deleteTask(button: HTMLElement): Promise<void> {
  const id = button.dataset.taskDelete!;
  const confirmed = await confirmAction({
    title: 'Delete this task?',
    description: `“${button.dataset.title}” will be removed. Its history stays in the activity log.`,
    confirmLabel: 'Delete task',
  });
  if (!confirmed) return;
  try {
    await api.deleteTask(id);
    rowsFor(id).forEach((row) => {
      if (row.dataset.status === 'completed') adjustCount('completed', -1);
      else adjustCount('open', -1);
      row.style.transition = 'opacity 180ms ease-out';
      row.style.opacity = '0';
      setTimeout(() => row.remove(), 200);
    });
    adjustCount('all', -1);
    toast({ title: 'Task deleted' });
  } catch (error) {
    toastError(error, "Couldn't delete the task");
  }
}

export function initTasks(): void {
  document.addEventListener('change', (event) => {
    const checkbox = event.target as HTMLInputElement;
    if (!checkbox.matches?.('input[data-task-toggle]')) return;
    const row = checkbox.closest<HTMLElement>('[data-task-row]');
    if (!row) return;
    setTaskStatus(row.dataset.taskRow!, checkbox.checked ? 'completed' : 'todo', row.dataset.status as TaskStatus);
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

    const assigneeItem = target.closest<HTMLElement>('[data-task-assignee]');
    if (assigneeItem && assigneeItem.getAttribute('aria-checked') !== 'true') {
      assignTask(assigneeItem);
      return;
    }

    const deleteButton = target.closest<HTMLElement>('[data-task-delete]');
    if (deleteButton) {
      deleteTask(deleteButton);
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
