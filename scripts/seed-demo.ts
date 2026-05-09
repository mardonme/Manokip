/**
 * Demo seed for client showcase (pre-launch scaffolding).
 *
 * WHAT: Inserts/upserts 4 categories, 6 manufacturers, 12 products with
 * uz-only translations + uz product_search rows.
 *
 * TWO LIFECYCLES (important):
 *   - PRODUCTS are demo. Tagged with sku prefix `DEMO-`. Wiped and
 *     re-inserted on every seed run. Removed entirely by --delete-only.
 *   - CATEGORIES and MANUFACTURERS are PERMANENT industry taxonomy.
 *     Inserted idempotently (select-then-insert on the uz translation
 *     unique slug). NEVER removed by --delete-only. Real products
 *     authored later via the admin UI reuse these same rows.
 *
 * WHY: Pre-launch demo for a client this week. After launch, the user
 * runs `pnpm db:unseed:demo` once to remove the demo products. Categories
 * and manufacturers stay; the user edits/extends them via the admin UI.
 *
 * HOW TO REMOVE DEMO PRODUCTS: `pnpm db:unseed:demo` — passes
 * --delete-only. Idempotent: safe to run any number of times. Only
 * deletes rows where sku LIKE 'DEMO-%'.
 *
 * IDEMPOTENCY: Re-running `pnpm db:seed:demo` yields stable counts:
 *   - products with sku LIKE 'DEMO-%' = 12 (wiped + reinserted each run)
 *   - the 4 demo category slugs and 6 demo manufacturer slugs are still
 *     present after re-run (insert-if-missing leaves existing rows alone,
 *     including any edits the user made via the admin UI).
 *
 * LOCALE: uz only. ru/en translation rows are NOT created. The public
 * PDP at /[locale]/products/[slug] returns 404 for ru/en — this is the
 * locked, accepted behavior. uz pages render with placeholder images
 * (imagePublicIds = []) and no spec values.
 *
 * URL AESTHETIC: Slugs are clean — `/uz/categories/manometrlar`, NOT
 * `/uz/categories/demo-manometrlar`. The DEMO- prefix lives ONLY in the
 * product `sku` column, which is never user-visible.
 *
 * PRODUCT_SEARCH: Rebuilds uz tsvector only, transcribed from
 * src/actions/products.ts:113-133. Spec aggregation simplified to ''
 * because demo products have zero spec values.
 *
 * AUDIT_LOG: Not written. audit_log columns are nullable and the table
 * has no DB-level trigger requiring rows; audit is a Server-Action
 * convention. The seed is tagged scaffolding and should not pollute
 * the audit trail.
 *
 * REVALIDATE: Not called — no Next.js runtime in CLI. The CLAUDE.md
 * cache-invalidation guardrail applies to Server Actions. After
 * seeding, restart `pnpm dev` or refresh a page once; RSC ISR
 * re-renders on next request.
 *
 * CONNECTION: DATABASE_URL_DIRECT (non-pooled). pgBouncer breaks
 * multi-statement transactions; this seed wraps all writes in a single
 * transaction so the direct URL is mandatory. Mirrors drizzle.config.ts
 * + scripts/verify-04-01-migration.ts.
 *
 * Run with: `pnpm db:seed:demo` or `pnpm db:unseed:demo`
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import {
  categories,
  categoryTranslations,
  manufacturers,
  manufacturerTranslations,
  products,
  productTranslations,
} from '../src/db/schema';

const url = process.env.DATABASE_URL_DIRECT;
if (!url) {
  console.error('[DEMO-SEED] DATABASE_URL_DIRECT not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle({ client: pool, casing: 'snake_case' });

// -------------------- demo content enumeration --------------------

type DemoCategory = {
  sortOrder: number;
  slug: string;
  name: string;
};

type DemoManufacturer = {
  slug: string;
  name: string;
  websiteUrl: string;
};

type DemoProduct = {
  sku: string;
  categorySlug: string;
  manufacturerSlug: string | null;
  slug: string;
  name: string;
  shortDesc: string;
};

const DEMO_CATEGORIES: DemoCategory[] = [
  { sortOrder: 0, slug: 'manometrlar', name: 'Manometrlar' },
  {
    sortOrder: 1,
    slug: 'diferensial-manometrlar',
    name: 'Diferensial manometrlar',
  },
  { sortOrder: 2, slug: 'bosim-datchiklari', name: 'Bosim datchiklari' },
  { sortOrder: 3, slug: 'bosim-relayalari', name: 'Bosim relayalari' },
];

const DEMO_MANUFACTURERS: DemoManufacturer[] = [
  { slug: 'wika', name: 'WIKA', websiteUrl: 'https://www.wika.com' },
  { slug: 'rosma', name: 'Rosma', websiteUrl: 'https://rosma.spb.ru' },
  { slug: 'manotom', name: 'Manotom', websiteUrl: 'https://manotom.com' },
  {
    slug: 'teplokontrol',
    name: 'Teplokontrol',
    websiteUrl: 'https://tgi-group.com',
  },
  { slug: 'fiztech', name: 'Fiztech', websiteUrl: 'https://fiztech.ru' },
  { slug: 'universal', name: 'Universal', websiteUrl: 'https://example.com' },
];

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    sku: 'DEMO-MAN-001',
    categorySlug: 'manometrlar',
    manufacturerSlug: 'wika',
    slug: 'wika-232-50-0-10-mpa',
    name: 'WIKA 232.50',
    shortDesc: 'Stainless 100mm tsiferblat, 1/2 NPT, 0–10 MPa',
  },
  {
    sku: 'DEMO-MAN-002',
    categorySlug: 'manometrlar',
    manufacturerSlug: 'wika',
    slug: 'wika-213-53-0-25-bar',
    name: 'WIKA 213.53',
    shortDesc: "Glitserin to'ldirilgan, 63mm tsiferblat, 0–25 bar",
  },
  {
    sku: 'DEMO-MAN-003',
    categorySlug: 'manometrlar',
    manufacturerSlug: 'rosma',
    slug: 'rosma-mp-100-0-1-6-mpa',
    name: 'Rosma MP-100',
    shortDesc: 'Korpus 100mm, M20×1.5, 0–1.6 MPa, sinf 1.5',
  },
  {
    sku: 'DEMO-MAN-004',
    categorySlug: 'manometrlar',
    manufacturerSlug: 'manotom',
    slug: 'manotom-tm-510-0-6-mpa',
    name: 'Manotom TM-510',
    shortDesc: '100mm radial, 0–6 MPa, axiriy aniqlik 1.0',
  },
  {
    sku: 'DEMO-DIF-001',
    categorySlug: 'diferensial-manometrlar',
    manufacturerSlug: 'wika',
    slug: 'wika-732-14-100-kpa',
    name: 'WIKA 732.14',
    shortDesc: 'Diferensial manometr, 0–100 kPa, sanoat ilovalari uchun',
  },
  {
    sku: 'DEMO-DIF-002',
    categorySlug: 'diferensial-manometrlar',
    manufacturerSlug: 'rosma',
    slug: 'rosma-dm-3583-25-kpa',
    name: 'Rosma DM-3583M',
    shortDesc: 'Diferensial bosim 0–25 kPa, gaz/suyuqlik uchun',
  },
  {
    sku: 'DEMO-SEN-001',
    categorySlug: 'bosim-datchiklari',
    manufacturerSlug: 'wika',
    slug: 'wika-s-20-4-20-ma',
    name: 'WIKA S-20',
    shortDesc: '4–20 mA chiqishi, 0–10 bar, IP65',
  },
  {
    sku: 'DEMO-SEN-002',
    categorySlug: 'bosim-datchiklari',
    manufacturerSlug: 'teplokontrol',
    slug: 'tgi-imt-10-0-25-bar',
    name: 'TGI IMT-10',
    shortDesc: 'Sanoat bosim datchigi, 0–25 bar, modbus RTU',
  },
  {
    sku: 'DEMO-SEN-003',
    categorySlug: 'bosim-datchiklari',
    manufacturerSlug: 'fiztech',
    slug: 'fiztech-pd-50-0-1-mpa',
    name: 'Fiztech PD-50',
    shortDesc: 'Pyezometrik datchik, 0–1 MPa, 0.5% aniqlik',
  },
  {
    sku: 'DEMO-REL-001',
    categorySlug: 'bosim-relayalari',
    manufacturerSlug: 'wika',
    slug: 'wika-pgs-23-0-16-bar',
    name: 'WIKA PGS 23',
    shortDesc: 'Bosim relayasi + manometr, 0–16 bar, SPDT kontakt',
  },
  {
    sku: 'DEMO-REL-002',
    categorySlug: 'bosim-relayalari',
    manufacturerSlug: 'manotom',
    slug: 'manotom-dem-202-0-6-bar',
    name: 'Manotom DEM-202',
    shortDesc: 'Elektromexanik bosim relayasi, 0–6 bar',
  },
  {
    sku: 'DEMO-REL-003',
    categorySlug: 'bosim-relayalari',
    manufacturerSlug: null,
    slug: 'generic-prs-1-0-10-bar',
    name: 'Generic PRS-1',
    shortDesc: "Universal bosim relayasi, 0–10 bar (manufacturer ko'rsatilmagan)",
  },
];

// -------------------- transactional helpers --------------------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Delete tagged demo products only. FK CASCADE on
 * product_translations.product_id and product_search.product_id (see
 * src/db/schema/products.ts + search.ts) handles dependent rows.
 *
 * Categories and manufacturers are permanent taxonomy and are NEVER
 * touched by this seed — see the file header.
 */
