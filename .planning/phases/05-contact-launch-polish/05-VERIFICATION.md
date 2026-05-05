---
phase: 05-contact-launch-polish
verified: 2026-05-05T00:00:00Z
status: passed
score: 4/6 requirements fully verified (CTA-01..04); 2 closed-with-deferred-validation (SEO-06 + OPS-02)
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
deferred_validation:
  - id: DEF-5-06-SEO06-GSC
    title: "Google Search Console registration + sitemap submission + International Targeting screenshot (absorbs DEF-4-12-01)"
    why_human: "Requires real Google account ownership of manometr.uz. Plan 06 ships /public/google_TODO_replace_with_real_hash.html as the file-method verification slot. User registers, downloads the real google<HASH>.html, commits it, deletes the placeholder, then submits the sitemap-index.xml URL and screenshots the International Targeting panel."
    transition_criteria: "Real google<HASH>.html committed to /public/ + sitemap accepted in Search Console + International Targeting panel shows 0 hreflang errors → DEF transitions to validated. Also subsumes DEF-4-12-01 Google Rich Results Test for TechArticle on /[locale]/recipes/[slug] + /[locale]/industries/[slug] (6 URLs) — user pastes URLs into https://search.google.com/test/rich-results once preview/prod is live."
  - id: DEF-5-06-SEO06-YANDEX
    title: "Yandex Webmaster registration + TechArticle Rich Results validation (absorbs DEF-4-12-02)"
    why_human: "Requires real Yandex account ownership. Plan 06 ships /public/yandex_TODO_replace_with_real_hash.html as the file-method slot. User registers, swaps the file, then validates TechArticle JSON-LD on a recipe + industry URL via Yandex's structured-data tester."
    transition_criteria: "Real yandex_<HASH>.html committed + per-locale sitemaps submitted + structured-data validator returns no type-mismatch errors → DEF transitions to validated. P4-4 acceptance noted: if Yandex flags industry TechArticle as type-mismatch, log v1.1 task to downgrade to '@type':'Article' (1-line change in techArticleJsonLd helper)."
  - id: DEF-5-06-OPS02
    title: "Content team dogfood — 10 trilingual products at ≤10 min each"
    why_human: "Operational process measuring admin UX against real human time. Plan 06 ships .planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md with a 10-product timing log template + sign-off line. Content team lead executes; result is recorded in the protocol document and signed off."
    transition_criteria: "DOGFOOD-PROTOCOL.md timing table filled in for all 10 products + median ≤10 min + max ≤15 min + content team lead signature → DEF transitions to validated."
  - id: DEF-5-06-DEVICEQA
    title: "Real-device Slow-4G QA across uz/ru/en (3 phones; absorbs DEF-4-12-03 visual portion)"
    why_human: "Real-device font rendering and emulated-network behavior on actual hardware can't be fully replicated by Lighthouse CI; Inter font subsets and Uzbek-Latin oʻ/gʻ U+02BB rendering need human-eye confirmation on mid-tier Android + iPhone + budget Android."
    transition_criteria: "User attaches observations from 3 phones × 3 locales × (homepage + product detail + contact) — total 27 visual checks — confirming LCP < CWV budget AND glyphs render with the configured Inter font (no fallback)."
  - id: DEF-5-06-CLOUDINARY-MANUAL
    title: "Cloudinary widget full-upload manual smoke (absorbs DEF-4-12-04 manual portion)"
    why_human: "Cloudinary widget cross-origin iframe + OS file picker upload roundtrip cannot be driven by Playwright. Plan 05-05 task 5.4 GREEN-flipped the smoke (DOM mounts + sign endpoint 200) at e2e level; the actual upload roundtrip stays human-driven."
    transition_criteria: "User opens admin product editor on Vercel preview → uploads a real image via the widget → confirms public_id persists to DB AND public detail page renders the inline image via CldImage."
---

# Phase 5: Contact and Launch Polish — Verification Report

**Phase Goal:** "The sole CTA works end-to-end, observability is live before public traffic, and the launch bar (content-team sign-off, Slow-4G real-device QA across three locales, Search Console International Targeting clean) is cleared."

**Verified:** 2026-05-05
**Status:** passed (locally complete; 5 environmental gates closed-with-deferred-validation per D-14)
**Re-verification:** No — initial verification

## Requirements Coverage (CTA-01..04, SEO-06, OPS-02)

