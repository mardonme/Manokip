---
phase: 05-contact-launch-polish
plan: 02
subsystem: server-stack
tags: [wave-1, server-action, turnstile, rate-limit, react-email, resend, audit-log, contact-form, withPublicAction]
requires:
  - 05-01 (contact_rate_limit table on Neon dev branch; AUDIT_ACTIONS extended with spam_detected/rate_limited/contact_submission_create; 4 env vars; 6 RED stub files)
provides:
  - withPublicAction sibling to withAdminAction (honeypot → Turnstile → rate-limit triple-gate)
  - verifyTurnstile (Cloudflare siteverify wrapper)
  - hashIp + parseClientIp + checkAndIncrementRateLimit + RateLimitError (HMAC + atomic 2-bucket UPSERT)
  - contactInsertSchema (visitor input Zod schema + ContactInsertInput type)
  - ContactAdminEmail (English-only) + ContactAutoReply (locale-parameterized uz/ru/en) React Email templates
  - sendAdminNotification + sendVisitorAutoReply async senders + fireAdminNotification + fireVisitorAutoReply fire-and-forget wrappers
  - submitContactForm Server Action (atomic insert + audit row + fire-and-forget emails)
  - All 6 plan-01 RED stub files flipped GREEN (29 specs total — 0 it.skip remaining in scope)
affects:
  - tests/lib/server-action-public.test.ts (flipped 6 RED → GREEN)
  - tests/lib/turnstile.test.ts (flipped 4 RED → GREEN by prior agent)
  - tests/lib/rate-limit.test.ts (flipped 5 RED → GREEN by prior agent)
  - tests/db/contact-rate-limit.test.ts (flipped 4 RED → GREEN by prior agent)
  - tests/lib/email-contact.test.ts (flipped 5 RED → GREEN; module names changed from contact-submission-* to contact-* per plan files_modified)
  - tests/actions/contact.test.ts (flipped 5 RED → GREEN with vi.mock chain mirroring tests/actions/recipes.test.ts)
tech-stack:
  added:
    - "@marsidev/react-turnstile (resolved version recorded by prior agent in task 2.1 commit 82f5b1f)"
  patterns:
    - withPublicAction sibling to withAdminAction (honeypot/Turnstile/rate-limit triple-gate composed inside the wrapper, not in the handler)
    - Atomic 2-bucket UPSERT in dbTx.transaction with ON CONFLICT DO UPDATE (5/hour AND 20/day per hashed IP)
    - HMAC-SHA256 IP hash with RATE_LIMIT_IP_SALT (raw IPs never persisted — GDPR posture)
    - Audit row INSIDE the same transaction as the contact_submission INSERT (CLAUDE.md every-mutation-writes-audit guardrail; checker W-3 path A)
    - Fire-and-forget Resend dispatch via void send().catch(Sentry.captureException) — visitor never waits on Resend (D-10)
    - ADMIN_NOTIFY_EMAILS empty/unset → silent skip in lib (Pitfall 5: Resend rejects empty recipient arrays)
    - server-side sourcePage validation against /^\/(uz|ru|en)\/[a-z0-9\-/]*$/ regex (T-CTA-04 mitigation; falls back to /<locale> on mismatch)
    - product-context auto-prepend when sourcePage matches /(uz|ru|en)/products/<slug> AND product is published (D-03 fail-open)
    - BigInt → string at audit-log boundary (entityId is text in audit_log schema; bigserial.id from contact_submission)
    - Resend `react: <Component .../>` direct passthrough — no manual render() needed (Resend SDK invokes @react-email/render at send time)
key-files:
  created:
    - src/lib/turnstile.ts (prior agent — task 2.1)
    - src/lib/rate-limit.ts (prior agent — task 2.2)
    - src/lib/zod/contact.ts (prior agent — task 2.3)
    - src/emails/contact-admin.tsx (this agent — task 2.5)
    - src/emails/contact-auto-reply.tsx (this agent — task 2.5)
    - src/lib/email-contact.ts (this agent — task 2.5)
    - src/actions/contact.ts (this agent — task 2.6)
  modified:
    - src/lib/server-action.ts (this agent — task 2.4 added withPublicAction sibling; existing withAdminAction unchanged)
    - tests/lib/server-action-public.test.ts (this agent — flipped RED → GREEN, 6 specs)
    - tests/lib/email-contact.test.ts (this agent — flipped RED → GREEN, 5 specs)
    - tests/actions/contact.test.ts (this agent — flipped RED → GREEN, 5 specs)
    - tests/lib/turnstile.test.ts (prior agent — flipped, 4 specs)
    - tests/lib/rate-limit.test.ts (prior agent — flipped, 5 specs)
    - tests/db/contact-rate-limit.test.ts (prior agent — flipped, 4 specs)
    - package.json + pnpm-lock.yaml (prior agent — task 2.1 install)
