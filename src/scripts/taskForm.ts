/** "New task" dialog → POST /api/tasks, then reload with a toast. */
import type { CreateTaskInput, Priority, TaskStatus } from '@/types';
import { api } from '@/lib/api/browser';
import { clearErrorsOnInput, clearFieldErrors, setFieldError, showApiFieldErrors } from './forms';
import { flashToast, toastError } from './toast';
import { setLoading } from './ui';

const dialog = document.getElementById('task-form') as HTMLDialogElement | null;
const form = document.getElementById('task-form-el') as HTMLFormElement | null;

if (dialog && form) {
  const submit = dialog.querySelector<HTMLButtonElement>('button[type="submit"]');
  clearErrorsOnInput(form);

  // Openers can preselect a project: <button data-dialog-open="task-form" data-project-id="…">
  document.addEventListener('click', (event) => {
    const opener = (event.target as Element).closest<HTMLElement>('[data-dialog-open="task-form"][data-project-id]');
    if (opener) (form.elements.namedItem('project_id') as HTMLSelectElement).value = opener.dataset.projectId!;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const projectId = String(data.get('project_id') ?? '');

    let valid = true;
    if (title.length < 2) valid = !setFieldError(form, 'title', 'Title must be at least 2 characters.');
    if (!projectId) valid = !setFieldError(form, 'project_id', 'Choose a project.') && valid;
    if (!valid) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    const input: CreateTaskInput = {
      title,
      description: String(data.get('description') ?? '').trim() || null,
      project_id: projectId,
      assignee_id: String(data.get('assignee_id') ?? '') || null,
      priority: data.get('priority') as Priority,
      status: data.get('status') as TaskStatus,
      due_date: String(data.get('due_date') ?? '') || null,
    };

    setLoading(submit, true);
    try {
      const task = await api.createTask(input);
      flashToast({ title: 'Task created', description: `${task.title} · ${task.project.name}` });
      window.location.reload();
    } catch (error) {
      setLoading(submit, false);
      if (!showApiFieldErrors(form, error)) toastError(error, "Couldn't create the task");
    }
  });

  dialog.addEventListener('close', () => {
    form.reset();
    clearFieldErrors(form);
    setLoading(submit, false);
  });
}
