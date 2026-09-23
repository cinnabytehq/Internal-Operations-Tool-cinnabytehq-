/**
 * Requests — the core workflow of CinnabyteHQ.
 *
 *   GET    /api/requests                 → listRequests()
 *   POST   /api/requests                 → createRequest()
 *   GET    /api/requests/:id             → getRequest()
 *   PATCH  /api/requests/:id             → updateRequest()
 *   DELETE /api/requests/:id             → deleteRequest()
 *   POST   /api/requests/:id/comments    → addComment()
 *
 * Workflow rules live in src/lib/workflow.ts; this file enforces them and
 * records every change in the activity log.
 */
import type {
  ApprovalWithApprover,
  CreateRequestInput,
  Profile,
  Request,
  RequestListMeta,
  RequestQuery,
  RequestView,
  RequestWithRelations,
  UpdateRequestInput,
} from '@/types';
import { CATEGORY_META, PRIORITY_META, REQUEST_STATUS_META, REQUEST_VIEWS, requestRef } from '@/lib/meta';
import { requiresApproval, statusChangeBlocker } from '@/lib/workflow';
import { logActivity } from './activity';
import { createApproval, pickApprover } from './approvals';
import { PROFILE_COLUMNS, db, sanitizeSearch, unwrap } from './db';
import { ServiceError, notFound } from './errors';

const APPROVAL_EMBED = `*, approver:profiles!approvals_approver_id_fkey(${PROFILE_COLUMNS})`;
const RELATIONS = `requester:profiles!requests_requester_id_fkey(${PROFILE_COLUMNS}), assignee:profiles!requests_assignee_id_fkey(${PROFILE_COLUMNS})`;
const REQUEST_SELECT = `*, ${RELATIONS}, approvals(${APPROVAL_EMBED})`;
/** Inner join: only requests that have a matching (pending) approval */
const AWAITING_SELECT = `*, ${RELATIONS}, approvals!inner(${APPROVAL_EMBED})`;

interface RequestRow extends Request {
  requester: Profile;
  assignee: Profile | null;
  approvals: ApprovalWithApprover[];
}

