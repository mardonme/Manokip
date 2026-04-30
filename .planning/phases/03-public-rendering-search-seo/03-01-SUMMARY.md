---
phase: 03-public-rendering-search-seo
plan: 01
subsystem: testing
tags: [vitest, playwright, schema-dts, next16, cacheComponents, seed-fixture]

# Dependency graph
requires:
  - phase: 02-admin-panel
    provides: tests/_fixtures/seed-products.ts seedProduct fixture pattern, drizzle schema (categories, products, manufacturers, spec-fields, spec-values), tests/_fixtures/db.ts getTestDb helper, tests/actions/products.test.ts (Phase-2 saveProduct contracts)
provides:
  - Wave-0 test scaffolding for the entire Phase-3 effort — 11 RED stub files (6 vitest + 5 Playwright) + 1 SRCH-05 stub appended to tests/actions/products.test.ts
  - tests/fixtures/seed-public.ts deterministic public-side fixture (3 manufacturers × 6 published products × 2 categories × 3 locales + 3 spec_fields with translations + enum option catalog + typed product_spec_values)
  - next.config.ts cacheComponents: true enabling 'use cache' + cacheTag pipeline for Phase-3 RSC pages
  - schema-dts v2 in dependencies for src/lib/jsonld.ts (Plan 03)
  - Suspense-wrapped admin layout, login page, and invite/accept page so Next 16 cacheComponents prerender invariants are satisfied
affects: [03-02-data-write-path-migration, 03-03-public-shell-locale-jsonld, 03-04-catalog-listing-filters, 03-05-product-detail, 03-06-search-autocomplete-locale-fallback, 03-07-manufacturer-pages, 03-08-sitemap-robots-seo, 03-09-smoke-cwv]

# Tech tracking
tech-stack:
  added: [schema-dts@2.0.0]
  patterns:
    - "RED-stub TDD scaffolding — every Phase-3 requirement gets a describe.skip / test.skip stub up front; downstream plans flip skip → real assertions"
    - "Deterministic UUID namespace for test fixtures (00000000-0000-4000-8000-* prefix) so e2e specs can hardcode IDs across runs"
    - "Wave-0 column boundary discipline — fixture writes only columns that exist in the current schema; downstream migrations add columns + extend the fixture in lockstep"
    - "Next 16 cacheComponents migration: `dynamic = 'force-dynamic'` + `runtime = 'nodejs'` segment configs are incompatible — replaced with Suspense boundaries around runtime-data fetches (cookies/headers/searchParams/DB calls)"
    - "Partial Prerender (◐) admin pages — chrome streams in via Suspense while the static shell prerenders"

key-files:
  created:
    - "tests/fixtures/seed-public.ts (596 LOC) — deterministic public-side seed factory + teardown"
    - "tests/lib/jsonld.test.ts — CAT-08 stub (4 specs, closed plan 03)"
    - "tests/lib/metadata.test.ts — SEO-01/SEO-02 stub (3 specs, closed plan 03)"
    - "tests/db/catalog.test.ts — CAT-03/CAT-04 stub (5 specs, closed plan 04)"
    - "tests/db/search.test.ts — SRCH-01/SRCH-02 stub (3 specs, closed plan 06)"
    - "tests/api/autocomplete.test.ts — SRCH-03 stub (4 specs, closed plan 06)"
    - "tests/api/sitemap.test.ts — SEO-03 stub (4 specs, closed plan 08)"
    - "tests/e2e/locale-switcher.spec.ts — CAT-01 stub (closed plan 03)"
    - "tests/e2e/category-nav.spec.ts — CAT-02 stub (closed plan 03)"
    - "tests/e2e/catalog-filters.spec.ts — CAT-05 stub (closed plan 04)"
    - "tests/e2e/product-detail.spec.ts — CAT-06/CAT-07/SRCH-04 stub (closed plans 05+06)"
    - "tests/e2e/manufacturers.spec.ts — MFG-01/MFG-02 stub (closed plan 07)"
  modified:
    - "next.config.ts — added cacheComponents: true (top-level, stable in Next 16)"
    - "package.json + pnpm-lock.yaml — added schema-dts@2.0.0 to dependencies"
    - "src/app/[locale]/admin/layout.tsx — refactored to Suspense-wrap requireAdmin() + getTranslations() inside AdminChrome child component"
    - "src/app/[locale]/invite/accept/page.tsx — moved searchParams + acceptInvite() inside Suspense-wrapped InviteAcceptanceFlow component"
    - "src/app/[locale]/login/page.tsx — moved searchParams access inside Suspense-wrapped LoginFormShell component"
    - "src/app/api/cloudinary/sign/route.ts — removed `export const runtime = 'nodejs'` (incompatible with cacheComponents; Node remains default)"
    - "src/app/api/smoke/sentry/route.ts — removed `export const runtime = 'nodejs'`"
    - "tests/actions/products.test.ts — appended SRCH-05 describe.skip block (existing 11 Phase-2 specs preserved)"

