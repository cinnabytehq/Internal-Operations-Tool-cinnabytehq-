import { handle, ok, queryParams, validate } from '@/lib/http';
import { searchQuerySchema } from '@/lib/validation';
import { searchWorkspace } from '@/services/search';

/** GET /api/search?q= — requests, projects and tasks for the command palette */
export const GET = handle(async (context) => {
  const { q } = validate(searchQuerySchema, queryParams(context.url));
  return ok(await searchWorkspace(q));
});
