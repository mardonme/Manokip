---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Phase 02 Plan 01 SCHEMA-MIGRATION COMPLETE — drizzle/0001_overrated_shiva.sql applied to Neon dev branch (drizzle.__drizzle_migrations row #2 hash 4cadf343...); 4 new tables (admin_invite, spec_field_group, spec_field_group_translations, product_translation_field_flags); product.status TEXT NOT NULL DEFAULT 'draft' + CHECK with backfill from publishedAt; spec_field.deleted_at + spec_field.group_id columns + partial-unique (category_id,key) WHERE deleted_at IS NULL; product_translation_completeness pgView. All 8 verification checks PASS via Node-based scripts/verify-02-01-migration.ts (psql not on developer PATH). Test suite 42/42 green against migrated DB (warm). DEF-2-01 logged for cold-Neon timeout flake on Phase-1 live-DB tests (pre-existing, fix planned for plan 02-02). Next: 02-02 ADMIN-SHELL.
last_updated: "2026-04-28T00:00:00Z"
last_activity: 2026-04-28 -- 02-01 schema migration applied + verified + committed. 18 plans / 4 waves remaining for Phase 2. /gsd-execute-phase 2 should resume from 02-02.
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 8
  completed_plans: 8
  percent: 22
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.
**Current focus:** Phase 1 — Foundations

## Current Position

Phase: 2 of 5 (Admin Panel) — IN PROGRESS
Plan: 1 of 18 COMPLETE (02-01 SCHEMA-MIGRATION); Wave 1 has 5 more plans pending (02-02..02-06)
Status: 02-01 schema substrate landed; plan 02-02 ADMIN-SHELL is unblocked
Last activity: 2026-04-28 -- 02-01 SCHEMA-MIGRATION applied to live Neon dev branch; 0001_overrated_shiva.sql + verification harness + SUMMARY committed

Progress: [██████████░] Phase 01 done + 02-01 done (8 of 25 known plans complete, 22%)

## Performance Metrics

**Velocity:**

- Total plans completed: 8 (7 Phase-1 + 1 Phase-2)
- Average duration: ~46 min
- Total execution time: ~5.24 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundations | 7 | ~289 min | ~50 min* |
| 2. Admin Panel | 1 | ~25 min | ~25 min |

*Phase 1 average computed across 6 timed plans (01-01..01-06); 01-07 timing not separately tracked.*

**Recent Trend:**

- Last 7 plans: 01-01 (14 min), 01-02 (~95 min across two executor sessions), 01-03 (~70 min), 01-04 (~45 min), 01-05 (~35 min), 01-06 (~30 min), 02-01 (~25 min across two executor sessions — Tasks 1.1+1.2+1.3-prep in session 1, Task 1.3 apply+verify in this session)
- Trend: plan 02-01 is now the fastest plan (25 min) because the human-verify checkpoint front-loaded all schema authoring + migration generation into the prior session, leaving only `pnpm drizzle-kit migrate` + verification + SUMMARY for the resume session. Continuation handed off cleanly with 3 commit hashes (`93b20c4`, `a5861f3`, `a33ad59`) and a complete state-handoff prompt; resume agent verified all 3 hashes existed before applying. Three deviations worth noting: (1) Rule-3 blocker — psql not on developer PATH; replaced with Node-based verification harness (`scripts/verify-02-01-migration.ts`) using Drizzle/Neon HTTP `db.execute` with `.rows` access; (2) Rule-1 bug — first-iteration script called `.map()` directly on `db.execute` result, but neon-http returns `{rows:[...]}` not an array; fixed with an `exec(query)` wrapper handling both shapes; (3) Rule-2 missing-critical — Phase-2 had no `deferred-items.md` for tracking out-of-scope discoveries; created it with DEF-2-01 (cold-Neon timeout flake on Phase-1 tests, pre-existing, fix planned for plan 02-02). Test suite stable at 42/42 against the migrated DB (warm); cold-start hits a known Phase-1 5-second timeout on 2 tests (DEF-2-01).

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Next.js SSR over SPA/SSG (PROJECT.md) — blocks rendering strategy in Phase 3
- Postgres (managed) + hybrid spec schema (PROJECT.md) — locks Phase 1 schema shape
- Three locales from day one, sibling `*_translations` tables (research SUMMARY) — prevents Pitfall #1 in Phase 1
- (01-01) Manually authored scaffold — `pnpm create next-app --force` would have wiped `.planning/` + `CLAUDE.md`
- (01-01) Apostrophe-variant set expanded to 4 (added U+0060 backtick) per executor critical_rules — superset of plan spec, documented in slug.ts
- (01-01) `tests/_fixtures/db.ts` uses `@ts-expect-error` on `@/db/client` import; directive MUST be removed when plan 02 lands
- (01-01) Added `tests/e2e/placeholder.spec.ts` so `pnpm playwright test --list` exits 0 — required for downstream plans' verify commands
- (01-02) @ts-expect-error on `tests/_fixtures/db.ts` @/db/client import removed as part of task 02.1 commit `cb24dc8` (module now resolves)
- (01-02) product_spec_value_translations.valueId typed as `bigint` (not `bigserial`) because it's a FK; `bigserial` only on the owning product_spec_values.id to avoid double-sequence
- (01-02) Plan spanned two executor sessions — task 02.1 landed in commit cb24dc8 (auth/admin/core + clients + drizzle.config + translations.test), task 02.2 landed in commit 40ee1a0 (spec/search/recipe/industry + barrel + spec-field.test); continuation handled cleanly
- (01-03) drizzle-kit migration applied to live Neon dev branch (Postgres 17.8, neondb/neondb_owner) — 24 public-schema tables + drizzle.__drizzle_migrations row 1 with hash 853f1a4e... tagged 0000_phase1_foundations
- (01-03) Env loading via .env.local (Next.js convention): drizzle.config.ts and tests/_fixtures/load-env.ts explicitly load .env.local first (dotenv's default only reads .env)
- (01-03) Task 03.2 executed autonomously (not checkpoint-paused) — executor prompt explicitly authorized live-DB migration; target branch was verified empty via read-only pg_tables query before DDL ran
- (01-03) Plan test bodies adjusted for drizzle-orm's error wrapping: NeonDbError with { code, constraint } lives on err.cause, not outer message. Tests assert against the joined chain; required regex literals preserved in source.
- (01-03) tests/_fixtures/load-env.ts fills placeholder AUTH_SECRET/AUTH_RESEND_KEY/RESEND_FROM_EMAIL defaults so @/env boundary passes at test-boot until plan 01-05 wires Auth.js
- (01-04) next.config.mjs → next.config.ts (Rule 3). Plan 01-01's `import './src/env.js'` never resolved (only env.ts exists) so the Zod env validator silently never ran at build/dev boot. Plan 04 renamed + converted to TS per t3-oss/env-nextjs Next.js guide. All downstream plans can now rely on fail-fast env validation at config load.
- (01-04) .env.local augmented with placeholder AUTH_SECRET/AUTH_RESEND_KEY/RESEND_FROM_EMAIL (same pattern as tests/_fixtures/load-env.ts from 01-03) so pnpm dev / pnpm build load next.config.ts past Zod without source-level schema changes. Plan 01-05 replaces with real secrets.
- (01-04) DEF-01 logged to .planning/phases/01-foundations/deferred-items.md — tailwind v4 + @tailwindcss/postcss 4.0.0 transitive skew with @tailwindcss/node/oxide 4.2.3 breaks globals.css compilation. Pre-existing from plan 01-01. Blocks `pnpm build` + dev-server page render. Recommended fix: upgrade both to ^4.2.3 OR pnpm.overrides pin. Fold into plan 01-05 pre-flight.
- (01-04) DEF-02 logged to deferred-items.md — .env.local missing Auth/Resend secrets is the expected pre-plan-01-05 state; placeholders in place as the interim workaround.
- (01-04) E2E specs for locale redirect use real assertions (not test.fixme) with TODO(01-06) comment; plan 06 will flip the 2 redirect-behavior tests from failing to passing once middleware lands.
- (01-05) Auth.js v5 edge-split locked: src/lib/auth.config.ts imports only next-auth/providers/resend + type NextAuthConfig; Node-only modules enter ONLY via dynamic await import() inside sendVerificationRequest. Middleware (plan 06) can import auth.config.ts safely. `pnpm build` survives.
- (01-05) Session interface augmented with `sessionToken?: string` via `declare module 'next-auth'` so requireAdmin() can look up sessions.absoluteExpires by token without a second cookie read. Canonical Auth.js v5 pattern for extending the session shape.
- (01-05) Server Action returns void (not `{ ok } | { error }`) because React 19 DOM typings reject non-void returns on `<form action={fn}>` in RSCs. Phase 2 will reintroduce discriminated result via useActionState on a client component (deferred for proper check-your-email UX). Also aligns with anti-enumeration — unknown emails silently succeed.
- (01-05) T-AUTH-02 inline signInCheck() helper replicates the auth.ts query 1:1 rather than invoking the Auth.js-constructed callback post-hoc. Auth.js v5 doesn't expose a typed way to pull the composed signIn callback out of NextAuth()'s return — the plan and the test both acknowledge this and keep the two in-sync-by-review.
- (01-05) 15s per-test timeout on live-DB tests (cold Neon HTTP connection on first query exceeds 5s default). Vitest 4 moved timeout from describe-option-object to `it(name, fn, timeout)` 3rd positional arg.
- (01-05) bootstrapAdmin() enforces D-12 verbatim with a SELECT 1 FROM admin_user LIMIT 1 pre-check BEFORE insert (line 32 in src/lib/bootstrap.ts < line 44). If ANY admin exists, bootstrap no-ops even if BOOTSTRAP_ADMIN_EMAIL is a different address — protects against stale env var post-legitimate-invites. onConflictDoNothing handles the narrow concurrent-cold-start race.
- (02-01) Drizzle migration 0001_overrated_shiva.sql applied to Neon dev branch. Hand-authored backfill UPDATE on line 38 (drizzle-kit doesn't generate data migrations); Open Q §1 RESOLVED Option B (literal CONTEXT D-11 — product.status as own column with CHECK + backfill from publishedAt); Open Q §2 RESOLVED Option A (sibling productTranslationFieldFlags scoped to product translations only for v1); Open Q §7 RESOLVED partial-unique on spec_field(category_id, key) WHERE deleted_at IS NULL; CONTEXT D-15 amended (sessions.absoluteExpires reused, no schema change).
- (02-01) pgView product_translation_completeness uses `sf.required` not `sf.is_required` — Phase-1 spec_fields.ts line 53 declares `required: boolean()` unprefixed; plan's <action> block authorized adjusting SQL identifiers to match actual schema. View resolves cleanly on live DB.
- (02-01) psql replaced with Node-based verification harness (scripts/verify-02-01-migration.ts) since psql isn't on the Windows developer's PATH. Uses Drizzle/Neon HTTP `db.execute(sql\`...\`)` with `.rows` access (same shape as Phase-1 schema-push-smoke.test.ts). 8 checks PASS. Pattern reusable for future plans needing pg_class/information_schema-level verification.
- (02-01) DEF-2-01 logged to .planning/phases/02-admin-panel/deferred-items.md — cold-Neon HTTP first-query timeout on tests/db/locale-constraint.test.ts + tests/db/spec-values.test.ts at 5012ms (default vitest 5s timeout). Pre-existing Phase-1 issue; plan 01-05 documented the same root cause and added 15s timeouts on its OWN test but didn't retroactively patch the older Phase-1 test files. Fix plan: 6-line edit in plan 02-02 (or follow-up) adding 15_000 3rd-arg timeouts to 6 affected `it()` calls. NOT a 02-01 regression — re-running warmed produces 42/42 in 3.25s.

### Pending Todos

None yet.

### Blockers/Concerns

Research flags carried into planning:

- Phase 1: Verify Next.js 16 caching API names at scaffold (`unstable_cache`, `revalidateTag`, `"use cache"`); confirm Neon transaction-mode pooling posture with Auth.js session writes
- Phase 2: Budget a design spike for the spec-schema editor (rename-as-migration, type-change preview, delete-with-impact-count)
- Phase 3: Decide Uzbek FTS morphology (`simple` adequacy vs custom dictionary). [Resolved Phase-1: default locale is bare `uz`, fallback chain `uz → ru → en`]

## Deferred Items

Items acknowledged and carried forward during execution:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| deps / build | ~~DEF-01 — tailwindcss@4.0.0 + @tailwindcss/postcss@4.0.0 skew with transitive @tailwindcss/node/oxide@4.2.3 breaks globals.css compilation~~ | **RESOLVED 2026-04-21** (commit `31062b4` — bumped both to exact 4.2.3; `pnpm build`, `typecheck`, `vitest` 29/29, `dev` all green) | Plan 01-04 |
| env / auth | ~~DEF-02 — .env.local lacks AUTH_SECRET/AUTH_RESEND_KEY/RESEND_FROM_EMAIL~~ | **RESOLVED 2026-04-21** (developer populated real values in .env.local before plan 01-05 ran; pnpm build/typecheck/vitest all loaded via real env at boot during plan 01-05 commits `862bc15`/`75d6387`/`1fa815d`) | Plan 01-04 |
| checkpoint / auth | DEF-03 — Task 06.3 magic-link round-trip manual verification (FOUND-05 acceptance) not yet run — requires bootstrapAdmin() to have seeded admin_user, which plan 07's instrumentation.ts boot hook will provide (or developer runs bootstrapAdmin() manually once) | Pending plan 01-07 | Plan 01-06 |

## Session Continuity

Last session: 2026-04-28T00:00:00Z
Stopped at: Completed 02-01 SCHEMA-MIGRATION — drizzle/0001_overrated_shiva.sql applied to Neon dev branch via `pnpm drizzle-kit migrate` (drizzle.__drizzle_migrations row #2 hash 4cadf343caa831e3...). Migration adds product.status TEXT NOT NULL DEFAULT 'draft' + CHECK (status IN ('draft','published')) with hand-authored backfill UPDATE FROM publishedAt; admin_invite + spec_field_group + spec_field_group_translations + product_translation_field_flags tables; spec_field.deleted_at + spec_field.group_id columns; partial-unique spec_field(category_id, key) WHERE deleted_at IS NULL (replacing the Phase-1 non-partial); product_translation_completeness pgView using `sf.required` (Phase-1 column name). Verification: scripts/verify-02-01-migration.ts (Node-based equivalent of psql checks since psql is not on PATH) reports all 8 checks PASS. Test suite 42/42 green against migrated DB (warm Neon — cold-start hits a known pre-existing 5s timeout on 2 Phase-1 tests, logged as DEF-2-01 in `.planning/phases/02-admin-panel/deferred-items.md`, fix planned for plan 02-02). Three deviations from plan auto-fixed in this session (Rule-3 psql replacement, Rule-1 bug in initial script's `.rows` access, Rule-2 missing Phase-2 deferred-items.md). 4 commit hashes total: 93b20c4 (Task 1.1) + a5861f3 (Task 1.2) + a33ad59 (Task 1.3 prep) + plan-metadata commit (this session). Phase 2 has 17 plans remaining: 02-02 ADMIN-SHELL is unblocked next.
Resume file: .planning/phases/02-admin-panel/02-02-ADMIN-SHELL.md
