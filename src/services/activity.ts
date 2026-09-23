/**
 * Activity service — the workspace audit log.
 *
 * Phase 2 endpoints:
 *   GET /api/activity?entityType=&limit=          → getActivity()
 *   GET /api/projects/:id/activity                → getProjectActivity()
 *   GET /api/me/notifications                     → getNotifications()
 *
 * `recordActivity()` only exists for the mock layer: in Phase 2 the API
 * writes activity rows itself, in the same transaction as the change.
 */
import { clone, db, findUser, nextId, simulateLatency } from '@/data/store';
import { ENTITY_META } from '@/lib/meta';
import type { Activity, ActivityWithActor, EntityType } from '@/types';
import { currentUserId } from './users';

function entityExists(type: EntityType, id: string): boolean {
  if (type === 'request') return db.requests.some((request) => request.id === id);
  if (type === 'project') return db.projects.some((project) => project.id === id);
  return db.tasks.some((task) => task.id === id);
}

function entityHref(type: EntityType, id: string): string | null {
  if (!entityExists(type, id)) return null;
  if (type === 'task') {
    // Tasks don't have their own page; link to the row in the task list.
    return `${ENTITY_META.task.path}#${id}`;
  }
  return `${ENTITY_META[type].path}/${id}`;
}

/** Attach the actor and a link. Exported for the other mock services. */
export function withActor(event: Activity): ActivityWithActor {
  return {
    ...clone(event),
    actor: findUser(event.actorId),
    target: event.meta?.assigneeId ? findUser(event.meta.assigneeId) : null,
    href: entityHref(event.entityType, event.entityId),
  };
}

const newestFirst = (a: Activity, b: Activity) => b.createdAt.localeCompare(a.createdAt);

export async function getActivity(options: { limit?: number; entityType?: EntityType } = {}): Promise<ActivityWithActor[]> {
  // TODO(api): return api.get('/activity', { query: options });
  await simulateLatency();
  return db.activity
    .filter((event) => !options.entityType || event.entityType === options.entityType)
    .sort(newestFirst)
    .slice(0, options.limit ?? db.activity.length)
    .map(withActor);
}

/** Events for a project and for the tasks that belong to it. */
export async function getProjectActivity(projectId: string, limit = 8): Promise<ActivityWithActor[]> {
  // TODO(api): return api.get(`/projects/${projectId}/activity`, { query: { limit } });
  await simulateLatency();
  const taskIds = new Set(db.tasks.filter((task) => task.projectId === projectId).map((task) => task.id));
  return db.activity
    .filter(
      (event) =>
        (event.entityType === 'project' && event.entityId === projectId) ||
        (event.entityType === 'task' && taskIds.has(event.entityId)),
    )
    .sort(newestFirst)
    .slice(0, limit)
    .map(withActor);
}

/**
 * Things other people did that involve the signed-in user: their requests,
 * requests assigned to them or waiting on their approval, their tasks and
 * the projects they belong to.
 */
export async function getNotifications(limit = 8): Promise<ActivityWithActor[]> {
  // TODO(api): return api.get('/me/notifications', { query: { limit } });
  await simulateLatency();
  const me = currentUserId();

  const involvesMe = (event: Activity): boolean => {
    if (event.actorId === me) return false;
    if (event.meta?.assigneeId === me) return true;
    if (event.entityType === 'request') {
      const request = db.requests.find((candidate) => candidate.id === event.entityId);
      const approval = db.approvals.find((candidate) => candidate.requestId === event.entityId);
      return request?.requesterId === me || request?.assigneeId === me || approval?.approverId === me;
    }
    if (event.entityType === 'task') {
      return db.tasks.find((task) => task.id === event.entityId)?.assigneeId === me;
    }
    return db.projects.find((project) => project.id === event.entityId)?.memberIds.includes(me) ?? false;
  };

  return db.activity.filter(involvesMe).sort(newestFirst).slice(0, limit).map(withActor);
}

/** Mock-only: append an event to the log, attributed to the signed-in user. */
export function recordActivity(event: Omit<Activity, 'id' | 'createdAt' | 'actorId'>): Activity {
  const record: Activity = {
    ...event,
    id: nextId('activity'),
    actorId: currentUserId(),
    createdAt: new Date().toISOString(),
  };
  db.activity.unshift(record);
  return record;
}
