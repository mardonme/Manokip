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

## From Plan 02-17 (2026-04-29)

### DEF-2-17-01: OPS-01 deployment-side validation (workflow green on real PR + RED on regression PR + branch-protection rule)

**Status:** OPEN — local artifacts shipped and locally verified; deployment-side validation queued for the user's post-merge environmental work.

**Discovered during:** Plan 02-17 Task 17.3 checkpoint — the user replied "approved" to the human-verify gate without providing PR URLs or workflow run IDs, indicating the deployment-side validation is genuinely the user's domain (Vercel UI clicks, GitHub repository secrets, PR creation, branch protection rule configuration) and not something the executor can drive from a single CLI session.

**Issue:** The OPS-01 merge-blocking gate is fully armed in code (Playwright spec at `tests/e2e/admin-edit-revalidates.spec.ts`, GitHub Actions workflow at `.github/workflows/e2e-preview.yml`, playwright.config.ts BASE_URL + bypass-header threading) and is locally verified (`pnpm playwright test --list` lists 24 tests across 7 files; `pnpm tsc --noEmit` clean; `pnpm vitest run` 122/122 across 26 files). However the gate has NOT YET fired against a real Vercel preview deployment, and is NOT YET configured as a required status check at branch protection level. Until the deployment-side validation completes, OPS-01 is "complete-with-deferred-validation" rather than "fully validated end-to-end".

**Pre-existing evidence:** N/A — this is a new deferred item closing plan 02-17.

**Scope:** Out of plan 02-17 (the executor cannot drive Vercel project settings, GitHub repository secrets, draft PR creation, or branch protection rule configuration). The plan ships its local artifacts; the deployment-side validation is environmental.

**Fix plan (the user's post-merge steps):**

1. **Vercel Deployment Protection decision** — Either disable Deployment Protection on preview deployments (simpler, lower setup overhead) OR provision a Protection Bypass for Automation token in the Vercel project settings and store its value as the `VERCEL_AUTOMATION_BYPASS_SECRET` GitHub repository secret (defense-in-depth, prevents random-internet-traffic from hitting preview URLs). Both postures work with the shipped artifacts.
2. **GitHub repository secrets** — Set `DATABASE_URL` (Neon dev branch URL the spec reads `verification_tokens` from), `DATABASE_URL_DIRECT` (Neon dev branch direct URL), and optionally `VERCEL_AUTOMATION_BYPASS_SECRET` (only if Deployment Protection is ON on previews). Settings → Secrets and variables → Actions → New repository secret.
3. **First-PR validation** — Open a draft PR with any small commit. Observe the e2e-preview workflow:
   - `wait-for-vercel-preview` polls deployment statuses for the PR head SHA and resolves to the live preview URL.
   - The OPS-01 spec runs against the preview URL.
   - Workflow exits 0 (green) → the gate is functional.
4. **Regression test** — On the same draft PR, push a commit that comments out `revalidateProduct(result.id)` in `src/actions/products.ts`. Observe the workflow goes RED — the spec should fail the 5-second visibility assertion because the cached admin list keeps showing the original name. Then restore the call and prove the workflow goes green again.
5. **Branch protection rule** — Configure the `e2e-preview / OPS-01 admin edit → public refresh gate` job as a REQUIRED status check on `main` / `master` (Settings → Branches → Branch protection rules → Require status checks to pass before merging). Without this rule, the workflow exists but doesn't actually block merge — a failing gate could be bypassed. T-02-17-05 mitigation depends on this rule.

**Acceptance of DEF-2-17-01:** Reply with the PR URL where the workflow ran green + the PR URL where the regression test went RED + a screenshot or confirmation that branch protection requires the `e2e-preview / OPS-01` status check on `main`/`master`. At that point OPS-01 transitions from `complete-with-deferred-validation` to `fully validated end-to-end` and this entry is closed.

---

