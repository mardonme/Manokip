---
phase: 02-admin-panel
plan: 04
subsystem: lib-audit
tags: [audit-log, server-action-wrapper, requireAdmin, d-13, d-15, d-16, open-q-5, test-fixture, wave-0]

requires:
  - phase: 01-foundations/01-02
    provides: src/db/schema/admin.ts (auditLog table — bigserial id, jsonb before/after, text columns matching D-13)
  - phase: 01-foundations/01-05
    provides: src/lib/auth.ts requireAdmin() skeleton + sessions schema + signIn callback that lazily stamps absolute_expires
  - phase: 02-admin-panel/02-01
    provides: Phase-2 schema migration applied to Neon dev branch (no new schema in this plan; reuses Phase-1 audit_log + sessions tables)

provides:
  - src/lib/audit.ts (NEW) — `logAudit(tx, args)` writes one audit_log row inside the caller's transaction; `AUDIT_ACTIONS` 13-value closed const tuple + `AuditAction` type. The atomic-with-mutation contract every Wave-2/3/4 Server Action depends on.
  - src/lib/server-action.ts (NEW) — `withAdminAction(schema, handler)` wrapper composing requireAdmin + Zod parse + headers ctx + discriminated `{ ok:true, data } | { ok:false, error: 'validation'|'unauthorized'|'unknown' }` return. The universal admin Server Action shape.
  - src/lib/admin-session-cap.ts (NEW) — `enforceAbsoluteCap(token, email)` extracted from requireAdmin, in its own next-auth-free module so vitest can exercise the cap-rejection + audit emission without next-auth's `next/server` resolution failure.
  - src/lib/auth.ts (modified) — Node-only header marker (W9), `events.signIn` -> 'login' audit, `events.signOut` -> 'logout' audit (looks up email by session.userId), `requireAdmin` now delegates cap check to enforceAbsoluteCap which emits 'session_revoked' before deleting the row + throwing.
  - tests/_fixtures/admin-session.ts (NEW) — `createActiveAdminSession({ absoluteExpiresOffsetSec?, expiresOffsetSec?, role?, active? })` returns `{ email, sessionToken, cookieValue, userId, cleanup }`. Inserts a real admin_user + auth_users + sessions trio in the live test branch and cleans up on demand. THE Wave-0 fixture every Wave-2/3/4 action integration test depends on.
  - tests/lib/audit.test.ts (NEW) — 3 specs (commit shape, atomic rollback, closed enum verification).
  - tests/lib/server-action.test.ts (NEW) — 5 specs (handler-call shape, validation rejection, unauthorized rejection, unknown-error fallback, ip/userAgent fallback).
  - tests/lib/require-admin.test.ts (NEW) — 4 specs against live Neon (expired cap rejection, future cap pass-through, NULL grandfathered, missing-row no-op).
  - tests/_fixtures/load-env.ts (modified) — `neonConfig.webSocketConstructor = ws` shim so the dbTx WebSocket Pool client can negotiate against Neon (canonical Neon serverless fix per CONFIG.md).

affects: [phase-2-plan-02, phase-2-plan-03, phase-2-plan-05, phase-2-plan-06, phase-2-plan-07, phase-2-plan-08, phase-2-plan-09, phase-2-plan-10, phase-2-plan-11, phase-2-plan-12, phase-2-plan-13, phase-2-plan-14, phase-2-plan-15, phase-2-plan-16, phase-2-plan-17, phase-2-plan-18]

