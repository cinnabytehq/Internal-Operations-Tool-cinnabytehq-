import { created, handle, ok, queryParams, readBody, requireUser, validate } from '@/lib/http';
import { createTaskSchema, taskQuerySchema } from '@/lib/validation';
import { createTask, listTasks } from '@/services/tasks';

/** GET /api/tasks?view=&project_id=&assignee_id=&status=&priority=&q=&limit= */
export const GET = handle(async (context) => {
  const query = validate(taskQuerySchema, queryParams(context.url));
  const { tasks, meta } = await listTasks(query, requireUser(context));
  return ok(tasks, meta);
});

/** POST /api/tasks */
export const POST = handle(async (context) => {
  const input = await readBody(context.request, createTaskSchema);
  return created(await createTask(input, requireUser(context)));
});
