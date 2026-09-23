/** Shared prop types for UI primitives. */

export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start' | 'right-end';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface TabItem {
  label: string;
  href: string;
  active: boolean;
  count?: number;
  /** Key used by scripts to update the count live, e.g. "completed" */
  countKey?: string;
}
