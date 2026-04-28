---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Phase 02 Plan 02 ADMIN-SHELL COMPLETE — RSC admin layout (NuqsAdapter + 8-link sidebar + email-display top bar with inline 'use server' signOut) replaces the Phase-1 'coming soon' stub. Phase-2 deps locked at exact pinned versions (@tanstack/react-table 8.21.3, nuqs 2.8.9, @dnd-kit/{core 6.3.1, sortable 10.0.0, utilities 3.2.2}). Phase-1 RHF + sonner + next-cloudinary pins unchanged. shadcn@latest init + add scaffolded 19 UI primitives under src/components/ui/* (button, input, label, textarea, select, table, dialog, alert-dialog, dropdown-menu, form, tabs, card, badge, sheet, tooltip, switch, checkbox, separator, sonner) — base-nova preset uses @base-ui/react under the hood. i18n keys (admin.nav.*, admin.topbar.signOut, admin.dashboard.*) populated for all 3 locales. e2e shell smoke spec (tests/e2e/admin-shell.spec.ts) authored eagerly with auto-skip until plan 02-04 fixture lands. DEF-2-01 cold-Neon timeout flake RESOLVED (74080e1) — 15_000 3rd-arg `it()` timeouts on 6 affected tests in tests/db/{locale-constraint,spec-values,schema-push-smoke}. Test suite 42/42 green warm; pnpm tsc --noEmit clean for plan-02-02 files. 4 commits total: b786862 (Task 2.1) + 74080e1 (DEF-2-01 fix) + 4246e36 (Task 2.2) + plan-metadata commit (this session). Next: 02-03 PROXY-SESSION-CAP.
last_updated: "2026-04-28T12:05:00Z"
last_activity: 2026-04-28 -- 02-02 ADMIN-SHELL: admin layout + sidebar + topbar + NuqsAdapter + 19 shadcn primitives + Phase-2 deps + DEF-2-01 fix. 16 plans remaining for Phase 2. /gsd-execute-phase 2 resumes at 02-03.
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 9
  completed_plans: 9
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.
**Current focus:** Phase 1 — Foundations

## Current Position

Phase: 2 of 5 (Admin Panel) — IN PROGRESS
Plan: 2 of 18 COMPLETE (02-01 SCHEMA-MIGRATION + 02-02 ADMIN-SHELL); Wave 1 has 4 more plans pending (02-03..02-06)
Status: Admin shell substrate landed — every Wave-2/3 plan now renders inside this layout. Plan 02-03 PROXY-SESSION-CAP is unblocked.
Last activity: 2026-04-28 -- 02-02 ADMIN-SHELL: admin RSC layout + sidebar + topbar + NuqsAdapter + 19 shadcn primitives + Phase-2 deps + DEF-2-01 fix; 4 commits (Task 2.1, DEF-2-01 fix, Task 2.2, plan metadata)

Progress: [██████████░] Phase 01 done + 02-01 done + 02-02 done (9 of 25 known plans complete, 25%)

## Performance Metrics

**Velocity:**

- Total plans completed: 9 (7 Phase-1 + 2 Phase-2)
- Average duration: ~44 min
- Total execution time: ~5.74 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundations | 7 | ~289 min | ~50 min* |
| 2. Admin Panel | 2 | ~55 min | ~28 min |

*Phase 1 average computed across 6 timed plans (01-01..01-06); 01-07 timing not separately tracked.*

**Recent Trend:**

- Last 8 plans: 01-01 (14 min), 01-02 (~95 min), 01-03 (~70 min), 01-04 (~45 min), 01-05 (~35 min), 01-06 (~30 min), 02-01 (~25 min), 02-02 (~30 min)
- Trend: plan 02-02 ran as a single autonomous executor session (no checkpoints since `autonomous: true`). Three minor deviations auto-fixed: (1) Rule-3 blocker — shadcn CLI's `add form` hung on dependency resolution against pinned RHF / hookform-resolvers; authored form.tsx manually using the canonical recipe with @base-ui/react substitutions; (2) Rule-3 blocker — shadcn init was interactive on preset choice; switched to `-d` (defaults flag) to skip; (3) Rule-1 bug — tests/e2e/admin-shell.spec.ts failed tsc --noEmit because the dynamic import string was statically resolvable; fixed with string-concat path so tsc skips static resolution. DEF-2-01 cold-Neon timeout flake RESOLVED in same plan (74080e1) — 15_000 3rd-arg `it()` timeouts applied to 6 affected tests in tests/db/{locale-constraint,spec-values,schema-push-smoke}. shadcn init also bumped src/app/layout.tsx (Geist font) + src/app/globals.css (@theme tokens, light/dark CSS-var palette, tw-animate-css import) — accepted as idiomatic shadcn defaults aligned with locked Tailwind v4 / next/font posture. 19 shadcn primitives installed; @base-ui/react pulled in as the base-nova preset's primitives backend (the new shadcn default — replaces @radix-ui/* in the recipe).

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
- (02-02) DEF-2-01 RESOLVED in commit 74080e1 — 15_000 3rd-arg `it()` timeouts applied to all 6 affected tests in tests/db/{locale-constraint,spec-values,schema-push-smoke}.test.ts. Same pattern Plan 01-05 used for auth-signin-callback.test.ts. Marked RESOLVED in deferred-items.md.
- (02-02) shadcn@latest init lands the new base-nova preset (default) which uses @base-ui/react instead of @radix-ui/* for primitives — fully compatible with Phase-2 plans because they import from @/components/ui/* abstractly. shadcn-ui 4.5.0 docs: https://ui.shadcn.com/docs.
- (02-02) shadcn CLI's `add form` recipe hung on dependency resolution against pinned RHF 7.73.1 / @hookform/resolvers 3.10.0; authored src/components/ui/form.tsx manually using the canonical shadcn recipe with @base-ui/react substitutions (local Label component + React.cloneElement-based Slot equivalent). Behavior matches upstream: Controller + FormProvider + ID-namespacing context.
- (02-02) Inline 'use server' Server Action for sign-out in src/components/admin/top-bar.tsx over a separate src/actions/auth.ts file — action has no shared schema, no audit log, no transaction; matches Next 16's recommended inline form-action shape. Future per-mutation actions still use the withAdminAction wrapper that 02-04 introduces.
- (02-02) AdminSidebar is a server component (zero JS for nav) — no active-link highlighting in plan 02-02. Client-side `usePathname()` highlighting can be added later in a small client island if/when needed.
- (02-02) Defense-in-depth requireAdmin(): both admin layout AND admin dashboard page call it. The Edge middleware (proxy.ts from plan 01-06) already 307-redirects unauth requests, but in-RSC checks prevent a misconfigured middleware from leaking server-rendered admin HTML. Auth.js memoizes auth() per-request via React's cache wrapper, so cost is negligible.
- (02-02) Accepted shadcn-init's bumps to src/app/layout.tsx (Geist font wiring) + src/app/globals.css (@theme tokens + light/dark CSS-var palette + tw-animate-css import). Idiomatic shadcn defaults aligned with locked Tailwind v4 / next/font posture. Final visual theme tuning is a Phase-3 design decision per CONTEXT D-Discretion.

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
| tests / cold-Neon | ~~DEF-2-01 — cold-Neon HTTP first-query 5s timeout flake on tests/db/{locale-constraint,spec-values,schema-push-smoke}~~ | **RESOLVED 2026-04-28** (commit `74080e1` — 15_000 3rd-arg it() timeouts on 6 affected tests) | Plan 02-01 |

## Session Continuity

Last session: 2026-04-28T12:05:00Z
Stopped at: Completed 02-02 ADMIN-SHELL — RSC admin layout (src/app/[locale]/admin/layout.tsx) wraps children in <NuqsAdapter> from nuqs/adapters/next/app, calls setRequestLocale + requireAdmin + getTranslations, renders AdminSidebar (server component, 8 next-intl Link nav items) + AdminTopBar (admin email display + inline 'use server' signOut form action) around <main>. Phase-2 deps locked at exact pinned versions: @tanstack/react-table 8.21.3, nuqs 2.8.9, @dnd-kit/{core 6.3.1, sortable 10.0.0, utilities 3.2.2}. Phase-1 RHF + sonner + next-cloudinary pins unchanged. shadcn@latest init (base-nova preset / @base-ui/react primitives backend, neutral baseColor, css-variables) + add scaffolded 19 UI primitives under src/components/ui/* (button, input, label, textarea, select, table, dialog, alert-dialog, dropdown-menu, form, tabs, card, badge, sheet, tooltip, switch, checkbox, separator, sonner). form.tsx authored manually because shadcn CLI's `add form` hung on dep resolution against pinned RHF (recipe is plain composition over RHF — no version-specific behavior). i18n keys (admin.nav.*, admin.topbar.signOut, admin.dashboard.{title,placeholder}) populated for all 3 locales with proper Uzbek-Latin (oʻ U+02BB), Russian Cyrillic, and English copy. e2e shell smoke spec (tests/e2e/admin-shell.spec.ts) authored eagerly with auto-skip until tests/_fixtures/admin-session.ts (plan 02-04) lands; flips on automatically when fixture file present. DEF-2-01 cold-Neon timeout flake RESOLVED in same plan (commit 74080e1) — 15_000 3rd-arg `it()` timeouts on 6 affected tests in tests/db/{locale-constraint,spec-values,schema-push-smoke}.test.ts. shadcn init also bumped src/app/layout.tsx (Geist font) + src/app/globals.css (@theme tokens, light/dark CSS-var palette, tw-animate-css import) — accepted as idiomatic shadcn defaults aligned with locked Tailwind v4 + next/font posture. Three deviations auto-fixed (Rule-3 shadcn-form CLI hang → manual authoring; Rule-3 shadcn init interactive preset → -d defaults flag; Rule-1 dynamic-import tsc resolution → string-concat path). Test suite 42/42 green warm; pnpm tsc --noEmit clean for plan-02-02 files; pnpm playwright test tests/e2e/admin-shell.spec.ts → 1 skipped (expected — fixture pending). 4 commits total: b786862 (Task 2.1) + 74080e1 (DEF-2-01 fix) + 4246e36 (Task 2.2) + plan-metadata commit (this session). Phase 2 has 16 plans remaining: 02-03 PROXY-SESSION-CAP is unblocked next.
Resume file: .planning/phases/02-admin-panel/02-03-PROXY-SESSION-CAP.md
