import { handle, idParam, noContent, ok, readBody, requireUser } from '@/lib/http';
import { updateTaskSchema } from '@/lib/validation';
import { deleteTask, getTask, updateTask } from '@/services/tasks';

/** GET /api/tasks/:id */
export const GET = handle(async (context) => ok(await getTask(idParam(context, 'Task'))));

/** PATCH /api/tasks/:id — e.g. { "status": "completed" } or { "assignee_id": "…" } */
export const PATCH = handle(async (context) => {
  const id = idParam(context, 'Task');
  const input = await readBody(context.request, updateTaskSchema);
  return ok(await updateTask(id, input, requireUser(context)));
});

/** DELETE /api/tasks/:id */
export const DELETE = handle(async (context) => {
  await deleteTask(idParam(context, 'Task'), requireUser(context));
  return noContent();
});
