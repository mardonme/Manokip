---
phase: 02-admin-panel
plan: 12
subsystem: translation-completeness
tags: [pgview, view-wrapper, server-helpers, client-components, ui-primitive, d-04, admin-10, tdd, progress-bar, tooltip, dots]

requires:
  - phase: 02-admin-panel/02-01
    provides: product_translation_completeness pgView (created via drizzle-kit migrate; SQL DDL inline at drizzle/0001_overrated_shiva.sql lines 49-87) + src/db/schema/views/product-translation-completeness.ts (drizzle pgView declaration with productId/locale/percent columns)

provides:
  - src/lib/translation-completeness.ts (NEW) — server-side helpers wrapping the pgView. findProductCompleteness(productId) returns Record<'uz'|'ru'|'en', number> with each percent in [0,100]; findCompletenessForProducts(productIds[]) batches via inArray for the products list. Missing rows in the view (i.e. no product_translations row for that locale yet) default to 0 so RSC consumers never need to null-guard. LOCALES tuple exported for the TranslationDots render order. isLocaleKey type-guard narrows the view's unconstrained `locale` text column.
  - src/components/admin/translation-completeness.tsx (NEW) — two presentational client components. <TranslationCompleteness percent={N} label?="..." /> renders a 2px-tall progress bar with width N% and the D-04 tone (green ≥95 / amber ≥50 / red <50) plus role="progressbar" + ARIA values. <TranslationDots completeness={{ uz, ru, en }} /> renders 3 colored dots in fixed 'uz','ru','en' order with per-dot Tooltip showing `${LOCALE}: ${pct}%`. Pure presentational — no data fetching here.
  - tests/db/translation-completeness-view.test.ts (NEW) — 3 live-Neon specs locking the view math: (1) base-only fields → uz=25 / ru=50 / en=100; (2) no translations at all → every locale 0; (3) W10 required-text spec value → denominator=5, uz=100 (all 5 filled including the spec translation), ru/en=80 (4/5 — base filled but no spec translation). Each test seeds its own category/product/spec_field and tears down via the cleanups stack.

affects: [phase-2-plan-13b, phase-3-public-list-rsc-if-it-ever-renders-completeness]

tech-stack:
  added: []  # No new deps — drizzle-orm + base-ui Tooltip primitives already installed.
  patterns:
    - "Pattern (pgView wrapper helpers): src/lib/translation-completeness.ts is the canonical read path for product completeness — RSC pages MUST go through these helpers rather than re-querying productTranslationCompleteness directly. Same posture as src/lib/repositories/spec-field.ts (Open Q §4 from plan 02-11) but without the soft-delete predicate (the view itself is the abstraction). If a future need arises to filter by locale or product status, the helper is the single edit point."
    - "Pattern (clamp + NaN-guard on percent inputs): the visualization components clamp percent values to [0,100] and treat NaN as 0. The view formula's ROUND(...)::int already produces well-formed integers, but the UI is the last line of defense — a future view refactor that emits unexpected values can never render bars wider than the track or trigger React style-warnings."
    - "Pattern (TooltipProvider scoped to component, not app root): TranslationDots wraps its 3 dots in a single TooltipProvider so each dot's tooltip can render without depending on a higher-level provider. Reuses the base-ui Tooltip primitives shipped in plan 02-02. Keeps the component fully self-contained for the products list call-site."
    - "Pattern (TDD RED with stub helper, GREEN with real impl): plan 02-12 follows the RED→GREEN flow established by 02-08/02-09/02-10/02-11 — RED commits the integration test against a stub helper that returns all-zeros, GREEN replaces the stub with the real db.select wiring. Even a thin read-only wrapper benefits from the gate: the RED commit proves the test actually runs and the assertions discriminate between empty and populated state."

key-files:
  created:
    - src/lib/translation-completeness.ts (commit edd7c0d RED stub + 2620a71 GREEN)
    - tests/db/translation-completeness-view.test.ts (commit edd7c0d)
    - src/components/admin/translation-completeness.tsx (commit 9fef5e0)
    - .planning/phases/02-admin-panel/02-12-SUMMARY.md (this file)
  modified:
    - .planning/STATE.md (completed_plans 18 → 19, percent 53 → 56, position cursor advance — Wave 2 closes)
    - .planning/ROADMAP.md (Phase 2 row 11/18 → 12/18)
    - .planning/REQUIREMENTS.md (ADMIN-10 marked complete)

