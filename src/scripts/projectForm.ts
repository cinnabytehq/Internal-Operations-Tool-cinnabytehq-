/**
 * Project create / edit / delete:
 *   POST /api/projects · PATCH /api/projects/:id · DELETE /api/projects/:id
 */
import type { CreateProjectInput, ProjectStatus } from '@/types';
import { api } from '@/lib/api/browser';
import { confirmAction } from './confirm';
import { clearErrorsOnInput, clearFieldErrors, setFieldError, showApiFieldErrors } from './forms';
import { flashToast, toastError } from './toast';
import { setLoading } from './ui';

const dialog = document.getElementById('project-form') as HTMLDialogElement | null;
const form = document.getElementById('project-form-el') as HTMLFormElement | null;

if (dialog && form) {
  const projectId = form.dataset.projectId;
  const submit = dialog.querySelector<HTMLButtonElement>('button[type="submit"]');
  const progress = form.elements.namedItem('progress') as HTMLInputElement;
  const output = form.querySelector<HTMLOutputElement>('[data-progress-output]');
  clearErrorsOnInput(form);
  progress.addEventListener('input', () => {
    if (output) output.value = `${progress.value}%`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    const data = new FormData(form);
    const input: CreateProjectInput = {
      name: String(data.get('name') ?? '').trim(),
      description: String(data.get('description') ?? '').trim(),
      owner_id: String(data.get('owner_id') ?? ''),
      status: data.get('status') as ProjectStatus,
      progress: Number(data.get('progress') ?? 0),
    };

    let valid = true;
    if (input.name.length < 2) valid = !setFieldError(form, 'name', 'Name must be at least 2 characters.');
    if (!input.description) valid = !setFieldError(form, 'description', 'Description is required.') && valid;
    if (!valid) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    setLoading(submit, true);
    try {
      if (projectId) {
        const project = await api.updateProject(projectId, input);
        flashToast({ title: 'Project updated', description: project.name });
        window.location.reload();
      } else {
        const project = await api.createProject(input);
        flashToast({ title: 'Project created', description: project.name });
        window.location.href = `/projects/${project.id}`;
      }
    } catch (error) {
      setLoading(submit, false);
      if (!showApiFieldErrors(form, error)) toastError(error, projectId ? "Couldn't save the project" : "Couldn't create the project");
    }
  });

  dialog.addEventListener('close', () => {
    form.reset();
    if (output) output.value = `${progress.value}%`;
    clearFieldErrors(form);
    setLoading(submit, false);
  });
}

/* Delete (project detail page) */
document.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-project-delete]');
  if (!button) return;
  const confirmed = await confirmAction({
    title: 'Delete this project?',
    description: `“${button.dataset.name}” and all of its tasks will be deleted. The activity history is kept. This can't be undone.`,
    confirmLabel: 'Delete project',
  });
  if (!confirmed) return;
  try {
    await api.deleteProject(button.dataset.projectDelete!);
    flashToast({ title: 'Project deleted', description: button.dataset.name });
    window.location.href = '/projects';
  } catch (error) {
    toastError(error, "Couldn't delete the project");
  }
});
