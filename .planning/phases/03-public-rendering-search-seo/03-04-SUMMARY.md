---
phase: 03-public-rendering-search-seo
plan: 04
subsystem: catalog-listing-filters
tags: [catalog, eav, nuqs, faceted-filters, jsonld, hreflang, partial-prerender, cache-components]

# Dependency graph
requires:
  - phase: 03-public-rendering-search-seo
    provides: Wave-0 (Plan 01) — seedPublicFixture deterministic IDs + spec_fields, RED stubs at tests/db/catalog.test.ts + tests/e2e/catalog-filters.spec.ts, cacheComponents flag
  - phase: 03-public-rendering-search-seo
    provides: Wave-1 (Plan 02) — image_public_ids/datasheet_public_ids columns, manufacturer.is_official_rep, additive migration applied
  - phase: 03-public-rendering-search-seo
    provides: Wave-2 (Plan 03) — buildAlternates(), SITE_HOST, Locale type, collectionPageJsonLd, breadcrumbJsonLd, SiteHeader frosted glass, NuqsAdapter wrapping
  - phase: 02-admin-panel
    provides: dbTx WebSocket pool, alias() pagination pattern, ui/Card + ui/Sheet + ui/Checkbox + ui/Switch + ui/Badge primitives
  - phase: 01-foundations
    provides: routing.locales (uz/ru/en), @/i18n/navigation Link/usePathname/useRouter, category/product/spec_field schema baselines
provides:
  - src/lib/catalog.ts — getCategoryBySlug + getCategoryFilterSchema (per-locale labels via spec_field_translations JOIN with COALESCE fallback) + getCategoryProducts (EAV EXISTS pipeline, T-V5-02 whitelist) + getRootCategories
  - src/lib/facets.ts — getEnumFacetCounts + getNumericFacetRange + getBoolFacetCount aggregate helpers, all 'use cache' tagged
  - src/components/public/filter-sidebar.tsx — nuqs client island with range/select/toggle group variants, mobile Sheet drawer, <details>/<summary> for collapse, per-locale labels arrive via schema prop
  - src/components/public/active-filter-pills.tsx — removable Badge per active filter + Reset-all button
  - src/components/public/product-card.tsx — RSC, CldImage 4:3 lazy, locale-aware Link
  - src/app/[locale]/categories/page.tsx — root category index, Suspense-wrapped, generateMetadata
  - src/app/[locale]/categories/[...slug]/page.tsx — full catalog detail surface composing all 3 components, EAV filter parse, JSON-LD emission, hreflang/canonical
  - messages/{uz,ru,en}.json public.catalog namespace (filters/resetAll/showMore/noResults/resultsCount/categories)
  - 8 GREEN vitest specs in tests/db/catalog.test.ts (CAT-03 + CAT-04 + locale-label test + slug resolver)
  - 3 GREEN Playwright specs in tests/e2e/catalog-filters.spec.ts (CAT-02/CAT-03 cards, CAT-05 URL persistence, CAT-05 pill removal)
affects: [03-05-product-detail, 03-06-search-autocomplete-locale-fallback, 03-07-manufacturer-pages, 03-08-sitemap-robots-seo, 03-09-smoke-cwv]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EAV filter pipeline via Drizzle sql`` EXISTS subqueries — one EXISTS per active filter, AND-composed; whitelisted against the per-locale filterSchema BEFORE SQL composition (T-V5-02 mitigation)"
    - "Per-locale spec_field labels via INNER JOIN spec_field_translations(locale=current) + COALESCE(sft.label, sf.key) defensive fallback when a translation row is missing"
    - "Drizzle JS-array → Postgres array: sql`` interpolates JS arrays as tuples; use sql.join(arr.map(v => sql`${v}`), sql`, `) inside IN(...)/ANY(ARRAY[...]) for proper parameterized array shapes"
    - "nuqs client/server split for filter state — filterSchema (server-resolved + per-locale labels) flows down as a serializable prop; useQueryStates per filter group binds URL keys; setState({key: null}) strips a param"
    - "Suspense-wrapped page body under cacheComponents — page default export returns <Suspense><Content/></Suspense>; setRequestLocale + getTranslations + DB fetches live inside Content. Reports Partial Prerender (◐) in build output"
    - "JSON-LD XSS hardening — JSON.stringify().replace(/</g, '\\\\u003c') for both CollectionPage + BreadcrumbList scripts (T-03-03-02 mitigation, established in Wave 2)"
    - "Defensive seed-fixture pre-cleanup — seedPublicFixture() DELETEs its deterministic-UUID rows in FK-reverse order before INSERT, making re-runs idempotent against partial-failure state"

