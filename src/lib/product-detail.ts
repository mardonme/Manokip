// Plan 03-05 Task 5.1 — Product detail data layer (CAT-06 / CAT-07 / CAT-08
// + SEO-01 / SEO-02 hreflang fan-out).
//
// Single helper that the /[locale]/products/[slug] RSC page composes. It
// resolves a product by per-locale slug (status='published' only — drafts
// return null), then parallel-fetches everything the page needs in one pass:
//   - product row + image_public_ids[] + datasheet_public_ids[]
//   - all 3 locale slugs for hreflang (Pitfall #6 — never advertise a 404)
//   - manufacturer row (with is_official_rep + relationship_note per D-11)
//     + per-locale display name (current locale, falling back to uz when the
//     current-locale row is missing per Phase-1 D-05 cascade root)
//   - product_spec_values JOINed with spec_field (kind/unit/group) + per-locale
//     translations, grouped by spec_field_group sorted by group sort_order
//     then field sort_order, displayValue pre-formatted server-side so the
//     RSC page is a thin renderer
//   - breadcrumb chain (recursive walk up category.parent_id) localized
//
// Cache + invalidation contract (Phase 2 D-12 fan-out):
//   - 'use cache' wraps the whole fn body; cacheTag('product:<id>') tags the
//     resolved product so revalidateProduct(id) busts this row.
//   - cacheTag('category:<id>') tags the resolved category so a category
//     mutation that affects the product's grouping invalidates the cache.
//   - cacheTag('manufacturer:<id>') tags the manufacturer when present, so
//     toggling is_official_rep or editing relationship_note busts the cache.
//
// Pitfall #2 (only primitives cross the cache boundary): callers pass
// (locale, slug) — both strings. The helper resolves everything internally.
//
// notFound() is the page's responsibility — this helper returns null on a
// missing slug so the caller can branch.

import { sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { db } from '@/db/client';

export type Locale = 'uz' | 'ru' | 'en';

const ALL_LOCALES: Locale[] = ['uz', 'ru', 'en'];
function isLocale(l: string): l is Locale {
  return l === 'uz' || l === 'ru' || l === 'en';
}

export interface ProductDetailManufacturer {
  id: string;
  name: string;
  slug: string;
  logoPublicId: string | null;
  websiteUrl: string | null;
  isOfficialRep: boolean;
  relationshipNote: string | null;
}

export interface ProductDetailSpecRow {
  fieldKey: string;
  fieldLabel: string;
  unit: string | null;
  /**
   * Pre-formatted display value (server-side) so the RSC page is a thin
   * renderer. Numeric values include the unit when present; enum values use
   * the per-locale option label; bool values render as the localized
   * Yes/No string the helper resolves itself.
   */
  displayValue: string;
  rawValue: {
    num?: number;
    text?: string;
    enum?: string;
    bool?: boolean;
  };
}

export interface ProductDetailSpecGroup {
  /** Stable id — spec_field_group.id when grouped, sentinel '__ungrouped__' otherwise. */
  id: string;
  label: string;
  rows: ProductDetailSpecRow[];
}

export interface ProductDetailData {
  id: string;
  sku: string | null;
  categoryId: string;
  manufacturerId: string | null;
  imagePublicIds: string[];
  datasheetPublicIds: string[];
  /** Per-locale slugs for hreflang. Missing locales are undefined per Pitfall #6. */
  slugByLocale: Partial<Record<Locale, string>>;
  /** Current-locale display fields (with cross-locale fallback to uz when missing per D-05). */
  name: string;
  shortDesc: string | null;
  longDesc: string | null;
  manufacturer: ProductDetailManufacturer | null;
  /**
   * Spec rows grouped by spec_field_group. When a spec_field has no
   * group_id, its rows land in a single sentinel '__ungrouped__' group at
   * the end. Groups sorted by group.sort_order; rows within a group sorted
   * by spec_field.sort_order then key.
   */
  specGroups: ProductDetailSpecGroup[];
  /** Localized breadcrumb chain (Manometr → Catalog → ancestor categories → product). */
  breadcrumbs: Array<{ name: string; url: string }>;
}

const SITE_HOST = 'https://manometr.uz';

interface BoolLabels {
  yes: string;
  no: string;
  catalog: string;
}

// Cross-locale fallback policy from CONTEXT.md / Phase-1 D-05: when a
// translation row is missing for the current locale, fall back to uz
// (project default + most-likely-populated locale at v1 scale).
function pickLocaleField<T>(
  byLocale: Partial<Record<Locale, T>>,
  current: Locale,
  fallbackChain: Locale[] = ['uz', 'ru', 'en'],
): T | undefined {
  if (byLocale[current] !== undefined) return byLocale[current];
  for (const l of fallbackChain) {
    if (l !== current && byLocale[l] !== undefined) return byLocale[l];
  }
  return undefined;
}

// Localized bool / breadcrumb-root labels. Inlined per-locale so the helper
// stays self-contained — these values are also present in the public.product
// + public.catalog message namespaces (Tasks 5.2a/5.2b/5.3) but we don't
// reach into next-intl from a 'use cache' helper (Pitfall #2: i18n state is
// not a stable cache key). Instead the helper returns a primitive string the
// RSC page renders verbatim.
const BOOL_LABELS: Record<Locale, BoolLabels> = {
  uz: { yes: 'Ha', no: 'Yoʻq', catalog: 'Katalog' },
  ru: { yes: 'Да', no: 'Нет', catalog: 'Каталог' },
  en: { yes: 'Yes', no: 'No', catalog: 'Catalog' },
};

// Format a numeric value with optional unit. The unit comes either from the
// product_spec_values row (override per D-21) or the spec_field row.
function formatNum(num: number, unit: string | null): string {
  if (unit) return `${num} ${unit}`;
  return String(num);
}

export async function getProductBySlug(
  locale: Locale,
  slug: string,
): Promise<ProductDetailData | null> {
  'use cache';

  // Step A — resolve product_id by (locale, slug). Filter on
  // products.status = 'published' so drafts cannot be enumerated via direct
  // slug visit (T-03-05-04 mitigation).
  const idRows = await db.execute<{
    id: string;
    sku: string | null;
    category_id: string;
    manufacturer_id: string | null;
    image_public_ids: string[] | null;
    datasheet_public_ids: string[] | null;
  }>(sql`
    SELECT p.id, p.sku, p.category_id, p.manufacturer_id,
           p.image_public_ids, p.datasheet_public_ids
      FROM product_translations pt
      JOIN product p
        ON p.id = pt.product_id
       AND p.status = 'published'
     WHERE pt.locale = ${locale}
       AND pt.slug = ${slug}
     LIMIT 1
  `);

  const head = idRows.rows[0];
  if (!head) return null;
  const productId = head.id;
  const categoryId = head.category_id;
  const manufacturerId = head.manufacturer_id;

  // Tag the resolved product / category / manufacturer so Phase-2 D-12 fan-out
  // helpers invalidate this cache row whenever any related entity mutates.
  cacheTag(`product:${productId}`);
  cacheTag(`category:${categoryId}`);
  if (manufacturerId) cacheTag(`manufacturer:${manufacturerId}`);

  // Step B — parallel fetches.
  const [
    allTranslationsRes,
    specRowsRes,
    manufacturerRowRes,
    manufacturerTranslationsRes,
    specGroupsRes,
    specGroupTranslationsRes,
    specValueTranslationsRes,
    enumOptionLabelsRes,
  ] = await Promise.all([
    // All 3 locale rows for the product (hreflang + cross-locale fallback).
    db.execute<{
      locale: string;
      name: string;
      slug: string;
      short_desc: string | null;
      long_desc: string | null;
    }>(sql`
      SELECT locale, name, slug, short_desc, long_desc
        FROM product_translations
       WHERE product_id = ${productId}::uuid
    `),

    // product_spec_values JOIN spec_field (display-only fields included —
    // filter_kind null is fine; we render every spec the product carries).
    db.execute<{
      psv_id: string;
      spec_field_id: string;
      field_key: string;
      data_type: 'number' | 'text' | 'enum' | 'bool';
      field_unit: string | null;
      group_id: string | null;
      field_sort_order: number;
      num_value: string | null;
      text_value: string | null;
      bool_value: boolean | null;
      enum_value: string | null;
      override_unit: string | null;
      psv_sort_order: number;
      is_extra: boolean;
      extra_key: string | null;
    }>(sql`
      SELECT psv.id::text AS psv_id,
             sf.id AS spec_field_id,
             sf.key AS field_key,
             sf.data_type AS data_type,
             sf.unit AS field_unit,
             sf.group_id AS group_id,
             sf.sort_order AS field_sort_order,
             psv.num_value::text AS num_value,
             psv.text_value AS text_value,
             psv.bool_value AS bool_value,
             psv.enum_value AS enum_value,
             psv.unit AS override_unit,
             psv.sort_order AS psv_sort_order,
             psv.is_extra AS is_extra,
             psv.extra_key AS extra_key
        FROM product_spec_values psv
        JOIN spec_field sf
          ON sf.id = psv.spec_field_id
         AND sf.deleted_at IS NULL
       WHERE psv.product_id = ${productId}::uuid
       ORDER BY sf.sort_order ASC, sf.key ASC, psv.sort_order ASC
    `),

    // Manufacturer row (or empty if product has no manufacturer).
    manufacturerId
      ? db.execute<{
          id: string;
          logo_public_id: string | null;
          website_url: string | null;
          is_official_rep: boolean;
        }>(sql`
          SELECT id, logo_public_id, website_url, is_official_rep
            FROM manufacturer
           WHERE id = ${manufacturerId}::uuid
           LIMIT 1
        `)
      : Promise.resolve({ rows: [] as Array<{ id: string; logo_public_id: string | null; website_url: string | null; is_official_rep: boolean }> }),

    // All 3 manufacturer translation rows (cross-locale fallback to uz when
    // current-locale row missing). Empty if no manufacturer.
    manufacturerId
      ? db.execute<{
          locale: string;
          name: string;
          slug: string;
          relationship_note: string | null;
        }>(sql`
          SELECT locale, name, slug, relationship_note
            FROM manufacturer_translations
           WHERE manufacturer_id = ${manufacturerId}::uuid
        `)
      : Promise.resolve({ rows: [] as Array<{ locale: string; name: string; slug: string; relationship_note: string | null }> }),

    // spec_field_group rows for the category (drives group ordering +
    // header rendering). Includes deleted_at filter so soft-deleted groups
    // don't appear.
    db.execute<{ id: string; key: string; sort_order: number }>(sql`
      SELECT id, key, sort_order
        FROM spec_field_group
       WHERE category_id = ${categoryId}::uuid
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, key ASC
    `),

    // spec_field_group_translations for current locale only (with COALESCE
    // fallback handled below).
    db.execute<{ group_id: string; locale: string; label: string }>(sql`
      SELECT sfgt.group_id, sfgt.locale, sfgt.label
        FROM spec_field_group_translations sfgt
        JOIN spec_field_group sfg
          ON sfg.id = sfgt.group_id
       WHERE sfg.category_id = ${categoryId}::uuid
         AND sfg.deleted_at IS NULL
    `),

    // Per-locale text overrides for product_spec_values text/extra rows.
    db.execute<{ value_id: string; locale: string; text_value: string | null }>(sql`
      SELECT psvt.value_id::text AS value_id, psvt.locale, psvt.text_value
        FROM product_spec_value_translations psvt
        JOIN product_spec_values psv ON psv.id = psvt.value_id
       WHERE psv.product_id = ${productId}::uuid
    `),

    // Per-locale labels for spec_field_enum_option keys present on this
    // product. We pull all options for the spec_fields touched and pick the
    // matching key in JS — keeps the SQL one round-trip.
    db.execute<{
      spec_field_id: string;
      key: string;
      locale: string;
      label: string;
    }>(sql`
      SELECT sfeo.spec_field_id, sfeo.key, sfeot.locale,
             COALESCE(sfeot.label, sfeo.key) AS label
        FROM spec_field_enum_option sfeo
        LEFT JOIN spec_field_enum_option_translations sfeot
          ON sfeot.option_id = sfeo.id
       WHERE sfeo.spec_field_id IN (
         SELECT DISTINCT psv.spec_field_id
           FROM product_spec_values psv
          WHERE psv.product_id = ${productId}::uuid
            AND psv.spec_field_id IS NOT NULL
       )
    `),
  ]);

  // Spec field translations for current locale (separate query for clarity).
  const specFieldTranslationsRes = await db.execute<{
    spec_field_id: string;
    locale: string;
    label: string;
  }>(sql`
    SELECT sft.spec_field_id, sft.locale, sft.label
      FROM spec_field_translations sft
     WHERE sft.spec_field_id IN (
       SELECT DISTINCT psv.spec_field_id
         FROM product_spec_values psv
        WHERE psv.product_id = ${productId}::uuid
          AND psv.spec_field_id IS NOT NULL
     )
  `);

  // -------- Reshape: product translations --------
  const slugByLocale: Partial<Record<Locale, string>> = {};
  const nameByLocale: Partial<Record<Locale, string>> = {};
  const shortDescByLocale: Partial<Record<Locale, string | null>> = {};
  const longDescByLocale: Partial<Record<Locale, string | null>> = {};
  for (const r of allTranslationsRes.rows) {
    if (!isLocale(r.locale)) continue;
    slugByLocale[r.locale] = r.slug;
    nameByLocale[r.locale] = r.name;
    shortDescByLocale[r.locale] = r.short_desc;
    longDescByLocale[r.locale] = r.long_desc;
  }
  const name = pickLocaleField(nameByLocale, locale) ?? '';
  const shortDesc = pickLocaleField(shortDescByLocale, locale) ?? null;
  const longDesc = pickLocaleField(longDescByLocale, locale) ?? null;

  // -------- Reshape: manufacturer + per-locale display --------
  let manufacturer: ProductDetailManufacturer | null = null;
  if (manufacturerId && manufacturerRowRes.rows[0]) {
    const m = manufacturerRowRes.rows[0];
    const mNameByLocale: Partial<Record<Locale, string>> = {};
    const mSlugByLocale: Partial<Record<Locale, string>> = {};
    const mNoteByLocale: Partial<Record<Locale, string | null>> = {};
    for (const r of manufacturerTranslationsRes.rows) {
      if (!isLocale(r.locale)) continue;
      mNameByLocale[r.locale] = r.name;
      mSlugByLocale[r.locale] = r.slug;
      mNoteByLocale[r.locale] = r.relationship_note;
    }
    manufacturer = {
      id: m.id,
      name: pickLocaleField(mNameByLocale, locale) ?? '',
      slug: pickLocaleField(mSlugByLocale, locale) ?? '',
      logoPublicId: m.logo_public_id,
      websiteUrl: m.website_url,
      isOfficialRep: m.is_official_rep === true,
      relationshipNote: pickLocaleField(mNoteByLocale, locale) ?? null,
    };
  }

  // -------- Reshape: spec field translations + enum option labels --------
  const specFieldLabelByLocale = new Map<string, Partial<Record<Locale, string>>>();
  for (const r of specFieldTranslationsRes.rows) {
    if (!isLocale(r.locale)) continue;
    const map = specFieldLabelByLocale.get(r.spec_field_id) ?? {};
    map[r.locale] = r.label;
    specFieldLabelByLocale.set(r.spec_field_id, map);
  }

  // enum option lookup: (specFieldId + key) → per-locale label map
  const enumOptionByLocale = new Map<string, Partial<Record<Locale, string>>>();
  for (const r of enumOptionLabelsRes.rows) {
    if (!isLocale(r.locale)) continue;
    const k = `${r.spec_field_id}::${r.key}`;
    const map = enumOptionByLocale.get(k) ?? {};
    map[r.locale] = r.label;
    enumOptionByLocale.set(k, map);
  }

  // psv text-value translations (for text dataType + extras)
  const psvTextByLocale = new Map<string, Partial<Record<Locale, string | null>>>();
  for (const r of specValueTranslationsRes.rows) {
    if (!isLocale(r.locale)) continue;
    const map = psvTextByLocale.get(r.value_id) ?? {};
    map[r.locale] = r.text_value;
    psvTextByLocale.set(r.value_id, map);
  }

  // group label resolution (current locale; COALESCE-style fallback to
  // group.key if no translation)
  const groupLabelByLocale = new Map<string, Partial<Record<Locale, string>>>();
  for (const r of specGroupTranslationsRes.rows) {
    if (!isLocale(r.locale)) continue;
    const map = groupLabelByLocale.get(r.group_id) ?? {};
    map[r.locale] = r.label;
    groupLabelByLocale.set(r.group_id, map);
  }

  // -------- Reshape: spec rows + grouping --------
  type RowWithGroup = ProductDetailSpecRow & { groupId: string | null; sortKey: number };
  const rowsByGroup = new Map<string, RowWithGroup[]>();
  const UNGROUPED = '__ungrouped__';

  for (const r of specRowsRes.rows) {
    // Resolve label: spec_field_translations[current] || any-locale fallback || field_key
    const fieldLabelMap = specFieldLabelByLocale.get(r.spec_field_id) ?? {};
    const fieldLabel =
      pickLocaleField(fieldLabelMap, locale) ?? r.field_key;
    const unit = r.override_unit ?? r.field_unit;

    let displayValue = '';
    const rawValue: ProductDetailSpecRow['rawValue'] = {};
    if (r.data_type === 'number' && r.num_value !== null) {
      const num = Number(r.num_value);
      rawValue.num = num;
      displayValue = formatNum(num, unit);
    } else if (r.data_type === 'enum' && r.enum_value) {
      rawValue.enum = r.enum_value;
      const optionMap = enumOptionByLocale.get(`${r.spec_field_id}::${r.enum_value}`) ?? {};
      displayValue = pickLocaleField(optionMap, locale) ?? r.enum_value;
    } else if (r.data_type === 'bool' && r.bool_value !== null) {
      rawValue.bool = r.bool_value;
      displayValue = r.bool_value
        ? BOOL_LABELS[locale].yes
        : BOOL_LABELS[locale].no;
    } else if (r.data_type === 'text') {
      // text_value: prefer per-locale override from product_spec_value_translations
      const textMap = psvTextByLocale.get(r.psv_id) ?? {};
      const localized = pickLocaleField(textMap, locale);
      const fallback = localized ?? r.text_value ?? '';
      rawValue.text = fallback;
      displayValue = unit && fallback ? `${fallback} ${unit}` : fallback;
    }

    if (!displayValue) continue; // skip empty rows defensively

    const groupKey = r.group_id ?? UNGROUPED;
    const list = rowsByGroup.get(groupKey) ?? [];
    list.push({
      fieldKey: r.field_key,
      fieldLabel,
      unit,
      displayValue,
      rawValue,
      groupId: r.group_id,
      sortKey: r.field_sort_order,
    });
    rowsByGroup.set(groupKey, list);
  }

  // Build ordered specGroups: declared spec_field_group rows first (by
  // sort_order), then a sentinel ungrouped section if any rows landed there.
  const specGroups: ProductDetailSpecGroup[] = [];
  for (const g of specGroupsRes.rows) {
    const rows = rowsByGroup.get(g.id);
    if (!rows || rows.length === 0) continue;
    const labelMap = groupLabelByLocale.get(g.id) ?? {};
    const label = pickLocaleField(labelMap, locale) ?? g.key;
    rows.sort((a, b) => a.sortKey - b.sortKey || a.fieldKey.localeCompare(b.fieldKey));
    specGroups.push({
      id: g.id,
      label,
      rows: rows.map(({ groupId: _gid, sortKey: _sk, ...rest }) => {
        void _gid;
        void _sk;
        return rest;
      }),
    });
  }
  const ungroupedRows = rowsByGroup.get(UNGROUPED);
  if (ungroupedRows && ungroupedRows.length > 0) {
    ungroupedRows.sort(
      (a, b) => a.sortKey - b.sortKey || a.fieldKey.localeCompare(b.fieldKey),
    );
    // Single ungrouped section gets a generic per-locale heading. When ALL
    // rows are ungrouped (no spec_field_group at all for this category) we
    // still ship a section so the table has a heading.
    const ungroupedLabel: Record<Locale, string> = {
      uz: 'Spetsifikatsiyalar',
      ru: 'Характеристики',
      en: 'Specifications',
    };
    specGroups.push({
      id: UNGROUPED,
      label: ungroupedLabel[locale],
      rows: ungroupedRows.map(({ groupId: _gid, sortKey: _sk, ...rest }) => {
        void _gid;
        void _sk;
        return rest;
      }),
    });
  }

  // -------- Reshape: breadcrumbs (recursive walk up parent_id) --------
  // Use Postgres recursive CTE so the entire chain comes back in one query.
  // Caller's locale drives the ct.locale filter; missing translations skip
  // (defensive — Phase-2 admin form requires all 3 locales but legacy data
  // could have gaps).
  const ancestorRes = await db.execute<{
    id: string;
    depth: number;
    name: string | null;
    slug: string | null;
  }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id, 0 AS depth
        FROM category
       WHERE id = ${categoryId}::uuid
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1
        FROM category c
        JOIN ancestors a ON a.parent_id = c.id
    )
    SELECT a.id, a.depth, ct.name, ct.slug
      FROM ancestors a
      LEFT JOIN category_translations ct
        ON ct.category_id = a.id
       AND ct.locale = ${locale}
    ORDER BY a.depth DESC
  `);

  const breadcrumbs: Array<{ name: string; url: string }> = [
    { name: 'Manometr', url: `${SITE_HOST}/${locale}` },
    {
      name: BOOL_LABELS[locale].catalog,
      url: `${SITE_HOST}/${locale}/categories`,
    },
  ];
  for (const a of ancestorRes.rows) {
    if (a.name && a.slug) {
      breadcrumbs.push({
        name: a.name,
        url: `${SITE_HOST}/${locale}/categories/${a.slug}`,
      });
    }
  }
  // Final crumb: the product itself — uses the current-locale slug (the one
  // that resolved this request).
  breadcrumbs.push({
    name,
    url: `${SITE_HOST}/${locale}/products/${slug}`,
  });

  void ALL_LOCALES; // referenced for type narrowing scope; silence unused-var
  void manufacturerId;

  return {
    id: productId,
    sku: head.sku,
    categoryId,
    manufacturerId,
    imagePublicIds: Array.isArray(head.image_public_ids)
      ? head.image_public_ids
      : [],
    datasheetPublicIds: Array.isArray(head.datasheet_public_ids)
      ? head.datasheet_public_ids
      : [],
    slugByLocale,
    name,
    shortDesc,
    longDesc,
    manufacturer,
    specGroups,
    breadcrumbs,
  };
}
