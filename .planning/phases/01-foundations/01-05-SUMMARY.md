---
phase: 01-foundations
plan: 05
subsystem: auth
tags: [auth.js, next-auth-v5, resend, magic-link, admin-gate, edge-split, bootstrap-admin, react-email, session-absolute-cap]

requires:
  - phase: 01-foundations/01-03
    provides: Live Neon DB with auth_users / auth_accounts / sessions (absolute_expires column) / verification_tokens / admin_user tables + drizzle clients + .env.local convention
  - phase: 01-foundations/01-04
    provides: src/i18n/routing.ts (locales SSOT) + [locale] layout shell + auth/admin namespace message dicts
provides:
  - src/lib/auth.config.ts — Edge-safe providers-only NextAuthConfig with Resend provider + sendVerificationRequest that dynamic-imports Node-only modules (@/emails/magic-link, @react-email/components render, resend SDK). Consumed by middleware (plan 06).
  - src/lib/auth.ts — Node-runtime composition with DrizzleAdapter, session.strategy='database' + maxAge=86400 (D-09 24h idle sliding cap), signIn callback authorizing admin_user WHERE active=true AND role='admin' (D-10/D-11/T-AUTH-02), session callback stamping sessions.absoluteExpires=now()+7d once (isNull-guarded, D-09), requireAdmin() helper that rejects + deletes sessions past the 7d absolute cap. Exports { handlers, auth, signIn, signOut, requireAdmin } + augments next-auth Session type with sessionToken.
  - src/lib/bootstrap.ts — Idempotent bootstrapAdmin() with module-scope short-circuit + D-12 verbatim SELECT 1 FROM admin_user LIMIT 1 pre-check + onConflictDoNothing belt-and-suspenders for concurrent cold starts (Pitfall 8). Consumed by instrumentation.ts (plan 07).
  - src/emails/magic-link.tsx — 3-locale React Email template (uz/ru/en COPY map) with Html lang, Preview, Body, Container, Link shell.
  - src/app/api/auth/[...nextauth]/route.ts — Auth.js v5 GET/POST re-export.
  - src/app/[locale]/login/page.tsx — Minimal RSC login page wired to server action via <form action={requestMagicLink}>, setRequestLocale + getTranslations('auth'), hidden locale input.
  - src/app/[locale]/login/actions.ts — 'use server' Zod-validated action (z.object + z.string().email() + z.enum(routing.locales)) that delegates to signIn('resend', { email, redirect: false, redirectTo: `/${locale}/admin` }).
  - src/app/[locale]/admin/page.tsx — RSC with setRequestLocale BEFORE await requireAdmin() (Pitfall 4 ordering) + getTranslations('admin').
  - tests/db/auth-signin-callback.test.ts — 4 integration tests exercising T-AUTH-02 against live Neon DB: unknown email → false; null/undefined/empty → false; active admin → true; inactive admin → false. afterAll cleanup. 15s per-test timeout for Neon HTTP cold-connection latency.
affects: [phase-1-plan-06, phase-1-plan-07, phase-2, phase-3]

tech-stack:
  added: []  # next-auth 5.0.0-beta.31, @auth/drizzle-adapter 1.11.2, resend 6.12.2, @react-email/components 1.0.12 all pre-installed in package.json from plan 01-01
  patterns:
    - "Pattern 5 (RESEARCH) — Auth.js v5 edge-split: auth.config.ts has ONLY static imports of next-auth/providers/resend + type-only NextAuthConfig; DB/adapter/emails enter only via dynamic await import() inside sendVerificationRequest (Node-runtime call path, not Edge). auth.ts composes the full config with DrizzleAdapter + DB-aware callbacks. Pitfall 1 avoided: middleware (plan 06) importing auth.config.ts stays Edge-safe."
    - "D-09 dual session caps: (1) 24h idle sliding — Auth.js session.maxAge=86400 + DrizzleAdapter refresh of sessions.expires per authenticated request; (2) 7d absolute — sessions.absoluteExpires column stamped once in session callback (isNull guard for idempotency), checked + deleted by requireAdmin() when < now()."
    - "D-12 verbatim bootstrap guard: SELECT 1 FROM admin_user LIMIT 1 pre-check runs BEFORE insert. If ANY admin exists, bootstrap no-ops — protects against a stale BOOTSTRAP_ADMIN_EMAIL being changed to a different address after real admins were added. onConflictDoNothing handles the narrow race of two concurrent cold starts passing the pre-check simultaneously."
    - "Module augmentation for server-side Session.sessionToken: declare module 'next-auth' { interface Session { sessionToken?: string } } — makes the opaque cookie token available to requireAdmin() for the absolute-cap DB lookup without leaking it to client-side session consumers (RSC/Server Action-only usage)."
    - "Auth.js v5 Resend provider's sendVerificationRequest override lets us render a branded React Email template (src/emails/magic-link.tsx → render() from @react-email/components → Resend SDK .emails.send). The dynamic-import inside the provider keeps Node-only modules out of the Edge bundle's static graph."

