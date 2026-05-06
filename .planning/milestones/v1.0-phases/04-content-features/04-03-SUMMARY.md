---
phase: 04-content-features
plan: 03
subsystem: lib-helpers
tags: [jsonld, revalidation, used-in, recipes, industries, zod-schemas, content-layer, tdd]
requires:
  - "04-01 schema substrate (recipe.status + industry.status + product_recipes + product_industries + product_used_in_v pgView) — read sites depend on these tables/views existing on the Neon dev branch"
  - "04-02 Tiptap foundations (@tiptap/core 3.22.5 ships JSONContent type used by recipes.ts + industries.ts isTiptapDocFilled heuristic)"
provides:
  - "src/lib/jsonld.ts:: techArticleJsonLd — 5th JSON-LD helper extending Phase-3 set; WithContext<TechArticle> with author=publisher=Manometr Org, optional description+image+mentions conditional-spread, mentions as Product sub-objects (no offers — Phase 3 D-08 stance)"
  - "src/lib/revalidation.ts:: revalidateRecipe(id, locales?) + revalidateIndustry(id, locales?) + revalidateUsedIn(productId) — three new content-tier typed-tag helpers"
  - "src/lib/used-in.ts:: getUsedInForProduct(productId, locale) + UsedInItem interface — reads productUsedInView with cap-at-6 per type per D-09"
  - "src/lib/recipes.ts:: getRecipeBySlug + findPublishedRecipes + getLinkedProductsForRecipe — public read helpers with Phase-3 D-05 fallback cascade + Locale type"
  - "src/lib/industries.ts:: getIndustryBySlug + findPublishedIndustries + getLinkedProductsForIndustry — same shape mirrored"
  - "src/lib/zod/recipe.ts:: recipeInsertSchema + recipePublishSchema + recipeDeleteSchema — Zod schemas with reserved-slug denylist refinement"
  - "src/lib/zod/industry.ts:: industryInsertSchema + industryPublishSchema + industryDeleteSchema — mirrored"
  - "tests/lib/jsonld.test.ts:: 3 new specs for techArticleJsonLd (minimal input, full input with featuredImagePublicId, mentions array)"
  - "tests/lib/revalidation.test.ts:: 6 new specs locking the content-tier helper fan-out shape"
  - "tests/lib/used-in.test.ts:: 2 live-Neon specs locking cap-at-6 + empty-result behavior"
affects:
  - "src/lib/jsonld.ts (extended with techArticleJsonLd)"
  - "src/lib/revalidation.ts (extended with three content-tier helpers + Locale type)"
  - "tests/lib/jsonld.test.ts (extended with techArticleJsonLd describe block)"
  - "tests/lib/revalidation.test.ts (extended with content-tier specs)"
tech-stack:
  added: []
  patterns:
    - "Phase-3 D-05 fallback cascade ported to recipes / industries detail resolvers (current → uz → ru → en, stop at first non-empty body) with usedFallbackLocale flag returned for D-07 banner rendering"
    - "isTiptapDocFilled heuristic inlined in recipes.ts + industries.ts (RESEARCH lines 522-530); slated for extraction to src/lib/tiptap-helpers.ts when plans 04-07/04-08 admin completeness display reuses it"
    - "Reserved-slug denylist Zod refinement (deny slug ∈ {'admin','api','_next','cdn','admin-action'}) — defense-in-depth alongside per-locale unique index on (locale, slug); T-04-TAMP-03 mitigation"
    - "Locale fallback ordering inside getLinkedProductsFor* (try requested → fall back to uz → fall back to first available) preserves junction-table position ordering across the de-dup pass"
    - "vi.mock('next/cache') with cacheTag + cacheLife stubs reused from Phase-3 catalog/search test pattern — assert helper *behavior* (correct rows + cap), defer cache-tag wiring verification to plan 04-11 e2e"
    - "TechArticle JSON-LD hero image at w_1200 (vs w_800 product) using same f_auto,q_auto Cloudinary URL shape so crawlers + public <CldImage> render agree on the URL"
    - "revalidateUsedIn calls used-in:<pid> tag BEFORE product:<pid> tag — defense-in-depth ordering prevents fresh-product-stale-used-in re-cache scenario"
    - "Status filter on every public read query (eq(recipes.status, 'published') / eq(industries.status, 'published')) — T-04-INFO-01 defense-in-depth alongside the pgView's WHERE filter"
