// Plan 03-09 Task 9.1 — SEO coverage sweep (cross-page hreflang + canonical +
// JSON-LD shape + sitemap/robots smoke).
//
// THE Phase-3 closure spec. Sweeps the four public route shapes that Phase 3
// renders (homepage / category listing / product detail / manufacturer detail)
// and asserts that every one emits the SEO-01 + SEO-02 contract:
//
//   - <link rel="alternate" hreflang="uz|ru|en|x-default" /> (Pitfall #6: never
//     advertise a 404 — every emitted hreflang URL must be reachable)
//   - <link rel="canonical" href="https://manometr.uz/{locale}..." /> for the
//     current request locale
//   - JSON-LD shape per route type (Product+BreadcrumbList for product detail;
//     CollectionPage for category listing — CAT-08, D-08)
//   - /robots.txt + /sitemap-index.xml + /sitemap-uz.xml return 200 with the
//     correct Content-Type and reference each other (SEO-03 cross-link smoke)
//
// Plan 03-05 SUMMARY documented the seed-vs-plan slug drift: the plan literal
// references `/uz/products/manometr-100` but tests/fixtures/seed-public.ts
// line 108 seeds the M-100 product's uz slug as `manometr-m-100`. This spec
// uses the actual seed slug — same Rule-1 fix as the product-detail.spec.ts
// in Plan 03-05.
//
// Pitfall #11 (Vercel Deployment Protection) is handled at the playwright
// config layer — extraHTTPHeaders threads `x-vercel-protection-bypass` from
// VERCEL_AUTOMATION_BYPASS_SECRET when set. No per-spec wiring needed.
//
// BASE_URL precedence (from playwright.config.ts):
//   BASE_URL (CI) → TEST_BASE_URL (Phase-1 local) → http://localhost:3000.
// The whole spec runs as HTTP request-level assertions (no page navigation),
// so it works equally on `next dev`, `next start`, and a Vercel preview URL.

import { test, expect } from '@playwright/test';

const baseURL =
  process.env.BASE_URL ?? process.env.TEST_BASE_URL ?? 'http://localhost:3000';

// Public route fixtures — the four route shapes Phase 3 renders. Slugs come
// from tests/fixtures/seed-public.ts (deterministic UUID + slug fixture); a
// preview deployment that has run seedPublicFixture() against its branch DB
// will resolve every probe.
const PAGES: Array<{ name: string; path: string }> = [
  { name: 'homepage', path: '/uz' },
  { name: 'category listing', path: '/uz/categories/manometr' },
  { name: 'product detail', path: '/uz/products/manometr-m-100' },
  { name: 'manufacturer detail', path: '/uz/manufacturers/wika' },
];

