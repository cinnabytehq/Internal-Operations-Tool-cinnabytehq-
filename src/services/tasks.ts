/**
 * Tasks service.
 *
 * Phase 2 endpoints:
 *   GET   /api/tasks?view=&projectId=&requestId=&q=   → getTasks()
 *   GET   /api/tasks/counts                           → getTaskCounts()
 *   PATCH /api/tasks/:id                              → updateTaskStatus()
 */
import { clone, db, findUser, simulateLatency } from '@/data/store';
import { TASK_VIEWS } from '@/lib/meta';
import { matchesQuery } from '@/lib/utils';
import type { Task, TaskFilters, TaskStatus, TaskView, TaskWithRelations } from '@/types';
import { recordActivity } from './activity';
import { notFound } from './errors';
import { currentUserId } from './users';

function withRelations(task: Task): TaskWithRelations {
  const project = task.projectId ? db.projects.find((candidate) => candidate.id === task.projectId) : undefined;
  const request = task.requestId ? db.requests.find((candidate) => candidate.id === task.requestId) : undefined;
  return {
    ...clone(task),
    assignee: findUser(task.assigneeId),
    project: project ? { id: project.id, name: project.name } : null,
    request: request ? { id: request.id, title: request.title } : null,
  };
}

function matchesView(task: Task, view: TaskView, me: string): boolean {
  if (view === 'mine') return task.assigneeId === me;
  if (view === 'completed') return task.status === 'done';
  return true;
}

/** Text the list search matches against. */
export function taskSearchText(task: TaskWithRelations): string {
  return [task.id, task.title, task.description, task.project?.name, task.assignee.name].join(' ');
}

/** Open work first (earliest due date first), then finished work (latest first). */
function byUrgency(a: Task, b: Task): number {
  const aDone = a.status === 'done';
  const bDone = b.status === 'done';
  if (aDone !== bDone) return aDone ? 1 : -1;
  if (aDone) return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
  return a.dueDate.localeCompare(b.dueDate);
}

export async function getTasks(filters: TaskFilters = {}): Promise<TaskWithRelations[]> {
  // TODO(api): return api.get('/tasks', { query: filters });
  await simulateLatency();
  const me = currentUserId();
  return db.tasks
    .filter((task) => matchesView(task, filters.view ?? 'all', me))
    .filter((task) => !filters.projectId || task.projectId === filters.projectId)
    .filter((task) => !filters.requestId || task.requestId === filters.requestId)
    .filter((task) => !filters.assigneeId || task.assigneeId === filters.assigneeId)
    .sort(byUrgency)
    .map(withRelations)
    .filter((task) => matchesQuery(taskSearchText(task), filters.search ?? ''));
}

export async function getTaskCounts(): Promise<Record<TaskView, number>> {
  // TODO(api): return api.get('/tasks/counts');
  await simulateLatency();
  const me = currentUserId();
  return Object.fromEntries(
    TASK_VIEWS.map(({ id }) => [id, db.tasks.filter((task) => matchesView(task, id, me)).length]),
  ) as Record<TaskView, number>;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<TaskWithRelations> {
  // TODO(api): return api.patch(`/tasks/${id}`, { status });
  await simulateLatency('write');
  const task = db.tasks.find((candidate) => candidate.id === id);
  if (!task) throw notFound('Task', id);

  if (task.status !== status) {
    const ref = { entityType: 'task' as const, entityId: id, entityTitle: task.title };
    if (status === 'done') {
      recordActivity({ ...ref, type: 'completed' });
    } else {
      recordActivity({ ...ref, type: 'status_changed', meta: { from: task.status, to: status } });
    }
    task.status = status;
    task.completedAt = status === 'done' ? new Date().toISOString() : undefined;
  }
  return withRelations(task);
}