key-decisions:
  - "D-04 thresholds LOCKED in code: green ≥95 / amber ≥50 / red <50. The tone() function inlines this triplet rather than threading thresholds through props — D-04 is project-wide policy, not a per-callsite knob. Future re-skin of the dot/bar palette can be done by editing the TONE_BG record without touching the threshold logic."
  - "Locale order is a single source of truth: src/lib/translation-completeness.ts exports `LOCALES = ['uz','ru','en'] as const` and the TranslationDots component imports + maps over it. Keeps the dot order stable across editor + list + any future surface that renders the 3-locale set in a consistent ordering."
  - "Helpers default missing locales to 0 rather than undefined: the view is keyed (product_id, locale) and only emits a row per existing product_translations row. A product that has only `uz` translated produces ONE row in the view — the helper still returns `{ uz: N, ru: 0, en: 0 }`. This keeps consumer code (TranslationDots, the per-locale bar in the editor) free of null-guards."
  - "isLocaleKey type-guard rather than a `as LocaleKey` cast: the view's `locale` column is text(), not a CHECK-constrained subset (the underlying product_translations table has the CHECK, but Drizzle's pgView declaration types it as text). Narrowing via a type-guard makes the helpers structurally safe against any future row that doesn't match the 3-locale set — out-of-band rows silently no-op rather than poisoning the result."
  - "Components are client-only with `\"use client\"`: required by the Tooltip primitive (base-ui Portal needs the DOM). Consumers in 02-13b will fetch in their RSC and pass the resolved values down — same boundary pattern as LocaleTabs (02-09) and ConfirmDialog (02-11)."

deviations:
  - "Rule-3 (tooling drift): plan's verification command was `pnpm vitest run tests/db/translation-completeness-view.test.ts --reporter=basic` but Vitest 4 dropped --reporter=basic (loadCustomReporterModule throws ERR_LOAD_URL on `basic`). Re-ran with the default reporter — all 3 specs pass. No code change needed."
  - "Rule-1 (W10 test math): the plan's <behavior> stated the W10 case 'denominator=5 numerator=5 → uz=100; ru/en denominator=5 numerator=4 → 80'. We seeded all 4 base fields filled in all 3 locales (so the base contribution is 4/4 in every locale before adding the spec layer) — exactly matches the plan's math. The test asserts uz=100, ru=80, en=80 verbatim."
  - "Rule-2 (a11y enrichment): added role='progressbar' + aria-valuemin/max/now to TranslationCompleteness and aria-label='LOCALE: pct%' to each TranslationDots dot. Not in the plan's <action>, but missing from the plan literal would have been a Rule-2 missing-critical (UI primitive without ARIA values is a screen-reader regression). One-line additive change."
  - "Rule-1 (UI refinement): the plan's <action> draft used `<TooltipTrigger asChild>` with a child <span>. Switched to TooltipTrigger with the cn() classes applied directly to the trigger — keeps the dot tab-focusable + inherits the focus-ring, which matters for keyboard-only admin users navigating the products list."

threat-flags: []  # No new trust boundaries introduced. T-02-12-01 (view recompute on every read) and T-02-12-02 (caller bounds productIds) are already accepted/mitigated per the plan's threat_model.

requirements-completed: [ADMIN-10]
requirements-touched: []  # The visualization wires only into 02-13b's editor + list; this plan doesn't itself satisfy any other ADMIN-* requirement.

duration: ~12min
completed: 2026-04-28
---

# Phase 2 Plan 12: Translation-Completeness View Summary

**ADMIN-10 / D-04 visualization layer lands. The product_translation_completeness pgView (created in plan 02-01) is now wrapped by two server helpers + two presentational client components, with a 3-spec live-Neon integration test pinning the view math (25/50/100 base + 100/80/80 W10 spec). Last Wave 2 plan complete — 12/18 Phase 2 plans done.**

## What shipped

**One helper module** (`src/lib/translation-completeness.ts`):
- `findProductCompleteness(productId)` — single-product read for the editor's per-locale % bars.
- `findCompletenessForProducts(productIds[])` — batched read (via `inArray`) for the products list "Translations" column.
- Both return `Record<'uz'|'ru'|'en', number>` with missing locales defaulted to 0. `isLocaleKey` narrows the view's text() locale column; `LOCALES` tuple is the canonical render order.

