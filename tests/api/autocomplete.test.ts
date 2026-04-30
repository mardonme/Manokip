// Plan 03-06 Task 6.1 — GREEN tests for SRCH-03 (autocomplete helper).
//
// Closes the Plan-01 RED stub (was describe.skip). Tests the
// `searchAutocomplete` helper directly at the lib level — the API route
// (src/app/api/search/autocomplete/route.ts) is a thin wrapper over this
// helper that adds locale validation and Cache-Control headers, so unit-
// testing the helper covers the FTS contract without spinning up a Next
// route handler test harness.
//
// Pattern reference: tests/db/catalog.test.ts (live-Neon, beforeAll fixture
// setup, vi.mock('next/cache')). Same product_search rebuild as
// tests/db/search.test.ts — D-06 contract is per-row breadcrumb chip data.

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
import { searchAutocomplete } from '@/lib/search';

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

describe('searchAutocomplete (SRCH-03; live Neon)', () => {
  beforeAll(async () => {
    requireTestDatabaseUrl();
    ids = await seedPublicFixture();
    await rebuildSearchForAllSeededProducts(ids.productIds);
  }, 60_000);

  afterAll(async () => {
    if (ids) await teardownPublicFixture(ids);
  }, 30_000);

  it('SRCH-03: prefix "mano" returns matching products with breadcrumb chips', async () => {
    const suggestions = await searchAutocomplete('mano', 'en');
    expect(suggestions.length).toBeGreaterThan(0);
    // D-06: every suggestion row carries manufacturer + category breadcrumb
    // chips so the engineer can disambiguate products at-a-glance.
    for (const s of suggestions) {
      expect(s.manufacturerName).not.toBeNull();
      expect(s.categoryName).not.toBeNull();
    }
  }, 20_000);

  it('SRCH-03: SKU match elevated to top — query "M-1" returns M-100 first with isSkuMatch=true', async () => {
    const suggestions = await searchAutocomplete('M-1', 'uz');
    expect(suggestions.length).toBeGreaterThan(0);
    // The first hit should be a SKU match (D-06 — SKU matches sort to top).
    expect(suggestions[0]!.isSkuMatch).toBe(true);
    expect(suggestions[0]!.sku).toBe('M-100');
  }, 20_000);

  it('SRCH-03 sanitization: query "!&|()foo" does not throw', async () => {
    // Pitfall #3 / T-V5-01: tsquery operators in user input must be stripped
    // before being concatenated into a `prefix:*` term. Without sanitization
    // Postgres throws SQLSTATE 42601 syntax error in tsquery.
    const suggestions = await searchAutocomplete('!&|()foo', 'uz');
    expect(Array.isArray(suggestions)).toBe(true);
  }, 10_000);

  it('SRCH-03: < 2 char query returns empty array without DB hit', async () => {
    const suggestions = await searchAutocomplete('M', 'uz');
    expect(suggestions).toEqual([]);
  }, 5_000);

  it('SRCH-03: empty/whitespace query returns empty array', async () => {
    const a = await searchAutocomplete('', 'uz');
    const b = await searchAutocomplete('   ', 'uz');
    expect(a).toEqual([]);
    expect(b).toEqual([]);
  }, 5_000);
});
