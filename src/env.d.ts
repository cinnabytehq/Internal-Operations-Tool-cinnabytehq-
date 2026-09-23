/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** The signed-in user (mock: Alex Johnson). TODO(auth): from the session. */
    user: import('./types').User;
    /** IANA time zone reported by the browser, e.g. "Asia/Manila". */
    timeZone: string;
  }
}