decisions:
  - "withPublicAction lives in src/lib/server-action.ts as a sibling export of withAdminAction (NOT a separate file). Keeps the Server-Action wrapper stack discoverable in one place — Phase 2/3/4 admin actions and the new Phase 5 public action all share the file. Existing withAdminAction body is unchanged."
  - "PublicActionResult has 5 error variants: validation, turnstile_failed, rate_limited, spam_detected, unknown. spam_detected is internal-only (the wrapper returns ok:true silently per D-04 drop-don't-retry posture; spam_detected appears only in the audit_log entry, not in the response)."
  - "RateLimitError catch block opens a SEPARATE dbTx.transaction to write the rate_limited audit row. This is intentional: the original rate-limit transaction rolled back when RateLimitError threw (so the failed UPSERT row doesn't permanently consume the hourCount/dayCount budget — Open Q §2 rollback model). The audit row needs its own tx so it survives."
  - "submitContactForm uses dbTx (WS Pool) for the atomic insert + audit, but db (HTTP driver) for the single-statement product lookup. Mirrors src/actions/recipes.ts posture — multi-statement → dbTx, single-statement → db."
  - "FROM address for all contact emails reuses RESEND_FROM_EMAIL (Phase 1 verified domain) — did NOT invent AUTH_RESEND_FROM as the plan literal suggested. The plan literal said 'reuse what Phase 1 ships' so this satisfies the spec."
  - "Email template paths use src/emails/contact-admin.tsx + src/emails/contact-auto-reply.tsx (per plan files_modified field) — NOT contact-submission-* as the plan-01 RED stub originally imported. Plan-01 stub used dynamicImport with string specifiers, so flipping included updating the import paths to match the canonical filenames."
  - "tests/actions/contact.test.ts mocks next-intl/server's getTranslations to return a stub that echoes the namespace.key plus interpolation vars. Tests assert prepend STRUCTURE (the productInquiry line is present and separated by \\n\\n from the visitor's message), not the exact wording — plan 05-03 fills the actual messages skeleton."
  - "Resend SDK accepts react: <Component .../> directly; @react-email/render is invoked internally by the SDK. No manual render() call needed in src/lib/email-contact.ts (different from src/lib/auth.config.ts which goes through Auth.js's Resend provider that requires raw HTML)."
metrics:
  duration_minutes: 60
  completed: 2026-05-05
  commits: 6
  tasks: 6
  files_created: 7
  files_modified: 7
---

# Phase 5 Plan 2: Server Stack (Turnstile + rate-limit + withPublicAction + emails + submitContactForm) Summary

**One-liner:** Wave 1 server stack lands every Phase-5 server-side capability for CTA-01/CTA-02/CTA-04 in 6 atomic commits — Cloudflare Turnstile siteverify wrapper, HMAC-SHA256 IP hash + atomic 2-bucket rate-limit UPSERT, withPublicAction sibling to withAdminAction composing the honeypot/Turnstile/rate-limit triple-gate, contactInsertSchema visitor input schema, 2 React Email templates (English-only admin notification + locale-parameterized uz/ru/en visitor auto-reply), Resend fire-and-forget dispatcher, and submitContactForm Server Action that atomically inserts contact_submission + writes contact_submission_create audit row before firing best-effort emails. All 6 plan-01 RED stub files flipped GREEN (29 specs).

## What Shipped

### 6 atomic commits (one per task; resumed from prior-agent usage limit)

