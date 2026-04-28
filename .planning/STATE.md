---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Phase 02 Plan 04 LIB-AUDIT COMPLETE — three cross-cutting concerns landed for every Wave-2/3/4 mutation: src/lib/audit.ts ships `logAudit(tx, args)` (atomic-with-mutation audit row writer) + `AUDIT_ACTIONS` 13-value closed const tuple. src/lib/server-action.ts ships `withAdminAction(schema, handler)` — universal Server Action wrapper composing requireAdmin -> Zod parse -> headers ctx -> discriminated `{ ok:true, data } | { ok:false, error: 'validation'|'unauthorized'|'unknown' }` return. src/lib/auth.ts gained Node-only header marker (W9), `events.signIn` -> 'login' audit, `events.signOut` -> 'logout' audit (looks up email by session.userId since AdapterSession does not carry it), and now delegates D-15 cap check to the new src/lib/admin-session-cap.ts seam. The seam was extracted as a next-auth-free module so vitest can exercise enforceAbsoluteCap against live Neon — direct vi.importActual on @/lib/auth fails because next-auth's lib/env.js imports next/server. enforceAbsoluteCap emits 'session_revoked' audit row before deleting the cap-expired sessions row + throwing Unauthorized — closes Open Q §5 of 02-RESEARCH. tests/_fixtures/admin-session.ts ships createActiveAdminSession({ absoluteExpiresOffsetSec?, expiresOffsetSec?, role?, active? }) returning { email, sessionToken, cookieValue, userId, cleanup } — THE Wave-0 fixture every Wave-2/3/4 action integration test depends on. Tests: 12 new (3 audit integration + 5 server-action unit + 4 require-admin integration) bringing full suite to 54/54 green. tsc plan-relevant clean; Edge bundle compiles in 10.2s; same 7 pre-existing 02-01 script TS2532 errors remain out-of-scope per CLAUDE.md scope-boundary. 3 deviations auto-fixed: (1) Rule-3 blocker — vitest 4 dropped --reporter=basic; substituted default; (2) Rule-3 blocker — Node 22 global WebSocket fails Neon serverless handshake; added ws + @types/ws devDeps + neonConfig.webSocketConstructor shim in tests/_fixtures/load-env.ts (canonical Neon CONFIG.md fix; zero runtime impact); (3) testable-seam refactor — extracted enforceAbsoluteCap into its own module so vitest can test it without importing next-auth (behavior byte-identical to plan 01-05 requireAdmin). 5 commits: 36078a5 (Task 4.1 RED logAudit) + c369b68 (Task 4.1 GREEN logAudit impl) + 1a0a0e0 (Task 4.2 RED withAdminAction) + b562456 (Task 4.2 GREEN withAdminAction + auth.ts events) + c637cd8 (Task 4.3 fixture + enforceAbsoluteCap seam). Next: 02-05 LIB-REVALIDATION (typed revalidateTag helpers, 14 plans remaining for Phase 2).
last_updated: "2026-04-28T12:38:00Z"
last_activity: 2026-04-28 -- 02-04 LIB-AUDIT: logAudit + withAdminAction + auth events + admin-session fixture + enforceAbsoluteCap seam. 14 plans remaining for Phase 2. /gsd-execute-phase 2 resumes at 02-05.
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 11
  completed_plans: 11
  percent: 31
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.
**Current focus:** Phase 1 — Foundations

## Current Position