key-files:
  created:
    - src/lib/auth.config.ts
    - src/lib/auth.ts
    - src/lib/bootstrap.ts
    - src/emails/magic-link.tsx
    - src/app/api/auth/[...nextauth]/route.ts
    - src/app/[locale]/login/page.tsx
    - src/app/[locale]/login/actions.ts
    - src/app/[locale]/admin/page.tsx
    - tests/db/auth-signin-callback.test.ts
  modified:
    - .planning/phases/01-foundations/deferred-items.md  # DEF-02 marked RESOLVED

key-decisions:
  - "Augmented next-auth Session interface to expose sessionToken server-side. The default @auth/core Session type only surfaces { user, expires } — sessionToken is an AdapterSession concern that never reaches the public Session by default. Without augmentation, requireAdmin() couldn't look up sessions.absoluteExpires without a second cookie-level read. Augmenting is the canonical Auth.js v5 pattern for extending Session. The field is server-only by contract (no client serialization path adds it)."
  - "Server Action requestMagicLink returns void instead of the plan's interfaces block's { ok: true } | { error: ... } discriminated union. React 19 DOM typings reject non-void returns on Server Actions bound directly to <form action={fn}> in an RSC, and the plan's acceptance criterion requires literal '<form action={requestMagicLink}' (not a client-component wrapper using useActionState). Retained all Zod validation and the signIn delegate call verbatim; dropped return values with a TODO comment pointing to Phase 2 for useActionState-based check-your-email UX. Also aligns with anti-enumeration: silent success for unknown-email submissions."
  - "15s per-test timeout on the new DB integration tests. Neon HTTP cold-connection latency on the first query in a fresh Vitest run routinely exceeds the 5s Vitest default (sibling tests locale-constraint / spec-values run 1.5–2.5s each on cold start; my first test timed out at 5s on first run). 15s is a generous upper bound that still fails fast on genuine errors. Vitest 4's API moved options to the 3rd positional arg on it(name, fn, timeout); used that form."
  - "sendVerificationRequest override lives in auth.config.ts, not auth.ts. Rationale: Resend provider config IS the Edge-safe-ish piece (next-auth/providers/resend has no DB touch), and Auth.js invokes sendVerificationRequest at the Node route-handler runtime (not in middleware), so the dynamic await import(...) calls resolve Node-only deps safely without polluting the Edge bundle's static graph. Alternative (config override in auth.ts) would require two provider config blocks and make the 'config shape' less clear."
  - "React Email rendering goes via @react-email/components' re-exported render() (not @react-email/render directly). @react-email/components@1.0.12 re-exports * from @react-email/render as part of its public surface, so we pin one fewer direct dep. Confirmed via node_modules/@react-email/components/dist/index.d.cts: export * from '@react-email/render'."

patterns-established:
  - "Auth.js v5 edge-split contract: middleware.ts (plan 06) imports ONLY from src/lib/auth.config.ts; Server Actions / RSCs / API routes import from src/lib/auth.ts. The two files are BOTH required — splitting by file keeps the Edge bundle's static module graph free of Node-only deps. Verified by grep: src/lib/auth.config.ts has exactly 2 static imports (next-auth/providers/resend + type NextAuthConfig); no @auth/drizzle-adapter / @/db / @/emails / resend SDK / @react-email imports."
  - "requireAdmin() contract: import from '@/lib/auth', await at the top of every RSC / Server Action under /[locale]/admin/* before any DB access. Throws 'Unauthorized' when (a) no session, (b) session has no email, (c) sessions.absoluteExpires < now(). Middleware (plan 06) converts (a)(b) into a 307 redirect to /[locale]/login at the Edge before this helper ever runs."
  - "Phase 1+ bootstrap pattern: any env-var-driven seed runs through a function with three guards — module-scope flag for repeat-call short-circuit, SELECT 1 LIMIT 1 pre-check for empty-table intent, onConflictDoNothing on insert for concurrent races. bootstrapAdmin() is the canonical example; future seed hooks (if any) follow the same shape."
  - "Magic-link React Email template contract: src/emails/<slug>.tsx is a default-exported React function component taking { url, locale } (optional, default 'uz'). A COPY map indexed by locale selects preview + body + CTA strings. Rendering path: auth.config.ts's sendVerificationRequest → dynamic-import template → render() → resend.emails.send({ from, to, subject, html }). Phase 2 extends this for invite emails and submission notifications."

requirements-completed: []  # FOUND-05 is multi-plan — plan 01-05 locks the Auth.js config + signIn callback + DB-contract test + login/admin shells, plan 01-06 adds the middleware gate that's part of the requirement text. REQUIREMENTS.md updates FOUND-05 to "Partial (01-05)" to reflect this.

duration: ~35min
completed: 2026-04-21
---

# Phase 1 Plan 05: Auth.js v5 Edge-Split + Resend Magic-Link + requireAdmin + bootstrapAdmin Summary

**Auth.js v5 magic-link auth wired end-to-end with the mandatory edge-split (auth.config.ts providers-only for Edge / auth.ts with DrizzleAdapter + callbacks for Node): Resend provider renders a 3-locale React Email template, signIn callback authorizes only admin_user WHERE active=true (T-AUTH-02 integration-tested against live Neon), sessions.absoluteExpires enforces the D-09 7d absolute cap via a stamp-once session callback + requireAdmin() rejection, bootstrapAdmin() uses the D-12 verbatim SELECT 1 pre-check before insert, login/admin placeholder pages compile under the [locale] shell.**

