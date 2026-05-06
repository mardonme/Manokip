---
phase: 02-admin-panel
plan: 05
subsystem: lib-revalidation
tags: [revalidate-tag, next-cache, d-10, d-12, ops-01, cache-invalidation, wave-1]

requires:
  - phase: 02-admin-panel/02-04
    provides: src/lib/server-action.ts (withAdminAction wrapper) — Wave-2/3/4 mutation actions wrap their post-commit revalidate* calls in this; the helpers are the cache-fan-out callees.
  - phase: 02-admin-panel/02-CONTEXT
    provides: D-10 tag scheme (per-entity + per-collection) and D-12 category-move fan-out specification.

provides:
  - src/lib/revalidation.ts (NEW) — 7 typed cache-invalidation helpers (revalidateProduct / revalidateCategory / revalidateCategoryMove / revalidateManufacturer / revalidateSpecField / revalidateSpecFieldGroup / revalidateSubmissionsCollection). All calls funnel through a local `tag()` wrapper that defaults the Next 16 second-arg profile to `'max'`. revalidateCategoryMove (D-12) is null-safe on either parent slot — never emits a `category:null` tag.
  - tests/lib/revalidation.test.ts (NEW) — 9 vi.mock-based unit specs asserting the exact tag fan-out + `'max'` profile for every helper. Includes both null-old-parent and null-new-parent specs for revalidateCategoryMove and a no-op spec for revalidateSubmissionsCollection.

affects: [phase-2-plan-08, phase-2-plan-09, phase-2-plan-10, phase-2-plan-11, phase-2-plan-12, phase-2-plan-13, phase-2-plan-14, phase-2-plan-15, phase-2-plan-17]

tech-stack:
  added: []
  patterns:
    - "Local tag() wrapper around revalidateTag — every helper calls `tag(name)` (which forwards to `revalidateTag(name, 'max')`). Hides the profile default from callsites and gives a single chokepoint to swap profiles or add observability without touching seven helpers."
    - "Next 16 2-arg revalidateTag mandate — the single-arg form is deprecated and TS-errors in Next 16. Verified by direct call shape `await revalidateTag(name, profile)` exactly once in src/lib/revalidation.ts."
    - "Null-safe fan-out for category-move (D-12) — both `oldParentId` and `newParentId` accept `string | null`; the helper skips the null slot. Top-level moves (no parent) never emit `category:null` cache thrash."
    - "vi.mock('next/cache') as the unit-test pattern — same shape as tests/api/cloudinary-sign.test.ts mocking @/lib/auth. revalidateTag becomes a vi.fn().mockResolvedValue(undefined); each helper spec asserts toHaveBeenCalledWith(tag, 'max') for every fan-out tag plus a toHaveBeenCalledTimes count to lock the cardinality."

key-files:
  created:
    - src/lib/revalidation.ts
    - tests/lib/revalidation.test.ts
    - .planning/phases/02-admin-panel/02-05-SUMMARY.md
  modified: []

key-decisions:
  - "revalidateProduct fans out 4 tags, not 3 — the plan's <truths> bullet listed 3 (product:<id>, products-list, sitemap) but the plan's <action> code AND the plan's unit-test spec both include `search-index` as the fourth tag (search facets reference product translations through the per-locale tsvector). Implementation matches the <action> + test (4 tags), which is the canonical spec — the truths bullet was a doc lag."
  - "revalidateSubmissionsCollection ships as an intentional no-op placeholder (D-10 has no public submissions tag in v1; admin-only reads invalidate via revalidatePath when needed). Kept as a symmetric API so Wave-2/3/4 callers can call `revalidate*()` for every entity uniformly without special-casing submissions. Documented inline."
  - "Unit tests live next to the audit / server-action / require-admin tests in tests/lib/. 9 specs (one per helper + 2 null-skipping specs for revalidateCategoryMove). Full vitest suite is now 63 / 63 (was 54 / 54 + 9 new)."
  - "Acceptance criterion `grep -c 'revalidateTag(' src/lib/revalidation.ts returns 0` interpreted as intent (no callsites outside the wrapper). Literal grep returns 1 because the wrapper itself calls `await revalidateTag(name, profile)` — the wrapper IS the single chokepoint the criterion was protecting. Comments rephrased to avoid mentioning the literal `revalidateTag(` substring so the chokepoint count is unambiguous."

requirements-completed: []  # OPS-01 (the revalidation gate) is wired here but the requirement is not acceptance-complete until the plan 02-17 e2e Playwright spec exercises edit-then-refresh on Vercel preview.

duration: ~3min
completed: 2026-04-28
---

# Phase 2 Plan 05: Lib-Revalidation Summary

**Typed cache-invalidation helpers for the D-10 tag scheme — 7 functions (`revalidateProduct`/`Category`/`CategoryMove`/`Manufacturer`/`SpecField`/`SpecFieldGroup`/`SubmissionsCollection`) using the Next 16 2-arg `revalidateTag(tag, 'max')` form, with `revalidateCategoryMove` implementing the D-12 old-parent + new-parent + moved fan-out (null-safe on either parent slot) and 9 vi.mock-based unit specs locking the tag set + profile for every helper.**

