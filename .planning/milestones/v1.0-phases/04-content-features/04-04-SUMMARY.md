---
phase: 04-content-features
plan: 04
subsystem: test-stubs-fixtures
tags: [tdd-red, fixtures, vitest, playwright, content-features, wave-0]
requires:
  - "04-01 schema substrate (recipe.status + industry.status + product_recipes + product_industries) — seed-content fixture inserts into all four tables"
  - "04-02 Tiptap foundations (@tiptap/core 3.22.5 ships JSONContent type used by sample/malicious doc fixtures)"
  - "04-03 lib helpers (test imports reference future @/actions/recipes + @/actions/industries — those land in 04-05/04-06; this plan locks the contract surface in tests first)"
provides:
  - "tests/fixtures/tiptap-sample.ts:: SAMPLE_RECIPE_DOC + SAMPLE_INDUSTRY_DOC — well-formed JSONContent with H2 + 2 paragraphs + link mark + image node (publicId 'manometr/sample/inline-1') for happy-path renders + integration tests"
  - "tests/fixtures/seed-content.ts:: seedRecipe + seedIndustry + seedProductRecipes + seedProductIndustries + seedPhase4Content + teardownPhase4Content — orchestrator extends seed-public.ts with 2 published recipes + 2 published industries + 6 cross-link rows, taking products[] from the caller (T-04-04-01: never inserts new products)"
  - "tests/actions/recipes.test.ts:: 7 it.skip RED specs locking saveRecipe / publishRecipe / unpublishRecipe / deleteRecipe + replace-on-save + W7 refusal-to-elevate + Used-in revalidate fan-out — flips to live in 04-05"
  - "tests/actions/industries.test.ts:: 7 it.skip RED specs (mirror) — flips to live in 04-06"
  - "tests/components/recipe-form.test.tsx:: 2 it.skip RED specs (3-locale tab swap + Tiptap mount) — flips in 04-07"
  - "tests/components/industry-form.test.tsx:: 2 it.skip RED specs (mirror) — flips in 04-08"
  - "tests/components/linked-products-picker.test.tsx:: 2 it.skip RED specs (filter + multi-select) — flips in 04-07"
  - "tests/e2e/recipe-detail.spec.ts:: 2 test.fixme Playwright specs (SSR read + locale-fallback banner) — flips in 04-12"
  - "tests/e2e/industry-detail.spec.ts:: 2 test.fixme Playwright specs (mirror) — flips in 04-12"
  - "tests/e2e/used-in-section.spec.ts:: 2 test.fixme Playwright specs (visible w/ links + hidden w/o links) — flips in 04-12"
  - "tests/e2e/admin-recipe-form.spec.ts:: 1 test.fixme Playwright spec (admin author + save + publish + visit public) — flips in 04-12"
  - "tests/e2e/admin-industry-form.spec.ts:: 1 test.fixme Playwright spec (mirror) — flips in 04-12"
affects: []
tech-stack:
  added: []
  patterns:
    - "it.skip used as Vitest's equivalent of Playwright's test.fixme (Vitest 4 has no .fixme; per plan deviations Rule 1, .skip enumerates but doesn't run — same RED-stub posture)"
    - "Deferred (dynamic) import of not-yet-existing modules (@/actions/recipes, @/actions/industries, @/components/admin/recipe-form, etc.) — the test file compiles because the import lives inside the spec body (skipped), not at the top level"
    - "FLIP-IN: 04-NN-PLAN comment carried in EVERY spec body (and most describe blocks) — gives the closure plan 04-12 a grep-target to enforce no-orphan-fixmes invariant (T-04-04-02 mitigation)"
    - "Trilingual translation prefix (uz_/ru_/en_) in seed-content.ts mirrors Phase-3 seed-public.ts so downstream specs can grep on locale prefix to verify per-locale rendering"
    - "Deterministic hex-only UUIDs (0x0fb1, 0x0fb2 for recipes; 0x0fc1, 0x0fc2 for industries) extending the seed-public.ts hex range — Postgres uuid type rejects non-hex letters, this is the project-wide convention"
    - "seedPhase4Content takes a `products: string[]` parameter and never inserts new product rows — caller seeds the public catalog via seedPublicFixture() first; the orchestrator throws if products[] is empty (T-04-04-01 mitigation)"
    - "Defensive pre-cleanup in seedPhase4Content (DELETE before INSERT in reverse-FK order) so re-runs after partial failures don't blow up on PK conflicts — same posture as seedPublicFixture"