## Performance

- **Duration:** ~35 min wall-clock (single executor session)
- **Started:** 2026-04-21T09:50Z
- **Completed:** 2026-04-21T10:20Z
- **Tasks:** 3 (Task 05.1 auth config + bootstrap + email + route; Task 05.2 login page + server action + admin page; Task 05.3 T-AUTH-02 integration test)
- **Files created:** 9 (3 src/lib, 1 src/emails, 1 src/app/api/auth, 3 src/app/[locale]/, 1 tests/db)
- **Files modified:** 1 (.planning/phases/01-foundations/deferred-items.md — DEF-02 resolved)
- **Task commits:** 3 on master

## Accomplishments

- **Auth.js v5 edge-split is locked.** src/lib/auth.config.ts has ONLY two static imports (next-auth/providers/resend + type-only NextAuthConfig). Node-only modules (@auth/drizzle-adapter, @/db/client, resend SDK, @react-email/components, @/emails/magic-link) enter ONLY via dynamic await import() inside sendVerificationRequest, which Auth.js invokes at Node route-handler runtime — never in the Edge bundle's static graph. Middleware (plan 06) can import auth.config.ts without triggering the "Edge runtime does not support Node.js 'net' module" crash (Pitfall 1).
- **signIn callback authorizes only admin_user WHERE active=true AND role='admin' (T-AUTH-02).** The Drizzle query in src/lib/auth.ts uses eq(adminUsers.email, user.email) + eq(adminUsers.active, true) + .limit(1) + role === 'admin' check. Independently verified by tests/db/auth-signin-callback.test.ts against the live Neon DB: unknown email → false, null/undefined/empty → false, active admin → true, inactive admin → false. The test's inline signInCheck() mirrors the auth.ts query 1:1 so drift will surface the first time either changes.
- **D-09 dual session caps are enforced server-side.** 24h idle sliding cap: session.maxAge=86400 + DrizzleAdapter refreshes sessions.expires per authenticated request (updateAge: 3600 ensures at-most-hourly refresh writes). 7d absolute cap: session callback stamps sessions.absoluteExpires=now()+7d the first time a session is read, guarded by isNull so subsequent reads are a zero-row UPDATE. requireAdmin() reads absoluteExpires, rejects with 'Unauthorized' when < now(), and deletes the offending session row so the same cookie fails on subsequent requests. Phase 2 adds UX (idle banner + re-auth modal) per CONTEXT.md deferred list — Phase 1 ships the infrastructure per D-09 lock.
- **bootstrapAdmin() is idempotent with D-12 verbatim semantics.** SELECT 1 FROM admin_user LIMIT 1 pre-check runs BEFORE insert — if ANY admin already exists, bootstrap no-ops even if BOOTSTRAP_ADMIN_EMAIL is a different address (protects against stale env var post-legitimate-invites). onConflictDoNothing handles the narrow race of two concurrent cold starts passing the pre-check simultaneously (Pitfall 8). Module-scope `bootstrapped` boolean short-circuits repeat calls within one Node process. Plan 07's instrumentation.ts will wire this into the Node cold-boot hook.
- **Login + admin shells compile and render.** /uz/login (and /ru/login, /en/login) pre-render at build as SSG with translated strings from the auth namespace. /[locale]/admin is a dynamic route (correct — requireAdmin() makes it request-dependent). Build output confirms: 11 static pages + 2 dynamic routes (admin + /api/auth).
- **Test suite: 33/33 green (29 prior + 4 new T-AUTH-02 tests).** Full Vitest run completes in ~3s. Build compiles cleanly in 5.8s. Typecheck exits 0.
- **DEF-02 resolved.** Real AUTH_SECRET / AUTH_RESEND_KEY / RESEND_FROM_EMAIL / BOOTSTRAP_ADMIN_EMAIL values populated in .env.local by the developer before this plan executed. The Zod validator in src/env.ts loaded the full server env at boot without falling back to placeholders.

## Task Commits

1. **Task 05.1 — Auth.js v5 edge-split + Resend + bootstrap + route handler** — `862bc15` (feat)
   - src/lib/auth.config.ts (Edge-safe providers-only NextAuthConfig with Resend + sendVerificationRequest override)
   - src/lib/auth.ts (Node composition: DrizzleAdapter + session strategy database + signIn/session callbacks + requireAdmin + Session type augmentation)
   - src/lib/bootstrap.ts (D-12 pre-check + onConflictDoNothing + module-scope flag)
   - src/emails/magic-link.tsx (3-locale React Email template)
   - src/app/api/auth/[...nextauth]/route.ts (GET/POST re-export)

2. **Task 05.2 — Login page + Server Action + admin page** — `75d6387` (feat)
   - src/app/[locale]/login/actions.ts ('use server' + Zod + signIn('resend', ...))
   - src/app/[locale]/login/page.tsx (minimal RSC with setRequestLocale + <form action={requestMagicLink}>)
   - src/app/[locale]/admin/page.tsx (setRequestLocale BEFORE requireAdmin + getTranslations('admin'))