key-decisions:
  - "Replaced Phase-2 admin `dynamic = 'force-dynamic'` posture with Suspense-wrapped chrome — required by Next 16 cacheComponents which is mutually exclusive with the `dynamic` segment config. Per Next migration docs, force-dynamic is no longer needed; runtime APIs (cookies/headers) must live in Suspense boundaries instead. Admin pages now report Partial Prerender (◐) which preserves the D-15 admin gate while satisfying cacheComponents prerender invariants."
  - "Removed `export const runtime = 'nodejs'` from API route handlers — cacheComponents flags this as incompatible. Node is the Next 16 default for route handlers; only Edge requires opting in. Behavior is identical."
  - "Fixture path is `tests/fixtures/seed-public.ts` (NOT `tests/_fixtures/`) per the plan's frontmatter and downstream-plan @-references in 03-02 / 03-04 / 03-05 / 03-06 / 03-07."
  - "Wave-0 fixture writes only Wave-0-schema columns. Plan 02 will (a) land the additive migration for product media arrays, manufacturer.is_official_rep, manufacturer_translations.relationship_note, and (b) extend the fixture to populate them. The verify step's `grep -q '<col-name>'` assertion enforces the boundary."
  - "product_search rows NOT seeded — Plan 02 Task 2.3 adds the tsvector rebuild to saveProduct(); SRCH-* tests will trigger the rebuild explicitly when un-skipped, keeping the fixture decoupled from FTS shape."

patterns-established:
  - "RED-stub-first scaffolding for a multi-plan phase — every requirement gets a describe.skip / test.skip stub in Wave 0; later waves flip individual stubs to real assertions, preserving a global signal of 'every requirement has at least one failing test on the path to GREEN'"
  - "Deterministic UUID namespace per fixture — public-side fixture uses `00000000-0000-4000-8000-{type}{seq}` so e2e specs can hardcode IDs without coupling to randomness"
  - "Suspense-wrapped runtime-data child components under cacheComponents — pull cookies/headers/searchParams/DB access into a child server component, wrap that child in `<Suspense>`, leave the page shell statically prerenderable"

requirements-completed: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, SRCH-01, SRCH-02, SRCH-03, SRCH-05, MFG-01, MFG-02, SEO-01, SEO-02, SEO-03]
# Note: requirements-completed reflects the plan's frontmatter `requirements` field. Wave-0 lays the
# RED stubs for these; downstream Phase-3 plans flip skip → real assertions to validate the
# requirement against running code. Per plan frontmatter contract, Plan 01 closes the test-scaffold
# slice for each ID; functional implementation lands in plans 02–08.

# Metrics
duration: ~50min
completed: 2026-04-30
---

# Phase 3 Plan 01: Wave-0 Test Scaffolding Summary

**RED-stub TDD scaffolding for all Phase-3 requirements — 11 stub files + SRCH-05 append + deterministic public-side seed fixture + Next 16 cacheComponents enabled**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-04-30T06:09:00Z (approx — worktree base verification)
- **Completed:** 2026-04-30T07:00:00Z
- **Tasks:** 3
- **Files created:** 12 (1 fixture + 11 test stubs + this SUMMARY)
- **Files modified:** 8 (next.config.ts, package.json, pnpm-lock.yaml, admin layout, invite/login pages, 2 route handlers, products.test.ts)

## Accomplishments

