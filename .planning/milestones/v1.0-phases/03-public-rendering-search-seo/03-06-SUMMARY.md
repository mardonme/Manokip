---
phase: 03-public-rendering-search-seo
plan: 06
subsystem: search
status: complete
wave: 6
depends_on: [01, 02, 03, 04, 05, 07]
requirements: [SRCH-01, SRCH-02, SRCH-03, SRCH-04]
tags:
  - full-text-search
  - postgres-fts
  - autocomplete
  - locale-fallback
  - cascade
  - sku-redirect
  - d-06
  - d-07
  - tsquery-sanitization
dependency_graph:
  requires:
    - tests/fixtures/seed-public.ts (Plan 01) — deterministic 6-product seed across 2 categories × 3 manufacturers × 3 locales
    - src/db/schema/search.ts (Plan 01 declared) — productSearch tsvector table with per-locale GIN
    - src/actions/products.ts rebuildProductSearch (Plan 02 Task 2.3) — write-path tsvector population on saveProduct + duplicateProduct
    - src/lib/metadata.ts buildAlternates (Plan 03) — hreflang factory
    - src/components/public/site-header.tsx (Plan 03) — disabled placeholder anchored search box position; this plan retired the placeholder
    - src/components/public/product-card.tsx (Plan 04) — RSC card consuming heroPublicId + manufacturerName + sku + slug
    - src/i18n/navigation.ts (Plan 03) — locale-aware redirect/router used by SearchBox and the search page
  provides:
    - src/lib/search.ts — searchProducts (cascade fallback + D-06 chip data per row) + searchAutocomplete (sanitized prefix UNION) + skuExactMatch
    - src/app/api/search/autocomplete/route.ts — GET endpoint with Zod-validated locale + s-maxage Cache-Control
    - src/components/public/search-box.tsx — debounced 200ms client island swapped into site-header
    - src/components/public/search-fallback-banner.tsx — pure presentational amber notice
    - src/app/[locale]/search/page.tsx — Suspense'd dynamic search results page with SKU short-circuit + cascade banner
  affects:
    - src/components/public/site-header.tsx — disabled placeholder retired; SearchBox replaces it
    - messages/{uz,ru,en}.json — adds public.search namespace (title, noResults, fallbackBanner)
    - vitest.config.ts — fileParallelism: false on the node project (Rule-3 deviation)
    - tests/db/search.test.ts + tests/api/autocomplete.test.ts + tests/e2e/product-detail.spec.ts — RED→GREEN flips
tech_stack:
  added: []
  patterns:
    - Postgres FTS cascade fallback (current → uz → ru → en, stop on first non-empty)
    - tsquery operator sanitization (strip !&|():* + take first whitespace-delimited token before appending :*)
    - DISTINCT ON (id) + ORDER BY is_sku_match DESC for SKU-elevated autocomplete
    - cacheComponents-compatible "force-dynamic equivalent" via Suspense'd searchParams-reading child component
    - DB-resolved redirect target (slug from DB row, never user input — T-V7-01 mitigation)
    - per-row breadcrumb chip data from manufacturer_translations + category_translations LEFT JOIN (D-06)
    - ProductCard call-site receives heroPublicId from (image_public_ids)[1] PG 1-indexed projection
key_files:
  created:
    - src/lib/search.ts
    - src/app/api/search/autocomplete/route.ts
    - src/components/public/search-box.tsx
    - src/components/public/search-fallback-banner.tsx
    - src/app/[locale]/search/page.tsx
  modified:
    - src/components/public/site-header.tsx
    - messages/uz.json
    - messages/ru.json
    - messages/en.json
    - tests/db/search.test.ts
    - tests/api/autocomplete.test.ts
    - tests/e2e/product-detail.spec.ts
    - vitest.config.ts