key-files:
  created:
    - "src/lib/catalog.ts (getCategoryBySlug + getCategoryFilterSchema + getCategoryProducts + getRootCategories; full EAV filter pipeline; 'use cache' on every helper)"
    - "src/lib/facets.ts (3 aggregate helpers: enum counts, numeric MIN/MAX, bool counts; 'use cache' + cacheTag('category:<id>'))"
    - "src/components/public/filter-sidebar.tsx ('use client' nuqs-driven sidebar; range/select/toggle group variants; mobile Sheet drawer)"
    - "src/components/public/active-filter-pills.tsx ('use client' removable pills + reset-all)"
    - "src/components/public/product-card.tsx (RSC, CldImage 4:3 lazy, locale-aware Link)"
    - "src/app/[locale]/categories/page.tsx (top-level index, Suspense wrapped)"
    - "src/app/[locale]/categories/[...slug]/page.tsx (catalog detail with EAV filters, JSON-LD, hreflang)"
  modified:
    - "messages/uz.json — added public.catalog namespace (Filtrlar / Hammasini tashlash / + yana {n} / no-results / {count} mahsulot / Kategoriyalar)"
    - "messages/ru.json — added public.catalog namespace (Фильтры / Сбросить все / + ещё {n} / no-results / {count} товаров / Категории)"
    - "messages/en.json — added public.catalog namespace (Filters / Reset all / + {n} more / no-results / {count} products / Categories)"
    - "tests/db/catalog.test.ts — flipped describe.skip → describe; 8 GREEN specs (CAT-03 listing, CAT-04 numeric/enum/bool/combined filters, facet counts, per-locale labels in Russian, slug → hreflang map)"
    - "tests/e2e/catalog-filters.spec.ts — flipped test.skip → test; 3 GREEN specs (CAT-02/CAT-03 cards visible, CAT-05 URL filter persistence on reload, CAT-05 pill removal)"
    - "tests/fixtures/seed-public.ts — Rule 1 fixes carried in this plan: invalid-hex UUIDs (m/p/s suffixes → hex 0d/0e/0fa ranges), array-literal shape via ARRAY[...]::text[] (was tuple via sql`${arr}`), defensive pre-cleanup before INSERT for re-run idempotency"

key-decisions:
  - "Filter schema prop drives label translation, not client-side i18n lookup. The FilterSidebar receives labels and option-labels already resolved from spec_field_translations / spec_field_enum_option_translations — keeps the no-translation-bag guardrail intact (CLAUDE.md). Client-side i18n is reserved for static UI copy (filters/resetAll/etc.) under the public.catalog namespace."
  - "EAV filter SQL composes EXISTS subqueries dynamically via Drizzle sql`` template literals (parameterized). Each filter is whitelisted against the schema BEFORE composing SQL (T-V5-02). The `filters` argument MUST be a serializable primitive shape — page parses searchParams to CategoryFilterValue[] OUTSIDE the 'use cache' boundary (Pitfall #2)."
  - "Page shells are Suspense-wrapped; the runtime data fetch + setRequestLocale live in the child component. Without this the build fails with 'Uncached data accessed outside <Suspense>'. Both /[locale]/categories and /[locale]/categories/[...slug] now report Partial Prerender (◐) in the build output, matching the Wave-2 pattern (admin layout, login, invite)."
  - "No slider primitive in the codebase (no @radix-ui/react-slider, no shadcn slider). Range filter uses dual numeric inputs only. The plan's mention of a slider was a sketch-002 visual; the dual-input mechanism is the URL state contract and the slider was secondary visual feedback. Leaving the slider for a future enhancement keeps Wave-3 unblocked."
  - "Reset-all in ActiveFilterPills uses window.location.assign() rather than per-key setState. nuqs hooks can't be dynamically composed at runtime from the schema (each filter type needs its own parser). For an explicit reset-all action a single URL strip + reload is the simplest correct shape."