async function deleteDemoProducts(tx: Tx): Promise<number> {
  const result = await tx.execute<{ id: string }>(
    sql`DELETE FROM product WHERE sku LIKE 'DEMO-%' RETURNING id`,
  );
  const rows = Array.isArray(result)
    ? (result as unknown as { id: string }[])
    : ((result as unknown as { rows?: { id: string }[] }).rows ?? []);
  return rows.length;
}

/**
 * Idempotent upsert by uz translation slug. Returns slug -> categoryId.
 *
 * Strategy: select-then-insert on the translation's (locale, slug)
 * unique key. categories.id is `defaultRandom()` so ON CONFLICT on the
 * parent row is meaningless; the natural conflict key is on the
 * translation. select-first surfaces the existing parent uuid for the
 * products-insert pass.
 */
async function upsertCategories(tx: Tx): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const cat of DEMO_CATEGORIES) {
    const existing = await tx
      .select({ id: categoryTranslations.categoryId })
      .from(categoryTranslations)
      .where(
        sql`${categoryTranslations.locale} = 'uz' AND ${categoryTranslations.slug} = ${cat.slug}`,
      )
      .limit(1);
    if (existing.length > 0 && existing[0]) {
      out[cat.slug] = existing[0].id;
      continue;
    }
    const inserted = await tx
      .insert(categories)
      .values({ parentId: null, sortOrder: cat.sortOrder })
      .returning({ id: categories.id });
    const row = inserted[0];
    if (!row) {
      throw new Error(`[DEMO-SEED] failed to insert category ${cat.slug}`);
    }
    await tx.insert(categoryTranslations).values({
      categoryId: row.id,
      locale: 'uz',
      name: cat.name,
      slug: cat.slug,
    });
    out[cat.slug] = row.id;
  }
  return out;
}

