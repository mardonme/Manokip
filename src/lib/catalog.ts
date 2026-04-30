// Plan 03-04 Task 4.1 — public catalog data layer (CAT-02 / CAT-03 / CAT-04 / CAT-05).
//
// Three exported helpers that the `/[locale]/categories/...` RSC pages compose:
//
//   1. getCategoryBySlug(locale, slug)
//        Resolves a slug under the current locale to the category row + the
//        per-locale slug map for hreflang. Returns null when the slug doesn't
//        exist for that locale (page → notFound()).
//
//   2. getCategoryFilterSchema(categoryId, locale)
//        Returns the spec_field rows that drive the FilterSidebar — only those
//        with filter_kind IS NOT NULL. Each row's `label` arrives via
//        spec_field_translations(locale=current). Enum-kind fields carry their
//        per-locale option labels via spec_field_enum_option +
//        spec_field_enum_option_translations. (B4 resolved using the Phase-1
//        baseline schema — no migration needed.)
//
//   3. getCategoryProducts(categoryId, locale, filters, page, pageSize)
//        Server-paginated product slice with EAV filter EXISTS subqueries
//        (Pattern 5). Filter shapes: numeric range, enum set, bool. Whitelisted
//        against the schema BEFORE building any SQL (T-V5-02 mitigation).
//
// All three are wrapped in `'use cache'` + `cacheTag('category:<id>')` so the
// Phase-2 `revalidateCategory(id)` fan-out invalidates them whenever a
// category, product, or spec mutation lands. Pitfall #2: only primitive args
// cross the cache boundary — searchParams MUST be parsed by the caller and
// the resolved values passed in as serializable shapes.
//
// Defensive label fallback: when spec_field_translations is missing for the
// current locale, COALESCE to spec_field.key so the sidebar still renders.

import { sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { db } from '@/db/client';

export type Locale = 'uz' | 'ru' | 'en';

export interface CategoryFilterValue {
  kind: 'range' | 'select' | 'toggle';
  key: string;
  // kind=range:  min and/or max set (filter omits unset bound)
  // kind=select: values is non-empty array of option keys
  // kind=toggle: bool is true|false (omit filter when undefined)
  min?: number;
  max?: number;
  values?: string[];
  bool?: boolean;
}

export interface CategoryFilterSchemaEntry {
  specFieldId: string;
  key: string;
  label: string;
  dataType: 'number' | 'text' | 'enum' | 'bool';
  filterKind: 'range' | 'select' | 'toggle';
  unit: string | null;
  sortOrder: number;
  /** For enum-kind: per-locale option labels. Empty array for non-enum. */
  options?: Array<{ key: string; label: string }>;
}

export interface CategoryRowResult {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  heroPublicId: string | null;
  manufacturerName: string | null;
  sku: string | null;
}

export interface CategoryProductsResult {
  rows: CategoryRowResult[];
  total: number;
}

export interface CategoryBySlugResult {
  id: string;
  parentId: string | null;
  sortOrder: number;
  slugByLocale: Partial<Record<Locale, string>>;
  nameByLocale: Partial<Record<Locale, string>>;
}

const LOCALES: Locale[] = ['uz', 'ru', 'en'];
function isLocale(l: string): l is Locale {
  return l === 'uz' || l === 'ru' || l === 'en';
}

/* -----------------------------------------------------------------------------
 * getCategoryBySlug
 * ---------------------------------------------------------------------------*/

export async function getCategoryBySlug(
  locale: Locale,
  slug: string,
): Promise<CategoryBySlugResult | null> {
  'use cache';
  cacheTag('categories-tree');

  // Step 1: resolve the category id by (locale, slug).
  const idRows = await db.execute<{
    id: string;
    parent_id: string | null;
    sort_order: number;
  }>(sql`
    SELECT c.id, c.parent_id, c.sort_order
      FROM category c
      JOIN category_translations ct
        ON ct.category_id = c.id
       AND ct.locale = ${locale}
     WHERE ct.slug = ${slug}
     LIMIT 1
  `);

  const head = idRows.rows[0];
  if (!head) return null;

  // Tag the resolved category specifically so Phase-2 revalidateCategory
  // invalidates this row.
  cacheTag(`category:${head.id}`);

  // Step 2: pull all 3 locale rows for hreflang.
  const trRows = await db.execute<{
    locale: string;
    name: string;
    slug: string;
  }>(sql`
    SELECT locale, name, slug
      FROM category_translations
     WHERE category_id = ${head.id}::uuid
  `);

  const slugByLocale: Partial<Record<Locale, string>> = {};
  const nameByLocale: Partial<Record<Locale, string>> = {};
  for (const r of trRows.rows) {
    if (isLocale(r.locale)) {
      slugByLocale[r.locale] = r.slug;
      nameByLocale[r.locale] = r.name;
    }
  }

  return {
    id: head.id,
    parentId: head.parent_id,
    sortOrder: head.sort_order,
    slugByLocale,
    nameByLocale,
  };
}

/* -----------------------------------------------------------------------------
 * getCategoryFilterSchema
 * ---------------------------------------------------------------------------*/

export async function getCategoryFilterSchema(
  categoryId: string,
  locale: Locale,
): Promise<CategoryFilterSchemaEntry[]> {
  'use cache';
  cacheTag(`category:${categoryId}`);
  cacheTag(`spec-field-group:${categoryId}`);

  // INNER spec_field rows + LEFT JOIN spec_field_translations for the
  // current locale. Defensive COALESCE to spec_field.key when the per-locale
  // translation row is missing (defense in depth — Phase-2 admin form
  // requires all 3 locales but this guards against partial seeds).
  const fieldRows = await db.execute<{
    id: string;
    key: string;
    data_type: 'number' | 'text' | 'enum' | 'bool';
    filter_kind: 'range' | 'select' | 'toggle';
    unit: string | null;
    sort_order: number;
    label: string;
  }>(sql`
    SELECT sf.id, sf.key, sf.data_type, sf.filter_kind, sf.unit, sf.sort_order,
           COALESCE(sft.label, sf.key) AS label
      FROM spec_field sf
      LEFT JOIN spec_field_translations sft
        ON sft.spec_field_id = sf.id
       AND sft.locale = ${locale}
     WHERE sf.category_id = ${categoryId}::uuid
       AND sf.deleted_at IS NULL
       AND sf.filter_kind IS NOT NULL
     ORDER BY sf.sort_order ASC, sf.key ASC
  `);

  const entries: CategoryFilterSchemaEntry[] = fieldRows.rows.map((r) => ({
    specFieldId: r.id,
    key: r.key,
    label: r.label,
    dataType: r.data_type,
    filterKind: r.filter_kind,
    unit: r.unit,
    sortOrder: r.sort_order,
  }));

  const enumFieldIds = entries
    .filter((e) => e.filterKind === 'select')
    .map((e) => e.specFieldId);

  if (enumFieldIds.length > 0) {
    // Drizzle's sql`` interpolates a JS array as a tuple — pass each element
    // via sql.join so the query reads `ANY(ARRAY[$1, $2, ...]::uuid[])`.
    const idList = sql.join(
      enumFieldIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    const optRows = await db.execute<{
      spec_field_id: string;
      key: string;
      label: string;
      sort_order: number;
    }>(sql`
      SELECT sfeo.spec_field_id, sfeo.key,
             COALESCE(sfeot.label, sfeo.key) AS label,
             sfeo.sort_order
        FROM spec_field_enum_option sfeo
        LEFT JOIN spec_field_enum_option_translations sfeot
          ON sfeot.option_id = sfeo.id
         AND sfeot.locale = ${locale}
       WHERE sfeo.spec_field_id IN (${idList})
       ORDER BY sfeo.sort_order ASC, sfeo.key ASC
    `);

    const byField = new Map<string, Array<{ key: string; label: string }>>();
    for (const o of optRows.rows) {
      const list = byField.get(o.spec_field_id) ?? [];
      list.push({ key: o.key, label: o.label });
      byField.set(o.spec_field_id, list);
    }
    for (const e of entries) {
      if (e.filterKind === 'select') {
        e.options = byField.get(e.specFieldId) ?? [];
      }
    }
  }

  return entries;
}

/* -----------------------------------------------------------------------------
 * getCategoryProducts — EAV filter pipeline (CAT-03 + CAT-04)
 * ---------------------------------------------------------------------------*/

export async function getCategoryProducts(
  categoryId: string,
  locale: Locale,
  filters: CategoryFilterValue[],
  page: number,
  pageSize: number,
): Promise<CategoryProductsResult> {
  'use cache';
  cacheTag(`category:${categoryId}`);
  cacheTag('products-list');

  const safePage = Math.max(1, page | 0);
  const safeSize = Math.max(1, Math.min(100, pageSize | 0));
  const offset = (safePage - 1) * safeSize;

  // T-V5-02 mitigation: validate every filter against the schema BEFORE we
  // build SQL. Anything not declared as a filterable spec_field on this
  // category is silently dropped — never trust client-controlled keys.
  const schema = await getCategoryFilterSchema(categoryId, locale);
  const schemaByKey = new Map(schema.map((s) => [s.key, s]));

  const filterClauses: ReturnType<typeof sql>[] = [];
  for (const f of filters) {
    const entry = schemaByKey.get(f.key);
    if (!entry) continue;

    if (f.kind === 'range' && entry.filterKind === 'range') {
      // Numeric stored in product_spec_values.num_value. Range filter applies
      // both min and max bounds when set; missing bound is left unbounded.
      const hasMin = typeof f.min === 'number' && Number.isFinite(f.min);
      const hasMax = typeof f.max === 'number' && Number.isFinite(f.max);
      if (!hasMin && !hasMax) continue;

      const minClause = hasMin
        ? sql`AND v.num_value >= ${String(f.min)}`
        : sql``;
      const maxClause = hasMax
        ? sql`AND v.num_value <= ${String(f.max)}`
        : sql``;

      filterClauses.push(sql`
        EXISTS (
          SELECT 1
            FROM product_spec_values v
            JOIN spec_field sf2 ON sf2.id = v.spec_field_id
           WHERE v.product_id = p.id
             AND sf2.key = ${f.key}
             AND sf2.category_id = ${categoryId}::uuid
             AND v.num_value IS NOT NULL
             ${minClause}
             ${maxClause}
        )
      `);
    } else if (f.kind === 'select' && entry.filterKind === 'select') {
      const values = f.values ?? [];
      if (values.length === 0) continue;
      // Drizzle's sql`` interpolates a JS array as a tuple. Build an
      // explicit ARRAY[...] expression with parameterized elements.
      const valueList = sql.join(
        values.map((v) => sql`${v}`),
        sql`, `,
      );

      filterClauses.push(sql`
        EXISTS (
          SELECT 1
            FROM product_spec_values v
            JOIN spec_field sf2 ON sf2.id = v.spec_field_id
           WHERE v.product_id = p.id
             AND sf2.key = ${f.key}
             AND sf2.category_id = ${categoryId}::uuid
             AND v.enum_value IN (${valueList})
        )
      `);
    } else if (f.kind === 'toggle' && entry.filterKind === 'toggle') {
      if (typeof f.bool !== 'boolean') continue;

      filterClauses.push(sql`
        EXISTS (
          SELECT 1
            FROM product_spec_values v
            JOIN spec_field sf2 ON sf2.id = v.spec_field_id
           WHERE v.product_id = p.id
             AND sf2.key = ${f.key}
             AND sf2.category_id = ${categoryId}::uuid
             AND v.bool_value = ${f.bool}
        )
      `);
    }
  }

  // Compose AND of all the EXISTS clauses (or an empty extra clause when no
  // filters are active).
  let extraWhere = sql``;
  for (const c of filterClauses) {
    extraWhere = sql`${extraWhere} AND ${c}`;
  }

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
     WHERE p.category_id = ${categoryId}::uuid
       AND p.status = 'published'
       ${extraWhere}
     ORDER BY pt.name ASC NULLS LAST, p.id ASC
     LIMIT ${safeSize} OFFSET ${offset}
  `);

  const countRows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::bigint AS count
      FROM product p
     WHERE p.category_id = ${categoryId}::uuid
       AND p.status = 'published'
       ${extraWhere}
  `);

  const rows: CategoryRowResult[] = baseRows.rows.map((r) => ({
    id: r.id,
    name: r.name ?? '',
    slug: r.slug ?? '',
    shortDesc: r.short_desc,
    heroPublicId:
      Array.isArray(r.image_public_ids) && r.image_public_ids.length > 0
        ? r.image_public_ids[0] ?? null
        : null,
    manufacturerName: r.manufacturer_name,
    sku: r.sku,
  }));

  const totalRaw = countRows.rows[0]?.count ?? '0';
  const total = Number(totalRaw);

  return { rows, total };
}

/** Helper used by the catalog page when no specific category resolves — used
 *  by the index page that lists root categories. */
export async function getRootCategories(
  locale: Locale,
): Promise<Array<{ id: string; name: string; slug: string; sortOrder: number }>> {
  'use cache';
  cacheTag('categories-tree');

  const rows = await db.execute<{
    id: string;
    name: string | null;
    slug: string | null;
    sort_order: number;
  }>(sql`
    SELECT c.id, ct.name, ct.slug, c.sort_order
      FROM category c
      LEFT JOIN category_translations ct
        ON ct.category_id = c.id
       AND ct.locale = ${locale}
     WHERE c.parent_id IS NULL
     ORDER BY c.sort_order ASC, ct.name ASC
  `);

  return rows.rows
    .filter((r) => r.name && r.slug)
    .map((r) => ({
      id: r.id,
      name: r.name as string,
      slug: r.slug as string,
      sortOrder: r.sort_order,
    }));
}

// Defensive locale-list export so consumers (FilterSidebar) can iterate
// without re-deriving the alphabet.
export { LOCALES };