tech-stack:
  added:
    - "ws@^8.18.3 (devDependency) + @types/ws — needed only at vitest test boot to give Neon's serverless WebSocket Pool a working transport in Node 22 (the global WebSocket fails handshake against Neon endpoints; see https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined)"
  patterns:
    - "Closed const-tuple action enum (`AUDIT_ACTIONS as const` -> `AuditAction = (typeof AUDIT_ACTIONS)[number]`) — discoverable at runtime (audit log viewer dropdown in plan 02-15) AND lints typos at compile time. Added entries: extend the tuple, the type derives automatically."
    - "Atomic-with-mutation audit contract: `logAudit(tx, ...)` requires the caller to pass the `tx` from `dbTx.transaction(async (tx) => ...)`. The argument's type is inferred via `Parameters<Parameters<typeof dbTx.transaction>[0]>[0]` so consumers cannot accidentally pass the regular `dbTx` client. Audit row commits/rolls back atomically with whatever else the caller writes."
    - "Universal Server Action wrapper: `withAdminAction(schema, handler)` — every src/actions/*.ts mutation in Wave 2/3/4 calls this. requireAdmin() FIRST so unauth callers don't learn the schema shape from validation errors (T-02-04-02 Spoofing). Zod allowlist BEFORE handler (T-02-04-01 mass-assignment). Discriminated return matches React 19 useActionState contract."
    - "Auth.js v5 events for lifecycle audit (Open Q §5 resolution): `events.signIn`/`events.signOut` fire AFTER auth state mutation, so the audit row is ordered after the lifecycle event. Errors thrown inside events are wrapped in try/catch + logged so an audit-write failure cannot break the user-visible login/logout flow."
    - "Edge isolation guard (W9): src/lib/auth.ts has a top-of-file `// Node-only — never import from Edge contexts (proxy.ts uses @/lib/auth.config instead)` marker so future contributors don't accidentally pull DrizzleAdapter + Neon driver into the Edge bundle. proxy.ts contains zero `from '@/lib/auth'` imports — only @/lib/auth.config."
    - "Testable seam via module split: enforceAbsoluteCap lives in src/lib/admin-session-cap.ts (NO next-auth import) so vitest can call it directly. tests/lib/require-admin.test.ts hits the seam against live Neon. The seam is intentional and documented inline in src/lib/auth.ts."
    - "Test fixture cleanup ordering: sessions (FK to auth_users) -> auth_users -> admin_user. admin_user has no FK on auth_users (D-10/D-11 — app-owned table keyed by email), so its order only matters for symmetry. Idempotent across back-to-back runs (verified 2x consecutive — no leaked rows)."
    - "vi.importActual workaround: cannot use it on @/lib/auth because next-auth's lib/env.js fails to resolve `next/server` outside a Next.js runtime. Solution: extract the testable surface into a module with NO next-auth import (admin-session-cap.ts). Same posture as Phase-1 auth-signin-callback.test.ts which replicates the query inline rather than importing the auth module."

key-files:
  created:
    - src/lib/audit.ts
    - src/lib/server-action.ts
    - src/lib/admin-session-cap.ts
    - tests/_fixtures/admin-session.ts
    - tests/lib/audit.test.ts
    - tests/lib/server-action.test.ts
    - tests/lib/require-admin.test.ts
    - .planning/phases/02-admin-panel/02-04-SUMMARY.md
  modified:
    - src/lib/auth.ts
    - tests/_fixtures/load-env.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Open Q §5 LOCKED: login/logout/session_revoked audit emission lives in three places — `events.signIn` (login), `events.signOut` (logout, with auth_users lookup since AdapterSession does not carry email), `enforceAbsoluteCap` (session_revoked, before sessions.delete + throw). All three share the dbTx.transaction(async (tx) => logAudit(tx, ...)) shape. Errors swallowed + logged so audit failures cannot bypass the security gate or break user-visible auth flows."
  - "Extracted enforceAbsoluteCap into src/lib/admin-session-cap.ts as a next-auth-free module — NOT a refactor of the contract, but a test seam. requireAdmin() in src/lib/auth.ts now delegates to it (one-line call); behavior is identical to plan 01-05's requireAdmin shape. The seam is what makes tests/lib/require-admin.test.ts feasible — vitest cannot resolve next-auth's `next/server` import, so testing requireAdmin via vi.mock is impossible. Documented inline in both files."
  - "ws + @types/ws devDeps + neonConfig.webSocketConstructor shim in tests/_fixtures/load-env.ts — required for dbTx integration tests because Node 22's global WebSocket fails the Neon serverless handshake. Standard fix per Neon CONFIG.md. Has zero runtime impact (vitest setupFiles only); production runtime path uses @neondatabase/serverless's built-in WebSocket discovery."
  - "vitest 4 dropped `--reporter=basic` (used by the plan's <verify> blocks). Substituted default reporter; same green/red signal."
  - "Plan acceptance criterion `grep -cE 'fixme|\\.skip' tests/lib/require-admin.test.ts returns 0` is satisfied — no fixme/skip in the committed file. The plan's fallback (it.fixme + TODO(02-04.1)) was not needed because the testable-seam approach (enforceAbsoluteCap in its own module) made full integration testing feasible against live Neon."
  - "Did not run `pnpm build` to completion — the compile step succeeds (Edge bundle clean in 10.2s); the subsequent TS check fails ONLY on the 7 pre-existing TS2532 errors in scripts/verify-02-01-migration.ts (carried forward from plan 02-01). Same posture as plan 02-03 SUMMARY decisions §6: out-of-scope per CLAUDE.md scope-boundary rule."

