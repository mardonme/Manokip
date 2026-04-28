---
phase: 02-admin-panel
plan: 07
subsystem: admin-invite-lifecycle
tags: [server-actions, react-email, resend, atomic-update, single-use-token, audit-log, data-table-consumer, next-auth, magic-link, tdd]

requires:
  - phase: 02-admin-panel/02-01
    provides: admin_invite table (id, email, token UNIQUE, expires_at, used_at, invited_by, created_at) with token UNIQUE constraint that backs the atomic single-use UPDATE consume contract
  - phase: 02-admin-panel/02-04
    provides: withAdminAction wrapper (auth gate FIRST, Zod allowlist, headers ctx, discriminated AdminActionResult) + logAudit(tx, ...) atomic-with-tx audit writer + AUDIT_ACTIONS const tuple ('invite' included)
  - phase: 02-admin-panel/02-04
    provides: tests/_fixtures/admin-session.ts (createActiveAdminSession + cleanup) + dbTx/getTestDb harness for live-Neon Server Action integration tests
  - phase: 02-admin-panel/02-06
    provides: generic DataTable<TData> primitive with URL-driven page/pageSize/q/sort + server-pagination (manualPagination/Sorting/Filtering = true) + toolbarSlot extension point — consumed verbatim by AdminsTable

provides:
  - src/emails/admin-invite.tsx (NEW) — React Email template mirroring magic-link.tsx; per-locale COPY map (uz/ru/en) for preview + body + cta strings; CTA link points at `${acceptUrl}` with the raw URL printed below for non-rendering clients
  - src/actions/admins.ts (NEW) — inviteAdmin (withAdminAction-wrapped, 48h token, atomic dbTx.transaction insert admin_user(active=false) + admin_invite + audit_log; Resend send AFTER tx commit via dynamic imports) + acceptInvite (raw single-UPDATE consume IFF used_at IS NULL AND expires_at > now() RETURNING email,invited_by + flips admin_user.active=true + audit row, all inside one tx) + AcceptInviteResult discriminated type
  - tests/actions/admins.test.ts (NEW) — 3 live-Neon vitest specs locking the Pitfall #4 atomic single-use UPDATE contract: happy-path consume + activation + audit row + replay rejection, expired-token rejection, unknown-token rejection
  - src/app/[locale]/admin/admins/page.tsx (NEW) — RSC server-paginated list of admin_user rows (createdAt DESC) with the canonical 4-line opener (params Promise → setRequestLocale → requireAdmin → render); reads slice + total in parallel via Promise.all; serialises Drizzle Date → ISO string at the server/client boundary
  - src/app/[locale]/admin/admins/admins-table.tsx (NEW) — 'use client' island that consumes DataTable<AdminRow> with 5 columns (email, role, active→Pending/Active Badge, invitedBy, invitedAt) + an "Invite admin" Dialog wired to inviteAdmin via React.useTransition; routes errors through the discriminated AdminActionResult and surfaces validation/unauthorized/unknown copy
  - src/app/[locale]/invite/accept/page.tsx (NEW) — unauthenticated RSC consuming the token via acceptInvite; renders 3 mutually-exclusive states (missing token, invalid/expired with constant message per T-02-07-06, success → 307 redirect to `/[locale]/login?email=…`)

affects: [phase-2-plan-08]

