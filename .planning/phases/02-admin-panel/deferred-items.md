# Phase 2 Deferred Items

Items discovered during execution that are out of scope for the current plan. Each entry documents the issue + the plan that should fix it.

---

## From Plan 02-01 (2026-04-28)

### DEF-2-01: Cold-Neon HTTP timeout flake on Phase-1 live-DB tests (`locale-constraint`, `spec-values`) — RESOLVED 2026-04-28 (plan 02-02)

**Status:** RESOLVED in plan 02-02 (commit `74080e1`) — `15_000` 3rd-arg `it()` timeouts applied to all 6 affected tests in `tests/db/locale-constraint.test.ts`, `tests/db/spec-values.test.ts`, and `tests/db/schema-push-smoke.test.ts`.



**Discovered during:** Plan 02-01 Task 1.3 verification — initial `pnpm vitest run` against the freshly migrated DB.

**Issue:** Two Phase-1 live-DB tests timed out at the 5-second default on the cold-Neon HTTP first-query path:
  - `tests/db/locale-constraint.test.ts > rejects locale='de' with CHECK violation` — 5012ms timeout
  - `tests/db/spec-values.test.ts > inserts num_value=42.5 and range query returns the row` — 5012ms timeout

Re-running both files immediately afterward (Neon now warm) passes in 1446ms / 2452ms respectively. Re-running the FULL suite once warmed passes 42/42 in ~3.25s. So this is a pre-existing cold-start flake, not a migration regression — the migration check would have hit the same flake on any execution.

**Pre-existing evidence:** Plan 01-05 SUMMARY documented this exact root cause and added a 15-second `it()` 3rd-positional-arg timeout to the Phase-1 auth-signin-callback test (key-decision: "15s per-test timeout on live-DB tests (cold Neon HTTP connection on first query exceeds 5s default). Vitest 4 moved timeout from describe-option-object to `it(name, fn, timeout)` 3rd positional arg."). The same hardening was NOT retroactively applied to the older Phase-1 tests (locale-constraint, spec-values, schema-push-smoke) authored in plan 01-03 before the issue was understood.

**Scope:** Out of plan 02-01 (the scope is schema migration; the DDL has no effect on test latency — the slow request is a `SELECT` against the freshly-migrated schema, not on any of plan 02-01's new tables/columns).

**Fix plan:** A small follow-up plan or an inline fix in the next plan (02-02 ADMIN-SHELL) should add the same `15_000` 3rd-arg timeout to:
  - `tests/db/locale-constraint.test.ts` (2 `it()` calls)
  - `tests/db/spec-values.test.ts` (2 `it()` calls)
  - `tests/db/schema-push-smoke.test.ts` (2 `it()` calls — also Phase 1, would also timeout if run on a cold connection)

This is a 6-line edit, low risk. Documented here so the warm-second-run pattern doesn't recur on every developer's first migration run.

**Acceptance of DEF-2-01:** Single cold-start `pnpm vitest run` returns 42/42 PASS without re-runs.

---

## From Plan 02-13b (2026-04-29)

### DEF-2-13b-01: `scripts/verify-02-01-migration.ts` strict-typing failures fail `pnpm build`

**Discovered during:** Plan 02-13b Task 13b.3 verification — `pnpm build` invokes Next.js typecheck which sweeps the `scripts/` folder.

**Issue:** Seven `Object is possibly 'undefined'` errors at `scripts/verify-02-01-migration.ts` lines 89-93, 166, 182. The errors trace to PG row indexing under `noUncheckedIndexedAccess: true` (added in plan 01-something). The script predates the strict-indexing flag and was never updated.

**Pre-existing evidence:** Confirmed — `git stash && pnpm build` on master prior to plan 02-13b's changes hits the same errors. Plan 02-13a (and earlier waves) closed without addressing this; their typecheck path was likely `pnpm tsc --noEmit` rather than `pnpm build`.

**Scope:** Out of plan 02-13b (the failing file is unrelated to the editor / lifecycle actions that this plan ships). The plan's own files all type-check cleanly.

**Fix plan:** A 7-line guard pass adding `cols[0]?.data_type === "text"` style optional chaining to lines 89-93, 166, 182. Should be paired with either a tsconfig change to exclude `scripts/` from `pnpm build`'s typecheck or a one-time fix-up commit. Recommend including this in plan 02-15 (audit-log viewer) or whichever Wave-5 plan touches build infrastructure.

**Acceptance of DEF-2-13b-01:** `pnpm build` exits 0 on master with no script-level type errors.

---
