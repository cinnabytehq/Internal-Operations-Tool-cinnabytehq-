/**
 * Seed timestamps are relative to when the server started, so the demo
 * workspace always looks "live" (things happened 2h ago, tasks are due
 * tomorrow…) no matter when you run it.
 *
 * TODO(api): delete this file once real data comes from the REST API.
 */

const SEEDED_AT = Date.now();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A moment in the past: ago({ hours: 2 }) */
export function ago({ days = 0, hours = 0, minutes = 0 }: { days?: number; hours?: number; minutes?: number }): string {
  return new Date(SEEDED_AT - days * DAY - hours * HOUR - minutes * MINUTE).toISOString();
}

/**
 * A calendar date relative to today, pinned to 12:00 UTC so it lands on the
 * same calendar day in (almost) every time zone. Negative = in the past.
 */
export function dueIn(days: number): string {
  const date = new Date(SEEDED_AT);
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
