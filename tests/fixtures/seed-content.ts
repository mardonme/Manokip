// Plan 04-04 Task 4.2 — seed-content fixture orchestrator for Phase 4.
//
// Extends seed-public.ts (Phase 3) with 2 published recipes + 2 published
// industries + cross-link junction rows. Downstream Wave 1+ specs (04-05/06
// Server-Action live-Neon, 04-09/10 public RSC, 04-11 search filters) un-skip
// against this baseline.
//
// Posture (mirrors tests/fixtures/seed-public.ts):
//   - Lazy `getTestDb()` import — fixture file alone has no DB side effects.
//   - Per-helper signatures take an optional id. Caller can hardcode UUIDs
//     for e2e specs that need deterministic targets (Phase-3 03-01 pattern).
//   - Cross-link helpers (`seedProductRecipes` / `seedProductIndustries`)
//     auto-increment `position` per junction row when `position` not given;
//     match Phase 4 plan 04-01 schema (junctions.ts) shape.
//   - `seedPhase4Content` is the orchestrator: assumes the caller has already
//     seeded the 6-product trilingual catalog via `seedPublicFixture()` —
//     the orchestrator NEVER inserts new products (T-04-04-01 mitigation).
//     Caller provides the productIds to cross-link to.
//
// Trilingual translation prefix convention follows seed-public.ts (uz_/ru_/en_
// prefixes) so downstream specs can grep on the prefix to assert per-locale
// rendering. Body content uses SAMPLE_RECIPE_DOC / SAMPLE_INDUSTRY_DOC from
// tiptap-sample.ts (task 4.1).
//
// REQUIRES: live Neon test branch. Caller must `requireTestDatabaseUrl()` AND
// have run `seedPublicFixture()` first if `seedPhase4Content` is used.
//
// Note: this fixture is NOT exported from a barrel. Tests import directly via
// path (`@/tests/fixtures/seed-content` or relative).

import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb } from '../_fixtures/db';
import { SAMPLE_RECIPE_DOC, SAMPLE_INDUSTRY_DOC } from './tiptap-sample';
import type { JSONContent } from '@tiptap/core';

const LOCALES = ['uz', 'ru', 'en'] as const;
type Locale = (typeof LOCALES)[number];

// Deterministic UUIDs for the 2 recipes + 2 industries the orchestrator
// seeds. Hex-only (Postgres uuid type rejects non-hex letters — see Plan
// 03-04 Rule 1 fix in seed-public.ts).
//   - 0x0fb0..0x0fbf for recipes
//   - 0x0fc0..0x0fcf for industries
const ID = {
  recipeOne: '00000000-0000-4000-8000-000000000fb1',
  recipeTwo: '00000000-0000-4000-8000-000000000fb2',
  industryOne: '00000000-0000-4000-8000-000000000fc1',
  industryTwo: '00000000-0000-4000-8000-000000000fc2',
} as const;

// -- Single-row helpers (used by per-spec setup AND by seedPhase4Content) -----

interface RecipeTranslationCopy {
  title: string;
  slug: string;
  excerpt: string | null;
  body: JSONContent | null;
}

export interface SeedRecipeOptions {
  id?: string;
  status?: 'draft' | 'published';
  publishedAt?: Date | null;
  featuredImagePublicId?: string | null;
  translations: Record<Locale, RecipeTranslationCopy>;
}

/** Inserts 1 recipe + up to 3 translation rows. Returns the recipe id. */
export async function seedRecipe(opts: SeedRecipeOptions): Promise<string> {
  const db = await getTestDb();
  const id = opts.id ?? randomUUID();
  const status = opts.status ?? 'draft';
  const publishedAt =
    opts.publishedAt === undefined && status === 'published'
      ? new Date()
      : (opts.publishedAt ?? null);
  const featured = opts.featuredImagePublicId ?? null;

  await db.execute(
    sql`INSERT INTO recipe (id, featured_image_public_id, status, published_at)
        VALUES (${id}::uuid, ${featured}, ${status}, ${publishedAt})`,
  );
  for (const loc of LOCALES) {
    const tr = opts.translations[loc];
    await db.execute(
      sql`INSERT INTO recipe_translations (recipe_id, locale, title, slug, excerpt, body)
          VALUES (${id}::uuid, ${loc}, ${tr.title}, ${tr.slug}, ${tr.excerpt}, ${tr.body as unknown as string})`,
    );
  }
  return id;
}

interface IndustryTranslationCopy {
  title: string;
  slug: string;
  excerpt: string | null;
  body: JSONContent | null;
}

export interface SeedIndustryOptions {
  id?: string;
  status?: 'draft' | 'published';
  publishedAt?: Date | null;
  featuredImagePublicId?: string | null;
  translations: Record<Locale, IndustryTranslationCopy>;
}

