---
phase: 05-contact-launch-polish
reviewed: 2026-05-05T00:00:00Z
depth: standard
diff_base: de4f0f9^..HEAD
files_reviewed: 41
files_reviewed_list:
  - .github/workflows/lighthouse-preview.yml
  - .github/workflows/load-test.yml
  - drizzle/0004_phase5_contact_rate_limit.sql
  - drizzle/meta/0004_snapshot.json
  - drizzle/meta/_journal.json
  - scripts/load-test.sh
  - scripts/verify-05-01-migration.ts
  - src/actions/contact.ts
  - src/app/[locale]/contact/page.tsx
  - src/app/[locale]/products/[slug]/page.tsx
  - src/components/public/contact-button.tsx
  - src/components/public/contact-form.tsx
  - src/components/public/site-header.tsx
  - src/components/public/sticky-cta-contact-button.tsx
  - src/components/public/sticky-cta-rail.tsx
  - src/db/schema/contact-rate-limit.ts
  - src/db/schema/index.ts
  - src/emails/contact-admin.tsx
  - src/emails/contact-auto-reply.tsx
  - src/env.ts
  - src/lib/audit.ts
  - src/lib/email-contact.ts
  - src/lib/rate-limit.ts
  - src/lib/server-action.ts
  - src/lib/sitemap.ts
  - src/lib/turnstile.ts
  - src/lib/zod/contact.ts
  - tests/_fixtures/load-env.ts
  - tests/actions/contact.test.ts
  - tests/api/sitemap.test.ts
  - tests/components/contact-button.test.tsx
  - tests/components/contact-form.test.tsx
  - tests/db/contact-rate-limit.test.ts
  - tests/e2e/cloudinary-widget-smoke.spec.ts
  - tests/e2e/contact-roundtrip.spec.ts
  - tests/e2e/glyph-render.spec.ts
  - tests/lib/audit.test.ts
  - tests/lib/email-contact.test.ts
  - tests/lib/rate-limit.test.ts
  - tests/lib/server-action-public.test.ts
  - tests/lib/turnstile.test.ts
findings:
  blocker: 0
  high: 2
  medium: 4
  low: 4
  info: 3
  total: 13
status: issues
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 41 (source + tests + drizzle + .github only — planning artifacts excluded)
**Status:** issues_found

## Summary

Phase 5 introduces the public-facing contact form — the highest-risk surface
the platform has shipped to date because every gate is enforced server-side
on input that arrives from anonymous visitors. Overall the implementation is
careful and the documented decisions (D-04 honeypot drop-don't-retry, D-05
rate-limit rollback, D-06 IP hashing, D-10 fire-and-forget Resend) are
faithfully implemented in code. The triple-gate ordering in
`withPublicAction` is correct, the Zod allowlist filter sits before any I/O,
the Turnstile siteverify uses the correct `cache: 'no-store'` posture, the
rate-limit UPSERT is atomic and uses the correct WebSocket-pool client
(`@/db/client-ws`), and the audit-row write rides the same transaction as
the contact-submission insert (CLAUDE.md compliance). E2e specs hit the live
Neon test branch and assert real DB rows, not just structural shape.

The findings below are predominantly correctness / hardening notes, not
launch blockers. The two HIGH items concern (1) a token-reuse race window in
the form's submit handler and (2) a missing 30-day cleanup posture for
`contact_submission` PII, both of which are reasonable to defer with
documented follow-ups but should not be silently shipped.

No SQL injection, no XSS, no auth-bypass, no secret leakage, no broken cache
invalidation, no missing audit rows on the visitor flow.

## High

### HI-01: Turnstile token NOT proactively reset on `validation` / `unknown` errors before the next submit

