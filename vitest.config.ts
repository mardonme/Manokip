import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules', '.next'],
    setupFiles: ['./tests/_fixtures/load-env.ts'],
    reporters: ['verbose'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