key-files:
  created:
    - tests/fixtures/tiptap-sample.ts
    - tests/fixtures/seed-content.ts
    - tests/actions/recipes.test.ts
    - tests/actions/industries.test.ts
    - tests/components/recipe-form.test.tsx
    - tests/components/industry-form.test.tsx
    - tests/components/linked-products-picker.test.tsx
    - tests/e2e/recipe-detail.spec.ts
    - tests/e2e/industry-detail.spec.ts
    - tests/e2e/used-in-section.spec.ts
    - tests/e2e/admin-recipe-form.spec.ts
    - tests/e2e/admin-industry-form.spec.ts
    - .planning/phases/04-content-features/04-04-SUMMARY.md
  modified: []
decisions:
  - "Used Vitest it.skip instead of Playwright-style test.fixme for vitest specs — Vitest 4 has no .fixme. Plan deviations Rule 1 explicitly authorizes this fallback. RED posture preserved: specs enumerate as skipped, don't run, flip to live by changing .skip → empty (just `it`)"
  - "tests/fixtures/tiptap-malicious.ts NOT recreated — already shipped in 04-02 per RESEARCH §1048-1067 verbatim. Verified existing content matches plan task 4.1 spec (script-tag + img-onerror + closing-tag-break). Plan task 4.1 statement 'Author tiptap-malicious + tiptap-sample' interpreted as: ship both AVAILABLE (idempotent — already shipped + new sample fixture authored)"
  - "Deferred SUT imports (inside spec bodies via dynamic await import) instead of top-level — the file must compile under tsc before 04-05/06/07/08 ship the production modules. This is RED-test discipline: the SKELETON compiles + locks the surface; the BODY (currently skipped) will fail at runtime once unblocked, which is the GREEN target"
  - "loginAsAdminViaDirectToken helper NOT extracted in this plan — Phase 2 plan 02-17 inlined the magic-link DB-direct token pattern in tests/e2e/admin-edit-revalidates.spec.ts rather than exporting it from a tests/fixtures helper. Per plan deviations Rule 3, when 04-12 flips admin-recipe-form.spec.ts + admin-industry-form.spec.ts to live, it will choose: (a) extract to tests/fixtures/admin-magic-link.ts (preferred — 2 admin specs), or (b) inline the pattern in each. Both stubs document this Rule-3 deferral"
  - "seedPhase4Content cross-links: recipeOne ↔ products[0..1], recipeTwo ↔ products[2..3], industryOne ↔ products[0], industryTwo ↔ products[1]. The pick(i) helper wraps modulo products.length so the orchestrator works with as few as 1 product passed in (defensive); with 6 seed-public products it produces deterministic non-overlapping cross-links"
metrics:
  duration_min: ~14
  completed_date: "2026-05-01"
  task_count: 4
  files_changed: 12 (all created — 2 fixtures + 2 action stubs + 3 component stubs + 5 e2e stubs)
  tests_added: "0 active passing tests (intentional — Wave 0 RED stubs); 14 vitest skipped (7 recipes + 7 industries — actions) + 6 vitest skipped (2 recipe-form + 2 industry-form + 2 linked-products-picker — components) + 8 Playwright fixme (2 recipe-detail + 2 industry-detail + 2 used-in-section + 1 admin-recipe-form + 1 admin-industry-form)"
  total_tests_passing: "186 active + 20 skipped (vitest); 57 Playwright e2e specs total (49 active + 8 fixme)"
---

# Phase 04 Plan 04: Test Stubs and Seed Fixtures Summary

Wave 0 RED-test plan: ships test stubs + seed fixtures BEFORE Wave 1+ implementation lands. Project-standard TDD posture (Phase 2 + Phase 3 every plan): the test exists first as RED, locks the production surface contract, then flips to GREEN when the matching production module ships.

## What Shipped

**Tiptap fixtures** (`tests/fixtures/tiptap-sample.ts`):

- `SAMPLE_RECIPE_DOC` + `SAMPLE_INDUSTRY_DOC` — well-formed `JSONContent` with H2 heading + 2 paragraphs + 1 link mark + 1 image node each. Image nodes carry `attrs.publicId: 'manometr/sample/inline-1'` matching the project's custom Tiptap image extension (Phase 04-02). Pure data; consumed by Wave 0/1+ specs for happy-path renders + form round-trips.
- `tests/fixtures/tiptap-malicious.ts` already shipped in 04-02 per RESEARCH §1048-1067 verbatim — verified existing content matches plan task 4.1 spec, no rewrite needed.