**File:** `src/components/public/contact-form.tsx:125-140`
**Issue:** `onSubmit` resets the Turnstile widget **only after** the action returns `ok:false`. If the user fixes a Zod-rejected field (e.g., enters a longer name) and resubmits within the same Turnstile token's 5-minute TTL, that's fine. But if the SECOND submit happens >5 minutes later, the (now-expired) token is sent to Cloudflare and rejected with `timeout-or-duplicate`, which the user sees as `errorTurnstile` — confusing because the user didn't do anything wrong. More subtly: Cloudflare also rejects a token that was successfully verified server-side once (single-use). If `submitContactForm` is invoked twice in rapid succession (double-click, network retry) with the same token, the second call returns `turnstile_failed` even though the first call already wrote a row.

The widget DOES reset on the `onExpire` callback (line 274), so the 5-minute case is partially mitigated by Cloudflare's own timer. The double-click/race case is unprotected.

**Fix:**
1. Add `disabled={pending}` already exists; also set the form into a pending UI state so users can't double-fire.
2. Inside `onSubmit` clear `turnstileToken` state IMMEDIATELY after capturing it for the action call:
```tsx
function onSubmit(values: ContactInsertInput) {
  setServerError(null);
  const tokenAtSubmit = values.turnstileToken;
  // Optimistically invalidate so a fast double-click can't reuse:
  setTurnstileToken('');
  turnstileRef.current?.reset();
  startTransition(async () => {
    const res = await submitContactForm({ ...values, turnstileToken: tokenAtSubmit });
    // ... existing success/error branches; reset already happened
  });
}
```
This makes the widget show a fresh challenge while the action runs and guarantees the token is single-use even if the action fires twice.

### HI-02: `contact_submission` rows store visitor PII (name + company + email + phone + message) indefinitely with no retention policy

**File:** `src/db/schema/contact.ts` (existing schema, surfaced by Phase-5 visitor flow) + `src/actions/contact.ts:112-144`
**Issue:** Phase 5 turns this table into a public ingestion endpoint. There is no documented or implemented row-retention sweep, and `audit_log` rows for `contact_submission_create` carry the submission's `entityId` for life-of-row, which keeps the linkage discoverable. CLAUDE.md cites GDPR posture for `contact_rate_limit` (D-06 hash-only, opportunistic 2-day cleanup) but the actual PII table — `contact_submission` — has no equivalent. Uzbekistan + EU visitors writing to this form generate retained PII with no documented purge.

The Phase 5 plans (`05-CONTEXT.md` D-13) explicitly defer a retention sweep job to v1.1; there is no operational work-around in code today. This is not a launch blocker for the v1 audience (B2B contact form, not consumer PII) but it is the largest open compliance gap shipped by Phase 5.

**Fix:**
1. Document in `STATE.md` / phase-06 backlog: add a scheduled job (Vercel cron or dbTx scheduled DELETE) that purges `contact_submission` rows + their associated `audit_log` rows older than N days (suggested: 365 days post-launch, tighter once volume is known).
2. Until the job ships, add a one-line note in admin docs: "contact_submission rows are retained indefinitely; manually delete on visitor request (GDPR Art. 17)."
3. Consider scrubbing PII columns instead of hard-deleting so audit-row referential integrity stays clean: `UPDATE contact_submission SET name='[redacted]', email='[redacted]@redacted', phone=NULL, message='[redacted]' WHERE submitted_at < now() - interval '365 days'`.

## Medium

### MD-01: Honeypot path's audit-log `ip` column captures raw client IP — D-06 says "never store raw IPs"

**File:** `src/lib/server-action.ts:135-148, 162-180`
**Issue:** When the honeypot trips OR rate-limit fires, the wrapper writes an audit row via `logAudit(...)` with `ip` set to the raw `x-forwarded-for` first hop (line 144 + line 178). The `entity_id` is correctly set to the HMAC-hashed `ipHash` (privacy-preserving), but the `audit_log.ip` column receives the unhashed value. CONTEXT D-06 explicitly says "never store raw IPs" and the `contact_rate_limit` table is hash-only, but `audit_log.ip` is NOT.

This matches the existing posture of `withAdminAction:55-57` which also writes raw IP to `audit_log.ip` for admin actions — so it's not a Phase-5 regression, just inherited admin behavior applied to anonymous visitors. The privacy ask is fundamentally different: admins are identified, visitors aren't, and bot-attack waves of `spam_detected`/`rate_limited` rows multiply the persisted-raw-IP volume.