/** Inserts 1 industry + up to 3 translation rows. Returns the industry id. */
export async function seedIndustry(opts: SeedIndustryOptions): Promise<string> {
  const db = await getTestDb();
  const id = opts.id ?? randomUUID();
  const status = opts.status ?? 'draft';
  const publishedAt =
    opts.publishedAt === undefined && status === 'published'
      ? new Date()
      : (opts.publishedAt ?? null);
  const featured = opts.featuredImagePublicId ?? null;

  await db.execute(
    sql`INSERT INTO industry (id, featured_image_public_id, status, published_at)
        VALUES (${id}::uuid, ${featured}, ${status}, ${publishedAt})`,
  );
  for (const loc of LOCALES) {
    const tr = opts.translations[loc];
    await db.execute(
      sql`INSERT INTO industry_translations (industry_id, locale, title, slug, excerpt, body)
          VALUES (${id}::uuid, ${loc}, ${tr.title}, ${tr.slug}, ${tr.excerpt}, ${tr.body as unknown as string})`,
    );
  }
  return id;
}

/**
 * Inserts product_recipes junction rows for one product paired with N recipes.
 * If `position` is omitted, auto-increments from `startPosition` (default 0).
 */
export async function seedProductRecipes(
  productId: string,
  recipeIds: string[],
  startPosition = 0,
): Promise<void> {
  const db = await getTestDb();
  let pos = startPosition;
  for (const recipeId of recipeIds) {
    await db.execute(
      sql`INSERT INTO product_recipes (product_id, recipe_id, position)
          VALUES (${productId}::uuid, ${recipeId}::uuid, ${pos})`,
    );
    pos += 1;
  }
}

/** Mirror for product_industries. */
export async function seedProductIndustries(
  productId: string,
  industryIds: string[],
  startPosition = 0,
): Promise<void> {
  const db = await getTestDb();
  let pos = startPosition;
  for (const industryId of industryIds) {
    await db.execute(
      sql`INSERT INTO product_industries (product_id, industry_id, position)
          VALUES (${productId}::uuid, ${industryId}::uuid, ${pos})`,
    );
    pos += 1;
  }
}

// -- Orchestrator -------------------------------------------------------------

export interface Phase4ContentIds {
  recipeIds: { one: string; two: string };
  industryIds: { one: string; two: string };
}

export interface SeedPhase4ContentOptions {
  /**
   * Caller-provided product ids. seedPhase4Content NEVER inserts new products
   * (T-04-04-01 mitigation). Caller must seed the public catalog first via
   * seedPublicFixture() and pass at least 2 ids here.
   */
  products: string[];
}

/**
 * Seeds 2 published recipes + 2 published industries + cross-links:
 *   - recipeOne ↔ products[0], products[1]
 *   - recipeTwo ↔ products[2], products[3] (or wraps if < 4 products given)
 *   - industryOne ↔ products[0]
 *   - industryTwo ↔ products[1]
 */
