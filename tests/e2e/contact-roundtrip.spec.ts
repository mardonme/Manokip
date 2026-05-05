// Plan 05-05 task 5.3 — flip RED -> GREEN.
//
// Phase 5 contact-form roundtrip e2e (CTA-01 + CTA-02 verification anchor).
// Asserts:
//   1. visitor submits the form on /uz/contact -> contact_submission row
//      exists in Neon (live-DB assertion via getTestDb) -> success state
//      visible (data-testid="contact-success" rendered by ContactForm
//      mode="page" branch).
//   2. product-page sticky CTA opens the modal -> submit prepends product
//      context to message body (server-side D-03 prepend) -> admin sees the
//      auto-prepended line in the contact_submission row.
//
// Preview-gate: this spec depends on a Vercel preview URL because Turnstile
// siteverify and the real Resend pipeline only run against the deployed URL
// (not next dev). When BASE_URL is local the spec self-skips with a
// documented reason (matches Plan 02-17 / 04-12 pattern).
//
// Turnstile dependency: the preview must carry the Cloudflare ALWAYS-PASS
// test site key (NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA)
// so the widget produces a token without human interaction; documented in
// 05-05-SUMMARY as a plan-06 deploy prerequisite.
//
// Cleanup posture: each spec wraps its INSERT-via-form in try/finally and
// DELETEs the row keyed on the unique e2e-prefixed test email
// (T-05-05-04 mitigation — never leave e2e rows in production).

import { test, expect } from '@playwright/test';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

test.describe.configure({ mode: 'serial' });

test.describe('contact form roundtrip (CTA-01 + CTA-02)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Phase-5 contact e2e requires a Vercel preview URL (set BASE_URL); local-fallback skip',
  );

  test('visitor submits contact form on /uz/contact -> contact_submission row exists in Neon -> success state visible', async ({
    page,
  }) => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const testEmail = `e2e-contact-${randomUUID()}@example.com`;

    if (Object.keys(extraHeaders).length > 0) {
      await page.context().setExtraHTTPHeaders(extraHeaders);
    }

    try {
      await page.goto(`${baseURL}/uz/contact`);

      await page.getByTestId('contact-name').fill('E2E Test User');
      await page.getByTestId('contact-company').fill('E2E Co');
      await page.getByTestId('contact-email').fill(testEmail);
      await page.getByTestId('contact-phone').fill('+998 90 000 0000');
      await page
        .getByTestId('contact-message')
        .fill('Automated e2e test message — please ignore.');

      // Wait for the Turnstile always-pass test key to mint a token into the
      // hidden RHF input (register('turnstileToken') -> name="turnstileToken").
      // The submit button stays disabled until the token populates so this
      // wait also serves as the gate for the click below.
      await page.waitForFunction(
        () => {
          const tokenInput = document.querySelector(
            'input[name="turnstileToken"]',
          ) as HTMLInputElement | null;
          return !!tokenInput && tokenInput.value.length > 0;
        },
        { timeout: 15_000 },
      );

      await page.getByTestId('contact-submit').click();

      // mode="page" -> ContactForm replaces itself with the success branch
      // (data-testid="contact-success"); mode="modal" closes via onSuccess.
      await expect(page.getByTestId('contact-success')).toBeVisible({
        timeout: 10_000,
      });

      // DB-direct verification — row exists with our unique test email.
      const result = await db.execute(
        sql`SELECT id, email, message FROM contact_submission WHERE email = ${testEmail} LIMIT 1`,
      );
      expect(result.rows.length).toBe(1);
      const row = result.rows[0] as {
        id: string;
        email: string;
        message: string;
      };
      expect(row.message).toContain('Automated e2e test message');
    } finally {
      await db.execute(
        sql`DELETE FROM contact_submission WHERE email = ${testEmail}`,
      );
    }
  });

  test('product-page sticky CTA opens modal -> submit prepends product context to message body', async ({
    page,
  }) => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const testEmail = `e2e-contact-prod-${randomUUID()}@example.com`;

    if (Object.keys(extraHeaders).length > 0) {
      await page.context().setExtraHTTPHeaders(extraHeaders);
    }

    try {
      // Reuses the seeded `manometr-m-100` product slug (Phase 3 seed-public
      // baseline). If the preview deployment uses a different slug, swap
      // here and document in 05-05-SUMMARY.
      await page.goto(`${baseURL}/uz/products/manometr-m-100`);

      // Sticky CTA on product detail wraps a ContactButton -> Dialog trigger.
      // The trigger renders Button with data-testid="contact-button" inside
      // a sticky rail wrapper carrying data-testid="cta-request-price".
      // Use the testid path (locale-agnostic, decoupled from translation copy).
      await page.getByTestId('contact-button').first().click();

      // Modal mounts the same ContactForm SSOT in mode="modal" (D-01 SSOT).
      await expect(page.getByTestId('contact-form')).toBeVisible();

      await page.getByTestId('contact-name').fill('Product Inquiry User');
      await page.getByTestId('contact-email').fill(testEmail);
      await page
        .getByTestId('contact-message')
        .fill('I need a quote for this manometer.');

      await page.waitForFunction(
        () => {
          const tokenInput = document.querySelector(
            'input[name="turnstileToken"]',
          ) as HTMLInputElement | null;
          return !!tokenInput && tokenInput.value.length > 0;
        },
        { timeout: 15_000 },
      );

      await page.getByTestId('contact-submit').click();

      // Modal-mode success: onSuccess fires -> setOpen(false) -> Dialog
      // unmounts. Wait for the dialog to disappear from the DOM as the
      // success signal (mode="modal" doesn't render the contact-success
      // testid — that's the page-mode branch only).
      await page.waitForFunction(
        () => !document.querySelector('[role="dialog"]'),
        { timeout: 10_000 },
      );

      // DB-direct verification — message body contains the user's typed
      // text AND a product-context line (server-side D-03 prepend). The
      // exact prefix copy is locale-dependent ("Inquiry about: …") so we
      // assert on the SKU/slug substring which is locale-agnostic.
      const result = await db.execute(
        sql`SELECT message FROM contact_submission WHERE email = ${testEmail} LIMIT 1`,
      );
      expect(result.rows.length).toBe(1);
      const msg = (result.rows[0] as { message: string }).message;
      expect(msg).toMatch(/manometr-m-100|MD-100|MM-100/i);
      expect(msg).toContain('I need a quote for this manometer.');
    } finally {
      await db.execute(
        sql`DELETE FROM contact_submission WHERE email = ${testEmail}`,
      );
    }
  });
});