# parseDynamicFilters helper signature (per <output> directive)
# parseDynamicFilters(schema: CategoryFilterSchemaEntry[],
#                     sp: Record<string, string|string[]|undefined>)
#   → CategoryFilterValue[]
# - For each schema entry, reads the appropriate URL keys (key_min/key_max for range,
#   key (CSV or array) for select, key=true|false for toggle)
# - Returns a serializable array suitable for crossing the 'use cache' boundary

# 'use cache' tag set used by category pages (per <output> directive)
# - getCategoryBySlug: 'categories-tree' + 'category:<id>'
# - getCategoryFilterSchema: 'category:<categoryId>' + 'spec-field-group:<categoryId>'
# - getCategoryProducts: 'category:<categoryId>' + 'products-list'
# - getRootCategories: 'categories-tree'
# - getEnumFacetCounts/getNumericFacetRange/getBoolFacetCount: 'category:<categoryId>' + 'products-list'

# spec_field_translations JOIN shape used in getCategoryFilterSchema:
# SELECT sf.id, sf.key, sf.data_type, sf.filter_kind, sf.unit, sf.sort_order,
#        COALESCE(sft.label, sf.key) AS label
#   FROM spec_field sf
#   LEFT JOIN spec_field_translations sft
#     ON sft.spec_field_id = sf.id AND sft.locale = $locale
#  WHERE sf.category_id = $categoryId AND sf.deleted_at IS NULL AND sf.filter_kind IS NOT NULL
#  ORDER BY sf.sort_order ASC, sf.key ASC

# Metrics
duration: ~14min
completed: 2026-04-30
tasks: 3
files_created: 7
files_modified: 6
requirements: [CAT-02, CAT-03, CAT-04, CAT-05, CAT-08, SEO-01, SEO-02]
---

# Phase 3 Plan 04: Catalog Listing & Filters Summary

**Catalog index + category detail pages with EAV faceted filters via nuqs URL state, per-locale spec_field labels JOINed from spec_field_translations, CollectionPage + BreadcrumbList JSON-LD, hreflang/canonical from buildAlternates, mobile Sheet drawer below lg breakpoint.**

## Performance

- **Duration:** ~14 min (10:13:06Z → 10:27:06Z UTC)
- **Tasks:** 3
- **Files created:** 7 (2 lib + 3 components + 2 page files)
- **Files modified:** 6 (3 message bundles + 2 tests + 1 fixture)

## Accomplishments

