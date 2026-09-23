/**
 * CinnabyteHQ data contract.
 *
 * One set of names from the database to the screen:
 *   PostgreSQL columns  →  REST API JSON  →  these types  →  components
 * Field names are snake_case everywhere so nothing has to be renamed
 * along the way. Dates are ISO-8601 strings; `due_date` is a calendar
 * date ("2026-09-25").
 *
 * Tables live in supabase/migrations/001_initial_schema.sql.
 */

/* ───────────────────────── Enums ───────────────────────── */

export type Role = 'admin' | 'manager' | 'member';
export type Priority = 'low' | 'medium' | 'high';
export type RequestCategory = 'it_equipment' | 'software_access' | 'facilities' | 'design' | 'finance' | 'people';
export type RequestStatus = 'new' | 'in_review' | 'in_progress' | 'completed' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'approved'
  | 'rejected'
  | 'commented'
  | 'completed'
  | 'progress_updated'
  | 'deleted';
export type EntityType = 'request' | 'project' | 'task';

/* ─────────────────────── Table rows ─────────────────────── */

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  job_title: string | null;
  team: string | null;
  created_at: string;
}

export interface Request {
  id: string;
  /** Shown as REQ-1042 */
  number: number;
  title: string;
  description: string;
  category: RequestCategory;
  priority: Priority;
  status: RequestStatus;
  requester_id: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  request_id: string;
  approver_id: string;
  status: ApprovalStatus;
  comment: string | null;
  /** When the decision (approve or reject) was made */
  approved_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  status: ProjectStatus;
  /** 0–100, reported by the project owner */
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  assignee_id: string | null;
  priority: Priority;
  status: TaskStatus;
  /** Calendar date, e.g. "2026-09-25" */
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityMetadata {
  entity?: EntityType;
  /** Title snapshot, so history still reads well after a delete */
  title?: string;
  from?: string;
  to?: string;
  comment?: string;
  assignee_id?: string;
  assignee_name?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  request_id: string | null;
  project_id: string | null;
  task_id: string | null;
  action: ActivityAction;
  description: string;
  metadata: ActivityMetadata;
  created_at: string;
}

/* ─────────────────── API response shapes ───────────────────
 * Records plus the related data the UI needs, so pages never stitch
 * several responses together.
 */

export interface ApprovalWithApprover extends Approval {
  approver: Profile;
}

export interface RequestWithRelations extends Request {
  requester: Profile;
  assignee: Profile | null;
  /** The most recent approval, if this request needed one */
  approval: ApprovalWithApprover | null;
}

export interface ApprovalWithRelations extends ApprovalWithApprover {
  request: Pick<Request, 'id' | 'number' | 'title' | 'category' | 'priority' | 'status' | 'created_at'> & {
    requester: Profile;
  };
}

export interface ProjectWithRelations extends Project {
  owner: Profile;
  task_count: number;
  completed_task_count: number;
}

export interface TaskWithRelations extends Task {
  project: Pick<Project, 'id' | 'name' | 'status'>;
  assignee: Profile | null;
}

export interface ActivityWithRelations extends ActivityLog {
  user: Profile | null;
  /** What the event is about */
  entity: EntityType;
  entity_id: string | null;
  entity_title: string;
  /** Human reference when there is one, e.g. "REQ-1042" */
  entity_ref: string | null;
  /** Link to the record in the app, or null when it no longer exists */
  href: string | null;
}

/* ───────────────────────── Inputs ───────────────────────── */

export interface CreateRequestInput {
  title: string;
  description: string;
  category: RequestCategory;
  priority: Priority;
  assignee_id?: string | null;
}

export interface UpdateRequestInput {
  title?: string;
  description?: string;
  category?: RequestCategory;
  priority?: Priority;
  status?: RequestStatus;
  assignee_id?: string | null;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  owner_id: string;
  status?: ProjectStatus;
  progress?: number;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  project_id: string;
  assignee_id?: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date?: string | null;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface UpdateProfileInput {
  full_name?: string;
  job_title?: string | null;
  team?: string | null;
  avatar_url?: string | null;
}

export interface ApprovalDecisionInput {
  comment?: string | null;
}

/* ──────────────────────── Queries ──────────────────────── */

export type RequestView = 'all' | 'mine' | 'assigned' | 'awaiting_approval';

export interface RequestQuery {
  view?: RequestView;
  status?: RequestStatus;
  priority?: Priority;
  q?: string;
  limit?: number;
}

export type TaskView = 'all' | 'mine' | 'completed';

export interface TaskQuery {
  view?: TaskView;
  project_id?: string;
  assignee_id?: string;
  status?: TaskStatus;
  priority?: Priority;
  q?: string;
  limit?: number;
}

export interface ProjectQuery {
  status?: ProjectStatus;
  active?: boolean;
}

export interface ActivityQuery {
  entity?: EntityType;
  request_id?: string;
  project_id?: string;
  task_id?: string;
  limit?: number;
}

export interface ApprovalQuery {
  status?: ApprovalStatus;
  request_id?: string;
}

/* ─────────────────────── Envelopes ─────────────────────── */

/** Every successful response: `{ "data": … }` (lists may add `meta`) */
export interface ApiSuccess<T, M = undefined> {
  data: T;
  meta?: M;
}

/** Every error response */
export interface ApiErrorBody {
  error: {
    message: string;
    code?: string;
    /** Field-level validation messages, e.g. { title: "Too short" } */
    fields?: Record<string, string>;
  };
}

export interface RequestListMeta {
  total: number;
  counts: Record<RequestView, number>;
}

export interface TaskListMeta {
  total: number;
  counts: Record<TaskView, number>;
}

export interface ApprovalListMeta {
  counts: Record<ApprovalStatus, number>;
}

/* ─────────────────────── Aggregates ─────────────────────── */

export interface DashboardSummary {
  active_requests: { count: number; opened_this_week: number };
  in_progress: { count: number; high_priority: number };
  awaiting_approval: { count: number; waiting_on_you: number };
  completed: { count: number; last_seven_days: number };
  status_breakdown: Array<{ status: RequestStatus; count: number }>;
  total: number;
  /** Open requests that need someone to act (max 4) */
  needs_attention: Array<{ request: RequestWithRelations; reason: string }>;
}

export interface SearchResult {
  type: EntityType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface HealthReport {
  ok: boolean;
  checks: {
    env: { supabase_url: boolean; service_role_key: boolean; anon_key: boolean };
    database: { ok: boolean; message: string };
    dev_user: { ok: boolean; email: string; message: string };
  };
}
