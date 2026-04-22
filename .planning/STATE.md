---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01-05 (Auth.js v5 edge-split + Resend magic-link + signIn admin-gate + requireAdmin + bootstrapAdmin + login/admin pages + T-AUTH-02 integration test); plan 01-06 (middleware.ts locale + admin gate + Cloudinary sign endpoint + magic-link round-trip e2e) is next
last_updated: "2026-04-21T22:30:00Z"
last_activity: 2026-04-21 -- Phase 01 plan 05 executed (Auth.js v5 edge-split at src/lib/auth.config.ts (Edge-safe) + src/lib/auth.ts (Node + DrizzleAdapter + session callback stamps sessions.absoluteExpires + requireAdmin enforces D-09 7d absolute cap + deletes expired sessions), Resend magic-link via sendVerificationRequest override rendering src/emails/magic-link.tsx (3-locale React Email template), src/lib/bootstrap.ts with D-12 verbatim SELECT 1 FROM admin_user LIMIT 1 pre-check + onConflictDoNothing belt-and-suspenders, login + admin minimal pages under /[locale]/, 'use server' Zod-validated action wired to <form action={requestMagicLink}>, tests/db/auth-signin-callback.test.ts with 4 cases against live Neon exercising T-AUTH-02 contract; DEF-02 resolved as .env.local now has real Auth/Resend values; pnpm build green 11 static pages 5.8s, pnpm typecheck 0, pnpm vitest run 33/33)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 7
  completed_plans: 5
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.
**Current focus:** Phase 1 — Foundations

## Current Position

Phase: 1 of 5 (Foundations)
Plan: 5 of 7 in current phase (01-01 + 01-02 + 01-03 + 01-04 + 01-05 complete)
Status: Executing
Last activity: 2026-04-21 -- Phase 01 plan 05 executed (Auth.js v5 edge-split + Resend magic-link + signIn admin-gate + D-09 dual session caps + bootstrapAdmin with D-12 verbatim pre-check + login/admin placeholder pages + T-AUTH-02 integration test against live Neon with 4 cases)

Progress: [█████░░░░░] 71%

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: ~52 min
- Total execution time: 4.32 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundations | 5 | ~259 min | ~52 min |

**Recent Trend:**

- Last 5 plans: 01-01 (14 min), 01-02 (~95 min across two executor sessions), 01-03 (~70 min), 01-04 (~45 min), 01-05 (~35 min)
- Trend: plan 01-05 was the fastest phase-1 plan to-date (35 min). Three Rule-3 blockers auto-fixed inline (Auth.js Session type augmentation for sessionToken, React 19 void-return shape on <form action>, Vitest 4 timeout API shift from object-arg to 3rd-positional). All three were mechanical typing/API alignment — zero semantic deviation from plan. Edge-split survived `pnpm build` cleanly (5.8s, 11 static pages). Test suite grew 29 → 33 (4 new T-AUTH-02 cases).

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

## Session Continuity

Last session: 2026-04-21T22:30:00Z
Stopped at: Completed 01-05 (Auth.js v5 edge-split locked at src/lib/auth.config.ts with ONLY `next-auth/providers/resend` + type-only NextAuthConfig as static imports; src/lib/auth.ts composes DrizzleAdapter + session.strategy='database' + maxAge=86400 + signIn admin-gate + session callback stamping absoluteExpires + requireAdmin rejecting past-7d sessions; src/lib/bootstrap.ts with D-12 verbatim SELECT 1 pre-check + onConflictDoNothing; src/emails/magic-link.tsx 3-locale React Email template; src/app/api/auth/[...nextauth]/route.ts GET/POST re-export; src/app/[locale]/login/page.tsx + actions.ts (Zod-validated Server Action delegating to signIn('resend', ...)); src/app/[locale]/admin/page.tsx gated by requireAdmin(); tests/db/auth-signin-callback.test.ts with 4 cases against live Neon). DEF-02 resolved — real Auth/Resend values populated in .env.local before this plan ran. pnpm build 0 in 5.8s (11 static pages + 2 dynamic: /api/auth/[...nextauth] + /[locale]/admin). pnpm typecheck 0. pnpm vitest run 33/33 in ~3s. Plan 01-06 (middleware.ts locale redirect + admin gate + Cloudinary sign endpoint + magic-link round-trip e2e) is next.
Resume file: .planning/phases/01-foundations/01-06-PLAN.md
