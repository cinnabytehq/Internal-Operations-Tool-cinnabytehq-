/**
 * Small helpers shared by every service. Services are the only modules
 * that query Supabase; API routes call services, and the UI calls the API.
 */
import { getSupabase } from '@/lib/supabase';
import { fromDatabaseError } from './errors';

export const db = getSupabase;

/** Columns returned whenever a profile is embedded in another record. */
export const PROFILE_COLUMNS = 'id, full_name, email, avatar_url, role, job_title, team, created_at';

interface QueryResult<T> {
  data: T | null;
  error: { code?: string; message?: string } | null;
}

/**
 * Return the data from a Supabase query, or throw a friendly ServiceError.
 * `context` describes the operation for error messages ("load requests").
 */
export function unwrap<T>(result: QueryResult<T>, context: string): T {
  if (result.error) throw fromDatabaseError(result.error, context);
  return result.data as T;
}

/**
 * Make free text safe to use inside a PostgREST `or=(…)` filter: drop the
 * characters that have meaning there (commas, parentheses, quotes) and the
 * LIKE wildcards, then collapse whitespace.
 */
export function sanitizeSearch(query: string | undefined): string {
  return (query ?? '')
    .replace(/[%_*,()"'\\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
