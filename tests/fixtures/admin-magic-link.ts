// Plan 04-12 Task 12.2 — extracted DRY helper for admin magic-link auth in
// Playwright e2e specs.
//
// The pattern was inlined in tests/e2e/admin-edit-revalidates.spec.ts (Plan
// 02-17 — Pitfall #12 DB-direct verification token consumption). Phase-4 plan
// 04-12 calls for two more admin-flow specs (admin-recipe-form +
// admin-industry-form), so we lift the pattern here once and reuse it.
//
// Posture (mirrors admin-edit-revalidates.spec.ts):
//   1. Ensure admin_user(active=true) row for the e2e admin email.
//   2. POST /[locale]/login with the email — Auth.js Resend provider writes a
//      verification_tokens row even when the Resend send is mocked / suppressed.
//   3. SELECT the latest verification_tokens row DB-direct.
//   4. Navigate the browser context to /api/auth/callback/resend?token=...&email=...
//      — Auth.js sets the session cookie + redirects to callbackUrl.
//
// Uses the same VERCEL_AUTOMATION_BYPASS_SECRET branch for Pitfall #11 when
// running against a Vercel preview with Deployment Protection ON.

import type { Page } from '@playwright/test';
import { sql } from 'drizzle-orm';
import { getTestDb } from '../_fixtures/db';

export interface LoginAsAdminOptions {
  baseURL: string;
  /** Admin email; ON CONFLICT updates active=true + role='admin'. */
  email: string;
  /** Locale prefix (uz | ru | en). */
  locale?: 'uz' | 'ru' | 'en';
  /** callbackUrl to redirect to after the magic-link callback resolves. */
  callbackPath?: string;
  /** Pitfall #11 — Vercel Deployment Protection bypass header. */
  protectionBypassHeader?: Record<string, string>;
}

/**
 * Logs the given Page in as an admin via the DB-direct verification_tokens
 * consumption pattern. Pitfall #12 — bypasses Resend deliverability.
 *
 * After return, `page` is on the callbackPath URL with a valid Auth.js session
 * cookie. The caller can immediately page.goto() into protected admin routes.
 */
export async function loginAsAdminViaDirectToken(
  page: Page,
  opts: LoginAsAdminOptions,
): Promise<void> {
  const db = await getTestDb();
  const locale = opts.locale ?? 'uz';
  const callbackPath = opts.callbackPath ?? `/${locale}/admin`;
  const extraHeaders = opts.protectionBypassHeader ?? {};

  // 1. ensure admin row.
  await db.execute(sql`
    INSERT INTO admin_user (email, role, active)
    VALUES (${opts.email}, 'admin', true)
    ON CONFLICT (email) DO UPDATE SET active = true, role = 'admin'
  `);

  // 2. trigger sign-in to write verification_tokens row.
  await page.request.post(`${opts.baseURL}/${locale}/login`, {
    form: { email: opts.email, locale },
    headers: extraHeaders,
    maxRedirects: 0,
  });

  // 3. read the latest verification token DB-direct.
  const tokenRow = await db.execute(sql`
    SELECT identifier, token, expires
      FROM verification_tokens
     WHERE identifier = ${opts.email}
     ORDER BY expires DESC
     LIMIT 1
  `);
  const tokenRecord = tokenRow.rows[0] as
    | { identifier: string; token: string; expires: Date }
    | undefined;
  if (!tokenRecord) {
    throw new Error(
      'loginAsAdminViaDirectToken: verification_tokens row missing — sign-in did not register a token. ' +
        'Either sendVerificationRequest short-circuited (admin_user inactive) or the Resend provider is misconfigured.',
    );
  }

  // 4. follow the magic-link callback URL.
  const params = new URLSearchParams({
    callbackUrl: `${opts.baseURL}${callbackPath}`,
    token: tokenRecord.token,
    email: opts.email,
  });
  const callbackUrl = `${opts.baseURL}/api/auth/callback/resend?${params.toString()}`;

  if (Object.keys(extraHeaders).length > 0) {
    await page.context().setExtraHTTPHeaders(extraHeaders);
  }
  await page.goto(callbackUrl);
}

/** Cleanup: drops verification_tokens for the given email. Idempotent. */
export async function cleanupAdminVerificationTokens(
  email: string,
): Promise<void> {
  const db = await getTestDb();
  await db.execute(
    sql`DELETE FROM verification_tokens WHERE identifier = ${email}`,
  );
}