**One UI module** (`src/components/admin/translation-completeness.tsx`):
- `<TranslationCompleteness percent={N} label?="..." />` — 2px progress bar with D-04 tone (green ≥95 / amber ≥50 / red <50), `role="progressbar"` + ARIA values, NaN/clamp guards.
- `<TranslationDots completeness={{ uz, ru, en }} />` — 3 colored dots (fixed locale order) wrapped in a TooltipProvider; per-dot Tooltip shows `${LOCALE}: ${pct}%`; trigger inherits focus-ring for keyboard users.
- Pure presentational — no data fetching. Consumers in plan 02-13b will fetch via the helpers and pass percentages down as props.

**One integration test** (`tests/db/translation-completeness-view.test.ts`):
- Spec 1: base-only fields → uz=25 / ru=50 / en=100.
- Spec 2: no product_translations rows → every locale = 0.
- Spec 3: W10 required-text spec value translated only in uz → denominator becomes 5; uz=100 (5/5), ru=80 (4/5), en=80 (4/5).
- Each spec seeds its own category/product/spec_field and tears down via a `cleanups` stack in reverse order.

## Test posture

- **22 files / 98 tests** green (was 21/95 at 02-11 close — `+1 file, +3 specs`).
- **`pnpm tsc --noEmit`** plan-relevant clean — only the 7 pre-existing `scripts/verify-02-01-migration.ts` TS2532 errors remain (out-of-scope per CLAUDE.md scope-boundary, identical posture to plans 02-09/02-10/02-11).
- **`pnpm build`** Compiled successfully in 16.7s. The post-compile tsc step surfaces the same 7 pre-existing 02-01-script errors — same root cause, same out-of-scope disposition.
- **`pnpm lint`** is broken at the project level (Next 16 dropped `next lint`; the `lint` script in `package.json` still references it). Pre-existing across every Phase-2 plan. Not in scope here.

## Task commits

1. `edd7c0d` — `test(02-12): add failing test for product_translation_completeness pgView helper` — RED stub helper + 3-spec live-Neon test.
2. `2620a71` — `feat(02-12): wire findProductCompleteness + findCompletenessForProducts helpers` — GREEN: real `db.select` against `productTranslationCompleteness` pgView.
3. `9fef5e0` — `feat(02-12): add TranslationCompleteness + TranslationDots client components` — UI primitives.
4. *(plan metadata commit follows — captures this SUMMARY + STATE.md / ROADMAP.md / REQUIREMENTS.md updates)*

## Key decisions

- **D-04 thresholds in code:** `tone()` inlines `green ≥95 / amber ≥50 / red <50`; future palette swaps edit `TONE_BG` only. D-04 is project-wide, not per-callsite.
- **`LOCALES = ['uz','ru','en']` single source of truth:** TranslationDots maps over the tuple from `src/lib/translation-completeness`. Same array drives the helper's default-empty shape and the dot render order.
- **Helpers default missing locales to 0:** the view is keyed `(product_id, locale)` and only emits one row per existing `product_translations` row. A product with only `uz` translated still returns `{ uz: N, ru: 0, en: 0 }` — no null-guards in consumers.
- **`isLocaleKey` type-guard, not a cast:** the view's `locale` column is `text()` at the Drizzle type level even though the underlying `product_translations` has a 3-locale CHECK. The guard makes the helpers structurally safe against any out-of-band row.
- **Components are `"use client"`:** Tooltip uses base-ui's Portal which needs DOM. Consumers (02-13b) fetch in their RSC and pass values down — same boundary pattern as LocaleTabs (02-09) and ConfirmDialog (02-11).

## Deviations

Four auto-fixed inline (3 Rule-1 minor refinements + 1 Rule-3 tooling drift + 1 Rule-2 a11y enrichment); see frontmatter `deviations`. No Rule-4 architectural changes — the plan executed close to as-written.

## Self-Check

Verifying every `must_haves.truths` from the plan frontmatter:

