import { test, expect } from '@playwright/test';

// FOUND-03: locale redirect behavior.
//
// The `/` -> `/uz/` redirect and the cookie / Accept-Language overrides are
// powered by next-intl middleware, which lands in Plan 01-06 (middleware
// composes next-intl + Auth.js admin gate; Next.js only allows one
// `middleware.ts`). Until that plan ships, the first two redirect-behavior
// tests here FAIL by design — they seed the validation matrix so plan 06's
// verify command drives them to green.
//
// The `/uz/`, `/ru/`, `/en/` direct-route tests DO pass today because the
// [locale]/layout.tsx already renders with the correct <html lang>. Same for
// the invalid-locale 404 test (notFound() in the layout catches it).
//
// TODO(01-06): enable redirect-dependent assertions once middleware ships.
test.describe('FOUND-03: locale redirect behavior (depends on plan 06 middleware)', () => {
  test('GET / redirects to /uz/ when no cookie and no Accept-Language preference', async ({ request }) => {
    const response = await request.get('/', {
      headers: { 'Accept-Language': '*' },
      maxRedirects: 0,
    });
    expect([307, 308]).toContain(response.status());
    expect(response.headers()['location']).toMatch(/\/uz\/?$/);
  });

  test('GET / with cookie NEXT_LOCALE=ru redirects to /ru/', async ({ request }) => {
    const response = await request.get('/', {
      headers: { Cookie: 'NEXT_LOCALE=ru' },
      maxRedirects: 0,
    });
    expect([307, 308]).toContain(response.status());
    expect(response.headers()['location']).toMatch(/\/ru\/?$/);
  });

  test('GET /uz/ returns 200 with <html lang="uz">', async ({ page }) => {
    await page.goto('/uz/');
    const html = await page.content();
    expect(html).toMatch(/<html[^>]*lang="uz"/);
  });

  test('GET /ru/ returns 200 with <html lang="ru">', async ({ page }) => {
    await page.goto('/ru/');
    const html = await page.content();
    expect(html).toMatch(/<html[^>]*lang="ru"/);
  });

  test('GET /en/ returns 200 with <html lang="en">', async ({ page }) => {
    await page.goto('/en/');
    const html = await page.content();
    expect(html).toMatch(/<html[^>]*lang="en"/);
  });

  test('GET /xx/ (invalid locale) returns 404', async ({ request }) => {
    const response = await request.get('/xx/', { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });
});
