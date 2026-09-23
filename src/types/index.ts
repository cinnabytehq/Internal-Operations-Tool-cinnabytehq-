/**
 * CinnabyteHQ domain model.
 *
 * These interfaces are the contract between the UI and the data layer.
 * They intentionally mirror what the future REST API will return, and map
 * 1:1 to the planned PostgreSQL tables (see docs/BACKEND_INTEGRATION.md):
 *
 *   User      → users
 *   Request   → requests
 *   Approval  → approvals
 *   Project   → projects (+ project_members)
 *   Task      → tasks
 *   Activity  → activity_events
 *
 * Dates are ISO-8601 strings, exactly as they will arrive over JSON.
 */

/* ───────────────────────── Users ───────────────────────── */

export type UserRole = 'admin' | 'manager' | 'member';

export type Team = 'Operations' | 'Finance' | 'Engineering' | 'Design' | 'IT' | 'People';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Job title, e.g. "Operations Manager" */
  title: string;
  team: Team;
  role: UserRole;
  /** Palette key used for the initials avatar */
  avatarColor: AvatarColor;
}

export type AvatarColor = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate';

/* ──────────────────────── Requests ──────────────────────── */

export type Priority = 'low' | 'medium' | 'high';

/** The request workflow: new → in_review → in_progress → completed */
export type RequestStatus = 'new' | 'in_review' | 'in_progress' | 'completed';

export type RequestCategory =
  | 'it_equipment'
  | 'software_access'
  | 'facilities'
  | 'design'
  | 'finance'
  | 'people';

export interface Request {
  /** Human-readable key, e.g. "REQ-1042" */
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  requesterId: string;
  assigneeId?: string;
  priority: Priority;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  requestId: string;
  approverId: string;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
}

/* ──────────────────────── Projects ──────────────────────── */

export type ProjectStatus = 'planning' | 'on_track' | 'at_risk' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  /** 0–100, reported by the project owner */
  progress: number;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
}

/* ───────────────────────── Tasks ───────────────────────── */

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  /** Tasks can be spun out of a request */
  requestId?: string;
  assigneeId: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
}

/* ──────────────────────── Activity ──────────────────────── */

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'approved'
  | 'commented'
  | 'completed'
  | 'progress_updated'
  | 'deleted';

export type EntityType = 'request' | 'project' | 'task';

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  entityType: EntityType;
  entityId: string;
  /** Snapshot of the title so the log still reads well after renames/deletes */
  entityTitle: string;
  meta?: {
    from?: string;
    to?: string;
    comment?: string;
    assigneeId?: string;
  };
  createdAt: string;
}

/* ─────────────────── API response shapes ───────────────────
 * What list/detail endpoints return: the base record plus the related
 * records the UI needs, so pages never have to stitch data together.
 */

export interface RequestWithRelations extends Request {
  requester: User;
  assignee: User | null;
  approval: (Approval & { approver: User }) | null;
}

export interface ProjectWithRelations extends Project {
  owner: User;
  members: User[];
  taskCount: number;
  completedTaskCount: number;
}

export interface TaskWithRelations extends Task {
  assignee: User;
  project: Pick<Project, 'id' | 'name'> | null;
  request: Pick<Request, 'id' | 'title'> | null;
}

export interface ActivityWithActor extends Activity {
  actor: User;
  /** The person something was assigned to (for "assigned" events) */
  target: User | null;
  /** Link to the entity, or null when it no longer exists */
  href: string | null;
}

/* ───────────────────────── Inputs ───────────────────────── */

export interface CreateRequestInput {
  title: string;
  description: string;
  category: RequestCategory;
  priority: Priority;
  assigneeId?: string;
}

export type UpdateRequestInput = Partial<
  Pick<Request, 'title' | 'description' | 'category' | 'priority' | 'status' | 'assigneeId'>
>;

export interface UpdateProfileInput {
  name: string;
  email: string;
  title: string;
}

/* ──────────────────────── Filters ──────────────────────── */

export type RequestView = 'all' | 'mine' | 'assigned' | 'pending_approval' | 'in_progress' | 'completed';

export interface RequestFilters {
  view?: RequestView;
  search?: string;
}

export type TaskView = 'all' | 'mine' | 'completed';

export interface TaskFilters {
  view?: TaskView;
  projectId?: string;
  requestId?: string;
  assigneeId?: string;
  search?: string;
}

/* ─────────────────────── Dashboard ─────────────────────── */

export interface DashboardSummary {
  activeRequests: { count: number; openedThisWeek: number };
  inProgress: { count: number; highPriority: number };
  awaitingApproval: { count: number; waitingOnYou: number };
  completed: { count: number; lastSevenDays: number };
  statusBreakdown: Array<{ status: RequestStatus; count: number }>;
  total: number;
}

export interface SearchResult {
  type: EntityType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}
