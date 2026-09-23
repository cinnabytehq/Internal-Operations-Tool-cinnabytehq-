import { handle, idParam, ok, readBody, requireUser } from '@/lib/http';
import { rejectSchema } from '@/lib/validation';
import { reject } from '@/services/approvals';

/** POST /api/approvals/:id/reject — body: { "comment": "reason" } */
export const POST = handle(async (context) => {
  const id = idParam(context, 'Approval');
  const input = await readBody(context.request, rejectSchema);
  return ok(await reject(id, input, requireUser(context)));
});