**Fix:** For the visitor-flow audit rows specifically (`spam_detected`, `rate_limited`, `contact_submission_create`), pass `ip: ipHash` (or `ip: undefined`) to `logAudit` instead of the raw IP. The `entity_id` already preserves the IP-correlation signal for forensics. Patch:
```ts
// src/lib/server-action.ts:144 and :178
ip: ipHash,        // not: ip,
userAgent,         // keep
```
Document the policy in `audit.ts` so future visitor verbs follow.

### MD-02: `parseClientIp` is naive about Vercel header semantics — `x-real-ip` fallback can be spoofed

**File:** `src/lib/rate-limit.ts:41-50`
**Issue:** `parseClientIp` reads `x-forwarded-for` first, falling back to `x-real-ip`. On Vercel (which is the documented production target per CLAUDE.md), `x-forwarded-for` is set by the platform with the verified client IP as the leftmost entry — so the primary path is correct. But the `x-real-ip` fallback is reachable in two cases: (a) local `next dev`, (b) misconfigured deployment. In case (b), `x-real-ip` is a header any HTTP client can set arbitrarily and is NOT canonicalized by Vercel — meaning a sophisticated attacker could in principle send `X-Real-IP: 1.2.3.4` to rotate buckets. The current code consumes whatever the visitor sends.

**Fix:**
1. Document the assumption: "This function ASSUMES we're running on Vercel and `x-forwarded-for` is platform-set." Add comment.
2. Drop the `x-real-ip` fallback in production — it's a non-Vercel header. Or at minimum, add an env-gated guard:
```ts
if (process.env.VERCEL === '1') {
  return xff_first ?? 'unknown';   // trust only x-forwarded-for on Vercel
}
return xff_first ?? xri ?? 'unknown';
```
3. Add a unit test covering the spoofing posture so the contract is locked.

### MD-03: `field_extra` honeypot is `optional()` only — empty string from a real-bot bypass passes through

**File:** `src/lib/zod/contact.ts:32` + `src/lib/server-action.ts:135`
**Issue:** The Zod schema declares `field_extra: z.string().max(500).optional()`. The honeypot trip check is `if (input.field_extra && input.field_extra.length > 0)` — both empty string AND missing field bypass the gate. That's intentional for human callers who never see the field, but a bot that sets `field_extra=''` (or omits it entirely) is indistinguishable from a real user, defeating the honeypot. The current implementation only catches naive bots that fill EVERY field with non-empty values. Per RESEARCH §Pitfall 3, modern form-fillers DO populate honeypot fields with the field name as value, so empty-string is the realistic attack vector.

This is by-design per the documented threat model (D-04: "honeypot is one layer; Turnstile is the real gate"), but the threat-model assumption deserves a code comment so a future maintainer doesn't think the honeypot alone provides bot defense.

**Fix:** Add a comment to `src/lib/zod/contact.ts:32` and `src/lib/server-action.ts:135`:
```ts
// NOTE: empty string AND undefined both bypass — honeypot only catches
// naive bots that fill ALL fields with non-empty values. Sophisticated
// form-fillers that submit field_extra='' are caught by the Turnstile
// gate (Step D), not here. See RESEARCH §Pitfall 3.
```

### MD-04: `enrichForInsert` does a DB lookup OUTSIDE the same transaction as the audit/insert — TOCTOU race window

**File:** `src/actions/contact.ts:54-102, 112-144`
**Issue:** `enrichForInsert` queries `db` (HTTP driver, line 73) for the product row, then a separate `dbTx.transaction` (line 112) inserts the contact_submission + audit. Between the two queries, the product could be unpublished/deleted. The inserted `contact_submission.message` would then carry a `productInquiry` prefix referencing a no-longer-published product. Low-impact (audit consistency, not security), but worth noting.

