import { created, handle, idParam, readBody, requireUser } from '@/lib/http';
import { commentSchema } from '@/lib/validation';
import { addComment } from '@/services/requests';

/** POST /api/requests/:id/comments */
export const POST = handle(async (context) => {
  const id = idParam(context, 'Request');
  const { comment } = await readBody(context.request, commentSchema);
  await addComment(id, comment, requireUser(context));
  return created({ request_id: id, comment });
});
