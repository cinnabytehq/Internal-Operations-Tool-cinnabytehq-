import { handle, idParam, noContent, ok, readBody, requireUser } from '@/lib/http';
import { updateProjectSchema } from '@/lib/validation';
import { deleteProject, getProject, updateProject } from '@/services/projects';

/** GET /api/projects/:id */
export const GET = handle(async (context) => ok(await getProject(idParam(context, 'Project'))));

/** PATCH /api/projects/:id */
export const PATCH = handle(async (context) => {
  const id = idParam(context, 'Project');
  const input = await readBody(context.request, updateProjectSchema);
  return ok(await updateProject(id, input, requireUser(context)));
});

/** DELETE /api/projects/:id — also deletes the project's tasks */
export const DELETE = handle(async (context) => {
  await deleteProject(idParam(context, 'Project'), requireUser(context));
  return noContent();
});