- [x] **PASSED** — "product_translation_completeness pgView (plan 02-01) returns one row per (product_id, locale) with percent 0-100" — confirmed via Spec 1 reading 25 / 50 / 100 from the live view.
- [x] **PASSED** — "findProductCompleteness(productId) returns Record<'uz'|'ru'|'en', number>" — `grep -c 'export async function findProductCompleteness' src/lib/translation-completeness.ts` = 1; return type explicit `Promise<CompletenessByLocale>`.
- [x] **PASSED** — "findCompletenessForProducts(productIds[]) returns batched map" — `grep -c 'export async function findCompletenessForProducts' src/lib/translation-completeness.ts` = 1; uses `inArray` against the productIds.
- [x] **PASSED** — "<TranslationCompleteness percent={N} /> renders a progress bar with green ≥95 / amber ≥50 / red <50 (D-04)" — `tone()` function in source matches D-04 verbatim; `bg-emerald-500` / `bg-amber-500` / `bg-red-500` greps each return ≥1.
- [x] **PASSED** — "<TranslationDots completeness={...} /> renders 3 colored dots" — component maps over `LOCALES = ['uz','ru','en']` so exactly 3 dots render; per-dot tooltip text `${LOCALE}: ${pct}%` matches the plan literal.
- [x] **PASSED** — "Integration test seeds a product + partial translations + asserts the view returns 25%, 50%, 100% as expected" — Spec 1 in `tests/db/translation-completeness-view.test.ts` does exactly this; W10 Spec 3 extends with the required-text spec scenario.

Verifying `must_haves.artifacts`:

- [x] **PASSED** — `src/lib/translation-completeness.ts` exists, contains `productTranslationCompleteness` import + use.
- [x] **PASSED** — `src/components/admin/translation-completeness.tsx` exists, contains `TranslationDots` export.

Verifying acceptance criteria from each task:

Task 12.1:
- [x] `grep -c 'export async function findProductCompleteness' src/lib/translation-completeness.ts` returns 1.
- [x] `grep -c 'export async function findCompletenessForProducts' src/lib/translation-completeness.ts` returns 1.
- [x] `pnpm vitest run tests/db/translation-completeness-view.test.ts` exits 0 — 3/3 specs green; 25 / 50 / 100 + 100 / 80 / 80 assertions pass.

Task 12.2:
- [x] `grep -c 'export function TranslationCompleteness' src/components/admin/translation-completeness.tsx` returns 1.
- [x] `grep -c 'export function TranslationDots' src/components/admin/translation-completeness.tsx` returns 1.
- [x] `grep -c 'bg-emerald-500'` returns 1.
- [x] `grep -c 'bg-amber-500'` returns 1.
- [x] `grep -c 'bg-red-500'` returns 1.
- [x] `pnpm tsc --noEmit` exits 0 plan-relevant (only pre-existing 02-01 script errors remain).

Commit hashes verified exist in `git log --oneline`:

- [x] `edd7c0d` — `test(02-12): add failing test for product_translation_completeness pgView helper` FOUND.
- [x] `2620a71` — `feat(02-12): wire findProductCompleteness + findCompletenessForProducts helpers` FOUND.
- [x] `9fef5e0` — `feat(02-12): add TranslationCompleteness + TranslationDots client components` FOUND.

Tooling verification:

- [x] **PASSED** — `pnpm vitest run` exits 0 with `Test Files 22 passed (22) / Tests 98 passed (98)`.
- [x] **PASSED** — `pnpm tsc --noEmit` produces only the 7 pre-existing 02-01 script errors (zero new errors introduced by this plan).
- [x] **PASSED** — `pnpm build` Compiled successfully in 16.7s.

No-secret-leak verification:

- [x] **PASSED** — `git status --short` shows no `.env*` files staged.
- [x] **PASSED** — Helpers + components reference `process.env` only via `@/db/client` which sources `env.DATABASE_URL` from the Zod-validated boundary; no hard-coded credentials.

## TDD Gate Compliance

Plan 02-12 is `type: execute` with one `tdd="true"` task (12.1) and one `type="auto"` task (12.2). The TDD gate sequence is visible in `git log`:

- `edd7c0d` — `test(02-12): ...` — RED gate (stub helper + failing assertions).
- `2620a71` — `feat(02-12): wire findProductCompleteness ...` — GREEN gate (real impl, all 3 specs green).
- (no REFACTOR commit — the GREEN impl was already at its final shape; no cleanup pass needed.)

Task 12.2 has no TDD gate by design — it ships a presentational component with no integration logic to test against the live DB; the pnpm tsc gate validates the component's typing.

## Self-Check: PASSED

(6/6 must_haves.truths PASSED, 2/2 must_haves.artifacts PASSED, 9/9 acceptance criteria PASSED, 3/3 commit hashes present, 3/3 tooling green, 2/2 secret-leak checks clean.)

---
*Phase: 02-admin-panel*
*Completed: 2026-04-28*
