import { test, expect } from '@playwright/test';

/**
 * DOCUMENTED-MANUAL test for FOUND-05 magic-link round-trip.
 *
 * This test is SKIPPED in CI because it requires:
 *   1. A live Resend API key (`AUTH_RESEND_KEY`) with a verified domain
 *   2. A way to intercept the sent email (not available in Resend's free tier)
 *   3. `BOOTSTRAP_ADMIN_EMAIL` to be set to a mailbox the test can read from
 *
 * A developer can run this locally WITH a Resend sandbox + email-intercept tool
 * (MailHog, Mailtrap, etc.) by setting `RUN_MAGIC_LINK_TEST=1` + the above env
 * vars and wiring `pollForMagicLink` to their chosen tool.
 *
 * Manual equivalent: see plan 06 Task 06.3 checkpoint (10-step browser
 * walkthrough in .planning/phases/01-foundations/01-06-PLAN.md).
 */
test.describe('FOUND-05: magic-link round-trip (documented-manual)', () => {
  test.skip(
    process.env.RUN_MAGIC_LINK_TEST !== '1',
    'Requires live Resend + email intercept; see Task 06.3 for manual steps',
  );

  test('bootstrap admin can complete magic-link round-trip → lands on /uz/admin', async ({ page }) => {
    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
    if (!adminEmail) throw new Error('Set BOOTSTRAP_ADMIN_EMAIL to run this test');

    // 1. Visit login page.
    await page.goto('/uz/login');
    await expect(page.locator('h1')).toHaveText(/Kirish/);

    // 2. Submit email.
    await page.fill('input[name="email"]', adminEmail);
    await page.click('button[type="submit"]');

    // 3. Poll the email-intercept tool for the magic link.
    //    Developer must implement pollForMagicLink(adminEmail) against their
    //    chosen tool (MailHog HTTP API, Mailtrap API, Resend webhook capture).
    const magicLinkUrl = await pollForMagicLink(adminEmail);
    expect(magicLinkUrl).toMatch(/\/api\/auth\/callback\/resend/);

    // 4. Navigate to the magic link.
    await page.goto(magicLinkUrl);

    // 5. Expect landing on /uz/admin.
    await expect(page).toHaveURL(/\/uz\/admin/);
    await expect(page.locator('h1')).toHaveText(/Admin/);

    // 6. Verify the session cookie is set.
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name.includes('authjs.session-token'));
    expect(sessionCookie).toBeDefined();
  });
});

async function pollForMagicLink(_email: string): Promise<string> {
  // Stub — developer plugs in their chosen email-intercept tool here.
  // Example options: MailHog HTTP API, Mailtrap API, Resend Webhooks to a
  // local listener. Until wired, this throws to make accidental CI runs
  // (if the skip gate is ever removed) fail loudly rather than silently.
  throw new Error(
    'pollForMagicLink is not implemented. Connect MailHog/Mailtrap or a Resend webhook capture here.',
  );
}
