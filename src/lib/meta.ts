/**
 * Display metadata for enum values (labels, ordering, descriptions) and
 * the small workflow rules shared by the API and the UI.
 *
 * A new status only has to be added here and in `src/types` — badges,
 * filters and menus pick it up automatically. Icons live in the Astro
 * components that render them.
 */
import type {
  ActivityAction,
  ApprovalStatus,
  EntityType,
  Priority,
  ProjectStatus,
  RequestCategory,
  RequestStatus,
  RequestView,
  Role,
  TaskStatus,
  TaskView,
} from '@/types';

/* ─── Requests ─── */

export const REQUEST_STATUSES: RequestStatus[] = ['new', 'in_review', 'in_progress', 'completed', 'rejected'];

/** `step` is the position in the workflow (rejected ends the flow at review). */
export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; step: number; description: string }> = {
  new: { label: 'New', step: 1, description: 'Submitted and waiting to be triaged' },
  in_review: { label: 'In review', step: 2, description: 'Being reviewed or awaiting approval' },
  in_progress: { label: 'In progress', step: 3, description: 'Work is underway' },
  completed: { label: 'Completed', step: 4, description: 'Delivered and closed' },
  rejected: { label: 'Rejected', step: 2, description: 'Declined during review' },
};

export const OPEN_REQUEST_STATUSES: RequestStatus[] = ['new', 'in_review', 'in_progress'];

export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export const PRIORITY_META: Record<Priority, { label: string; level: number }> = {
  low: { label: 'Low', level: 1 },
  medium: { label: 'Medium', level: 2 },
  high: { label: 'High', level: 3 },
};

export const REQUEST_CATEGORIES: RequestCategory[] = [
  'it_equipment',
  'software_access',
  'facilities',
  'design',
  'finance',
  'people',
];

export const CATEGORY_META: Record<RequestCategory, { label: string; requiresApproval: boolean }> = {
  it_equipment: { label: 'IT & Equipment', requiresApproval: true },
  software_access: { label: 'Software & Access', requiresApproval: false },
  facilities: { label: 'Facilities', requiresApproval: true },
  design: { label: 'Design', requiresApproval: false },
  finance: { label: 'Finance & Purchasing', requiresApproval: true },
  people: { label: 'People & HR', requiresApproval: false },
};

export const REQUEST_VIEWS: Array<{ id: RequestView; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My requests' },
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'awaiting_approval', label: 'Awaiting approval' },
];

/** "REQ-1042" */
export function requestRef(number: number): string {
  return `REQ-${number}`;
}

/* ─── Approvals ─── */

export const APPROVAL_STATUSES: ApprovalStatus[] = ['pending', 'approved', 'rejected'];

export const APPROVAL_META: Record<ApprovalStatus, { label: string; tab: string }> = {
  pending: { label: 'Awaiting approval', tab: 'Pending' },
  approved: { label: 'Approved', tab: 'Approved' },
  rejected: { label: 'Rejected', tab: 'Rejected' },
};

/* ─── Projects ─── */

export const PROJECT_STATUSES: ProjectStatus[] = ['planning', 'in_progress', 'on_hold', 'completed'];

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string }> = {
  planning: { label: 'Planning' },
  in_progress: { label: 'In progress' },
  on_hold: { label: 'On hold' },
  completed: { label: 'Completed' },
};

/* ─── Tasks ─── */

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'completed'];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; step: number }> = {
  todo: { label: 'To do', step: 0 },
  in_progress: { label: 'In progress', step: 1 },
  completed: { label: 'Completed', step: 2 },
};

export const TASK_VIEWS: Array<{ id: TaskView; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My tasks' },
  { id: 'completed', label: 'Completed' },
];

/* ─── People ─── */

export const ROLES: Role[] = ['admin', 'manager', 'member'];

export const ROLE_META: Record<Role, { label: string }> = {
  admin: { label: 'Admin' },
  manager: { label: 'Manager' },
  member: { label: 'Member' },
};

/* ─── Activity ─── */

export const ENTITY_META: Record<EntityType, { label: string; path: string }> = {
  request: { label: 'Request', path: '/requests' },
  project: { label: 'Project', path: '/projects' },
  task: { label: 'Task', path: '/tasks' },
};

export const ACTIVITY_VERBS: Record<ActivityAction, string> = {
  created: 'created',
  updated: 'updated',
  status_changed: 'moved',
  assigned: 'assigned',
  approved: 'approved',
  rejected: 'rejected',
  commented: 'commented on',
  completed: 'completed',
  progress_updated: 'updated progress on',
  deleted: 'deleted',
};

/** Label for a status key, whichever entity it belongs to. */
export function statusLabel(entity: EntityType, status: string): string {
  if (entity === 'request') return REQUEST_STATUS_META[status as RequestStatus]?.label ?? status;
  if (entity === 'project') return PROJECT_STATUS_META[status as ProjectStatus]?.label ?? status;
  return TASK_STATUS_META[status as TaskStatus]?.label ?? status;
}

/* ─── Type guards for query strings ─── */

const isOneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (values as readonly string[]).includes(value);

export const isRequestView = isOneOf(REQUEST_VIEWS.map((view) => view.id));
export const isRequestStatus = isOneOf(REQUEST_STATUSES);
export const isPriority = isOneOf(PRIORITIES);
export const isTaskView = isOneOf(TASK_VIEWS.map((view) => view.id));
export const isTaskStatus = isOneOf(TASK_STATUSES);
export const isApprovalStatus = isOneOf(APPROVAL_STATUSES);
export const isProjectStatus = isOneOf(PROJECT_STATUSES);
export const isEntityType = isOneOf(['request', 'project', 'task'] as const);