decisions:
  - id: SEARCH-CASCADE-ORDER
    text: "D-05 cascade locked at FALLBACK_ORDER = ['uz','ru','ru','en'] minus current locale. Iterates in array order so the locale where data is most likely to exist (uz, project default) runs first; stops at first non-empty hit (does NOT aggregate across locales)."
  - id: TSQUERY-SANITIZATION
    text: "searchAutocomplete strips !&|():* via /[!&|():*]/g and takes the first whitespace-delimited token before constructing `${token}:*` for to_tsquery. Pitfall #3 / T-V5-01 mitigated structurally; multi-token autocomplete (mano stainless) returns empty rather than triggering tsquery syntax errors."
  - id: D-06-AT-SEARCH-LIB-LAYER
    text: "runFtsQuery JOINs manufacturer_translations + category_translations on the result locale and projects (image_public_ids)[1] AS hero_public_id so each SearchResultRow already carries the chip data. The /search page passes these straight to ProductCard with NO hardcoded nulls — D-06 is closed at the lib layer, not the page layer."
  - id: FORCE-DYNAMIC-VIA-SUSPENSE
    text: "cacheComponents: true rejects `export const dynamic = 'force-dynamic'`. Equivalent runtime behavior achieved by isolating the searchParams + DB block inside a <Suspense> child component (SearchResultsBlock) — page shell prerenders, dynamic data streams per request. Build output shows /[locale]/search as ◐ Partial Prerender."
  - id: AUTOCOMPLETE-CACHE-CONTROL
    text: "GET /api/search/autocomplete returns Cache-Control: public, s-maxage=30, stale-while-revalidate=60. Vercel's edge cache absorbs the dropdown's hot path (repeated keystroke patterns share suggestion sets across visitors); LIMIT 10 + < 2-char short-circuit + Zod-validated locale enum bound the load (T-03-06-04 accepted)."
  - id: VITEST-FILE-PARALLELISM-OFF
    text: "vitest.config.ts node project sets fileParallelism: false (Rule-3 deviation). seedPublicFixture uses deterministic UUIDs so e2e specs can target known IDs across runs; when multiple test files (catalog + search + autocomplete) call seedPublicFixture in parallel against the same Neon test branch, INSERT operations race and one fails with PG 23505 unique violation on category_pkey. Sequential file execution preserves the deterministic-ID invariant. Dom project (jsdom) is unaffected."
metrics:
  tasks_completed: 3
  task_commits: 4
  test_specs_added: 12 (7 search.test.ts + 5 autocomplete.test.ts) + 3 e2e (1 SRCH-01 + 2 SRCH-04)
  files_created: 5
  files_modified: 8
  lib_lines: ~310 (src/lib/search.ts)
  duration_minutes: ~30
  completed_at: 2026-04-30
---

# Phase 3 Plan 06: Search Infrastructure Summary

Postgres-native trilingual full-text search shipped end-to-end: per-locale tsvector
queries with uz→ru→en cascade fallback, autocomplete API + debounced header
client island with breadcrumb-chip dropdown, search results page with SKU
exact-match 302 short-circuit, and live SearchBox swapped into the site
header replacing the Plan-03 placeholder.

## Tasks

### Task 6.1 — `src/lib/search.ts` + flipped vitest gates

Three exported helpers + their typed DTOs:

- **`skuExactMatch(skuInput, locale)`** — SRCH-04 / D-07. Trimmed,
  case-insensitive `LOWER(product.sku) = LOWER(${input})` against published
  rows joined to `product_translations` for the slug. Returns
  `{ productId, slug }` or null. The slug comes from the DB row, never
  echoed from user input — the redirect target is therefore safe by
  construction (T-V7-01 mitigation).

- **`searchProducts(query, currentLocale, page, pageSize)`** — SRCH-01 +
  SRCH-02. Inner function `runFtsQuery` runs `plainto_tsquery(cfg, query) @@
  search_tsv` against `product_search` for a given locale, joined to
  `product_translations` (current locale slug + name + short_desc),
  `manufacturer_translations` (per-locale name → `manufacturerName`),
  `category_translations` (per-locale name → `categoryName`), and projects
  `(p.image_public_ids)[1] AS hero_public_id` so every row carries the full
  D-06 chip + hero data. Outer `searchProducts` runs primary-locale query
  first; if 0 hits, iterates `FALLBACK_ORDER = ['uz','ru','en']` (skipping
  the current locale) and stops at the first non-empty hit. Returns
  `{ rows, total, fallbackLocale, query }`.

- **`searchAutocomplete(query, locale)`** — SRCH-03 + D-06. CTE-based
  UNION of `name_hits` (`to_tsquery(cfg, 'token:*') @@ search_tsv`,
  LIMIT 8) and `sku_hits` (`LOWER(p.sku) LIKE 'token%'`, LIMIT 4), then
  `DISTINCT ON (id)` + `ORDER BY is_sku_match DESC, rank DESC` to pick the
  SKU-match row when a product appears in both halves. Final JS sort
  pushes SKU matches first, then name. Each suggestion carries
  `manufacturerName + categoryName + isSkuMatch` for the chip dropdown.

