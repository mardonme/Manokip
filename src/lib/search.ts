// Plan 03-06 Task 6.1 — Public-side full-text search helpers (SRCH-01, SRCH-02,
// SRCH-03, SRCH-04 lib layer).
//
// Three exported helpers:
//
//   1. skuExactMatch(skuInput, locale)
//        SRCH-04 / D-07 — exact, trimmed, case-insensitive `product.sku` lookup
//        scoped to a published product whose translation row exists in the
//        current locale. Returns `{ productId, slug }` (the slug from the
//        current-locale translation, used to construct the redirect target)
//        or null. NEVER echoes user input into the redirect URL — the slug
//        comes from DB so an attacker cannot use the SKU input to redirect
//        elsewhere (T-03-06-02 / T-V7-01 mitigation).
//
//   2. searchProducts(query, currentLocale, page, pageSize)
//        SRCH-01 ranked tsvector results in the current locale. If 0 hits,
//        cascade through ['uz', 'ru', 'en'] (excluding currentLocale) and stop
//        at the first non-empty locale. Returns `{ rows, total, fallbackLocale,
//        query }`. Each row carries D-06 breadcrumb chip data (manufacturer
//        name + category name in the result locale) AND the hero image
//        (`product.image_public_ids[0]`) so ProductCard renders correctly on
//        the search results page WITHOUT hardcoded nulls.
//
//   3. searchAutocomplete(query, locale)
//        SRCH-03 — ≤10 suggestions for the header dropdown. UNION of
//        prefix-matching products (`to_tsquery(cfg, 'token:*')` + LIKE on SKU)
//        with SKU exact matches sorted to the top. Each row carries the same
//        D-06 chip data. Sanitization: tsquery operators `!&|():*` are
//        stripped before constructing the prefix term (Pitfall #3 / T-V5-01
//        mitigation); only the FIRST whitespace-delimited token is forwarded
//        to to_tsquery — multi-token autocomplete (`mano stainless`) would
//        require an `&`-joined query that the user expects to be a name
//        prefix, not a phrase.
//
// All three helpers run against `product_search` (per-locale tsvector with GIN
// index) JOINed to `product_translations` for slug/name/short_desc and to
// `manufacturer_translations` + `category_translations` for the per-locale
// chip data. Drizzle's `sql\`\`` parameter binding is the structural mitigation
// for T-V5-01 / T-V5-02 — every literal value (locale, query, regconfig key)
// flows through `${...}` template-tag binding, never string concatenation.
//
// pg_config map: uz→simple, ru→russian, en→english. The map is keyed by
// `Locale` so the regconfig cast value is NEVER user-controlled.