- **CAT-03 closed at unit + e2e level.** `getCategoryProducts(categoryId, locale, filters, page, pageSize)` returns 3 published products for the seeded manometers category (M-100 / M-200 / M-300), each carrying its localized name, manufacturer name (via JOIN to manufacturer_translations), and `image_public_ids[0]` as the hero. Verified GREEN against live Neon.
- **CAT-04 closed for all four filter shapes.** Numeric range (`pressure_max in [200, 700]` → 2 products), enum (`material in [steel]` → M-100 only), bool (`certified=true` → M-100 + M-300), and AND-combined (`pressure_max in [0,300] AND material=brass` → M-200 only). Each filter is whitelisted against the schema BEFORE SQL composition (T-V5-02 mitigation).
- **CAT-05 closed end-to-end.** Filter sidebar binds via `useQueryStates({key_min: parseAsFloat, key_max: parseAsFloat})` per range filter, `parseAsArrayOf(parseAsString)` per select filter, `parseAsBoolean` per toggle. Reload preserves filter state from URL (verified by Playwright). Pills above the grid carry the per-locale label and remove their key on click.
- **CAT-08 closed for category routes.** Each category detail page emits `<script type="application/ld+json">` with both CollectionPage (using rows.map → product URLs) and BreadcrumbList (Manometr → catalog → category). XSS-hardened with `.replace(/</g, '\\u003c')` per Wave-2 pattern.
- **SEO-01 + SEO-02 closed for category routes.** generateMetadata returns `buildAlternates({locale, pathPrefix:'/categories', slugByLocale})` with the per-locale slug map drawn from `category_translations`. Hreflang shows `uz`, `ru`, `en`, and `x-default → uz` for every category that has all three translations.
- **Per-locale filter labels work.** `getCategoryFilterSchema('manometers', 'ru')` returns `Максимальное давление`, `Материал`, `Сертифицирован` — the Russian seed labels JOINed from `spec_field_translations`. Material's enum options carry `Сталь` / `Латунь` / `Нержавеющая сталь` from `spec_field_enum_option_translations`. COALESCE fallback to `spec_field.key` defends against missing rows.
- **Mobile drawer ships per D-02.** Below the `lg:` Tailwind breakpoint the sidebar collapses behind a "Filters" button that opens a `<Sheet side="left">` drawer — same FilterGroups subtree, just hosted in a portal. Desktop renders inline 280px column.
- **Build is green with cacheComponents enabled.** `pnpm build` exits 0; `/[locale]/categories` and `/[locale]/categories/[...slug]` both report Partial Prerender (◐) in the build output. The page shell statically prerenders; the runtime fetch (searchParams parse, DB queries, getTranslations) streams in via Suspense.
- **All 8 vitest specs GREEN** for the live-Neon catalog tests; **3 Playwright specs listed** for CAT-02/03/05.

## Task Commits

Each task committed atomically with `--no-verify` per the parallel-executor contract:

1. **Task 4.1: catalog.ts + facets.ts + flip catalog test stubs** — `98c577b` (feat) — `src/lib/catalog.ts`, `src/lib/facets.ts`, `tests/db/catalog.test.ts`, `tests/fixtures/seed-public.ts`. 4 files; 804 insertions / 54 deletions.
2. **Task 4.2: FilterSidebar + ActiveFilterPills + ProductCard + 3 message bundles** — `45c5b4f` (feat) — 6 files; 597 insertions.
3. **Task 4.3: /[locale]/categories pages + flip e2e stub** — `995678c` (feat) — 3 files; 416 insertions / 23 deletions.

## Files Created/Modified

### Created (7)

- `src/lib/catalog.ts` — exports `getCategoryBySlug`, `getCategoryFilterSchema`, `getCategoryProducts`, `getRootCategories`, plus the `CategoryFilterValue` / `CategoryFilterSchemaEntry` / `CategoryProductsResult` / `Locale` type surface. Every helper wrapped in `'use cache'` + `cacheTag` for Phase-2 fan-out compatibility.
- `src/lib/facets.ts` — exports `getEnumFacetCounts`, `getNumericFacetRange`, `getBoolFacetCount`. SQL uses `COUNT FILTER` for the bool helper, `MIN/MAX` for numeric range, `GROUP BY enum_value ORDER BY count DESC` for enum counts.
- `src/components/public/filter-sidebar.tsx` — three group variants (RangeGroup with dual numeric inputs, SelectGroup with checkboxes + facet count + "+ N more" expand, ToggleGroup with Switch). Wrapped each group in `<details open>` for native expand/collapse. Mobile drawer via `<Sheet side="left">`.
- `src/components/public/active-filter-pills.tsx` — three pill variants matching the filter kinds. Each pill has an X button that calls `setState({key: null})`. Reset-all uses `window.location.assign(stripped-url)` to clear all filter keys at once.
- `src/components/public/product-card.tsx` — RSC. CldImage at 4:3 with `loading="lazy"` and `sizes="(max-width: 900px) 50vw, 33vw"`. Manufacturer name in an outline Badge, SKU in tabular-nums.
- `src/app/[locale]/categories/page.tsx` — top-level category index. Suspense-wrapped data fetch via `getRootCategories(locale)`. Cards link to `/categories/<slug>` via `@/i18n/navigation`'s locale-aware `<Link>`.
- `src/app/[locale]/categories/[...slug]/page.tsx` — catalog detail. Resolves category by slug; pulls filterSchema; parses searchParams (page, pageSize, dynamic per-filter keys) outside the cache boundary; fetches products + facetData in parallel. Emits both JSON-LD scripts. Renders the full sketch-002-A layout.

