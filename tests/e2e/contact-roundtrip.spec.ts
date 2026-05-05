// FLIP-IN: 05-05-PLAN.md
//
// Plan 05-01 RED stub for the contact-form roundtrip e2e (CTA-01 + CTA-02).
// Wave 3 plan 05-05 flips test.fixme → test() and asserts:
//   1. visitor submits the form on /uz/contact → contact_submission row
//      exists in Neon (live-DB assertion via getTestDb) → success state visible
//   2. product-page sticky CTA opens the modal → submit prepends product
//      context to message body (server-side D-03 prepend) → admin sees the
//      auto-prepended line in the contact_submission row
//
// Preview-gate scaffolding: this spec depends on a Vercel preview URL
// because Turnstile siteverify and the real Resend pipeline only run
// against the deployed URL (not next dev). When BASE_URL is local, the
// spec self-skips with a documented reason (Phase 2 plan 02-17 pattern).

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};
void extraHeaders;
void baseURL;

test.describe.configure({ mode: 'serial' });

test.describe('contact form roundtrip (CTA-01 + CTA-02)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Phase-5 contact e2e requires a Vercel preview URL (set BASE_URL); local-fallback skip',
  );

  test.fixme(
    'visitor submits contact form on /uz/contact → contact_submission row exists in Neon → success state visible',
    async ({ page }) => {
      void page;
      // FLIP-IN 05-05 — assert row insert + success state.
    },
  );

  test.fixme(
    'product-page sticky CTA opens modal → submit prepends product context to message body',
    async ({ page }) => {
      void page;
      // FLIP-IN 05-05 — assert the contact_submission.message column starts
      // with the localized inquiryAbout line (server-side D-03 prepend).
    },
  );
});
