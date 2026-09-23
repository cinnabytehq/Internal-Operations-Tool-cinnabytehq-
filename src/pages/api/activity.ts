import { handle, ok, queryParams, validate } from '@/lib/http';
import { activityQuerySchema } from '@/lib/validation';
import { listActivity } from '@/services/activity';

/** GET /api/activity?entity=&request_id=&project_id=&task_id=&limit= (newest first) */
export const GET = handle(async (context) => ok(await listActivity(validate(activityQuerySchema, queryParams(context.url)))));
