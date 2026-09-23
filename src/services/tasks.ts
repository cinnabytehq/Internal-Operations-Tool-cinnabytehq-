/**
 * Tasks — units of work inside a project.
 *
 *   GET    /api/tasks         → listTasks()
 *   POST   /api/tasks         → createTask()
 *   GET    /api/tasks/:id     → getTask()
 *   PATCH  /api/tasks/:id     → updateTask()   (status, assignee, …)
 *   DELETE /api/tasks/:id     → deleteTask()
 */
import type {
  CreateTaskInput,
  Profile,
  Task,
  TaskListMeta,
  TaskQuery,
  TaskView,
  TaskWithRelations,
  UpdateTaskInput,
} from '@/types';
import { TASK_STATUS_META, TASK_VIEWS } from '@/lib/meta';
import { logActivity } from './activity';
import { PROFILE_COLUMNS, db, sanitizeSearch, unwrap } from './db';
import { notFound } from './errors';

const TASK_SELECT = `*, project:projects(id, name, status), assignee:profiles!tasks_assignee_id_fkey(${PROFILE_COLUMNS})`;

/** Open work first (earliest due date first), finished work last (latest first). */
function byUrgency(a: Task, b: Task): number {
  const aDone = a.status === 'completed';
  const bDone = b.status === 'completed';
  if (aDone !== bDone) return aDone ? 1 : -1;
  if (aDone) return b.updated_at.localeCompare(a.updated_at);
  return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
}

export async function listTasks(query: TaskQuery, actor: Profile): Promise<{ tasks: TaskWithRelations[]; meta: TaskListMeta }> {
  let request = db().from('tasks').select(TASK_SELECT).limit(Math.min(query.limit ?? 300, 500));

  if (query.view === 'mine') request = request.eq('assignee_id', actor.id);
  if (query.view === 'completed') request = request.eq('status', 'completed');
  if (query.project_id) request = request.eq('project_id', query.project_id);
  if (query.assignee_id) request = request.eq('assignee_id', query.assignee_id);
  if (query.status) request = request.eq('status', query.status);
  if (query.priority) request = request.eq('priority', query.priority);
  const q = sanitizeSearch(query.q);
  if (q) request = request.or(`title.ilike."%${q}%",description.ilike."%${q}%"`);

  const head = { count: 'exact' as const, head: true };
  const [rows, ...counts] = await Promise.all([
    request,
    db().from('tasks').select('id', head),
    db().from('tasks').select('id', head).eq('assignee_id', actor.id),
    db().from('tasks').select('id', head).eq('status', 'completed'),
  ]);

  const tasks = (unwrap(rows, 'load tasks') as TaskWithRelations[]).sort(byUrgency);
  const values = counts.map((result) => {
    unwrap(result, 'count tasks');
    return result.count ?? 0;
  });
  return {
    tasks,
    meta: {
      total: tasks.length,
      counts: Object.fromEntries(TASK_VIEWS.map((view, index) => [view.id, values[index]])) as Record<TaskView, number>,
    },
  };
}

export async function getTask(id: string): Promise<TaskWithRelations> {
  const result = await db().from('tasks').select(TASK_SELECT).eq('id', id).maybeSingle();
  const task = unwrap(result, 'load the task') as TaskWithRelations | null;
  if (!task) throw notFound('Task');
  return task;
}

export async function createTask(input: CreateTaskInput, actor: Profile): Promise<TaskWithRelations> {
  const result = await db()
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description ?? null,
      project_id: input.project_id,
      assignee_id: input.assignee_id ?? null,
      priority: input.priority,
      status: input.status,
      due_date: input.due_date ?? null,
    })
    .select('id')
    .single();
  const { id } = unwrap(result, 'create the task') as { id: string };
  const task = await getTask(id);
  await logActivity({
    actor,
    action: 'created',
    task_id: id,
    project_id: task.project_id,
    description: `created task "${task.title}" in "${task.project.name}"`,
    metadata: { entity: 'task', title: task.title },
  });
  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput, actor: Profile): Promise<TaskWithRelations> {
  const current = await getTask(id);
  const changes: Partial<Task> = {};
  for (const field of ['title', 'description', 'project_id', 'assignee_id', 'priority', 'status', 'due_date'] as const) {
    if (input[field] !== undefined && input[field] !== current[field]) Object.assign(changes, { [field]: input[field] });
  }
  if (Object.keys(changes).length === 0) return current;

  unwrap(await db().from('tasks').update(changes).eq('id', id), 'update the task');
  const task = await getTask(id);
  const base = { actor, task_id: id, project_id: task.project_id } as const;

  if (changes.status) {
    const completed = changes.status === 'completed';
    await logActivity({
      ...base,
      action: completed ? 'completed' : 'status_changed',
      description: completed
        ? `completed task "${task.title}"`
        : `moved task "${task.title}" from ${TASK_STATUS_META[current.status].label} to ${TASK_STATUS_META[changes.status].label}`,
      metadata: { entity: 'task', title: task.title, from: current.status, to: changes.status },
    });
  }
  if (changes.assignee_id !== undefined) {
    await logActivity({
      ...base,
      action: 'assigned',
      description: task.assignee ? `assigned task "${task.title}" to ${task.assignee.full_name}` : `unassigned task "${task.title}"`,
      metadata: {
        entity: 'task',
        title: task.title,
        ...(task.assignee && { assignee_id: task.assignee.id, assignee_name: task.assignee.full_name }),
      },
    });
  }
  const edited = (['title', 'description', 'project_id', 'priority', 'due_date'] as const).filter((field) => field in changes);
  if (edited.length > 0) {
    await logActivity({
      ...base,
      action: 'updated',
      description: `updated ${edited.map((field) => field.replace('_id', '').replace('_', ' ')).join(', ')} on task "${task.title}"`,
      metadata: { entity: 'task', title: task.title },
    });
  }
  return task;
}

export async function deleteTask(id: string, actor: Profile): Promise<void> {
  const current = await getTask(id);
  unwrap(await db().from('tasks').delete().eq('id', id), 'delete the task');
  await logActivity({
    actor,
    action: 'deleted',
    project_id: current.project_id,
    description: `deleted task "${current.title}"`,
    metadata: { entity: 'task', title: current.title },
  });
}