key-files:
  created:
    - src/lib/used-in.ts
    - src/lib/recipes.ts
    - src/lib/industries.ts
    - src/lib/zod/recipe.ts
    - src/lib/zod/industry.ts
    - tests/lib/used-in.test.ts
    - .planning/phases/04-content-features/04-03-SUMMARY.md
  modified:
    - src/lib/jsonld.ts
    - src/lib/revalidation.ts
    - tests/lib/jsonld.test.ts
    - tests/lib/revalidation.test.ts
decisions:
  - "isTiptapDocFilled inlined in both recipes.ts + industries.ts (8 lines each) rather than extracted to src/lib/tiptap-helpers.ts — plan literal explicitly allows either; extraction deferred until plans 04-07/04-08 admin completeness display reuses the heuristic"
  - "v1 Used-In trade-off: NO in-JS locale cascade fallback in getUsedInForProduct (RESEARCH lines 685-690 documented intentional trade-off). Content authors maintain trilingual parity for cross-linked content manually; Used-In is a discoverability widget, not a primary read surface"
  - "Reserved-slug denylist content shipped as Set<string> rather than const tuple — Set.has() is O(1); content kept in sync between recipe.ts + industry.ts via inline comment (extraction to a shared module deferred — 5 entries, low duplication cost)"
  - "Locale fallback in getLinkedProductsFor* implemented as JS reduce over rows-grouped-by-productId rather than a SQL DISTINCT ON / window function — preserves junction-table position ordering simply, fits the v1 ≤200 published-products scale, and avoids a Postgres-specific query that wouldn't translate to a future SQLite test branch"
metrics:
  duration_min: ~12
  completed_date: "2026-05-01"
  task_count: 4
  files_changed: 7 (5 created + 2 modified — 4 lib files + 2 zod schemas + 1 test file new; 1 lib + 1 test extended)
  tests_added: 11 (3 jsonld + 6 revalidation + 2 used-in)
  total_tests_passing: 186 across 35 files (was 175/34 at 04-02 close)
---

# Phase 04 Plan 03: Lib Helpers Summary

The lib substrate that Wave 1+ Server Actions and Wave 3 public RSC pages call. Five new lib files + 3 extensions to existing helpers (jsonld, revalidation, used-in, recipes, industries, zod schemas). All pure functions / data-fetch helpers — no Server Actions yet (those land in 04-05/04-06).

## What Shipped

**JSON-LD layer** (`src/lib/jsonld.ts`):

- 5th helper `techArticleJsonLd` extends Phase-3 set (Product, Organization, BreadcrumbList, CollectionPage). Returns `WithContext<TechArticle>` with locked field set per RESEARCH §TechArticle JSON-LD field set lines 547-583: `headline`, `inLanguage`, `datePublished`, `dateModified`, `author=publisher=Manometr Organization`, `mainEntityOfPage` per-locale canonical URL. Optional `description`/`image`/`mentions` conditional-spread so minimal input renders compact JSON.
- Hero image w_1200 (vs w_800 product) via `f_auto,q_auto` Cloudinary URL — same shape as Phase-3 productJsonLd at jsonld.ts:41 so crawlers + the public `<CldImage>` hero render agree on the URL.
- `mentions` array references linked products as `{ '@type': 'Product', name, url }` sub-objects — NO `offers` field (Phase 3 D-08 stance carries forward; CONT-06 / D-10).
- Caveat documented inline: Schema.org strictly scopes TechArticle to how-to/step-by-step/specs; industry vertical landing pages would technically fit `Article` better. We emit TechArticle for both per locked decision; manual Yandex gate in plan 04-12 validates whether Yandex parses cleanly. Switching industries to `Article` is a 1-line `@type` change in a v1.1 follow-up if Yandex flags it.

