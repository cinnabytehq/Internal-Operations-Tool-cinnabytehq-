/**
 * Projects service.
 *
 * Phase 2 endpoints:
 *   GET /api/projects        → getProjects()
 *   GET /api/projects/:id    → getProjectById()
 */
import { clone, db, findUser, simulateLatency } from '@/data/store';
import type { Project, ProjectWithRelations } from '@/types';

function withRelations(project: Project): ProjectWithRelations {
  const tasks = db.tasks.filter((task) => task.projectId === project.id);
  return {
    ...clone(project),
    owner: findUser(project.ownerId),
    members: project.memberIds.map(findUser),
    taskCount: tasks.length,
    completedTaskCount: tasks.filter((task) => task.status === 'done').length,
  };
}

/** Active projects first (closest deadline first), completed last. */
function byPriority(a: Project, b: Project): number {
  const aDone = a.status === 'completed';
  const bDone = b.status === 'completed';
  if (aDone !== bDone) return aDone ? 1 : -1;
  return a.dueDate.localeCompare(b.dueDate);
}

export async function getProjects(options: { activeOnly?: boolean } = {}): Promise<ProjectWithRelations[]> {
  // TODO(api): return api.get('/projects', { query: { active: options.activeOnly } });
  await simulateLatency();
  return [...db.projects]
    .filter((project) => !options.activeOnly || project.status !== 'completed')
    .sort(byPriority)
    .map(withRelations);
}

export async function getProjectById(id: string): Promise<ProjectWithRelations | null> {
  // TODO(api): return api.get(`/projects/${id}`).catch(nullIfNotFound);
  await simulateLatency();
  const project = db.projects.find((candidate) => candidate.id === id);
  return project ? withRelations(project) : null;
}