- Wave-0 test scaffolding lands in a single commit per task — every Phase-3 requirement (CAT-01..08, SRCH-01..05, MFG-01..02, SEO-01..03) has a RED stub committed with the closing-plan reference baked into the describe/test title.
- `tests/fixtures/seed-public.ts` provides a deterministic, FK-safe seed of 3 manufacturers × 6 published products × 2 categories × 3 locales — including 3 spec_fields with translations and 9 typed product_spec_values rows so downstream catalog + filter + search tests have stable data to assert against.
- `next.config.ts` ships with `cacheComponents: true` so Phase-3 plans 03–07 can use `'use cache'` + `cacheTag()` without per-plan config edits.
- `schema-dts@2.0.0` is installed and ready for `src/lib/jsonld.ts` consumption in Plan 03.
- `pnpm build` exits 0 with cacheComponents enabled — admin pages now Partial Prerender (◐), login + invite pages Partial Prerender, all RSC routes prerender cleanly through their Suspense boundaries.

## Task Commits

Each task was committed atomically:

1. **Task 1.1: Install schema-dts + enable cacheComponents** — `5ab6f0f` (feat)
2. **Task 1.2: Author seed-public fixture** — `6f5c8b4` (feat)
3. **Task 1.3: Create 11 RED test stubs + extend products.test.ts with SRCH-05 stub** — `f4636db` (test)

## Files Created/Modified

### Created

- `tests/fixtures/seed-public.ts` — 596 LOC. Exports `seedPublicFixture()` returning `PublicFixtureIds` and `teardownPublicFixture(ids)`. Deterministic UUIDs in the `00000000-0000-4000-8000-{type}{seq}` namespace. Wave-0 column boundary respected (no image_public_ids / datasheet_public_ids / official-rep flag / relationship_note).
- `tests/lib/jsonld.test.ts` — CAT-08 stub. 4 describe.skip specs.
- `tests/lib/metadata.test.ts` — SEO-01/SEO-02 stub. 3 describe.skip specs.
- `tests/db/catalog.test.ts` — CAT-03/CAT-04 stub. 5 describe.skip specs.
- `tests/db/search.test.ts` — SRCH-01/SRCH-02 stub. 3 describe.skip specs.
- `tests/api/autocomplete.test.ts` — SRCH-03 stub. 4 describe.skip specs.
- `tests/api/sitemap.test.ts` — SEO-03 stub. 4 describe.skip specs.
- `tests/e2e/locale-switcher.spec.ts` — CAT-01 stub. 2 test.skip specs.
- `tests/e2e/category-nav.spec.ts` — CAT-02 stub. 2 test.skip specs.
- `tests/e2e/catalog-filters.spec.ts` — CAT-05 stub. 3 test.skip specs.
- `tests/e2e/product-detail.spec.ts` — CAT-06/CAT-07/SRCH-04 stub. 4 test.skip specs.
- `tests/e2e/manufacturers.spec.ts` — MFG-01/MFG-02 stub. 4 test.skip specs.

### Modified

- `next.config.ts` — added `cacheComponents: true` (top-level, stable in Next 16). Preserved `withSentryConfig(withNextIntl(...))` wrapping and `turbopack.root` block.
- `package.json` + `pnpm-lock.yaml` — `schema-dts` v2.0.0 under dependencies.
- `src/app/[locale]/admin/layout.tsx` — extracted runtime data fetch (`requireAdmin()` + `getTranslations()`) into a child `<AdminChrome>` server component; layout now wraps `<AdminChrome>` in `<Suspense>` with a min-screen-height fallback. Edge-gate (proxy.ts) remains the primary auth boundary; `requireAdmin()` is the defense-in-depth check.
- `src/app/[locale]/invite/accept/page.tsx` — extracted `searchParams` + `acceptInvite()` into a child `<InviteAcceptanceFlow>` server component wrapped in `<Suspense>`.
- `src/app/[locale]/login/page.tsx` — extracted `searchParams` access into a child `<LoginFormShell>` server component wrapped in `<Suspense>`.
- `src/app/api/cloudinary/sign/route.ts` — removed `export const runtime = 'nodejs'`.
- `src/app/api/smoke/sentry/route.ts` — removed `export const runtime = 'nodejs'`.
- `tests/actions/products.test.ts` — appended SRCH-05 describe.skip block at end of file (existing 11 Phase-2 specs preserved and verified passing).

## Stub-to-Plan Mapping

