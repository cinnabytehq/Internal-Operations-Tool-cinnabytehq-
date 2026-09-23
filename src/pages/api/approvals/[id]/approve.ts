import { handle, idParam, ok, readBody, requireUser } from '@/lib/http';
import { approveSchema } from '@/lib/validation';
import { approve } from '@/services/approvals';

/** POST /api/approvals/:id/approve — body (optional): { "comment": "…" } */
export const POST = handle(async (context) => {
  const id = idParam(context, 'Approval');
  const input = await readBody(context.request, approveSchema, { optional: true });
  return ok(await approve(id, input, requireUser(context)));
});
