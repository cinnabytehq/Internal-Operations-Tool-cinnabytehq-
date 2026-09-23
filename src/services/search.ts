/**
 * Workspace search for the command palette (⌘K).
 *
 *   GET /api/search?q= → searchWorkspace()
 *
 * Simple case-insensitive matching (ILIKE). A larger workspace would use
 * PostgreSQL full-text search instead.
 */
import type { SearchResult } from '@/types';
import { PROJECT_STATUS_META, REQUEST_STATUS_META, TASK_STATUS_META, requestRef } from '@/lib/meta';
import { db, sanitizeSearch, unwrap } from './db';

const LIMIT = 5;

export async function searchWorkspace(query: string): Promise<SearchResult[]> {
  const q = sanitizeSearch(query);
  if (!q) return [];
  const like = `"%${q}%"`;
  const number = q.match(/^(?:req-?)?(\d{3,7})$/i)?.[1];

  const [requests, projects, tasks] = await Promise.all([
    db()
      .from('requests')
      .select('id, number, title, status')
      .or([`title.ilike.${like}`, `description.ilike.${like}`, number && `number.eq.${number}`].filter(Boolean).join(','))
      .order('updated_at', { ascending: false })
      .limit(LIMIT),
    db().from('projects').select('id, name, status, progress').or(`name.ilike.${like},description.ilike.${like}`).limit(LIMIT),
    db()
      .from('tasks')
      .select('id, title, status, project:projects(name)')
      .or(`title.ilike.${like},description.ilike.${like}`)
      .limit(LIMIT),
  ]);

  const requestRows = unwrap(requests, 'search requests') as Array<{ id: string; number: number; title: string; status: keyof typeof REQUEST_STATUS_META }>;
  const projectRows = unwrap(projects, 'search projects') as Array<{ id: string; name: string; status: keyof typeof PROJECT_STATUS_META; progress: number }>;
  const taskRows = unwrap(tasks, 'search tasks') as unknown as Array<{ id: string; title: string; status: keyof typeof TASK_STATUS_META; project: { name: string } | null }>;

  return [
    ...requestRows.map((row) => ({
      type: 'request' as const,
      id: row.id,
      title: row.title,
      subtitle: `${requestRef(row.number)} · ${REQUEST_STATUS_META[row.status].label}`,
      href: `/requests/${row.id}`,
    })),
    ...projectRows.map((row) => ({
      type: 'project' as const,
      id: row.id,
      title: row.name,
      subtitle: `${PROJECT_STATUS_META[row.status].label} · ${row.progress}% complete`,
      href: `/projects/${row.id}`,
    })),
    ...taskRows.map((row) => ({
      type: 'task' as const,
      id: row.id,
      title: row.title,
      subtitle: `${TASK_STATUS_META[row.status].label}${row.project ? ` · ${row.project.name}` : ''}`,
      href: `/tasks#task-${row.id}`,
    })),
  ];
}
