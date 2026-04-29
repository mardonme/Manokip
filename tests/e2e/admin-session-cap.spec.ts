import { test, expect } from '@playwright/test';
import { sql as sqlTag } from 'drizzle-orm';
import { createActiveAdminSession } from '../_fixtures/admin-session';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

/**
 * Plan 02-03 PROXY-SESSION-CAP — D-15 dual cap (24h idle + 7d absolute)
 * end-to-end probe — FLIPPED LIVE BY PLAN 02-17.
 *
 * Plan 02-03 landed the proxy.ts middleware modification that reads the
 * backing `sessions` row on every /[locale]/admin/* request and 307s to
 * /[locale]/login when EITHER `expires < now()` OR
 * `absolute_expires < now()`, with Set-Cookie clears (Max-Age=0) on the
 * redirect. Plan 02-04 landed the createActiveAdminSession() fixture that
 * inserts admin_user + auth_users + sessions rows directly into Neon.
 * Plan 02-17 (this commit) flips the three previously-fixmed tests to live
 * by composing the fixture with stamped expiry offsets.
 *
 * Three cases:
 *   1. absolute_expires already past (expires still future) → reject
 *   2. expires already past (absolute_expires still future) → reject
 *   3. both windows valid → pass (no /login redirect)
 *
 * Closest existing analog: tests/e2e/admin-gate.spec.ts (HTTP probe with
 * maxRedirects:0 + status/headers assertions on the 307).
 */

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('D-15 absolute session cap (proxy.ts)', () => {
  test('expired absolute_expires → 307 to /uz/login + clear cookies', async ({
    request,
  }) => {
    requireTestDatabaseUrl();
    const session = await createActiveAdminSession({
      absoluteExpiresOffsetSec: -3600, // 1h past
    });
    try {
      const res = await request.get(`${baseURL}/uz/admin/products`, {
        headers: { cookie: `authjs.session-token=${session.cookieValue}` },
        maxRedirects: 0,
      });
      expect(res.status()).toBe(307);
      expect(res.headers()['location']).toContain('/uz/login');
      const setCookie = res.headers()['set-cookie'] ?? '';
      expect(setCookie).toMatch(/Max-Age=0/);
      expect(setCookie).toContain('authjs.session-token=');
    } finally {
      await session.cleanup();
    }
  });

  test('expired sessions.expires (24h idle) → 307 to /uz/login + clear cookies', async ({
    request,
  }) => {
    requireTestDatabaseUrl();
    const session = await createActiveAdminSession({
      expiresOffsetSec: -60, // sessions.expires is 1 minute past
      absoluteExpiresOffsetSec: 60 * 60 * 24, // absolute still valid
    });
    try {
      const res = await request.get(`${baseURL}/uz/admin/products`, {
        headers: { cookie: `authjs.session-token=${session.cookieValue}` },
        maxRedirects: 0,
      });
      expect(res.status()).toBe(307);
      expect(res.headers()['location']).toContain('/uz/login');
      expect(res.headers()['set-cookie'] ?? '').toMatch(/Max-Age=0/);
    } finally {
      await session.cleanup();
    }
  });

  test('valid absolute_expires + valid expires → passes admin gate', async ({
    request,
  }) => {
    requireTestDatabaseUrl();
    const session = await createActiveAdminSession();
    try {
      const res = await request.get(`${baseURL}/uz/admin/products`, {
        headers: { cookie: `authjs.session-token=${session.cookieValue}` },
        maxRedirects: 0,
      });
      // The request passes the proxy gate. It may still 307 to a non-/login
      // location for OTHER reasons (locale rewrite, etc.), but it MUST NOT
      // 307 to /[locale]/login (which is the proxy's reject signal).
      const location = res.headers()['location'] ?? '';
      expect(
        location.endsWith('/uz/login') || location === '/uz/login',
      ).toBe(false);
    } finally {
      await session.cleanup();
    }
  });
});

// Re-export the drizzle sql tag so future per-file ad-hoc DB checks (e.g.
// asserting the sessions row was deleted by the redirect's Set-Cookie path)
// have a typed entry point without a second import line. Keeps the import
// list stable as the spec evolves.
void sqlTag;
void getTestDb;
