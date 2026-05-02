// Plan 04-07 deviation Rule 3 — minimal product list helper for the recipe
// + industry admin forms' LinkedProductsPicker option pre-fetch.
//
// Returns every published product's id + current-locale name. Falls back to
// uz translation when the requested locale is missing (Phase-3 D-05 cascade
// shape, simplified to a 2-step lookup since this is for ADMIN UX only —
// admins authoring an article need to search by whatever locale-name they
// know the product as; rendering uz fallback is enough for v1).
//
// Used by:
//   - src/app/[locale]/admin/recipes/new/page.tsx
//   - src/app/[locale]/admin/recipes/[id]/edit/page.tsx
//   - src/app/[locale]/admin/industries/new/page.tsx (plan 04-08)
//   - src/app/[locale]/admin/industries/[id]/edit/page.tsx (plan 04-08)
//
// Performance: at the v1 scale (≤200 published products per RESEARCH §
// Linked-products picker) a single round-trip is fine; no pagination needed.

import { eq, and, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { products, productTranslations } from "@/db/schema";

export interface ProductOption {
  id: string;
  name: string;
  /** Optional SKU for the picker filter. Phase-1 doesn't yet have a sku column; pass empty string for now. */
  sku?: string;
}

export type Locale = "uz" | "ru" | "en";

/**
 * List every published product's id + name in the requested locale, falling
 * back to uz when the requested locale's translation row is missing.
 * Ordered by current-locale name ASC (NULLS-last via uz fallback).
 */
export async function findAllPublishedProducts(
  locale: Locale,
): Promise<ProductOption[]> {
  const tCurrent = alias(productTranslations, "tCurrent");
  const tUz = alias(productTranslations, "tUz");

  const rows = await db
    .select({
      id: products.id,
      currentName: tCurrent.name,
      uzName: tUz.name,
    })
    .from(products)
    .leftJoin(
      tCurrent,
      and(
        eq(tCurrent.productId, products.id),
        eq(tCurrent.locale, locale),
      ),
    )
    .leftJoin(
      tUz,
      and(
        eq(tUz.productId, products.id),
        eq(tUz.locale, "uz"),
      ),
    )
    .where(eq(products.status, "published"))
    .orderBy(asc(tCurrent.name), asc(tUz.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.currentName ?? r.uzName ?? "(untranslated)",
    sku: "",
  }));
}
