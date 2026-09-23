/**
 * Projects — work streams with owner-reported progress.
 *
 *   GET    /api/projects         → listProjects()
 *   POST   /api/projects         → createProject()
 *   GET    /api/projects/:id     → getProject()
 *   PATCH  /api/projects/:id     → updateProject()
 *   DELETE /api/projects/:id     → deleteProject()   (its tasks go too)
 */
import type {
  CreateProjectInput,
  Profile,
  Project,
  ProjectQuery,
  ProjectWithRelations,
  TaskStatus,
  UpdateProjectInput,
} from '@/types';
import { PROJECT_STATUS_META } from '@/lib/meta';
import { logActivity } from './activity';
import { PROFILE_COLUMNS, db, unwrap } from './db';
import { ServiceError, notFound } from './errors';

const PROJECT_SELECT = `*, owner:profiles!projects_owner_id_fkey(${PROFILE_COLUMNS}), tasks(status)`;

interface ProjectRow extends Project {
  owner: Profile;
  tasks: Array<{ status: TaskStatus }>;
}

function toProject(row: ProjectRow): ProjectWithRelations {
  const { tasks, ...project } = row;
  return {
    ...project,
    task_count: tasks?.length ?? 0,
    completed_task_count: tasks?.filter((task) => task.status === 'completed').length ?? 0,
  };
}

/** Active work first (most recently updated), finished projects last. */
function byActivity(a: Project, b: Project): number {
  const aDone = a.status === 'completed';
  const bDone = b.status === 'completed';
  if (aDone !== bDone) return aDone ? 1 : -1;
  return b.updated_at.localeCompare(a.updated_at);
}

export async function listProjects(query: ProjectQuery = {}): Promise<ProjectWithRelations[]> {
  let request = db().from('projects').select(PROJECT_SELECT);
  if (query.status) request = request.eq('status', query.status);
  if (query.active) request = request.neq('status', 'completed');
  const rows = unwrap(await request, 'load projects') as ProjectRow[];
  return rows.map(toProject).sort(byActivity);
}

export async function getProject(id: string): Promise<ProjectWithRelations> {
  const result = await db().from('projects').select(PROJECT_SELECT).eq('id', id).maybeSingle();
  const row = unwrap(result, 'load the project') as ProjectRow | null;
  if (!row) throw notFound('Project');
  return toProject(row);
}

export async function createProject(input: CreateProjectInput, actor: Profile): Promise<ProjectWithRelations> {
  const result = await db()
    .from('projects')
    .insert({
      name: input.name,
      description: input.description,
      owner_id: input.owner_id,
      status: input.status ?? 'planning',
      progress: input.progress ?? 0,
    })
    .select('id, name')
    .single();
  const created = unwrap(result, 'create the project') as Pick<Project, 'id' | 'name'>;
  await logActivity({
    actor,
    action: 'created',
    project_id: created.id,
    description: `created project "${created.name}"`,
    metadata: { entity: 'project', title: created.name },
  });
  return getProject(created.id);
}

export async function updateProject(id: string, input: UpdateProjectInput, actor: Profile): Promise<ProjectWithRelations> {
  const current = await getProject(id);
  const changes: Partial<Project> = {};
  for (const field of ['name', 'description', 'owner_id', 'status', 'progress'] as const) {
    if (input[field] !== undefined && input[field] !== current[field]) Object.assign(changes, { [field]: input[field] });
  }
  if (Object.keys(changes).length === 0) return current;

  unwrap(await db().from('projects').update(changes).eq('id', id), 'update the project');
  const name = changes.name ?? current.name;
  const base = { actor, project_id: id } as const;

  if (changes.status) {
    await logActivity({
      ...base,
      action: 'status_changed',
      description: `moved project "${name}" from ${PROJECT_STATUS_META[current.status].label} to ${PROJECT_STATUS_META[changes.status].label}`,
      metadata: { entity: 'project', title: name, from: current.status, to: changes.status },
    });
  }
  if (changes.progress !== undefined) {
    await logActivity({
      ...base,
      action: 'progress_updated',
      description: `updated progress on "${name}" from ${current.progress}% to ${changes.progress}%`,
      metadata: { entity: 'project', title: name, from: String(current.progress), to: String(changes.progress) },
    });
  }
  const edited = (['name', 'description', 'owner_id'] as const).filter((field) => field in changes);
  if (edited.length > 0) {
    await logActivity({
      ...base,
      action: 'updated',
      description: `updated ${edited.map((field) => (field === 'owner_id' ? 'owner' : field)).join(', ')} on project "${name}"`,
      metadata: { entity: 'project', title: name },
    });
  }
  return getProject(id);
}

export async function deleteProject(id: string, actor: Profile): Promise<void> {
  const current = await getProject(id);
  // TODO(auth): enforce with RLS once real users sign in.
  if (current.owner_id !== actor.id && actor.role !== 'admin') {
    throw new ServiceError('FORBIDDEN', 'Only the project owner or an admin can delete this project.');
  }
  unwrap(await db().from('projects').delete().eq('id', id), 'delete the project');
  await logActivity({
    actor,
    action: 'deleted',
    description: `deleted project "${current.name}" and its ${current.task_count} tasks`,
    metadata: { entity: 'project', title: current.name },
  });
}