/**
 * Idempotent upsert by uz translation slug. Returns slug -> manufacturerId.
 * Same pattern as upsertCategories.
 */
async function upsertManufacturers(
  tx: Tx,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const mfr of DEMO_MANUFACTURERS) {
    const existing = await tx
      .select({ id: manufacturerTranslations.manufacturerId })
      .from(manufacturerTranslations)
      .where(
        sql`${manufacturerTranslations.locale} = 'uz' AND ${manufacturerTranslations.slug} = ${mfr.slug}`,
      )
      .limit(1);
    if (existing.length > 0 && existing[0]) {
      out[mfr.slug] = existing[0].id;
      continue;
    }
    const inserted = await tx
      .insert(manufacturers)
      .values({
        logoPublicId: null,
        websiteUrl: mfr.websiteUrl,
        isOfficialRep: false,
      })
      .returning({ id: manufacturers.id });
    const row = inserted[0];
    if (!row) {
      throw new Error(`[DEMO-SEED] failed to insert manufacturer ${mfr.slug}`);
    }
    await tx.insert(manufacturerTranslations).values({
      manufacturerId: row.id,
      locale: 'uz',
      name: mfr.name,
      slug: mfr.slug,
    });
    out[mfr.slug] = row.id;
  }
  return out;
}

/**
 * uz product_search rebuild — verbatim transcription of the uz branch
 * from src/actions/products.ts:113-133. Demo products carry zero
 * product_spec_values rows, so the spec aggregation simplifies to
 * literal '' (the production lateral join would return NULL anyway,
 * which coalesce(..., '') already handles).
 *
 * ON CONFLICT (product_id, locale) DO UPDATE matches the schema
 * primary key (src/db/schema/search.ts:34) — re-runs replace the
 * tsvector in place, no row growth.
 */