requirements-completed: []  # ADMIN-11 (audit log writer) is wired here but the requirement is not acceptance-complete until at least one Server Action calls logAudit (Wave 2 plan 02-08 onwards). ADMIN-01 still incomplete (invite half lands in 02-07).

duration: ~25min
completed: 2026-04-28
---

# Phase 2 Plan 04: Lib-Audit Summary

**Audit log writer + Server Action wrapper + admin-session test fixture — every cross-cutting concern Wave-2/3/4 mutations depend on, plus the Wave-0 fixture that every action integration test imports. `logAudit(tx, args)` writes one audit_log row atomically with the caller's transaction (D-16); `withAdminAction(schema, handler)` is the universal Server Action wrapper composing requireAdmin -> Zod parse -> headers ctx -> discriminated result; Auth.js `events.signIn`/`events.signOut` emit 'login'/'logout' audit rows; `enforceAbsoluteCap` (extracted from requireAdmin into its own next-auth-free module so vitest can test it) emits 'session_revoked' before deleting cap-expired sessions rows + throwing — closing Open Q §5 of 02-RESEARCH. `tests/_fixtures/admin-session.ts` ships the canonical `createActiveAdminSession()` factory every Wave-2/3/4 action integration test will import.**

## Performance

- **Duration:** ~25 min wall-clock
- **Started:** 2026-04-28 ~12:21 UTC
- **Completed:** 2026-04-28 ~12:37 UTC
- **Tasks:** 3 (Task 4.1 logAudit, Task 4.2 withAdminAction + auth.ts events, Task 4.3 fixture + require-admin test)
- **Commits:** 5 (TDD RED + GREEN split for tasks 4.1 and 4.2; combined for task 4.3 since the implementation involved a refactor seam discovered during testing)
- **Files created:** 8
- **Files modified:** 4

## Commits

| Task | Type | Hash | Message |
|------|------|------|---------|
| 4.1 RED | test | `36078a5` | `test(02-04): add failing test for logAudit + AUDIT_ACTIONS enum (D-16)` |
| 4.1 GREEN | feat | `c369b68` | `feat(02-04): implement logAudit helper + AUDIT_ACTIONS closed enum (D-16)` |
| 4.2 RED | test | `1a0a0e0` | `test(02-04): add failing tests for withAdminAction wrapper (T-02-04-01,-02)` |
| 4.2 GREEN | feat | `b562456` | `feat(02-04): withAdminAction wrapper + Auth.js login/logout/session_revoked audit (D-16, Open Q §5)` |
| 4.3 | feat | `c637cd8` | `feat(02-04): admin-session test fixture + extract enforceAbsoluteCap (D-15, Open Q §5)` |

## Final Shape of Discriminated Return

```typescript
export type AdminActionResult<O> =
  | { ok: true; data: O }
  | { ok: false; error: 'validation' | 'unauthorized' | 'unknown' };
```