| Stub | Requirement(s) | Closed By |
|---|---|---|
| `tests/lib/jsonld.test.ts` | CAT-08 | Plan 03 |
| `tests/lib/metadata.test.ts` | SEO-01, SEO-02 | Plan 03 |
| `tests/e2e/locale-switcher.spec.ts` | CAT-01 | Plan 03 |
| `tests/e2e/category-nav.spec.ts` | CAT-02 | Plan 03 |
| `tests/db/catalog.test.ts` | CAT-03, CAT-04 | Plan 04 |
| `tests/e2e/catalog-filters.spec.ts` | CAT-05 | Plan 04 |
| `tests/e2e/product-detail.spec.ts` (CAT-06/07) | CAT-06, CAT-07 | Plan 05 |
| `tests/db/search.test.ts` | SRCH-01, SRCH-02 | Plan 06 |
| `tests/api/autocomplete.test.ts` | SRCH-03 | Plan 06 |
| `tests/e2e/product-detail.spec.ts` (SRCH-04) | SRCH-04 | Plan 06 |
| `tests/actions/products.test.ts` SRCH-05 append | SRCH-05 | Plan 02 Task 2.3 |
| `tests/e2e/manufacturers.spec.ts` | MFG-01, MFG-02 | Plan 07 |
| `tests/api/sitemap.test.ts` | SEO-03 | Plan 08 |

## Decisions Made

- **Suspense-wrap admin chrome under cacheComponents** — Phase-2 used `dynamic = 'force-dynamic'` on admin pages. Next 16 cacheComponents is mutually exclusive with that segment config. Per the official Next.js migration guide, force-dynamic is no longer needed under cacheComponents (all pages are dynamic by default). Runtime APIs (cookies, headers, searchParams) must instead live inside `<Suspense>` boundaries so the static shell can prerender. Refactored the admin layout to extract `requireAdmin()` + `getTranslations()` into an `<AdminChrome>` child server component wrapped in Suspense. The D-15 admin auth gate is preserved; the only behavioral change is that admin pages now use Partial Prerender (◐) instead of pure SSR.
- **Removed `export const runtime = 'nodejs'` from route handlers** — cacheComponents flags this as incompatible. Node is the Next 16 default for route handlers (only Edge requires opting in). Identical runtime behavior.
- **Fixture lives at `tests/fixtures/` (not `tests/_fixtures/`)** — Plan frontmatter explicitly names the path; downstream plans 02–07 already @-reference it. Existing Phase-2 fixtures stay at `tests/_fixtures/` for back-compat; Phase-3 starts a parallel `tests/fixtures/` directory per the plan contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] cacheComponents incompatible with `runtime = 'nodejs'` route segment config**
- **Found during:** Task 1.1 verify (`pnpm build`)
- **Issue:** Build failed with "Route segment config 'runtime' is not compatible with `nextConfig.cacheComponents`. Please remove it." in two existing route handlers (`api/cloudinary/sign`, `api/smoke/sentry`) that pre-date the flag.
- **Fix:** Removed `export const runtime = 'nodejs'` from both handlers; Node is the Next 16 default. Added inline comments documenting the cacheComponents migration rationale.
- **Files modified:** `src/app/api/cloudinary/sign/route.ts`, `src/app/api/smoke/sentry/route.ts`.
- **Verification:** `pnpm build` passed after the change; runtime semantics unchanged (Node was already implicit).
- **Committed in:** `5ab6f0f` (Task 1.1 commit).

