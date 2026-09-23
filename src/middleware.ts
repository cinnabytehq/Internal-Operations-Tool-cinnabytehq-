/**
 * Runs before every page, server island and action.
 *
 * Today it resolves the demo user and the viewer's time zone.
 *
 * TODO(auth): this is where authentication plugs in:
 *   1. Read the session cookie (or Authorization header).
 *   2. Verify it with the auth provider / REST API (GET /api/me).
 *   3. Redirect to /login when there is no valid session.
 *   4. Put the user and their token on `context.locals` for services.
 */
import { defineMiddleware } from 'astro:middleware';
import { DEFAULT_TIME_ZONE, isValidTimeZone } from '@/lib/dates';
import { getCurrentUser } from '@/services/users';

export const onRequest = defineMiddleware(async (context, next) => {
  const tz = context.cookies.get('tz')?.value;
  context.locals.timeZone = tz && isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
  context.locals.user = await getCurrentUser();
  return next();
});
