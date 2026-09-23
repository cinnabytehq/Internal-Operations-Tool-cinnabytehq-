/**
 * Astro Actions — the mutation boundary between the browser and the server.
 *
 * Client scripts call these (e.g. `actions.requests.create(input)`); each one
 * validates its input with Zod and delegates to the service layer. Because
 * the actions only talk to services, they don't change when the services
 * switch from mock data to the REST API.
 *
 *   browser ──► action (validation) ──► service ──► mock store | REST API
 */
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { PRIORITIES, REQUEST_CATEGORIES, REQUEST_STATUSES, TASK_STATUSES } from '@/lib/meta';
import { ServiceError } from '@/services/errors';
import { addComment, approveRequest, createRequest, deleteRequest, updateRequest } from '@/services/requests';
import { searchWorkspace } from '@/services/search';
import { updateTaskStatus } from '@/services/tasks';
import { updateProfile } from '@/services/users';

/** Translate service errors into action errors the client understands. */
async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new ActionError({ code: error.code === 'INTERNAL' ? 'INTERNAL_SERVER_ERROR' : error.code, message: error.message });
    }
    throw error;
  }
}

const requestId = z.string().regex(/^REQ-\d+$/, 'Invalid request id');

const requestInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, 'Give the request a title of at least 4 characters.')
    .max(120, 'Keep the title under 120 characters.'),
  description: z
    .string()
    .trim()
    .min(10, 'Add a short description (at least 10 characters).')
    .max(2000, 'Keep the description under 2,000 characters.'),
  category: z.enum(REQUEST_CATEGORIES, { error: 'Choose a category.' }),
  priority: z.enum(PRIORITIES, { error: 'Choose a priority.' }),
  assigneeId: z.string().optional(),
});

export const server = {
  requests: {
    create: defineAction({
      input: requestInputSchema,
      handler: (input) => run(() => createRequest(input)),
    }),

    update: defineAction({
      input: z.object({
        id: requestId,
        status: z.enum(REQUEST_STATUSES).optional(),
        assigneeId: z.string().optional(),
      }),
      handler: ({ id, ...changes }) => run(() => updateRequest(id, changes)),
    }),

    approve: defineAction({
      input: z.object({ id: requestId }),
      handler: ({ id }) => run(() => approveRequest(id)),
    }),

    comment: defineAction({
      input: z.object({
        id: requestId,
        comment: z.string().trim().min(1, 'Write a comment first.').max(1000, 'Keep comments under 1,000 characters.'),
      }),
      handler: ({ id, comment }) => run(() => addComment(id, comment)),
    }),

    delete: defineAction({
      input: z.object({ id: requestId }),
      handler: ({ id }) => run(() => deleteRequest(id)),
    }),
  },

  tasks: {
    setStatus: defineAction({
      input: z.object({ id: z.string(), status: z.enum(TASK_STATUSES) }),
      handler: ({ id, status }) => run(() => updateTaskStatus(id, status)),
    }),
  },

  profile: {
    update: defineAction({
      input: z.object({
        name: z.string().trim().min(2, 'Enter your full name.').max(80),
        email: z.email('Enter a valid email address.'),
        title: z.string().trim().min(2, 'Enter your job title.').max(80),
      }),
      handler: (input) => run(() => updateProfile(input)),
    }),
  },

  search: defineAction({
    input: z.object({ query: z.string().max(100) }),
    handler: ({ query }) => run(() => searchWorkspace(query)),
  }),
};
