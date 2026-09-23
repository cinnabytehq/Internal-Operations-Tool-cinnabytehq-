/**
 * Activity — the append-only history of the workspace.
 *
 *   GET /api/activity        → listActivity()
 *   GET /api/notifications   → listNotifications()
 *
 * Only the server writes activity (through `logActivity`, called by the
 * other services). There is deliberately no endpoint that lets a client
 * create arbitrary log entries.
 */
import type { ActivityAction, ActivityLog, ActivityMetadata, ActivityQuery, ActivityWithRelations, EntityType, Profile } from '@/types';
import { ENTITY_META, requestRef } from '@/lib/meta';
import { PROFILE_COLUMNS, db, unwrap } from './db';

const ACTIVITY_SELECT = `*, user:profiles(${PROFILE_COLUMNS}), request:requests(id, number, title, requester_id, assignee_id), project:projects(id, name, owner_id), task:tasks(id, title, assignee_id)`;

interface ActivityRow extends ActivityLog {
  user: Profile | null;
  request: { id: string; number: number; title: string; requester_id: string; assignee_id: string | null } | null;
  project: { id: string; name: string; owner_id: string } | null;
  task: { id: string; title: string; assignee_id: string | null } | null;
}

function toActivity(row: ActivityRow): ActivityWithRelations {
  const { request, project, task, ...log } = row;
  const entity: EntityType = log.metadata?.entity ?? (log.task_id ? 'task' : log.request_id ? 'request' : 'project');
  const fallbackTitle = log.metadata?.title ?? 'a deleted record';

  let entity_id: string | null = null;
  let entity_title = fallbackTitle;
  let entity_ref: string | null = null;
  let href: string | null = null;

  if (entity === 'request' && request) {
    entity_id = request.id;
    entity_title = request.title;
    entity_ref = requestRef(request.number);
    href = `${ENTITY_META.request.path}/${request.id}`;
  } else if (entity === 'project' && project) {
    entity_id = project.id;
    entity_title = project.name;
    href = `${ENTITY_META.project.path}/${project.id}`;
  } else if (entity === 'task' && task) {
    entity_id = task.id;
    entity_title = task.title;
    href = `${ENTITY_META.task.path}#task-${task.id}`;
  }

  return { ...log, metadata: log.metadata ?? {}, entity, entity_id, entity_title, entity_ref, href };
}

export async function listActivity(query: ActivityQuery = {}): Promise<ActivityWithRelations[]> {
  let request = db()
    .from('activity_logs')
    .select(ACTIVITY_SELECT)
    .order('created_at', { ascending: false })
    .limit(Math.min(query.limit ?? 100, 200));

  if (query.entity) request = request.eq('metadata->>entity', query.entity);
  if (query.request_id) request = request.eq('request_id', query.request_id);
  if (query.project_id) request = request.eq('project_id', query.project_id);
  if (query.task_id) request = request.eq('task_id', query.task_id);

  const rows = unwrap(await request, 'load activity') as ActivityRow[];
  return rows.map(toActivity);
}

/**
 * Things other people did that involve the given person: their requests,
 * requests assigned to them, their tasks and projects they own.
 * (Fine for a small workspace; a production version would query this in SQL.)
 */
export async function listNotifications(user: Profile, limit = 8): Promise<ActivityWithRelations[]> {
  const result = await db()
    .from('activity_logs')
    .select(ACTIVITY_SELECT)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = unwrap(result, 'load notifications') as ActivityRow[];

  return rows
    .filter(
      (row) =>
        row.metadata?.assignee_id === user.id ||
        row.request?.requester_id === user.id ||
        row.request?.assignee_id === user.id ||
        row.task?.assignee_id === user.id ||
        row.project?.owner_id === user.id,
    )
    .slice(0, limit)
    .map(toActivity);
}

export interface LogEntry {
  actor: Profile;
  action: ActivityAction;
  description: string;
  request_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  metadata: ActivityMetadata & { entity: EntityType; title: string };
  /** The entry *is* the data (e.g. a comment): fail loudly if it can't be saved */
  required?: boolean;
}

/**
 * Record an event. By default a failure is logged but doesn't fail the
 * change that triggered it — that change has already been saved.
 * (Supabase REST calls can't share a transaction; a production version
 * would move multi-step writes into a Postgres function.)
 */
export async function logActivity(entry: LogEntry): Promise<void> {
  const { error } = await db()
    .from('activity_logs')
    .insert({
      user_id: entry.actor.id,
      request_id: entry.request_id ?? null,
      project_id: entry.project_id ?? null,
      task_id: entry.task_id ?? null,
      action: entry.action,
      description: entry.description,
      metadata: entry.metadata,
    });
  if (error && entry.required) unwrap({ data: null, error }, 'save that');
  if (error) console.error('[activity] failed to record event:', error);
}
