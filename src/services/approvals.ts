/**
 * Approvals — sign-off decisions on requests.
 *
 *   GET  /api/approvals               → listApprovals()
 *   POST /api/approvals/:id/approve   → approve()
 *   POST /api/approvals/:id/reject    → reject()
 *
 * Deciding updates the approval, moves the request forward (approved →
 * In progress, rejected → Rejected) and records the decision in the log.
 */
import type {
  ApprovalDecisionInput,
  ApprovalListMeta,
  ApprovalQuery,
  ApprovalStatus,
  ApprovalWithRelations,
  Profile,
  RequestCategory,
} from '@/types';
import { APPROVAL_STATUSES, requestRef } from '@/lib/meta';
import { logActivity } from './activity';
import { PROFILE_COLUMNS, db, unwrap } from './db';
import { ServiceError, notFound } from './errors';

const APPROVAL_SELECT = `*, approver:profiles!approvals_approver_id_fkey(${PROFILE_COLUMNS}), request:requests(id, number, title, category, priority, status, created_at, requester:profiles!requests_requester_id_fkey(${PROFILE_COLUMNS}))`;

export async function listApprovals(
  query: ApprovalQuery = {},
): Promise<{ approvals: ApprovalWithRelations[]; meta: ApprovalListMeta }> {
  let request = db().from('approvals').select(APPROVAL_SELECT).order('created_at', { ascending: false }).limit(200);
  if (query.status) request = request.eq('status', query.status);
  if (query.request_id) request = request.eq('request_id', query.request_id);

  const [rows, ...counts] = await Promise.all([
    request,
    ...APPROVAL_STATUSES.map((status) =>
      db().from('approvals').select('id', { count: 'exact', head: true }).eq('status', status),
    ),
  ]);

  const approvals = unwrap(rows, 'load approvals') as ApprovalWithRelations[];
  const meta: ApprovalListMeta = {
    counts: Object.fromEntries(
      APPROVAL_STATUSES.map((status, index) => {
        unwrap(counts[index], 'count approvals');
        return [status, counts[index].count ?? 0];
      }),
    ) as Record<ApprovalStatus, number>,
  };
  return { approvals, meta };
}

export async function getApproval(id: string): Promise<ApprovalWithRelations> {
  const result = await db().from('approvals').select(APPROVAL_SELECT).eq('id', id).maybeSingle();
  const approval = unwrap(result, 'load the approval') as ApprovalWithRelations | null;
  if (!approval) throw notFound('Approval');
  return approval;
}

/**
 * Who signs off a request: Operations for facilities, Finance for spend.
 * Never the requester themselves — then any other admin decides.
 */
export async function pickApprover(category: RequestCategory, requesterId: string): Promise<string> {
  const team = category === 'facilities' ? 'Operations' : 'Finance';
  const result = await db()
    .from('profiles')
    .select('id, team, role')
    .in('role', ['admin', 'manager'])
    .neq('id', requesterId)
    .order('created_at');
  const candidates = unwrap(result, 'find an approver') as Array<{ id: string; team: string | null; role: string }>;
  const approver =
    candidates.find((person) => person.team === team) ?? candidates.find((person) => person.role === 'admin') ?? candidates[0];
  if (!approver) throw new ServiceError('CONFLICT', 'There is nobody available to approve this request.');
  return approver.id;
}

export async function createApproval(requestId: string, approverId: string): Promise<void> {
  unwrap(
    await db().from('approvals').insert({ request_id: requestId, approver_id: approverId, status: 'pending' }),
    'request an approval',
  );
}

async function decide(
  id: string,
  decision: 'approved' | 'rejected',
  input: ApprovalDecisionInput,
  actor: Profile,
): Promise<ApprovalWithRelations> {
  const approval = await getApproval(id);
  if (approval.status !== 'pending') {
    throw new ServiceError('CONFLICT', `This approval was already ${approval.status}.`);
  }
  // TODO(auth): enforce with RLS once real users sign in.
  if (approval.approver_id !== actor.id && actor.role !== 'admin') {
    throw new ServiceError('FORBIDDEN', `Only ${approval.approver.full_name} or an admin can decide this approval.`);
  }

  // Only update if it is still pending (protects against double clicks).
  const updated = await db()
    .from('approvals')
    .update({ status: decision, approved_at: new Date().toISOString(), comment: input.comment?.trim() || null })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id');
  if ((unwrap(updated, 'save the decision') as unknown[]).length === 0) {
    throw new ServiceError('CONFLICT', 'This approval was just decided by someone else.');
  }

  const { request } = approval;
  const nextStatus = decision === 'approved' ? 'in_progress' : 'rejected';
  if (request.status === 'in_review' || request.status === 'new') {
    unwrap(await db().from('requests').update({ status: nextStatus }).eq('id', request.id), 'update the request');
  }

  const ref = requestRef(request.number);
  await logActivity({
    actor,
    action: decision,
    request_id: request.id,
    description: `${decision === 'approved' ? 'approved' : 'rejected'} ${ref}`,
    metadata: {
      entity: 'request',
      title: request.title,
      from: request.status,
      to: nextStatus,
      ...(input.comment?.trim() && { comment: input.comment.trim() }),
    },
  });

  return getApproval(id);
}

export function approve(id: string, input: ApprovalDecisionInput, actor: Profile) {
  return decide(id, 'approved', input, actor);
}

export function reject(id: string, input: ApprovalDecisionInput, actor: Profile) {
  return decide(id, 'rejected', input, actor);
}
