// Plan 05-05 task 5.4 — flip RED -> GREEN (DEF-4-12-04 absorption per CONTEXT D-13).
//
// Cloudinary upload widget smoke gate. Asserts:
//   1. Admin product editor mounts the CldUploadWidget — the trigger Button
//      ("Upload"/"Replace" or "Add images") is visible after the editor
//      hydrates. Proves the next-cloudinary lazy-load chain hasn't regressed
//      since Phase-2 plan 02-14 shipped.
//   2. /api/cloudinary/sign returns 200 for a valid paramsToSign body when
//      the request includes an admin session cookie.
//
// Per RESEARCH §Anti-Patterns: full cross-origin iframe upload roundtrip
// stays a manual gate (DEF-5-NN-* in plan 06). This spec is intentionally
// SMOKE-only — DOM mount + signing endpoint, nothing more.

import { test, expect } from '@playwright/test';
import {
  loginAsAdminViaDirectToken,
  cleanupAdminVerificationTokens,
} from '../fixtures/admin-magic-link';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@manometr.uz';
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

test.describe.configure({ mode: 'serial' });

test.describe('Cloudinary upload widget smoke (DEF-4-12-04)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Cloudinary widget smoke requires a Vercel preview URL (set BASE_URL); local-fallback skip',
  );

  test('admin product editor: Cloudinary upload widget DOM mounts (button visible)', async ({
    page,
  }) => {
    try {
      await loginAsAdminViaDirectToken(page, {
        baseURL,
        email: adminEmail,
        locale: 'uz',
        callbackPath: '/uz/admin',
        protectionBypassHeader: extraHeaders,
      });

      await page.goto(`${baseURL}/uz/admin/products/new`);

      // MediaUploader renders Buttons labelled "Upload" / "Replace" /
      // "Add PDF" / "Add images" via the CldUploadWidget render-prop. The
      // copy is intentionally English-only in the admin shell; locale-
      // safe aliases ('yuklash'/'загрузить') are kept in the regex for
      // future trilingual admin work.
      const uploadBtn = page.getByRole('button', {
        name: /upload|add (pdf|images)|yuklash|загрузить/i,
      });
      await expect(uploadBtn.first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupAdminVerificationTokens(adminEmail);
    }
  });

  test('/api/cloudinary/sign returns 200 (admin session) for paramsToSign body', async ({
    page,
    request,
  }) => {
    try {
      // Auth via the magic-link flow so the Auth.js session cookie is
      // attached to the page's context; we then thread the same cookies
      // into the request fixture for the API call.
      await loginAsAdminViaDirectToken(page, {
        baseURL,
        email: adminEmail,
        locale: 'uz',
        callbackPath: '/uz/admin',
        protectionBypassHeader: extraHeaders,
      });

      const cookies = await page.context().cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

      const res = await request.post(`${baseURL}/api/cloudinary/sign`, {
        headers: {
          ...extraHeaders,
          cookie: cookieHeader,
          'content-type': 'application/json',
        },
        data: { paramsToSign: { folder: 'products' } },
      });

      // Smoke: route exists + accepts the widget paramsToSign shape and
      // returns a non-empty signature (Phase-2 02-14 endpoint contract).
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { signature?: string };
      expect(body.signature).toBeTruthy();
    } finally {
      await cleanupAdminVerificationTokens(adminEmail);
    }
  });
});
