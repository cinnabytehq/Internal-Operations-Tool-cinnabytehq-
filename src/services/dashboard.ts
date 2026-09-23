/**
 * Dashboard — the numbers on the Overview page, computed from real rows.
 *
 *   GET /api/dashboard → getDashboardSummary()
 *
 * For a small workspace it's simplest to fetch the few columns needed and
 * count in TypeScript. At scale this would become a SQL view or function.
 */
import type { DashboardSummary, Profile, RequestStatus, RequestWithRelations } from '@/types';
import { REQUEST_STATUSES } from '@/lib/meta';
import { db, unwrap } from './db';
import { listOpenRequests } from './requests';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface RequestStat {
  id: string;
  status: RequestStatus;
  priority: string;
  created_at: string;
  updated_at: string;
}

/** Why an open request needs attention (first matching reason wins). */
function attentionReason(request: RequestWithRelations): string | null {
  if (request.approval?.status === 'pending') return `Awaiting ${request.approval.approver.full_name.split(' ')[0]}`;
  if (!request.assignee) return 'Unassigned';
  if (request.priority === 'high') return 'High priority';
  if (request.status === 'new') return 'Needs triage';
  return null;
}

export async function getDashboardSummary(actor: Profile): Promise<DashboardSummary> {
  const [statsResult, pendingResult, open] = await Promise.all([
    db().from('requests').select('id, status, priority, created_at, updated_at'),
    db().from('approvals').select('id, approver_id').eq('status', 'pending'),
    listOpenRequests(30),
  ]);
  const stats = unwrap(statsResult, 'load dashboard metrics') as RequestStat[];
  const pending = unwrap(pendingResult, 'load pending approvals') as Array<{ id: string; approver_id: string }>;

  const weekAgo = Date.now() - WEEK_MS;
  const inLastWeek = (iso: string) => Date.parse(iso) >= weekAgo;
  const withStatus = (...statuses: RequestStatus[]) => stats.filter((row) => statuses.includes(row.status));

  const active = withStatus('new', 'in_review', 'in_progress');
  const inProgress = withStatus('in_progress');
  const completed = withStatus('completed');

  return {
    active_requests: { count: active.length, opened_this_week: active.filter((row) => inLastWeek(row.created_at)).length },
    in_progress: { count: inProgress.length, high_priority: inProgress.filter((row) => row.priority === 'high').length },
    awaiting_approval: { count: pending.length, waiting_on_you: pending.filter((row) => row.approver_id === actor.id).length },
    completed: { count: completed.length, last_seven_days: completed.filter((row) => inLastWeek(row.updated_at)).length },
    status_breakdown: REQUEST_STATUSES.map((status) => ({ status, count: withStatus(status).length })),
    total: stats.length,
    needs_attention: open
      .map((request) => ({ request, reason: attentionReason(request) }))
      .filter((item): item is { request: RequestWithRelations; reason: string } => item.reason !== null)
      .slice(0, 4),
  };
}
