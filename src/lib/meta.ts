/**
 * Display metadata for enum values (labels, ordering, descriptions).
 *
 * Keeping this in one place means a new status only has to be added here and
 * in `src/types` — every badge, filter and menu picks it up automatically.
 * Icons live in the Astro components that render them (see components/ui).
 */
import type {
  ActivityType,
  ApprovalStatus,
  EntityType,
  Priority,
  ProjectStatus,
  RequestCategory,
  RequestStatus,
  RequestView,
  TaskStatus,
  TaskView,
  UserRole,
} from '@/types';

export const REQUEST_STATUSES: RequestStatus[] = ['new', 'in_review', 'in_progress', 'completed'];

export const REQUEST_STATUS_META: Record<
  RequestStatus,
  { label: string; step: number; description: string }
> = {
  new: { label: 'New', step: 1, description: 'Submitted and waiting to be triaged' },
  in_review: { label: 'In review', step: 2, description: 'Being reviewed or awaiting approval' },
  in_progress: { label: 'In progress', step: 3, description: 'Work is underway' },
  completed: { label: 'Completed', step: 4, description: 'Delivered and closed' },
};

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

export const APPROVAL_META: Record<ApprovalStatus, { label: string }> = {
  pending: { label: 'Awaiting approval' },
  approved: { label: 'Approved' },
  rejected: { label: 'Rejected' },
};

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string }> = {
  planning: { label: 'Planning' },
  on_track: { label: 'On track' },
  at_risk: { label: 'At risk' },
  completed: { label: 'Completed' },
};

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; step: number }> = {
  todo: { label: 'To do', step: 0 },
  in_progress: { label: 'In progress', step: 1 },
  done: { label: 'Done', step: 2 },
};

export const ROLE_META: Record<UserRole, { label: string }> = {
  admin: { label: 'Admin' },
  manager: { label: 'Manager' },
  member: { label: 'Member' },
};

export const REQUEST_VIEWS: Array<{ id: RequestView; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My requests' },
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'pending_approval', label: 'Pending approval' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
];

export const TASK_VIEWS: Array<{ id: TaskView; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My tasks' },
  { id: 'completed', label: 'Completed' },
];

export const ENTITY_META: Record<EntityType, { label: string; path: string }> = {
  request: { label: 'Request', path: '/requests' },
  project: { label: 'Project', path: '/projects' },
  task: { label: 'Task', path: '/tasks' },
};

export const ACTIVITY_VERBS: Record<ActivityType, string> = {
  created: 'created',
  status_changed: 'moved',
  assigned: 'assigned',
  approved: 'approved',
  commented: 'commented on',
  completed: 'completed',
  progress_updated: 'updated progress on',
  deleted: 'deleted',
};

/** Label for a status key, whichever entity it belongs to. */
export function statusLabel(entityType: EntityType, status: string): string {
  if (entityType === 'request') return REQUEST_STATUS_META[status as RequestStatus]?.label ?? status;
  if (entityType === 'project') return PROJECT_STATUS_META[status as ProjectStatus]?.label ?? status;
  return TASK_STATUS_META[status as TaskStatus]?.label ?? status;
}

export function isRequestView(value: string | null): value is RequestView {
  return REQUEST_VIEWS.some((view) => view.id === value);
}

export function isTaskView(value: string | null): value is TaskView {
  return TASK_VIEWS.some((view) => view.id === value);
}