**Seed fixtures** (`tests/fixtures/seed-content.ts`):

- `seedRecipe` + `seedIndustry` — single-row inserts with full 3-locale translation set. Auto-generates `publishedAt` when status='published' if not explicitly provided. Returns the new row's id.
- `seedProductRecipes` + `seedProductIndustries` — junction-row inserts taking `productId` + `entityId[]` + optional `startPosition`. Auto-increments position per row.
- `seedPhase4Content` — orchestrator: 2 published recipes + 2 published industries + 6 cross-link junction rows. Takes `products: string[]` (caller seeds via `seedPublicFixture` first; orchestrator NEVER inserts products — T-04-04-01).
- `teardownPhase4Content` — reverse-FK cleanup mirroring seed-public's posture.
- Trilingual translations follow seed-public's `uz_/ru_/en_` prefix convention so downstream specs grep on locale prefix.

**Server Action RED stubs** (`tests/actions/recipes.test.ts` + `tests/actions/industries.test.ts`):

- 14 it.skip specs (7 per file) locking saveRecipe / saveIndustry create + replace-on-save semantics, publishRecipe / publishIndustry atomic dual-column write + audit, unpublish lifecycle, deleteRecipe / deleteIndustry audit-before-delete + FK cascade, and W7 refusal-to-elevate (USE_PUBLISH_ACTION error code on status='draft' → status='published' transition via saveRecipe).
- vi.mock chain mirrors `tests/actions/products.test.ts`: `@/lib/auth` requireAdmin stub, `next/headers`, `next/cache` revalidateTag spy.
- SUT imports deferred to inside spec bodies (dynamic `await import('@/actions/recipes')`) — the file compiles under tsc before 04-05/06 ship the production module.
- Each spec body opens with `// FLIP-IN: 04-05-PLAN` (or 04-06) for grep-target discoverability (T-04-04-02).

**Component RED stubs** (`tests/components/{recipe-form,industry-form,linked-products-picker}.test.tsx`):

- 6 it.skip specs (2 per file). recipe-form + industry-form: 3-locale tab swap (preserves un-saved state across tab switches) + Tiptap editor mount (rich-text body, not plain textarea, with insertImage wired to Cloudinary picker). linked-products-picker: client-side filter on search input + multi-select toggle.
- All in the `dom` Vitest project (jsdom env, no env loader).

**Playwright e2e RED stubs** (`tests/e2e/{recipe,industry}-detail.spec.ts`, `used-in-section.spec.ts`, `admin-{recipe,industry}-form.spec.ts`):

- 8 test.fixme Playwright specs across 5 files. recipe-detail + industry-detail: SSR HTML response carries title + emits `<script type="application/ld+json">` (TechArticle, no offers per Phase 3 D-08), plus locale-fallback banner when requested locale body is empty (D-05). used-in-section: visible with cross-links (cap-at-6 per D-09) + hidden with 0 cross-links. admin-recipe-form + admin-industry-form: full author + save + publish round-trip + visit public detail asserts body content (validates Wave 1+ → Wave 3 pipeline end-to-end).
- Auth pattern documented in stubs: re-uses Phase 2 02-17 magic-link DB-direct token consumption. Helper extraction (loginAsAdminViaDirectToken) deferred to 04-12 per plan Rule 3 — admin-edit-revalidates.spec.ts inlines the pattern, both stubs flag the choice.

## Verification Evidence

```
$ pnpm tsc --noEmit
(clean)

$ pnpm vitest run
Test Files  35 passed | 5 skipped (40)
Tests       186 passed | 20 skipped (206)
   (20 skipped = 14 actions + 6 components — exactly the new RED stubs)

$ pnpm playwright test --list
Total: 57 tests in 18 files
   (8 fixme'd specs in 5 new files added by this plan)

$ grep -rn "FLIP-IN" tests/ | wc -l
38
   (≥ 14 — every spec body + most describe blocks carry a FLIP-IN comment)
```

## Decisions Made

1. **`it.skip` for Vitest, `test.fixme` for Playwright.** Vitest 4 doesn't export `.fixme`. Plan deviations Rule 1 explicitly authorized this substitution. Both APIs share semantics: enumerate but don't run.

2. **Deferred SUT imports.** Test files put the not-yet-existing module imports INSIDE the spec body (`await import('@/actions/recipes')`), not at the top level. The file compiles under tsc at this moment; the SKIPPED body would fail at runtime if un-skipped (which is the RED contract — module not found is the failing assertion). When 04-05/06/07/08 ship the production modules, flipping `.skip` → empty `it(...)` resolves the import.

