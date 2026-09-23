/**
 * ─────────────────────────────────────────────────────────────
 *  Supabase — the one place the app connects to the database
 * ─────────────────────────────────────────────────────────────
 *
 * SERVER ONLY. This module reads the service-role key from
 * `astro:env/server`, which Astro refuses to bundle into browser code, so
 * the key can never reach the client. Only files in src/services import it.
 *
 * The service-role key bypasses Row Level Security, which is why every
 * authorization decision is made in the service layer for now.
 * TODO(auth): with Supabase Auth, add a per-request client created with the
 * user's session (via @supabase/ssr) and RLS policies — see
 * docs/BACKEND_INTEGRATION.md.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

export interface SupabaseConfigStatus {
  configured: boolean;
  supabaseUrl: boolean;
  serviceRoleKey: boolean;
  anonKey: boolean;
  /** Names of the variables that still need a value */
  missing: string[];
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const supabaseUrl = Boolean(PUBLIC_SUPABASE_URL?.trim());
  const serviceRoleKey = Boolean(SUPABASE_SERVICE_ROLE_KEY?.trim());
  const missing = [
    !supabaseUrl && 'PUBLIC_SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter((name): name is string => Boolean(name));
  return {
    configured: missing.length === 0,
    supabaseUrl,
    serviceRoleKey,
    anonKey: Boolean(PUBLIC_SUPABASE_ANON_KEY?.trim()),
    missing,
  };
}

export class SupabaseConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `Supabase is not configured. Add ${missing.join(' and ')} to your .env file ` +
        '(Supabase dashboard → Project Settings → API), then restart the server.',
    );
    this.name = 'SupabaseConfigError';
  }
}

let client: SupabaseClient | null = null;

/** The shared server-side Supabase client (created on first use). */
export function getSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabase() must only run on the server.');
  }
  const status = getSupabaseConfigStatus();
  if (!status.configured) throw new SupabaseConfigError(status.missing);

  client ??= createClient(PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-application-name': 'cinnabytehq' } },
  });
  return client;
}
