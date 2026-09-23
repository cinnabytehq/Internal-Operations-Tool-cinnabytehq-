/**
 * Settings page: profile (PATCH /api/profiles/:id), notification and
 * workspace preferences (kept in localStorage until the API supports them),
 * and the section navigation highlight.
 */
import { api } from '@/lib/api/browser';
import { clearErrorsOnInput, clearFieldErrors, setFieldError, showApiFieldErrors } from './forms';
import { flashToast, toast, toastError } from './toast';
import { readStorage, setLoading, writeStorage } from './ui';

const NOTIFICATIONS_KEY = 'cinnabyte:notification-preferences';
const WORKSPACE_KEY = 'cinnabyte:workspace-name';

/* ── Profile ── */
const profileForm = document.getElementById('profile-form') as HTMLFormElement | null;
if (profileForm) {
  const profileId = profileForm.dataset.profileId!;
  const value = (name: string) => (profileForm.elements.namedItem(name) as HTMLInputElement).value.trim();

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(profileForm);
    const input = {
      full_name: value('full_name'),
      job_title: value('job_title') || null,
      team: value('team') || null,
    };
    if (input.full_name.length < 2) {
      setFieldError(profileForm, 'full_name', 'Enter your full name.');
      (profileForm.elements.namedItem('full_name') as HTMLInputElement).focus();
      return;
    }

    const button = profileForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    setLoading(button, true);
    try {
      await api.updateProfile(profileId, input);
      flashToast({ title: 'Profile updated', description: 'Your changes are visible to the team.' });
      window.location.reload();
    } catch (error) {
      setLoading(button, false);
      if (!showApiFieldErrors(profileForm, error)) toastError(error, "Couldn't update your profile");
    }
  });

  clearErrorsOnInput(profileForm);
}

/* ── Notifications ── */
const notificationGroup = document.querySelector('[data-notification-settings]');
if (notificationGroup) {
  const saved = readStorage<Record<string, boolean>>(NOTIFICATIONS_KEY, {});
  notificationGroup.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
    if (input.name in saved) input.checked = saved[input.name];
  });
  notificationGroup.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    const preferences = readStorage<Record<string, boolean>>(NOTIFICATIONS_KEY, {});
    preferences[input.name] = input.checked;
    writeStorage(NOTIFICATIONS_KEY, preferences);
    const label = document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim();
    toast({ title: 'Notification preferences saved', description: `${label} ${input.checked ? 'on' : 'off'}.` });
  });
}

/* ── Workspace ── */
const workspaceForm = document.getElementById('workspace-form') as HTMLFormElement | null;
const workspaceInput = document.getElementById('workspace-name') as HTMLInputElement | null;
if (workspaceForm && workspaceInput) {
  workspaceInput.value = readStorage<string>(WORKSPACE_KEY, workspaceInput.value);
  workspaceForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = workspaceInput.value.trim();
    if (name.length < 2) {
      setFieldError(workspaceForm, workspaceInput.name, 'Use at least 2 characters.');
      workspaceInput.focus();
      return;
    }
    setFieldError(workspaceForm, workspaceInput.name, null);
    writeStorage(WORKSPACE_KEY, name);
    document.querySelectorAll('[data-workspace-name]').forEach((element) => (element.textContent = name));
    toast({ title: 'Workspace updated', description: `Renamed to ${name}.` });
  });
  clearErrorsOnInput(workspaceForm);
}

/* ── Section navigation highlight ── */
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-settings-link]')];
const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    links.forEach((link) => link.setAttribute('aria-current', String(link.dataset.settingsLink === visible.target.id)));
  },
  { rootMargin: '-20% 0px -60% 0px' },
);
links.forEach((link) => {
  const section = document.getElementById(link.dataset.settingsLink!);
  if (section) observer.observe(section);
});
links[0]?.setAttribute('aria-current', 'true');
