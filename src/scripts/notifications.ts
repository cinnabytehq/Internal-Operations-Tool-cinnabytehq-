/**
 * Unread state for the notifications panel, stored per browser.
 * TODO(api): replace with read receipts from PATCH /api/me/notifications.
 */
import { readStorage, writeStorage } from './ui';

const STORAGE_KEY = 'cinnabyte:notifications-seen-at';
/** First visit: treat the last few hours as unread so the demo feels alive. */
const FIRST_VISIT_WINDOW = 4 * 60 * 60 * 1000;

export function initNotifications(): void {
  const items = [...document.querySelectorAll<HTMLElement>('[data-notification]')];
  const markButton = document.querySelector<HTMLButtonElement>('[data-mark-notifications-read]');

  let seenAt = readStorage<number>(STORAGE_KEY, Date.now() - FIRST_VISIT_WINDOW);

  const render = () => {
    let unread = 0;
    for (const item of items) {
      const isUnread = Date.parse(item.dataset.createdAt ?? '') > seenAt;
      if (isUnread) unread += 1;
      const indicator = item.querySelector<HTMLElement>('[data-unread-indicator]');
      if (indicator) indicator.hidden = !isUnread;
      item.classList.toggle('bg-accent-soft/40', isUnread);
    }
    document.querySelectorAll<HTMLElement>('[data-unread-dot]').forEach((dot) => (dot.hidden = unread === 0));
    document.querySelectorAll('[data-unread-label]').forEach((label) => {
      label.textContent = unread ? `, ${unread} unread` : '';
    });
    if (markButton) markButton.disabled = unread === 0;
  };

  markButton?.addEventListener('click', () => {
    seenAt = Date.now();
    writeStorage(STORAGE_KEY, seenAt);
    render();
  });

  render();
}
