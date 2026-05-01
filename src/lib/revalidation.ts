// Plan 02-05 LIB-REVALIDATION: typed cache-invalidation helpers (D-10, D-12).
//
// Every Wave-2/3/4 Server Action calls these helpers AFTER its transaction
// commits. Centralizing the fan-out prevents the OPS-01 silent-failure
// pitfall (forgetting a tag) and gives type safety against tag-string typos.
//
// Critical Next.js 16 signature: revalidateTag takes (tag, profile) — the
// single-arg form is deprecated and TS-errors in Next 16. We default to the
// 'max' profile because admin writes should invalidate aggressively.
//
// Anti-pattern (Pitfall #2 of 02-RESEARCH): NEVER call these inside
// `dbTx.transaction(...)`. Mutations commit first; revalidation runs after.
//
// Tag scheme (D-10):
//   per-entity:    product:<uuid>, category:<uuid>, manufacturer:<uuid>,
//                  spec-field:<uuid>, spec-field-group:<uuid>
//   per-collection: products-list, categories-tree, manufacturers-list,
//                   sitemap, search-index

import { revalidateTag } from "next/cache";

type Profile = "max" | "default" | "min";
const DEFAULT_PROFILE: Profile = "max";

/**
 * Local wrapper so every call goes through one chokepoint. Tests assert
 * the next/cache function with (name, 'max') directly; the wrapper just
 * hides the default.
 */
async function tag(name: string, profile: Profile = DEFAULT_PROFILE) {
  await revalidateTag(name, profile);
}

// ─── Per-entity helpers ───────────────────────────────────────────────────

/** Product mutation invalidates the product detail + listing + sitemap + search. */
export async function revalidateProduct(id: string): Promise<void> {
  await tag(`product:${id}`);
  await tag("products-list");
  await tag("sitemap");
  await tag("search-index");
}

/** Single-category mutation (rename, slug change, etc.) — no tree restructure. */
export async function revalidateCategory(id: string): Promise<void> {
  await tag(`category:${id}`);
  await tag("categories-tree");
  await tag("sitemap");
}

/**
 * Category re-parent (D-12 fan-out): old parent breadcrumb + new parent
 * breadcrumb + the moved category itself + the tree + sitemap.
 *
 * Either parent id may be `null` (top-level move); the helper skips the
 * NULL slot rather than emitting a `category:null` tag.
 */
export async function revalidateCategoryMove(
  oldParentId: string | null,
  newParentId: string | null,
  movedId: string,
): Promise<void> {
  if (oldParentId) await tag(`category:${oldParentId}`);
  if (newParentId) await tag(`category:${newParentId}`);
  await tag(`category:${movedId}`);
  await tag("categories-tree");
  await tag("sitemap");
}

/** Manufacturer mutation — manufacturer detail + listing + sitemap. */
export async function revalidateManufacturer(id: string): Promise<void> {
  await tag(`manufacturer:${id}`);
  await tag("manufacturers-list");
  await tag("sitemap");
}

/**
 * Spec-field mutation — invalidates the field itself + the owning category
 * page (filter chips render the field) + the search index (filterable specs
 * back the parametric search facets).
 */
export async function revalidateSpecField(
  id: string,
  categoryId: string,
): Promise<void> {
  await tag(`spec-field:${id}`);
  await tag(`category:${categoryId}`);
  await tag("search-index");
}

/**
 * Spec-field-group mutation — invalidates the group itself + the owning
 * category (D-09: groups render as `<table>` partitions on the public
 * detail page).
 */
export async function revalidateSpecFieldGroup(
  id: string,
  categoryId: string,
): Promise<void> {
  await tag(`spec-field-group:${id}`);
  await tag(`category:${categoryId}`);
}

/**
 * Contact-submissions collection. No public-facing tag exists for the
 * submissions inbox — admin reads invalidate via `revalidatePath` on the
 * `/admin/submissions` route when needed. Kept as a symmetric placeholder
 * so callers don't special-case submissions vs. other entities.
 */
export async function revalidateSubmissionsCollection(): Promise<void> {
  // intentional no-op (D-10: no public submissions tag in v1)
}

// ─── Phase 4 plan 04-03: content-tier helpers (CONT-03 + CONT-04 + D-04) ──
//
// Recipe / industry mutations (saveRecipe / publishRecipe / unpublishRecipe /
// deleteRecipe + industry mirrors — Wave 1 plans 04-05 + 04-06) call these
// AFTER tx.commit. Junction-table mutations on either side additionally call
// `revalidateUsedIn(productId)` for each affected product so the Used-In
// section on the public product detail page composes fresh.
//
// Locales default to ['uz','ru','en']. Callers MAY narrow when only specific
// locales are affected (rare — recipes that lack a translation in one locale
// are still reachable via fallback cascade per Phase-3 D-05; the safe posture
// is to fan out all 3 list tags).

type Locale = "uz" | "ru" | "en";
const ALL_LOCALES: readonly Locale[] = ["uz", "ru", "en"];

/**
 * Recipe mutation — recipe detail tag + per-locale recipes list tag + sitemap.
 * Pattern from RESEARCH §Cache-tag invalidation strategy lines 720-742.
 */
export async function revalidateRecipe(
  id: string,
  locales: readonly Locale[] = ALL_LOCALES,
): Promise<void> {
  await tag(`recipe:${id}`);
  for (const l of locales) await tag(`recipes:list:${l}`);
  await tag("sitemap");
}

/** Industry mutation — same shape mirrored against industry list tags. */
export async function revalidateIndustry(
  id: string,
  locales: readonly Locale[] = ALL_LOCALES,
): Promise<void> {
  await tag(`industry:${id}`);
  for (const l of locales) await tag(`industries:list:${l}`);
  await tag("sitemap");
}

/**
 * Junction-table mutation on either side — invalidates the product's
 * "Used in" cached read PLUS the product page tag so the surrounding
 * spec / manufacturer / used-in composition recomputes fresh.
 *
 * Ordering matters: tag the narrower used-in cache row before the broader
 * product page so a concurrent reader between the two calls observes either
 * stale-everything or fresh-used-in-stale-product (acceptable transient),
 * never fresh-product-stale-used-in (which would re-render the product page
 * with stale used-in data and re-cache it).
 */
export async function revalidateUsedIn(productId: string): Promise<void> {
  await tag(`used-in:${productId}`);
  await tag(`product:${productId}`);
}
