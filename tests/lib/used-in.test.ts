// Plan 04-03 Task 3.3 — live-Neon tests for getUsedInForProduct (CONT-04 / D-09).
//
// Two specs lock the helper's contract:
//   1. Cap-at-6 invariant: seed 7 published recipes linked to a product →
//      expect recipes.length === 6 (D-09 cap).
//   2. Empty result: 0 cross-links → both arrays empty.
//
// next/cache is mocked because the helper uses 'use cache' + cacheLife +
// cacheTag (Next 16 cacheComponents primitives). Vitest cannot exercise the
// 'use cache' directive's caching semantics outside Next's compile pipeline;
// per plan 04-03 deviations Rule 3, the test asserts the *behavior* (correct
// rows + correct cap), not the cache-tag wiring. Cache-tag wiring is verified
// in plan 04-11 e2e (admin-edit-revalidates pattern).
//
// Cleanup: per-test inline tracking + reverse-order DELETE (mirrors
// phase4-migration.test.ts shape; no shared fixtures needed since each spec
// seeds its own product + content).

import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { getUsedInForProduct } from '@/lib/used-in';

describe('getUsedInForProduct (CONT-04 / D-09; live Neon)', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const fn = cleanups.pop();
      if (fn) {
        try {
          await fn();
        } catch {
          // best-effort cleanup; do not mask passing tests with teardown errors
        }
      }
    }
  });

  it('caps recipes at 6 per type when 7 published recipes link to one product (D-09)', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Seed: 1 category, 1 product, 7 published recipes each with a uz translation,
    // 7 product_recipes junction rows linking them all.
    const cat = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (cat.rows as Array<{ id: string }>)[0]!.id;

    const prod = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prod.rows as Array<{ id: string }>)[0]!.id;

    const stamp = Date.now();
    const recipeIds: string[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await db.execute(sql`
        INSERT INTO recipe (status, published_at)
        VALUES ('published', now())
        RETURNING id
      `);
      const rId = (r.rows as Array<{ id: string }>)[0]!.id;
      recipeIds.push(rId);
      await db.execute(sql`
        INSERT INTO recipe_translations (recipe_id, locale, title, slug)
        VALUES (${rId}::uuid, 'uz', ${'Recipe ' + i}, ${'cap6-recipe-' + i + '-' + stamp})
      `);
      await db.execute(sql`
        INSERT INTO product_recipes (product_id, recipe_id, position)
        VALUES (${prodId}::uuid, ${rId}::uuid, ${i})
      `);
    }

    cleanups.push(async () => {
      // FK ON DELETE CASCADE drops product_recipes when product or recipe goes;
      // we delete product first then recipes then category.
      await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
      for (const rId of recipeIds) {
        await db.execute(sql`DELETE FROM recipe WHERE id = ${rId}::uuid`);
      }
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    const result = await getUsedInForProduct(prodId, 'uz');
    expect(result.recipes.length).toBe(6);
    expect(result.industries.length).toBe(0);
    // Each item carries the expected shape.
    for (const item of result.recipes) {
      expect(item.type).toBe('recipe');
      expect(typeof item.id).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.slug).toBe('string');
      expect(item.title).toMatch(/^Recipe /);
    }
  }, 30_000);

  it('returns empty arrays when product has no cross-linked content', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const cat = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (cat.rows as Array<{ id: string }>)[0]!.id;

    const prod = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prod.rows as Array<{ id: string }>)[0]!.id;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    const result = await getUsedInForProduct(prodId, 'uz');
    expect(result.recipes).toEqual([]);
    expect(result.industries).toEqual([]);
  }, 15_000);
});
