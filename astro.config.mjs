// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// CinnabyteHQ renders on the server. Pages, server islands and the browser
// all read and write data through the REST API in src/pages/api, which calls
// the service layer (src/services), which talks to Supabase (PostgreSQL).
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  devToolbar: { enabled: false },
  // Typed environment variables — see .env.example and README → Environment.
  // All are server-only and read at runtime (Astro calls that `access:
  // 'secret'`), so one build works in any environment and nothing here is
  // ever sent to the browser. All are optional at startup: a missing value
  // shows the /setup screen instead of crashing the server.
  env: {
    schema: {
      // Supabase project URL. Not sensitive (the PUBLIC_ prefix follows Supabase's convention).
      PUBLIC_SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Public by design. Reserved for Supabase Auth (next phase); RLS blocks it from all data today.
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // SECRET: bypasses Row Level Security. Server-only — never sent to the browser.
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // DEVELOPMENT ONLY: which profile acts as the signed-in user until auth exists.
      DEV_USER_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'alex.johnson@cinnabyte.io',
      }),
      // Optional: where server-rendered pages reach the REST API (defaults to the request's origin).
      INTERNAL_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