function toRequest(row: RequestRow): RequestWithRelations {
  const { approvals, ...request } = row;
  const latest = [...(approvals ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return { ...request, approval: latest };
}

/** Apply the free-text search: title, description or a REQ number. */
function searchFilter(text: string): string | null {
  const q = sanitizeSearch(text);
  if (!q) return null;
  const clauses = [`title.ilike."%${q}%"`, `description.ilike."%${q}%"`];
  const number = q.match(/^(?:req-?)?(\d{3,7})$/i)?.[1];
  if (number) clauses.push(`number.eq.${number}`);
  return clauses.join(',');
}

/* ───────────────────────── Queries ───────────────────────── */

export async function listRequests(
  query: RequestQuery,
  actor: Profile,
): Promise<{ requests: RequestWithRelations[]; meta: RequestListMeta }> {
  const view = query.view ?? 'all';
  let request = db()
    .from('requests')
    .select(view === 'awaiting_approval' ? AWAITING_SELECT : REQUEST_SELECT)
    .order('updated_at', { ascending: false })
    .limit(Math.min(query.limit ?? 200, 500));

  if (view === 'mine') request = request.eq('requester_id', actor.id);
  if (view === 'assigned') request = request.eq('assignee_id', actor.id);
  if (view === 'awaiting_approval') request = request.eq('approvals.status', 'pending');
  if (query.status) request = request.eq('status', query.status);
  if (query.priority) request = request.eq('priority', query.priority);
  const search = searchFilter(query.q ?? '');
  if (search) request = request.or(search);

  const [rows, counts] = await Promise.all([request, countViews(actor)]);
  const requests = (unwrap(rows, 'load requests') as RequestRow[]).map(toRequest);
  return { requests, meta: { total: requests.length, counts } };
}

/** How many requests each view holds (for the tab badges). */
async function countViews(actor: Profile): Promise<Record<RequestView, number>> {
  const head = { count: 'exact' as const, head: true };
  const results = await Promise.all([
    db().from('requests').select('id', head),
    db().from('requests').select('id', head).eq('requester_id', actor.id),
    db().from('requests').select('id', head).eq('assignee_id', actor.id),
    db().from('approvals').select('id', head).eq('status', 'pending'),
  ]);
  const values = results.map((result) => {
    unwrap(result, 'count requests');
    return result.count ?? 0;
  });
  return Object.fromEntries(REQUEST_VIEWS.map((view, index) => [view.id, values[index]])) as Record<RequestView, number>;
}

export async function getRequest(id: string): Promise<RequestWithRelations> {
  const result = await db().from('requests').select(REQUEST_SELECT).eq('id', id).maybeSingle();
  const row = unwrap(result, 'load the request') as RequestRow | null;
  if (!row) throw notFound('Request');
  return toRequest(row);
}

/** Open requests, most recently updated first (used by the dashboard). */
export async function listOpenRequests(limit = 30): Promise<RequestWithRelations[]> {
  const result = await db()
    .from('requests')
    .select(REQUEST_SELECT)
    .in('status', ['new', 'in_review', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(limit);
  return (unwrap(result, 'load open requests') as RequestRow[]).map(toRequest);
}

/* ──────────────────────── Mutations ──────────────────────── */

export async function createRequest(input: CreateRequestInput, actor: Profile): Promise<RequestWithRelations> {
  const result = await db()
    .from('requests')
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      assignee_id: input.assignee_id ?? null,
      requester_id: actor.id,
      status: 'new',
    })
    .select('id, number, title')
    .single();
  const created = unwrap(result, 'create the request') as Pick<Request, 'id' | 'number' | 'title'>;

  await logActivity({
    actor,
    action: 'created',
    request_id: created.id,
    description: `created ${requestRef(created.number)} "${created.title}"`,
    metadata: { entity: 'request', title: created.title },
  });
  return getRequest(created.id);
}

export async function updateRequest(
  id: string,
  input: UpdateRequestInput,
  actor: Profile,
): Promise<RequestWithRelations> {
  const current = await getRequest(id);
  const ref = requestRef(current.number);
  const changes: Partial<Request> = {};

  if (input.title !== undefined && input.title !== current.title) changes.title = input.title;
  if (input.description !== undefined && input.description !== current.description) changes.description = input.description;
  if (input.category !== undefined && input.category !== current.category) changes.category = input.category;
  if (input.priority !== undefined && input.priority !== current.priority) changes.priority = input.priority;
  if (input.assignee_id !== undefined && input.assignee_id !== current.assignee_id) changes.assignee_id = input.assignee_id;

  if (input.status !== undefined && input.status !== current.status) {
    const blocker = statusChangeBlocker({ ...current, ...changes }, current.approval, input.status);
    if (blocker) throw new ServiceError('CONFLICT', blocker);
    changes.status = input.status;
  }

  if (Object.keys(changes).length === 0) return current;

  const result = await db().from('requests').update(changes).eq('id', id).select('id, assignee:profiles!requests_assignee_id_fkey(full_name)').single();
  const saved = unwrap(result, 'update the request') as unknown as { id: string; assignee: { full_name: string } | null };
  const title = changes.title ?? current.title;

  // Moving into review requests an approval when the category needs one.
  const approvalOpen = current.approval?.status === 'pending' || current.approval?.status === 'approved';
  if (changes.status === 'in_review' && requiresApproval({ category: changes.category ?? current.category }) && !approvalOpen) {
    const approverId = await pickApprover(changes.category ?? current.category, current.requester_id);
    await createApproval(id, approverId);
  }

  if (changes.status) {
    await logActivity({
      actor,
      action: 'status_changed',
      request_id: id,
      description: `moved ${ref} from ${REQUEST_STATUS_META[current.status].label} to ${REQUEST_STATUS_META[changes.status].label}`,
      metadata: { entity: 'request', title, from: current.status, to: changes.status },
    });
  }
  if (changes.assignee_id !== undefined) {
    const name = saved.assignee?.full_name;
    await logActivity({
      actor,
      action: 'assigned',
      request_id: id,
      description: name ? `assigned ${ref} to ${name}` : `unassigned ${ref}`,
      metadata: { entity: 'request', title, ...(changes.assignee_id && { assignee_id: changes.assignee_id, assignee_name: name }) },
    });
  }
  const edited = (['title', 'description', 'category', 'priority'] as const).filter((field) => field in changes);
  if (edited.length > 0) {
    const detail = changes.priority ? ` (priority ${PRIORITY_META[changes.priority].label.toLowerCase()})` : '';
    const category = changes.category ? ` (category ${CATEGORY_META[changes.category].label})` : '';
    await logActivity({
      actor,
      action: 'updated',
      request_id: id,
      description: `updated ${edited.join(', ')} on ${ref}${detail}${category}`,
      metadata: { entity: 'request', title },
    });
  }

  return getRequest(id);
}

export async function deleteRequest(id: string, actor: Profile): Promise<void> {
  const current = await getRequest(id);
  // TODO(auth): enforce with RLS once real users sign in.
  if (current.requester_id !== actor.id && actor.role !== 'admin') {
    throw new ServiceError('FORBIDDEN', 'Only the requester or an admin can delete this request.');
  }
  unwrap(await db().from('requests').delete().eq('id', id), 'delete the request');
  await logActivity({
    actor,
    action: 'deleted',
    description: `deleted ${requestRef(current.number)} "${current.title}"`,
    metadata: { entity: 'request', title: current.title },
  });
}

export async function addComment(id: string, comment: string, actor: Profile): Promise<void> {
  const current = await getRequest(id);
  // Touch updated_at so the request rises to the top of the list.
  unwrap(await db().from('requests').update({ updated_at: new Date().toISOString() }).eq('id', id), 'save the comment');
  await logActivity({
    actor,
    action: 'commented',
    request_id: id,
    description: `commented on ${requestRef(current.number)}`,
    metadata: { entity: 'request', title: current.title, comment },
    required: true,
  });
}
