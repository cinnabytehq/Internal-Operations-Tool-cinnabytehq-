/**
 * Request workflow rules — pure functions shared by the service layer
 * (which enforces them) and the UI (which disables what would be refused).
 *
 *   new → in_review → in_progress → completed
 *               ↘ rejected
 *
 * - IT & Equipment, Facilities and Finance requests need an approval.
 *   Moving one to "In review" creates it; the approver decides.
 * - Such a request can't start or complete until it is approved.
 * - Approving moves it to "In progress"; rejecting moves it to "Rejected".
 */
import type { Approval, Request, RequestStatus } from '@/types';
import { CATEGORY_META } from './meta';

export function requiresApproval(request: Pick<Request, 'category'>): boolean {
  return CATEGORY_META[request.category].requiresApproval;
}

/** Why a status change isn't allowed right now, or null when it is. */
export function statusChangeBlocker(
  request: Pick<Request, 'category' | 'status'>,
  approval: Pick<Approval, 'status'> | null,
  next: RequestStatus,
): string | null {
  if (next === request.status) return null;
  if (next === 'rejected' && approval?.status === 'pending') {
    return 'This request has a pending approval — approve or reject it instead.';
  }
  if (next === 'in_progress' || next === 'completed') {
    if (approval?.status === 'pending') return 'This request is waiting for approval.';
    if (requiresApproval(request) && approval?.status !== 'approved') {
      return 'This request needs an approval first. Move it to review to request one.';
    }
  }
  return null;
}
