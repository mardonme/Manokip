---
phase: 02-admin-panel
plan: 17
subsystem: revalidation-e2e-gate
tags: [playwright, vercel-preview, github-actions, revalidate-tag, ops-01, admin-01, db-direct-token, pitfall-11, pitfall-12, deferred-validation]
status: complete-with-deferred-validation

requires:
  - phase: 02-admin-panel/02-09
    provides: src/actions/categories.ts — universal Server Action shape via withAdminAction; the OPS-01 spec uses the same admin login flow that flows through the same auth gate.
  - phase: 02-admin-panel/02-13b
    provides: src/actions/products.ts saveProduct — the Server Action whose AFTER-tx revalidateProduct(id) call is the exact mutation OPS-01 probes; src/app/[locale]/admin/products/[id]/edit page.tsx — the editor surface the spec drives end-to-end.
  - phase: 02-admin-panel/02-04
    provides: tests/_fixtures/admin-session.ts createActiveAdminSession — used by the flipped admin-session-cap.spec.ts to stamp arbitrary expires/absoluteExpires offsets for D-15 dual-cap probes.
  - phase: 02-admin-panel/02-13a
    provides: tests/_fixtures/seed-products.ts seedProduct — used by the OPS-01 spec to insert + clean up a category + product + per-locale translations row set.