| Requirement | Description | Source Plans | Evidence | Status |
| ----------- | ----------- | ------------ | -------- | ------ |
| CTA-01 | Visitor can submit site-wide contact form (name/company/email/message) gated by honeypot + Cloudflare Turnstile | 05-02, 05-03, 05-04, 05-05 | `src/lib/server-action.ts` withPublicAction (triple-gate); `src/components/public/contact-form.tsx` with off-screen honeypot + Turnstile widget; `src/components/public/contact-button.tsx` modal trigger; `src/app/[locale]/contact/page.tsx` canonical SEO page; `tests/e2e/contact-roundtrip.spec.ts` 2 specs GREEN | SATISFIED |
| CTA-02 | Submission persists to DB; admin team email via Resend | 05-02, 05-05 | `src/actions/contact.ts` atomic dbTx insert + audit row; `src/lib/email-contact.ts` fire-and-forget Resend dispatcher with D-07 ADMIN_NOTIFY_EMAILS empty-skip + D-10 fire-and-forget; `src/emails/contact-admin.tsx` (English-only) + `src/emails/contact-auto-reply.tsx` (locale-parameterized); `tests/lib/email-contact.test.ts` + `tests/actions/contact.test.ts` GREEN; e2e roundtrip asserts row in Neon | SATISFIED |
| CTA-03 | Form records source page (hidden field) | 05-02, 05-03, 05-05 | `src/lib/zod/contact.ts` sourcePage + locale fields; `src/components/public/contact-form.tsx` captures from usePathname(); `src/actions/contact.ts` enrichForInsert validates against /^\/(uz\|ru\|en)\/[a-z0-9\-\/]*$/ + product-context auto-prepend (D-03); e2e roundtrip asserts message body contains the prepend prefix when sourcePage is /products/<slug> | SATISFIED |
| CTA-04 | Submission endpoint rate-limited per IP | 05-01, 05-02, 05-05 | `contact_rate_limit` table + (ip_hash, window_kind, window_start) PK; `src/lib/rate-limit.ts` HMAC-SHA256 + atomic 2-bucket UPSERT in dbTx (5/hour AND 20/day); withPublicAction Step E rate-limit check + audit row on denial; `tests/lib/rate-limit.test.ts` + `tests/db/contact-rate-limit.test.ts` live-Neon GREEN | SATISFIED |
| SEO-06 | Site registered with Google Search Console + Yandex Webmaster; International Targeting clean | 05-04, 05-05, 05-06 | `src/lib/sitemap.ts` extended with `/contact` per-locale; `tests/api/sitemap.test.ts` 3 contact assertions GREEN + appended 4th coverage spec; `.lighthouserc.json` 5-URL coverage including `/uz/contact`; placeholder verification HTML files in /public/google_*.html + /public/yandex_*.html | SATISFIED locally — DEF-5-06-SEO06-GSC + DEF-5-06-SEO06-YANDEX track external-account work |
| OPS-02 | Content team dogfoods ≥10 trilingual products at ≤10 min each | 05-06 | `.planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md` ships timing log + 10-product template + sign-off line | SATISFIED locally — DEF-5-06-OPS02 tracks the operational execution |

**Score: 4/6 fully verified (CTA-01..04). 2/6 closed-with-deferred-validation (SEO-06, OPS-02).**

## Wave 0 Specs Landed (Plan 05-01)

12 RED stub files + namespace placeholders shipped:

| File | Type | Stubs | Plan Flipped GREEN |
| ---- | ---- | ----- | ------------------ |
| tests/db/contact-rate-limit.test.ts | live-Neon | 4 it.skip → 4 GREEN | 05-02 (Task 2.2) |
| tests/lib/server-action-public.test.ts | unit + live-Neon | 6 it.skip → 6 GREEN | 05-02 (Task 2.4) |
| tests/lib/turnstile.test.ts | unit (vi.mock fetch) | 4 it.skip → 4 GREEN | 05-02 (Task 2.1) |
| tests/lib/rate-limit.test.ts | unit + live-Neon | 5 it.skip → 5 GREEN | 05-02 (Task 2.2) |
| tests/lib/email-contact.test.ts | unit (render) | 5 it.skip → 5 GREEN | 05-02 (Task 2.5) |
| tests/actions/contact.test.ts | live-Neon | 5 it.skip → 5 GREEN | 05-02 (Task 2.6) |
| tests/components/contact-form.test.tsx | jsdom | 6 it.skip → 8 GREEN | 05-03 (Task 3.1) |
| tests/components/contact-button.test.tsx | jsdom | 4 it.skip → 4 GREEN | 05-03 (Task 3.2) |
| tests/api/sitemap.test.ts (contact block) | unit | 3 it.skip → 3 GREEN + 1 appended | 05-04 (Task 4.2) |
| tests/e2e/contact-roundtrip.spec.ts | Playwright | 2 fixme → 2 GREEN | 05-05 (Task 5.3) |
| tests/e2e/cloudinary-widget-smoke.spec.ts | Playwright | 2 fixme → 2 GREEN | 05-05 (Task 5.4) |
| tests/e2e/glyph-render.spec.ts | Playwright | 3 fixme → 3 GREEN | 05-05 (Task 5.5) |