export async function seedPhase4Content(
  opts: SeedPhase4ContentOptions,
): Promise<Phase4ContentIds> {
  if (!opts.products || opts.products.length === 0) {
    throw new Error(
      'seedPhase4Content: opts.products must be a non-empty array. ' +
        'Caller must seed the public catalog first via seedPublicFixture().',
    );
  }
  const products = opts.products;
  const pick = (i: number) => products[i % products.length]!;

  // Defensive pre-cleanup so re-runs after a partial seed/teardown failure
  // don't blow up on PK conflicts. Order respects FK dependencies (junctions
  // before parents). Mirrors seed-public.ts posture.
  const db = await getTestDb();
  await db.execute(
    sql`DELETE FROM product_recipes WHERE recipe_id IN (
        ${ID.recipeOne}::uuid, ${ID.recipeTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM product_industries WHERE industry_id IN (
        ${ID.industryOne}::uuid, ${ID.industryTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM recipe_translations WHERE recipe_id IN (
        ${ID.recipeOne}::uuid, ${ID.recipeTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM recipe WHERE id IN (
        ${ID.recipeOne}::uuid, ${ID.recipeTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM industry_translations WHERE industry_id IN (
        ${ID.industryOne}::uuid, ${ID.industryTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM industry WHERE id IN (
        ${ID.industryOne}::uuid, ${ID.industryTwo}::uuid)`,
  );

  // 1. Recipes (2 published).
  await seedRecipe({
    id: ID.recipeOne,
    status: 'published',
    featuredImagePublicId: 'manometr/seed/recipe-one/hero',
    translations: {
      uz: {
        title: 'uz_Manometrni toʻgʻri oʻrnatish',
        slug: 'uz-manometr-installation',
        excerpt: 'uz_Toʻgʻri oʻrnatish boʻyicha qisqa qoʻllanma.',
        body: SAMPLE_RECIPE_DOC,
      },
      ru: {
        title: 'ru_Правильная установка манометра',
        slug: 'ru-manometr-installation',
        excerpt: 'ru_Краткое руководство по правильной установке.',
        body: SAMPLE_RECIPE_DOC,
      },
      en: {
        title: 'en_Manometer installation guide',
        slug: 'en-manometer-installation',
        excerpt: 'en_Quick guide to correct manometer mounting.',
        body: SAMPLE_RECIPE_DOC,
      },
    },
  });
  await seedRecipe({
    id: ID.recipeTwo,
    status: 'published',
    featuredImagePublicId: 'manometr/seed/recipe-two/hero',
    translations: {
      uz: {
        title: 'uz_Bosim datchigini kalibrlash',
        slug: 'uz-transmitter-calibration',
        excerpt: 'uz_Yillik kalibrlash protseduralari.',
        body: SAMPLE_RECIPE_DOC,
      },
      ru: {
        title: 'ru_Калибровка датчика давления',
        slug: 'ru-transmitter-calibration',
        excerpt: 'ru_Процедуры ежегодной калибровки.',
        body: SAMPLE_RECIPE_DOC,
      },
      en: {
        title: 'en_Pressure transmitter calibration',
        slug: 'en-transmitter-calibration',
        excerpt: 'en_Annual calibration procedures.',
        body: SAMPLE_RECIPE_DOC,
      },
    },
  });

  // 2. Industries (2 published).
  await seedIndustry({
    id: ID.industryOne,
    status: 'published',
    featuredImagePublicId: 'manometr/seed/industry-one/hero',
    translations: {
      uz: {
        title: 'uz_Neft va gaz sanoati',
        slug: 'uz-oil-and-gas',
        excerpt: 'uz_Neft-gaz sohasi uchun bosim oʻlchash.',
        body: SAMPLE_INDUSTRY_DOC,
      },
      ru: {
        title: 'ru_Нефтегазовая отрасль',
        slug: 'ru-oil-and-gas',
        excerpt: 'ru_Измерение давления для нефтегазовой отрасли.',
        body: SAMPLE_INDUSTRY_DOC,
      },
      en: {
        title: 'en_Oil and gas',
        slug: 'en-oil-and-gas',
        excerpt: 'en_Pressure measurement for oil & gas operations.',
        body: SAMPLE_INDUSTRY_DOC,
      },
    },
  });
  await seedIndustry({
    id: ID.industryTwo,
    status: 'published',
    featuredImagePublicId: 'manometr/seed/industry-two/hero',
    translations: {
      uz: {
        title: 'uz_Kimyo sanoati',
        slug: 'uz-chemicals',
        excerpt: 'uz_Kimyo sanoati uchun bosim asboblari.',
        body: SAMPLE_INDUSTRY_DOC,
      },
      ru: {
        title: 'ru_Химическая промышленность',
        slug: 'ru-chemicals',
        excerpt: 'ru_Приборы давления для химической промышленности.',
        body: SAMPLE_INDUSTRY_DOC,
      },
      en: {
        title: 'en_Chemicals',
        slug: 'en-chemicals',
        excerpt: 'en_Pressure instrumentation for chemical processing.',
        body: SAMPLE_INDUSTRY_DOC,
      },
    },
  });

  // 3. Cross-links — recipeOne ↔ 2 products, recipeTwo ↔ 2 products,
  //    industryOne ↔ 1 product, industryTwo ↔ 1 product.
  //    Junction rows are inserted from the product side (per junctions.ts PK
  //    shape) so downstream "Used in" reads see deterministic position order.
  await seedProductRecipes(pick(0), [ID.recipeOne]);
  await seedProductRecipes(pick(1), [ID.recipeOne]);
  await seedProductRecipes(pick(2), [ID.recipeTwo]);
  await seedProductRecipes(pick(3), [ID.recipeTwo]);
  await seedProductIndustries(pick(0), [ID.industryOne]);
  await seedProductIndustries(pick(1), [ID.industryTwo]);

  return {
    recipeIds: { one: ID.recipeOne, two: ID.recipeTwo },
    industryIds: { one: ID.industryOne, two: ID.industryTwo },
  };
}

/** Reverse-FK teardown for the orchestrator's seeded rows. */
export async function teardownPhase4Content(): Promise<void> {
  const db = await getTestDb();
  await db.execute(
    sql`DELETE FROM product_recipes WHERE recipe_id IN (
        ${ID.recipeOne}::uuid, ${ID.recipeTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM product_industries WHERE industry_id IN (
        ${ID.industryOne}::uuid, ${ID.industryTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM recipe WHERE id IN (
        ${ID.recipeOne}::uuid, ${ID.recipeTwo}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM industry WHERE id IN (
        ${ID.industryOne}::uuid, ${ID.industryTwo}::uuid)`,
  );
}
