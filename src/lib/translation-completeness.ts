// D-04 / ADMIN-10: server-side helpers wrapping the
// `product_translation_completeness` pgView (created by plan 02-01).
//
// Two read paths:
//   findProductCompleteness(productId)        — single product editor (per-locale % bars)
//   findCompletenessForProducts(productIds[]) — batched products list (TranslationDots)
//
// Returned shape is always Record<'uz'|'ru'|'en', number> with each percent
// in [0, 100]. Missing rows in the view (e.g. no translation rows yet for a
// locale) default to 0 so consumers never need to null-guard.
//
// The view itself is non-materialized (RESEARCH.md §Pattern 6 / 02-01-SUMMARY)
// so reads recompute on demand — sub-millisecond at the 100-500 product
// scale we expect for v1. T-02-12-02: callers (the products list RSC) bound
// productIds[] via DataTable pageSize ≤ 100.
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { productTranslationCompleteness } from '@/db/schema';

export type LocaleKey = 'uz' | 'ru' | 'en';
export type CompletenessByLocale = Record<LocaleKey, number>;

export const LOCALES: readonly LocaleKey[] = ['uz', 'ru', 'en'] as const;

function emptyCompleteness(): CompletenessByLocale {
  return { uz: 0, ru: 0, en: 0 };
}

function isLocaleKey(value: string): value is LocaleKey {
  return value === 'uz' || value === 'ru' || value === 'en';
}

/**
 * Fetch per-locale translation completeness percentages for a single product.
 *
 * Locales with no row in `product_translation_completeness` (i.e. no
 * `product_translations` row at all for that locale) default to 0.
 */
export async function findProductCompleteness(
  productId: string,
): Promise<CompletenessByLocale> {
  const rows = await db
    .select()
    .from(productTranslationCompleteness)
    .where(eq(productTranslationCompleteness.productId, productId));

  const out = emptyCompleteness();
  for (const r of rows) {
    if (isLocaleKey(r.locale)) {
      out[r.locale] = r.percent;
    }
  }
  return out;
}

/**
 * Batch variant for the products list. Returns a map keyed by productId; each
 * entry is the same per-locale percent shape as findProductCompleteness, with
 * missing locales defaulted to 0.
 *
 * Caller MUST bound productIds[] (DataTable pageSize ≤ 100) — T-02-12-02.
 */
export async function findCompletenessForProducts(
  productIds: string[],
): Promise<Record<string, CompletenessByLocale>> {
  if (productIds.length === 0) return {};

  const rows = await db
    .select()
    .from(productTranslationCompleteness)
    .where(inArray(productTranslationCompleteness.productId, productIds));

  const out: Record<string, CompletenessByLocale> = {};
  for (const id of productIds) {
    out[id] = emptyCompleteness();
  }
  for (const r of rows) {
    if (!isLocaleKey(r.locale)) continue;
    const bucket = (out[r.productId] ??= emptyCompleteness());
    bucket[r.locale] = r.percent;
  }
  return out;
}