## Phase-4 Carry-Over Absorption (per CONTEXT D-13)

DEF-4-12-01..04 fold into Phase 5 plans:

| DEF-4 ID | Phase 4 origin | Phase 5 absorption |
| -------- | -------------- | ------------------ |
| DEF-4-12-01 (Google Rich Results) | 04-12 | Absorbed by 05-06 SEO-06 manual gate (DEF-5-06-SEO06-GSC) |
| DEF-4-12-02 (Yandex TechArticle) | 04-12 | Absorbed by 05-06 SEO-06 manual gate (DEF-5-06-SEO06-YANDEX) |
| DEF-4-12-03 (Cyrillic + Uzbek-Latin glyph QA) | 04-12 | Automated portion absorbed by 05-05 Task 5.5 glyph-render e2e (GREEN); real-device portion absorbed by DEF-5-06-DEVICEQA |
| DEF-4-12-04 (Cloudinary widget e2e) | 04-12 | Smoke portion absorbed by 05-05 Task 5.4 cloudinary-widget-smoke (GREEN); manual upload roundtrip absorbed by DEF-5-06-CLOUDINARY-MANUAL |

## Threats Closed

| Threat ID | Source Plan | Component | Disposition | Closure Evidence |
| --------- | ----------- | --------- | ----------- | ---------------- |
| T-CTA-01 | 05-02 | parseClientIp + hashIp + 2-bucket rate limit | mitigate | x-forwarded-for first hop trusted on Vercel; HMAC-SHA256 with RATE_LIMIT_IP_SALT (≥32 bytes); test asserts deterministic hashing + bucket overflow |
| T-CTA-02 | 05-02, 05-03 | Turnstile siteverify + widget reset on rejected submit | mitigate | verifyTurnstile single REST call per submit; ContactForm.onSubmit calls turnstileRef.current?.reset() on failure (Pitfall 2); tests assert reset behavior |
| T-CTA-03 | 05-02, 05-03 | Honeypot field_extra | accept (defense-in-depth) | Off-screen via inline style + aria-hidden + tabIndex=-1 + autoComplete=off; trip returns ok:true silently + audit_log row; Turnstile + rate-limit catch any bypass |
| T-CTA-04 | 05-02 | sourcePage server-side validation | mitigate | enrichForInsert validates against /^\/(uz\|ru\|en)\/[a-z0-9\-\/]*$/; mismatch falls back to /<locale>; product slug looked up before auto-prepend; lookup failure fails open |
| T-CTA-05 | 05-02 | React Email auto-escapes; Resend SDK sanitizes | mitigate | All visitor input passed as React props (not template strings); from address reuses Phase-1 verified domain |
| T-CTA-06 | 05-02 | DoS via Resend quota exhaustion | mitigate | 5/hour + 20/day per hashed IP; Resend failures fire-and-forget (Pitfall 4); DB insert is the source of truth |
| T-05-01-01..05 | 05-01 | Schema migration safety + AUDIT_ACTIONS extension + env validation | mitigate | drizzle generate+migrate (NOT push); verifier asserts live DB shape; t3-env enforces all 4 new vars at boot |
| T-05-02-01 | 05-02 | rate-limit lib must use dbTx (WS Pool), not db (HTTP driver) — Pitfall 1 | mitigate | grep guard in plan 02 acceptance; live-Neon test asserts ON CONFLICT count math |
| T-05-03-01 | 05-03 | Tailwind purge would drop honeypot off-screen class | mitigate | Honeypot uses inline style object (not className); acceptance asserts the literal `position: 'absolute'` AND `clip: 'rect(0, 0, 0, 0)'` in source |
| T-05-04-02 | 05-04 | Sitemap omits /contact in one locale → hreflang inconsistency | mitigate | Single staticPath array + ALL_LOCALES substitution loop; test asserts presence in all 3 locale sitemaps |
| T-05-05-02 | 05-05 | load-test workflow accidentally triggered on every PR | mitigate | workflow_dispatch only; acceptance grep enforces |
| T-05-05-04 | 05-05 | E2E test rows pollute production contact_submission | mitigate | try/finally DELETE cleanup keyed on unique e2e- email prefix |
| T-05-06-01..04 | 05-06 | Closure-doc mis-pointers + missing annotations + STRIDE risks | mitigate / accept | See plan 05-06 threat_model — 1 accept (placeholder fail-loud) + 3 mitigate (DEF absorption symmetry, REQUIREMENTS.md complete-with-deferred-validation annotation, RETROSPECTIVE D-15 two-state literal) |

## Required Artifacts

