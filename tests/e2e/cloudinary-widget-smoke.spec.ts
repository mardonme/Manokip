// FLIP-IN: 05-05-PLAN.md
//
// Plan 05-01 RED stub for DEF-4-12-04 — Cloudinary upload widget smoke gate
// folded into Phase 5 e2e per CONTEXT D-13. Wave 3 plan 05-05 flips
// test.fixme → test() and asserts:
//   1. Admin product editor: the Cloudinary upload widget DOM mounts
//      (button visible) — proves the next-cloudinary lazy-load chain hasn't
//      regressed since Phase-2 plan 02-14 shipped.
//   2. /api/cloudinary/sign returns 200 for a valid paramsToSign body when
//      the request includes an admin session cookie.

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};
void extraHeaders;
void baseURL;

test.describe.configure({ mode: 'serial' });

test.describe('Cloudinary upload widget smoke (DEF-4-12-04)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Cloudinary widget smoke requires a Vercel preview URL (set BASE_URL); local-fallback skip',
  );

  test.fixme(
    'admin product editor: Cloudinary upload widget DOM mounts (button visible)',
    async ({ page }) => {
      void page;
      // FLIP-IN 05-05 — admin login → /admin/products/<id> → assert the
      // CldUploadWidget trigger button is visible in the DOM.
    },
  );

  test.fixme(
    '/api/cloudinary/sign returns 200 (admin session) for paramsToSign body',
    async ({ request }) => {
      void request;
      // FLIP-IN 05-05 — POST a paramsToSign body to /api/cloudinary/sign with
      // the admin session cookie threaded; assert 200 + signature in body.
    },
  );
});
