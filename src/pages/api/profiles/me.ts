import { handle, ok, requireUser } from '@/lib/http';

/** GET /api/profiles/me — the acting user (DEVELOPMENT ONLY: the DEV_USER_EMAIL profile) */
export const GET = handle(async (context) => ok(requireUser(context)));