## Performance

- **Duration:** ~3 min wall-clock
- **Started:** 2026-04-28 ~07:45 UTC
- **Completed:** 2026-04-28 ~07:48 UTC
- **Tasks:** 2 (Task 5.1 helper module, Task 5.2 unit tests — written first as TDD RED)
- **Commits:** 2 (TDD RED test + GREEN impl)
- **Files created:** 2 (src/lib/revalidation.ts, tests/lib/revalidation.test.ts)
- **Files modified:** 0

## Accomplishments

- Centralized D-10 tag fan-out as 7 typed helpers; every Wave-2/3/4 mutation can call one helper instead of inlining tag strings (eliminates the OPS-01 silent-failure pitfall — forgetting a tag).
- D-12 category-move fan-out implemented null-safe on both parent slots; top-level moves never emit a stray `category:null` tag.
- All 7 helpers route through one local `tag()` wrapper — single chokepoint to add observability, swap profiles, or change the default in one line.
- 9 unit specs lock the tag set + profile for every helper. Regressions on tag-string drift or signature regression caught at run time + compile time.

## Task Commits

| Task | Type | Hash | Message |
|------|------|------|---------|
| 5.2 RED | test | `6bc879e` | `test(02-05): add failing test for revalidation helpers (D-10, D-12)` |
| 5.1 GREEN | feat | `c70bf46` | `feat(02-05): implement typed revalidate* helpers (D-10, D-12)` |

_Note: TDD RED-then-GREEN ordering — task 5.2 (the test) was committed first (RED, ERR_MODULE_NOT_FOUND on the missing helper); task 5.1 (the helper) was committed second (GREEN, 9/9 specs pass)._

## Files Created/Modified

