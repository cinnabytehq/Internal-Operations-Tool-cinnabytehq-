/** The API client for browser scripts (same-origin, relative URLs). */
import { createApiClient } from './client';

export const api = createApiClient();
export { ApiError } from './client';
