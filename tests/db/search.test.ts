// Plan 03-06 Task 6.1 — GREEN tests for SRCH-01 + SRCH-02.
//
// Closes the Plan-01 RED stub (was describe.skip). Live-Neon — uses
// tests/fixtures/seed-public.ts seedPublicFixture() to lay down 6 published
// products across two categories with manufacturer + spec data, then directly
// rebuilds product_search rows for all three locales (the same SQL that
// saveProduct() emits in Step 6 — see src/actions/products.ts
// rebuildProductSearch). We rebuild here in-test rather than calling
// saveProduct() because the Server Action requires withAdminAction +
// next-auth + many other moving parts; the FTS contract only depends on the
// product_search row shape, which we can populate directly.
//
// Pattern reference: tests/db/catalog.test.ts (next/cache mock, beforeAll +
// afterAll for fixture setup, requireTestDatabaseUrl). 30s outer timeout
// covers the cold-Neon HTTP flake (DEF-2-01).

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import {
  seedPublicFixture,
  teardownPublicFixture,
  type PublicFixtureIds,
} from '../fixtures/seed-public';
import { searchProducts, skuExactMatch } from '@/lib/search';

const LOCALES = ['uz', 'ru', 'en'] as const;
const PG_CONFIG: Record<(typeof LOCALES)[number], string> = {
  uz: 'simple',
  ru: 'russian',
  en: 'english',
};

let ids: PublicFixtureIds;

async function rebuildSearchForAllSeededProducts(productIds: string[]) {
  const db = await getTestDb();
  for (const productId of productIds) {
    for (const locale of LOCALES) {
      const cfg = PG_CONFIG[locale];
      await db.execute(sql`
        INSERT INTO product_search (product_id, locale, search_tsv)
        SELECT ${productId}::uuid, ${locale}::text,
          setweight(to_tsvector(${cfg}::regconfig, coalesce(t.name, '')), 'A') ||
          setweight(to_tsvector(${cfg}::regconfig, coalesce(t.short_desc, '')), 'B') ||
          setweight(to_tsvector(${cfg}::regconfig, coalesce(t.long_desc, '')), 'C')
        FROM product_translations t
        WHERE t.product_id = ${productId}::uuid AND t.locale = ${locale}::text
        ON CONFLICT (product_id, locale) DO UPDATE SET search_tsv = EXCLUDED.search_tsv
      `);
    }
  }
}

describe('searchProducts + skuExactMatch (SRCH-01, SRCH-02; live Neon)', () => {
  beforeAll(async () => {
    requireTestDatabaseUrl();
    ids = await seedPublicFixture();
    await rebuildSearchForAllSeededProducts(ids.productIds);
  }, 60_000);

  afterAll(async () => {
    if (ids) await teardownPublicFixture(ids);
  }, 30_000);

  it('SRCH-01: searches for "manometr" in uz returns matching products with rank > 0', async () => {
    const result = await searchProducts('manometr', 'uz', 1, 20);
    expect(result.fallbackLocale).toBeNull();
    expect(result.rows.length).toBeGreaterThan(0);
    // Each row carries a rank that's a positive number (ts_rank_cd output).
    for (const row of result.rows) {
      expect(typeof row.rank).toBe('number');
      expect(row.rank).toBeGreaterThan(0);
    }
    // The 3 manometer SKUs should all be in the results (each has "Manometr"
    // in its uz name).
    const skus = result.rows.map((r) => r.sku).sort();
    expect(skus).toEqual(expect.arrayContaining(['M-100', 'M-200', 'M-300']));
  }, 20_000);

  it('SRCH-01 D-06: each result row has manufacturerName + categoryName + heroPublicId populated (not null) for seeded products', async () => {
    const result = await searchProducts('manometr', 'uz', 1, 20);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      // D-06: every search result row carries the breadcrumb chip data + hero
      // image so ProductCard can render correctly without hardcoded nulls.
      expect(row.manufacturerName).not.toBeNull();
      expect(row.categoryName).not.toBeNull();
      expect(row.heroPublicId).not.toBeNull();
    }
    const m100 = result.rows.find((r) => r.sku === 'M-100');
    expect(m100).toBeDefined();
    expect(m100!.manufacturerName).toBe('WIKA');
    expect(m100!.categoryName).toBe('Manometr'); // uz category name from fixture
    expect(m100!.heroPublicId).toBe('manometr/seed/M-100/hero');
  }, 20_000);

  it('SRCH-02: query that has 0 hits in en falls back to uz with fallbackLocale=uz', async () => {
    // "Sanoat" appears only in uz translations (Uzbek-only word for
    // "industrial"); en + ru translations don't carry it. Searching from `en`
    // should yield 0 hits in en, then cascade to uz and find rows.
    const result = await searchProducts('sanoat', 'en', 1, 20);
    expect(result.fallbackLocale).toBe('uz');
    expect(result.rows.length).toBeGreaterThan(0);
  }, 20_000);

  it('SRCH-02: empty query returns empty rows without DB hit', async () => {
    const result = await searchProducts('', 'uz', 1, 20);
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.fallbackLocale).toBeNull();
  }, 5_000);

  it('skuExactMatch: M-100 returns slug for current locale', async () => {
    const hit = await skuExactMatch('M-100', 'uz');
    expect(hit).not.toBeNull();
    expect(hit!.slug).toBe('manometr-m-100');
  }, 10_000);

  it('skuExactMatch: case-insensitive match — m-100 also returns the same row', async () => {
    const hit = await skuExactMatch('m-100', 'uz');
    expect(hit).not.toBeNull();
    expect(hit!.slug).toBe('manometr-m-100');
  }, 10_000);

  it('skuExactMatch: unknown SKU returns null', async () => {
    const hit = await skuExactMatch('NOPE-XYZ', 'uz');
    expect(hit).toBeNull();
  }, 10_000);
});