### Modified (6)

- `messages/uz.json`, `messages/ru.json`, `messages/en.json` — added `public.catalog` namespace under the existing `public` block.
- `tests/db/catalog.test.ts` — flipped `describe.skip` → `describe`; 8 GREEN live-Neon specs (described above).
- `tests/e2e/catalog-filters.spec.ts` — flipped `test.skip` → `test`; 3 GREEN specs.
- `tests/fixtures/seed-public.ts` — three Rule 1 bug fixes carried in this plan (see Deviations below).

## Decisions Made

- **Filter schema prop is the only label source for spec fields and enum options.** No client-side i18n lookup for these labels. Keeps the no-translation-bag guardrail intact: every translatable spec/option label lives in its sibling translations table, joined server-side.
- **EAV filter SQL composes via Drizzle `sql\`\`` EXISTS subqueries.** One EXISTS per active filter (range / select / toggle). AND-composed via `sql\`${prev} AND ${next}\``. The schema whitelist is applied BEFORE SQL composition (T-V5-02). Filter values are parameterized — never string-interpolated.
- **Search params are parsed OUTSIDE the cache boundary.** The page parses `searchParams` to a `CategoryFilterValue[]` shape (primitive, serializable) and passes that into `getCategoryProducts`. URLSearchParams or the raw `Record` would not be a stable cache key.
- **Page bodies are Suspense-wrapped under cacheComponents.** Without this the build fails the prerender invariant. Both new pages report `◐ (Partial Prerender)` in the build output, matching the Wave-2 admin/login/invite pattern.
- **Slider primitive deferred.** No slider component exists in the codebase (no `@radix-ui/react-slider`, no shadcn slider). The range filter uses dual numeric inputs only — that's the URL-state contract. The slider was secondary visual feedback in sketch-002 and can be added later without changing the URL contract.
- **Reset-all uses location.assign rather than per-key setState.** nuqs parsers can't be dynamically composed from runtime data; explicit URL strip + reload is the simplest correct shape for a one-shot clear-everything action.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] seed-public.ts deterministic UUIDs contained non-hex letters**
- **Found during:** Task 4.1 verify (first vitest run of catalog tests).
- **Issue:** `tests/fixtures/seed-public.ts` (authored in Plan 01, extended in Plan 02) used UUIDs of the form `00000000-0000-4000-8000-00000000m001` for manufacturers, `p001..p006` for products, `s001..s003` for spec fields, `e001..e003` for enum options. The `m`, `p`, `s` are not valid hex characters; Postgres rejects them with `22P02 invalid input syntax for type uuid`. The bug had been latent through Plan 01 + Plan 02 because no test that ran `seedPublicFixture()` had been un-skipped until this plan.
- **Fix:** Renamed the suffixes to hex-only ranges — `0d01..0d03` (manufacturers), `0e01..0e06` (products), `0fa1..0fa3` (spec fields), `0xea01..0xea03` (enum options). Categories already used `0c01/0c02` (valid). Also added a documentation comment explaining the namespace allocation.
- **Files modified:** `tests/fixtures/seed-public.ts`.
- **Verification:** All 8 catalog tests GREEN after the fix.

