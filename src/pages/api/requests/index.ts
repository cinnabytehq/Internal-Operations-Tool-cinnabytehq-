import { created, handle, ok, queryParams, readBody, requireUser, validate } from '@/lib/http';
import { createRequestSchema, requestQuerySchema } from '@/lib/validation';
import { createRequest, listRequests } from '@/services/requests';

/** GET /api/requests?view=&status=&priority=&q=&limit= */
export const GET = handle(async (context) => {
  const query = validate(requestQuerySchema, queryParams(context.url));
  const { requests, meta } = await listRequests(query, requireUser(context));
  return ok(requests, meta);
});

/** POST /api/requests */
export const POST = handle(async (context) => {
  const input = await readBody(context.request, createRequestSchema);
  return created(await createRequest(input, requireUser(context)));
});