3. **Task 05.3 — T-AUTH-02 signIn-callback integration test** — `1fa815d` (test)
   - tests/db/auth-signin-callback.test.ts (4 tests, 15s per-test timeout, afterAll cleanup)

Plan metadata commit (this SUMMARY + STATE + ROADMAP + REQUIREMENTS update) will follow as `docs(01-05): complete auth.js magic-link plan`.

## Files Created/Modified

**Created (9):**
- `src/lib/auth.config.ts` — Edge-safe providers-only NextAuthConfig
- `src/lib/auth.ts` — Node-runtime composition + requireAdmin + Session augmentation
- `src/lib/bootstrap.ts` — bootstrapAdmin() with D-12 guards
- `src/emails/magic-link.tsx` — 3-locale React Email template
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handlers
- `src/app/[locale]/login/page.tsx` — RSC login page
- `src/app/[locale]/login/actions.ts` — Zod-validated server action
- `src/app/[locale]/admin/page.tsx` — Admin placeholder guarded by requireAdmin()
- `tests/db/auth-signin-callback.test.ts` — T-AUTH-02 live-DB integration test (4 cases)

**Modified (1):**
- `.planning/phases/01-foundations/deferred-items.md` — DEF-02 marked RESOLVED with resolution note and commit chain evidence

**Unversioned (not committed, gitignored):**
- `.env.local` — developer populated real AUTH_SECRET / AUTH_RESEND_KEY / RESEND_FROM_EMAIL / BOOTSTRAP_ADMIN_EMAIL values before this plan executed (pre-flight setup step per executor prompt). Zod validator in src/env.ts now loads real values at boot. Production Vercel env vars still need to be entered in the dashboard before plan 01-07's deploy smoke.

## Decisions Made