1. **Task 2.1** (`82f5b1f`, prior agent) — `feat(05-02): add Turnstile siteverify wrapper + flip turnstile RED to GREEN`
   - `pnpm add @marsidev/react-turnstile` (Wave 3 plan 05-03 will use the React widget)
   - `src/lib/turnstile.ts` — verifyTurnstile(token, ip) → POST to https://challenges.cloudflare.com/turnstile/v0/siteverify with cache:'no-store'; returns { success, errorCodes? } discriminated. siteverify-http-error error code on non-2xx.
   - `tests/lib/turnstile.test.ts` flipped — 4/4 specs GREEN (Cloudflare always-pass / always-fail test keys + HTTP error path).

2. **Task 2.2** (`8dbc60f`, prior agent) — `feat(05-02): add rate-limit lib + flip rate-limit/contact-rate-limit RED to GREEN`
   - `src/lib/rate-limit.ts` — hashIp (HMAC-SHA256 with RATE_LIMIT_IP_SALT), parseClientIp (Vercel-canonical x-forwarded-for first hop; x-real-ip fallback; 'unknown' default), checkAndIncrementRateLimit (atomic 2-bucket UPSERT via dbTx.transaction; throws RateLimitError when hourCount > 5 OR dayCount > 20; opportunistic DELETE of rows older than 2 days inside the same tx).
   - **Critical**: imports from `@/db/client-ws` (NOT `@/db/client`) — Pitfall #1 mitigation; HTTP driver doesn't support multi-statement transactions.
   - `tests/lib/rate-limit.test.ts` (5 specs) + `tests/db/contact-rate-limit.test.ts` (4 specs) flipped — 9/9 live-Neon GREEN.

3. **Task 2.3** (`b622c7f`, prior agent) — `feat(05-02): add contactInsertSchema visitor-input Zod schema`
   - `src/lib/zod/contact.ts` — contactInsertSchema with name/company/email/phone (D-02 optional)/message/sourcePage/locale/field_extra (honeypot)/turnstileToken; ContactInsertInput type export.
   - No tests this task — verified via tsc --noEmit.

4. **Task 2.4** (`e39adab`, this agent) — `feat(05-02): add withPublicAction wrapper + flip server-action-public RED to GREEN`
   - Appended `withPublicAction<I, O>` to `src/lib/server-action.ts` BELOW the existing `withAdminAction`. Existing withAdminAction body untouched (Phase 2/3/4 admin actions still pass).
   - 6-step pipeline: Zod allowlist (Step A) → IP extraction + HMAC hash (Step B) → honeypot check (Step C — silent ok:true + spam_detected audit row) → Turnstile siteverify (Step D — ok:false turnstile_failed on failure) → atomic rate-limit (Step E — RateLimitError caught + rate_limited audit row + ok:false rate_limited) → handler invocation (Step F).
   - `PublicActionContext { ip, ipHash, userAgent }` passed to handler (vs AdminActionContext { actorEmail, ip, userAgent }).
   - `actorEmail: 'visitor'` literal for anonymous flow.
   - `tests/lib/server-action-public.test.ts` flipped — 6/6 specs GREEN (honeypot + turnstile_failed + rate_limited live-Neon + happy-path context + validation + unknown).

5. **Task 2.5** (`223c64c`, this agent) — `feat(05-02): add 2 React Email templates + email-contact dispatcher (CTA-02)`
   - `src/emails/contact-admin.tsx` — English-only admin notification (D-09); 8 props (name/company/email/phone/message/sourcePage/locale/submittedAt) + `SUBJECT` named export. NO COPY map (English-only by design).
   - `src/emails/contact-auto-reply.tsx` — Locale-parameterized visitor auto-reply (uz/ru/en) mirroring magic-link.tsx COPY map shape; conditional productLine fragment when productContext set; `SUBJECTS` map export.
   - `src/lib/email-contact.ts` — Resend dispatcher: sendAdminNotification (ADMIN_NOTIFY_EMAILS empty → silent skip per D-07/Pitfall 5) + sendVisitorAutoReply (always sends to visitor email) + fireAdminNotification + fireVisitorAutoReply (fire-and-forget wrappers via void send().catch(Sentry.captureException) — D-10 / Pitfall 4).
   - `tests/lib/email-contact.test.ts` flipped — 5/5 specs GREEN (admin EN-only, auto-reply uz/ru/en, conditional productLine).

