/**
 * Runs before every page, server island and API route.
 *
 * 1. Reads the viewer's time zone (set by BaseLayout) for date formatting.
 * 2. Resolves the acting user. DEVELOPMENT ONLY: that's the profile named by
 *    DEV_USER_EMAIL — this is not authentication.
 * 3. If Supabase isn't configured (or the database isn't migrated/seeded),
 *    pages render the /setup instructions instead of failing.
 *
 * TODO(auth): replace step 2 with Supabase Auth:
 *   - create a server client with @supabase/ssr using the request cookies
 *   - `const { data } = await supabase.auth.getUser()`
 *   - load the profile for data.user.id, or redirect to /login
 */
import { defineMiddleware } from 'astro:middleware';
import { DEFAULT_TIME_ZONE, isValidTimeZone } from '@/lib/dates';
import { SupabaseConfigError, getSupabaseConfigStatus } from '@/lib/supabase';
import { toServiceError } from '@/services/errors';
import { getDevUser } from '@/services/profiles';

export const onRequest = defineMiddleware(async (context, next) => {
  const tz = context.cookies.get('tz')?.value;
  context.locals.timeZone = tz && isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
  context.locals.user = null;

  const config = getSupabaseConfigStatus();
  if (!config.configured) {
    context.locals.setupMessage = new SupabaseConfigError(config.missing).message;
  } else {
    try {
      context.locals.user = await getDevUser();
    } catch (error) {
      context.locals.setupMessage = toServiceError(error, 'load the development user').message;
    }
  }

  const { pathname } = context.url;
  const isPage = !pathname.startsWith('/api/') && !pathname.startsWith('/_') && pathname !== '/setup';
  if (isPage && !context.locals.user) {
    // Show the setup guide at the same URL; refreshing works once fixed.
    return next('/setup');
  }
  return next();
});
