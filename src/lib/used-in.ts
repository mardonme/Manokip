// Plan 04-03 Task 3.3 — getUsedInForProduct (CONT-04 / D-09).
//
// Reads product_used_in_v (the pgView shipped in 04-01) for the requested
// (productId, locale) tuple, splits rows by content_type, caps at 6 per type
// per D-09. The pgView's body already filters to status='published' on both
// the recipe + industry sides (T-04-01-02 mitigation, defense-in-depth) so
// this helper structurally cannot leak draft content.
//
// Locale fallback policy (v1 trade-off): the v1 query reads only the requested
// locale row from each *_translations table. Recipes that lack a translation
// in the current locale are simply absent from the section — there is NO
// in-JS cascade fallback (Phase-3 D-05 cascade is reserved for the primary
// content read in src/lib/recipes.ts + src/lib/industries.ts). Reasoning:
// the Used-In section is a discoverability widget on the product detail page,
// not a primary read surface; content authors maintain trilingual parity for
// cross-linked content manually. RESEARCH §Used in reverse query lines 685-690
// documents this as the intentional v1 trade-off.
//
// Cache + invalidation (Pitfall #2):
//   - 'use cache' wraps the helper body so DB queries hit the cache and only
//     re-run when revalidateUsedIn(productId) fires.
//   - cacheLife('max') aligns with the rest of the project's max-cache stance.
//   - cacheTag(`used-in:${productId}`) is the single tag — every junction-table
//     mutation (saveRecipe / saveIndustry / publishRecipe / unpublishRecipe /
//     deleteRecipe / industry mirrors landing in 04-05/04-06) calls
//     revalidateUsedIn(pid) for each affected product after tx.commit.
//
// Pitfall #2 (only primitives cross the cache boundary): callers pass
// (productId, locale) — both strings.

import { eq, and } from 'drizzle-orm';
import { cacheTag, cacheLife } from 'next/cache';
import { db } from '@/db/client';
import { productUsedInView } from '@/db/schema';

export interface UsedInItem {
  type: 'recipe' | 'industry';
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImagePublicId: string | null;
}

const CAP_PER_TYPE = 6;

export async function getUsedInForProduct(
  productId: string,
  locale: 'uz' | 'ru' | 'en',
): Promise<{ recipes: UsedInItem[]; industries: UsedInItem[] }> {
  'use cache';
  cacheLife('max');
  cacheTag(`used-in:${productId}`);

  const rows = await db
    .select({
      type: productUsedInView.contentType,
      id: productUsedInView.contentId,
      title: productUsedInView.title,
      slug: productUsedInView.slug,
      excerpt: productUsedInView.excerpt,
      featuredImagePublicId: productUsedInView.featuredImagePublicId,
      position: productUsedInView.position,
    })
    .from(productUsedInView)
    .where(
      and(
        eq(productUsedInView.productId, productId),
        eq(productUsedInView.locale, locale),
      ),
    );

  // Sort by position::integer ASC so cap selects deterministically.
  // (RESEARCH plan deviation Rule 2: position is text-cast in the view to
  // align UNION ALL column types; cast back at consumer-side here.)
  const sorted = [...rows].sort(
    (a, b) => Number(a.position) - Number(b.position),
  );

  const recipes: UsedInItem[] = [];
  const industries: UsedInItem[] = [];
  for (const r of sorted) {
    const item: UsedInItem = {
      type: r.type as 'recipe' | 'industry',
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      featuredImagePublicId: r.featuredImagePublicId,
    };
    if (r.type === 'recipe') recipes.push(item);
    else industries.push(item);
  }

  return {
    recipes: recipes.slice(0, CAP_PER_TYPE),
    industries: industries.slice(0, CAP_PER_TYPE),
  };
}
