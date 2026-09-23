/**
 * ─────────────────────────────────────────────────────────────
 *  CinnabyteHQ API client — how the UI talks to the backend
 * ─────────────────────────────────────────────────────────────
 *
 * Every page, server island and browser script reads and writes data
 * through these functions, which call the REST API in src/pages/api.
 * The UI never imports the service layer or Supabase.
 *
 *   browser scripts  →  import { api } from '@/lib/api/browser'
 *   .astro pages     →  const api = serverApi(Astro)   ('@/lib/api/server')
 *
 * Errors arrive as `ApiError` with a friendly message (from the API's
 * `{ error: { message } }` envelope) and, for validation errors, per-field
 * messages in `fields`.
 */
import type {
  ActivityQuery,
  ActivityWithRelations,
  ApiErrorBody,
  ApprovalListMeta,
  ApprovalQuery,
  ApprovalWithRelations,
  CreateProjectInput,
  CreateRequestInput,
  CreateTaskInput,
  DashboardSummary,
  HealthReport,
  Profile,
  ProjectQuery,
  ProjectWithRelations,
  RequestListMeta,
  RequestQuery,
  RequestWithRelations,
  SearchResult,
  TaskListMeta,
  TaskQuery,
  TaskWithRelations,
  UpdateProfileInput,
  UpdateProjectInput,
  UpdateRequestInput,
  UpdateTaskInput,
} from '@/types';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

export interface ApiClientOptions {
  /** Absolute origin for server-side calls; empty in the browser */
  baseUrl?: string;
  /** Extra headers, e.g. forwarded cookies during SSR */
  headers?: Record<string, string>;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function toQueryString(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createApiClient(options: ApiClientOptions = {}) {
  const base = (options.baseUrl ?? '').replace(/\/$/, '');

  async function send<T, M = undefined>(method: string, path: string, body?: unknown, query?: Query) {
    let response: Response;
    try {
      response = await fetch(`${base}/api${path}${toQueryString(query)}`, {
        method,
        headers: {
          accept: 'application/json',
          // Always declared on writes: required by Astro's CSRF protection.
          ...(method !== 'GET' && { 'content-type': 'application/json' }),
          ...options.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, "Can't reach CinnabyteHQ. Check your connection and try again.", 'NETWORK');
    }

    if (response.status === 204) return { data: undefined as T, meta: undefined as M };

    const payload = (await response.json().catch(() => null)) as ({ data: T; meta: M } & Partial<ApiErrorBody>) | null;
    if (!response.ok || !payload || payload.error) {
      throw new ApiError(
        response.status,
        payload?.error?.message ?? `Something went wrong (${response.status}). Please try again.`,
        payload?.error?.code,
        payload?.error?.fields,
      );
    }
    return { data: payload.data, meta: payload.meta };
  }

  const get = async <T>(path: string, query?: Query) => (await send<T>('GET', path, undefined, query)).data;
  const list = <T, M>(path: string, query?: Query) => send<T, M>('GET', path, undefined, query) as Promise<{ data: T; meta: M }>;
  const write = async <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
    (await send<T>(method, path, body ?? (method === 'DELETE' ? undefined : {}))).data;

  return {
    /* Requests */
    getRequests: (query: RequestQuery = {}) => list<RequestWithRelations[], RequestListMeta>('/requests', { ...query }),
    getRequest: (id: string) => get<RequestWithRelations>(`/requests/${id}`),
    createRequest: (input: CreateRequestInput) => write<RequestWithRelations>('POST', '/requests', input),
    updateRequest: (id: string, input: UpdateRequestInput) => write<RequestWithRelations>('PATCH', `/requests/${id}`, input),
    deleteRequest: (id: string) => write<void>('DELETE', `/requests/${id}`),
    addComment: (id: string, comment: string) => write<{ request_id: string; comment: string }>('POST', `/requests/${id}/comments`, { comment }),

    /* Approvals */
    getApprovals: (query: ApprovalQuery = {}) => list<ApprovalWithRelations[], ApprovalListMeta>('/approvals', { ...query }),
    approve: (id: string, comment?: string) =>
      write<ApprovalWithRelations>('POST', `/approvals/${id}/approve`, comment ? { comment } : {}),
    reject: (id: string, comment: string) => write<ApprovalWithRelations>('POST', `/approvals/${id}/reject`, { comment }),

    /* Projects */
    getProjects: (query: ProjectQuery = {}) => get<ProjectWithRelations[]>('/projects', { ...query }),
    getProject: (id: string) => get<ProjectWithRelations>(`/projects/${id}`),
    createProject: (input: CreateProjectInput) => write<ProjectWithRelations>('POST', '/projects', input),
    updateProject: (id: string, input: UpdateProjectInput) => write<ProjectWithRelations>('PATCH', `/projects/${id}`, input),
    deleteProject: (id: string) => write<void>('DELETE', `/projects/${id}`),

    /* Tasks */
    getTasks: (query: TaskQuery = {}) => list<TaskWithRelations[], TaskListMeta>('/tasks', { ...query }),
    getTask: (id: string) => get<TaskWithRelations>(`/tasks/${id}`),
    createTask: (input: CreateTaskInput) => write<TaskWithRelations>('POST', '/tasks', input),
    updateTask: (id: string, input: UpdateTaskInput) => write<TaskWithRelations>('PATCH', `/tasks/${id}`, input),
    completeTask: (id: string) => write<TaskWithRelations>('PATCH', `/tasks/${id}`, { status: 'completed' }),
    deleteTask: (id: string) => write<void>('DELETE', `/tasks/${id}`),

    /* Activity */
    getActivity: (query: ActivityQuery = {}) => get<ActivityWithRelations[]>('/activity', { ...query }),
    getNotifications: () => get<ActivityWithRelations[]>('/notifications'),

    /* People */
    getProfiles: () => get<Profile[]>('/profiles'),
    getCurrentProfile: () => get<Profile>('/profiles/me'),
    updateProfile: (id: string, input: UpdateProfileInput) => write<Profile>('PATCH', `/profiles/${id}`, input),

    /* Overview, search, setup */
    getDashboard: () => get<DashboardSummary>('/dashboard'),
    search: (q: string) => get<SearchResult[]>('/search', { q }),
    getHealth: async (): Promise<HealthReport> => {
      // 503 is the "not ready yet" answer; its body still holds the report.
      const response = await fetch(`${base}/api/health`, { headers: options.headers });
      return ((await response.json()) as { data: HealthReport }).data;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
