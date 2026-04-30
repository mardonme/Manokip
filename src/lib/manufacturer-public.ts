// Plan 03-07 Task 7.2 — public manufacturer data layer (MFG-01 / MFG-02 / D-10).
//
// Three exported helpers consumed by the public manufacturer index + detail
// pages:
//
//   1. getManufacturers(locale)
//        Returns every manufacturer as a card (logo public_id + display name +
//        per-locale slug + isOfficialRep flag + count of published products).
//        Used by /[locale]/manufacturers index page (MFG-01).
//
//   2. getManufacturerBySlug(locale, slug)
//        Resolves a slug under the current locale to the manufacturer row +
//        per-locale slug map for hreflang (Pitfall #6 — never advertise a
//        404). Returns null when the slug doesn't exist for that locale (page
//        → notFound()). Cross-locale fallback to uz when the current-locale
//        translation row is missing (Phase-1 D-05 cascade root). Used by
//        /[locale]/manufacturers/<slug> detail page (MFG-02 + D-11).
//
//   3. getManufacturerProducts(manufacturerId, locale, page, pageSize)
//        Server-paginated published-products slice scoped to a manufacturer
//        (no category filter). Mirrors getCategoryProducts but the parent
//        scope is `product.manufacturer_id` instead of `product.category_id`.
//
// Cache + invalidation contract (Phase 2 D-12 fan-out):
//   - 'use cache' wraps each helper body.
//   - getManufacturers tags `manufacturers-list` so revalidateManufacturer()
//     also busts the index page (per src/lib/revalidation.ts Phase-2 fan-out).
//   - getManufacturerBySlug tags `manufacturer:<id>` so toggling
//     is_official_rep or editing relationship_note busts the detail page.
//   - getManufacturerProducts tags both `manufacturer:<id>` (to bust on
//     manufacturer mutations) and `products-list` (so when products move
//     between manufacturers the page invalidates).
//
// Pitfall #2 (only primitives cross the cache boundary): callers pass the
// resolved (locale, slug, page, pageSize) — all primitives. The helpers
// resolve everything internally.

import { sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { db } from '@/db/client';

export type Locale = 'uz' | 'ru' | 'en';

const ALL_LOCALES: Locale[] = ['uz', 'ru', 'en'];
function isLocale(l: string): l is Locale {
  return l === 'uz' || l === 'ru' || l === 'en';
}

/* -----------------------------------------------------------------------------
 * Card data — index page (MFG-01)
 * ---------------------------------------------------------------------------*/

export interface ManufacturerCardData {
  id: string;
  logoPublicId: string | null;
  /** Display name in the current locale (uz fallback when missing). */
  name: string;
  /** Per-locale slug for the link target. Empty when the locale row is missing. */
  slug: string;
  isOfficialRep: boolean;
  /** Count of published products attributed to this manufacturer. */
  productCount: number;
}

export async function getManufacturers(
  locale: Locale,
): Promise<ManufacturerCardData[]> {
  'use cache';
  cacheTag('manufacturers-list');

  // LEFT JOIN per-locale translation row + correlated subquery for the
  // published-product count. ORDER BY translated name (NULLS LAST so a
  // manufacturer missing the current-locale translation still appears at
  // the bottom of the list rather than dropping out).
  const rows = await db.execute<{
    id: string;
    logo_public_id: string | null;
    is_official_rep: boolean;
    name: string | null;
    slug: string | null;
    product_count: string;
  }>(sql`
    SELECT m.id,
           m.logo_public_id,
           m.is_official_rep,
           t.name,
           t.slug,
           (SELECT COUNT(*)
              FROM product p
             WHERE p.manufacturer_id = m.id
               AND p.status = 'published')::bigint AS product_count
      FROM manufacturer m
      LEFT JOIN manufacturer_translations t
        ON t.manufacturer_id = m.id
       AND t.locale = ${locale}
     ORDER BY t.name ASC NULLS LAST, m.id ASC
  `);

  return rows.rows.map((r) => ({
    id: r.id,
    logoPublicId: r.logo_public_id,
    name: r.name ?? '',
    slug: r.slug ?? '',
    isOfficialRep: r.is_official_rep,
    productCount: Number(r.product_count),
  }));
}

/* -----------------------------------------------------------------------------
 * Detail data — landing page (MFG-02 / D-10 / D-11)
 * ---------------------------------------------------------------------------*/

export interface ManufacturerDetailData {
  id: string;
  logoPublicId: string | null;
  websiteUrl: string | null;
  isOfficialRep: boolean;
  /** Per-locale slugs for hreflang map. Missing locales are undefined per Pitfall #6. */
  slugByLocale: Partial<Record<Locale, string>>;
  /** Display name in the current locale (uz cross-locale fallback when missing). */
  name: string;
  /** Per-locale bio (description column). Same fallback chain as name. */
  description: string | null;
  /** D-11 per-locale relationship note. ONLY current-locale value rendered. */
  relationshipNote: string | null;
}

export async function getManufacturerBySlug(
  locale: Locale,
  slug: string,
): Promise<ManufacturerDetailData | null> {
  'use cache';

  // Step 1: resolve the manufacturer id by (locale, slug).
  const head = await db.execute<{ manufacturer_id: string }>(sql`
    SELECT manufacturer_id
      FROM manufacturer_translations
     WHERE locale = ${locale}
       AND slug = ${slug}
     LIMIT 1
  `);

  const headRow = head.rows[0];
  if (!headRow) return null;
  const manufacturerId = headRow.manufacturer_id;

  // Tag the resolved manufacturer specifically so Phase-2 revalidateManufacturer
  // invalidates this row (3 tags fan out: manufacturer:<id>, manufacturers-list,
  // sitemap — see src/lib/revalidation.ts).
  cacheTag(`manufacturer:${manufacturerId}`);

  // Step 2: pull the base row + ALL 3 locale translations in parallel for
  // hreflang fan-out.
  const [baseRows, trRows] = await Promise.all([
    db.execute<{
      id: string;
      logo_public_id: string | null;
      website_url: string | null;
      is_official_rep: boolean;
    }>(sql`
      SELECT id, logo_public_id, website_url, is_official_rep
        FROM manufacturer
       WHERE id = ${manufacturerId}::uuid
       LIMIT 1
    `),
    db.execute<{
      locale: string;
      name: string;
      slug: string;
      description: string | null;
      relationship_note: string | null;
    }>(sql`
      SELECT locale, name, slug, description, relationship_note
        FROM manufacturer_translations
       WHERE manufacturer_id = ${manufacturerId}::uuid
    `),
  ]);

  const base = baseRows.rows[0];
  if (!base) return null;

  const slugByLocale: Partial<Record<Locale, string>> = {};
  let displayRow: (typeof trRows.rows)[number] | undefined = undefined;
  let uzRow: (typeof trRows.rows)[number] | undefined = undefined;
  for (const r of trRows.rows) {
    if (isLocale(r.locale)) {
      slugByLocale[r.locale] = r.slug;
    }
    if (r.locale === locale) displayRow = r;
    if (r.locale === 'uz') uzRow = r;
  }

  // Cross-locale fallback to uz when the current-locale translation is
  // missing (Phase-1 D-05 cascade root). relationshipNote is per-locale ONLY —
  // never falls back, since it is rendered as in-locale copy. If no uz row
  // either, fall to the first available row to avoid a blank page.
  const fallbackName = displayRow ?? uzRow ?? trRows.rows[0];

  return {
    id: base.id,
    logoPublicId: base.logo_public_id,
    websiteUrl: base.website_url,
    isOfficialRep: base.is_official_rep,
    slugByLocale,
    name: fallbackName?.name ?? '',
    description: fallbackName?.description ?? null,
    // Per-locale ONLY — explicitly pull from displayRow, not the fallback.
    relationshipNote: displayRow?.relationship_note ?? null,
  };
}

/* -----------------------------------------------------------------------------
 * Paginated product grid scoped to a manufacturer (MFG-02 product list)
 * ---------------------------------------------------------------------------*/

export interface ManufacturerProductRow {
  id: string;
  slug: string;
  name: string;
  shortDesc: string | null;
  heroPublicId: string | null;
  manufacturerName: string | null;
  sku: string | null;
}

export interface ManufacturerProductsResult {
  rows: ManufacturerProductRow[];
  total: number;
}

export async function getManufacturerProducts(
  manufacturerId: string,
  locale: Locale,
  page: number,
  pageSize: number,
): Promise<ManufacturerProductsResult> {
  'use cache';
  cacheTag(`manufacturer:${manufacturerId}`);
  cacheTag('products-list');

  const safePage = Math.max(1, page | 0);
  const safeSize = Math.max(1, Math.min(100, pageSize | 0));
  const offset = (safePage - 1) * safeSize;

  // Mirrors src/lib/catalog.ts getCategoryProducts but parent scope is
  // manufacturer_id instead of category_id. ProductCard is reused upstream.
  const baseRows = await db.execute<{
    id: string;
    name: string | null;
    slug: string | null;
    short_desc: string | null;
    image_public_ids: string[] | null;
    sku: string | null;
    manufacturer_name: string | null;
  }>(sql`
    SELECT p.id,
           pt.name,
           pt.slug,
           pt.short_desc,
           p.image_public_ids,
           p.sku,
           mt.name AS manufacturer_name
      FROM product p
      LEFT JOIN product_translations pt
        ON pt.product_id = p.id
       AND pt.locale = ${locale}
      LEFT JOIN manufacturer_translations mt
        ON mt.manufacturer_id = p.manufacturer_id
       AND mt.locale = ${locale}
     WHERE p.manufacturer_id = ${manufacturerId}::uuid
       AND p.status = 'published'
     ORDER BY pt.name ASC NULLS LAST, p.id ASC
     LIMIT ${safeSize} OFFSET ${offset}
  `);

  const countRows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::bigint AS count
      FROM product p
     WHERE p.manufacturer_id = ${manufacturerId}::uuid
       AND p.status = 'published'
  `);

  const rows: ManufacturerProductRow[] = baseRows.rows
    .filter((r) => r.slug)
    .map((r) => ({
      id: r.id,
      name: r.name ?? '',
      slug: r.slug as string,
      shortDesc: r.short_desc,
      heroPublicId:
        Array.isArray(r.image_public_ids) && r.image_public_ids.length > 0
          ? (r.image_public_ids[0] ?? null)
          : null,
      manufacturerName: r.manufacturer_name,
      sku: r.sku,
    }));

  const totalRaw = countRows.rows[0]?.count ?? '0';
  const total = Number(totalRaw);

  return { rows, total };
}

// Defensive locale-list export — kept symmetric with src/lib/catalog.ts.
export { ALL_LOCALES };