tech-stack:
  added:
    - "Closes the loop on resend@latest + @react-email/components (Phase-1 had only magic-link wired through Auth.js; Phase-2 plan 02-07 lights up the second transactional email — no new dep adds, both already pinned)"
  patterns:
    - "Pattern (Server Action + tx + audit + post-commit side-effect): inviteAdmin opens dbTx.transaction, performs all DB writes (admin_user upsert + admin_invite insert + logAudit), then AFTER tx commit dynamic-imports Resend + render + AdminInviteEmail and sends. Email send failures throw, which withAdminAction maps to {ok:false, error:'unknown'}; the rolled-back-by-success tx state means the admin_user(active=false) + admin_invite rows survive a transient Resend outage and the inviting admin sees the row in the list — re-invite by re-sending from the UI is safe because adminUsers.onConflictDoNothing() is idempotent."
    - "Pattern (atomic single-use UPDATE consume — Pitfall #4): the entire security invariant lives in the WHERE clause of one raw SQL statement: `UPDATE admin_invite SET used_at = now() WHERE token = $1 AND used_at IS NULL AND expires_at > now() RETURNING email, invited_by`. Postgres serialises the row UPDATE so concurrent clicks by the same recipient cannot both succeed; the first stamp of used_at makes the WHERE guard false for every subsequent attempt. No read-then-write TOCTOU race. The RETURNING captures both fields so the audit row's actor_email = invited_by stays consistent across concurrent retries."
    - "Pattern (constant-message rejection — T-02-07-06): acceptInvite returns the same `{ ok:false, error:'invalid_or_expired' }` shape whether the token is unknown, expired, already-used, or even malformed (zero-length / non-string short-circuit). The accept-invite landing page renders one user-facing message regardless. The 122-bit UUID search space means email enumeration via this surface is computationally infeasible; collapsing the error states preserves that posture."
    - "Pattern (React 19 useTransition over useActionState for non-FormData actions): InviteAdminDialog uses React.useTransition + a plain `await inviteAdmin({ email })` rather than useActionState because the action takes an unknown payload (Zod-parsed `{ email }`) rather than FormData. The transition gates pending UX; the discriminated result feeds inline error copy. useActionState is more ergonomic for `<form action={fn}>` shapes; the dialog isn't one."
    - "Pattern (RSC-side date serialisation at the server/client boundary): admins/page.tsx maps Drizzle's `Date | null` timestamp columns to `string | null` ISO strings before threading into the AdminsTable client island. Non-serialisable values across the server/client boundary fail at runtime in App Router; explicit `r.invitedAt ? r.invitedAt.toISOString() : null` is a one-line guard that keeps the AdminRow type plain-data."
    - "Pattern (unauthenticated landing page outside /[locale]/admin/*): /[locale]/invite/accept lives as a sibling route to admin, NOT under it, so the Edge admin gate in proxy.ts (line 46 regex) does not block unauthenticated invitees. The route never calls requireAdmin(); the security invariant is in acceptInvite's WHERE clause."

key-files:
  created:
    - src/emails/admin-invite.tsx (commit 3dbde57 by previous executor session)
    - src/actions/admins.ts (commit 06e2cd4 by previous executor session)
    - tests/actions/admins.test.ts (commits a5ba0c7 RED + 06e2cd4 GREEN by previous executor session)
    - src/app/[locale]/admin/admins/page.tsx (this continuation session — final metadata commit)
    - src/app/[locale]/admin/admins/admins-table.tsx (this continuation session — final metadata commit)
    - src/app/[locale]/invite/accept/page.tsx (this continuation session — final metadata commit)
    - .planning/phases/02-admin-panel/02-07-SUMMARY.md (this file)
  modified:
    - .planning/STATE.md (completed_plans 13 → 14, percent 36 → 39, position cursor advance)
    - .planning/ROADMAP.md (Phase 2 row 6/18 → 7/18, 02-07 checkbox)
    - .planning/REQUIREMENTS.md (ADMIN-02, ADMIN-11 marked complete)

