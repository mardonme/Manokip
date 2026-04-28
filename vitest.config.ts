import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Include .ts (server/lib) and .tsx (component) tests.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules', '.next'],
    setupFiles: ['./tests/_fixtures/load-env.ts'],
    reporters: ['verbose'],
    // Component tests need a DOM. Vitest 4 honours `// @vitest-environment jsdom`
    // pragma at the top of each .test.tsx file; this projects-style override
    // keeps the default Node env for server-side tests while enabling jsdom
    // for everything under tests/components/**.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/components/**', 'tests/e2e/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.tsx'],
          exclude: ['tests/e2e/**'],
        },
      },
    ],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
