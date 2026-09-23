import { handle, ok, requireUser } from '@/lib/http';
import { getDashboardSummary } from '@/services/dashboard';

/** GET /api/dashboard — KPI counts, status breakdown and requests needing attention */
export const GET = handle(async (context) => ok(await getDashboardSummary(requireUser(context))));