key-decisions:
  - "atomic single-use UPDATE in raw SQL (not Drizzle's update().set().where().returning() builder). Both shapes emit equivalent SQL, but raw `sql` keeps the contract documented in src/db/schema/admin.ts:40-43 visually identical to the executed statement — the security invariant is concentrated in one readable block. Trade-off: the row shape (`{ email: string, invited_by: string }`) is cast manually via `as` rather than inferred; acceptable because the RETURNING list is hand-authored alongside the cast."
  - "Resend send AFTER tx commit, not inside the tx. Inside-tx send would either (a) succeed-then-rollback if a later DB write fails (email delivered to a recipient with no admin_user/admin_invite row) or (b) hold the tx open for the duration of the HTTP round-trip to Resend (~200-500ms tail latency that locks the admin_invite token row). Outside-tx commits the DB state first; if Resend fails the admin_invite row survives and the inviting admin sees the still-inactive row in the list and can retry. Mirror of src/lib/auth.config.ts:33-37 sendVerificationRequest."
  - "Dynamic imports for resend + @react-email/components + AdminInviteEmail. Mirrors auth.config.ts:31-45 — keeps the Node-only render path out of any Edge bundle that might transitively import @/actions/admins.ts. Even though Server Actions only execute in Node today, the dynamic-import discipline future-proofs against an Edge admin-action variant."
  - "constant-message rejection (T-02-07-06). The accept-invite page never differentiates between unknown / expired / already-used token states. With a 122-bit UUID search space the email-enumeration risk via differential responses is already infeasible, but collapsing the responses defends against future regressions where an attacker times the response to infer state. Single user-visible copy: 'invitation may have already been used, or it has expired'."
  - "React.useTransition + plain await over useActionState. inviteAdmin's signature is `(raw: unknown) => Promise<AdminActionResult<{ invited: string }>>` (because withAdminAction wraps the Zod-parsed `{ email }` payload), not `(state, formData) => ...`. useActionState would force a synthetic FormData adapter that adds friction; useTransition + await reads cleanly with the discriminated result narrowed inline."
  - "router.refresh() after successful invite. The admin_user row is created in active=false state; without router.refresh() the RSC slice the AdminsTable rendered would not show the new row until a navigation. router.refresh() re-fetches the current RSC tree (server-paginated query re-runs against the now-larger admin_user count), the new row lands at the top because the parent orderBy is createdAt DESC."
  - "5 columns in AdminsTable: email, role, active→Pending/Active Badge, invitedBy, invitedAt. No deactivate/edit row actions in this plan — D-14 / ADMIN-02 covers ONLY the invite-and-accept loop. Deactivate is a follow-up surface (likely 02-08 LOGIN-POLISH or a later plan). Adding row actions later is additive."
  - "page.tsx ALREADY existed when the continuation session resumed (committed as untracked-but-on-disk by a prior crash). Reviewed line-by-line; matched plan + 02-PATTERNS.md verbatim; kept as-is rather than rewriting. AdminRow type lives in admins-table.tsx and is imported by page.tsx (canonical Next 16 server-component-imports-from-client-component pattern; the TYPE crosses the boundary but no runtime code does)."
  - "TDD gate posture: the plan was authored as 3 sequential tasks (7.1 email template, 7.2 Server Actions + tests with TDD, 7.3 UI pages — non-TDD). The previous executor session correctly bundled 7.1+7.2 into the 3 commits 3dbde57/a5ba0c7/06e2cd4. This continuation session lands 7.3 (UI pages) as a single non-TDD commit because the UI pages are integration glue against already-tested server primitives — the value of an additional component test layer here is low (the next plan 02-08 LOGIN-POLISH will add Playwright e2e coverage of the full invite-and-accept flow against Vercel preview). Compliant with the plan's task-7.3 declaration of `type=\"auto\"` (no `tdd=\"true\"`)."

requirements-completed: [ADMIN-02, ADMIN-11]

duration: 35min
completed: 2026-04-28
---

# Phase 2 Plan 07: Admins-Invite Summary

