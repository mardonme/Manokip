// Plan 03-08 Task 8.1 — SEO-03 sitemap + robots.txt tests.
//
// Live-Neon tests for the per-locale sitemap builder + XML renderer + the 4
// route handlers (sitemap-uz/ru/en + sitemap-index) + robots.txt. Tests
// import helpers and route GETs directly — no HTTP server.
//
// Test infrastructure follows the autocomplete pattern (vi.mock('next/cache')
// to satisfy the `cacheTag` import without spinning up Next 16's cache
// runtime; live-Neon access via getTestDb + requireTestDatabaseUrl).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip
// (provides the 6 published products + 2 categories + 3 manufacturers used
// by the sitemap entry-count assertion).

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

import { requireTestDatabaseUrl } from '../_fixtures/db';
import {
  seedPublicFixture,
  teardownPublicFixture,
  type PublicFixtureIds,
} from '../fixtures/seed-public';
import {
  buildLocaleSitemapEntries,
  renderUrlsetXml,
  escapeXml,
} from '@/lib/sitemap';
import { GET as getSitemapUz } from '@/app/sitemap-uz.xml/route';
import { GET as getSitemapRu } from '@/app/sitemap-ru.xml/route';
import { GET as getSitemapEn } from '@/app/sitemap-en.xml/route';
import { GET as getSitemapIndex } from '@/app/sitemap-index.xml/route';
import { GET as getRobots } from '@/app/robots.txt/route';

let ids: PublicFixtureIds;

describe('sitemap XML (SEO-03; live Neon)', () => {
  beforeAll(async () => {
    requireTestDatabaseUrl();
    ids = await seedPublicFixture();
  }, 60_000);

  afterAll(async () => {
    if (ids) await teardownPublicFixture(ids);
  }, 30_000);

  it('SEO-03: buildLocaleSitemapEntries(uz) includes static paths + every published product, category, manufacturer in uz locale', async () => {
    const entries = await buildLocaleSitemapEntries('uz');
    // 3 static paths (root, categories, manufacturers) + 6 products + 2 categories + 3 manufacturers = 14 minimum
    expect(entries.length).toBeGreaterThanOrEqual(14);

    // Every entry has a loc + alternates
    for (const e of entries) {
      expect(e.loc).toMatch(/^https:\/\/manometr\.uz\/uz/);
      expect(e.alternates).toBeDefined();
    }

    // At least one product entry from the seed (M-100 in uz is "manometr-m-100")
    const productEntry = entries.find((e) =>
      e.loc.endsWith('/uz/products/manometr-m-100'),
    );
    expect(productEntry).toBeDefined();
  }, 30_000);

  it('SEO-03: ru sitemap uses ru-locale slugs (different from uz)', async () => {
    const entries = await buildLocaleSitemapEntries('ru');
    const productEntry = entries.find((e) =>
      e.loc.endsWith('/ru/products/manometr-m-100-ru'),
    );
    expect(productEntry).toBeDefined();
    // ru variant URL exists; uz variant URL must NOT (different slug)
    const uzSluggedAsRu = entries.find((e) =>
      e.loc.endsWith('/ru/products/manometr-m-100'),
    );
    expect(uzSluggedAsRu).toBeUndefined();
  }, 30_000);

  it('SEO-03: renderUrlsetXml emits <xhtml:link rel="alternate" hreflang="..."> for each locale variant', () => {
    const xml = renderUrlsetXml([
      {
        loc: 'https://manometr.uz/uz/products/foo',
        lastmod: '2026-01-01T00:00:00Z',
        alternates: {
          uz: 'https://manometr.uz/uz/products/foo',
          ru: 'https://manometr.uz/ru/products/foo-ru',
          en: 'https://manometr.uz/en/products/foo-en',
        },
      },
    ]);
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="uz"');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ru"');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en"');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );
  });

  it('SEO-03: x-default alternate points to uz variant', () => {
    const xml = renderUrlsetXml([
      {
        loc: 'https://manometr.uz/en/products/foo',
        alternates: {
          uz: 'https://manometr.uz/uz/products/foo',
          ru: 'https://manometr.uz/ru/products/foo-ru',
          en: 'https://manometr.uz/en/products/foo',
        },
      },
    ]);
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://manometr.uz/uz/products/foo"',
    );
  });

  it('SEO-03: escapeXml escapes &, <, >, ", apostrophe', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeXml("it's")).toBe('it&apos;s');
    expect(escapeXml('clean')).toBe('clean');
  });

  it('SEO-03: /sitemap-uz.xml route returns Content-Type application/xml', async () => {
    const res = await getSitemapUz();
    expect(res.headers.get('Content-Type')).toMatch(/application\/xml/);
    const body = await res.text();
    expect(body).toContain('<?xml version="1.0"');
    expect(body).toContain('<urlset');
  }, 30_000);

  it('SEO-03: /sitemap-ru.xml + /sitemap-en.xml return Content-Type application/xml', async () => {
    const ruRes = await getSitemapRu();
    expect(ruRes.headers.get('Content-Type')).toMatch(/application\/xml/);
    const enRes = await getSitemapEn();
    expect(enRes.headers.get('Content-Type')).toMatch(/application\/xml/);
  }, 30_000);

  it('SEO-03: /sitemap-index.xml lists 3 sitemap children (uz, ru, en)', async () => {
    const res = await getSitemapIndex();
    expect(res.headers.get('Content-Type')).toMatch(/application\/xml/);
    const body = await res.text();
    expect(body).toContain('<sitemapindex');
    expect(body).toContain('<loc>https://manometr.uz/sitemap-uz.xml</loc>');
    expect(body).toContain('<loc>https://manometr.uz/sitemap-ru.xml</loc>');
    expect(body).toContain('<loc>https://manometr.uz/sitemap-en.xml</loc>');
  });

  it('SEO-03: /robots.txt allows all + references sitemap-index.xml', async () => {
    const res = await getRobots();
    expect(res.headers.get('Content-Type')).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://manometr.uz/sitemap-index.xml');
  });
});
