/**
 * Small, framework-free helpers shared by server and client code.
 */

type ClassValue = string | false | null | undefined | 0;

/** Join class names, skipping falsy values. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}

/** "Alex Johnson" → "AJ" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export const AVATAR_COLORS = ['emerald', 'sky', 'amber', 'rose', 'violet', 'slate'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

/** A stable colour for someone's initials avatar, derived from their id. */
export function avatarColor(seed: string): AvatarColor {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** "Alex Johnson" → "Alex" */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Normalise text for simple, forgiving search matching. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** True when every word of `query` appears somewhere in `haystack`. */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const text = normalize(haystack);
  return q.split(/\s+/).every((word) => text.includes(word));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
