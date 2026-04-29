import { defineConfig, devices } from '@playwright/test';

// Plan 02-17 Task 17.3 — config edits for the OPS-01 preview gate.
//
// `BASE_URL` is the canonical env var the OPS-01 workflow exports from
// wait-for-vercel-preview's `outputs.url`. The Phase-1 config used the
// project-local `TEST_BASE_URL` name; both are honored here so neither
// the new spec nor the old specs need changes. Order: BASE_URL (CI) →
// TEST_BASE_URL (Phase-1 local convention) → localhost fallback.
//
// `extraHTTPHeaders` is THE knob for Pitfall #11 (Vercel Deployment
// Protection bypass). When VERCEL_AUTOMATION_BYPASS_SECRET is set, every
// playwright HTTP request and page navigation in this config — including
// older specs that pre-date OPS-01 — automatically carries the bypass
// header. When unset, the field is undefined and Playwright sends no
// extra header (same posture as Phase-1).

const baseURL =
  process.env.BASE_URL ?? process.env.TEST_BASE_URL ?? 'http://localhost:3000';

const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    extraHTTPHeaders,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
