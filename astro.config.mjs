// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// CinnabyteHQ renders on the server so that every page reads fresh data
// through the service layer (src/services). Today that layer is backed by
// an in-memory mock store; in Phase 2 it will call the REST API instead.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  devToolbar: { enabled: false },
  // Typed environment variables (see .env.example).
  env: {
    schema: {
      MOCK_LATENCY: envField.enum({ context: 'server', access: 'public', values: ['on', 'off'], default: 'on' }),
      // Phase 2: base URL of the REST API that sits in front of PostgreSQL.
      API_BASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
