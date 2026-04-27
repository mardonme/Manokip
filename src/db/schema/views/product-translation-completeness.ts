// D-04 / ADMIN-10: per-product per-locale translation completeness percent.
// Greenfield — no in-repo analog. RESEARCH.md §Pattern 6 is the source.
//
// Formula: filled / total where
//   total   = 4 base text fields (name, slug, short_desc, long_desc)
//             + count of REQUIRED text spec fields (sf.required = true,
//               sf.data_type = 'text', sf.deleted_at IS NULL) for the product
//   filled  = count of those base fields that are non-empty
//             + count of required text spec values whose translation is
//               non-empty for the locale
//
// Column-name reconciliation with Phase-1 schema (Phase-1 migration sql):
//   spec_field.required (NOT is_required)
//   spec_field.data_type
//   product_spec_value_translations.text_value
import { pgView, text, uuid, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productTranslationCompleteness = pgView(
  'product_translation_completeness',
  {
    productId: uuid('product_id').notNull(),
    locale: text('locale').notNull(),
    percent: integer('percent').notNull(),
  },
).as(sql`
  WITH base AS (
    SELECT pt.product_id, pt.locale,
           (CASE WHEN coalesce(pt.name,'')        <> '' THEN 1 ELSE 0 END +
            CASE WHEN coalesce(pt.short_desc,'')  <> '' THEN 1 ELSE 0 END +
            CASE WHEN coalesce(pt.long_desc,'')   <> '' THEN 1 ELSE 0 END +
            CASE WHEN coalesce(pt.slug,'')        <> '' THEN 1 ELSE 0 END) AS filled,
           4 AS total
      FROM product_translations pt
  ),
  spec_required AS (
    SELECT psv.product_id, sf.id AS spec_field_id
      FROM product_spec_values psv
      JOIN spec_field sf ON sf.id = psv.spec_field_id
     WHERE sf.required = true AND sf.data_type = 'text' AND sf.deleted_at IS NULL
  ),
  spec_required_count AS (
    SELECT product_id, COUNT(*)::int AS cnt FROM spec_required GROUP BY product_id
  ),
  spec_filled AS (
    SELECT psv.product_id, psvt.locale, COUNT(*)::int AS cnt
      FROM product_spec_values psv
      JOIN spec_field sf ON sf.id = psv.spec_field_id
      JOIN product_spec_value_translations psvt ON psvt.value_id = psv.id
     WHERE sf.required = true AND sf.data_type = 'text' AND sf.deleted_at IS NULL
       AND coalesce(psvt.text_value,'') <> ''
     GROUP BY psv.product_id, psvt.locale
  )
  SELECT base.product_id,
         base.locale,
         ROUND(
           100.0 * (base.filled + COALESCE(sf.cnt, 0))
                 / NULLIF(base.total + COALESCE(sr.cnt, 0), 0)
         )::int AS percent
    FROM base
    LEFT JOIN spec_required_count sr ON sr.product_id = base.product_id
    LEFT JOIN spec_filled sf
           ON sf.product_id = base.product_id AND sf.locale = base.locale
`);
