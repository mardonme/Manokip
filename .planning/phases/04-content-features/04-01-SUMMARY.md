---
phase: 04-content-features
plan: 01
subsystem: db-schema
tags: [migration, schema, drizzle, neon, junctions, pgview, status-column]
requires: []
provides:
  - "recipe.status text NOT NULL DEFAULT 'draft' + CHECK ('draft','published') in live Neon dev branch"
  - "industry.status text NOT NULL DEFAULT 'draft' + CHECK ('draft','published') in live Neon dev branch"
  - "product_recipes junction table with composite PK + 2 indices + 2 FKs ON DELETE CASCADE"
  - "product_industries junction table with composite PK + 2 indices + 2 FKs ON DELETE CASCADE"
  - "product_used_in_v pgView (UNION ALL recipe + industry junctions, filtered WHERE status='published')"
  - "Drizzle schema modules: junctions.ts + views/product-used-in.ts (barrel re-exported)"
  - "scripts/verify-04-01-migration.ts (11 information_schema assertions)"
  - "tests/db/phase4-migration.test.ts (7 live-Neon specs locking the migration contract)"
affects:
  - "src/db/schema/recipes.ts (status column added)"
  - "src/db/schema/industries.ts (status column added)"
  - "src/db/schema/index.ts (barrel re-exports for junctions + product-used-in view)"
tech-stack:
  added: []
  patterns:
    - "Hand-authored UPDATE backfill ordered BEFORE CHECK constraint addition (Phase-2 02-01 posture)"
    - "pgView UNION ALL with text-cast position to align column types across two halves"
    - "Verifier script via Drizzle/Neon HTTP db.execute against information_schema (mirrors 02-01)"
    - "errMessage helper walking err.cause chain to surface PG constraint names through Drizzle/Neon error wrapper"
key-files:
  created:
    - src/db/schema/junctions.ts
    - src/db/schema/views/product-used-in.ts
    - drizzle/0003_phase4_content_features.sql
    - drizzle/meta/0003_snapshot.json
    - scripts/verify-04-01-migration.ts
    - tests/db/phase4-migration.test.ts
  modified:
    - src/db/schema/recipes.ts
    - src/db/schema/industries.ts
    - src/db/schema/index.ts
    - drizzle/meta/_journal.json
decisions:
  - "Body $type<JSONContent>() narrowing deferred to plan 04-02 because @tiptap/core not yet installed (Rule-1; DDL invariant unaffected)"
  - "Backfill UPDATE statements ordered BEFORE the CHECK constraint additions in 0003 migration so any pre-existing published rows pass the constraint (T-04-01-03 mitigation)"
  - "Verifier asserts 11 invariants (status columns + CHECK constraints + 2 junction tables + composite PKs + 2 indices + 2 FKs ON DELETE CASCADE + pgView queryability + relkind='v')"
metrics:
  duration_min: ~25
  completed_date: "2026-05-01"
  task_count: 4
  files_changed: 9
  tests_added: 7
  total_tests_passing: 174
---

# Phase 04 Plan 01: Phase 4 Schema Substrate Summary

Additive schema migration shipping the status columns + 2 junction tables + 1 pgView that every other Phase-4 plan reads from. RED→GREEN cycle landed in one shot (the migration IS the GREEN side, mirroring Phase-2 02-01 posture).

## What Shipped

