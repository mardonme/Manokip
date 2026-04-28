// Plan 02-13a Task 13a.1 — seedProduct() Wave-0 test fixture.
//
// Reused by:
//   - tests/actions/products.test.ts (this plan, 13a) — saveProduct +
//     duplicateProduct integration tests need a baseline product with a
//     known categoryId and (optionally) one or more locale translations.
//   - plan 02-13b (lifecycle actions) — publishProduct / unpublishProduct /
//     deleteProduct tests reuse the same fixture so the seed shape is one
//     source of truth across both halves of the editor data tier.
//
// Seeds, in order:
//   1. category row (no parent — root). Always 1 row per call.
//   2. category_translations(uz) — minimal so the FK target exists; the
//      product editor only needs the FK validity, not all 3 locales. Tests
//      that need ru/en category translations should add them in their own
//      `beforeEach`.
//   3. product row — status defaults to 'draft' via the column default
//      (plan 02-01). Tests that need 'published' should call saveProduct
//      with status:'published' OR use the publishProduct action (plan 13b).
//   4. product_translations — one row per locale enabled in opts.locales.
//      Default: only `uz` (single-locale baseline; tests that exercise
//      replace-on-save semantics start with one row, save adds the rest).
//
// Cleanup runs in reverse FK order:
//   product_translation_field_flags (compound FK to product_translations)
//   → product_spec_value_translations (FK -> product_spec_values, via subq)
//   → product_spec_values (FK -> product, ON DELETE CASCADE handles this
//     anyway, but explicit is safer if the parent product is gone)
//   → product_translations (cascades from product but explicit)
//   → product
//   → category_translations
//   → category
//   → audit_log rows scoped to this product/category.
//
// Posture matches tests/_fixtures/admin-session.ts: returns the seeded ids
// + a typed `cleanup()` so each test owns its rows and tears down in
// `afterEach`. No global teardown — every test stack is independent.

import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getTestDb } from "./db";

export interface SeedProductOptions {
  /** Optional product display name; defaults to a unique seed-<id8> string. */
  name?: string;
  /**
   * Which locales get a product_translations row seeded.
   * Default: { uz: true } (single-locale baseline).
   */
  locales?: { uz?: boolean; ru?: boolean; en?: boolean };
}

export interface SeededProduct {
  productId: string;
  categoryId: string;
  /** The product display name actually used (echoes opts.name or generated). */
  name: string;
  /** Drops every row this fixture inserted, in reverse FK order. */
  cleanup: () => Promise<void>;
}

export async function seedProduct(
  opts: SeedProductOptions = {},
): Promise<SeededProduct> {
  const db = await getTestDb();
  const categoryId = randomUUID();
  const productId = randomUUID();
  const name = opts.name ?? `seed-${productId.slice(0, 8)}`;
  const enabled = opts.locales ?? { uz: true };

  // 1. category (FK target for product.category_id NOT NULL).
  await db.execute(
    sql`INSERT INTO category (id, parent_id, sort_order) VALUES (${categoryId}::uuid, NULL, 0)`,
  );

  // 2. category_translations (uz only — minimal FK satisfaction). Slug
  //    suffix uses the categoryId fragment so parallel test runs don't
  //    collide on the (locale, slug) unique index.
  const catSlug = `seed-cat-${categoryId.slice(0, 8)}`;
  await db.execute(
    sql`INSERT INTO category_translations (category_id, locale, name, slug)
        VALUES (${categoryId}::uuid, 'uz', 'seed cat', ${catSlug})`,
  );

  // 3. product — status defaults to 'draft' via the column default
  //    (plan 02-01). created_at/updated_at default to now().
  await db.execute(
    sql`INSERT INTO product (id, category_id) VALUES (${productId}::uuid, ${categoryId}::uuid)`,
  );

  // 4. product_translations per requested locale. Slug per-locale uses the
  //    name + locale suffix to keep the unique (locale, slug) index happy.
  for (const loc of ["uz", "ru", "en"] as const) {
    if (enabled[loc]) {
      const slug = `${name}-${loc}`;
      await db.execute(
        sql`INSERT INTO product_translations (product_id, locale, name, slug)
            VALUES (${productId}::uuid, ${loc}, ${name}, ${slug})`,
      );
    }
  }

  return {
    productId,
    categoryId,
    name,
    cleanup: async () => {
      // MT flag rows reference (product_id, locale) on product_translations
      // with ON DELETE CASCADE; explicit DELETE for clarity in case a test
      // inserts flags without translations.
      await db.execute(
        sql`DELETE FROM product_translation_field_flags WHERE product_id = ${productId}::uuid`,
      );
      // spec_value translations FK -> product_spec_values; subquery so we
      // catch translation rows even if the parent value row's FK to product
      // is gone (paranoia — products.id ON DELETE CASCADE handles spec
      // values, which in turn cascade their translations).
      await db.execute(
        sql`DELETE FROM product_spec_value_translations
             WHERE value_id IN (
               SELECT id FROM product_spec_values WHERE product_id = ${productId}::uuid
             )`,
      );
      await db.execute(
        sql`DELETE FROM product_spec_values WHERE product_id = ${productId}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM product_translations WHERE product_id = ${productId}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM product WHERE id = ${productId}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM category_translations WHERE category_id = ${categoryId}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM category WHERE id = ${categoryId}::uuid`,
      );
      // Audit rows: scope by entity_id, which can be either the product or
      // category UUID (both as text in the audit_log column).
      await db.execute(
        sql`DELETE FROM audit_log WHERE entity_id IN (${productId}, ${categoryId})`,
      );
    },
  };
}
