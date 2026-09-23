import { handle, ok } from '@/lib/http';
import { listProfiles } from '@/services/profiles';

/** GET /api/profiles */
export const GET = handle(async () => ok(await listProfiles()));