- **Schema column additions:** `recipe.status` and `industry.status` — text NOT NULL DEFAULT 'draft' with table-level CHECK constraints (`recipe_status_check`, `industry_status_check`) restricting to `('draft','published')`. Mirrors `product.status` from Phase 2 D-11.
- **Junction tables:** `product_recipes` and `product_industries` — both with composite PK on `(product_id, <other>_id)`, 2 supporting indices (forward + reverse query), 2 FKs ON DELETE CASCADE so deleting either side automatically drops the junction row. Both follow the project-wide Phase-1 convention (snake_case, timestamptz `created_at`, integer `position` default 0).
- **pgView:** `product_used_in_v` — UNION ALL of both junctions joined to base + translations rows, filtered `WHERE status='published'` on each side. Defense-in-depth: a public RSC reading from this view structurally cannot leak draft content (T-04-01-02 mitigation).
- **Drizzle schema modules:** `src/db/schema/junctions.ts` exporting `productRecipes` + `productIndustries`; `src/db/schema/views/product-used-in.ts` exporting `productUsedInView`. Both re-exported from the barrel.
- **Migration file:** `drizzle/0003_phase4_content_features.sql` — drizzle-kit-generated DDL + hand-authored UPDATE backfill statements (`CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END`) ordered BEFORE the CHECK constraints. Applied to Neon dev branch via `pnpm drizzle-kit migrate`.
- **Verifier script:** `scripts/verify-04-01-migration.ts` — 11 information_schema / pg_constraint / pg_indexes assertions, all PASS against Neon dev branch.
- **7 live-Neon specs:** `tests/db/phase4-migration.test.ts` — backfill correctness ×2, CHECK rejection ×2, FK cascade ×2, pgView union-and-filter ×1.

## Verification Results

```
pnpm tsc --noEmit                                              → CLEAN
pnpm tsx scripts/verify-04-01-migration.ts                      → 11/11 PASS
pnpm vitest run tests/db/phase4-migration.test.ts               → 7/7 PASS
pnpm vitest run                                                 → 174/174 across 33 files
```

