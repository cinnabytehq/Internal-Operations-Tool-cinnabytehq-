import { handle, idParam, noContent, ok, readBody, requireUser } from '@/lib/http';
import { updateRequestSchema } from '@/lib/validation';
import { deleteRequest, getRequest, updateRequest } from '@/services/requests';

/** GET /api/requests/:id */
export const GET = handle(async (context) => ok(await getRequest(idParam(context, 'Request'))));

/** PATCH /api/requests/:id */
export const PATCH = handle(async (context) => {
  const id = idParam(context, 'Request');
  const input = await readBody(context.request, updateRequestSchema);
  return ok(await updateRequest(id, input, requireUser(context)));
});

/** DELETE /api/requests/:id */
export const DELETE = handle(async (context) => {
  await deleteRequest(idParam(context, 'Request'), requireUser(context));
  return noContent();
});
