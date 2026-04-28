// D-04 / ADMIN-10 / plan 02-12 Task 12.1:
// Live-Neon integration test for the product_translation_completeness pgView
// (declared in src/db/schema/views/product-translation-completeness.ts and
// applied to Neon in plan 02-01 migration 0001_overrated_shiva.sql).
//
// Asserts the view's math against three hand-seeded scenarios:
//   1. Base-only: 4 base text fields (name, slug, short_desc, long_desc).
//      uz fills only `name` → 25% (1/4 base, 0 spec).
//      ru fills `name` + `slug` → 50%.
//      en fills all four → 100%.
//   2. W10 spec values: 4 base fields + 1 required text spec_field.
//      Denominator becomes 5. Locale that translates the spec value gets 100%;
//      locales without a spec translation get 80% (4/5).
//
// Both scenarios run against the LIVE Neon dev branch via the same fixture
// pattern as tests/db/spec-values.test.ts (15s per-test timeout to avoid
// the cold-Neon HTTP flake — DEF-2-01).
import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { findProductCompleteness } from '@/lib/translation-completeness';

describe('product_translation_completeness pgView (D-04 / ADMIN-10)', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    // Run cleanups in reverse insertion order so FKs unwind cleanly.
    while (cleanups.length > 0) {
      const fn = cleanups.pop();
      if (fn) {
        try {
          await fn();
        } catch {
          // best-effort cleanup; surface nothing so a passing test isn't
          // masked by a teardown error
        }
      }
    }
  });

  it('returns 25% / 50% / 100% across uz / ru / en for base-only fields', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Provision: category → category_translations(uz) → product
    const catRes = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (catRes.rows as Array<{ id: string }>)[0]!.id;

    await db.execute(sql`
      INSERT INTO category_translations (category_id, locale, name, slug)
      VALUES (${catId}::uuid, 'uz', 'cat-fixture', ${'cat-' + Date.now()})
    `);

    const prodRes = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prodRes.rows as Array<{ id: string }>)[0]!.id;

    cleanups.push(async () => {
      await db.execute(
        sql`DELETE FROM product_translations WHERE product_id = ${prodId}::uuid`,
      );
      await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
      await db.execute(
        sql`DELETE FROM category_translations WHERE category_id = ${catId}::uuid`,
      );
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    // uz: only `name` filled. The view's CASE WHEN coalesce(field,'') <> ''
    // counts non-NULL non-empty strings. Phase-1 schema has slug NOT NULL on
    // product_translations, so we INSERT slug='' and the COALESCE+'<>' check
    // treats it as missing (empty-string == not filled per the view formula).
    await db.execute(sql`
      INSERT INTO product_translations (product_id, locale, name, slug, short_desc, long_desc)
      VALUES (${prodId}::uuid, 'uz', 'P-uz', '', NULL, NULL)
    `);

    // ru: name + slug filled (2/4)
    await db.execute(sql`
      INSERT INTO product_translations (product_id, locale, name, slug, short_desc, long_desc)
      VALUES (${prodId}::uuid, 'ru', 'P-ru', ${'p-ru-' + Date.now()}, NULL, NULL)
    `);

    // en: all 4 filled (4/4 = 100)
    await db.execute(sql`
      INSERT INTO product_translations (product_id, locale, name, slug, short_desc, long_desc)
      VALUES (${prodId}::uuid, 'en', 'P-en', ${'p-en-' + Date.now()}, 'short', 'long')
    `);

    const result = await findProductCompleteness(prodId);
    expect(result.uz).toBe(25);
    expect(result.ru).toBe(50);
    expect(result.en).toBe(100);
  }, 15_000);

  it('returns 0 for every locale when product has no translations yet', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const catRes = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (catRes.rows as Array<{ id: string }>)[0]!.id;

    const prodRes = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prodRes.rows as Array<{ id: string }>)[0]!.id;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    // No product_translations rows at all → no rows in the view either.
    // Helper must default missing locales to 0.
    const result = await findProductCompleteness(prodId);
    expect(result.uz).toBe(0);
    expect(result.ru).toBe(0);
    expect(result.en).toBe(0);
  }, 15_000);

  it('reflects required-text spec values in the denominator (W10 — uz=100, ru=80, en=80)', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Provision: category → required text spec_field → product → all 4 base
    // fields filled in all 3 locales → product_spec_values(text) → translate
    // the value only in uz.
    const catRes = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (catRes.rows as Array<{ id: string }>)[0]!.id;

    const specRes = await db.execute(sql`
      INSERT INTO spec_field (category_id, key, data_type, required)
      VALUES (${catId}::uuid, ${'material_' + Date.now()}, 'text', true)
      RETURNING id
    `);
    const specId = (specRes.rows as Array<{ id: string }>)[0]!.id;

    const prodRes = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prodRes.rows as Array<{ id: string }>)[0]!.id;

    // Fill all 4 base fields in all 3 locales (4/4 each before spec layer)
    const stamp = Date.now();
    await db.execute(sql`
      INSERT INTO product_translations (product_id, locale, name, slug, short_desc, long_desc)
      VALUES
        (${prodId}::uuid, 'uz', 'P', ${'p-uz-' + stamp}, 's', 'l'),
        (${prodId}::uuid, 'ru', 'P', ${'p-ru-' + stamp}, 's', 'l'),
        (${prodId}::uuid, 'en', 'P', ${'p-en-' + stamp}, 's', 'l')
    `);

    // Insert the spec value (text type — value lives on the sibling translations)
    const psvRes = await db.execute(sql`
      INSERT INTO product_spec_values (product_id, spec_field_id)
      VALUES (${prodId}::uuid, ${specId}::uuid)
      RETURNING id
    `);
    const psvId = (psvRes.rows as Array<{ id: string }>)[0]!.id;

    // Translate the spec value ONLY in uz — ru/en have no translation rows
    await db.execute(sql`
      INSERT INTO product_spec_value_translations (value_id, locale, text_value)
      VALUES (${psvId}::bigint, 'uz', 'Stainless 304')
    `);

    cleanups.push(async () => {
      await db.execute(
        sql`DELETE FROM product_spec_value_translations WHERE value_id = ${psvId}::bigint`,
      );
      await db.execute(
        sql`DELETE FROM product_spec_values WHERE id = ${psvId}::bigint`,
      );
      await db.execute(
        sql`DELETE FROM product_translations WHERE product_id = ${prodId}::uuid`,
      );
      await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
      await db.execute(sql`DELETE FROM spec_field WHERE id = ${specId}::uuid`);
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    // Denominator = 4 base + 1 required text spec = 5.
    // uz numerator = 4 base + 1 spec translation = 5 → 100%.
    // ru numerator = 4 base + 0 spec translation = 4 → 80%.
    // en numerator = 4 base + 0 spec translation = 4 → 80%.
    const result = await findProductCompleteness(prodId);
    expect(result.uz).toBe(100);
    expect(result.ru).toBe(80);
    expect(result.en).toBe(80);
  }, 15_000);
});
