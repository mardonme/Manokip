---
phase: 05
slug: contact-launch-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 05-RESEARCH.md §"Validation Architecture" (line 1106).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit + live-Neon integration) + Playwright (e2e on Vercel preview) + Lighthouse CI 0.15.x (perf) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` + `.lighthouserc.json` (all already shipped) |
| **Quick run command** | `pnpm vitest run --changed` |
| **Full suite command** | `pnpm tsc --noEmit && pnpm vitest run && pnpm playwright test --list` |
| **Estimated runtime** | ~90s (vitest) + listing only for Playwright until Wave-2 e2e flips |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --changed` (≤ 30s feedback)
- **After every plan wave:** Run `pnpm tsc --noEmit && pnpm vitest run` (full unit + live-Neon)
- **After Wave 2 (e2e flip):** Run `pnpm playwright test` against a Vercel preview URL
- **Before `/gsd-verify-work`:** Full suite green + Lighthouse CI workflow green on a real preview
- **Max feedback latency:** 90 seconds (vitest), 6 minutes (playwright on preview)

---

## Per-Task Verification Map

> Filled by gsd-planner per plan. Skeleton entries below; planner will expand to one row per task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-XX | 01 SCHEMA | 0 | CTA-04 | T-CTA-01 (rate-limit bypass) | `contact_rate_limit` PK `(ip_hash, window_kind, window_start)`, FK-less, opportunistic cleanup | live-Neon | `pnpm vitest run tests/db/contact-rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-XX | 02 SERVER | 1 | CTA-01, CTA-02, CTA-04 | T-CTA-02 (Turnstile bypass), T-CTA-03 (honeypot subversion) | `withPublicAction` runs honeypot → turnstile → rate-limit before action; failures return discriminated `{ ok:false, reason }`, never throw | live-Neon | `pnpm vitest run tests/lib/server-action-public.test.ts tests/actions/contact.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-XX | 02 SERVER | 1 | CTA-02 | — | Resend `from:` reuses Phase-1 verified domain; failures swallowed + logged to Sentry — submission row never blocked | unit | `pnpm vitest run tests/lib/email-contact.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-XX | 03 UI | 1 | CTA-01, CTA-03 | T-CTA-04 (sourcePage tampering) | ContactForm reads `usePathname()` for sourcePage; server validates `^/(uz|ru|en)/` prefix and discards otherwise; honeypot field renders off-screen via inline `style` (Tailwind purge-safe) | jsdom | `pnpm vitest run tests/components/contact-form.test.tsx tests/components/contact-button.test.tsx` | ❌ W0 | ⬜ pending |
| 05-04-XX | 04 PAGE | 1 | CTA-01, SEO-06 | — | `/[locale]/contact` SSRs same `<ContactForm>` as modal; sitemap-{uz,ru,en} include `/contact` with full hreflang fan-out | unit | `pnpm vitest run tests/api/sitemap.test.ts` | ✅ (extends existing) | ⬜ pending |
| 05-05-XX | 05 PERF/E2E | 2 | SEO-05 (regression), CTA-01 | — | Lighthouse Slow-4G LCP `error` (not `warn`) on /contact + product detail; `scripts/load-test.sh` asserts p95 + 0 errors against 5 endpoints | e2e+perf | `pnpm playwright test tests/e2e/contact-roundtrip.spec.ts tests/e2e/cloudinary-widget-smoke.spec.ts tests/e2e/glyph-render.spec.ts` + LHCI workflow run | ❌ W0 | ⬜ pending |
| 05-06-XX | 06 CLOSURE | 3 | SEO-06, OPS-02 | — | Search Console + Yandex HTML verification placeholders pre-staged in `/public/`; dogfood protocol doc captures timing log shape | manual + structural | `ls public/google*.html public/yandex_*.html && test -f docs/dogfood-protocol.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Wave-0 promise:** every ❌ W0 row above MUST have a corresponding RED test stub authored in plan 01 and flipped to GREEN by the wave that owns the requirement.

---

## Wave 0 Requirements

> All test stubs land in plan 01 (Wave 0) so Waves 1-3 only flip RED → GREEN, never author new contracts.