**Revalidation layer** (`src/lib/revalidation.ts`):

- 3 new content-tier helpers extending Phase-2 02-05 helper set:
  - `revalidateRecipe(id, locales = ['uz','ru','en'])`: `recipe:<id>` + `recipes:list:<l>` per locale + `sitemap`.
  - `revalidateIndustry(id, locales = ['uz','ru','en'])`: same shape mirrored.
  - `revalidateUsedIn(productId)`: `used-in:<pid>` + `product:<pid>` (page-level recompose so the surrounding spec/manufacturer/used-in composition recomputes fresh).
- Used-in tag fired BEFORE product tag — defense-in-depth ordering. A concurrent reader between the two calls observes either stale-everything OR fresh-used-in-stale-product (acceptable transient), never fresh-product-stale-used-in (which would re-render the product page with stale used-in data and re-cache it).
- Wave 1 saveRecipe/saveIndustry + junction-table mutations (04-05/04-06) call these AFTER tx.commit (Pitfall #2).

**Used-In layer** (`src/lib/used-in.ts`):

- `getUsedInForProduct(productId, locale): Promise<{ recipes: UsedInItem[], industries: UsedInItem[] }>`. Reads `productUsedInView` (the pgView shipped in 04-01) for the requested (productId, locale) tuple, splits rows by content_type, caps at 6 per type per D-09.
- `'use cache'` + `cacheLife('max')` + `cacheTag(\`used-in:\${productId}\`)` — `revalidateUsedIn(pid)` busts this row.
- Sort by `position::integer ASC` so the cap selects deterministically (RESEARCH plan deviation Rule 2 anticipated this — position is text-cast in the pgView to align UNION ALL column types; cast back at consumer-side here).
- v1 trade-off: NO in-JS locale cascade fallback. The pgView's body already filters to status='published' on both sides (T-04-01-02 mitigation, defense-in-depth) so this helper structurally cannot leak draft content. Recipes that lack a translation in the requested locale are simply absent from the section — Used-In is a discoverability widget, not a primary read surface.

**Recipes / Industries public read layer** (`src/lib/recipes.ts` + `src/lib/industries.ts` — mirrored shape):

- `getRecipeBySlug` / `getIndustryBySlug`: published-only lookup with Phase-3 D-05 fallback cascade. Tries the requested locale first; if no translation matches OR the body is empty per `isTiptapDocFilled` heuristic, walks `uz → ru → en` (stop at first non-empty). Returns `usedFallbackLocale: Locale | null` for D-07 banner rendering + `slugByLocale` for Pitfall #6 hreflang fan-out (never advertise a 404 locale variant).
- `findPublishedRecipes` / `findPublishedIndustries`: list view ordered by `publishedAt DESC`, NO cascade fallback (rows lacking the requested locale are filtered out by the inner join — same posture as Phase-3 catalog list pages).
- `getLinkedProductsForRecipe` / `getLinkedProductsForIndustry`: `[{name, slug, locale}]` for the TechArticle JSON-LD `mentions` array (D-10). Single query JOINing junction → product → product_translations, then JS reduce preserving junction-table `position` ordering with locale-fallback (try requested → fall back to uz → fall back to first available).
- All 6 helpers wrap `'use cache'` + `cacheLife('max')` + `cacheTag` fan-out (`recipe:<id>` / `industry:<id>` / `recipes:list:<l>` / `industries:list:<l>`) so revalidate{Recipe,Industry} from Task 3.2 bust the rows cleanly.
- Status filter on every query (`eq(recipes.status, 'published')` / `eq(industries.status, 'published')`) — T-04-INFO-01 mitigation, defense-in-depth alongside the pgView's same filter for the Used-In path.
- `isTiptapDocFilled` heuristic inlined as a private helper in both modules (8 lines per RESEARCH lines 522-530). Extraction to `src/lib/tiptap-helpers.ts` deferred until plans 04-07/04-08 admin completeness display reuses it.

**Zod schemas** (`src/lib/zod/recipe.ts` + `src/lib/zod/industry.ts` — mirrored shape):

- `recipeInsertSchema` / `industryInsertSchema`: 3-locale translations (`title`, `slug`, `excerpt`, `body`), `linkedProductIds` array of `{productId, position}`, `status` enum `'draft'|'published'` (default `'draft'`), `publishedAt` ISO 8601 nullable, `featuredImagePublicId` nullable. Body is `z.unknown()` — the locked TIPTAP_EXTENSIONS allow-list enforces shape at runtime, NOT via Zod (Zod cannot validate arbitrary ProseMirror JSON tree structure efficiently per RESEARCH §Form shape lines 778-797).
- Reserved-slug refinement: deny `slug ∈ {'admin','api','_next','cdn','admin-action'}` across all 3 locales — defense-in-depth alongside the per-locale unique index on `(locale, slug)`. T-04-TAMP-03 mitigation per RESEARCH §Open Q §4.
- `recipePublishSchema` / `recipeDeleteSchema` (and industry mirrors): `{ id: uuid }` shells consumed by Wave 1 lifecycle plans 04-05/04-06.
- saveRecipe / saveIndustry will write `status` verbatim BUT enforce W7 refusal-to-elevate (carry-forward from Phase-2 02-13b) — those transitions go through `publishRecipe` / `unpublishRecipe` in 04-05/04-06.

## Verification Results

```
pnpm tsc --noEmit                                                        → CLEAN
pnpm vitest run tests/lib/jsonld.test.ts -t "techArticleJsonLd"           → 3/3 PASS
pnpm vitest run tests/lib/revalidation.test.ts -t "revalidate(Recipe...)" → 6/6 PASS
pnpm vitest run tests/lib/used-in.test.ts                                 → 2/2 PASS (live-Neon, 30s + 15s timeouts)
pnpm vitest run tests/lib/jsonld.test.ts tests/lib/revalidation.test.ts \
                tests/lib/used-in.test.ts                                 → 25/25 PASS (3 files)
pnpm vitest run                                                          → 186/186 PASS (35 files)
```

All plan-literal verification gates clean / green. Full suite advances from 175/175 across 34 files (at 04-02 close) → 186/186 across 35 files (+1 file `tests/lib/used-in.test.ts`; +11 specs: jsonld +3, revalidation +6, used-in +2).

## Deviations from Plan

None — plan executed exactly as written. The plan's 3 anticipated deviation rules in `<deviations_protocol>` did not need to fire:

- **Rule 1** (`schema-dts` TechArticle import): `import type { TechArticle, ... } from 'schema-dts'` works directly; no inheritance-chain workaround needed.
- **Rule 2** (cap-at-6 ordering instability): the helper sorts by `position::integer ASC` proactively (per the deviation rule's prescription), so the cap selects deterministically without requiring a follow-up fix. Live-Neon spec 1 seeds 7 recipes with positions 0..6 and asserts `recipes.length === 6`; the GREEN run is stable.
- **Rule 3** (`'use cache'` test conflict): `vi.mock('next/cache')` with `cacheTag` + `cacheLife` stubs (existing Phase-3 catalog/search test pattern) cleanly bypasses the cacheComponents directive. Tests assert the *behavior* (correct rows + correct cap) per the deviation rule's prescription; cache-tag wiring verification deferred to plan 04-11 e2e (admin-edit-revalidates pattern).

### Authentication Gates

None — pure local CLI work (vitest + tsc + Neon dev branch via `DATABASE_URL_DIRECT` already configured in `.env.local` from Phase-2 02-04).

### Architectural Changes

None — strictly additive surface (5 new lib files + 3 extensions to existing modules; no schema migrations, no new dependencies, no new Server Actions).

## TDD Gate Compliance

Three of the four tasks ran clean RED→GREEN cycles with separate test+feat commits:

- **Task 3.1** RED `c394fcf` (`techArticleJsonLd is not a function`) → GREEN `30a638d`.
- **Task 3.2** RED `ca72e95` (six `revalidate{Recipe,Industry,UsedIn} is not a function`) → GREEN `002f8af`.
- **Task 3.3** RED `aded792` (`ERR_MODULE_NOT_FOUND` for `@/lib/used-in`) → GREEN `e97c438`.

Task 3.4 ships without an explicit RED→GREEN commit pair per plan literal: "No tests in this task — TDD coverage lands in 04-05 (recipes Server Action specs exercise recipeInsertSchema) + 04-09 (recipe public detail RSC e2e exercises getRecipeBySlug fallback path)." The 4 lib files + 2 Zod schemas land in a single feat commit `51215e8`.

The plan-level TDD gate sequence is visible in `git log --oneline`:

- `c394fcf` test(04-03): RED for techArticleJsonLd
- `30a638d` feat(04-03): GREEN — techArticleJsonLd
- `ca72e95` test(04-03): RED for revalidate{Recipe,Industry,UsedIn}
- `002f8af` feat(04-03): GREEN — revalidate helpers
- `aded792` test(04-03): RED for getUsedInForProduct (live-Neon)
- `e97c438` feat(04-03): GREEN — getUsedInForProduct
- `51215e8` feat(04-03): recipes + industries + Zod schemas (no separate RED — covered by Wave 1+ tests)

## Threat Flags

No new security-relevant surface beyond what the plan's `<threat_model>` already covered. The three threats it documented are all mitigated as planned:

- **T-04-INFO-01** (draft leak via getRecipeBySlug / findPublishedRecipes): both helpers' Drizzle queries explicitly add `eq(recipes.status, 'published')`. Industries mirror. The `productUsedInView`'s body separately enforces this at the view (defense-in-depth).
- **T-04-XSS-02** (XSS in techArticleJsonLd via `<` in headline / excerpt / mentions name): the helper returns a typed object; the script-tag escape (`JSON.stringify(obj).replace(/</g, '\\u003c')`) is the consumer's responsibility (Phase 3 D-09 pattern; lands in plans 04-09/04-10).
- **T-04-TAMP-03** (slug squatting): `recipeInsertSchema` + `industryInsertSchema` include the reserved-slug denylist refinement.

No threat flags surfaced by this plan's lib-substrate work — every new module is read-side only (no mutation primitives), and the Zod schemas are inert until Wave 1 saveRecipe / saveIndustry consumes them in 04-05/04-06.

## Self-Check: PASSED

Files claimed to exist:

- `src/lib/used-in.ts` — FOUND
- `src/lib/recipes.ts` — FOUND
- `src/lib/industries.ts` — FOUND
- `src/lib/zod/recipe.ts` — FOUND
- `src/lib/zod/industry.ts` — FOUND
- `tests/lib/used-in.test.ts` — FOUND
- `.planning/phases/04-content-features/04-03-SUMMARY.md` — FOUND (this file)

Files claimed to be modified (verified via `git diff master~7..master`):

- `src/lib/jsonld.ts` (techArticleJsonLd export) — VERIFIED
- `src/lib/revalidation.ts` (revalidateRecipe/Industry/UsedIn exports) — VERIFIED
- `tests/lib/jsonld.test.ts` (techArticleJsonLd specs) — VERIFIED
- `tests/lib/revalidation.test.ts` (content-tier specs) — VERIFIED

Commits claimed to exist (verified via `git log --oneline`):

- `c394fcf` test(04-03): RED for techArticleJsonLd
- `30a638d` feat(04-03): techArticleJsonLd
- `ca72e95` test(04-03): RED for revalidate helpers
- `002f8af` feat(04-03): revalidate{Recipe,Industry,UsedIn}
- `aded792` test(04-03): RED for getUsedInForProduct
- `e97c438` feat(04-03): getUsedInForProduct
- `51215e8` feat(04-03): recipes + industries + Zod schemas

All claims verified.
