/**
 * Settings page: profile (saved through an action), notification and
 * workspace preferences (kept in localStorage until the API supports them),
 * and the section navigation highlight.
 */
import { actions, isInputError } from 'astro:actions';
import { flashToast, toast, toastError } from './toast';
import { readStorage, setLoading, writeStorage } from './ui';

const NOTIFICATIONS_KEY = 'cinnabyte:notification-preferences';
const WORKSPACE_KEY = 'cinnabyte:workspace-name';

function setFieldError(input: HTMLInputElement, message: string) {
  const error = document.querySelector(`[data-error-for="${input.id}"]`);
  if (error) error.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

/* ── Profile ── */
const profileForm = document.getElementById('profile-form') as HTMLFormElement | null;
profileForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = {
    name: profileForm.elements.namedItem('name') as HTMLInputElement,
    email: profileForm.elements.namedItem('email') as HTMLInputElement,
    title: profileForm.elements.namedItem('title') as HTMLInputElement,
  };
  const checks: Array<[HTMLInputElement, string]> = [
    [fields.name, fields.name.value.trim().length < 2 ? 'Enter your full name.' : ''],
    [fields.email, /^\S+@\S+\.\S+$/.test(fields.email.value.trim()) ? '' : 'Enter a valid email address.'],
    [fields.title, fields.title.value.trim().length < 2 ? 'Enter your job title.' : ''],
  ];
  checks.forEach(([input, message]) => setFieldError(input, message));
  const firstInvalid = checks.find(([, message]) => message)?.[0];
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const button = profileForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  setLoading(button, true);
  const { error } = await actions.profile.update({
    name: fields.name.value.trim(),
    email: fields.email.value.trim(),
    title: fields.title.value.trim(),
  });
  if (error) {
    setLoading(button, false);
    if (isInputError(error)) {
      for (const [name, messages] of Object.entries(error.fields)) {
        const input = fields[name as keyof typeof fields];
        if (input) setFieldError(input, (messages as string[])[0] ?? '');
      }
      return;
    }
    toastError(error);
    return;
  }
  flashToast({ title: 'Profile updated', description: 'Your changes are visible to the team.' });
  window.location.reload();
});

profileForm?.addEventListener('input', (event) => setFieldError(event.target as HTMLInputElement, ''));

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
      setFieldError(workspaceInput, 'Use at least 2 characters.');
      workspaceInput.focus();
      return;
    }
    setFieldError(workspaceInput, '');
    writeStorage(WORKSPACE_KEY, name);
    document.querySelectorAll('[data-workspace-name]').forEach((element) => (element.textContent = name));
    toast({ title: 'Workspace updated', description: `Renamed to ${name}.` });
  });
  workspaceInput.addEventListener('input', () => setFieldError(workspaceInput, ''));
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
