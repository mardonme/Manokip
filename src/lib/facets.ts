// Plan 03-04 Task 4.1 — facet aggregate count helpers (drives the FilterSidebar
// numeric range bounds, enum-option counts, and bool-toggle counts).
//
// Three exported helpers, all wrapped in `'use cache'` + `cacheTag('category:<id>')`
// so Phase-2 revalidateCategory() invalidates the aggregates whenever the
// underlying products mutate.
//
//   - getEnumFacetCounts(specFieldKey, categoryId)
//       SELECT enum_value, COUNT(DISTINCT product_id) FROM product_spec_values v
//       JOIN spec_field sf ON sf.id = v.spec_field_id
//       JOIN product p ON p.id = v.product_id
//       WHERE sf.key = $1 AND p.category_id = $2 AND p.status = 'published'
//             AND v.enum_value IS NOT NULL
//       GROUP BY enum_value ORDER BY count DESC.
//
//   - getNumericFacetRange(specFieldKey, categoryId)
//       MIN(num_value), MAX(num_value) over published products.
//
//   - getBoolFacetCount(specFieldKey, categoryId)
//       COUNT FILTER (WHERE bool_value = true) AS true_count,
//       COUNT FILTER (WHERE bool_value = false) AS false_count.

import { sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { db } from '@/db/client';

export interface EnumFacet {
  value: string;
  count: number;
}

export async function getEnumFacetCounts(
  specFieldKey: string,
  categoryId: string,
): Promise<EnumFacet[]> {
  'use cache';
  cacheTag(`category:${categoryId}`);
  cacheTag('products-list');

  const rows = await db.execute<{
    value: string;
    count: string;
  }>(sql`
    SELECT v.enum_value AS value,
           COUNT(DISTINCT v.product_id)::bigint AS count
      FROM product_spec_values v
      JOIN spec_field sf ON sf.id = v.spec_field_id
      JOIN product p ON p.id = v.product_id
     WHERE sf.key = ${specFieldKey}
       AND sf.category_id = ${categoryId}::uuid
       AND p.category_id = ${categoryId}::uuid
       AND p.status = 'published'
       AND v.enum_value IS NOT NULL
     GROUP BY v.enum_value
     ORDER BY COUNT(DISTINCT v.product_id) DESC, v.enum_value ASC
  `);

  return rows.rows.map((r) => ({
    value: r.value,
    count: Number(r.count),
  }));
}

export async function getNumericFacetRange(
  specFieldKey: string,
  categoryId: string,
): Promise<{ min: number; max: number } | null> {
  'use cache';
  cacheTag(`category:${categoryId}`);
  cacheTag('products-list');

  const rows = await db.execute<{
    min: string | null;
    max: string | null;
  }>(sql`
    SELECT MIN(v.num_value)::text AS min,
           MAX(v.num_value)::text AS max
      FROM product_spec_values v
      JOIN spec_field sf ON sf.id = v.spec_field_id
      JOIN product p ON p.id = v.product_id
     WHERE sf.key = ${specFieldKey}
       AND sf.category_id = ${categoryId}::uuid
       AND p.category_id = ${categoryId}::uuid
       AND p.status = 'published'
       AND v.num_value IS NOT NULL
  `);

  const head = rows.rows[0];
  if (!head || head.min === null || head.max === null) return null;
  const min = Number(head.min);
  const max = Number(head.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

export async function getBoolFacetCount(
  specFieldKey: string,
  categoryId: string,
): Promise<{ trueCount: number; falseCount: number }> {
  'use cache';
  cacheTag(`category:${categoryId}`);
  cacheTag('products-list');

  const rows = await db.execute<{
    true_count: string;
    false_count: string;
  }>(sql`
    SELECT
      COUNT(DISTINCT v.product_id) FILTER (WHERE v.bool_value = true)::bigint AS true_count,
      COUNT(DISTINCT v.product_id) FILTER (WHERE v.bool_value = false)::bigint AS false_count
      FROM product_spec_values v
      JOIN spec_field sf ON sf.id = v.spec_field_id
      JOIN product p ON p.id = v.product_id
     WHERE sf.key = ${specFieldKey}
       AND sf.category_id = ${categoryId}::uuid
       AND p.category_id = ${categoryId}::uuid
       AND p.status = 'published'
       AND v.bool_value IS NOT NULL
  `);

  const head = rows.rows[0];
  return {
    trueCount: Number(head?.true_count ?? 0),
    falseCount: Number(head?.false_count ?? 0),
  };
}