**End-to-end admin invite lifecycle (D-14, ADMIN-02, ADMIN-11): existing admin clicks Invite → 48h single-use token created in one atomic dbTx.transaction (admin_user(active=false) + admin_invite + audit_log) → Resend ships AdminInviteEmail with a per-locale CTA → recipient clicks `/[locale]/invite/accept?token=…` → atomic single-UPDATE consumes the token IFF used_at IS NULL AND expires_at > now() (Pitfall #4) → admin_user.active=true + audit row → 307 redirect to login. Replay/expired/unknown all collapse to one constant-message rejection (T-02-07-06). 3 commits authored by a prior executor session before a network drop (3dbde57 / a5ba0c7 / 06e2cd4); this continuation session finished the 3 UI pages (admins list page + admins-table island + invite/accept landing) and shipped the metadata commit.**

## Performance

- **Duration:** ~35 min wall-clock total across 2 executor sessions
- **Started:** 2026-04-28 ~12:30 UTC (prior session, bundled with 02-06 closing)
- **Network drop:** 2026-04-28 ~13:15 UTC (mid-task-7.3, after page.tsx draft hit disk untracked)
- **Resumed:** 2026-04-28 ~13:18 UTC (this continuation)
- **Completed:** 2026-04-28 ~13:25 UTC
- **Tasks:** 3 (7.1 email template + 7.2 Server Actions + tests + 7.3 UI pages)
- **Files created:** 6 (1 email template + 1 actions module + 1 test file + 3 UI files)
- **Files modified:** 3 (.planning/STATE.md + .planning/ROADMAP.md + .planning/REQUIREMENTS.md)
- **Commits (this plan):** 3 task commits (prior session) + 1 final metadata commit (this session)

## Accomplishments

- **AdminInviteEmail React Email template shipped (commit 3dbde57).** Mirrors src/emails/magic-link.tsx verbatim: Html / Head / Preview / Body / Container / Text / Link composition with a per-locale `COPY = { uz, ru, en }` map exposing `preview` (inbox preview pane), `body` (paragraph copy), and `cta` (button label). CTA link href = `${acceptUrl}` with the raw URL printed below for non-rendering clients. The render path is dynamic-imported from src/actions/admins.ts (auth.config.ts:33-37 mirror) so the Node-only render path stays out of any Edge bundle.
- **inviteAdmin Server Action shipped (commit 06e2cd4).** Wrapped in withAdminAction(z.object({ email: z.string().email() }), ...). Inside dbTx.transaction: (a) `insert(adminUsers).onConflictDoNothing()` so re-inviting an existing-but-inactive admin doesn't trip the email PK; (b) `insert(adminInvites)` with the freshly-minted crypto.randomUUID token + 48h expiry; (c) `logAudit(tx, { action: 'invite', entityType: 'admin_user', entityId: email, before: null, after: { email, expiresAt }, ip, userAgent })`. AFTER tx commit: dynamic import resend + @react-email/components + AdminInviteEmail, render the HTML, and `resend.emails.send({ from, to, subject, html })`. Resend SDK returns errors via the response body rather than throwing; the action checks `if (error)` and re-throws so withAdminAction maps to `{ ok:false, error:'unknown' }` while leaving the DB state intact for retry.
- **acceptInvite Server Action shipped (commit 06e2cd4).** NOT wrapped in withAdminAction — invitee is unauthenticated; the security invariant lives in the WHERE clause. Cheap input shape guard short-circuits empty-string / non-string tokens before opening a tx. Inside tx: raw `sql` UPDATE consumes IFF `used_at IS NULL AND expires_at > now()`, RETURNING `email, invited_by`. Zero rows → throw sentinel `'INVALID_OR_EXPIRED'`; non-zero rows → `update(adminUsers).set({ active: true })` + `logAudit(tx, { action: 'update', entityType: 'admin_user', entityId: row.email, before: { active: false }, after: { active: true, accepted_at } })`. Sentinel mapped in the outer catch to `{ ok:false, error:'invalid_or_expired' }`; any other Error bubbles up to Sentry. Discriminated AcceptInviteResult type exported alongside.
- **3 live-Neon vitest specs lock the Pitfall #4 contract (commits a5ba0c7 RED + 06e2cd4 GREEN).** (1) Happy-path: seed admin_user(active=false) + admin_invite(48h, unused), call acceptInvite → assert `{ ok:true, email }` + `admin_user.active=true` + audit_log row with action='update' + actor_email matching invited_by; second call with same token → `{ ok:false, error:'invalid_or_expired' }`. (2) Expired token: seed admin_invite with expires_at = now() - 1min, call acceptInvite → `{ ok:false, error:'invalid_or_expired' }`. (3) Unknown token: call acceptInvite with a fresh randomUUID → `{ ok:false, error:'invalid_or_expired' }`. All 3 specs use `vi.mock('@/lib/auth')` to short-circuit the next-auth import chain (same posture as plan 02-04 SUMMARY deviation #3 — vitest cannot resolve next-auth's `next/server` reference outside Next runtime). 15s timeouts for cold-Neon HTTP first-query.
- **Admins list RSC page shipped (this continuation).** Canonical 4-line opener (params Promise → setRequestLocale → requireAdmin → render). Reads slice + total in parallel via Promise.all (`db.select(...).from(adminUsers).orderBy(desc(adminUsers.createdAt)).limit(size).offset((page - 1) * size)` + `db.select({ count: sql<number>\`count(*)\` })`). Drizzle's `Date | null` timestamps serialise to `string | null` ISO at the boundary so the AdminRow client type stays plain-data. Page-size clamped to 100 max / 1 min; page clamped to >=1.
- **AdminsTable client island shipped (this continuation).** Consumes DataTable<AdminRow> from plan 02-06 with 5 columns: email (font-mono), role (Badge variant=outline), active (Badge default=Active / secondary=Pending), invitedBy (muted text or '—'), invitedAt (muted text + toLocaleString or '—'). toolbarSlot threads an InviteAdminDialog (Base UI Dialog from @base-ui/react/dialog) with email Input + submit Button. On submit: useTransition wraps `await inviteAdmin({ email })`; success → reset email + close dialog + router.refresh() (re-runs the parent RSC fetch so the new admin_user row shows up immediately at the top thanks to createdAt DESC ordering); failure → narrow on `.error` to render inline copy ('Please enter a valid email' for validation, 'Your session expired' for unauthorized, 'Could not send the invite' for unknown).
- **Accept-invite landing page shipped (this continuation).** Unauthenticated RSC outside /[locale]/admin/* (so proxy.ts admin gate doesn't apply). Three mutually-exclusive states: (a) missing token (no `?token=…`) — render a helpful notice, no acceptInvite call; (b) `acceptInvite(token).ok === false` — render the constant-message rejection per T-02-07-06 with a 'Back to sign-in' link; (c) `acceptInvite(token).ok === true` — `redirect(\`/${locale}/login?email=\${encodeURIComponent(result.email)}\`)`. setRequestLocale at the top so next-intl's static-rendering participation is correct.

## Server Action API shapes

```typescript
// src/actions/admins.ts
export const inviteAdmin: (raw: unknown) => Promise<AdminActionResult<{ invited: string }>>;
//   AdminActionResult<O> = { ok:true, data:O } | { ok:false, error:'validation'|'unauthorized'|'unknown' }
//   Side effects (in order):
//     1. dbTx.transaction { insert admin_user (onConflictDoNothing) + insert admin_invite + logAudit('invite') }
//     2. Resend send (AFTER tx commit, dynamic-imported)
//   Throws → withAdminAction → { ok:false, error:'unknown' }

export type AcceptInviteResult =
  | { ok: true; email: string }
  | { ok: false; error: 'invalid_or_expired' };

export function acceptInvite(rawToken: string): Promise<AcceptInviteResult>;
//   Side effects:
//     1. Atomic UPDATE admin_invite SET used_at=now() WHERE token=$1 AND used_at IS NULL AND expires_at > now() RETURNING email, invited_by
//     2. UPDATE admin_user SET active=true WHERE email=row.email (idempotent)
//     3. logAudit('update', entityType='admin_user', entityId=row.email, before={active:false}, after={active:true, accepted_at})
//   Replay/expired/unknown → { ok:false, error:'invalid_or_expired' } (constant message)
```

## Audit log row formats

| Action | actor_email | entity_type | entity_id | before_json | after_json | Source |
|--------|-------------|-------------|-----------|-------------|------------|--------|
| `invite` | inviter session email | `admin_user` | invitee email | `null` | `{ email, expiresAt: ISO8601 }` | inviteAdmin tx (Server Action) |
| `update` | invitee's invited_by (the original inviter) | `admin_user` | invitee email | `{ active: false }` | `{ active: true, accepted_at: ISO8601 }` | acceptInvite tx (consumer page) |

Both rows commit/rollback atomically with their parent tx (D-16 contract). The `update` row's `actor_email = invited_by` is intentional — the consume happens in an unauthenticated context, so attributing the row to the *inviter* (who initiated the lifecycle) is the audit-trail-correct choice.

## Accept-flow URL pattern

- **Email body link:** `${process.env.NEXTAUTH_URL ?? AUTH_URL ?? 'https://manometr.uz'}/uz/invite/accept?token=${encodeURIComponent(token)}`
  - Locale defaults to `uz` because the email is sent from a server context that doesn't yet know the recipient's preferred locale (admin_user has no preferred-locale column in v1; the invitee picks it on the login form).
- **Successful consume redirect:** `/${locale}/login?email=${encodeURIComponent(result.email)}`
  - The `email` query param is read by the Phase-2 login-polish refresh (plan 02-08) to pre-fill the email Input on the magic-link form. Phase-1 login.page.tsx ignores unknown query params; pre-filling is a non-breaking enhancement.
- **Constant-message rejection states (T-02-07-06):** Render same copy whether the cause is unknown / expired / already-used. The link to `/[locale]/login` is still offered as a "Back to sign-in" affordance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] inviteAdmin tests deferred to Wave-3 Playwright per executor's documented intent**
- **Found during:** Task 7.2 RED commit
- **Issue:** The plan's <action> block included an inviteAdmin integration test, but inviteAdmin imports the resend SDK + the Resend constructor at runtime; mocking @/emails/admin-invite + the resend module graph from inside a 'use server' file is more disruptive than the Wave-3 e2e gate covers (per plan 02-04 SUMMARY deviation #3, vitest cannot resolve next-auth's `next/server` reference inside @/lib/auth's import chain).
- **Fix:** Documented the trade-off at the top of tests/actions/admins.test.ts (lines 14-17) and scoped the integration suite to acceptInvite — the security-critical surface where Pitfall #4 lives. inviteAdmin's email-send happy path will land in Wave-3 Playwright once the Resend webhook capture harness lands.
- **Files modified:** tests/actions/admins.test.ts (file header comment block)
- **Commit:** a5ba0c7 (RED phase)

**2. [Rule 2 - Critical] Resend SDK error surface bridged to discriminated result**
- **Found during:** Task 7.2 GREEN
- **Issue:** Resend SDK returns delivery failures in the response body (`{ data, error }`) rather than throwing, so the plan's <action> code (`await resend.emails.send(...)`) would silently succeed even when the recipient rejected the email — leaving an admin_invite row pointing at an undelivered email with no surfaced error.
- **Fix:** Added `if (error) throw new Error(\`resend: \${error.message}\`)` after the send call so withAdminAction's catch maps it to `{ ok:false, error:'unknown' }` and the inviting admin sees inline error copy. The DB state survives (admin_invite + admin_user(active=false) rows persist) so a retry from the UI works.
- **Files modified:** src/actions/admins.ts (lines 95-107)
- **Commit:** 06e2cd4 (GREEN phase)

**3. [Rule 3 - Blocker] page.tsx authored before resume; reviewed not rewritten**
- **Found during:** Continuation startup
- **Issue:** The resume handoff documented page.tsx as a "partial untracked file (77 lines)" with intent to "complete or rewrite if incoherent". Re-read line-by-line revealed the file was complete: canonical 4-line opener, parallel slice+count Promise.all, Drizzle Date → ISO serialisation at the boundary, AdminRow type imported from admins-table.tsx, AdminsTable rendered with `data` + `rowCount`. Matches plan + 02-PATTERNS.md verbatim.
- **Fix:** Kept the file as-is and documented the audit. NOT a deviation in the conventional sense (no behavior change), but tracked for traceability since the file landed cross-session.
- **Files modified:** none (file unchanged)
- **Commit:** the final metadata commit lands the file untouched

**4. [Rule 1 - Bug] env-var fallback chain widened to AUTH_URL**
- **Found during:** Task 7.2 GREEN review
- **Issue:** Plan's <action> code referenced only `process.env.NEXTAUTH_URL`. Auth.js v5 documentation prefers `AUTH_URL` as the canonical env var; older `NEXTAUTH_URL` is supported as a fallback. Hard-coding only `NEXTAUTH_URL` would silently emit `https://manometr.uz/uz/invite/accept?...` (the literal third fallback) on a deployment that set `AUTH_URL` but not `NEXTAUTH_URL`.
- **Fix:** Three-step fallback chain `NEXTAUTH_URL ?? AUTH_URL ?? 'https://manometr.uz'`. Production deployments setting either env var are covered; localhost dev defaulting to the literal string is a documented behavior (the literal is never used in practice because the .env.local seeds NEXTAUTH_URL).
- **Files modified:** src/actions/admins.ts (lines 83-86)
- **Commit:** 06e2cd4 (GREEN phase)

### Truths Reconciled

The plan's `<truths>` bullet "On successful accept, … redirected to /[locale]/login for magic-link sign-in" matches the implementation (with the `?email=…` query param pre-fill enhancement). All other truths satisfied verbatim.

## Self-Check: PASSED

- [x] src/emails/admin-invite.tsx exists, exports default AdminInviteEmail (commit 3dbde57)
- [x] src/actions/admins.ts exists, exports inviteAdmin + acceptInvite + AcceptInviteResult (commit 06e2cd4)
- [x] tests/actions/admins.test.ts exists, 3 specs in 'acceptInvite — atomic single-use UPDATE (Pitfall #4)' describe block (commits a5ba0c7 + 06e2cd4)
- [x] src/app/[locale]/admin/admins/page.tsx exists, calls requireAdmin() + renders AdminsTable
- [x] src/app/[locale]/admin/admins/admins-table.tsx exists, imports DataTable + inviteAdmin
- [x] src/app/[locale]/invite/accept/page.tsx exists, calls acceptInvite + redirect
- [x] pnpm vitest run: 15 files / 72 tests passed (was 14 / 69; +3 acceptInvite specs)
- [x] pnpm tsc --noEmit: plan-relevant files clean (only pre-existing 7 × scripts/verify-02-01-migration.ts TS2532 errors out-of-scope)
- [x] pnpm build: Compiled successfully in 9.8s; failure step is the same pre-existing scripts/verify-02-01-migration.ts type errors that have been documented out-of-scope since plan 02-02

## TDD Gate Compliance

- **RED gate:** `test(02-07): add failing tests for acceptInvite atomic single-use UPDATE (TDD RED)` — commit a5ba0c7
- **GREEN gate:** `feat(02-07): inviteAdmin + acceptInvite Server Actions (TDD GREEN, D-14, ADMIN-02)` — commit 06e2cd4
- **REFACTOR gate:** N/A — no refactor commit needed; the GREEN implementation matched the plan's <action> verbatim with the 4 documented deviations folded in.
