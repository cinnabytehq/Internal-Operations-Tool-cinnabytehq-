/**
 * Helpers for the REST API routes in src/pages/api.
 *
 * Every response uses one of two shapes:
 *   success  { "data": …, "meta"?: … }
 *   error    { "error": { "message": "…", "code"?: "…", "fields"?: { … } } }
 *
 * Routes stay tiny: validate input → call a service → return JSON.
 * Anything thrown is converted to the right status code here, and raw
 * database errors never reach the client.
 */
import type { APIContext, APIRoute } from 'astro';
import type { z } from 'astro/zod';
import type { ApiErrorBody, Profile } from '@/types';
import { ServiceError, toServiceError, type ServiceErrorCode } from '@/services/errors';
import { isUuid } from '@/services/db';

const STATUS_BY_CODE: Record<ServiceErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
  NOT_CONFIGURED: 503,
  UNAVAILABLE: 503,
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const ok = <T>(data: T, meta?: unknown) => json(meta === undefined ? { data } : { data, meta });
export const created = <T>(data: T) => json({ data }, 201);
export const noContent = () => new Response(null, { status: 204 });

export function errorResponse(error: unknown, context = 'complete that request'): Response {
  const serviceError = toServiceError(error, context);
  const body: ApiErrorBody = {
    error: {
      message: serviceError.message,
      code: serviceError.code,
      ...(serviceError.fields && { fields: serviceError.fields }),
    },
  };
  return json(body, STATUS_BY_CODE[serviceError.code]);
}

/** Wrap a route handler so every thrown error becomes a JSON error response. */
export function handle(handler: (context: APIContext) => Promise<Response>): APIRoute {
  return async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * The profile acting on this request.
 * DEVELOPMENT ONLY: resolved from DEV_USER_EMAIL in middleware.
 * TODO(auth): the signed-in Supabase Auth user.
 */
export function requireUser(context: APIContext): Profile {
  const { user, setupMessage } = context.locals;
  if (!user) {
    throw new ServiceError('NOT_CONFIGURED', setupMessage ?? 'CinnabyteHQ is not set up yet. Open /setup for instructions.');
  }
  return user;
}

/** A UUID route parameter; anything else is simply "not found". */
export function idParam(context: APIContext, entity: string): string {
  const id = context.params.id ?? '';
  if (!isUuid(id)) throw new ServiceError('NOT_FOUND', `${entity} not found.`);
  return id;
}

/**
 * Parse and validate a JSON body. Unknown fields, wrong types and missing
 * required fields become a 400 with per-field messages.
 */
export async function readBody<T extends z.ZodType>(
  request: Request,
  schema: T,
  options: { optional?: boolean } = {},
): Promise<z.infer<T>> {
  const text = await request.text();
  let raw: unknown = {};
  if (text.trim()) {
    if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
      throw new ServiceError('BAD_REQUEST', 'Send the body as JSON with the header Content-Type: application/json.');
    }
    try {
      raw = JSON.parse(text);
    } catch {
      throw new ServiceError('BAD_REQUEST', 'The request body is not valid JSON.');
    }
  } else if (!options.optional) {
    throw new ServiceError('BAD_REQUEST', 'A JSON request body is required.');
  }
  return validate(schema, raw);
}

export function validate<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : 'body';
    fields[key] ??= issue.message;
  }
  const summary = Object.keys(fields).length === 1 ? Object.values(fields)[0] : 'Some fields are missing or invalid.';
  throw new ServiceError('BAD_REQUEST', summary, fields);
}

/** Read search params into a plain object for query validation. */
export function queryParams(url: URL): Record<string, string> {
  return Object.fromEntries([...url.searchParams].filter(([, value]) => value !== ''));
}