More importantly: the lookup uses `db` (single-statement HTTP driver, line 27) but the insert uses `dbTx` (WebSocket pool). This is the documented split, fine — but if the lookup query ever grew multi-statement, it would silently lose atomicity. Add a comment.

**Fix:** Either:
1. Move the product lookup INTO the transaction (preferred, eliminates TOCTOU):
```ts
const inserted = await dbTx.transaction(async (tx) => {
  const productMatch = safeSource.match(PRODUCT_PATH);
  let message = input.message;
  let productContext: string | undefined;
  if (productMatch) {
    const [row] = await tx.select(...).from(productTranslations)... // uses tx, not db
    if (row?.name && row?.sku) { /* prepend */ }
  }
  // ... existing insert + audit
});
```
2. OR document that the TOCTOU window is acceptable (visitor sees their submitted message verbatim; admin sees a trailing prefix referencing a now-unpublished product is a benign artifact).

## Low

### LO-01: `submitContactForm` returns `data: undefined as unknown as O` on honeypot path — type lies to callers

**File:** `src/lib/server-action.ts:148`
**Issue:** When the honeypot trips, the wrapper returns `{ ok: true, data: undefined as unknown as O }`. The handler's `O` is typed as `{ id: string }` for `submitContactForm`, so any caller writing `if (res.ok) console.log(res.data.id)` would crash at runtime even though TypeScript said `res.data: { id: string }`. The current ContactForm component doesn't do this (it only calls `onSuccess()` and `setSuccess(true)`), so the bug is latent. But the silent-drop posture (D-04) genuinely conflicts with the discriminated-union contract.

**Fix:** Either:
1. Widen the success type to `{ ok: true; data: O | null; silentDrop?: true }` so callers must null-check.
2. OR keep the cast but add an assertion + comment: `// SAFETY: honeypot drops are silent; data is unused. Callers MUST treat ok:true as fire-and-forget signal, not as a typed payload.`

### LO-02: `RATE_LIMIT_IP_SALT` rotation breaks bucket continuity silently

**File:** `src/env.ts:25` + `src/lib/rate-limit.ts:38`
**Issue:** The env-var comment in `env.ts:24` correctly says "MUST NOT be rotated post-launch" but there's no runtime guard. If an operator rotates the salt, every existing `contact_rate_limit` row becomes orphaned (its `ip_hash` no longer matches the new HMAC of incoming IPs) and rate-limit budgets reset across all visitors. Not a security bug — just an ops footgun.

**Fix:** Add an integration test that confirms `hashIp(known_ip)` produces a known digest under a fixed salt, locking the contract. Bonus: log a warning at server start if the salt's first 8 chars differ from a stored fingerprint in (e.g.) a `system_settings` table.

### LO-03: `escapeXml` does not escape ` ` and other control chars