test.describe('SEO coverage — hreflang + canonical sweep across public route shapes', () => {
  for (const p of PAGES) {
    test(`SEO-01 + SEO-02: ${p.name} emits hreflang for uz/ru/en + x-default + canonical`, async ({
      request,
    }) => {
      const r = await request.get(`${baseURL}${p.path}`);
      expect(r.status(), `${p.path} returned ${r.status()}`).toBeLessThan(400);
      const html = await r.text();

      // 4 hreflang variants (uz, ru, en, x-default). Pitfall #6: when a
      // translation is missing, that locale is omitted; the seedPublicFixture
      // populates all 3 locales for every entity it seeds, so every probed
      // route must emit all 4 alternates.
      expect(html, 'hreflang="uz" missing').toMatch(
        /<link[^>]*rel="alternate"[^>]*hreflang="uz"/,
      );
      expect(html, 'hreflang="ru" missing').toMatch(
        /<link[^>]*rel="alternate"[^>]*hreflang="ru"/,
      );
      expect(html, 'hreflang="en" missing').toMatch(
        /<link[^>]*rel="alternate"[^>]*hreflang="en"/,
      );
      expect(html, 'hreflang="x-default" missing').toMatch(
        /<link[^>]*rel="alternate"[^>]*hreflang="x-default"/,
      );

      // Canonical present and points to the current locale on the production
      // host (buildAlternates() in src/lib/metadata.ts hard-codes SITE_HOST =
      // 'https://manometr.uz' — Next.js renders that exact host even on a
      // Vercel preview URL because the canonical is content, not request).
      expect(html, 'canonical missing or wrong host/locale').toMatch(
        /<link[^>]*rel="canonical"[^>]*href="https:\/\/manometr\.uz\/uz/,
      );
    });
  }

  test('CAT-08: product detail emits Product + BreadcrumbList JSON-LD without offers (D-08)', async ({
    request,
  }) => {
    const r = await request.get(`${baseURL}/uz/products/manometr-m-100`);
    expect(r.status()).toBeLessThan(400);
    const html = await r.text();

    const matches = [
      ...html.matchAll(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ];
    expect(
      matches.length,
      'no JSON-LD <script> blocks rendered on product detail',
    ).toBeGreaterThan(0);

    const schemas = matches.map((m) => {
      try {
        return JSON.parse(m[1]!);
      } catch (e) {
        throw new Error(
          `JSON-LD block failed to parse: ${(e as Error).message} — body: ${m[1]?.slice(0, 200)}`,
        );
      }
    });

    const product = schemas.find(
      (s: { '@type'?: string }) => s['@type'] === 'Product',
    );
    expect(product, 'Product JSON-LD missing on product detail').toBeTruthy();
    // D-08: no offers — Manometr is a B2B catalog, not a store. Asserting
    // offers is undefined locks the contract structurally.
    expect(
      (product as { offers?: unknown }).offers,
      'Product JSON-LD must NOT carry offers (D-08 — catalog, not store)',
    ).toBeUndefined();

    const breadcrumb = schemas.find(
      (s: { '@type'?: string }) => s['@type'] === 'BreadcrumbList',
    );
    expect(
      breadcrumb,
      'BreadcrumbList JSON-LD missing on product detail',
    ).toBeTruthy();
  });

  test('CAT-08: category listing emits CollectionPage JSON-LD', async ({
    request,
  }) => {
    const r = await request.get(`${baseURL}/uz/categories/manometr`);
    expect(r.status()).toBeLessThan(400);
    const html = await r.text();

    const matches = [
      ...html.matchAll(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ];
    const schemas = matches.map((m) => JSON.parse(m[1]!));
    expect(
      schemas.find((s: { '@type'?: string }) => s['@type'] === 'CollectionPage'),
      'CollectionPage JSON-LD missing on category listing',
    ).toBeTruthy();
  });

  test('SEO-03: /robots.txt + /sitemap-index.xml + /sitemap-uz.xml return 200 with correct Content-Type and cross-link', async ({
    request,
  }) => {
    // robots.txt
    const robots = await request.get(`${baseURL}/robots.txt`);
    expect(robots.status()).toBe(200);
    expect(robots.headers()['content-type']).toMatch(/text\/plain/);
    const robotsBody = await robots.text();
    expect(robotsBody).toMatch(
      /Sitemap:\s*https:\/\/manometr\.uz\/sitemap-index\.xml/,
    );

    // sitemap-index.xml
    const idx = await request.get(`${baseURL}/sitemap-index.xml`);
    expect(idx.status()).toBe(200);
    expect(idx.headers()['content-type']).toMatch(/application\/xml/);
    const idxBody = await idx.text();
    expect(idxBody).toContain('<sitemapindex');
    expect(idxBody).toContain('sitemap-uz.xml');
    expect(idxBody).toContain('sitemap-ru.xml');
    expect(idxBody).toContain('sitemap-en.xml');

    // per-locale sitemap (uz)
    const uz = await request.get(`${baseURL}/sitemap-uz.xml`);
    expect(uz.status()).toBe(200);
    expect(uz.headers()['content-type']).toMatch(/application\/xml/);
    const uzBody = await uz.text();
    expect(uzBody).toContain('<urlset');
    // Per-entry hreflang alternates — Search Console reads these as the
    // authoritative i18n signal (Plan 03-08 Task 8.1).
    expect(uzBody).toMatch(
      /<xhtml:link[^>]*rel="alternate"[^>]*hreflang="uz"/,
    );
  });
});
