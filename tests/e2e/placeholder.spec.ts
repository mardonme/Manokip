import { test, expect } from '@playwright/test';

// Placeholder e2e test so `pnpm playwright test --list` resolves to >0 tests
// and exits 0. Plan 04/06 replace this with real locale-redirect / admin-gate
// / magic-link specs. This test does NOT hit a network; it purely verifies
// Playwright's runner resolution.
test('playwright harness resolves', () => {
  expect(true).toBe(true);
});
