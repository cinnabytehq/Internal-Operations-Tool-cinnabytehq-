/**
 * Date helpers.
 *
 * Pages are rendered on the server, so absolute times are formatted in the
 * viewer's time zone. The browser reports it through the `tz` cookie (see
 * BaseLayout) and middleware exposes it as `Astro.locals.timeZone`.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DEFAULT_TIME_ZONE = 'UTC';

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "just now", "12m ago", "3h ago", "2d ago", then "Sep 12" */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatDate(iso);
}

/** "Sep 23" (adds the year when it isn't the current one) */
export function formatDate(iso: string, timeZone = DEFAULT_TIME_ZONE): string {
  const date = new Date(iso);
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    timeZone,
  });
}

/** "Wednesday, September 23" */
export function formatLongDate(iso: string, timeZone = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
}

/** "09:42" (24h, used in timelines) */
export function formatTime(iso: string, timeZone = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

/** "Sep 23, 2026 at 09:42" */
export function formatDateTime(iso: string, timeZone = DEFAULT_TIME_ZONE): string {
  return `${new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  })} at ${formatTime(iso, timeZone)}`;
}

/** Calendar day key ("2026-09-23") of an instant in a given time zone. */
export function dayKey(iso: string | number, timeZone = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone });
}

/** Whole calendar days from today to `iso` (negative = in the past). */
export function daysFromToday(iso: string, timeZone = DEFAULT_TIME_ZONE): number {
  const target = Date.parse(dayKey(iso, timeZone));
  const today = Date.parse(dayKey(Date.now(), timeZone));
  return Math.round((target - today) / DAY);
}

/** "Today", "Yesterday", or "Monday, Sep 21" — used to group timelines. */
export function dayLabel(iso: string, timeZone = DEFAULT_TIME_ZONE): string {
  const days = daysFromToday(iso, timeZone);
  if (days === 0) return 'Today';
  if (days === -1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
}

export interface DueInfo {
  label: string;
  tone: 'overdue' | 'soon' | 'normal' | 'done';
}

/** Friendly due-date label: "Overdue · Sep 21", "Today", "Tomorrow", "Fri", "Oct 4" */
export function describeDue(iso: string, timeZone = DEFAULT_TIME_ZONE, done = false): DueInfo {
  const days = daysFromToday(iso, timeZone);
  if (done) return { label: formatDate(iso, timeZone), tone: 'done' };
  if (days < 0) return { label: `Overdue · ${formatDate(iso, timeZone)}`, tone: 'overdue' };
  if (days === 0) return { label: 'Today', tone: 'soon' };
  if (days === 1) return { label: 'Tomorrow', tone: 'soon' };
  if (days < 7) {
    return {
      label: new Date(iso).toLocaleDateString('en-US', { weekday: 'short', timeZone }),
      tone: 'normal',
    };
  }
  return { label: formatDate(iso, timeZone), tone: 'normal' };
}

/** "Good morning" / "Good afternoon" / "Good evening" in the viewer's zone. */
export function greeting(timeZone = DEFAULT_TIME_ZONE, now = new Date()): string {
  const hour = Number(
    now.toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function isWithinDays(iso: string, days: number, now = Date.now()): boolean {
  return now - new Date(iso).getTime() <= days * DAY;
}
