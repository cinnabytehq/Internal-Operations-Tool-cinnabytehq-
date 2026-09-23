import { handle, ok, requireUser } from '@/lib/http';
import { listNotifications } from '@/services/activity';

/** GET /api/notifications — recent activity by others that involves the current user */
export const GET = handle(async (context) => ok(await listNotifications(requireUser(context))));
