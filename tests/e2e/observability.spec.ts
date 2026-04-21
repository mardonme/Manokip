import { test, expect } from '@playwright/test';

// FOUND-07: Vercel Analytics + Speed Insights beacons mounted in [locale]/layout.tsx.
//
// These tests hit a running Next.js server (local `pnpm dev` or a Vercel
// preview URL via TEST_BASE_URL) and assert the client bundle's script tags
// are present in /uz/ HTML. Both @vercel/analytics and @vercel/speed-insights
// inject their scripts at render time.
test.describe('FOUND-07: Vercel Analytics + Speed Insights scripts in locale layout', () => {
  test('GET /uz/ includes Vercel Analytics script', async ({ page }) => {
    await page.goto('/uz/');
    // @vercel/analytics/next injects a script pointing at /_vercel/insights/script.js
    // (prod) or va.vercel-scripts.com (preview). In dev, the import still resolves
    // and a reference to @vercel/analytics ends up in the HTML.
    const html = await page.content();
    const hasAnalytics =
      /_vercel\/insights\/script/.test(html) ||
      /va\.vercel-scripts\.com/.test(html) ||
      /@vercel\/analytics/.test(html);
    expect(hasAnalytics, 'Vercel Analytics script not found in page HTML').toBe(true);
  });

  test('GET /uz/ includes Speed Insights script', async ({ page }) => {
    await page.goto('/uz/');
    const html = await page.content();
    const hasSI =
      /speed-insights/.test(html) ||
      /_vercel\/speed-insights/.test(html);
    expect(hasSI, 'Speed Insights script not found in page HTML').toBe(true);
  });
});