Migration applied to Neon dev branch (`drizzle.__drizzle_migrations` row #3 `tag=0003_phase4_content_features`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan internal-spec drift] Defer `body.$type<JSONContent>()` narrowing to plan 04-02**
- **Found during:** Task 1.1 (initial pnpm tsc --noEmit run)
- **Issue:** Plan 04-01 task 1.1 `<action>` adds `import type { JSONContent } from '@tiptap/core'` and narrows `body: jsonb()` → `body: jsonb().$type<JSONContent>()` on both recipe + industry translations. But `@tiptap/core` is not installed yet (plan 04-02 installs the Tiptap stack). The plan explicitly anticipates this: "If TypeScript fails on the import in this commit, ship the schema column DDL changes here and hold the `$type<JSONContent>()` narrowing for plan 04-02 (Rule-1 deviation). The DDL invariant from this plan is the status column + CHECK constraint; the JSONContent narrowing is TS-cosmetic."
- **Fix:** Reverted the JSONContent import + body narrowing on both schema files. Replaced inline doc-comment notes pointing to plan 04-02 for the type narrowing. DDL invariants (status column + CHECK constraints) ship verbatim.
- **Files modified:** `src/db/schema/recipes.ts`, `src/db/schema/industries.ts`
- **Commit:** `c70524b` (Task 1.1)

**2. [Rule 1 - Bug] Drizzle/Neon error wrapper opacity in CHECK-constraint rejection specs**
- **Found during:** Task 1.4 first vitest run (5/7 specs GREEN; specs 3 + 4 RED)
- **Issue:** Specs 3 + 4 expect the thrown error to contain the constraint name (`recipe_status_check`, `industry_status_check`). Drizzle's neon-http driver wraps the underlying NeonDbError such that the top-level `Error.message` reads only `failed query: update recipe set status = $1 where id = $2::uuid`. The constraint name lives on `err.cause.constraint` (or `err.cause.detail`), not the wrapper message.
- **Fix:** Added an `errMessage(err: unknown): string` helper that walks the cause chain (`err.cause`, `err.cause.cause`, ...) collecting every string property across `message`, `detail`, `hint`, `where`, `constraint`, `constraint_name`. The assertion now reads `expect(errMessage(caught).toLowerCase()).toContain('recipe_status_check')` and finds the constraint name on the cause object regardless of which Drizzle/Neon driver minor surfaces it. Rejection IS happening (the UPDATE didn't succeed) — this is purely an introspection fix, not a logic fix.
- **Files modified:** `tests/db/phase4-migration.test.ts`
- **Commit:** `17db532` (Task 1.4)

**3. [Rule 1 - Plan internal-spec drift] Reorder backfill UPDATE before CHECK constraint addition**
- **Found during:** Task 1.3 (post drizzle-kit generate inspection)
- **Issue:** drizzle-kit's auto-generated 0003 placed `ALTER TABLE ... ADD COLUMN status DEFAULT 'draft' NOT NULL` followed (much later in the file) by `ALTER TABLE ... ADD CONSTRAINT recipe_status_check CHECK ...`, with no UPDATE backfill in between. Plan literal in the `<action>` block requires a specific 7-step ordering: (1) ADD COLUMN status; (2) UPDATE backfill; (3) ADD CONSTRAINT CHECK; ×2 for industry; then junction DDL + pgView. T-04-01-03 mitigation depends on backfill running BEFORE CHECK so any pre-existing published rows pass the constraint.
- **Fix:** Hand-edited `drizzle/0003_phase4_content_features.sql` to reorder: ADD COLUMN status (recipe) → UPDATE backfill (recipe) → ADD CONSTRAINT (recipe); same triple for industry; junction DDL untouched; pgView untouched. Phase 4 opens with 0 recipe + 0 industry rows so the backfill is a no-op in practice — but the ordering is locked for future re-applies (e.g. branching to a fresh Neon test branch where seeds may add rows before re-running).
- **Files modified:** `drizzle/0003_phase4_content_features.sql`
- **Commit:** `cb03285` (Task 1.3)

### Authentication Gates

None — this plan exercises only the local CLI + Neon dev branch the executor already had access to via `DATABASE_URL_DIRECT` in `.env.local`.

### Architectural Changes

None — plan was strictly additive schema work as anticipated.

## TDD Gate Compliance

This plan ran each task as a single feat() commit rather than a separate test() / feat() RED→GREEN pair, because the Phase-2 02-01 canonical posture for migration plans is "the migration IS the GREEN side" — the production code under test is the DDL itself. Tests cannot meaningfully RED-fail before the migration applies (the pgView SELECT errors with "relation does not exist", which is a runtime error, not an assertion failure). Once the migration applies, tests transition RED → GREEN with no production-code change. This is consistent with the plan's task 1.4 `<action>` note: "All 7 specs MUST be RED at this commit (the production code under test is the DDL itself; if migration is not yet applied to the test branch, the specs error on the pgView SELECT). If migration applied, RED → GREEN with no production-code change."

The plan-level `type: tdd` would not apply here because each task ships its own DDL increment that downstream tasks depend on (e.g. junction table DDL must exist before tests can INSERT into it). Sequential `feat()` commits for additive migration are the correct posture.

## Threat Flags

No new security-relevant surface beyond what the plan's `<threat_model>` already covered. The pgView's `WHERE status='published'` filter is the T-04-01-02 mitigation (defense-in-depth against draft leaks); spec 7 directly asserts draft rows are absent from view output.

## Self-Check: PASSED

Files claimed to exist:
- `src/db/schema/junctions.ts` — FOUND
- `src/db/schema/views/product-used-in.ts` — FOUND
- `drizzle/0003_phase4_content_features.sql` — FOUND
- `drizzle/meta/0003_snapshot.json` — FOUND
- `scripts/verify-04-01-migration.ts` — FOUND
- `tests/db/phase4-migration.test.ts` — FOUND
- `.planning/phases/04-content-features/04-01-SUMMARY.md` — FOUND (this file)

Commits claimed to exist (verified via `git log --oneline`):
- `c70524b` Task 1.1: status column + CHECK
- `3aca084` Task 1.2: junctions + pgView Drizzle defs
- `cb03285` Task 1.3: 0003 migration + apply
- `17db532` Task 1.4: verifier + 7 specs

All claims verified.
