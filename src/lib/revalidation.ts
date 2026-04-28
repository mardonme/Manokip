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
