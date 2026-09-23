/**
 * Input validation for the REST API (Zod ships with Astro — no extra
 * dependency). Schemas are strict: unknown fields are rejected, strings
 * are trimmed, and every message is written for people, not developers.
 */
import { z } from 'astro/zod';
import {
  APPROVAL_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  REQUEST_CATEGORIES,
  REQUEST_STATUSES,
  REQUEST_VIEWS,
  TASK_STATUSES,
  TASK_VIEWS,
} from './meta';

const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .transform((value) => value || null)
    .nullable();

const id = (label: string) => z.uuid({ error: `${label} must be a valid id.` });
const oneOf = <T extends string>(values: readonly T[], label: string) =>
  z.enum(values as [T, ...T[]], { error: `${label} must be one of: ${values.join(', ')}.` });

const atLeastOneField = (value: object) => Object.keys(value).length > 0;
const AT_LEAST_ONE = { error: 'Send at least one field to update.' };

/* ─── Requests ─── */

export const createRequestSchema = z.strictObject({
  title: text('Title', 4, 120),
  description: text('Description', 10, 2000),
  category: oneOf(REQUEST_CATEGORIES, 'Category'),
  priority: oneOf(PRIORITIES, 'Priority'),
  assignee_id: id('Assignee').nullable().optional(),
});

export const updateRequestSchema = z
  .strictObject({
    title: text('Title', 4, 120),
    description: text('Description', 10, 2000),
    category: oneOf(REQUEST_CATEGORIES, 'Category'),
    priority: oneOf(PRIORITIES, 'Priority'),
    status: oneOf(REQUEST_STATUSES, 'Status'),
    assignee_id: id('Assignee').nullable(),
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE);

export const commentSchema = z.strictObject({
  comment: text('Comment', 1, 1000),
});

export const requestQuerySchema = z.strictObject({
  view: oneOf(REQUEST_VIEWS.map((view) => view.id), 'view').optional(),
  status: oneOf(REQUEST_STATUSES, 'status').optional(),
  priority: oneOf(PRIORITIES, 'priority').optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

/* ─── Approvals ─── */

export const approveSchema = z.strictObject({
  comment: optionalText('Comment', 1000).optional(),
});

export const rejectSchema = z.strictObject({
  comment: text('A reason', 3, 1000),
});

export const approvalQuerySchema = z.strictObject({
  status: oneOf(APPROVAL_STATUSES, 'status').optional(),
  request_id: id('request_id').optional(),
});

/* ─── Projects ─── */

const progress = z.number({ error: 'Progress must be a number.' }).int('Progress must be a whole number.').min(0).max(100);

export const createProjectSchema = z.strictObject({
  name: text('Name', 2, 80),
  description: text('Description', 1, 1000),
  owner_id: id('Owner'),
  status: oneOf(PROJECT_STATUSES, 'Status').optional(),
  progress: progress.optional(),
});

export const updateProjectSchema = createProjectSchema.partial().refine(atLeastOneField, AT_LEAST_ONE);

export const projectQuerySchema = z.strictObject({
  status: oneOf(PROJECT_STATUSES, 'status').optional(),
  active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

/* ─── Tasks ─── */

const dueDate = z.iso.date({ error: 'Due date must be a date like 2026-09-25.' }).nullable();

export const createTaskSchema = z.strictObject({
  title: text('Title', 2, 160),
  description: optionalText('Description', 2000).optional(),
  project_id: id('Project'),
  assignee_id: id('Assignee').nullable().optional(),
  priority: oneOf(PRIORITIES, 'Priority'),
  status: oneOf(TASK_STATUSES, 'Status'),
  due_date: dueDate.optional(),
});

export const updateTaskSchema = createTaskSchema.partial().refine(atLeastOneField, AT_LEAST_ONE);

export const taskQuerySchema = z.strictObject({
  view: oneOf(TASK_VIEWS.map((view) => view.id), 'view').optional(),
  project_id: id('project_id').optional(),
  assignee_id: id('assignee_id').optional(),
  status: oneOf(TASK_STATUSES, 'status').optional(),
  priority: oneOf(PRIORITIES, 'priority').optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

/* ─── Activity ─── */

export const activityQuerySchema = z.strictObject({
  entity: z.enum(['request', 'project', 'task']).optional(),
  request_id: id('request_id').optional(),
  project_id: id('project_id').optional(),
  task_id: id('task_id').optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

/* ─── Profiles ─── */

// Email is deliberately not editable here: it identifies the person (today
// the dev user is looked up by it; later it comes from Supabase Auth, which
// owns the email-change flow).
export const updateProfileSchema = z
  .strictObject({
    full_name: text('Full name', 2, 120),
    job_title: optionalText('Job title', 80),
    team: optionalText('Team', 60),
    avatar_url: z.url({ error: 'Avatar URL must be a valid URL.' }).nullable(),
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE);

/* ─── Search ─── */

export const searchQuerySchema = z.strictObject({
  q: z.string().max(100).default(''),
});
