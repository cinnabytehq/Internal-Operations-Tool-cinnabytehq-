/**
 * ─────────────────────────────────────────────────────────────
 *  REST API client — Phase 2 (not used yet)
 * ─────────────────────────────────────────────────────────────
 *
 * When the backend exists, each service swaps its mock implementation for a
 * call through this client. For example, in services/requests.ts:
 *
 *   // Phase 1 (today)
 *   export async function getRequestById(id: string) {
 *     await simulateLatency();
 *     const request = db.requests.find((r) => r.id === id);
 *     return request ? withRelations(request) : null;
 *   }
 *
 *   // Phase 2
 *   export async function getRequestById(id: string) {
 *     return api.get<RequestWithRelations>(`/requests/${id}`).catch(nullIfNotFound);
 *   }
 *
 * Components and pages keep calling getRequestById() — nothing else changes.
 *
 * TODO(api): set API_BASE_URL in .env and start migrating services.
 * TODO(auth): forward the signed-in user's session token (see middleware.ts).
 */
import { API_BASE_URL as CONFIGURED_API_URL } from 'astro:env/server';
import { ServiceError, type ServiceErrorCode } from './errors';

const API_BASE_URL = CONFIGURED_API_URL ?? 'http://localhost:8080/api/v1';

const STATUS_TO_CODE: Record<number, ServiceErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BAD_REQUEST',
};

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  token?: string;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE_URL + path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
      ...(options.token && { Authorization: `Bearer ${options.token}` }),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ServiceError(
      STATUS_TO_CODE[response.status] ?? 'INTERNAL',
      payload?.message ?? `Request failed with status ${response.status}`,
    );
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};

/** Helper for "get by id" endpoints: turn a 404 into `null`. */
export function nullIfNotFound(error: unknown): null {
  if (error instanceof ServiceError && error.code === 'NOT_FOUND') return null;
  throw error;
}
