import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Vitest is split into two projects:
//   - 'node' — server/lib tests (DB, lib helpers, API routes). Default Node
//             environment; default setup file (env loader).
//   - 'dom'  — component tests under tests/components/**. jsdom environment
//             so React components can render. No env loader (component tests
//             don't touch @/env / Neon).
//
// Each project defines its own `include` + `setupFiles`, so they do NOT
// inherit the parent's `include`/`setupFiles` (Vitest 4 projects override
// parent test config field-by-field for arrays / strings).
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    reporters: ['verbose'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/e2e/**', 'tests/components/**', 'node_modules', '.next'],
          setupFiles: ['./tests/_fixtures/load-env.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.tsx'],
          exclude: ['tests/e2e/**', 'node_modules', '.next'],
          // No env loader — component tests do not touch @/env / Neon.
          setupFiles: [],
        },
      },
    ],
  },
});
