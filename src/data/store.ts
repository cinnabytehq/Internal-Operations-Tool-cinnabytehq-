/**
 * ─────────────────────────────────────────────────────────────
 *  In-memory mock database
 * ─────────────────────────────────────────────────────────────
 *
 * This is the ONLY place that holds application state in Phase 1.
 * Services (src/services) read and write these arrays exactly as a
 * REST API would read and write PostgreSQL tables.
 *
 * - Seeded from the mock files in this folder when the server starts.
 * - Changes (new requests, completed tasks…) live until the server restarts.
 * - Kept on `globalThis` so hot-reloads in `astro dev` don't wipe it.
 *
 * TODO(api): delete this file (and the mock*.ts files) once every service
 * calls the REST API. Nothing in src/components or src/pages imports it.
 */
import { MOCK_LATENCY } from 'astro:env/server';
import type { Activity, Approval, Project, Request, Task, User } from '@/types';
import { mockActivity } from './mockActivity';
import { mockProjects } from './mockProjects';
import { mockApprovals, mockRequests } from './mockRequests';
import { mockTasks } from './mockTasks';
import { mockUsers } from './mockUsers';

export interface MockDatabase {
  users: User[];
  requests: Request[];
  approvals: Approval[];
  projects: Project[];
  tasks: Task[];
  activity: Activity[];
  /** Next sequence numbers, like PostgreSQL serial columns */
  sequences: { request: number; activity: number; approval: number };
}

function seed(): MockDatabase {
  const db: MockDatabase = {
    users: structuredClone(mockUsers),
    requests: structuredClone(mockRequests),
    approvals: structuredClone(mockApprovals),
    projects: structuredClone(mockProjects),
    tasks: structuredClone(mockTasks),
    activity: structuredClone(mockActivity),
    sequences: { request: 1043, activity: mockActivity.length + 1, approval: mockApprovals.length + 1 },
  };

  // Keep `updatedAt` consistent with the most recent event in each timeline.
  for (const request of db.requests) {
    const latest = db.activity
      .filter((event) => event.entityType === 'request' && event.entityId === request.id)
      .reduce((max, event) => (event.createdAt > max ? event.createdAt : max), request.updatedAt);
    request.updatedAt = latest;
  }

  return db;
}

const globalStore = globalThis as typeof globalThis & { __cinnabyteMockDb?: MockDatabase };

export const db: MockDatabase = (globalStore.__cinnabyteMockDb ??= seed());

/* ───────────────────── Simulated network ─────────────────────
 * Every service call waits a little, like a real HTTP round trip, so
 * loading states (skeletons, button spinners) are exercised during
 * development. Set MOCK_LATENCY=off to disable.
 */

const LATENCY_MS = { read: [60, 160], write: [320, 620] } as const;

const latencyEnabled = MOCK_LATENCY !== 'off';

export function simulateLatency(kind: keyof typeof LATENCY_MS = 'read'): Promise<void> {
  if (!latencyEnabled) return Promise.resolve();
  const [min, max] = LATENCY_MS[kind];
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Next id for a table, e.g. nextId('activity') → "act_026" */
export function nextId(table: keyof MockDatabase['sequences']): string {
  const value = db.sequences[table]++;
  if (table === 'request') return `REQ-${value}`;
  if (table === 'approval') return `apr_${String(value).padStart(2, '0')}`;
  return `act_${String(value).padStart(3, '0')}`;
}

/** Records are copied on the way out so callers can't mutate the "database". */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Look up a user row, falling back to a placeholder for removed members. */
export function findUser(id: string): User {
  const user = db.users.find((candidate) => candidate.id === id);
  if (user) return clone(user);
  return {
    id,
    name: 'Former member',
    email: '',
    title: '',
    team: 'Operations',
    role: 'member',
    avatarColor: 'slate',
  };
}