**Branches:**
- `requireAdmin` rejects (Unauthorized) -> `{ ok: false, error: 'unauthorized' }`
- Zod schema.parse fails -> `{ ok: false, error: 'validation' }`
- Handler throws non-auth error -> `{ ok: false, error: 'unknown' }` (with `console.error('admin-action', err)`)
- Otherwise -> `{ ok: true, data: <handler-return> }`

The handler receives `(input: I, ctx: { actorEmail, ip, userAgent })` where `ip` and `userAgent` come from `next/headers` and fall back to `'unknown'` when absent.

## Open Q §5 Resolution: Login/Logout/Session_Revoked Audit Path

| Action | Trigger | Module | Body |
|--------|---------|--------|------|
| `login` | Auth.js completes successful sign-in | `src/lib/auth.ts` `events.signIn` | `dbTx.transaction(tx => logAudit(tx, { action: 'login', actorEmail: user.email, entityType: 'admin_user', entityId: user.email, before: null, after: { at: ISO } }))` |
| `logout` | Auth.js completes successful sign-out | `src/lib/auth.ts` `events.signOut` | Look up `auth_users.email WHERE id = session.userId` (AdapterSession doesn't carry email), then `logAudit(tx, { action: 'logout', ... })` |
| `session_revoked` | `enforceAbsoluteCap` finds `absolute_expires < now()` | `src/lib/admin-session-cap.ts` | Before deleting the row + throwing Unauthorized: `dbTx.transaction(tx => logAudit(tx, { action: 'session_revoked', before: { absoluteExpires }, after: null }))` |

All three wrap their logAudit body in try/catch + console.error so an audit-write failure cannot break the user-visible auth flow or bypass the security gate.

## Wave-0 Fixture for Downstream Plans

`tests/_fixtures/admin-session.ts`:

```typescript
export interface ActiveAdminSession {
  email: string;
  sessionToken: string;
  cookieValue: string;  // alias of sessionToken — for Playwright cookie injection
  userId: string;
  cleanup: () => Promise<void>;
}

export async function createActiveAdminSession(opts?: {
  email?: string;
  absoluteExpiresOffsetSec?: number;  // default +7d
  expiresOffsetSec?: number;          // default +24h
  role?: string;                      // default 'admin'
  active?: boolean;                   // default true
}): Promise<ActiveAdminSession>;
```

Wave 2/3/4 action tests will use it as:
```typescript
const session = await createActiveAdminSession();
try {
  // mock auth() to return { user: { email: session.email }, sessionToken: session.sessionToken }
  // exercise the action; assert audit rows + cache invalidation
} finally {
  await session.cleanup();
}
```

Plans 02-02 (admin-shell e2e fixme) and 02-03 (session-cap e2e fixme) can flip their `.fixme` markers once the e2e harness loads this fixture from a Playwright global setup; that flip is NOT this plan's responsibility per the orchestrator instruction.

## Test Coverage

| File | Specs | Type | Target |
|------|-------|------|--------|
| tests/lib/audit.test.ts | 3 | integration (live Neon) | logAudit commit shape, atomic rollback, AUDIT_ACTIONS const tuple |
| tests/lib/server-action.test.ts | 5 | unit (mocked auth+headers) | withAdminAction four return branches + ip/UA fallback |
| tests/lib/require-admin.test.ts | 4 | integration (live Neon) | enforceAbsoluteCap: expired reject, future pass-through, NULL grandfathered, missing-row no-op |

**Final suite:** 54 / 54 (was 42 / 42 baseline + 12 new). Plan-relevant typecheck clean. Edge bundle compiles in 10.2s.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Vitest 4 dropped `--reporter=basic`**
- **Found during:** Task 4.1 (running plan's <verify> command verbatim)
- **Issue:** The plan's verify blocks call `pnpm vitest run ... --reporter=basic` but vitest 4.1.4 errors out (`Failed to load url basic`).
- **Fix:** Substituted the default reporter; verifies the same green/red signal.
- **Files modified:** None (one-off CLI call adjustment).
- **Tracking:** Plan-wide pattern; future plans should drop the flag.

**2. [Rule 3 - Blocker] Neon WebSocket Pool fails handshake from Node 22 vitest**
- **Found during:** Task 4.1 GREEN run (audit.test.ts hit "All attempts to open a WebSocket... failed").
- **Issue:** dbTx.transaction integration tests can't open a WebSocket against Neon's serverless endpoint using Node 22's global WebSocket. This is the canonical Neon serverless caveat documented at https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined.
- **Fix:** Added `ws` + `@types/ws` as devDependencies; tests/_fixtures/load-env.ts now sets `neonConfig.webSocketConstructor = ws`. Has zero runtime impact (vitest setupFiles only).
- **Files modified:** package.json, pnpm-lock.yaml, tests/_fixtures/load-env.ts.
- **Commits:** Bundled into the Task 4.1 RED commit (36078a5) since both ship the integration test that needed it.

**3. [Rule 4-adjacent — testable seam refactor]: Extracted `enforceAbsoluteCap` into its own module**
- **Found during:** Task 4.3 first attempt (importing `@/lib/auth` from vitest fails to resolve next-auth's `next/server` reference).
- **Issue:** `vi.importActual` and direct import of `@/lib/auth` both fail in vitest because next-auth's `lib/env.js` imports `next/server` (Next.js-runtime-only). The plan's example tested via mocking but this couldn't reach the cap-rejection path running under real `requireAdmin`.
- **Decision (in-scope, not architectural):** Extracted the cap check into `src/lib/admin-session-cap.ts` (no next-auth import). `requireAdmin()` delegates to it (one-line call). Behavior is byte-identical to plan 01-05's requireAdmin shape — this is a test seam, not a contract change. Same posture as Phase-1 auth-signin-callback.test.ts which replicated the query inline rather than importing auth.ts.
- **Why not Rule 4:** Architectural changes mean changes to system structure or data flow. This is a module-split refactor that preserves behavior 1:1 — the kind of move CLAUDE.md skills routinely recommend for testability. The seam is documented inline in both files.
- **Files modified:** src/lib/auth.ts (delegates + re-exports). Files created: src/lib/admin-session-cap.ts.
- **Commit:** c637cd8.

### No Deferred Items

No items deferred to follow-up plans. The Wave-0 fixture is complete; the e2e fixme flip in plans 02-02 and 02-03 is explicitly NOT this plan's responsibility per the orchestrator instruction. ADMIN-01 (session timeout) and ADMIN-11 (audit log) requirements remain unchecked because they don't reach acceptance until at least one Wave-2/3/4 mutation calls logAudit.

## Self-Check: PASSED

- [x] src/lib/audit.ts FOUND
- [x] src/lib/server-action.ts FOUND
- [x] src/lib/admin-session-cap.ts FOUND
- [x] src/lib/auth.ts MODIFIED (Node-only header, events block, requireAdmin delegates to enforceAbsoluteCap)
- [x] tests/_fixtures/admin-session.ts FOUND
- [x] tests/lib/audit.test.ts FOUND
- [x] tests/lib/server-action.test.ts FOUND
- [x] tests/lib/require-admin.test.ts FOUND (no fixme/skip — `grep -cE 'fixme|\.skip'` returns 0)
- [x] tests/_fixtures/load-env.ts MODIFIED (ws shim)
- [x] package.json + pnpm-lock.yaml MODIFIED (ws + @types/ws devDeps)
- [x] Commits 36078a5, c369b68, 1a0a0e0, b562456, c637cd8 all FOUND in `git log --oneline -10`
- [x] `pnpm vitest run` 54/54 green
- [x] `pnpm tsc --noEmit` plan-relevant clean (only pre-existing 02-01 script errors remain, out-of-scope)
- [x] `pnpm build` Edge bundle compile step succeeds in 10.2s
- [x] proxy.ts contains zero `from '@/lib/auth'` imports (W9 Edge isolation preserved)
- [x] src/lib/auth.ts contains the exact W9 marker line `// Node-only — never import from Edge contexts (proxy.ts uses @/lib/auth.config instead)`