6. **Task 2.6** (`b57d408`, this agent) — `feat(05-02): add submitContactForm Server Action wrapping withPublicAction (CTA-01)`
   - `src/actions/contact.ts` — submitContactForm wraps withPublicAction(contactInsertSchema, handler). Handler: enrichForInsert (sourcePage validation against `/^\/(uz|ru|en)\/[a-z0-9\-/]*$/` + product-context auto-prepend if sourcePage matches `/(uz|ru|en)/products/<slug>` AND product is published) → dbTx.transaction (INSERT contact_submission + INSERT auditLog action='contact_submission_create' actorEmail='visitor' entityType='contact_submission' afterJson with sourcePage/locale/hasProductContext) → fire-and-forget admin notify + visitor auto-reply OUTSIDE the tx → return { id: String(inserted.id) }.
   - NO `revalidateTag` (no public consumer); default Node runtime (React Email Node-only).
   - `tests/actions/contact.test.ts` flipped — 5/5 specs GREEN live-Neon (happy path + product-context prepend + sourcePage validation + Resend swallows failure + ADMIN_NOTIFY_EMAILS empty).

## Deviations from Plan

### Auto-fixed (Rule 1 — Bug)

**1. Email template module names diverged from plan-01 RED-stub imports**
- **Found during:** Task 2.5 (when authoring email templates and looking at the RED stub specifiers)
- **Issue:** Plan-01 RED stub `tests/lib/email-contact.test.ts` used `dynamicImport('@/emails/contact-submission-admin')` and `'@/emails/contact-submission-auto-reply'`, but plan-02 frontmatter `files_modified` listed canonical paths `src/emails/contact-admin.tsx` and `src/emails/contact-auto-reply.tsx`.
- **Fix:** Used the plan-02 canonical paths (`contact-admin.tsx` / `contact-auto-reply.tsx`) and rewrote the test from runtime-string `dynamicImport` to direct static imports — this is the standard RED → GREEN flip pattern (replace runtime-string imports with static imports + remove `it.skip` + remove `expect.fail`). The plan literal at task 2.5 acceptance_criteria pinned `src/emails/contact-admin.tsx exists` so the canonical path is the binding contract.
- **Files modified:** `tests/lib/email-contact.test.ts`
- **Commit:** `223c64c`

### Auto-fixed (Rule 2 — Critical functionality)

**2. Resend dispatcher uses `react: <Component .../>` not manual `render()`**
- **Found during:** Task 2.5 (cross-checking against src/lib/auth.config.ts pattern)
- **Issue:** Plan literal at task 2.5 step C showed `react: ContactAdminEmail(payload)` directly. src/lib/auth.config.ts uses dynamic-import + manual `render()` because Auth.js's Resend provider takes raw HTML strings — but the Resend SDK's `emails.send()` accepts a React element via the `react:` field and renders internally via @react-email/render at send time.
- **Fix:** Verified against `node_modules/resend/dist/index.cjs` (lines 237-239 + 949) — Resend dynamically imports @react-email/render when the `react` field is present. So we pass `react: ContactAdminEmail(payload)` directly. No manual render() in src/lib/email-contact.ts. Cleaner and matches plan literal.
- **Commit:** `223c64c`

### Documented enrichments (not deviations)

**1. Audit row inside the same transaction as the contact_submission INSERT** — checker W-3 path A from planning required CLAUDE.md compliance ("every mutation writes audit_log"). Plan literal explicitly added the `auditLog` insert inside `dbTx.transaction` for `submitContactForm` (task 2.6). Implemented exactly as specified.

**2. Test stub for next-intl/server in tests/actions/contact.test.ts** — `getTranslations` from next-intl/server requires a Next.js request context to load messages from `src/i18n/request.ts`. In Vitest (no request context), the call would fail. Mocked next-intl/server to return a stub `t` function that echoes `namespace.key(vars)` so the action's enrichForInsert path runs. Tests assert prepend STRUCTURE (productInquiry line + `\n\n` separator + product name in output), not exact wording — plan 05-03 will fill the messages skeleton with real strings.

## Auth Gates

None — all tests use the existing live-Neon test branch (`DATABASE_URL` already configured in `.env.local`); Turnstile is mocked in tests; Resend dispatchers are mocked.

## Self-Check: PASSED