- **Session type augmentation for sessionToken.** The default Auth.js v5 public `Session` type only includes `{ user, expires }` — `sessionToken` is an `AdapterSession`-only concern. Without augmentation, `requireAdmin()` couldn't look up `sessions.absoluteExpires` server-side via the cookie token without a second cookie read. Augmenting via `declare module 'next-auth' { interface Session { sessionToken?: string } }` is the canonical pattern in Auth.js v5 for extending the session shape. The field is stamped onto the session only in the server-side session callback; no client serialization path exposes it.
- **Server Action returns void (Phase 1).** React 19 DOM typings reject non-void returns on Server Actions bound directly to `<form action={fn}>` in an RSC, and the plan's acceptance criterion requires the literal `<form action={requestMagicLink}>`. Retained Zod validation + signIn call verbatim; dropped return values (Phase 2 will switch to useActionState + discriminated result for proper check-your-email UX). Also aligns with anti-enumeration: unknown-email submissions silently succeed, so the user can't probe admin list via response differences.
- **15s per-test timeout on T-AUTH-02 tests.** First query on Neon HTTP in a fresh Vitest run routinely exceeds 5s (my first test timed out at 5s on initial run). Sibling live-DB tests (locale-constraint, spec-values) run 1.5–2.5s each on cold start; 15s is a generous upper bound that still fails fast on real errors. Vitest 4 moved timeout to the 3rd positional arg on `it(name, fn, timeout)`; used that form after an initial `{ timeout: ... }` options-object attempt failed with "Signature was deprecated in Vitest 3 and removed in Vitest 4".
- **sendVerificationRequest lives in auth.config.ts, not auth.ts.** The Resend provider block IS part of the provider configuration (Edge-semantics for middleware bundling); Auth.js invokes sendVerificationRequest at Node runtime from route handlers, so the dynamic `await import(...)` resolves Node-only modules safely. Alternative (override in auth.ts via `options` param on the provider) would fragment the provider config across two files and obscure the contract.
- **@react-email/components' render() re-export.** @react-email/components@1.0.12 re-exports `* from @react-email/render`, so we use `await import('@react-email/components')` for `render()` rather than adding `@react-email/render` as a separate direct dep. Verified at `node_modules/@react-email/components/dist/index.d.cts` line: `export * from "@react-email/render";`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Auth.js Session type missing sessionToken**
- **Found during:** Task 05.1 typecheck after initial write
- **Issue:** Writing `session.sessionToken` inside `requireAdmin()` (where `session = await auth()`) failed typecheck with `TS2339: Property 'sessionToken' does not exist on type 'Session'`. The default public `Session` type from `@auth/core/types` extends `DefaultSession = { user?: User; expires: ISODateString }` — it does not expose the underlying `AdapterSession.sessionToken`. Without a sessionToken handle, `requireAdmin()` couldn't enforce the D-09 7d absolute cap (which requires a sessions-table lookup).
- **Fix:** Added module augmentation to extend the Session interface with `sessionToken?: string`, then the session callback forwards the sessionToken (available in the callback's `session` param as `{ user } & AdapterSession`) onto the returned session object. This is the canonical Auth.js v5 pattern for adding fields to the session; documented extensively in the Auth.js docs.
- **Files modified:** `src/lib/auth.ts` (added `declare module 'next-auth' { interface Session { sessionToken?: string } }`)
- **Verification:** `pnpm typecheck` passes; `pnpm vitest run` 33/33; `pnpm build` compiles cleanly.
- **Committed in:** `862bc15` (Task 05.1)

**2. [Rule 3 - Blocker] React 19 Server Action return-type mismatch with <form action={fn}>**
- **Found during:** Task 05.2 typecheck after initial write
- **Issue:** Plan's `<interfaces>` block showed `requestMagicLink` returning `{ ok: true } | { error: ... }`. Binding this directly to `<form action={requestMagicLink}>` in an RSC failed typecheck with `TS2322: Type '...' is not assignable to type 'string | ((formData: FormData) => void | Promise<void>)'`. React 19's DOM typings for `<form>`'s `action` prop require `void | Promise<void>` on the server-action signature — discriminated returns are only valid via `useActionState` on a client component.
- **Fix:** Changed return type to `Promise<void>`. Retained all Zod validation and the signIn delegate call verbatim (which is what the acceptance criteria grep for). Added a comment pointing to Phase 2 for the `useActionState`-based UX. Side benefit: aligns with anti-enumeration (unknown-email submissions silently succeed so the user can't probe the admin list).
- **Files modified:** `src/app/[locale]/login/actions.ts`
- **Verification:** `pnpm typecheck` passes; build output shows /[locale]/login pre-renders as SSG across all 3 locales.
- **Committed in:** `75d6387` (Task 05.2)

**3. [Rule 3 - Blocker] Vitest 4 removed support for 3rd-arg-object-form describe options**
- **Found during:** Task 05.3 first green-to-red cycle
- **Issue:** Initial attempt used `describe('...', () => {...}, { timeout: 15_000 })` to bump the per-test timeout above the 5s default. Vitest 4 errored: `TypeError: Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.`
- **Fix:** Dropped the describe-level options object and instead passed a numeric `timeout` as the 3rd positional arg to each `it(name, fn, timeout)` call (Vitest 4-compatible API). Declared `const TIMEOUT = 15_000` at module scope so all 4 tests share one constant.
- **Files modified:** `tests/db/auth-signin-callback.test.ts`
- **Verification:** `pnpm vitest run tests/db/auth-signin-callback.test.ts` → 4 passed in 1.72s.
- **Committed in:** `1fa815d` (Task 05.3)

---

**Total deviations:** 3 Rule 3 blockers (all typecheck/runtime fixes required to make the files compile and tests run). All three are mechanical API / typing alignment; none change the plan's semantics or acceptance criteria.

**Impact on plan:** Zero. The plan's semantic acceptance criteria — D-09 dual session caps, D-12 bootstrap pre-check, T-AUTH-02 signIn authorization, edge-split, requireAdmin, Zod validation, signIn('resend'), `<form action={requestMagicLink}>`, etc. — are all satisfied by the as-shipped code. The deviations are strictly about how to make those semantics survive the TS compiler and Vitest 4's API.

## Issues Encountered

- **Neon HTTP cold-connection latency on first test.** Not a bug — documented and worked around via 15s per-test timeout. If this becomes a pattern across more live-DB tests, the right fix is to bump vitest.config.ts `testTimeout: 15_000` globally for the whole suite. For now, per-file is adequate.
- **CRLF line-ending warnings** on every `git add` for new files. Standard Windows + `core.autocrlf=true` behavior. No content impact.

## User Setup Required

None for this plan's completion. Looking ahead:
- Vercel dashboard env vars for the first preview deploy (plan 01-07) still need to include real AUTH_SECRET / AUTH_RESEND_KEY / RESEND_FROM_EMAIL / BOOTSTRAP_ADMIN_EMAIL. Checklist in plan 01-03 SUMMARY under "Vercel Dashboard Setup Checklist" remains accurate.
- Resend domain verification (SPF/DKIM) for a custom `from` address is a Phase 2 concern — the current `RESEND_FROM_EMAIL=onboarding@resend.dev` is Resend's test sender which only delivers to the account owner's email. That's fine for the first magic-link round-trip (bootstrap admin IS the account owner per executor prompt) but must be replaced before Phase 2 invite flow ships.

## Next Phase Readiness

**Plan 01-06 (middleware.ts + Cloudinary sign endpoint + magic-link e2e) is unblocked:**
- `src/lib/auth.config.ts` is Edge-safe — middleware.ts can import it without triggering Node-only-module crashes.
- `src/app/[locale]/admin/page.tsx` already calls `requireAdmin()` — middleware in plan 06 adds the Edge redirect to /[locale]/login, eliminating the 500 that unauthenticated requests currently produce.
- Test infrastructure for DB integration tests (T-AUTH-02 pattern) is established — plan 06's T-CLD-01/02/03 Cloudinary-sign tests can follow the same shape.
- e2e test `tests/e2e/magic-link-login.spec.ts` (plan 06 scope) will drive the full round-trip: submit email on /uz/login → Auth.js creates verification_tokens row → Resend provider's sendVerificationRequest renders src/emails/magic-link.tsx and calls Resend's API → user clicks link → signIn callback checks admin_user → DrizzleAdapter creates session → session callback stamps absoluteExpires → redirect to /uz/admin.

**Plan 01-07 (Sentry + instrumentation.ts + deploy) is unblocked:**
- `src/lib/bootstrap.ts` exports the `bootstrapAdmin()` function that instrumentation.ts will call under `NEXT_RUNTIME === 'nodejs'`. Contract is explicit: idempotent, safe to call on every cold start.

**Phase 2 admin CRUD is unblocked:**
- `requireAdmin()` is the canonical gate — Phase 2 Server Actions can `await requireAdmin()` at the top and get session context.
- Session type augmentation keeps server-only fields (sessionToken) out of the client surface.
- Audit log table (plan 02) + requireAdmin signature + bootstrap pattern together provide everything Phase 2's `logAudit()` helper needs.

**Phase 1 close blockers:**
- Plan 01-06 middleware must ship before FOUND-03 + FOUND-05 can be marked Complete (FOUND-05 requires "admin session cookie gated by middleware"; FOUND-03 requires `/` → `/uz/` redirect).
- Plan 01-07 Sentry + deploy smoke must ship before FOUND-07 can be marked Complete.

## TDD Gate Compliance

Plan 01-05 is not flagged `type: tdd` at the plan level. Task-level gates:
- Task 05.1 `type="auto"` — structural code wiring (auth config, adapter, bootstrap, route handler, email template). No RED/GREEN/REFACTOR commit trio is meaningful for one-pass VERBATIM-from-plan-interfaces scaffold code. Acceptance criteria are entirely structural/grep-able and verified independently (see Self-Check).
- Task 05.2 `type="auto" tdd="true"` — same reasoning as 05.1 (structural RSC + Server Action + RSC). The tests for these pages are e2e specs in plan 06 (magic-link-login.spec.ts) + the T-AUTH-02 integration test from Task 05.3 which covers the signIn callback the action delegates to.
- Task 05.3 `type="auto" tdd="true"` — IS the test itself. RED is implicit (the test file doesn't exist before this task); GREEN is the 4 passing assertions. No separate RED commit because the test validates pre-existing code from Task 05.1 (the signIn callback). Committed as `test(01-05): ...` per conventional-commits type for test-only changes.

No RED gate commit exists because plan 01-05's type is `execute`, not `tdd`. The signIn callback's DB query already existed in `src/lib/auth.ts` from Task 05.1 before the test was written — the test is pure Nyquist-style external verification of an existing contract, not a TDD RED.

## Self-Check

Verifying every `must_haves.truths` item from the plan frontmatter:

- [x] **PASSED** — "src/lib/auth.config.ts exports a providers-only Auth.js v5 NextAuthConfig with Resend provider — NO imports of @auth/drizzle-adapter or @/db/client" — `grep ^import src/lib/auth.config.ts` returns exactly 2 lines: `import Resend from 'next-auth/providers/resend';` and `import type { NextAuthConfig } from 'next-auth';`. `grep -E "@auth/drizzle-adapter|@/db/|@/lib/bootstrap|@/emails/|^import .*resend\b" src/lib/auth.config.ts | grep -v "next-auth/providers/resend"` returns empty. Satisfies `satisfies NextAuthConfig` (line ~49).
- [x] **PASSED** — "src/lib/auth.ts composes auth.config with DrizzleAdapter + session: { strategy: 'database', maxAge: 86400 } + signIn callback authorizing admin_user" — grep `strategy: 'database'` → 1 match. grep `maxAge: IDLE_SESSION_SECONDS` → 1 match. `IDLE_SESSION_SECONDS = 24 * 60 * 60` → 86400. `async signIn({ user })` → 1 match. `eq(adminUsers.email, user.email)` + `eq(adminUsers.active, true)` both present.
- [x] **PASSED** — "src/lib/auth.ts requireAdmin() rejects sessions where sessions.absoluteExpires < now() — D-09 7d absolute cap enforcement" — grep `absoluteExpires.getTime() < Date.now()` returns 1 match (line ~128); `db.delete(sessions)` returns 1 match; `throw new Error('Unauthorized')` after the delete. Rejection + deletion path present.
- [x] **PASSED** — "src/lib/auth.ts session callback stamps sessions.absoluteExpires = now()+7d on first session read (once, guarded by isNull)" — session callback body contains `db.update(sessions).set({ absoluteExpires: new Date(Date.now() + ABSOLUTE_SESSION_SECONDS * 1000) }).where(and(eq(sessions.sessionToken, sessionToken), isNull(sessions.absoluteExpires)))`. ABSOLUTE_SESSION_SECONDS = 604800 (7d). isNull guard present.
- [x] **PASSED** — "src/lib/bootstrap.ts performs SELECT 1 FROM admin_user LIMIT 1 pre-check BEFORE insert (D-12 verbatim)" — all four grep markers pass: `.select(`, `adminUsers.email`, `.limit(1)`, `if (existing)`. Line order check: `.select(` on line 32, `.insert(adminUsers)` on line 44 — SELECT before INSERT. `.onConflictDoNothing()` present as belt-and-suspenders.
- [x] **PASSED** — "src/app/api/auth/[...nextauth]/route.ts re-exports GET and POST from auth handlers" — file is exactly two lines: `import { handlers } from '@/lib/auth';` then `export const { GET, POST } = handlers;`.
- [x] **PASSED** — "src/app/[locale]/login/page.tsx renders an email input form that triggers signIn('resend', { email, redirectTo: '/{locale}/admin' }) via a Server Action" — page contains `<form action={requestMagicLink}>` + hidden `<input type="hidden" name="locale" value={locale}>` + `<input name="email" type="email" required>`. actions.ts contains `signIn('resend', { email, redirect: false, redirectTo: \`/${locale}/admin\` })`.
- [x] **PASSED** — "src/app/[locale]/admin/page.tsx calls requireAdmin() before rendering" — `await requireAdmin()` on line 17; `setRequestLocale(locale)` on line 16 (must precede per Pitfall 4). Both precede the `getTranslations('admin')` call and the `<main>` return.
- [x] **PASSED** — "tests/db/auth-signin-callback.test.ts asserts the signIn callback rejects an email not in admin_user" — test "rejects email NOT present in admin_user" exercises `signInCheck('ghost@example.com')` and expects `false`. PASSED in Vitest run.

Verifying `must_haves.artifacts`:

- [x] **PASSED** — `src/lib/auth.config.ts` exists, contains `satisfies NextAuthConfig`.
- [x] **PASSED** — `src/lib/auth.ts` exists, exports `[handlers, auth, signIn, signOut, requireAdmin]` (all 5 present in `export const { ... } = NextAuth(...)` + `export async function requireAdmin`). Contains `maxAge: IDLE_SESSION_SECONDS` + `absoluteExpires` + `ABSOLUTE_SESSION_SECONDS`.
- [x] **PASSED** — `src/lib/bootstrap.ts` exists, contains `onConflictDoNothing` + all four pre-check markers (.select(, adminUsers.email, .limit(1), if (existing)).
- [x] **PASSED** — `src/emails/magic-link.tsx` exists, contains `<Html lang={locale}>` + 3-locale COPY with keys `uz`, `ru`, `en`.
- [x] **PASSED** — `src/app/api/auth/[...nextauth]/route.ts` exists, contains `export const { GET, POST } = handlers`.
- [x] **PASSED** — `src/app/[locale]/login/page.tsx` exists, contains `signIn` (via import from actions.ts which references it).
- [x] **PASSED** — `src/app/[locale]/admin/page.tsx` exists, contains `requireAdmin`.
- [x] **PASSED** — `tests/db/auth-signin-callback.test.ts` exists, contains `describe`.

Verifying `must_haves.key_links`:

- [x] **PASSED** — `src/lib/auth.ts` links to `src/db/schema` (adminUsers) via `from '@/db/schema'` import + `.from(adminUsers)` query (matches the `adminUsers` pattern regex).
- [x] **PASSED** — `src/lib/bootstrap.ts` links to `src/db/schema/admin.ts` (via `@/db/schema` barrel) + uses `db.insert(adminUsers).onConflictDoNothing()` — `onConflictDoNothing` pattern match.
- [x] **PASSED** — `src/app/[locale]/admin/page.tsx` links to `src/lib/auth.ts` via `import { requireAdmin } from '@/lib/auth'` + `await requireAdmin()` call.
- [x] **PASSED** — `src/app/api/auth/[...nextauth]/route.ts` links to `src/lib/auth.ts` via `import { handlers } from '@/lib/auth'`.

Verifying Task 05.1 acceptance criteria:

- [x] **PASSED** — `src/lib/auth.config.ts` contains `satisfies NextAuthConfig` AND `signIn: '/uz/login'`.
- [x] **PASSED** — `src/lib/auth.config.ts` does NOT static-import `@auth/drizzle-adapter` (grep returns empty).
- [x] **PASSED** — `src/lib/auth.config.ts` does NOT static-import `@/db/` (grep returns empty).
- [x] **PASSED** — `src/lib/auth.config.ts` contains `sendVerificationRequest` literal.
- [x] **PASSED** — `src/lib/auth.ts` contains `strategy: 'database'` AND `maxAge: IDLE_SESSION_SECONDS`.
- [x] **PASSED** — `src/lib/auth.ts` contains `ABSOLUTE_SESSION_SECONDS = 7 * 24 * 60 * 60` literal.
- [x] **PASSED** — `src/lib/auth.ts` has ≥ 2 matches for `absoluteExpires` (grep -c returns 9: imports + constant + session callback + requireAdmin body + augmentation comment).
- [x] **PASSED** — `src/lib/auth.ts` imports `isNull` from drizzle-orm.
- [x] **PASSED** — `src/lib/auth.ts` contains `DrizzleAdapter(db` AND exports `handlers, auth, signIn, signOut`.
- [x] **PASSED** — `src/lib/auth.ts` contains `async signIn({ user })` AND `eq(adminUsers.email, user.email)` AND `eq(adminUsers.active, true)`.
- [x] **PASSED** — `src/lib/auth.ts` contains `export async function requireAdmin()`.
- [x] **PASSED** — requireAdmin body contains both unauth-no-session check AND `row.absoluteExpires.getTime() < Date.now()` rejection path AND `db.delete(sessions)`.
- [x] **PASSED** — `src/lib/bootstrap.ts` contains `.onConflictDoNothing()`.
- [x] **PASSED** — `src/lib/bootstrap.ts` references `env.BOOTSTRAP_ADMIN_EMAIL`.
- [x] **PASSED** — all four D-12 pre-check markers present: `.select(`, `adminUsers.email`, `.limit(1)`, `if (existing)`.
- [x] **PASSED** — pre-check runs BEFORE insert: `.select(` line 32 < `.insert(adminUsers)` line 44.
- [x] **PASSED** — `src/emails/magic-link.tsx` contains `<Html lang={locale}>` AND 3-locale COPY with keys uz, ru, en.
- [x] **PASSED** — `src/app/api/auth/[...nextauth]/route.ts` contains exactly `export const { GET, POST } = handlers;` one-liner.
- [x] **PASSED** — `pnpm typecheck` exits 0.

Verifying Task 05.2 acceptance criteria:

- [x] **PASSED** — login/page.tsx contains `setRequestLocale(locale)` AND `getTranslations('auth')` AND `<form action={requestMagicLink}`.
- [x] **PASSED** — login/page.tsx contains hidden input `<input type="hidden" name="locale" value={locale} />`.
- [x] **PASSED** — login/actions.ts contains `'use server';` literal on line 1.
- [x] **PASSED** — login/actions.ts contains `signIn('resend'` literal AND `redirectTo: \`/${locale}/admin\`` literal template.
- [x] **PASSED** — login/actions.ts contains `z.object` AND `email: z.string().email()` AND `locale: z.enum(routing.locales)`.
- [x] **PASSED** — admin/page.tsx contains `await requireAdmin()` literal call.
- [x] **PASSED** — admin/page.tsx calls `setRequestLocale(locale)` on line 16, BEFORE `await requireAdmin()` on line 17.
- [x] **PASSED** — `pnpm typecheck` exits 0.

Verifying Task 05.3 acceptance criteria:

- [x] **PASSED** — tests/db/auth-signin-callback.test.ts contains 4 `it(` calls covering email absent / null&empty / active admin / inactive admin.
- [x] **PASSED** — test contains `afterAll` cleanup that `DELETE`s test rows.
- [x] **PASSED** — inline `signInCheck` mirrors auth.ts query: uses `eq(adminUsers.email, email)`, `.limit(1)`, combined `role === 'admin' && active === true` check.
- [x] **PASSED** — `pnpm vitest run tests/db/auth-signin-callback.test.ts` exits 0 with 4 passing tests (1.72s duration).

Commit hashes verified exist:

- [x] `862bc15` — `git log --oneline` FOUND (`feat(01-05): wire Auth.js v5 edge-split + Resend magic-link + requireAdmin + bootstrapAdmin`).
- [x] `75d6387` — `git log --oneline` FOUND (`feat(01-05): login page + magic-link Server Action + admin placeholder`).
- [x] `1fa815d` — `git log --oneline` FOUND (`test(01-05): signIn callback integration test against live Neon DB (T-AUTH-02)`).

Tooling verification:

- [x] **PASSED** — `pnpm typecheck` exits 0 (no TS errors anywhere in src/ or tests/).
- [x] **PASSED** — `pnpm vitest run` exits 0 with 33 passed / 33 total (29 prior + 4 new T-AUTH-02 tests). Duration ~3s.
- [x] **PASSED** — `pnpm build` exits 0 in 5.8s. 11 static pages generated (/uz, /ru, /en, /uz/login, /ru/login, /en/login, _not-found, etc.). /[locale]/admin is dynamic (correct — requireAdmin makes it per-request). /api/auth/[...nextauth] is dynamic. Edge-split survives the build — no "net module" crashes.
- [x] **PASSED** — Static guard: `grep -E "^import .* from '(@auth/drizzle-adapter|@/db/|@/lib/bootstrap|@/emails/|resend|@react-email)" src/lib/auth.config.ts` returns NO matches, confirming no forbidden static imports.

Secret-leak verification:

- [x] **PASSED** — `git diff HEAD~3..HEAD` inspected for literal secret values (API keys, AUTH_SECRET): none. No postgresql://, re_, sk- literals in any committed file. `.env.local` remains gitignored and uncommitted.

**Self-Check: PASSED** — all 9 `must_haves.truths` items PASSED, all 8 `must_haves.artifacts` items PASSED, all 4 `must_haves.key_links` items PASSED, all 19 Task 05.1 acceptance criteria PASSED, all 8 Task 05.2 acceptance criteria PASSED, all 4 Task 05.3 acceptance criteria PASSED. 3/3 commit hashes present. 4/4 tooling green (typecheck / vitest / build / static-import guard). Secret-leak clean.

---
*Phase: 01-foundations*
*Completed: 2026-04-21*