async function rebuildSearchUz(tx: Tx, productId: string): Promise<void> {
  await tx.execute(sql`
    INSERT INTO product_search (product_id, locale, search_tsv)
    SELECT ${productId}::uuid, 'uz'::text,
      setweight(to_tsvector('simple'::regconfig, coalesce(t.name, '')), 'A') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(t.short_desc, '')), 'B') ||
      setweight(to_tsvector('simple'::regconfig, coalesce(t.long_desc, '')), 'C') ||
      setweight(to_tsvector('simple'::regconfig, coalesce('', '')), 'D')
    FROM product_translations t
    WHERE t.product_id = ${productId}::uuid AND t.locale = 'uz'::text
    ON CONFLICT (product_id, locale) DO UPDATE SET search_tsv = EXCLUDED.search_tsv
  `);
}

async function seedProducts(
  tx: Tx,
  catIdBySlug: Record<string, string>,
  mfrIdBySlug: Record<string, string>,
): Promise<void> {
  for (const p of DEMO_PRODUCTS) {
    const categoryId = catIdBySlug[p.categorySlug];
    if (!categoryId) {
      throw new Error(
        `[DEMO-SEED] unknown category slug ${p.categorySlug} for ${p.sku}`,
      );
    }
    const manufacturerId = p.manufacturerSlug
      ? mfrIdBySlug[p.manufacturerSlug]
      : null;
    if (p.manufacturerSlug && !manufacturerId) {
      throw new Error(
        `[DEMO-SEED] unknown manufacturer slug ${p.manufacturerSlug} for ${p.sku}`,
      );
    }
    const inserted = await tx
      .insert(products)
      .values({
        categoryId,
        manufacturerId: manufacturerId ?? null,
        sku: p.sku,
        status: 'published',
        publishedAt: new Date(),
        // imagePublicIds + datasheetPublicIds default to '{}' per schema
      })
      .returning({ id: products.id });
    const row = inserted[0];
    if (!row) {
      throw new Error(`[DEMO-SEED] failed to insert product ${p.sku}`);
    }
    await tx.insert(productTranslations).values({
      productId: row.id,
      locale: 'uz',
      name: p.name,
      slug: p.slug,
      shortDesc: p.shortDesc,
      longDesc: null,
    });
    await rebuildSearchUz(tx, row.id);
  }
}

// -------------------- count helpers (post-tx assertions) --------------------

