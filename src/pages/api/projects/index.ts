import { created, handle, ok, queryParams, readBody, requireUser, validate } from '@/lib/http';
import { createProjectSchema, projectQuerySchema } from '@/lib/validation';
import { createProject, listProjects } from '@/services/projects';

/** GET /api/projects?status=&active= */
export const GET = handle(async (context) => ok(await listProjects(validate(projectQuerySchema, queryParams(context.url)))));

/** POST /api/projects */
export const POST = handle(async (context) => {
  const input = await readBody(context.request, createProjectSchema);
  return created(await createProject(input, requireUser(context)));
});