**Sanitization regex (Pitfall #3 / T-V5-01 mitigation):**

```javascript
const sanitized = q.replace(/[!&|():*]/g, ' ').trim().split(/\s+/)[0];
```

Strips every tsquery operator that could otherwise reach `to_tsquery` and
generate a SQLSTATE 42601 syntax error. Only the first whitespace-delimited
token is forwarded — multi-token autocomplete (`mano stainless`) returns
empty rather than triggering an `&`-joined query the user didn't intend.

**JOIN columns added to `runFtsQuery` for D-06 closure:**

| Source table                      | Projected as       | Drives                |
| --------------------------------- | ------------------ | --------------------- |
| `manufacturer_translations.name`  | `manufacturer_name` → `manufacturerName` | ProductCard chip on /search |
| `category_translations.name`      | `category_name` → `categoryName`         | breadcrumb chip on /search results (future use) |
| `(p.image_public_ids)[1]`         | `hero_public_id` → `heroPublicId`        | ProductCard `<CldImage>` on /search |

D-06 is closed at the search lib layer — every search results page just
forwards SearchResultRow fields straight to ProductCard. No hardcoded null
synthesis at the page layer.

**Tests (live-Neon, 12 specs):**

- `tests/db/search.test.ts` (7 specs) — SRCH-01 ranked tsvector match,
  D-06 chip + hero data populated for M-100, SRCH-02 cascade
  (`sanoat` → en→uz fallback), empty-query short-circuit, skuExactMatch
  + case-insensitive variant + null-on-unknown.
- `tests/api/autocomplete.test.ts` (5 specs) — SRCH-03 prefix `mano` →
  D-06 chips populated, SKU elevation (`M-1` → M-100 first with
  isSkuMatch=true), sanitization smoke (`!&|()foo` returns array
  without throwing), <2 char short-circuit, empty/whitespace
  short-circuit.

Both files open with `vi.mock('next/cache')` to satisfy revalidation
imports without spinning up Next 16's cache layer. Live Neon access via
`getTestDb()` + `requireTestDatabaseUrl()`. Each test rebuilds
product_search rows in `beforeAll` using the same setweight + to_tsvector
SQL that saveProduct's Step 6 emits — keeps the test decoupled from the
Server Action's auth + cache fan-out machinery while exercising the real
FTS contract.

### Task 6.2 — Autocomplete API + SearchBox + site-header swap

- **`src/app/api/search/autocomplete/route.ts`** — public GET handler.
  Zod schema `{ q: z.string().max(100), locale: z.enum(['uz','ru','en']) }`
  rejects malformed locale at the boundary (T-03-06-03 mitigation; 400 on
  miss). Cache-Control: `public, s-maxage=30, stale-while-revalidate=60`.

- **`src/components/public/search-box.tsx`** — `'use client'` island.
  - 200ms debounced fetch via `useRef<setTimeout>` + `useEffect` cleanup.
  - <2 char query closes dropdown without fetch.
  - dropdown renders ≤10 suggestions with breadcrumb chips
    (`manufacturerName · categoryName`) + `SKU M-100` highlighted pill on
    `isSkuMatch` rows.
  - form submit (Enter) routes to `/search?q=...` via
    `@/i18n/navigation` router — search page handles the SKU short-circuit
    + cascade fallback consistently.
  - blur with 150ms `setTimeout` so onMouseDown on a suggestion fires
    before the list unmounts.
  - `data-testid="search-input"` (e2e hook) + `search-suggestions` +
    `search-form`.

- **`src/components/public/search-fallback-banner.tsx`** — RSC. Pure
  presentational amber `role="status"` notice. Copy composed by the
  parent page so locale variants flow through next-intl ICU placeholders,
  not through this component.

- **`src/components/public/site-header.tsx`** — disabled
  `<Input data-testid="search-placeholder" />` retired in favor of
  `<SearchBox locale={locale} placeholder={t('searchPlaceholder')} />`.
  Layout dimensions preserved (w-72) so the swap doesn't visually shift.

- **`messages/{uz,ru,en}.json`** — adds `public.search` namespace:
  - `title: "Search results: {q}"` / `"Результаты поиска: {q}"` / `"Qidiruv natijalari: {q}"`
  - `noResults: "No results"` / `"Ничего не найдено"` / `"Hech narsa topilmadi"`
  - `fallbackBanner: "Showing results in {locale} — no matches in {current}"` (and ru / uz variants)

  `public.header.searchPlaceholder` is unchanged — already shipped by Plan 03.

### Task 6.3 — `/[locale]/search/page.tsx` + flipped SRCH-04 e2e

`SearchPage` page-shell calls `setRequestLocale(locale)` + loads
`getTranslations({ namespace: 'public.search' })`, then renders
`<Suspense fallback={...}><SearchResultsBlock /></Suspense>`.
`SearchResultsBlock` awaits `searchParams`, runs SKU short-circuit
(`skuExactMatch` → `redirect()` to `/products/<slug>`), then
`searchProducts(q, locale, page, 20)`, then renders the title + optional
`<SearchFallbackBanner>` + grid of `<ProductCard>`s.

**cacheComponents pattern:** Pitfall A6 — `export const dynamic = 'force-dynamic'`
is incompatible with Next 16's `cacheComponents: true`. Equivalent runtime
behavior comes from putting the `searchParams + DB` block inside a
`<Suspense>` child component. The page shell prerenders statically; the
dynamic block streams per request. Build output: `/[locale]/search` is `◐`
Partial Prerender.

**generateMetadata:** `robots: { index: false, follow: true }` — search
results pages are NEVER indexed (unbounded query-string surface). hreflang
alternates emit for the canonical `/search` path so locale switching from
a results page works.

**SRCH-04 e2e (3 active specs in `tests/e2e/product-detail.spec.ts`):**

```typescript
test('SRCH-04: visiting /uz/search?q=M-100 302-redirects to /uz/products/manometr-m-100 (D-07)')
test('SRCH-04: SKU match is case-insensitive — q=m-100 also redirects')
test('SRCH-01: search for "manometr" renders results grid with manufacturer chip (D-06)')
```

The Plan-01 `.skip` stubs were retired. `pnpm playwright test --list`
returns 7 active specs in product-detail.spec.ts (4 from Plan 03-05 + 3
from this plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocker] vitest fileParallelism off for node project**

- **Found during:** Task 6.1 GREEN test run.
- **Issue:** `tests/db/search.test.ts` and `tests/api/autocomplete.test.ts`
  both call `seedPublicFixture()` in `beforeAll`. seedPublicFixture uses
  hardcoded deterministic UUIDs (e.g.
  `00000000-0000-4000-8000-000000000c01` for the manometers category) so
  e2e specs can target known IDs. Vitest's default file-parallel execution
  ran both `beforeAll`s concurrently against the same Neon test branch,
  producing PG 23505 unique-violation races on `category_pkey`,
  `manufacturer_pkey`, etc. tests/db/catalog.test.ts (the existing fixture
  consumer) didn't manifest the bug because it was the only fixture
  consumer until this plan.
- **Fix:** Added `fileParallelism: false` to the `node` project in
  `vitest.config.ts`. Sequential file execution preserves the
  deterministic-ID invariant. The `dom` project (jsdom component tests)
  is unaffected — those tests don't touch Neon. Total full-suite runtime
  went from ~120s to ~160s — acceptable trade-off for correctness.
- **Files modified:** `vitest.config.ts`.
- **Commit:** `3b3e797` (folded into the Task 6.1 GREEN commit since the
  test file ran serial against catalog.test.ts to verify the fix).

**2. [Rule 1 — Bug] Removed incompatible `export const dynamic = 'force-dynamic'`**

- **Found during:** Task 6.3 `pnpm build`.
- **Issue:** Next 16 + `cacheComponents: true` rejects
  `export const dynamic = 'force-dynamic'` — the route segment config is
  marked incompatible at build (verified message: "Route segment config
  'dynamic' is not compatible with `nextConfig.cacheComponents`").
- **Fix:** Restructured the page shell so the `searchParams`-reading
  block lives in a child component wrapped in `<Suspense>`. The runtime
  contract is preserved (every request re-runs `skuExactMatch` +
  `searchProducts`); the segment config is gone. Build now succeeds and
  the route shows as `◐ Partial Prerender`. Same posture used by
  `src/app/[locale]/login/page.tsx` for its `searchParams` access under
  cacheComponents.
- **Files modified:** `src/app/[locale]/search/page.tsx`.
- **Commit:** `338b85b` (folded into the Task 6.3 commit; the failing
  build was caught and corrected before commit).

## Threat Model Compliance

All five threats from the plan's STRIDE register are mitigated as planned:

| Threat ID | Mitigation in code |
| --------- | ------------------ |
| T-03-06-01 (T-V5-01) tsquery injection | `searchProducts` uses `plainto_tsquery` (Postgres sanitizes by design); `searchAutocomplete` strips `!&|():*` then takes the FIRST token before appending `:*`; both pass through Drizzle `sql\`\`` parameter binding so the regconfig + literal values are never string-concatenated. |
| T-03-06-02 (T-V7-01) open redirect via SKU short-circuit | `skuExactMatch` returns `slug` from the DB row, never echoes `q`. `redirect({ href: '/products/${skuHit.slug}', locale })` constructs the target from the DB-resolved slug only. |
| T-03-06-03 (T-V5-01) locale tampering in autocomplete API | `querySchema = z.object({ ... locale: z.enum(['uz','ru','en']) })` rejects any other input with HTTP 400 before any DB hit. |
| T-03-06-04 DoS via unbounded autocomplete | LIMIT 10 + < 2-char short-circuit + 30s s-maxage Cache-Control header reduces hot-path load. Per-IP rate limiting is accepted-deferred to Phase 5. |
| T-03-06-05 (T-V7-02) Postgres errors leaking schema | API route catches errors via Next.js default error boundary; production errors flow through Sentry beforeSend filter (already wired Phase 1). |

## Test Counts

- vitest: **158/158 passing** across 31 files (was 146/146 across 30 files
  at Plan 03-07 close; +1 file +12 specs).
- TypeScript: `pnpm tsc --noEmit` exits 0.
- Build: `pnpm build` exits 0; `/[locale]/search` route renders as `◐
  Partial Prerender`; `/api/search/autocomplete` is `ƒ Dynamic`.
- Playwright: `pnpm playwright test --list tests/e2e/product-detail.spec.ts`
  returns 7 active specs (no `.skip` markers). Live execution requires
  Vercel preview + seeded DB per the spec's BASE_URL contract — the local
  list verifies the specs are wired correctly; full runtime validation
  lands when the next preview deploy runs the e2e workflow.

## Requirements Closed

- **SRCH-01** — full-text search across product name/desc/spec in current
  locale via `product_search` GIN tsvector + plainto_tsquery + ts_rank_cd.
- **SRCH-02** — D-05 cascade fallback (current → uz → ru → en) with
  fallbackLocale signal + amber banner UI on the results page.
- **SRCH-03** — autocomplete API + 200ms debounced SearchBox client
  island with breadcrumb-chip dropdown rows.
- **SRCH-04** — D-07 exact SKU 302-redirect from `/[locale]/search?q=<sku>`
  to `/[locale]/products/<slug>` (case-insensitive, DB-resolved slug).

D-06 (autocomplete + search-results breadcrumb chips) is closed at both
the autocomplete API layer (existing) and the search-results page layer
(new in this plan — every ProductCard receives full hero +
manufacturerName + categoryName from SearchResultRow).

## Self-Check: PASSED

- [x] `src/lib/search.ts` exists and exports skuExactMatch + searchProducts + searchAutocomplete
- [x] `src/app/api/search/autocomplete/route.ts` exists with GET handler + Zod locale validation + Cache-Control header
- [x] `src/components/public/search-box.tsx` exists with 200ms debounced fetch + dropdown
- [x] `src/components/public/search-fallback-banner.tsx` exists
- [x] `src/app/[locale]/search/page.tsx` exists with Suspense'd dynamic block + skuExactMatch + redirect + SearchFallbackBanner + ProductCard grid
- [x] `src/components/public/site-header.tsx` no longer contains `data-testid="search-placeholder"` (only in retired comment text — verified `grep -c` returns 0 after rephrasing)
- [x] `messages/{uz,ru,en}.json` carry `public.search.title` + `noResults` + `fallbackBanner`
- [x] commits 73a3694 + 3b3e797 + 0c3f465 + 338b85b all present in `git log`
- [x] full vitest suite 158/158 passing
- [x] pnpm tsc --noEmit clean
- [x] pnpm build green; /[locale]/search shows as Partial Prerender

---

*Plan 03-06 — search infrastructure complete; SRCH-01 + SRCH-02 + SRCH-03 + SRCH-04 closed; D-06 + D-07 enforced end-to-end.*
