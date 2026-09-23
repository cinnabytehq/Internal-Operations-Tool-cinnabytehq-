/**
 * The API client for server-rendered pages and server islands.
 *
 * Pages render on the server, so they call the REST API over HTTP on the
 * same origin — the exact same endpoints the browser uses. The request's
 * cookies are forwarded, which is how auth will flow through once
 * Supabase Auth is added.
 */
import { INTERNAL_API_URL } from 'astro:env/server';
import { createApiClient } from './client';

interface AstroLike {
  url: URL;
  request: Request;
}

export function serverApi(Astro: AstroLike) {
  const cookie = Astro.request.headers.get('cookie');
  return createApiClient({
    baseUrl: INTERNAL_API_URL || Astro.url.origin,
    headers: cookie ? { cookie } : {},
  });
}

export { ApiError } from './client';
