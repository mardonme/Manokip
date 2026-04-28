import { test, expect } from '@playwright/test';

/**
 * Plan 02-03 PROXY-SESSION-CAP — D-15 dual cap (24h idle + 7d absolute)
 * end-to-end probe.
 *
 * The middleware in `proxy.ts` (modified by plan 02-03) now reads the
 * backing `sessions` row on every /[locale]/admin/* request and 307s to
 * /[locale]/login when EITHER `expires < now()` OR
 * `absolute_expires < now()`, with Set-Cookie clears (Max-Age=0) on the
 * redirect. This spec asserts both halves of that contract by stamping
 * `sessions` rows directly via the test DB and probing the gate via HTTP.
 *
 * TODO(02-04): the `tests/_fixtures/admin-session.ts` helper that
 * createExpiredAdminSession / createValidAdminSession depend on lands in
 * plan 02-04 (LIB-AUDIT). The spec is committed in `test.fixme` form so
 * --list emits both tests; plan 02-17 (REVALIDATION-E2E-GATE) is the
 * agent that flips fixme → test once the fixture file exists. The
 * implementation is intentionally complete (commented body) so the flip
 * is a one-line edit per test (drop the `.fixme`, uncomment the body).
 *
 * Closest existing analog: tests/e2e/admin-gate.spec.ts (HTTP probe with
 * maxRedirects:0 + status/headers assertions on the 307).
 */

test.describe('D-15 absolute session cap (proxy.ts)', () => {
  test.fixme(
    'expired absolute_expires → 307 to /uz/login + clear cookies',
    async (/* { request } */) => {
      // TODO(02-04): uncomment once tests/_fixtures/admin-session.ts lands.
      //
      // import { sql as sqlTag } from "drizzle-orm";
      // import { createExpiredAdminSession } from "../_fixtures/admin-session";
      //
      // const baseURL = process.env.BASE_URL || "http://localhost:3000";
      // const { cookieValue } = await createExpiredAdminSession({
      //   absoluteExpiresOffsetSec: -3600, // 1h past
      // });
      // const res = await request.get(`${baseURL}/uz/admin/products`, {
      //   headers: { cookie: `authjs.session-token=${cookieValue}` },
      //   maxRedirects: 0,
      // });
      // expect(res.status()).toBe(307);
      // expect(res.headers()["location"]).toContain("/uz/login");
      // const setCookie = res.headers()["set-cookie"] ?? "";
      // expect(setCookie).toMatch(/Max-Age=0/);
      // expect(setCookie).toContain("authjs.session-token=");
    },
  );

  test.fixme(
    'expired sessions.expires (24h idle) → 307 to /uz/login + clear cookies',
    async (/* { request } */) => {
      // TODO(02-04): uncomment once tests/_fixtures/admin-session.ts lands.
      //
      // import { createExpiredAdminSession } from "../_fixtures/admin-session";
      //
      // const baseURL = process.env.BASE_URL || "http://localhost:3000";
      // const { cookieValue } = await createExpiredAdminSession({
      //   expiresOffsetSec: -60, // sessions.expires is 1 minute past
      //   absoluteExpiresOffsetSec: 60 * 60 * 24, // absolute still valid
      // });
      // const res = await request.get(`${baseURL}/uz/admin/products`, {
      //   headers: { cookie: `authjs.session-token=${cookieValue}` },
      //   maxRedirects: 0,
      // });
      // expect(res.status()).toBe(307);
      // expect(res.headers()["location"]).toContain("/uz/login");
      // expect(res.headers()["set-cookie"] ?? "").toMatch(/Max-Age=0/);
    },
  );

  test.fixme(
    'valid absolute_expires + valid expires → passes admin gate',
    async (/* { request } */) => {
      // TODO(02-04): uncomment once tests/_fixtures/admin-session.ts lands.
      //
      // import { createValidAdminSession } from "../_fixtures/admin-session";
      //
      // const baseURL = process.env.BASE_URL || "http://localhost:3000";
      // const { cookieValue } = await createValidAdminSession();
      // const res = await request.get(`${baseURL}/uz/admin/products`, {
      //   headers: { cookie: `authjs.session-token=${cookieValue}` },
      //   maxRedirects: 0,
      // });
      // // The request passes the proxy gate. It may still 307 to a non-/login
      // // location for OTHER reasons (locale rewrite, etc.), but it MUST NOT
      // // 307 to /[locale]/login (which is the proxy's reject signal).
      // const location = res.headers()["location"] ?? "";
      // expect(location.endsWith("/uz/login") || location === "/uz/login").toBe(false);
    },
  );
});

// Suppress unused-import warning from `expect` while the fixme bodies are
// commented out — `expect` will be used once the fixture lands. Keeping
// the import in place means the flip in 02-17 is purely a body uncomment.
void expect;
