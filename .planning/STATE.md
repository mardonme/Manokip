---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 01-04 (next-intl v4 routing + [locale] layout + setRequestLocale + generateStaticParams + next/font Inter + Analytics/SpeedInsights mount + 3-locale dictionaries + 8 e2e specs seeded + next.config.mjs→next.config.ts Rule 3 fix + DEF-01 tailwind skew + DEF-02 .env.local placeholders documented); plan 01-05 (Auth.js v5 + Resend magic-link + signIn callback + bootstrapAdmin) is next
last_updated: "2026-04-21T21:10:00Z"
last_activity: 2026-04-21 -- Phase 01 plan 04 executed (next-intl routing SSOT, [locale] layout with notFound allowlist + static params + Vercel Analytics/SpeedInsights, uz/ru/en message dicts, 8 Playwright specs for FOUND-03/FOUND-07, next.config.ts replacing broken next.config.mjs — env validator now actually triggers at boot)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 7
  completed_plans: 4
  percent: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.
**Current focus:** Phase 1 — Foundations

## Current Position

Phase: 1 of 5 (Foundations)
Plan: 4 of 7 in current phase (01-01 + 01-02 + 01-03 + 01-04 complete)
Status: Executing
Last activity: 2026-04-21 -- Phase 01 plan 04 executed (next-intl v4 routing single-source-of-truth, [locale] layout with hasLocale→notFound allowlist + setRequestLocale + generateStaticParams + next/font Inter + <Analytics /> + <SpeedInsights />, three-locale message dictionaries with common/auth/admin namespaces, 8 Playwright specs for locale redirect + observability, next.config.mjs→next.config.ts conversion that actually triggers the @/env Zod validator at boot, deferred-items.md recorded DEF-01 tailwind v4 transitive skew + DEF-02 .env.local Auth/Resend placeholders)

Progress: [█████░░░░░] 57%

## Performance Metrics

**Velocity:**

- Total plans completed: 4
- Average duration: ~56 min
- Total execution time: 3.73 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundations | 4 | ~224 min | ~56 min |

**Recent Trend:**

- Last 5 plans: 01-01 (14 min), 01-02 (~95 min across two executor sessions), 01-03 (~70 min), 01-04 (~45 min)
- Trend: plan 01-04 surfaced a latent plan-01-01 bug (next.config.mjs `import './src/env.js'` never resolved → env validator never ran at boot). Fix was clean (rename .mjs→.ts + bare TS import). That cascaded into exposing DEF-01 (tailwind v4 transitive skew) and DEF-02 (.env.local Auth/Resend gaps) — both logged, neither caused by plan 04. Source-level deliverables shipped complete and typecheck-clean.

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
| deps / build | DEF-01 — tailwindcss@4.0.0 + @tailwindcss/postcss@4.0.0 skew with transitive @tailwindcss/node/oxide@4.2.3 breaks globals.css compilation; blocks `pnpm build` + page render in dev. See `.planning/phases/01-foundations/deferred-items.md`. Fix: upgrade both to ^4.2.3 or pnpm.overrides pin. | open | Plan 01-04 |
| env / auth | DEF-02 — .env.local lacks AUTH_SECRET/AUTH_RESEND_KEY/RESEND_FROM_EMAIL; plan 01-04 added gitignored placeholders as interim. Plan 01-05 replaces with real values. | open (expected resolution: plan 01-05) | Plan 01-04 |

## Session Continuity

Last session: 2026-04-21T21:10:00Z
Stopped at: Completed 01-04 (next-intl v4 locale routing SSOT, [locale] layout shell with setRequestLocale + hasLocale→notFound + generateStaticParams + next/font Inter + Analytics/SpeedInsights, 3-locale message dicts, 8 Playwright e2e specs seeded for FOUND-03/FOUND-07, next.config.mjs→next.config.ts Rule 3 fix that actually activates @/env Zod validation at boot, DEF-01 tailwind skew + DEF-02 env placeholders logged); plan 01-05 (Auth.js v5 edge-split + Resend magic-link + signIn callback + bootstrapAdmin + login/admin pages) is next.
Resume file: .planning/phases/01-foundations/01-05-PLAN.md