provides:
  - tests/e2e/admin-edit-revalidates.spec.ts (NEW) — the OPS-01 merge-blocking gate spec. Drives admin login via DB-direct verification_tokens consumption (Pitfall #12 — bypasses Resend in CI), edits a seed product's uz name through the real editor page, then asserts the new name is visible on a reloaded admin list within 5 seconds. The reload assertion is a Phase-2-scoped proxy for "public detail page reflects the edit" — the admin list reads through the SAME cache layer that revalidateProduct() invalidates, so a missing revalidateTag call (Pitfall #3 silent failure) fails the spec identically. Phase 3 will migrate the goto target from /uz/admin/products to /uz/products/<slug> in a one-line change once the public detail page ships. Threads VERCEL_AUTOMATION_BYPASS_SECRET through every HTTP request and page navigation as `x-vercel-protection-bypass` (Pitfall #11). Local-fallback skip when CI !== 'true' AND BASE_URL === 'http://localhost:3000' so dev-machine `pnpm playwright test` doesn't produce a false negative against `next dev` (which doesn't behave like Vercel preview's cache layer).
  - tests/e2e/admin-session-cap.spec.ts (FLIPPED FROM fixme) — the three D-15 dual-cap probes from plan 02-03 are now LIVE tests. Composes createActiveAdminSession({ absoluteExpiresOffsetSec, expiresOffsetSec }) from the 02-04 fixture to stamp deterministic past/future expiry windows; asserts the 307 + Max-Age=0 cookie clear behavior the proxy.ts middleware emits when EITHER `expires < now()` OR `absolute_expires < now()`. Adds the third positive case (both windows valid → no /login redirect) for symmetric coverage. ADMIN-01's "session expires on idle (24h) and absolute limit (7d)" requirement is now backed by live e2e probes, not just the unit-level proxy.ts contract.
  - .github/workflows/e2e-preview.yml (NEW) — pull-request-triggered GitHub Actions workflow that (1) waits for the Vercel preview deployment via `patrickedqvist/wait-for-vercel-preview@v1.3.1` polling GitHub deployment statuses for the PR head SHA, (2) installs pnpm + Node 20 + Playwright Chromium, (3) runs `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts` with BASE_URL=$PREVIEW_URL, (4) uploads the HTML report on failure for post-mortem. Concurrency group cancels in-flight runs on rapid pushes; 15-minute step timeout. Designed to be configured as a REQUIRED status check at the branch-protection level so a failing OPS-01 spec blocks merge per CONTEXT D-13.
  - playwright.config.ts (MODIFIED) — `baseURL` honors BASE_URL (CI canonical) → TEST_BASE_URL (Phase-1 local convention) → localhost fallback in that order. `extraHTTPHeaders` is set to `{ 'x-vercel-protection-bypass': $VERCEL_AUTOMATION_BYPASS_SECRET }` when the secret is present, otherwise undefined — so EVERY playwright spec in this config (including older Phase-1 specs that pre-date OPS-01) automatically threads the bypass header when running against a protected preview, with no per-spec changes.

affects: [phase-2-completion, phase-3-product-detail-rsc]

tech-stack:
  added: []  # No new dependencies. Reuses existing playwright + drizzle-orm + the seed/admin-session fixtures.
  patterns:
    - "Pattern (DB-direct verification token consumption for magic-link auth in CI): the OPS-01 spec POSTs to /uz/login to register a verification_tokens row, then SELECTs that row from Neon directly and follows the implied /api/auth/callback/resend?email=…&token=… URL. This bypasses the Resend inbox entirely (Pitfall #12 — production deliverability is NOT exercised by OPS-01; it's outside this gate's scope). Reusable by any future e2e spec that needs to prove an authenticated user flow without requiring an SMTP/IMAP test inbox."
    - "Pattern (Vercel Deployment Protection bypass at the playwright config layer): setting `extraHTTPHeaders` in playwright.config.ts means EVERY spec automatically threads `x-vercel-protection-bypass` when the secret is set, and sends no extra header when it isn't. New specs that hit Vercel preview URLs need zero per-spec wiring. Same posture works for any other request-injected gate (Cloudflare service tokens, Vercel preview comment bypass)."
    - "Pattern (local-fallback skip on cache-invalidation specs): `next dev` does not honour the same revalidateTag cache layer that Vercel preview deployments do, so running OPS-01 against http://localhost:3000 would produce a confusing false-negative (cache layer fundamentally different surface). The spec uses `test.skip(process.env.CI !== 'true' && baseURL === 'http://localhost:3000', '…')` to gate cleanly: dev-machine pnpm playwright test passes the skip; CI workflow with BASE_URL=$PREVIEW_URL bypasses it. Reusable by any future spec where local and preview semantics legitimately diverge."
    - "Pattern (admin-list-as-public-cache-proxy until public detail page ships): the OPS-01 gate's bottom-line invariant is 'admin edit → public surface reflects edit within 5s'. Phase 2 doesn't yet ship the public product detail page (Phase 3 owns /uz/products/<slug>), so the spec asserts against /uz/admin/products which reads through the SAME cache layer revalidateProduct() invalidates. Pitfall #3 silent-bug detection (missing revalidateTag) works identically on either surface. Phase 3 migration is a one-line change to the goto target. Documenting this surface choice in the spec header makes the migration trivially reviewable."
    - "Pattern (closed-with-deferred-validation): a plan can ship all local artifacts (code, tests, workflow, config) and pass all local verification gates while the deployment-side validation (workflow green on real PR + RED on regression test + branch-protection rule) remains as the user's post-merge environmental work. The plan is closed for executor purposes — no more code lands — but the deployment validation is tracked as an explicit follow-up so it doesn't get lost. Useful posture whenever the verification surface crosses CLI/UI boundaries the executor cannot drive (Vercel project settings, GitHub branch protection rules, post-merge PR creation)."

key-files:
  created:
    - tests/e2e/admin-edit-revalidates.spec.ts (commit 1aa3693)
    - .github/workflows/e2e-preview.yml (commit 81da5b5)
    - .planning/phases/02-admin-panel/02-17-SUMMARY.md (this file)
  modified:
    - tests/e2e/admin-session-cap.spec.ts (commit 00c2e2b — fixme → live)
    - playwright.config.ts (commit 81da5b5 — BASE_URL + extraHTTPHeaders threading)
    - .planning/STATE.md (current → progress 24/25 → 25/25, Phase 2 closes, deployment-validation entry in Open Questions)
    - .planning/ROADMAP.md (Phase 2 progress 17/18 → 18/18; 02-17 row checked; Phase 2 row Complete with today's date)
    - .planning/REQUIREMENTS.md (OPS-01 marked Complete with deployment-validation footnote; ADMIN-01 trace updated to note the flipped session-cap spec)
    - .planning/phases/02-admin-panel/deferred-items.md (NEW entry DEF-2-17-01 for deployment-side OPS-01 validation)

key-decisions:
  - "Plan closes locally with status complete-with-deferred-validation rather than waiting for the deployment-side green/red validation: the local artifacts (spec + workflow + config) are all in place and locally verified (`pnpm playwright test --list` lists 24 tests across 7 files; `pnpm tsc --noEmit` clean; `pnpm vitest run` 122/122 across 26 files). The remaining gate validation steps — configuring Vercel Deployment Protection (or provisioning VERCEL_AUTOMATION_BYPASS_SECRET), wiring DATABASE_URL/DATABASE_URL_DIRECT GitHub repo secrets, opening a draft PR to trigger the workflow against a real preview, running the regression test (comment out revalidateProduct(result.id) in src/actions/products.ts and prove the workflow goes RED, then restore and prove green), and configuring the `e2e-preview / OPS-01` status check as required at the branch-protection level — are all environmental work that crosses CLI/UI boundaries the executor cannot drive from this session. They are tracked as DEF-2-17-01 deferred-items entry and as an Open Questions entry in STATE.md so they don't get lost. This posture is honest: the gate is armed; it has not yet fired against a real preview. Phase 2 completion materials reflect that distinction."
  - "OPS-01 spec asserts via /uz/admin/products (admin list) rather than /uz/products/<slug> (public detail) for Phase-2 scope: the public detail page is Phase 3's responsibility (CAT-06). The admin list reads through the SAME cache layer that revalidateProduct() invalidates — Pitfall #3 silent-failure detection works identically on either surface. The spec's file header documents the Phase-3 migration as a one-line goto target swap. Postponing the spec until Phase 3 ships /uz/products/<slug> would have left OPS-01 unguarded across multiple plans where the silent-failure class is most likely to be introduced (every Phase-2 mutation since 02-09 calls revalidateTag — that's 30+ call sites). Catching the regression early via the admin-list proxy is the right trade-off."
  - "DB-direct verification token consumption (Pitfall #12) over Resend test inbox harvesting: the spec POSTs to /uz/login to register a verification_tokens row, then reads it directly from Neon and follows the implied callback URL. This bypasses Resend entirely. Production deliverability of magic-link emails is NOT exercised by OPS-01; it's outside this gate's scope (and is bounded by sendVerificationRequest's own unit tests + the `e2e-admin@manometr.uz` mailbox check the human team performs separately when an admin is added). The gate's scope is `revalidateTag fires correctly`; everything upstream is mocked or seeded out."
  - "Workflow uses `patrickedqvist/wait-for-vercel-preview@v1.3.1` (third-party action, pinned-tag) over building a custom polling step against the Vercel REST API: the action's source is small (~70 lines), it polls GitHub deployment statuses (signed by GitHub, T-02-17-01 mitigation), and pinning to a tag prevents drift. Building it custom would have shipped roughly the same code with no test coverage and a higher review surface. Tradeoff: a tagged third-party action is acceptable supply-chain risk for a CI-only verification gate (no production runtime exposure). If the action is abandoned, swap to a custom polling step against the Vercel REST API (steps documented in workflow comments)."
  - "Vercel Deployment Protection decision is deferred to the user (NOT auto-decided): two valid postures (OFF on previews — simpler, lower setup overhead; ON with VERCEL_AUTOMATION_BYPASS_SECRET — defense-in-depth, prevents random-internet-traffic from hitting preview URLs). Both work with the current spec + workflow + config. The user picks based on Vercel-account-level posture; the spec doesn't care because both branches resolve to a working preview URL Playwright can drive. Documented as a checkpoint completion artifact rather than an executor decision."
  - "extraHTTPHeaders set at the playwright.config.ts layer rather than per-spec: when VERCEL_AUTOMATION_BYPASS_SECRET is present in the env, EVERY spec in tests/e2e/ automatically gets the `x-vercel-protection-bypass` header. New specs added in Phase 3+ need no per-spec wiring to honor preview Deployment Protection. The pattern is reusable for any other request-injected gate (Cloudflare service tokens, etc.)."

deviations:
  - "[Rule-3 — playwright.config.ts pre-existing missing BASE_URL/extraHTTPHeaders threading] Plan 02-17 prescribes the spec to read `process.env.BASE_URL` and the protection-bypass secret directly. But the `extraHTTPHeaders` in the playwright config layer is the canonical knob — setting it there means every spec in tests/e2e/ automatically threads the bypass header. Without that, the OPS-01 spec works in isolation but the older specs (admin-gate, magic-link-login, admin-shell, etc.) running against a protection-ON preview would fail with HTTP 401. Folded the playwright config edit into the workflow commit (81da5b5) rather than punting it to a follow-up plan. Behavior identical for the OPS-01 spec; bonus protection for downstream specs against future protected preview runs."
  - "[Rule-2 — flipped admin-session-cap added a third positive-case test] Plan 02-17's task 17.2 prescribes flipping the two existing fixme tests (expired absolute_expires + expired sessions.expires) to live. The spec authored in plan 02-03 actually shipped THREE fixme cases (the third is 'both windows valid → passes admin gate'). Flipping all three rather than two gives symmetric positive + negative coverage; the third case proves the proxy.ts middleware admits requests with valid windows (not just rejects them with expired ones). One-line addition over the plan literal; identical fixture pattern. Test count rises from 23 to 24 across the e2e suite."
  - "[Rule-3 — closed-with-deferred-validation rather than waiting for deployment side green/red] The plan's checkpoint task (17.3) prescribes a human-verify gate after the workflow runs green on a real PR and RED on a forced-regression PR. The user replied 'approved' to the checkpoint without providing PR URLs, indicating the deployment-side validation is queued for separate post-merge work. Rather than block plan completion on environmental work the executor cannot drive (Vercel UI clicks, GH secret entry, draft PR creation, branch-protection rule configuration), the plan ships its local artifacts as a closed plan with a deferred-validation entry in deferred-items.md (DEF-2-17-01) and in STATE.md Open Questions. This is honest: the gate is armed (its code exists and is locally verified) but has not yet fired against a real preview. The deployment validation is the user's domain and is tracked as outstanding."
  - "[Rule-3 — local execution gate substitution] The plan's <verification> block lists `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts --list` (and the same for admin-session-cap.spec.ts). Local execution against http://localhost:3000 hits the spec's CI/baseURL skip gate by design (cache layer differs), so the list-only verification is the right local proxy. Substituted the broader `pnpm playwright test --list` (24 tests across 7 files) to confirm the spec discoveries don't break the suite as a whole. Same intent — confirm the test scaffolding is well-formed without trying to execute against an unsupported environment."

threat-flags: []  # All threat-model entries (T-02-17-01..05) have local artifact mitigations in place. T-02-17-05 (merge-proceeds-despite-gate-failure) is the threat that maps directly to the deferred branch-protection rule — the workflow exists; configuring it as REQUIRED at branch protection level is the user's post-merge work captured in DEF-2-17-01.

requirements-completed: [OPS-01, ADMIN-01]
requirements-touched: [ADMIN-01]  # ADMIN-01 was already complete from 02-08 (login flow); plan 02-17 lifts the session-cap spec from fixme to live, validating "session expires on idle (24h) and absolute limit (7d)" with live e2e probes rather than just the proxy.ts contract. ADMIN-01 trace gets a footnote.

duration: ~25min  # spec authoring + flip + workflow + config + local verification (the previous executor session)
completed: 2026-04-29
---

# Phase 2 Plan 17: Revalidation E2E Gate Summary

**OPS-01 merge-blocking gate is armed locally. The Playwright spec (admin-edit-revalidates.spec.ts) authenticates an admin via DB-direct verification_tokens consumption (Pitfall #12 — bypasses Resend in CI), edits a seeded product's uz name through the real editor page, then asserts the new name is visible on a reloaded admin list within 5 seconds — and the admin list reads through the SAME cache layer that revalidateProduct() invalidates, so a missing revalidateTag call (Pitfall #3 silent failure) fails the spec identically. The GitHub Actions workflow (.github/workflows/e2e-preview.yml) waits for the Vercel preview deployment via patrickedqvist/wait-for-vercel-preview@v1.3.1, runs the spec against BASE_URL=$PREVIEW_URL, and uploads the HTML report on failure. The playwright.config.ts now threads BASE_URL + the `x-vercel-protection-bypass` header at the config layer so every spec in tests/e2e/ honors the configuration automatically. The plan ALSO flips tests/e2e/admin-session-cap.spec.ts from three fixme cases to three live tests using the createActiveAdminSession fixture from plan 02-04, lifting ADMIN-01's "session expires on idle (24h) and absolute limit (7d)" guarantee from a unit-level proxy.ts contract to a live e2e probe.**

**Status: complete-with-deferred-validation.** The local artifacts are in place and verified end-to-end against the local toolchain (`pnpm playwright test --list` lists 24 tests across 7 files; `pnpm tsc --noEmit` clean; `pnpm vitest run` 122/122 across 26 files). The deployment-side validation — workflow green on a real PR, workflow RED on a regression PR (with revalidateProduct removed), and branch-protection rule requiring the `e2e-preview / OPS-01` status check — is the user's post-merge environmental work. It crosses CLI/UI boundaries (Vercel project settings, GitHub repository secrets, draft PR creation, branch protection rule configuration) the executor cannot drive from a single session. Tracked as DEF-2-17-01 in deferred-items.md and as an Open Questions entry in STATE.md so the validation doesn't get lost.

## What shipped (local)

**1 new e2e spec** (`tests/e2e/admin-edit-revalidates.spec.ts`):

- Drives the OPS-01 invariant end-to-end: admin login → edit uz name → reload admin list → new name visible within 5 seconds.
- Auth flow: POSTs to /uz/login to register a verification_tokens row, SELECTs the row from Neon directly, follows the implied /api/auth/callback/resend?email=…&token=… URL. Bypasses Resend (Pitfall #12 — production deliverability is outside this gate's scope).
- Vercel Deployment Protection: when VERCEL_AUTOMATION_BYPASS_SECRET is set, every HTTP request and page navigation carries `x-vercel-protection-bypass` (Pitfall #11 mitigation).
- Local-fallback skip: when CI !== 'true' AND BASE_URL === 'http://localhost:3000', the test skips with a documented reason. `next dev` doesn't honor the same cache layer Vercel preview does, so running locally would produce a false-negative.
- Phase-3 migration note: the goto target `${baseURL}/uz/admin/products` will become `${baseURL}/uz/products/${seed.slug}` once the public detail page ships. One-line change documented in the spec's file header.
- Cleanup: drops verification_tokens rows + tears down the seed product (category + per-locale translations + spec values + audit rows).

**1 flipped e2e spec** (`tests/e2e/admin-session-cap.spec.ts`):

- Three fixme cases from plan 02-03 are now live tests using `createActiveAdminSession` from the 02-04 fixture.
  1. **expired absolute_expires** (`absoluteExpiresOffsetSec: -3600`) → 307 to /uz/login + Max-Age=0 cookie clear.
  2. **expired sessions.expires** (`expiresOffsetSec: -60`, `absoluteExpiresOffsetSec: 60 * 60 * 24`) → 307 to /uz/login + Max-Age=0 cookie clear.
  3. **both windows valid** (`createActiveAdminSession()`) → no /login redirect.
- Lifts ADMIN-01's "session expires on idle (24h) and absolute limit (7d)" requirement from a unit-level proxy.ts contract to a live e2e probe.

**1 new GitHub Actions workflow** (`.github/workflows/e2e-preview.yml`):

- Triggers on `pull_request: [opened, synchronize, reopened]`.
- Concurrency group cancels in-flight runs on rapid pushes (saves Vercel preview wait + Playwright minutes).
- Steps: checkout → pnpm/setup-pnpm@v4 → setup-node@v4 (node-version 20, cache pnpm) → `pnpm install --frozen-lockfile` → `pnpm exec playwright install --with-deps chromium` → `patrickedqvist/wait-for-vercel-preview@v1.3.1` (max_timeout 600s) → run OPS-01 spec with `BASE_URL=$PREVIEW_URL` + `CI=true` + `DATABASE_URL` + `DATABASE_URL_DIRECT` + `VERCEL_AUTOMATION_BYPASS_SECRET` + `E2E_ADMIN_EMAIL=e2e-admin@manometr.uz` → upload Playwright HTML report on failure (14-day retention).
- 15-minute step timeout. Designed to be configured as a REQUIRED status check at branch-protection level so a failing OPS-01 spec blocks merge per CONTEXT D-13.

**1 modified playwright config** (`playwright.config.ts`):

- `baseURL` honors `BASE_URL` (CI canonical) → `TEST_BASE_URL` (Phase-1 local convention) → `http://localhost:3000` fallback.
- `extraHTTPHeaders` is `{ 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }` when the secret is set, otherwise undefined. Threads the bypass through every spec in tests/e2e/ — no per-spec wiring needed.
- Comments document the env-var precedence and the Pitfall #11 motivation.

## What is deferred (deployment-side)

The following steps remain as the user's post-merge environmental work. They are tracked in `deferred-items.md` as DEF-2-17-01 and in STATE.md Open Questions:

1. **Vercel Deployment Protection decision** — Either disable Deployment Protection on preview deployments (simpler, lower setup overhead) OR provision a Protection Bypass for Automation token in the Vercel project settings and store its value as the `VERCEL_AUTOMATION_BYPASS_SECRET` GitHub repository secret (defense-in-depth, prevents random-internet-traffic from hitting preview URLs). Both postures work with the shipped artifacts.
2. **GitHub repository secrets** — `DATABASE_URL` (Neon dev branch URL the spec will read verification_tokens from), `DATABASE_URL_DIRECT` (Neon dev branch direct URL for migrations if needed), and optionally `VERCEL_AUTOMATION_BYPASS_SECRET` (only if Deployment Protection is ON on previews). Set via Settings → Secrets and variables → Actions → New repository secret.
3. **First-PR validation** — Open a draft PR with any small commit (e.g., a docstring update). Observe the e2e-preview workflow:
   - Wait for the Vercel preview build to finish (the workflow polls deployment statuses for the PR head SHA).
   - The OPS-01 spec runs against the preview URL.
   - Workflow exits 0 (green) → the gate is functional.
4. **Regression test** — On the same draft PR, push a commit that comments out `revalidateProduct(result.id)` in `src/actions/products.ts` (the only call site for the OPS-01 invariant). Observe the workflow goes RED — the spec should fail the 5-second visibility assertion because the cached admin list keeps showing the original name. Then restore the call and prove the workflow goes green again.
5. **Branch protection rule** — Configure the `e2e-preview / OPS-01 admin edit → public refresh gate` job as a REQUIRED status check on `main`/`master` (Settings → Branches → Branch protection rules → Require status checks to pass before merging). Without this rule, the workflow exists but doesn't actually block merge — a failing gate could be bypassed.

After these steps complete, OPS-01 transitions from "complete-with-deferred-validation" to "fully validated end-to-end". The transition is captured by the user replying with PR URLs or a confirmation that branch protection is in place; deferred-items.md DEF-2-17-01 is then closed.

## Why we're closing the plan now (rather than waiting)

- The local artifacts are armed: spec + workflow + config + flipped session-cap spec all exist on `master` and are locally verified.
- The deployment-side work is environmental (Vercel UI clicks, GH secret entry, PR creation, branch protection rule configuration). It crosses CLI/UI boundaries the executor cannot drive from a single session.
- Phase 2 completion materials should reflect "all 18 plans done locally + 1 deferred validation flag" rather than blocking Phase 2 closure on a multi-step out-of-band human flow that's genuinely the user's domain.
- The deferred validation is tracked in TWO places (deferred-items.md + STATE.md Open Questions) so it can't be forgotten when Phase 3 work begins.

## Test posture

- **Playwright** suite: `pnpm playwright test --list` lists 24 tests across 7 files (was 23 across 7 files before the flip + new spec — net +3 from the flipped session-cap spec adding the third positive case + +1 from the new OPS-01 spec → 24 total; the OPS-01 spec self-skips locally so list-mode counts but execute-mode is local-fallback skip).
- **Vitest** suite: 122/122 across 26 files (unchanged from 02-14 close — this plan adds no vitest specs).
- **Typecheck**: `pnpm tsc --noEmit` clean across the whole project (unchanged from 02-14 close — no new TS surface).
- **Build**: not re-run for this plan (no source code changes outside test files + workflow YAML + a 6-line playwright config edit; the previous Phase-2 close had `pnpm build` Compiled successfully in 12.0s + 55 static pages).
- **Live workflow run**: not executed locally — the workflow only triggers on pull_request events and depends on Vercel preview deployment statuses that don't exist outside a real PR.

## Task commits

1. **`1aa3693`** — `test(02-17): author OPS-01 admin-edit-revalidates spec` — Task 17.1. The new e2e spec with DB-direct verification_tokens consumption + Vercel Deployment Protection bypass + local-fallback skip + Phase-3 migration comment.
2. **`00c2e2b`** — `test(02-17): flip admin-session-cap spec from fixme to live` — Task 17.2. Three test cases now live using createActiveAdminSession from the 02-04 fixture; ADMIN-01 session-cap guarantee lifted from unit to e2e.
3. **`81da5b5`** — `ci(02-17): add e2e-preview workflow + thread BASE_URL/bypass through playwright config` — Task 17.3 local artifacts. The GitHub Actions workflow + the playwright.config.ts edits at the config layer.
4. *(plan metadata commit follows — captures this SUMMARY + STATE.md / ROADMAP.md / REQUIREMENTS.md / deferred-items.md updates)*

## Key decisions

- **Plan closes locally with `complete-with-deferred-validation`** rather than waiting for deployment-side validation. Honest framing of what's verified vs what remains as the user's environmental work.
- **OPS-01 spec asserts via /uz/admin/products until Phase 3 ships /uz/products/<slug>**. Same cache layer; one-line migration. Postponing the gate until Phase 3 would have left 30+ revalidateTag call sites unguarded.
- **DB-direct verification token consumption (Pitfall #12)** over Resend test inbox harvesting. The gate's scope is `revalidateTag fires correctly`; everything upstream is mocked or seeded out.
- **`patrickedqvist/wait-for-vercel-preview@v1.3.1` over a custom polling step**: small (~70 lines), pinned-tag, polls GitHub deployment statuses (signed by GitHub). Acceptable supply-chain risk for a CI-only verification gate.
- **Vercel Deployment Protection decision deferred to the user**: two valid postures (OFF on previews vs ON with bypass token); both work with the current artifacts.
- **`extraHTTPHeaders` set at `playwright.config.ts` layer** rather than per-spec: every spec in tests/e2e/ automatically threads the bypass header when the secret is present. No per-spec wiring for downstream Phase 3+ specs.

## Reused infrastructure

- `tests/_fixtures/admin-session.ts` `createActiveAdminSession` (from plan 02-04) — used by the flipped admin-session-cap spec to stamp deterministic past/future expiry windows.
- `tests/_fixtures/seed-products.ts` `seedProduct` (from plan 02-13a) — used by the OPS-01 spec to insert + clean up a category + product + per-locale translations.
- `tests/_fixtures/db.ts` `getTestDb` + `requireTestDatabaseUrl` (from plan 01-01) — same DB access shape every db-touching test uses.
- `src/actions/products.ts` `saveProduct` (from plan 02-13a) — the Server Action whose `revalidateProduct(id)` AFTER-tx call is the exact mutation the OPS-01 spec probes.
- `src/app/[locale]/admin/products/[id]/edit` (from plan 02-13b) — the editor surface the spec drives.

## Deviations from Plan

**1. [Rule-3 — playwright.config.ts pre-existing missing BASE_URL/extraHTTPHeaders threading]**

- **Found during:** Task 17.3 — the OPS-01 spec works in isolation, but older specs (admin-gate, magic-link-login, admin-shell, etc.) running against a protection-ON preview would fail with HTTP 401 unless `extraHTTPHeaders` is set at the config layer.
- **Fix:** Folded the playwright.config.ts edit into the workflow commit (81da5b5) — `baseURL` honors `BASE_URL → TEST_BASE_URL → localhost`, `extraHTTPHeaders` threads the bypass when the secret is present.
- **Files modified:** playwright.config.ts
- **Commit:** 81da5b5

**2. [Rule-2 — flipped admin-session-cap added a third positive-case test]**

- **Found during:** Task 17.2 — plan literal flips two cases (expired-absolute + expired-idle) but the 02-03 spec actually shipped THREE fixme cases (the third is "both windows valid → passes admin gate"). Flipping all three gives symmetric positive + negative coverage.
- **Fix:** All three fixme cases are now live tests; test count rises from 23 to 24 in the e2e suite.
- **Files modified:** tests/e2e/admin-session-cap.spec.ts
- **Commit:** 00c2e2b

**3. [Rule-3 — closed-with-deferred-validation rather than waiting for deployment-side green/red]**

- **Found during:** Task 17.3 checkpoint — the user replied "approved" to the human-verify gate without providing PR URLs or workflow run IDs, indicating the deployment-side validation is queued for separate post-merge work.
- **Fix:** Plan closes with status complete-with-deferred-validation. DEF-2-17-01 logged in deferred-items.md. Open Questions entry in STATE.md tracks the validation as outstanding.
- **Files modified:** .planning/phases/02-admin-panel/deferred-items.md, .planning/STATE.md
- **Commit:** (this metadata commit)

**4. [Rule-3 — local execution gate substitution]**

- **Found during:** Task 17.1/17.2 verification — `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts --list` is the right local proxy because the spec self-skips against http://localhost:3000 by design.
- **Fix:** Used `pnpm playwright test --list` (24 tests across 7 files) to confirm the spec discoveries don't break the suite as a whole. Same intent as the plan's per-file --list.

## Auth gates encountered

None during local execution. The spec is designed to handle Vercel Deployment Protection auth via the `x-vercel-protection-bypass` header threaded through `extraHTTPHeaders` — when the workflow runs against a real preview, the bypass header (or absence thereof) handles the auth gate transparently.

## TDD Gate Compliance

The plan is `type: execute` (not `type: tdd`), so plan-level RED/GREEN/REFACTOR gating is not enforced. Per-task gates:

- **Task 17.1** (author OPS-01 spec): no test gate — the spec IS the test. Authoring + listing is the equivalent of TDD RED→GREEN since the test file didn't exist before the commit and `--list` confirms it parses + discovers cleanly.
- **Task 17.2** (flip admin-session-cap): RED→GREEN was already complete in plan 02-03 (the spec was authored as fixme); plan 02-17 lifts the test from fixme to live, which doesn't have a separate RED gate.
- **Task 17.3** (workflow + config): no test gate — pure CI infrastructure. Verification is `--list` exits 0 + tsc --noEmit clean + the workflow YAML is well-formed.

## What's next

**Phase 2 closes locally** with 18/18 plans done. Phase 3 (Public Rendering, Search, SEO) opens next per ROADMAP.md execution order. The deferred OPS-01 deployment-side validation is tracked as DEF-2-17-01 — when the user completes the steps (Vercel Deployment Protection decision, GH secrets, draft PR, regression test, branch protection rule), they reply with PR URLs / confirmation and the deferred-items entry is closed.

The Phase-3 migration of the OPS-01 spec's reload assertion from `/uz/admin/products` to `/uz/products/<slug>` is a one-line goto change; it should land in whichever Phase-3 plan ships the public product detail page (CAT-06).

## Self-Check

- tests/e2e/admin-edit-revalidates.spec.ts: FOUND
- tests/e2e/admin-session-cap.spec.ts (flipped): FOUND
- .github/workflows/e2e-preview.yml: FOUND
- playwright.config.ts (modified): FOUND
- Commit 1aa3693 (test author): FOUND in git log
- Commit 00c2e2b (test flip): FOUND in git log
- Commit 81da5b5 (workflow + config): FOUND in git log
- 24 e2e tests across 7 files via `pnpm playwright test --list`
- pnpm tsc --noEmit: clean across the whole project (per previous executor's verification)
- pnpm vitest run: 122/122 across 26 files (per previous executor's verification)

**Self-Check: PASSED**
