import { handle, idParam, ok, readBody, requireUser } from '@/lib/http';
import { updateProfileSchema } from '@/lib/validation';
import { getProfile, updateProfile } from '@/services/profiles';

/** GET /api/profiles/:id */
export const GET = handle(async (context) => ok(await getProfile(idParam(context, 'Person'))));

/** PATCH /api/profiles/:id */
export const PATCH = handle(async (context) => {
  const id = idParam(context, 'Person');
  const input = await readBody(context.request, updateProfileSchema);
  return ok(await updateProfile(id, input, requireUser(context)));
});