- [ ] `tests/db/contact-rate-limit.test.ts` — RED stubs for atomic UPSERT, hour-bucket overflow at 6th, day-bucket overflow at 21st, opportunistic cleanup deletes rows older than 2 days (CTA-04)
- [ ] `tests/lib/server-action-public.test.ts` — RED stubs for `withPublicAction` triple-gate ordering (honeypot → turnstile → rate-limit), discriminated error returns, audit-log writes for `spam_detected` + `rate_limited` (CTA-01, CTA-04)
- [ ] `tests/lib/turnstile.test.ts` — RED stub for `verifyTurnstileToken()` siteverify happy path + failure modes (timeout, `error-codes` array, missing token) (CTA-01)
- [ ] `tests/lib/rate-limit.test.ts` — RED stubs for HMAC-SHA256 hash determinism + per-bucket count check (5/hour AND 20/day) (CTA-04)
- [ ] `tests/actions/contact.test.ts` — RED stubs for `submitContactForm` happy path + product-context auto-prepend when `sourcePage` matches `/[locale]/products/<slug>` + emails fire-and-forget on Resend failure (CTA-01, CTA-02, CTA-03)
- [ ] `tests/lib/email-contact.test.ts` — RED stubs for `ContactSubmissionAdminEmail` (English-only) + `ContactSubmissionAutoReply` (locale-parameterized uz/ru/en) shape assertions (CTA-02)
- [ ] `tests/components/contact-form.test.tsx` — RED jsdom stubs for honeypot field DOM presence + Turnstile widget mount + sourcePage hidden field captured from `usePathname()` (CTA-01, CTA-03)
- [ ] `tests/components/contact-button.test.tsx` — RED jsdom stub for sticky "Contact us" button → shadcn Dialog open → ContactForm mounted inside dialog (CTA-01)
- [ ] `tests/api/sitemap.test.ts` — extend existing test with `/contact` per-locale entry assertion (SEO-06)
- [ ] `tests/e2e/contact-roundtrip.spec.ts` — RED `test.fixme` stub for visit /contact → submit → DB row + admin email (CTA-01, CTA-02)
- [ ] `tests/e2e/cloudinary-widget-smoke.spec.ts` — RED `test.fixme` stub for admin product editor widget mounts + `/api/cloudinary/sign` returns 200 (DEF-4-12-04)
- [ ] `tests/e2e/glyph-render.spec.ts` — RED `test.fixme` stub for `oʻ`/`gʻ` (U+02BB) + Cyrillic range (U+0400-U+04FF) computed font-family resolves to next/font className on /uz/ + /ru/ pages (DEF-4-12-03)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google Search Console registration + sitemap submission + International Targeting panel screenshot | SEO-06 | Requires real Google account ownership of the production domain | (1) Login to Search Console with the project's owner Google account; (2) add `manometr.uz` (or production domain) as property; (3) verify via the HTML file Claude pre-stages in `/public/google*.html`; (4) submit `https://<domain>/sitemap-index.xml`; (5) screenshot the International Targeting panel showing 0 hreflang errors and attach to 05-VERIFICATION.md as `DEF-5-NN-NN` evidence |
| Yandex Webmaster registration + TechArticle Rich Results validation | SEO-06, DEF-4-12-02 | Requires real Yandex account ownership | (1) Register `manometr.uz` in Yandex Webmaster; (2) verify via the HTML file Claude pre-stages in `/public/yandex_*.html`; (3) submit per-locale sitemaps; (4) run Yandex's structured-data validator against a recipe + industry detail URL; (5) attach evidence as `DEF-5-NN-NN` |
| Google Rich Results Test (TechArticle) | DEF-4-12-01 | Requires Google's hosted validator + production-style URL | Run `https://search.google.com/test/rich-results` against a published recipe and industry URL on the Vercel preview; assert TechArticle is detected; attach screenshot |
| Real-device Slow-4G QA across uz/ru/en (3 phones) | SEO-05 (regression), DEF-4-12-03 (carry-over) | Real-device font rendering and emulated-network behavior on actual hardware can't be fully replicated by Lighthouse CI | (1) Mid-tier Android + iPhone + budget Android; (2) Chrome DevTools Slow-4G throttle on each; (3) navigate /uz, /ru, /en home + product detail + contact; (4) verify LCP < CWV budget + visual confirmation that `oʻ`/`gʻ` glyphs render with the configured next/font (no font fallback); (5) attach observations as `DEF-5-NN-NN` |
| Content team dogfood (≥10 trilingual products at ≤10 min each) | OPS-02 | Operational process — measures the admin UX against real human time, not a code assertion | Content team enters 10 real products following `docs/dogfood-protocol.md`; each entry's start/end timestamps logged in a shared sheet; OPS-02 passes when median ≤10 min and no entry > 15 min |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (12 stubs above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s for vitest, < 6 min for playwright on preview
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