3. **`tiptap-malicious.ts` not rewritten.** Already shipped verbatim in 04-02 per RESEARCH §1048-1067. Plan task 4.1 satisfied by the file's existence; new fixture in this plan is `tiptap-sample.ts`.

4. **`seedPhase4Content` is product-id-injected, never product-creating.** T-04-04-01 mitigation: orchestrator throws if `products[]` empty; caller responsible for `seedPublicFixture()` first. Mirrors seed-public's posture and prevents the fixture from drifting away from the canonical Phase-3 6-product trilingual catalog.

5. **`loginAsAdminViaDirectToken` helper extraction deferred.** Both admin-recipe-form + admin-industry-form Playwright stubs document the choice 04-12 will make: extract to `tests/fixtures/admin-magic-link.ts` (DRY for 2 specs) or inline (mirroring `admin-edit-revalidates.spec.ts`). Plan Rule 3 explicitly anticipated this.

## Deviations from Plan

**1. [Rule 1 - Tooling] Vitest .fixme → it.skip substitution**

- **Found during:** Task 4.3 first tsc run after writing recipes.test.ts + industries.test.ts
- **Issue:** `Property 'fixme' does not exist on type 'TestAPI'.` — Vitest 4 exports `it.skip`, `it.todo`, `it.fails`, `it.concurrent`, `it.each` but no `.fixme`.
- **Fix:** Substituted `it.fixme(...)` → `it.skip(...)` across both action stubs + 3 component stubs (Playwright stubs unchanged — Playwright DOES export `test.fixme`). Plan deviations Rule 1 explicitly authorized this. Updated SUMMARY decision-1 accordingly.
- **Files modified:** tests/actions/recipes.test.ts, tests/actions/industries.test.ts, tests/components/recipe-form.test.tsx, tests/components/industry-form.test.tsx, tests/components/linked-products-picker.test.tsx
- **Commit:** 602b371 (already includes both API choices); never split out as a separate fix-up commit because the substitution happened DURING the initial authoring before Task 4.3's commit landed.

**2. [Rule 1 - Pre-existing artifact reuse] tiptap-malicious already in repo**

- **Found during:** Task 4.1 setup phase
- **Issue:** Plan said "Author tests/fixtures/tiptap-malicious.ts per RESEARCH §1048-1067." — but the file already shipped in 04-02 per the same research lines.
- **Fix:** Verified existing content matches plan spec (script tag + bold-marked closing-tag-break + "Normal text after." paragraph). Did NOT rewrite. Authored only the new tiptap-sample.ts.
- **Commit:** 328603a; SUMMARY decision-3 documents.

No other deviations. The 4 tasks landed as written.

## Threat Flags

None. This plan introduces only test-side code (fixtures + RED stubs); no new production trust boundaries, network endpoints, or schema changes.

## Self-Check: PASSED

**Files created:**

- FOUND: tests/fixtures/tiptap-sample.ts
- FOUND: tests/fixtures/seed-content.ts
- FOUND: tests/actions/recipes.test.ts
- FOUND: tests/actions/industries.test.ts
- FOUND: tests/components/recipe-form.test.tsx
- FOUND: tests/components/industry-form.test.tsx
- FOUND: tests/components/linked-products-picker.test.tsx
- FOUND: tests/e2e/recipe-detail.spec.ts
- FOUND: tests/e2e/industry-detail.spec.ts
- FOUND: tests/e2e/used-in-section.spec.ts
- FOUND: tests/e2e/admin-recipe-form.spec.ts
- FOUND: tests/e2e/admin-industry-form.spec.ts

**Commits:**

- FOUND: 328603a (Task 4.1 — tiptap fixtures)
- FOUND: 4514506 (Task 4.2 — seed-content orchestrator)
- FOUND: 602b371 (Task 4.3 — Server Action RED stubs)
- FOUND: b86d679 (Task 4.4 — jsdom + Playwright e2e RED stubs)

**Verification:**

- pnpm tsc --noEmit: clean (no errors)
- pnpm vitest run: 186 passed | 20 skipped — the 20 skipped are exactly the 14 actions + 6 components RED stubs from this plan
- pnpm playwright test --list: 57 specs across 18 files; the 5 new spec files contribute 8 fixme'd specs
- grep -rn "FLIP-IN" tests/ → 38 hits (every fixme/skip spec + describe block)