**File:** `src/lib/sitemap.ts:239-246`
**Issue:** `escapeXml` handles the 5 named entities, but XML 1.0 also disallows control characters U+0000–U+001F (except tab/LF/CR). If a slug or DB-sourced URL ever contains those (it shouldn't — `src/lib/slug.ts` strips them at write time per the comment on line 28-29), the sitemap XML would be invalid. Defense-in-depth has already been applied at slug-write time, so this is purely informational.

**Fix:** None required. Optionally, add a strip pass:
```ts
return s
  .replace(/[ --]/g, '')
  .replace(/&/g, '&amp;')
  // ... rest
```

### LO-04: `email-contact.ts` does not log a warning when `ADMIN_NOTIFY_EMAILS` is unset/empty

**File:** `src/lib/email-contact.ts:54-68`
**Issue:** Per Pitfall 5, when `ADMIN_NOTIFY_EMAILS` is empty the lib silently returns. In production, this means a misconfigured deployment will accept contact submissions but admins will never be paged about them. The visitor still gets the auto-reply, the row is in the DB, but the team is silently uninformed. There's no structured signal for monitoring.

**Fix:** Add a single Sentry breadcrumb or `console.warn` once per cold-start when the recipient list resolves empty:
```ts
if (recipients.length === 0) {
  if (!warnedEmptyAdminList) {
    warnedEmptyAdminList = true;
    Sentry.captureMessage('ADMIN_NOTIFY_EMAILS empty — admin contact notifications disabled', 'warning');
  }
  return;
}
```

## Info

### IN-01: `withPublicAction` correctly orders gates: Zod → IP-hash → honeypot → Turnstile → rate-limit → handler

**File:** `src/lib/server-action.ts:120-194`
**Observation:** The triple-gate sequence is correct and short-circuiting:
1. Zod allowlist parses raw input (rejects unknown fields).
2. IP hash computed for downstream gates.
3. Honeypot trip is checked BEFORE Turnstile so a tripping bot doesn't burn Cloudflare quota.
4. Turnstile siteverify happens BEFORE rate-limit so legitimate visitors don't have their bucket incremented by token-failures.
5. Rate-limit increments AFTER Turnstile so a broken Turnstile token doesn't permanently consume budget.
6. RateLimitError is caught + audit-logged in a SEPARATE transaction (the original rolled back per RESEARCH §A2).
7. Handler runs only after all gates pass.

This is the correct ordering. Locked invariant — please don't reorder.

### IN-02: Fire-and-forget Resend dispatch is correctly outside the DB transaction

**File:** `src/actions/contact.ts:146-163` + `src/lib/email-contact.ts:86-96`
**Observation:** The two `fire*` calls happen AFTER `await dbTx.transaction(...)` returns, so a Resend failure cannot roll back the inserted row (D-10 + Pitfall 4). The `.catch` inside `fireAdminNotification` / `fireVisitorAutoReply` swallows + Sentry-reports, so a Resend outage never throws into the action. Visitor always sees `ok:true` once the row commits. Correct.

### IN-03: Migration journal + snapshot consistency verified

**File:** `drizzle/meta/_journal.json` + `drizzle/meta/0004_snapshot.json` + `drizzle/0004_phase5_contact_rate_limit.sql`
**Observation:** Journal entry 4 (`0004_phase5_contact_rate_limit`) lines up with the new snapshot (id `180d2c93...` chains from `prevId: 4ccc4543...` matching the Phase-4 0003 snapshot). The migration creates `contact_rate_limit` with composite PK `(ip_hash, window_kind, window_start)`, a btree index on `window_start` for the cleanup scan, and a CHECK constraint pinning `window_kind` to `('hour','day')`. Idempotent (single CREATE TABLE; no schema drift), correct PK shape per RESEARCH §A2. No FK to other tables (rate-limit is a side table; correct).

---

## Out-of-scope notes (informational, not findings)

- **No `revalidateTag` for visitor contact flow** — correctly omitted per CLAUDE.md "every mutation writes audit row but only PUBLIC-CONSUMING mutations need revalidate." `contact_submission` has no public consumer.
- **`/contact` is in all 3 locale sitemaps** with full hreflang fan-out + `x-default → uz` (verified in `tests/api/sitemap.test.ts:235-296`). SEO-06 closed.
- **Test quality is strong** — every Vitest spec in this phase asserts real behavior against the live Neon test branch (no spy-only specs). Two `test.skip` calls exist (`contact-roundtrip.spec.ts:41`, `cloudinary-widget-smoke.spec.ts:31`, `glyph-render.spec.ts:28`) but each is a documented preview-gate skip — none are `it.skip` left over from RED stubs, none are `test.fixme` or `expect.fail`. Cleanup in `afterEach` is comprehensive (per-test stamps, audit + contact_submission + rate_limit DELETEs).
- **Lighthouse config** — `.lighthouserc.json` correctly uses `error` (not `warn`) for the LCP + perf assertions, blocking PR merges on regressions per CONTEXT D-11.
- **`load-test.yml`** — `workflow_dispatch` only, no `pull_request`/`push` triggers. Correct per T-05-05-02.
- **Honeypot positioning** — uses inline-style `position: absolute; clip: rect(0,0,0,0)` (NOT `display: none`), which is detection-resistant. Correct per T-05-03-01.

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
