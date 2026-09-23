/**
 * Workspace search used by the command palette (⌘K).
 *
 * Phase 2 endpoint:
 *   GET /api/search?q= → searchWorkspace()
 * (PostgreSQL full-text search across requests, projects and tasks.)
 */
import { db, simulateLatency } from '@/data/store';
import { CATEGORY_META, PROJECT_STATUS_META, REQUEST_STATUS_META, TASK_STATUS_META } from '@/lib/meta';
import { matchesQuery } from '@/lib/utils';
import type { SearchResult } from '@/types';

const LIMIT_PER_TYPE = 5;

export async function searchWorkspace(query: string): Promise<SearchResult[]> {
  // TODO(api): return api.get('/search', { query: { q: query } });
  await simulateLatency();
  if (!query.trim()) return [];

  const requests: SearchResult[] = db.requests
    .filter((request) => matchesQuery(`${request.id} ${request.title} ${request.description}`, query))
    .slice(0, LIMIT_PER_TYPE)
    .map((request) => ({
      type: 'request',
      id: request.id,
      title: request.title,
      subtitle: `${request.id} · ${REQUEST_STATUS_META[request.status].label} · ${CATEGORY_META[request.category].label}`,
      href: `/requests/${request.id}`,
    }));

  const projects: SearchResult[] = db.projects
    .filter((project) => matchesQuery(`${project.id} ${project.name} ${project.description}`, query))
    .slice(0, LIMIT_PER_TYPE)
    .map((project) => ({
      type: 'project',
      id: project.id,
      title: project.name,
      subtitle: `${PROJECT_STATUS_META[project.status].label} · ${project.progress}% complete`,
      href: `/projects/${project.id}`,
    }));

  const tasks: SearchResult[] = db.tasks
    .filter((task) => matchesQuery(`${task.id} ${task.title} ${task.description ?? ''}`, query))
    .slice(0, LIMIT_PER_TYPE)
    .map((task) => ({
      type: 'task',
      id: task.id,
      title: task.title,
      subtitle: `${task.id} · ${TASK_STATUS_META[task.status].label}`,
      href: `/tasks#${task.id}`,
    }));

  return [...requests, ...projects, ...tasks];
}
