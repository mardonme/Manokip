---
phase: 05-contact-launch-polish
verdict: passed-with-warnings
audit_date: 2026-05-05
auditor: orchestrator-inline (gsd-verifier API connection failed mid-run; inline fallback)
scope: independent goal-backward audit of phase 05 vs codebase
self_report: 05-VERIFICATION.md (plan 06 deliverable; corroborated)
related: 05-REVIEW.md (code review; 0 BLOCKER, 2 HIGH, 4 MEDIUM)
---

# Phase 05 — Independent Verifier Audit

## Verdict

**passed-with-warnings.** All 6 phase REQ-IDs are satisfied in code with concrete evidence. Two HIGH-severity issues from code review (HI-01 Turnstile token-reuse race window, HI-02 contact_submission PII retention deferred to v1.1) are non-blocking but should be triaged before v1 launch. Phase's self-report (05-VERIFICATION.md) is corroborated.

## REQ-ID Status

| REQ-ID | Status | Evidence | Notes |
|--------|--------|----------|-------|
| CTA-01 | passed | [contact-form.tsx](src/components/public/contact-form.tsx), [contact-button.tsx](src/components/public/contact-button.tsx), [contact.ts](src/actions/contact.ts), [page.tsx](src/app/[locale]/contact/page.tsx); messages parity 24/24/24 across uz/ru/en | Visitor-flow SSOT confirmed; honeypot off-screen; sourcePage from usePathname; modal + canonical page render same form |
| CTA-02 | passed | [email-contact.ts](src/lib/email-contact.ts), [contact-admin.tsx](src/emails/contact-admin.tsx), [contact-auto-reply.tsx](src/emails/contact-auto-reply.tsx); audit verb `contact_submission_create` written same-tx as INSERT (CLAUDE.md compliance) | Resend dispatch is fire-and-forget per D-10; e2e contact-roundtrip asserts persisted row |
| CTA-03 | passed | [sticky-cta-contact-button.tsx](src/components/public/sticky-cta-contact-button.tsx) wired into [sticky-cta-rail.tsx](src/components/public/sticky-cta-rail.tsx); product detail page passes locale | productContext prefill confirmed via must_haves item; same Dialog component as header CTA (no fork) |
| CTA-04 | passed | [.lighthouserc.json:16-17](.lighthouserc.json#L16-L17) — `error` severity for LCP + categories:performance; [load-test.yml:12-13](.github/workflows/load-test.yml#L12-L13) — `workflow_dispatch:` only; [load-test.sh](scripts/load-test.sh) ab -n 500 -c 50 across 5 endpoints; [contact_rate_limit](drizzle/0004_phase5_contact_rate_limit.sql) HMAC + atomic 2-bucket UPSERT | Migration verifier 7/7 PASS; live-Neon rate-limit tests GREEN |
| SEO-06 | closed-with-deferred-validation | [sitemap.ts:80](src/lib/sitemap.ts#L80) `/contact` in fan-out; per-locale canonical + hreflang via `buildAlternates`; [google_TODO_replace_with_real_hash.html](public/google_TODO_replace_with_real_hash.html) + [yandex_TODO_replace_with_real_hash.html](public/yandex_TODO_replace_with_real_hash.html) | Real registration deferred to DEF-5-06-SEO06-GSC + DEF-5-06-SEO06-YANDEX (legitimate user post-merge work — cannot be automated pre-launch) |
| OPS-02 | closed-with-deferred-validation | [05-DOGFOOD-PROTOCOL.md](.planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md) ships 10-product timing log template + per-product start/end/minutes + sign-off line | Content-team execution deferred to DEF-5-06-OPS02 (legitimate — depends on launch readiness) |

## Deferred-Validation Gates (5 DEF-5-06-*)

All 5 gates are **legitimate deferrals**, not hand-wavy escape hatches:

1. **DEF-5-06-SEO06-GSC** — Google Search Console registration. Cannot run pre-launch (requires live HOST + ownership proof via /public/ HTML file).
2. **DEF-5-06-SEO06-YANDEX** — Yandex Webmaster registration. Same constraint.
3. **DEF-5-06-OPS02** — Content team dogfood. Requires launched admin panel + 10 real products to enter; legitimately a post-launch operational measurement.
4. **DEF-5-06-DEVICEQA** — 3-phone × 3-locale Slow-4G QA. Real-device manual; the automated glyph-render e2e covers the headless portion.
5. **DEF-5-06-CLOUDINARY-MANUAL** — Cloudinary widget upload smoke. The widget mounts cross-origin iframes that headless Chromium cannot drive without a live test API key + bucket; smoke spec covers the surrounding flow.

All 5 are user-driven post-deploy actions — none of them are reasonably automatable inside a CI run.

## CLAUDE.md Guardrail Compliance

- Audit row written for every visitor mutation: `spam_detected`, `rate_limited`, `contact_submission_create` confirmed in [audit.ts:43-45](src/lib/audit.ts#L43-L45)
- Visitor flow uses `actorEmail='visitor'` literal (verified in 05-REVIEW.md INFO-01)
- 3-locale message parity: 24 keys in each of `messages/{uz,ru,en}.json` under `public.contact.*`
- Drizzle schema (no jsonb-bag pattern); typed columns
- Per-locale canonical + hreflang fan-out for `/contact`
- No revalidateTag needed for visitor contact flow (correctly omitted — no public consumer of `contact_submission`)

## Test Coverage

- All 12 RED stubs from plan 05-01 are now GREEN — confirmed by grep showing zero `it.skip` / `test.fixme` / `expect.fail` markers in plan-05 test files.
- `pnpm vitest run` — 254/254 tests across 48 files PASS (regression gate green; no prior-phase tests broken).
- `pnpm tsc --noEmit` exits 0.
- Migration verifier: 7/7 checks PASS against live Neon dev branch.

## Cross-Phase Closure

- 04-VERIFICATION.md updated: DEF-4-12-01..04 carry `absorbed_by:` annotations pointing to 05-05 + 05-06 plans (verified at lines 17, 21, 25, 29).
- REQUIREMENTS.md flips applied: CTA-01..04 = `[x]` Complete; SEO-06 + OPS-02 = `[x]` Complete-with-deferred-validation.
- RETROSPECTIVE.md has Phase 5 entry at line 57.
- STATE.md reflects phase 05 LOCALLY COMPLETE 6/6.

## Warnings (from 05-REVIEW.md, non-blocking)

- **HI-01** ([contact-form.tsx:125-140](src/components/public/contact-form.tsx#L125-L140)) — Turnstile token can be reused on rapid double-submit because `turnstileRef.current?.reset()` runs only AFTER the action returns. Recommended fix: optimistically reset before the action call. Suggest routing to `/gsd-code-review-fix 05` before launch.
- **HI-02** — `contact_submission` PII has no retention policy. Documented as v1.1 backlog. Largest open compliance gap shipped by phase 05.
- 4 MEDIUM findings (raw IP in audit row, x-real-ip spoofing on non-Vercel deploys, undocumented honeypot bypass posture, TOCTOU window in product enrichment) — fix soon, none block launch.

## Phase Goal

**Phase 05 promised:** "ship the contact form, canonical /contact page, perf gates, and post-launch closure such that v1 can launch."

**Achieved.** All 6 REQ-IDs delivered in code+tests; 5 deferred gates are legitimate post-deploy work; code review is advisory with 0 blockers. Phase is locally complete and v1-ready pending the 5 DEF-5-06-* user actions and triage of HI-01/HI-02.

## Final Status

**Phase 05: passed-with-warnings.** Ready to advance to v1 launch sequence per D-15 two-state model (locally-complete → launched after DEF-5-06-* clear).