**Created files (7):**
- src/lib/turnstile.ts FOUND
- src/lib/rate-limit.ts FOUND
- src/lib/zod/contact.ts FOUND
- src/emails/contact-admin.tsx FOUND
- src/emails/contact-auto-reply.tsx FOUND
- src/lib/email-contact.ts FOUND
- src/actions/contact.ts FOUND

**Commits (6):**
- 82f5b1f FOUND (Task 2.1 Turnstile siteverify)
- 8dbc60f FOUND (Task 2.2 rate-limit)
- b622c7f FOUND (Task 2.3 contactInsertSchema)
- e39adab FOUND (Task 2.4 withPublicAction)
- 223c64c FOUND (Task 2.5 emails + dispatcher)
- b57d408 FOUND (Task 2.6 submitContactForm)

**Verification gates:**
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run` 46 files passed | 2 skipped (251 total tests; 238 passed | 13 skipped — the 13 skipped are plan-03/04/05 RED stubs not in this plan's scope: tests/components/contact-form.test.tsx 6, tests/components/contact-button.test.tsx 4, tests/api/sitemap.test.ts contact path coverage 3)
- All 6 plan-02 RED-stub files now have **0** `it.skip` / `expect.fail` / `test.fixme` markers (29 specs across the 6 files all GREEN)
- `grep -rn "withPublicAction" src/` returns matches in `src/lib/server-action.ts` (definition) AND `src/actions/contact.ts` (usage)
- `grep -rn "from '@/db/client'" src/lib/rate-limit.ts` returns 0 — uses client-ws (Pitfall #1 mitigation)
- `grep -rn "dbTx.transaction" src/lib/rate-limit.ts src/lib/server-action.ts src/actions/contact.ts` returns multiple hits

## Wave Closure

**Wave 1 / Plan 05-02 closes:** All Phase-5 server-side capabilities for CTA-01/CTA-02/CTA-04 are online. The visitor flow honeypot/Turnstile/rate-limit triple-gate works end-to-end before reaching the handler; the handler atomically inserts contact_submission + audit row before firing best-effort Resend emails. Insert always commits before Resend (D-10 — Resend outage produces ok:true to the visitor with a Sentry-logged warning).

**Wave 1 plans 05-03 and 05-04 unblock:**
- **Plan 05-03** can now ship the visitor UI (ContactForm + ContactButton + StickyCtaContactButton + SiteHeader mount + sticky-cta-rail wiring). The Server Action surface (`submitContactForm`) is live; the React Turnstile widget package (`@marsidev/react-turnstile`) is installed; the messages skeleton can be filled with real translations and the existing TODO placeholders will populate the productInquiry prepend line automatically (the action uses `getTranslations` so plan-03's i18n changes flow through without a code change).
- **Plan 05-04** can now extend `src/lib/sitemap.ts` with `/contact` per locale and flip the 3 sitemap RED-stub specs.

## TDD Gate Compliance

Plan 05-02 is `type: execute` (not `type: tdd`). The RED-stub flip pattern was inherited from plan 05-01 (which seeded 6 server-side stub files). All 29 RED specs from those files are now GREEN. No plan-level RED/GREEN gate sequence applies.

## Open Q Resolutions

- **§A2 / Open Q §2 — rate-limit rollback model on denied requests:** ADOPTED. RateLimitError thrown inside the dbTx.transaction triggers a rollback, so the 6th request's UPSERT does NOT permanently consume the budget. The wrapper opens a separate transaction to write the `rate_limited` audit row.
- **2 audit verbs introduced (vs 3 originally documented in plan 05-01):** Plan 05-01 actually shipped 3 visitor-flow verbs in AUDIT_ACTIONS: `spam_detected` (D-04 honeypot), `rate_limited` (D-05 rate-limit denial), `contact_submission_create` (CLAUDE.md happy-path audit). All 3 are written in this plan: spam_detected and rate_limited inside withPublicAction (Steps C and E error path); contact_submission_create inside submitContactForm's dbTx.transaction.
- **5 PublicActionResult error variants:** validation (Zod failure), turnstile_failed (Cloudflare reject), rate_limited (RateLimitError caught), spam_detected (currently NEVER returned — honeypot trip returns ok:true silently per D-04 drop-don't-retry; the literal is reserved in the discriminated union for future use cases that DO want to surface spam to the caller), unknown (handler throw or unexpected error).
