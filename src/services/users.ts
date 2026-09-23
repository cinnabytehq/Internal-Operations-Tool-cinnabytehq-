/**
 * Users service.
 *
 * Phase 2 endpoints:
 *   GET   /api/users          → getUsers()
 *   GET   /api/users/:id      → getUserById()
 *   GET   /api/me             → getCurrentUser()
 *   PATCH /api/me             → updateProfile()
 */
import { MOCK_CURRENT_USER_ID } from '@/data/mockUsers';
import { clone, db, findUser, simulateLatency } from '@/data/store';
import type { UpdateProfileInput, User } from '@/types';
import { notFound } from './errors';

export async function getUsers(): Promise<User[]> {
  // TODO(api): return api.get<User[]>('/users');
  await simulateLatency();
  return clone(db.users);
}

export async function getUserById(id: string): Promise<User | null> {
  // TODO(api): return api.get<User>(`/users/${id}`).catch(nullIfNotFound);
  await simulateLatency();
  const user = db.users.find((candidate) => candidate.id === id);
  return user ? clone(user) : null;
}

/**
 * The signed-in user.
 * TODO(auth): resolve from the session (cookie/JWT) in middleware and call
 * GET /api/me. Today everyone is signed in as Alex Johnson.
 */
export async function getCurrentUser(): Promise<User> {
  return findUser(currentUserId());
}

/** Id of the signed-in user. Used by the mock services to attribute changes. */
export function currentUserId(): string {
  return MOCK_CURRENT_USER_ID;
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  // TODO(api): return api.patch<User>('/me', input);
  await simulateLatency('write');
  const user = db.users.find((candidate) => candidate.id === currentUserId());
  if (!user) throw notFound('User', currentUserId());
  Object.assign(user, input);
  return clone(user);
}
