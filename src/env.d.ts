/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /**
     * The profile acting on this request, or null until setup is complete.
     * DEVELOPMENT ONLY: always the DEV_USER_EMAIL profile — there is no
     * authentication yet. TODO(auth): the signed-in Supabase Auth user.
     */
    user: import('./types').Profile | null;
    /** What still needs configuring, shown on /setup and in API errors */
    setupMessage?: string;
    /** IANA time zone reported by the browser, e.g. "Asia/Manila" */
    timeZone: string;
  }
}
