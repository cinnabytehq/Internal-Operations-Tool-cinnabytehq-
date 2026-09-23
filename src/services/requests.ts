/**
 * Requests service — the core workflow of CinnabyteHQ.
 *
 * Phase 2 endpoints:
 *   GET    /api/requests?view=&q=          → getRequests()
 *   GET    /api/requests/counts            → getRequestCounts()
 *   GET    /api/requests/:id               → getRequestById()
 *   GET    /api/requests/:id/timeline      → getRequestTimeline()
 *   POST   /api/requests                   → createRequest()
 *   PATCH  /api/requests/:id               → updateRequest()
 *   DELETE /api/requests/:id               → deleteRequest()
 *   POST   /api/requests/:id/approve       → approveRequest()
 *   POST   /api/requests/:id/comments      → addComment()
 *
 * Workflow rules implemented here (they move to the API in Phase 2):
 *   - Requests in IT & Equipment, Facilities and Finance need an approval
 *     when they move to "In review".
 *   - A request can't start or complete until its approval is granted.
 *   - Approving a request moves it to "In progress".
 */
import { clone, db, findUser, nextId, simulateLatency } from '@/data/store';
import { CATEGORY_META, REQUEST_VIEWS } from '@/lib/meta';
import { matchesQuery } from '@/lib/utils';
import type {
  ActivityWithActor,
  Approval,
  CreateRequestInput,
  Request,
  RequestCategory,
  RequestFilters,
  RequestView,
  RequestWithRelations,
  UpdateRequestInput,
} from '@/types';
import { recordActivity, withActor } from './activity';
import { ServiceError, notFound } from './errors';
import { currentUserId } from './users';

/* ───────────────────────── helpers ───────────────────────── */

function withRelations(request: Request): RequestWithRelations {
  const approval = db.approvals.find((candidate) => candidate.requestId === request.id);
  return {
    ...clone(request),
    requester: findUser(request.requesterId),
    assignee: request.assigneeId ? findUser(request.assigneeId) : null,
    approval: approval ? { ...clone(approval), approver: findUser(approval.approverId) } : null,
  };
}

function matchesView(request: RequestWithRelations, view: RequestView, me: string): boolean {
  switch (view) {
    case 'mine':
      return request.requesterId === me;
    case 'assigned':
      return request.assigneeId === me;
    case 'pending_approval':
      return request.approval?.status === 'pending';
    case 'in_progress':
      return request.status === 'in_progress';
    case 'completed':
      return request.status === 'completed';
    default:
      return true;
  }
}

/** Text the list search matches against. */
export function requestSearchText(request: RequestWithRelations): string {
  return [
    request.id,
    request.title,
    request.description,
    CATEGORY_META[request.category].label,
    request.requester.name,
    request.assignee?.name,
  ].join(' ');
}

/** Who signs off a request: Operations for facilities, Finance for spend. */
function routeApproval(category: RequestCategory, requesterId: string): string {
  const approver = category === 'facilities' ? 'usr_alex' : 'usr_sarah';
  if (approver !== requesterId) return approver;
  return approver === 'usr_alex' ? 'usr_sarah' : 'usr_alex';
}

/**
 * Requests in approval categories can't start or finish until approved.
 * Exported so the UI can disable the same options it would be refused.
 */
export function isBlockedByApproval(
  request: Pick<Request, 'category'>,
  approval: Pick<Approval, 'status'> | null | undefined,
  nextStatus: Request['status'],
): boolean {
  if (nextStatus !== 'in_progress' && nextStatus !== 'completed') return false;
  if (approval) return approval.status !== 'approved';
  return CATEGORY_META[request.category].requiresApproval;
}

function findRequest(id: string): Request {
  const request = db.requests.find((candidate) => candidate.id === id);
  if (!request) throw notFound('Request', id);
  return request;
}

const newestFirst = (a: Request, b: Request) => b.updatedAt.localeCompare(a.updatedAt);

/* ───────────────────────── queries ───────────────────────── */

export async function getRequests(filters: RequestFilters = {}): Promise<RequestWithRelations[]> {
  // TODO(api): return api.get('/requests', { query: { view: filters.view, q: filters.search } });
  await simulateLatency();
  const me = currentUserId();
  return [...db.requests]
    .sort(newestFirst)
    .map(withRelations)
    .filter((request) => matchesView(request, filters.view ?? 'all', me))
    .filter((request) => matchesQuery(requestSearchText(request), filters.search ?? ''));
}

export async function getRequestCounts(): Promise<Record<RequestView, number>> {
  // TODO(api): return api.get('/requests/counts');
  await simulateLatency();
  const me = currentUserId();
  const requests = db.requests.map(withRelations);
  return Object.fromEntries(
    REQUEST_VIEWS.map(({ id }) => [id, requests.filter((request) => matchesView(request, id, me)).length]),
  ) as Record<RequestView, number>;
}

export async function getRequestById(id: string): Promise<RequestWithRelations | null> {
  // TODO(api): return api.get(`/requests/${id}`).catch(nullIfNotFound);
  await simulateLatency();
  const request = db.requests.find((candidate) => candidate.id === id);
  return request ? withRelations(request) : null;
}

