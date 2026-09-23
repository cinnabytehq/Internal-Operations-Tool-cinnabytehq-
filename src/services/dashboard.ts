/**
 * Dashboard service — aggregates for the Overview page.
 *
 * Phase 2 endpoint:
 *   GET /api/dashboard/summary → getDashboardSummary()
 * (A single SQL query with COUNT(*) FILTER (WHERE …) clauses.)
 */
import { db, simulateLatency } from '@/data/store';
import { isWithinDays } from '@/lib/dates';
import { REQUEST_STATUSES } from '@/lib/meta';
import type { DashboardSummary } from '@/types';
import { currentUserId } from './users';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // TODO(api): return api.get('/dashboard/summary');
  await simulateLatency();
  const me = currentUserId();
  const requests = db.requests;
  const pendingApprovals = db.approvals.filter(
    (approval) => approval.status === 'pending' && requests.some((request) => request.id === approval.requestId),
  );

  const active = requests.filter((request) => request.status !== 'completed');
  const inProgress = requests.filter((request) => request.status === 'in_progress');
  const completed = requests.filter((request) => request.status === 'completed');

  return {
    activeRequests: {
      count: active.length,
      openedThisWeek: active.filter((request) => isWithinDays(request.createdAt, 7)).length,
    },
    inProgress: {
      count: inProgress.length,
      highPriority: inProgress.filter((request) => request.priority === 'high').length,
    },
    awaitingApproval: {
      count: pendingApprovals.length,
      waitingOnYou: pendingApprovals.filter((approval) => approval.approverId === me).length,
    },
    completed: {
      count: completed.length,
      lastSevenDays: completed.filter((request) => isWithinDays(request.updatedAt, 7)).length,
    },
    statusBreakdown: REQUEST_STATUSES.map((status) => ({
      status,
      count: requests.filter((request) => request.status === status).length,
    })),
    total: requests.length,
  };
}
