/**
 * Setup checks behind GET /api/health and the /setup screen: is Supabase
 * configured, reachable, migrated and seeded?
 */
import type { HealthReport } from '@/types';
import { getSupabaseConfigStatus } from '@/lib/supabase';
import { db } from './db';
import { toServiceError } from './errors';
import { devUserEmail, getDevUser } from './profiles';

export async function checkHealth(): Promise<HealthReport> {
  const config = getSupabaseConfigStatus();
  const email = devUserEmail();
  const report: HealthReport = {
    ok: false,
    checks: {
      env: { supabase_url: config.supabaseUrl, service_role_key: config.serviceRoleKey, anon_key: config.anonKey },
      database: { ok: false, message: 'Waiting for environment variables.' },
      dev_user: { ok: false, email, message: 'Waiting for the database.' },
    },
  };
  if (!config.configured) {
    report.checks.database.message = `Missing ${config.missing.join(' and ')}.`;
    return report;
  }

  // A GET (not HEAD) so that errors come back with details.
  const probe = await db().from('profiles').select('id', { count: 'exact' }).limit(1);
  if (probe.error) {
    report.checks.database.message = toServiceError(probe.error, 'reach the database').message;
    return report;
  }
  report.checks.database = { ok: true, message: `Connected · ${probe.count ?? 0} profiles` };

  try {
    const user = await getDevUser();
    report.checks.dev_user = { ok: true, email, message: `Signed in as ${user.full_name} (development mode)` };
  } catch (error) {
    report.checks.dev_user.message = toServiceError(error, 'load the development user').message;
  }

  report.ok = report.checks.database.ok && report.checks.dev_user.ok;
  return report;
}
