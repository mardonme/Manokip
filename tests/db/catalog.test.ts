// Plan 03-04 Task 4.1 — GREEN tests for the catalog data layer.
//
// Closes CAT-03 (paginated published-product listing) + CAT-04 (typed-spec EAV
// filters: numeric range, enum, bool, combined) + per-locale filter labels
// JOINed from spec_field_translations.
//
// Live-Neon — uses tests/fixtures/seed-public.ts seedPublicFixture() to lay
// down 3 manometers with known pressure/material/certified spec values, then
// asserts each filter combination returns the expected subset.
//
// Pattern reference: tests/actions/manufacturers.test.ts (next/cache mock,
// cleanup pattern, requireTestDatabaseUrl, vi.hoisted spy on revalidateTag).

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
  getCategoryProducts,
  getCategoryBySlug,
  getCategoryFilterSchema,
} from '@/lib/catalog';
import { getEnumFacetCounts } from '@/lib/facets';

let ids: PublicFixtureIds;

describe('catalog queries (CAT-03, CAT-04; live Neon)', () => {
  beforeAll(async () => {
    requireTestDatabaseUrl();
    ids = await seedPublicFixture();
  }, 30_000);

  afterAll(async () => {
    if (ids) await teardownPublicFixture(ids);
  }, 30_000);

  it('CAT-03: getCategoryProducts returns 3 published products for manometers category', async () => {
    const result = await getCategoryProducts(
      ids.categoryIds.manometers,
      'uz',
      [],
      1,
      24,
    );
    expect(result.total).toBe(3);
    expect(result.rows.length).toBe(3);
    const skus = result.rows.map((r) => r.sku).sort();
    expect(skus).toEqual(['M-100', 'M-200', 'M-300']);
    // Localized name + manufacturer name + hero public_id resolved.
    const m100 = result.rows.find((r) => r.sku === 'M-100')!;
    expect(m100.name).toBe('Manometr M-100');
    expect(m100.manufacturerName).toBe('WIKA');
    expect(m100.heroPublicId).toBe('manometr/seed/M-100/hero');
  }, 20_000);

  it('CAT-04 numeric range: pressure_max in [200, 700] returns only M-200 + M-300', async () => {
    const result = await getCategoryProducts(
      ids.categoryIds.manometers,
      'uz',
      [{ kind: 'range', key: 'pressure_max', min: 200, max: 700 }],
      1,
      24,
    );
    expect(result.total).toBe(2);
    const skus = result.rows.map((r) => r.sku).sort();
    expect(skus).toEqual(['M-200', 'M-300']);
  }, 20_000);

  it('CAT-04 enum: material in [steel] returns only M-100', async () => {
    const result = await getCategoryProducts(
      ids.categoryIds.manometers,
      'uz',
      [{ kind: 'select', key: 'material', values: ['steel'] }],
      1,
      24,
    );
    expect(result.total).toBe(1);
    expect(result.rows[0]?.sku).toBe('M-100');
  }, 20_000);

  it('CAT-04 bool: certified=true returns 2 products (M-100 + M-300)', async () => {
    const result = await getCategoryProducts(
      ids.categoryIds.manometers,
      'uz',
      [{ kind: 'toggle', key: 'certified', bool: true }],
      1,
      24,
    );
    expect(result.total).toBe(2);
    const skus = result.rows.map((r) => r.sku).sort();
    expect(skus).toEqual(['M-100', 'M-300']);
  }, 20_000);

  it('CAT-04 combined: pressure_max in [0,300] AND material=brass returns 1 product (M-200)', async () => {
    const result = await getCategoryProducts(
      ids.categoryIds.manometers,
      'uz',
      [
        { kind: 'range', key: 'pressure_max', min: 0, max: 300 },
        { kind: 'select', key: 'material', values: ['brass'] },
      ],
      1,
      24,
    );
    expect(result.total).toBe(1);
    expect(result.rows[0]?.sku).toBe('M-200');
  }, 20_000);

  it('Facet counts: getEnumFacetCounts(material, manometers) returns 3 entries with counts of 1 each', async () => {
    const counts = await getEnumFacetCounts(
      'material',
      ids.categoryIds.manometers,
    );
    expect(counts.length).toBe(3);
    const byValue = new Map(counts.map((c) => [c.value, c.count]));
    expect(byValue.get('steel')).toBe(1);
    expect(byValue.get('brass')).toBe(1);
    expect(byValue.get('inox')).toBe(1);
  }, 20_000);

  it('CAT-04 schema: getCategoryFilterSchema(manometers, ru) returns labels in Russian via spec_field_translations JOIN', async () => {
    const schema = await getCategoryFilterSchema(
      ids.categoryIds.manometers,
      'ru',
    );
    expect(schema.length).toBe(3);
    const byKey = new Map(schema.map((s) => [s.key, s]));
    expect(byKey.get('pressure_max')?.label).toBe('Максимальное давление');
    expect(byKey.get('material')?.label).toBe('Материал');
    expect(byKey.get('certified')?.label).toBe('Сертифицирован');
    // Enum options carry per-locale option labels.
    const material = byKey.get('material');
    expect(material?.options?.length).toBe(3);
    const optByKey = new Map(
      (material?.options ?? []).map((o) => [o.key, o.label]),
    );
    expect(optByKey.get('steel')).toBe('Сталь');
    expect(optByKey.get('brass')).toBe('Латунь');
    expect(optByKey.get('inox')).toBe('Нержавеющая сталь');
  }, 20_000);

  it('getCategoryBySlug resolves manometer slug → all 3 locale slugs for hreflang', async () => {
    const cat = await getCategoryBySlug('uz', 'manometr');
    expect(cat).not.toBeNull();
    expect(cat?.id).toBe(ids.categoryIds.manometers);
    expect(cat?.slugByLocale.uz).toBe('manometr');
    expect(cat?.slugByLocale.ru).toBe('manometry');
    expect(cat?.slugByLocale.en).toBe('manometers');
    expect(cat?.nameByLocale.ru).toBe('Манометры');
  }, 20_000);
});
