---
phase: 04-content-features
plan: 11
subsystem: public-content
tags: [used-in, product-detail, cross-links, rsc, content-features, CONT-04]
requires:
  - 04-01: product_used_in_v pgView (status='published' filter)
  - 04-03: getUsedInForProduct(productId, locale) helper + cache wrapper
  - 04-09: RecipeCard primitive
  - 04-10: IndustryCard primitive
  - phase-3 03-05: ProductDetailContent layout + JSON-LD/breadcrumb invariants
provides:
  - public.UsedInSection — RSC component rendering Recipe + Industry card grids
  - public-product-detail.usedInSlot — mounted between SpecTable and ManufacturerCard
  - i18n.UsedIn.{title,recipes,industries} — top-level namespace in 3 locales
affects:
  - src/app/[locale]/products/[slug]/page.tsx — adds 1 import + 1 mount inside left column
tech-stack:
  added: []
  patterns:
    - RSC component reading a 'use cache'-tagged helper (getUsedInForProduct)
    - Hidden-when-zero-content (return null from RSC)
    - Card-grid reuse from sibling plans (no new card primitive)
    - next-intl getTranslations({locale, namespace: 'UsedIn'}) for server-rendered copy
key-files:
  created:
    - src/components/public/used-in-section.tsx
  modified:
    - src/app/[locale]/products/[slug]/page.tsx
    - messages/en.json
    - messages/ru.json
    - messages/uz.json
decisions:
  - "Top-level UsedIn namespace (not nested under public.product) so cross-link copy can be reused if Used-In ever appears outside the product detail page (e.g. industry detail in v1.1)."
  - "Hidden-when-empty enforced via early `return null` rather than at the parent page; component owns its own visibility contract so the parent doesn't need to peek into helper data."
  - "Reused RecipeCard + IndustryCard with their full prop shape ({id, title, slug, excerpt, featuredImagePublicId}); UsedInItem fields map 1:1 plus the helper-supplied id."
  - "Cap-at-6 not duplicated in the component — single source of truth in getUsedInForProduct's `.slice(0, CAP_PER_TYPE)` (Plan 04-03 spec 1)."
metrics:
  duration_minutes: 28
  completed: 2026-05-02
  commits: 2
  tasks: 2
  files_created: 1
  files_modified: 4
---

# Phase 4 Plan 11: Used-In Section Mount Summary

**One-liner:** Mounts the cross-link Used-In section on Phase-3 product detail pages, completing CONT-04 by reusing the 04-03 helper + 04-09/04-10 cards in the locked sketch-003 slot.

## What Shipped

Plan 04-11 delivers the final wire for CONT-04: the public-facing Used-In section that surfaces cross-linked recipes + industries on every product detail page. Two atomic commits:

1. **Task 11.1** ([8f55fbd](#)) — `src/components/public/used-in-section.tsx` RSC component:
   - Reads `getUsedInForProduct(productId, locale)` from Plan 04-03.
   - Renders two card grids stacked vertically: Recipes (top) + Industries (below).
   - Each grid is a `<ul>` with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`.
   - Reuses `<RecipeCard>` (04-09) + `<IndustryCard>` (04-10) — no new primitive.
   - Returns `null` when both arrays empty (D-09 hidden-when-zero invariant).
   - Translations added under `UsedIn` namespace: `title`, `recipes`, `industries` in `messages/{uz,ru,en}.json`.
   - The cap-at-6 per type is enforced upstream by `getUsedInForProduct` — single source of truth.
   - The pgView `product_used_in_v` filters `WHERE status='published'` on both recipe + industry sides (T-04-INFO-01 mitigation), so this component structurally cannot leak draft content.

2. **Task 11.2** ([1b9aeef](#)) — `src/app/[locale]/products/[slug]/page.tsx`:
   - Added `import { UsedInSection } from '@/components/public/used-in-section'`.
   - Mounted `<UsedInSection productId={product.id} locale={locale as Locale} />` between the `<SpecTable />` and the `<ManufacturerCard />` in the left column of the `lg:grid-cols-[1fr_380px]` layout.
   - Phase-3 invariants preserved: JSON-LD `<script>` blocks (Product + BreadcrumbList), breadcrumb data, locale-fallback handling, downloads list, sticky CTA rail, generateMetadata canonical/hreflang flow — all untouched.

## How It Works End-to-End

Public visitor → `/[locale]/products/[slug]` → `ProductDetailContent` runs:
1. `setRequestLocale` + `getProductBySlug` (cached, tagged `product:<id>`).
2. Page renders; reaching the locked slot, `<UsedInSection productId={product.id} locale={locale} />` is invoked as an RSC.
3. `getUsedInForProduct` runs with its own `'use cache'` boundary tagged `used-in:<productId>`.
4. The helper queries `product_used_in_v` (already filtered to `status='published'`), splits rows by `content_type`, slices to 6 per type, returns `{ recipes, industries }`.
5. UsedInSection renders 0, 1, or 2 grids. If both empty, the `return null` short-circuits and nothing reaches the DOM — no header, no whitespace, no aria landmark.

Cache invalidation flow (already wired upstream by 04-05/04-06):
- Admin saves a recipe → `saveRecipe` Server Action computes `oldLinkedProductIds ∪ newLinkedProductIds`.
- Calls `revalidateUsedIn(pid)` for every `pid` in the union.
- `revalidateUsedIn` fans out to both `used-in:<pid>` AND `product:<pid>` tags (defense-in-depth: section helper + page-level recompose).
- Next public visit to the affected product detail page re-runs UsedInSection's data fetch with fresh DB rows.

## Verification

```text
pnpm tsc --noEmit                                 → EXIT=0 (clean)
tests/lib/used-in.test.ts                         → ✓ all (CAP=6, empty-product, view-published)
tests/lib/revalidation.test.ts                    → ✓ all (fan-out + ordering)
component / hook tests                            → ✓ all
```

Pre-existing Neon HTTP `fetch failed` / `ECONNRESET` flakes affect 3 `× create` tests in `tests/actions/{products,industries,spec-fields}.test.ts` — all in test files unrelated to this plan's touched files. Out-of-scope per deviation-rule SCOPE BOUNDARY (logged here for visibility, not fixed).

## Deviations from Plan

None — plan executed exactly as written. Section structure, namespace name (top-level `UsedIn`), translations, mount slot, and cap-at-6 invariant all match the plan's must_haves.

## Threat Surface

No new threat surface introduced beyond what Plan 04-01 (pgView) and Plan 04-03 (helper) already mitigate:

- **T-04-INFO-01 (Information Disclosure of draft cross-links)** — mitigated upstream by `product_used_in_v`'s `WHERE r.status='published' AND i.status='published'` clause; UsedInSection is a thin renderer over that filtered surface.
- **P4-5 (Stale Used-In after recipe link removed)** — mitigated upstream by 04-05/04-06 Server Actions' pre-tx capture of `oldLinkedProductIds` + `revalidateUsedIn` fan-out over `old ∪ new`.
- **T-04-DOS-01 (DoS via thousands of cross-links)** — mitigated upstream by `getUsedInForProduct`'s `.slice(0, 6)` per type. The component does NOT relax this cap; the deferred "all examples" link is the v1.1 path per D-09.

No new endpoints, no new auth surfaces, no new write paths. The section is read-only public RSC.

## Wave 3 Closure

This plan closes Wave 3 (CONT-03 + CONT-04 + CONT-05 + CONT-06 public surfaces). Wave 4 (Plan 04-12) flips the e2e Playwright stubs and runs the manual Rich Results gate.

## Self-Check: PASSED

Files exist:
- FOUND: `src/components/public/used-in-section.tsx`
- FOUND: `src/app/[locale]/products/[slug]/page.tsx` (modified)
- FOUND: `messages/en.json`, `messages/ru.json`, `messages/uz.json` (modified)

Commits exist:
- FOUND: 8f55fbd — feat(04-11): add UsedInSection RSC component for product cross-links
- FOUND: 1b9aeef — feat(04-11): mount UsedInSection in product detail page (locked slot)