| Artifact | Plan | Status |
| -------- | ---- | ------ |
| `src/db/schema/contact-rate-limit.ts` + drizzle/0004 + scripts/verify-05-01-migration.ts | 05-01 | VERIFIED |
| `src/lib/audit.ts` AUDIT_ACTIONS extended with spam_detected + rate_limited + contact_submission_create | 05-01 | VERIFIED |
| `src/env.ts` validates 4 new env vars | 05-01 | VERIFIED |
| `src/lib/server-action.ts` withPublicAction sibling | 05-02 | VERIFIED |
| `src/lib/turnstile.ts` + `src/lib/rate-limit.ts` + `src/lib/zod/contact.ts` + `src/lib/email-contact.ts` | 05-02 | VERIFIED |
| `src/emails/contact-admin.tsx` + `src/emails/contact-auto-reply.tsx` | 05-02 | VERIFIED |
| `src/actions/contact.ts` submitContactForm | 05-02 | VERIFIED |
| `src/components/public/contact-form.tsx` + `contact-button.tsx` + `sticky-cta-contact-button.tsx` | 05-03 | VERIFIED |
| `src/components/public/site-header.tsx` + `sticky-cta-rail.tsx` (modified) | 05-03 | VERIFIED |
| `messages/{uz,ru,en}.json` public.contact namespace populated | 05-03 | VERIFIED |
| `src/app/[locale]/contact/page.tsx` canonical RSC page | 05-04 | VERIFIED |
| `src/lib/sitemap.ts` /contact extension | 05-04 | VERIFIED |
| `.lighthouserc.json` warn → error + 5-URL workflow expansion | 05-05 | VERIFIED |
| `scripts/load-test.sh` + `.github/workflows/load-test.yml` workflow_dispatch only | 05-05 | VERIFIED |
| 3 e2e specs (contact-roundtrip + cloudinary-widget-smoke + glyph-render) all flipped GREEN | 05-05 | VERIFIED |
| Verification HTML placeholders in /public/ (google_TODO_*.html + yandex_TODO_*.html) | 05-06 | VERIFIED |
| 05-DOGFOOD-PROTOCOL.md timing log template | 05-06 | VERIFIED |

## Verification Commands

```bash
pnpm tsc --noEmit                                                                # PASS
pnpm vitest run                                                                  # full suite GREEN; 12 stub files flipped
pnpm tsx scripts/verify-05-01-migration.ts                                       # 7/7 PASS against Neon dev branch
pnpm playwright test --list                                                      # listing succeeds; 7 new Phase-5 specs active (no fixme)
grep -rn "test\.fixme" tests/e2e/contact-roundtrip.spec.ts tests/e2e/cloudinary-widget-smoke.spec.ts tests/e2e/glyph-render.spec.ts  # 0 hits
ls public/google_*.html public/yandex_*.html                                     # 2 files
test -f .planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md          # exists
```

Live execution against a Vercel preview URL (`BASE_URL=$PREVIEW_URL`) plus a Neon test branch (`DATABASE_URL=$NEON_TEST`) plus the test Turnstile site key (`NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`) is the trigger for the closed-with-deferred-validation gates above.

## v1.1 Backlog (surfaced during Phase 5)

- File attachments on contact form (engineers may want to upload an RFQ PDF)
- Multi-step form (qualification questions before message)
- "Request a callback" toggle with preferred-time picker
- Per-product "Compare" CTA
- Live observability dashboard for submission rate / spam-block rate
- A/B test of modal vs inline placement on product pages
- Contact submission retention policy (GDPR — flagged in RESEARCH §V8)
- If Yandex flags industry TechArticle as type-mismatch (P4-4): downgrade to '@type':'Article' (1-line change)
- Lift Phase-2 02-15 CSV export 10k LIMIT cap OR document streaming-CSV path (deferred from Phase 5 scope)
- Tighten Lighthouse LCP budget back to 2500 ms once real-device QA confirms preview-deploy headroom is consistent
- Spike Cloudinary widget full e2e via Cloudinary mock (DEF-5-06-CLOUDINARY-MANUAL alternative)
- Replace StickyCtaRail.requestPrice prop interface remnant (Plan 05-03 W-5 — kept for caller back-compat; safe to remove next phase)

## Notes

Phase 5 is **LOCALLY COMPLETE** with `closed-with-deferred-validation` posture per D-14. The 5 deferred gates transition to fully-validated when:

1. User registers manometr.uz in Google Search Console + Yandex Webmaster (DEF-5-06-SEO06-GSC + DEF-5-06-SEO06-YANDEX)
2. User executes the 05-DOGFOOD-PROTOCOL.md with the content team (DEF-5-06-OPS02)
3. User runs real-device Slow-4G QA across uz/ru/en on 3 phones (DEF-5-06-DEVICEQA)
4. User performs manual Cloudinary upload smoke (DEF-5-06-CLOUDINARY-MANUAL)

Per D-15: "Phase 5 locally complete" is a separate gate from "v1 launched." v1 launch happens AFTER all DEF-5 entries clear. Phase 5 retrospective documents both states.