**2. [Rule 3 — Blocking] cacheComponents incompatible with `dynamic = 'force-dynamic'` segment config + admin pages prerender via Suspense**
- **Found during:** Task 1.1 verify (`pnpm build`).
- **Issue:** Initial attempt to add `dynamic = 'force-dynamic'` to the admin layout hit "Route segment config 'dynamic' is not compatible with cacheComponents." Removing it then surfaced "Uncached data accessed outside `<Suspense>`" because `requireAdmin()` reads cookies and `getTranslations()` reads headers. Same pattern hit `/[locale]/invite/accept` (`acceptInvite()` DB call) and `/[locale]/login` (`searchParams` access).
- **Fix:** Per Next.js migration docs (https://nextjs.org/docs/messages/blocking-route + cacheComponents migration guide), refactored each affected page to extract its runtime-data work into a child server component, then wrap the child in `<Suspense>`. Layout/page shells are now statically prerenderable while the dynamic chrome streams in. Added explanatory comments referencing Pitfall A6.
- **Files modified:** `src/app/[locale]/admin/layout.tsx`, `src/app/[locale]/invite/accept/page.tsx`, `src/app/[locale]/login/page.tsx`.
- **Verification:** `pnpm build` exits 0; admin/login/invite routes report `◐ (Partial Prerender)` in the build output. The Phase-2 D-15 admin gate (proxy.ts edge gate is primary; `requireAdmin()` defense-in-depth) is preserved — the auth check still runs on every request, just inside a Suspense boundary.
- **Committed in:** `5ab6f0f` (Task 1.1 commit).

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking — the only path to a green `pnpm build` with cacheComponents enabled).
**Impact on plan:** Both auto-fixes were essential to satisfy the plan's verify step (`pnpm build` exits 0 with cacheComponents enabled). No scope expansion — the changes are minimal mechanical refactors required by the Next 16 caching API surface; no new features or behavior changes.

## Issues Encountered

- **Initial Edit-tool path collision** — first attempt to add `cacheComponents: true` accidentally edited the parent repo's `next.config.ts` (the same path was read earlier from the parent during context gathering). Reverted the parent and re-applied to the worktree path. No production data lost; verified with `git status` and `grep cacheComponents next.config.ts`.
- **Worktree had no `.env.local`** — `pnpm build` required env vars (DATABASE_URL etc.). Copied `.env.local` from the parent repo to the worktree (gitignored, never committed). Build then succeeded.

## User Setup Required

None — no external service configuration required. The schema-dts install is automatic; cacheComponents is a config-file change. Downstream plans will require Neon test-branch DATABASE_URL to actually run the un-skipped versions of these stubs (already documented in `.env.test.example`).

## Next Phase Readiness

- **Plan 02 (Wave 1) is unblocked.** It can:
  - Land the additive migration for product media arrays + manufacturer.is_official_rep + manufacturer_translations.relationship_note.
  - Extend `tests/fixtures/seed-public.ts` to populate those columns.
  - Flip the SRCH-05 `describe.skip` block in `tests/actions/products.test.ts` to active assertions for the saveProduct tsvector rebuild.
- **Plans 03–07 (Waves 2–4) are unblocked.** Each plan flips its targeted stubs from `describe.skip` / `test.skip` to real assertions and consumes `seedPublicFixture()` for setup.
- **No blockers carried into the next wave.**

## Self-Check: PASSED

Verified after summary write:

- `tests/fixtures/seed-public.ts` — FOUND
- `tests/lib/jsonld.test.ts` — FOUND
- `tests/lib/metadata.test.ts` — FOUND
- `tests/db/catalog.test.ts` — FOUND
- `tests/db/search.test.ts` — FOUND
- `tests/api/autocomplete.test.ts` — FOUND
- `tests/api/sitemap.test.ts` — FOUND
- `tests/e2e/locale-switcher.spec.ts` — FOUND
- `tests/e2e/category-nav.spec.ts` — FOUND
- `tests/e2e/catalog-filters.spec.ts` — FOUND
- `tests/e2e/product-detail.spec.ts` — FOUND
- `tests/e2e/manufacturers.spec.ts` — FOUND
- `next.config.ts` contains `cacheComponents: true` — VERIFIED
- `package.json` declares `schema-dts` — VERIFIED
- Commit `5ab6f0f` (Task 1.1) — FOUND in `git log`
- Commit `6f5c8b4` (Task 1.2) — FOUND in `git log`
- Commit `f4636db` (Task 1.3) — FOUND in `git log`
- `pnpm vitest run` on 6 new stub files: 23 skipped, 0 failed — VERIFIED
- `pnpm vitest run tests/actions/products.test.ts`: 11 passed + 2 skipped (SRCH-05) — VERIFIED
- `pnpm playwright test --list` over 5 e2e files: 15 specs listed — VERIFIED
- `pnpm tsc --noEmit`: exits 0 — VERIFIED
- `pnpm build`: exits 0 with cacheComponents enabled — VERIFIED

---
*Phase: 03-public-rendering-search-seo*
*Completed: 2026-04-30*