Phase: 2 of 5 (Admin Panel) — IN PROGRESS
Plan: 4 of 18 COMPLETE (02-01 SCHEMA-MIGRATION + 02-02 ADMIN-SHELL + 02-03 PROXY-SESSION-CAP + 02-04 LIB-AUDIT); Wave 1 has 2 more plans pending (02-05..02-06)
Status: logAudit + withAdminAction wrapper + Auth.js login/logout/session_revoked events + admin-session test fixture all live. Wave-0 deps for plans 02-08..02-15 closed. tests/_fixtures/admin-session.ts now exists — plans 02-02 and 02-03 e2e fixme probes can be flipped (NOT this plan's responsibility per orchestrator instruction).
Last activity: 2026-04-28 -- 02-04 LIB-AUDIT: logAudit + withAdminAction + auth events + admin-session fixture + enforceAbsoluteCap seam; 5 commits (Task 4.1 RED+GREEN, Task 4.2 RED+GREEN, Task 4.3)

Progress: [████████████] Phase 01 done + 02-01..02-04 done (11 of 25 known plans complete, 31%)

## Performance Metrics

**Velocity:**

- Total plans completed: 11 (7 Phase-1 + 4 Phase-2)
- Average duration: ~38 min
- Total execution time: ~6.24 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundations | 7 | ~289 min | ~50 min* |
| 2. Admin Panel | 4 | ~85 min | ~21 min |

*Phase 1 average computed across 6 timed plans (01-01..01-06); 01-07 timing not separately tracked.*

**Recent Trend:**

- Last 10 plans: 01-01 (14 min), 01-02 (~95 min), 01-03 (~70 min), 01-04 (~45 min), 01-05 (~35 min), 01-06 (~30 min), 02-01 (~25 min), 02-02 (~30 min), 02-03 (~5 min), 02-04 (~25 min)
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
- (02-03) proxy.ts now enforces D-15 dual cap server-side via one Neon HTTP read per /[locale]/admin/* request. Reads sessions.expires (24h idle, refreshed by Auth.js DrizzleAdapter) AND sessions.absolute_expires (7d absolute, lazily stamped by src/lib/auth.ts session callback). Either expired triggers 307 + Max-Age=0 cookie clear for both production and dev cookie names. NULL absolute_expires grandfathered (next session read stamps it).
- (02-03) sessions.absolute_expires column reused (no schema change). D-15 step 3 was amended 2026-04-27 to confirm the column already populated by the Phase-1 session callback is canonical — mathematically equivalent to the originally-prescribed `created_at + 7d` formulation.
- (02-03) Edge constraint preserved: proxy.ts imports neon() from @neondatabase/serverless directly with process.env.DATABASE_URL!. The forbidden modules (@/db/client, @/env) are mentioned only in explanatory comments documenting why they're not imported. pnpm build Compiled step succeeds in 9.8s.
- (02-03) Authored 3 e2e test.fixme probes in tests/e2e/admin-session-cap.spec.ts (plan example showed 2; added 24h-idle case for symmetry with proxy.ts implementation that checks BOTH expires and absolute_expires). Full bodies in comments alongside TODO(02-04) markers. Activates when plan 02-04 lands tests/_fixtures/admin-session.ts; flip is one-line edit per test (drop .fixme, uncomment body).
- (02-03) Substituted `pnpm tsc --noEmit` + `pnpm build` (compile step) + `pnpm vitest run` for the plan's `pnpm vitest run tests/lib/require-admin.test.ts` because the latter file doesn't exist yet (plan 02-04 lands it). Substituted commands cover the same intent — typecheck clean, Edge bundle compiles, suite still green — without forward-referencing a non-existent test.
- (02-04) Open Q §5 LOCKED — login/logout/session_revoked emit from three places: `events.signIn` (login), `events.signOut` (logout, with auth_users lookup since AdapterSession does not carry email), `enforceAbsoluteCap` (session_revoked, before sessions.delete + throw). All three share the dbTx.transaction(tx -> logAudit(tx, ...)) shape with try/catch + console.error so audit-write failures cannot bypass the security gate or break user-visible auth flows.
- (02-04) Extracted enforceAbsoluteCap into src/lib/admin-session-cap.ts as a next-auth-free module — testable seam, NOT a contract change. requireAdmin() in src/lib/auth.ts delegates via one-line call. Required because vi.importActual on @/lib/auth fails (next-auth's lib/env.js imports next/server which vitest cannot resolve outside Next runtime). Same posture as Phase-1 auth-signin-callback.test.ts which replicated the query inline rather than importing auth.ts.
- (02-04) Added ws + @types/ws devDeps + neonConfig.webSocketConstructor shim in tests/_fixtures/load-env.ts — Node 22's global WebSocket fails Neon serverless handshake (canonical Neon CONFIG.md fix). Zero runtime impact (vitest setupFiles only).
- (02-04) Closed AUDIT_ACTIONS const tuple of 13 v1 actions; AuditAction = (typeof AUDIT_ACTIONS)[number]. Discoverable at runtime (audit log viewer dropdown in plan 02-15) and lints typos at compile time. Tx type inferred via `Parameters<Parameters<typeof dbTx.transaction>[0]>[0]` so consumers cannot accidentally pass the regular dbTx client.
- (02-04) withAdminAction returns discriminated `{ ok:true, data: O } | { ok:false, error: 'validation'|'unauthorized'|'unknown' }`. requireAdmin runs FIRST (before Zod parse) so unauth callers don't learn schema shape from validation errors (T-02-04-02 Spoofing). Zod allowlist before handler (T-02-04-01 mass-assignment). Matches React 19 useActionState contract.
- (02-04) Edge isolation guard (W9): src/lib/auth.ts gained top-of-file marker `// Node-only — never import from Edge contexts (proxy.ts uses @/lib/auth.config instead)`. proxy.ts contains zero `from '@/lib/auth'` imports — only @/lib/auth.config. grep -cE "from [\"']@/lib/auth[\"']" proxy.ts returns 0.
- (02-04) Vitest 4 dropped `--reporter=basic` (used by plan's <verify> blocks). Substituted default reporter; same green/red signal. Pattern applies plan-wide; future plans should drop the flag.
- (02-04) tests/_fixtures/admin-session.ts cleanup ordering: sessions (FK to auth_users) -> auth_users -> admin_user. admin_user has no FK on auth_users (D-10/D-11 — app-owned table keyed by email), so its order only matters for symmetry. Idempotent across back-to-back runs (verified — no leaked rows).
- (02-04) Acceptance criterion `grep -cE 'fixme|\.skip' tests/lib/require-admin.test.ts returns 0` satisfied — no fixme/skip in the committed file. The plan's fallback (it.fixme + TODO(02-04.1)) was not needed because the testable-seam approach made full integration testing feasible against live Neon.

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

Last session: 2026-04-28T12:38:00Z
Stopped at: Completed 02-04 LIB-AUDIT — three cross-cutting concerns landed for every Wave-2/3/4 mutation. src/lib/audit.ts ships `logAudit(tx, args)` (atomic-with-mutation audit row writer requiring tx from dbTx.transaction lambda, type-inferred so callers can't accidentally pass the non-tx client) + `AUDIT_ACTIONS` 13-value closed const tuple + `AuditAction` derived type (D-16). src/lib/server-action.ts ships `withAdminAction(schema, handler)` — universal Server Action wrapper composing requireAdmin -> Zod parse -> headers ctx -> discriminated `{ ok:true, data } | { ok:false, error: 'validation'|'unauthorized'|'unknown' }`. T-02-04-01 (mass-assignment) mitigated via Zod allowlist; T-02-04-02 (spoofing) mitigated via requireAdmin-first ordering. src/lib/auth.ts gained Node-only header marker (W9 acceptance criterion satisfied: grep returns 1 for the marker, 0 for proxy.ts importing @/lib/auth), `events.signIn` -> 'login' audit, `events.signOut` -> 'logout' audit (looks up email by session.userId since AdapterSession doesn't carry it), and now delegates D-15 cap check to src/lib/admin-session-cap.ts. enforceAbsoluteCap was extracted into its own next-auth-free module so vitest can exercise it against live Neon — direct import or vi.importActual of @/lib/auth fails because next-auth's lib/env.js imports next/server. The seam emits 'session_revoked' audit row (try/catch wrapped so audit failures cannot bypass the cap rejection — the throw is the security gate) before deleting the cap-expired sessions row + throwing Unauthorized; closes Open Q §5 of 02-RESEARCH. tests/_fixtures/admin-session.ts ships createActiveAdminSession({ absoluteExpiresOffsetSec?, expiresOffsetSec?, role?, active? }) -> { email, sessionToken, cookieValue, userId, cleanup }. Fixture cleanup ordering: sessions -> auth_users -> admin_user; idempotent across back-to-back runs. Test coverage: tests/lib/audit.test.ts (3 specs, integration), tests/lib/server-action.test.ts (5 specs, unit), tests/lib/require-admin.test.ts (4 specs, integration — no fixme/skip). pnpm vitest run 54/54 green (+12 new); pnpm tsc --noEmit plan-relevant clean; pnpm build Edge bundle compile step succeeds in 10.2s. Same 7 pre-existing 02-01 script TS2532 errors remain out-of-scope per CLAUDE.md scope-boundary. 3 deviations auto-fixed: (1) Rule-3 — vitest 4 dropped --reporter=basic, substituted default reporter; (2) Rule-3 — Node 22 global WebSocket fails Neon serverless handshake, added ws + @types/ws devDeps + neonConfig.webSocketConstructor shim in tests/_fixtures/load-env.ts (zero runtime impact); (3) testable-seam refactor — extracted enforceAbsoluteCap so tests can hit it without next-auth (behavior byte-identical to plan 01-05 requireAdmin). 5 task commits: 36078a5 (Task 4.1 RED) + c369b68 (Task 4.1 GREEN) + 1a0a0e0 (Task 4.2 RED) + b562456 (Task 4.2 GREEN) + c637cd8 (Task 4.3). Wave-0 deps for plans 02-08..02-15 closed; tests/_fixtures/admin-session.ts now exists so plans 02-02 admin-shell smoke + 02-03 session-cap e2e fixme probes can be flipped (NOT this plan's responsibility per orchestrator instruction).
Resume file: .planning/phases/02-admin-panel/02-05-LIB-REVALIDATION.md
