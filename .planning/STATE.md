---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Phase 02 Plan 05 LIB-REVALIDATION COMPLETE — typed cache-invalidation helpers for the D-10 tag scheme landed. src/lib/revalidation.ts ships 7 helpers (revalidateProduct/Category/CategoryMove/Manufacturer/SpecField/SpecFieldGroup/SubmissionsCollection) all routing through a local tag() wrapper that defaults the Next 16 second-arg profile to 'max'. revalidateCategoryMove implements the D-12 fan-out (old parent + new parent + moved + categories-tree + sitemap) null-safe on either parent slot — top-level moves never emit a stray category:null tag. revalidateSubmissionsCollection ships as an intentional no-op placeholder (D-10 has no public submissions tag in v1; admin uses revalidatePath when needed) so Wave-2/3/4 callers can call revalidate*(...) uniformly without special-casing submissions. tests/lib/revalidation.test.ts ships 9 vi.mock('next/cache')-based unit specs locking the exact tag set + 'max' profile + cardinality for every helper, with both null-old-parent and null-new-parent specs for revalidateCategoryMove. Full vitest suite is now 63/63 (was 54/54 + 9 new); tsc plan-relevant clean (only the 7 pre-existing 02-01 script TS2532 errors remain, out-of-scope per CLAUDE.md scope-boundary). 2 deviations auto-fixed (both Rule-1 plan internal-spec discrepancies): (1) revalidateProduct fans out 4 tags including search-index per the plan's <action> + <behavior> blocks (the <truths> bullet listed only 3 — doc lag); (2) acceptance criterion `grep -c 'revalidateTag(' returns 0` interpreted as intent (no callsites outside the wrapper); the wrapper itself MUST call revalidateTag once, comments rephrased so the chokepoint count is unambiguous (literal grep returns 1). 2 commits: 6bc879e (TDD RED test) + c70bf46 (TDD GREEN impl). 13 plans remaining for Phase 2. Next: 02-06 (Wave-1 final cross-cutting plan).
last_updated: "2026-04-28T07:48:00Z"
last_activity: 2026-04-28 -- 02-05 LIB-REVALIDATION: 7 typed revalidate* helpers (Next 16 2-arg form) + 9 vi.mock unit specs; 2 commits (TDD RED + GREEN). 13 plans remaining for Phase 2. /gsd-execute-phase 2 resumes at 02-06.
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 12
  completed_plans: 12
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.
**Current focus:** Phase 1 — Foundations

## Current Position

Phase: 2 of 5 (Admin Panel) — IN PROGRESS
Plan: 5 of 18 COMPLETE (02-01 SCHEMA-MIGRATION + 02-02 ADMIN-SHELL + 02-03 PROXY-SESSION-CAP + 02-04 LIB-AUDIT + 02-05 LIB-REVALIDATION); Wave 1 has 1 more plan pending (02-06)
Status: 7 typed revalidate* helpers live in src/lib/revalidation.ts (D-10 + D-12 tag fan-out, Next 16 2-arg form, null-safe parent slots in revalidateCategoryMove). Wave-2/3/4 mutation actions can now `import { revalidateProduct, ... } from '@/lib/revalidation'` and call them AFTER `dbTx.transaction(...)` returns. Combined with withAdminAction (02-04) + logAudit (02-04), the two cross-cutting concerns every admin Server Action depends on are now live; 02-06 closes the Wave-1 cross-cutting set. OPS-01 wired here but not acceptance-complete until plan 02-17 Playwright e2e gate.
Last activity: 2026-04-28 -- 02-05 LIB-REVALIDATION: 7 helpers + 9 vi.mock unit specs; 2 commits (TDD RED + GREEN)

Progress: [█████████████] Phase 01 done + 02-01..02-05 done (12 of 25 known plans complete, 33%)

## Performance Metrics

**Velocity:**

- Total plans completed: 12 (7 Phase-1 + 5 Phase-2)
- Average duration: ~36 min
- Total execution time: ~6.29 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundations | 7 | ~289 min | ~50 min* |
| 2. Admin Panel | 5 | ~88 min | ~18 min |

*Phase 1 average computed across 6 timed plans (01-01..01-06); 01-07 timing not separately tracked.*

**Recent Trend:**

- Last 10 plans: 01-02 (~95 min), 01-03 (~70 min), 01-04 (~45 min), 01-05 (~35 min), 01-06 (~30 min), 02-01 (~25 min), 02-02 (~30 min), 02-03 (~5 min), 02-04 (~25 min), 02-05 (~3 min)
- 02-05 was the fastest plan to date (~3 min) — small surface (one lib + one test), tight TDD loop, no live-DB integration. Two minor Rule-1 plan internal-spec discrepancies auto-resolved (truths-vs-action tag count for revalidateProduct; acceptance-criterion grep count interpretation re: chokepoint wrapper).
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
- (02-05) D-10 + D-12 tag fan-out centralized as 7 typed helpers in src/lib/revalidation.ts. Every callsite goes through one local `tag()` wrapper that defaults the Next 16 second-arg profile to `'max'` — single chokepoint to add observability or swap profiles in one line without touching seven helpers. Anti-pattern note (Pitfall #2): never call inside `dbTx.transaction(...)`; revalidate AFTER commit.
- (02-05) revalidateCategoryMove (D-12) is null-safe on BOTH parent slots — top-level moves (no parent on either side) skip the NULL slot and never emit a stray `category:null` cache thrash tag. Two unit specs lock both directions (null-old-parent and null-new-parent); the canonical full-fanout spec asserts 5 calls.
- (02-05) revalidateProduct fans out 4 tags (product:<id>, products-list, sitemap, search-index) — NOT 3. The plan's <truths> bullet listed 3, but the plan's <action> code AND <behavior> Test 1 both include `search-index` as the fourth tag. Implementation matches the canonical <action> shape; search-index participates because the per-locale tsvector backs parametric search and product translations write tsvector rows in plan 02-08+.
- (02-05) revalidateSubmissionsCollection is an intentional no-op placeholder (D-10 has no public submissions tag in v1; admin uses revalidatePath when needed). Kept as a symmetric API so Wave-2/3/4 callers can call revalidate*(...) for every entity uniformly without special-casing submissions.
- (02-05) Acceptance criterion `grep -c 'revalidateTag(' src/lib/revalidation.ts returns 0` is unsatisfiable as-written — the wrapper itself MUST call revalidateTag once. Interpretation: criterion's intent is "no callsites outside the wrapper" (single chokepoint); satisfied because the literal grep returns 1 = exactly one wrapper call. Comments rephrased to avoid mentioning the literal `revalidateTag(` substring so the chokepoint count is unambiguous.

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

Last session: 2026-04-28T07:48:00Z
Stopped at: Completed 02-05 LIB-REVALIDATION — typed cache-invalidation helpers for the D-10 tag scheme. src/lib/revalidation.ts exports 7 helpers (revalidateProduct / Category / CategoryMove / Manufacturer / SpecField / SpecFieldGroup / SubmissionsCollection); every callsite routes through a local `tag()` wrapper that defaults the Next 16 second-arg profile to `'max'` (single chokepoint for future observability; canonical Next 16 2-arg signature `revalidateTag(name, profile)` — single-arg form is TS-error in Next 16). revalidateCategoryMove implements the D-12 fan-out (old parent + new parent + moved + categories-tree + sitemap) null-safe on EITHER parent slot — top-level moves never emit a `category:null` tag. revalidateSubmissionsCollection is an intentional no-op placeholder (D-10 has no public submissions tag in v1) so Wave-2/3/4 callers can call revalidate*(...) for every entity uniformly. tests/lib/revalidation.test.ts ships 9 vi.mock('next/cache')-based unit specs locking the exact tag set + 'max' profile + cardinality for every helper, including both null-old-parent and null-new-parent specs for revalidateCategoryMove (4 calls each — no category:null). pnpm vitest run 63/63 green (was 54/54 + 9 new); pnpm tsc --noEmit plan-relevant clean (only the 7 pre-existing 02-01 script TS2532 errors remain, out-of-scope per CLAUDE.md scope-boundary). 2 deviations auto-fixed (both Rule-1 — internal plan-spec discrepancies): (1) revalidateProduct fans out 4 tags including `search-index` per the plan's canonical <action> code + <behavior> Test 1 (the <truths> bullet listed only 3 — doc lag); (2) acceptance criterion `grep -c 'revalidateTag(' returns 0` interpreted as intent "no callsites outside the wrapper" (the wrapper itself MUST call revalidateTag once); comments rephrased to avoid mentioning the literal substring so the chokepoint count is unambiguous (literal grep now = 1 = the canonical wrapper call). 2 task commits: 6bc879e (TDD RED test) + c70bf46 (TDD GREEN impl). Wave-2/3/4 mutation actions can now `import { revalidateProduct, ... } from '@/lib/revalidation'` and call them AFTER `dbTx.transaction(...)` returns — combined with withAdminAction (02-04) + logAudit (02-04), the cross-cutting concerns every admin Server Action depends on are now live (02-06 closes the Wave-1 cross-cutting set). OPS-01 wired here; not acceptance-complete until the plan 02-17 Playwright e2e gate.
Resume file: .planning/phases/02-admin-panel/02-06-*.md
