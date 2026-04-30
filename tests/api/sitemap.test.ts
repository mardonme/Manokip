// Plan 03-01 Task 1.3 — RED stub for SEO-03 (per-locale sitemap XML).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 08 (sitemap-{locale}.xml route handlers + sitemap-index.xml +
// robots.txt).

import { describe, it } from 'vitest';

// import { seedPublicFixture } from '../fixtures/seed-public'; // Plan 08 wires this up

describe.skip('sitemap XML (SEO-03; closed by plan 08)', () => {
  it('SEO-03: /sitemap-uz.xml lists all 6 published products with uz slugs', () => {
    // TODO Plan 08: GET /sitemap-uz.xml → assert response Content-Type is
    // application/xml; body contains <loc>${host}/uz/products/manometr-m-100</loc>
    // for each of the 6 seeded products.
  });
  it('SEO-03: /sitemap-ru.xml uses ru-locale slugs (different from uz)', () => {
    // TODO Plan 08: GET /sitemap-ru.xml → expects manometr-m-100-ru not
    // manometr-m-100 (ru slugs differ per fixture).
  });
  it('SEO-03: /sitemap-index.xml references all 3 per-locale sitemaps', () => {
    // TODO Plan 08: sitemap-index points to sitemap-uz.xml, sitemap-ru.xml,
    // sitemap-en.xml.
  });
  it('SEO-03: /robots.txt references sitemap-index.xml', () => {
    // TODO Plan 08: robots.txt body includes Sitemap: ${host}/sitemap-index.xml.
  });
});