async function countOne(tx: Tx, query: ReturnType<typeof sql>): Promise<number> {
  const result = await tx.execute<{ count: string | number }>(query);
  const rows = Array.isArray(result)
    ? (result as unknown as { count: string | number }[])
    : ((result as unknown as { rows?: { count: string | number }[] }).rows ?? []);
  const first = rows[0];
  if (!first) return 0;
  return Number(first.count);
}

// -------------------- entry point --------------------

async function main(): Promise<void> {
  const deleteOnly = process.argv.includes('--delete-only');

  if (deleteOnly) {
    let removed = 0;
    await db.transaction(async (tx) => {
      removed = await deleteDemoProducts(tx);
    });
    console.log(
      `[DEMO-SEED] unseed complete — ${removed} demo products removed. Categories and manufacturers preserved.`,
    );
    return;
  }

  await db.transaction(async (tx) => {
    const removed = await deleteDemoProducts(tx);
    console.log(
      `[DEMO-SEED] cleared ${removed} prior demo product(s) (sku LIKE 'DEMO-%').`,
    );

    const catIdBySlug = await upsertCategories(tx);
    console.log(
      `[DEMO-SEED] categories ready (${Object.keys(catIdBySlug).length}/${DEMO_CATEGORIES.length} demo slugs resolved).`,
    );

    const mfrIdBySlug = await upsertManufacturers(tx);
    console.log(
      `[DEMO-SEED] manufacturers ready (${Object.keys(mfrIdBySlug).length}/${DEMO_MANUFACTURERS.length} demo slugs resolved).`,
    );

    await seedProducts(tx, catIdBySlug, mfrIdBySlug);
    console.log(
      `[DEMO-SEED] inserted ${DEMO_PRODUCTS.length} demo products (uz translations + uz product_search rows).`,
    );

    const productCount = await countOne(
      tx,
      sql`SELECT count(*)::int AS count FROM product WHERE sku LIKE 'DEMO-%'`,
    );
    const categoryCount = await countOne(
      tx,
      sql`SELECT count(*)::int AS count FROM category_translations
          WHERE locale = 'uz' AND slug IN (
            'manometrlar','diferensial-manometrlar','bosim-datchiklari','bosim-relayalari'
          )`,
    );
    const manufacturerCount = await countOne(
      tx,
      sql`SELECT count(*)::int AS count FROM manufacturer_translations
          WHERE locale = 'uz' AND slug IN (
            'wika','rosma','manotom','teplokontrol','fiztech','universal'
          )`,
    );
    const searchCount = await countOne(
      tx,
      sql`SELECT count(*)::int AS count FROM product_search ps
          JOIN product p ON p.id = ps.product_id
          WHERE p.sku LIKE 'DEMO-%' AND ps.locale = 'uz'`,
    );

    console.log(
      `[DEMO-SEED] seed complete — products=${productCount} (sku LIKE 'DEMO-%'), categories present=${categoryCount}, manufacturers present=${manufacturerCount}, uz search rows=${searchCount}.`,
    );

    if (productCount !== DEMO_PRODUCTS.length) {
      throw new Error(
        `[DEMO-SEED] integrity check failed — expected ${DEMO_PRODUCTS.length} products, got ${productCount}`,
      );
    }
    if (searchCount !== DEMO_PRODUCTS.length) {
      throw new Error(
        `[DEMO-SEED] integrity check failed — expected ${DEMO_PRODUCTS.length} uz search rows, got ${searchCount}`,
      );
    }
    if (categoryCount < DEMO_CATEGORIES.length) {
      throw new Error(
        `[DEMO-SEED] integrity check failed — expected at least ${DEMO_CATEGORIES.length} demo category slugs, got ${categoryCount}`,
      );
    }
    if (manufacturerCount < DEMO_MANUFACTURERS.length) {
      throw new Error(
        `[DEMO-SEED] integrity check failed — expected at least ${DEMO_MANUFACTURERS.length} demo manufacturer slugs, got ${manufacturerCount}`,
      );
    }
  });
}

main()
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DEMO-SEED] FATAL:', msg);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
