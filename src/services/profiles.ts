/**
 * Profiles — the people in the workspace.
 *
 *   GET   /api/profiles        → listProfiles()
 *   PATCH /api/profiles/:id    → updateProfile()
 */
import { DEV_USER_EMAIL } from 'astro:env/server';
import type { Profile, UpdateProfileInput } from '@/types';
import { PROFILE_COLUMNS, db, unwrap } from './db';
import { ServiceError, notFound } from './errors';

export async function listProfiles(): Promise<Profile[]> {
  const result = await db().from('profiles').select(PROFILE_COLUMNS).order('full_name');
  return unwrap(result, 'load people') as Profile[];
}

export async function getProfile(id: string): Promise<Profile> {
  const result = await db().from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle();
  const profile = unwrap(result, 'load that person') as Profile | null;
  if (!profile) throw notFound('Person');
  return profile;
}

export async function updateProfile(id: string, input: UpdateProfileInput, actor: Profile): Promise<Profile> {
  // TODO(auth): admins may edit anyone; everyone else only themselves.
  if (actor.id !== id && actor.role !== 'admin') {
    throw new ServiceError('FORBIDDEN', 'You can only edit your own profile.');
  }
  const result = await db().from('profiles').update(input).eq('id', id).select(PROFILE_COLUMNS).maybeSingle();
  const profile = unwrap(result, 'update the profile') as Profile | null;
  if (!profile) throw notFound('Person');
  invalidateDevUser();
  return profile;
}

/* ──────────────────────────────────────────────────────────────
 *  DEVELOPMENT-ONLY "signed-in user"
 *
 *  There is no authentication yet. Every request acts as the profile whose
 *  email is DEV_USER_EMAIL (default: Alex Johnson). This is NOT security —
 *  anyone who can reach the server acts as that person.
 *
 *  TODO(auth): replace with Supabase Auth — read the session in
 *  src/middleware.ts and load the profile for auth.uid().
 * ────────────────────────────────────────────────────────────── */

const DEV_USER_TTL_MS = 30_000;
let devUserCache: { profile: Profile; expires: number } | null = null;

export function devUserEmail(): string {
  return (DEV_USER_EMAIL ?? 'alex.johnson@cinnabyte.io').trim().toLowerCase();
}

export async function getDevUser(): Promise<Profile> {
  if (devUserCache && devUserCache.expires > Date.now()) return devUserCache.profile;
  const email = devUserEmail();
  const result = await db().from('profiles').select(PROFILE_COLUMNS).ilike('email', email).maybeSingle();
  const profile = unwrap(result, 'load the development user') as Profile | null;
  if (!profile) {
    throw new ServiceError(
      'NOT_CONFIGURED',
      `No profile with the email ${email} exists yet. Run supabase/seed.sql, or set DEV_USER_EMAIL to an existing profile.`,
    );
  }
  devUserCache = { profile, expires: Date.now() + DEV_USER_TTL_MS };
  return profile;
}

function invalidateDevUser(): void {
  devUserCache = null;
}