/** The request's history, oldest first — reads like a story. */
export async function getRequestTimeline(id: string): Promise<ActivityWithActor[]> {
  // TODO(api): return api.get(`/requests/${id}/timeline`);
  await simulateLatency();
  const request = findRequest(id);
  const events = db.activity
    .filter((event) => event.entityType === 'request' && event.entityId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(withActor);

  // Seed requests older than the activity log get their "created" event
  // reconstructed from the record itself.
  if (!events.some((event) => event.type === 'created')) {
    events.unshift(
      withActor({
        id: `act_created_${id}`,
        type: 'created',
        actorId: request.requesterId,
        entityType: 'request',
        entityId: id,
        entityTitle: request.title,
        createdAt: request.createdAt,
      }),
    );
  }
  return events;
}

/* ──────────────────────── mutations ──────────────────────── */

export async function createRequest(input: CreateRequestInput): Promise<RequestWithRelations> {
  // TODO(api): return api.post('/requests', input);
  await simulateLatency('write');
  const now = new Date().toISOString();
  const request: Request = {
    id: nextId('request'),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    priority: input.priority,
    assigneeId: input.assigneeId || undefined,
    requesterId: currentUserId(),
    status: 'new',
    createdAt: now,
    updatedAt: now,
  };
  db.requests.push(request);
  recordActivity({ type: 'created', entityType: 'request', entityId: request.id, entityTitle: request.title });
  return withRelations(request);
}

export async function updateRequest(id: string, changes: UpdateRequestInput): Promise<RequestWithRelations> {
  // TODO(api): return api.patch(`/requests/${id}`, changes);
  await simulateLatency('write');
  const request = findRequest(id);
  const approval = db.approvals.find((candidate) => candidate.requestId === id);
  const ref = { entityType: 'request' as const, entityId: id, entityTitle: request.title };

  if (changes.status && changes.status !== request.status) {
    if (isBlockedByApproval(request, approval, changes.status)) {
      throw new ServiceError(
        'CONFLICT',
        approval
          ? `This request is waiting on approval from ${findUser(approval.approverId).name}.`
          : 'This request needs an approval first. Move it to review to request one.',
      );
    }

    if (changes.status === 'in_review' && CATEGORY_META[request.category].requiresApproval && !approval) {
      const newApproval: Approval = {
        id: nextId('approval'),
        requestId: id,
        approverId: routeApproval(request.category, request.requesterId),
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };
      db.approvals.push(newApproval);
    }

    recordActivity({ ...ref, type: 'status_changed', meta: { from: request.status, to: changes.status } });
  }

  if (changes.assigneeId !== undefined && changes.assigneeId !== (request.assigneeId ?? '')) {
    if (changes.assigneeId) recordActivity({ ...ref, type: 'assigned', meta: { assigneeId: changes.assigneeId } });
  }

  Object.assign(request, changes, {
    assigneeId: changes.assigneeId === undefined ? request.assigneeId : changes.assigneeId || undefined,
    updatedAt: new Date().toISOString(),
  });
  return withRelations(request);
}

export async function deleteRequest(id: string): Promise<void> {
  // TODO(api): return api.delete(`/requests/${id}`);
  await simulateLatency('write');
  const request = findRequest(id);
  db.requests = db.requests.filter((candidate) => candidate.id !== id);
  db.approvals = db.approvals.filter((candidate) => candidate.requestId !== id);
  for (const task of db.tasks) {
    if (task.requestId === id) delete task.requestId;
  }
  recordActivity({ type: 'deleted', entityType: 'request', entityId: id, entityTitle: request.title });
}

export async function approveRequest(id: string): Promise<RequestWithRelations> {
  // TODO(api): return api.post(`/requests/${id}/approve`);
  await simulateLatency('write');
  const request = findRequest(id);
  const approval = db.approvals.find((candidate) => candidate.requestId === id);

  if (!approval || approval.status !== 'pending') {
    throw new ServiceError('CONFLICT', 'This request has no pending approval.');
  }
  if (approval.approverId !== currentUserId()) {
    throw new ServiceError('FORBIDDEN', `Only ${findUser(approval.approverId).name} can approve this request.`);
  }

  const now = new Date().toISOString();
  approval.status = 'approved';
  approval.decidedAt = now;
  const ref = { entityType: 'request' as const, entityId: id, entityTitle: request.title };
  recordActivity({ ...ref, type: 'approved' });

  if (request.status === 'in_review' || request.status === 'new') {
    recordActivity({ ...ref, type: 'status_changed', meta: { from: request.status, to: 'in_progress' } });
    request.status = 'in_progress';
  }
  request.updatedAt = now;
  return withRelations(request);
}

export async function addComment(id: string, comment: string): Promise<ActivityWithActor> {
  // TODO(api): return api.post(`/requests/${id}/comments`, { comment });
  await simulateLatency('write');
  const request = findRequest(id);
  const event = recordActivity({
    type: 'commented',
    entityType: 'request',
    entityId: id,
    entityTitle: request.title,
    meta: { comment: comment.trim() },
  });
  request.updatedAt = event.createdAt;
  return withActor(event);
}
