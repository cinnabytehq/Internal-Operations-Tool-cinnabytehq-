/**
 * Errors thrown by the service layer.
 *
 * API routes turn these into HTTP responses (see src/lib/http.ts), so a
 * service only has to say *what* went wrong, never *how* to respond.
 * Raw database errors are logged on the server and replaced by a
 * friendly message — they never reach the client.
 */
import { SupabaseConfigError } from '@/lib/supabase';

export type ServiceErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'NOT_CONFIGURED'
  | 'UNAVAILABLE'
  | 'INTERNAL';

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly fields?: Record<string, string>;

  constructor(code: ServiceErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.fields = fields;
  }
}

export function notFound(entity: string): ServiceError {
  return new ServiceError('NOT_FOUND', `${entity} not found.`);
}

/** Shape of errors returned by supabase-js / PostgREST. */
interface DatabaseError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Convert a Supabase/PostgREST error into a ServiceError with a message
 * that is safe to show to users. `context` names what we were doing, e.g.
 * "load requests".
 */
export function fromDatabaseError(error: DatabaseError, context: string): ServiceError {
  const code = error.code ?? '';
  const message = error.message ?? '';

  // Rows not found by .single() / invalid UUIDs in a filter
  if (code === 'PGRST116' || code === '22P02') return new ServiceError('NOT_FOUND', 'That record was not found.');
  // Foreign key violation: e.g. an assignee or project that doesn't exist
  if (code === '23503') {
    return new ServiceError('BAD_REQUEST', 'A referenced record (person, project or request) does not exist.');
  }
  if (code === '23505') return new ServiceError('CONFLICT', 'A record with those details already exists.');
  if (code === '23514' || code === '22001') {
    return new ServiceError('BAD_REQUEST', 'Some values are outside the allowed range or length.');
  }
  // Table or column missing: the migration hasn't been run
  if (code === '42P01' || code === 'PGRST205' || code === '42703' || code === 'PGRST204') {
    console.error(`[db] ${context}:`, error);
    return new ServiceError(
      'NOT_CONFIGURED',
      'The database schema is missing or out of date. Run supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor.',
    );
  }
  // Wrong key / RLS denial
  if (code === '42501' || code === 'PGRST301' || /JWT|apikey|Invalid API key/i.test(message)) {
    console.error(`[db] ${context}:`, error);
    return new ServiceError(
      'NOT_CONFIGURED',
      'Supabase rejected the server key. Check SUPABASE_SERVICE_ROLE_KEY in your .env file.',
    );
  }
  // Network failure reaching Supabase, or Supabase can't reach Postgres
  if (/^PGRST00[0-3]$/.test(code) || /fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(message)) {
    console.error(`[db] ${context}:`, error);
    return new ServiceError('UNAVAILABLE', "Can't reach the database right now. Check PUBLIC_SUPABASE_URL and your connection.");
  }

  console.error(`[db] ${context}:`, error);
  return new ServiceError('INTERNAL', `We couldn't ${context}. Please try again.`);
}

/** Normalise anything thrown inside a service into a ServiceError. */
export function toServiceError(error: unknown, context: string): ServiceError {
  if (error instanceof ServiceError) return error;
  if (error instanceof SupabaseConfigError) return new ServiceError('NOT_CONFIGURED', error.message);
  if (error && typeof error === 'object' && ('code' in error || 'message' in error)) {
    return fromDatabaseError(error as DatabaseError, context);
  }
  console.error(`[service] ${context}:`, error);
  return new ServiceError('INTERNAL', `We couldn't ${context}. Please try again.`);
}
