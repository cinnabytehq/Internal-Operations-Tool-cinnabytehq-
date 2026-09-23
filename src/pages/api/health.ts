import { handle, json } from '@/lib/http';
import { checkHealth } from '@/services/health';

/** GET /api/health — is Supabase configured, reachable and seeded? (200 when ready, 503 otherwise) */
export const GET = handle(async () => {
  const report = await checkHealth();
  return json({ data: report }, report.ok ? 200 : 503);
});