import { sql, eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { products, productTranslations } from '@/db/schema';

export type Locale = 'uz' | 'ru' | 'en';

const PG_CONFIG: Record<Locale, string> = {
  uz: 'simple',
  ru: 'russian',
  en: 'english',
};

const FALLBACK_ORDER: Locale[] = ['uz', 'ru', 'en'];

// ────────────────────────────────────────────────────────────────────────────
// skuExactMatch (SRCH-04 / D-07)
// ────────────────────────────────────────────────────────────────────────────

export interface SkuMatch {
  productId: string;
  slug: string;
}

export async function skuExactMatch(
  skuInput: string,
  locale: Locale,
): Promise<SkuMatch | null> {
  const sku = skuInput.trim();
  if (!sku) return null;
  const rows = await db
    .select({ productId: products.id, slug: productTranslations.slug })
    .from(products)
    .innerJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.locale, locale),
      ),
    )
    .where(
      and(
        sql`LOWER(${products.sku}) = LOWER(${sku})`,
        eq(products.status, 'published'),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// searchProducts (SRCH-01, SRCH-02 + D-06)
// ────────────────────────────────────────────────────────────────────────────

// D-06: every search result row carries the full breadcrumb chip data
// (manufacturer name + category name in the result locale) AND the hero
// image_public_ids[0] so ProductCard renders correctly without hardcoded
// nulls on /[locale]/search.
export interface SearchResultRow {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  sku: string | null;
  heroPublicId: string | null;
  manufacturerName: string | null;
  categoryName: string | null;
  rank: number;
}

export interface SearchResult {
  rows: SearchResultRow[];
  total: number;
  /** null = current-locale hit; otherwise the locale name where the cascade landed. */
  fallbackLocale: Locale | null;
  query: string;
}

async function runFtsQuery(
  query: string,
  locale: Locale,
  page: number,
  pageSize: number,
): Promise<SearchResultRow[]> {
  const cfg = PG_CONFIG[locale];
  const offset = (page - 1) * pageSize;
  // D-06 — JOIN manufacturer_translations + category_translations on the
  // result locale and project image_public_ids[1] (PG arrays are 1-indexed)
  // so ProductCard receives full data per row. plainto_tsquery handles user
  // input safely (Postgres does the sanitization for us — T-03-06-01).
  const result = await db.execute(sql`
    SELECT p.id,
           ts_rank_cd(s.search_tsv, q.tsq) AS rank,
           pt.name, pt.slug, pt.short_desc,
           p.sku,
           (p.image_public_ids)[1] AS hero_public_id,
           mt.name AS manufacturer_name,
           ct.name AS category_name
    FROM product_search s
    JOIN product p ON p.id = s.product_id AND p.status = 'published'
    JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ${locale}::text
    LEFT JOIN manufacturer m ON m.id = p.manufacturer_id
    LEFT JOIN manufacturer_translations mt ON mt.manufacturer_id = m.id AND mt.locale = ${locale}::text
    LEFT JOIN category c ON c.id = p.category_id
    LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = ${locale}::text
    CROSS JOIN (SELECT plainto_tsquery(${cfg}::regconfig, ${query}) AS tsq) q
    WHERE s.locale = ${locale}::text AND s.search_tsv @@ q.tsq
    ORDER BY rank DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);
  // db.execute returns `{ rows: any[] }` — cast to a typed shape and project
  // each PG snake_case column into the camelCase DTO ProductCard expects.
  return (result.rows as Array<Record<string, unknown>>).map((r) => ({
    id: r['id'] as string,
    name: r['name'] as string,
    slug: r['slug'] as string,
    shortDesc: (r['short_desc'] as string | null) ?? null,
    sku: (r['sku'] as string | null) ?? null,
    heroPublicId: (r['hero_public_id'] as string | null) ?? null,
    manufacturerName: (r['manufacturer_name'] as string | null) ?? null,
    categoryName: (r['category_name'] as string | null) ?? null,
    rank: Number(r['rank']),
  }));
}

export async function searchProducts(
  query: string,
  currentLocale: Locale,
  page = 1,
  pageSize = 20,
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) {
    return { rows: [], total: 0, fallbackLocale: null, query: q };
  }
  const primary = await runFtsQuery(q, currentLocale, page, pageSize);
  if (primary.length > 0) {
    return {
      rows: primary,
      total: primary.length,
      fallbackLocale: null,
      query: q,
    };
  }
  // D-05 cascade: current → uz → ru → en. Skip currentLocale (already tried).
  for (const fbLocale of FALLBACK_ORDER) {
    if (fbLocale === currentLocale) continue;
    const fb = await runFtsQuery(q, fbLocale, page, pageSize);
    if (fb.length > 0) {
      return {
        rows: fb,
        total: fb.length,
        fallbackLocale: fbLocale,
        query: q,
      };
    }
  }
  return { rows: [], total: 0, fallbackLocale: null, query: q };
}

// ────────────────────────────────────────────────────────────────────────────
// searchAutocomplete (SRCH-03 + D-06)
// ────────────────────────────────────────────────────────────────────────────

export interface AutocompleteSuggestion {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  manufacturerName: string | null;
  categoryName: string | null;
  isSkuMatch: boolean;
}

export async function searchAutocomplete(
  query: string,
  locale: Locale,
): Promise<AutocompleteSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Pitfall #3 / T-V5-01 mitigation: strip tsquery operators before appending
  // the `:*` prefix marker. Without sanitization a query like `!&|()foo`
  // would produce an invalid tsquery and Postgres would throw SQLSTATE 42601.
  // We strip operators, collapse whitespace, then take the FIRST token —
  // multi-token autocomplete needs an `&`-joined tsquery (a future feature)
  // and would change the UX from "name prefix" to "all-words match".
  const sanitized = q
    .replace(/[!&|():*]/g, ' ')
    .trim()
    .split(/\s+/)[0];
  if (!sanitized) return [];

  const cfg = PG_CONFIG[locale];
  const tsq = `${sanitized}:*`;
  const skuLike = `${sanitized.toLowerCase()}%`;

  const result = await db.execute(sql`
    WITH name_hits AS (
      SELECT p.id, pt.name, pt.slug, p.sku,
             mt.name AS manufacturer_name, ct.name AS category_name,
             false::boolean AS is_sku_match,
             ts_rank_cd(s.search_tsv, to_tsquery(${cfg}::regconfig, ${tsq})) AS rank
      FROM product_search s
      JOIN product p ON p.id = s.product_id AND p.status = 'published'
      JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ${locale}::text
      LEFT JOIN manufacturer m ON m.id = p.manufacturer_id
      LEFT JOIN manufacturer_translations mt ON mt.manufacturer_id = m.id AND mt.locale = ${locale}::text
      LEFT JOIN category c ON c.id = p.category_id
      LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = ${locale}::text
      WHERE s.locale = ${locale}::text
        AND s.search_tsv @@ to_tsquery(${cfg}::regconfig, ${tsq})
      ORDER BY rank DESC
      LIMIT 8
    ),
    sku_hits AS (
      SELECT p.id, pt.name, pt.slug, p.sku,
             mt.name AS manufacturer_name, ct.name AS category_name,
             true::boolean AS is_sku_match,
             1.0::float AS rank
      FROM product p
      JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ${locale}::text
      LEFT JOIN manufacturer m ON m.id = p.manufacturer_id
      LEFT JOIN manufacturer_translations mt ON mt.manufacturer_id = m.id AND mt.locale = ${locale}::text
      LEFT JOIN category c ON c.id = p.category_id
      LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = ${locale}::text
      WHERE p.status = 'published'
        AND p.sku IS NOT NULL
        AND LOWER(p.sku) LIKE ${skuLike}
      LIMIT 4
    )
    SELECT DISTINCT ON (id) id, name, slug, sku, manufacturer_name, category_name, is_sku_match, rank
    FROM (SELECT * FROM sku_hits UNION ALL SELECT * FROM name_hits) all_hits
    ORDER BY id, is_sku_match DESC, rank DESC
    LIMIT 10
  `);

  // Re-sort the deduped set: SKU matches first (D-06), then by rank desc, then
  // by name. Postgres's DISTINCT ON returns rows in the inner ORDER BY's
  // (id, is_sku_match, rank) order — we need the FINAL display order to be
  // (is_sku_match desc, rank desc, name) so the SQL's per-id dedup picks the
  // SKU-match version when both shapes exist for the same product.
  const out = (result.rows as Array<Record<string, unknown>>).map((r) => ({
    id: r['id'] as string,
    name: r['name'] as string,
    slug: r['slug'] as string,
    sku: (r['sku'] as string | null) ?? null,
    manufacturerName: (r['manufacturer_name'] as string | null) ?? null,
    categoryName: (r['category_name'] as string | null) ?? null,
    isSkuMatch: r['is_sku_match'] as boolean,
  }));
  out.sort(
    (a, b) =>
      Number(b.isSkuMatch) - Number(a.isSkuMatch) ||
      a.name.localeCompare(b.name),
  );
  return out;
}