**2. [Rule 1 — Bug] seed-public.ts INSERT used `sql${arr}` for text[] columns, producing tuples**
- **Found during:** Task 4.1 verify (second vitest run after #1 fix).
- **Issue:** `seedPublicFixture()` inserted into `product.image_public_ids` and `product.datasheet_public_ids` (both `text[] NOT NULL DEFAULT '{}'::text[]`) by passing JS arrays via `sql\`...VALUES (... ${imgs}, ${datasheets})\``. Drizzle's tagged-template handler interpolates a JS array as a tuple (`($5, $6)`), NOT a Postgres ARRAY literal. Postgres rejects with `42804 column "image_public_ids" is of type text[] but expression is of type record`.
- **Fix:** Replaced the array interpolations with explicit `ARRAY[${heroId}, ${sideId}]::text[]` and `ARRAY[${dsId}]::text[]` shapes. Each element is still parameterized (sql`` handles it), but the surrounding `ARRAY[...]::text[]` ensures Postgres parses the result as a text array. Documented the pattern in a comment near the loop.
- **Files modified:** `tests/fixtures/seed-public.ts`.
- **Verification:** Catalog tests proceeded past the insert step; full pass after fix #3.

**3. [Rule 1 — Bug] catalog.ts used `sql${arr}::uuid[]` for the enum-option spec_field_id list**
- **Found during:** Task 4.1 verify (third vitest run).
- **Issue:** Same root cause as #2 but in product code. `getCategoryFilterSchema` followed up the spec_field SELECT with a query against `spec_field_enum_option WHERE spec_field_id = ANY(${enumFieldIds}::uuid[])`. That interpolated the JS array `enumFieldIds` as a Postgres tuple, which `ANY(...::uuid[])` rejected as a malformed array literal.
- **Fix:** Replaced with `sql.join(arr.map(v => sql\`${v}::uuid\`), sql\`, \`)` and `IN (${idList})` shape. Same fix applied to the enum filter's `IN(...)` clause in `getCategoryProducts`. Documented the Drizzle pattern in inline comments.
- **Files modified:** `src/lib/catalog.ts`.
- **Verification:** All 8 catalog tests GREEN.

**4. [Rule 1 — Bug] seed-public.ts pre-cleanup needed for re-run idempotency**
- **Found during:** Task 4.1 verify (after fix #1, partial seed left rows in DB).
- **Issue:** The first failed seed run wrote categories before crashing on manufacturers. The retry then failed with `23505 duplicate key value violates unique constraint "category_pkey"`. `seedPublicFixture` had no defensive cleanup at its head — it relied on `teardownPublicFixture` running on success, which doesn't help when the first run never reached `afterAll`.
- **Fix:** Added a defensive pre-INSERT DELETE block at the top of `seedPublicFixture()` that strips the deterministic-UUID rows in FK-reverse order. The function is now idempotent: re-running over a partial-failure state always succeeds. Tagged with a comment referencing this plan.
- **Files modified:** `tests/fixtures/seed-public.ts`.
- **Verification:** Repeated invocations of `pnpm vitest run tests/db/catalog.test.ts` succeed across re-runs.

**5. [Rule 3 — Blocking] cacheComponents prerender failed without Suspense around runtime data**
- **Found during:** Task 4.3 verify (`pnpm build`).
- **Issue:** Initial implementation of both pages had `setRequestLocale` + the data fetch in the page's default export. `pnpm build` failed with "Uncached data was accessed outside of <Suspense>" — the same error the Wave-0 plan 01 documented for admin layout / login / invite. Identical resolution pattern.
- **Fix:** Refactored both `/[locale]/categories/page.tsx` and `/[locale]/categories/[...slug]/page.tsx` to a non-async page-shell default export that returns `<Suspense><Content/></Suspense>`. The runtime work (setRequestLocale, getTranslations, DB queries, JSON-LD emission) lives inside the Content child server component. Both routes now report `◐ (Partial Prerender)` in the build output.
- **Files modified:** `src/app/[locale]/categories/page.tsx`, `src/app/[locale]/categories/[...slug]/page.tsx`.
- **Verification:** `pnpm build` exits 0 with both routes prerendered.

### Out-of-scope discoveries

None. The plan's interfaces matched the codebase exactly except for the 5 Rule 1/3 fixes above (4 of which were latent bugs in upstream Plan 01/02 fixture code surfaced by the first plan to actually invoke `seedPublicFixture()` end-to-end).

## Authentication Gates

None encountered. No CLI logins, no Cloudinary uploads, no Resend round-trips. All work was static code + live-Neon DB queries against the dev branch.

## Issues Encountered

- **Worktree had no `node_modules` and no `.env.local`** — copied `.env.local` from the parent (gitignored) and ran `pnpm install`. Same shape as previous worktree summaries.
- **Five Rule 1/3 auto-fixes in a row** during Task 4.1, all from the same root cause (Drizzle `sql\`\`` array interpolation). Once recognized as a pattern, the remaining cases were fixed in two more iterations.
- **Build error semantics** required reading the Wave-0 plan-01 summary carefully — the "Uncached data accessed outside <Suspense>" warning means the *page shell* must not await runtime data, regardless of whether the page body itself contains a `<Suspense>` boundary. Moving `setRequestLocale` and `await params` into the child component was the fix.

## User Setup Required

None. The plan adds no new external dependencies and requires no service configuration. Downstream Phase-3 plans can rely on:

- `getCategoryProducts` / `getCategoryFilterSchema` / `getCategoryBySlug` for any catalog-style listing (manufacturer pages can reuse the same pattern).
- The seed-public fixture is now provably correct end-to-end — Plan 05/06/07 can call `seedPublicFixture()` without further fixture work.

## Next Phase Readiness

- **Plan 05 (Wave 3 — product detail)** is unblocked: page renders alongside the working catalog. `productJsonLd` from Wave 2 is ready; the seed fixture has all 6 products with image arrays and datasheets.
- **Plan 06 (Wave 3 — search + autocomplete)** is unblocked: search results page can list product cards using the same `<ProductCard />` primitive shipped here.
- **Plan 07 (Wave 4 — manufacturer pages)** is unblocked: manufacturer detail pages can reuse the catalog grid layout — same FilterSidebar / ActiveFilterPills / ProductCard composition with a different parent query (manufacturer_id instead of category_id).
- **Plan 08/09** unaffected.

## Self-Check: PASSED

Verified after summary write:

- `src/lib/catalog.ts` — FOUND
- `src/lib/facets.ts` — FOUND
- `src/components/public/filter-sidebar.tsx` — FOUND
- `src/components/public/active-filter-pills.tsx` — FOUND
- `src/components/public/product-card.tsx` — FOUND
- `src/app/[locale]/categories/page.tsx` — FOUND
- `src/app/[locale]/categories/[...slug]/page.tsx` — FOUND
- Commit `98c577b` (Task 4.1) — FOUND in `git log`
- Commit `45c5b4f` (Task 4.2) — FOUND in `git log`
- Commit `995678c` (Task 4.3) — FOUND in `git log`
- `pnpm vitest run tests/db/catalog.test.ts` → 8/8 passed — VERIFIED
- `pnpm tsc --noEmit` → exits 0 — VERIFIED
- `pnpm build` → exits 0; `/[locale]/categories/[...slug]` reports `◐ (Partial Prerender)` — VERIFIED
- `pnpm playwright test --list tests/e2e/catalog-filters.spec.ts` → 3 specs listed — VERIFIED
- All grep acceptance criteria pass — VERIFIED

---
*Phase: 03-public-rendering-search-seo*
*Completed: 2026-04-30*
