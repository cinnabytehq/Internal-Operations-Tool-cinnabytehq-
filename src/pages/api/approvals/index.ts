import { handle, ok, queryParams, validate } from '@/lib/http';
import { approvalQuerySchema } from '@/lib/validation';
import { listApprovals } from '@/services/approvals';

/** GET /api/approvals?status=pending|approved|rejected&request_id= */
export const GET = handle(async (context) => {
  const { approvals, meta } = await listApprovals(validate(approvalQuerySchema, queryParams(context.url)));
  return ok(approvals, meta);
});
