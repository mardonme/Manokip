import { test, expect } from '@playwright/test';

// FOUND-03 / T-ADMIN-GATE: unauthenticated /[locale]/admin MUST 307-redirect
// to /[locale]/login. The redirect is emitted by the Edge middleware at
// `middleware.ts` — it is NOT the responsibility of `requireAdmin()` in the
// admin RSC (that helper runs only after the Edge gate passes; unauth
// requests never reach it).
//
// The admin-path regex is `/^\/(uz|ru|en)\/admin(\/|$)/` so `/administrator`
// does NOT match and is NOT gated (regex precision test at the bottom).

test.describe('FOUND-03 / T-ADMIN-GATE: unauthenticated /[locale]/admin redirects to /[locale]/login', () => {
  for (const locale of ['uz', 'ru', 'en'] as const) {
    test(`GET /${locale}/admin/ (no session) -> 307 /${locale}/login`, async ({ request }) => {
      const response = await request.get(`/${locale}/admin/`, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers()['location']).toMatch(new RegExp(`/${locale}/login/?$`));
    });

    test(`GET /${locale}/admin/subpath (no session) -> 307 /${locale}/login`, async ({ request }) => {
      const response = await request.get(`/${locale}/admin/settings`, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers()['location']).toMatch(new RegExp(`/${locale}/login/?$`));
    });

    test(`GET /${locale}/login (no session) -> 200 (login form is public)`, async ({ request }) => {
      const response = await request.get(`/${locale}/login`, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
    });
  }

  test('GET /uz/administrator (note: not /admin) is NOT gated (regex precision)', async ({ request }) => {
    // The regex /^\/(uz|ru|en)\/admin(\/|$)/ requires admin to be followed by
    // `/` or end-of-string. /administrator has no segment boundary, so it
    // should reach the app (404 in Phase 1, but NOT redirect to login).
    const response = await request.get('/uz/administrator', { maxRedirects: 0 });
    expect(response.status()).not.toBe(307);
  });
});