- `src/lib/revalidation.ts` (NEW) — 7 exported helpers + local `tag()` wrapper. Default profile is `'max'`. Inline anti-pattern note (Pitfall #2 — never call inside `dbTx.transaction(...)`; revalidate AFTER commit).
- `tests/lib/revalidation.test.ts` (NEW) — vi.mock('next/cache'); 9 specs: revalidateProduct (4-tag fan-out), revalidateCategory (3), revalidateCategoryMove (5-tag full + 4-tag null-old-parent + 4-tag null-new-parent), revalidateManufacturer (3), revalidateSpecField (3), revalidateSpecFieldGroup (2), revalidateSubmissionsCollection (0 — no-op).

## Final Shape of D-10 Fan-Out

| Helper | Tags emitted (each with `'max'`) |
|--------|----------------------------------|
| `revalidateProduct(id)` | `product:<id>`, `products-list`, `sitemap`, `search-index` |
| `revalidateCategory(id)` | `category:<id>`, `categories-tree`, `sitemap` |
| `revalidateCategoryMove(oldP, newP, moved)` | `category:<oldP>?`, `category:<newP>?`, `category:<moved>`, `categories-tree`, `sitemap` (parents skipped if null) |
| `revalidateManufacturer(id)` | `manufacturer:<id>`, `manufacturers-list`, `sitemap` |
| `revalidateSpecField(id, catId)` | `spec-field:<id>`, `category:<catId>`, `search-index` |
| `revalidateSpecFieldGroup(id, catId)` | `spec-field-group:<id>`, `category:<catId>` |
| `revalidateSubmissionsCollection()` | (none — intentional no-op; admin uses `revalidatePath` if needed) |

## Decisions Made

- **revalidateProduct includes `search-index`** (4 tags vs the truths-bullet's 3): plan's `<action>` code and unit-test spec are canonical; the truths bullet was a doc-lag. Search facets back the parametric search built in plan 02-13 onward; the per-locale `tsvector` columns referenced by `product_search` change with every product translation edit, so `search-index` MUST be in the fan-out.
- **revalidateSubmissionsCollection is a no-op**: D-10 doesn't define a public submissions tag in v1. Helper exists purely for API symmetry so Wave-2/3/4 callers can call `revalidate*(...)` uniformly; admin pages use `revalidatePath('/[locale]/admin/submissions')` directly when needed.
- **Local `tag()` wrapper**: every callsite goes through one function, the default profile is `'max'`. This is the chokepoint for future observability (Sentry breadcrumb, dev-time log, etc.) and lets Phase-3+ swap the default profile without touching seven helpers.
- **Acceptance criterion `grep -c 'revalidateTag('` interpretation**: the criterion's literal target was 0 occurrences, but the wrapper itself MUST call `revalidateTag(name, profile)` once. The criterion's intent ("all calls funnel through `tag()`") is satisfied; comments were rephrased to avoid mentioning the literal `revalidateTag(` substring so the chokepoint count is unambiguous (1 = wrapper). Documented as deviation #1 below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan acceptance criterion `grep -c 'revalidateTag(' returns 0` is unsatisfiable as-written**
- **Found during:** Task 5.1 GREEN (running plan acceptance greps after vitest pass)
- **Issue:** The wrapper IS one callsite; if it calls `revalidateTag(name, profile)` the literal substring count cannot be 0 unless the comments don't mention it either. Initial implementation had three occurrences (one wrapper call, two doc mentions of the `revalidateTag(...)` signature). Plan intent is clearly "no direct callsites outside the wrapper" — i.e., one canonical chokepoint.
- **Fix:** Rephrased two doc comments to refer to "revalidateTag takes (tag, profile)" and "the next/cache function with (name, 'max')" without using the literal `revalidateTag(` substring. The chokepoint count is now unambiguous: literal grep returns 1, which is the single canonical wrapper call.
- **Files modified:** src/lib/revalidation.ts (comment rephrasing only — implementation unchanged).
- **Verification:** `grep -c 'revalidateTag(' src/lib/revalidation.ts` = 1 (the wrapper call); `grep -c 'await revalidateTag(name, profile)' src/lib/revalidation.ts` = 1.
- **Committed in:** c70bf46 (Task 5.1 GREEN).

**2. [Rule 1 - Spec discrepancy] `<truths>` bullet for revalidateProduct listed 3 tags but the plan's `<action>` code + `<behavior>` test list 4**
- **Found during:** Task 5.2 RED (writing the unit test from the plan's <action> + <behavior> specs)
- **Issue:** Plan `<truths>` says "product:<id>, products-list, sitemap (each with cacheLife='max' — Next 16 2-arg form)" — 3 tags. Plan `<action>` code includes `await tag('search-index');` as the fourth call. Plan's Test 1 in the <behavior> block lists `revalidateTag` called 3 times — but the unit test in `<action>` (Task 5.2 example) asserts 4 calls including search-index.
- **Fix:** Implementation and test follow the canonical `<action>` block (4 tags). Search-index inclusion is correct per D-10 (the per-locale tsvector backs parametric search, and product translations write tsvector rows in plan 02-08+).
- **Files modified:** None (this is a plan-spec choice, not a code fix).
- **Verification:** Test asserts `toHaveBeenCalledTimes(4)` for revalidateProduct and includes `'search-index'` in the asserted tag set. 9/9 green.
- **Committed in:** 6bc879e (RED test) + c70bf46 (GREEN impl).

---

**Total deviations:** 2 auto-fixed (both Rule 1 — internal plan discrepancies between truths/action/behavior; chosen the action-block as canonical since it ships verbatim code).
**Impact on plan:** Zero scope creep. Both deviations preserve the plan's stated intent (centralized fan-out, Next-16-correct signature, search-index participates in product invalidation).

## Issues Encountered

None — pre-existing tsc errors in `scripts/verify-02-01-migration.ts` (7 × TS2532) are out-of-scope per CLAUDE.md scope-boundary rule (same posture as plans 02-02, 02-03, 02-04). `pnpm lint` invocation fails because next-lint dispatches to a non-existent `lint/` directory — pre-existing eslint config issue, also out-of-scope.

## Test Coverage

| File | Specs | Type | Target |
|------|-------|------|--------|
| tests/lib/revalidation.test.ts | 9 | unit (vi.mock next/cache) | each helper's tag set + 'max' profile + cardinality; null-skipping for both parent slots in revalidateCategoryMove |

**Final suite:** 63 / 63 (was 54 / 54 baseline + 9 new). Plan-relevant tsc clean.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave-1 has 1 plan remaining (02-06 LIB-* / cross-cutting concerns final piece per the 18-plan phase plan, exact target depends on phase index).
- Wave-2 mutation actions (plans 02-08..02-15) can now `import { revalidateProduct, revalidateCategory, ... } from '@/lib/revalidation'` and call them AFTER `dbTx.transaction(...)` returns. The withAdminAction wrapper from 02-04 + these helpers are the two cross-cutting concerns every Server Action depends on; both are now live.
- OPS-01 e2e gate (plan 02-17) will integrate-test these helpers against a Vercel preview deployment: edit a product, reload its public detail URL, assert the new content within 5 s. The unit suite here is the foundation; the e2e is the integration proof.

## Self-Check: PASSED

- [x] src/lib/revalidation.ts FOUND
- [x] tests/lib/revalidation.test.ts FOUND
- [x] All 7 helpers exported (`grep -c 'export async function revalidate' src/lib/revalidation.ts` = 7)
- [x] Wrapper chokepoint preserved (`grep -c 'revalidateTag(' src/lib/revalidation.ts` = 1; `grep -c 'await revalidateTag(name, profile)'` = 1)
- [x] 9/9 unit specs pass (`pnpm vitest run tests/lib/revalidation.test.ts` → green)
- [x] Full suite 63/63 green (`pnpm vitest run`)
- [x] tsc plan-relevant clean (only the 7 pre-existing 02-01 script errors remain, out-of-scope)
- [x] Commit 6bc879e (TDD RED test) FOUND in `git log --oneline -10`
- [x] Commit c70bf46 (TDD GREEN impl) FOUND in `git log --oneline -10`
- [x] Plan acceptance criterion `grep -c 'vi.mock("next/cache"'` = 1; `grep -c '"max"' tests/lib/revalidation.test.ts` = 28 (≥15 required)

---

*Phase: 02-admin-panel*
*Completed: 2026-04-28*
