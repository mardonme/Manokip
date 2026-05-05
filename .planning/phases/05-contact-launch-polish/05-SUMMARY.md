---
phase: 05-contact-launch-polish
status: locally-complete
closure_posture: closed-with-deferred-validation (per D-14)
score: 4/6 fully verified (CTA-01..04); 2/6 closed-with-deferred-validation (SEO-06 + OPS-02)
v1_launch_state: awaiting 5 DEF-5-06-* user actions per D-15 two-state model
plans:
  - 05-01-PLAN.md (Wave 0 BLOCKING — schema + audit + env + RED stubs)
  - 05-02-PLAN.md (Wave 1 — server stack)
  - 05-03-PLAN.md (Wave 1 — visitor UI)
  - 05-04-PLAN.md (Wave 1 — canonical page + sitemap)
  - 05-05-PLAN.md (Wave 2 — perf gates + e2e flips)
  - 05-06-PLAN.md (Wave 3 — closure)
requirements_closed:
  fully_verified: [CTA-01, CTA-02, CTA-03, CTA-04]
  closed_with_deferred_validation: [SEO-06, OPS-02]
deferred_validation_gates:
  - DEF-5-06-SEO06-GSC (Google Search Console + Rich Results — absorbs DEF-4-12-01)
  - DEF-5-06-SEO06-YANDEX (Yandex Webmaster + structured-data validator — absorbs DEF-4-12-02)
  - DEF-5-06-OPS02 (content team dogfood — 10 trilingual products at ≤10 min each)
  - DEF-5-06-DEVICEQA (3-phone × 3-locale Slow-4G QA — absorbs DEF-4-12-03 visual portion)
  - DEF-5-06-CLOUDINARY-MANUAL (manual upload smoke — absorbs DEF-4-12-04 manual portion)
phase4_carryover_absorbed:
  - DEF-4-12-01 → DEF-5-06-SEO06-GSC
  - DEF-4-12-02 → DEF-5-06-SEO06-YANDEX
  - DEF-4-12-03 → tests/e2e/glyph-render.spec.ts (GREEN at 05-05) + DEF-5-06-DEVICEQA
  - DEF-4-12-04 → tests/e2e/cloudinary-widget-smoke.spec.ts (GREEN at 05-05) + DEF-5-06-CLOUDINARY-MANUAL
metrics:
  total_plans: 6
  completed: 6
  total_red_stubs_at_wave_0: 12 files (49 cases)
  red_stubs_flipped_green: 12 files (29 server-side + 12 jsdom + 3 sitemap + 7 Playwright)
  task_commits_in_phase: ~30 across 6 plans
  duration_days: 1 (2026-05-05 — all 6 plans landed in a single session)
  completed_date: 2026-05-05
---

# Phase 5: Contact and Launch Polish — Phase Summary

**One-liner:** Phase 5 ships the sole CTA (site-wide visitor contact form with honeypot + Cloudflare Turnstile + per-IP HMAC-hashed 2-bucket rate limit + atomic dbTx insert + audit row + fire-and-forget Resend admin notification + locale-parameterized visitor auto-reply), canonical /[locale]/contact RSC page sharing a single SSOT ContactForm with the SiteHeader modal, sitemap /contact extension, BLOCKING Lighthouse CI gate on Slow-4G across 5 URLs, workflow_dispatch ab-based load-test, 7 Playwright e2e specs flipped GREEN, and closes the phase locally per D-14 with 5 DEF-5-06-* environmental gates carried forward to v1 launch per D-15.

## Phase Outcomes

### Plans Landed (6/6)

| Plan  | Wave | Subsystem | Key Deliverables |
| ----- | ---- | --------- | ---------------- |
| 05-01 | 0 (BLOCKING) | schema-foundation | contact_rate_limit Drizzle migration + 7-check live-DB verifier; AUDIT_ACTIONS extended 13 → 16 verbs (spam_detected + rate_limited + contact_submission_create); 4 env vars validated at boot; messages skeleton (27 leaf keys × 3 locales); 12 RED stub files (49 cases) |
| 05-02 | 1 | server-stack | withPublicAction sibling to withAdminAction (honeypot/Turnstile/rate-limit triple-gate); turnstile.ts + rate-limit.ts (HMAC-SHA256 + atomic 2-bucket UPSERT); zod/contact.ts; 2 React Email templates (admin EN-only + auto-reply uz/ru/en); email-contact.ts (fire-and-forget Resend); submitContactForm Server Action; 6 RED stubs flipped GREEN (29 specs) |
| 05-03 | 1 | visitor-ui | ContactForm SSOT (RHF + zodResolver + Cloudflare Turnstile widget + INLINE-style off-screen honeypot + sourcePage capture + page/modal modes); ContactButton (shadcn Dialog wrapper); StickyCtaContactButton client island; SiteHeader mount; sticky-cta-rail wiring; 24-key public.contact namespace populated (3-locale parity); 2 jsdom RED stubs flipped GREEN (12 specs) |
| 05-04 | 1 | canonical-page-and-sitemap | /[locale]/contact RSC page with mode='page' ContactForm + buildAlternates({pathPrefix:'/contact'}) for canonical + hreflang; sitemap.ts /contact one-line addition; 3 sitemap RED stubs flipped GREEN + 1 appended coverage spec |
| 05-05 | 2 | perf-gates-and-e2e-flips | Lighthouse CI warn → error severity lift (LCP budget loosened 2500 → 3000 ms for preview headroom); 5-URL Lighthouse fan-out; scripts/load-test.sh (ab -n 500 -c 50 across 5 read-only endpoints with p95 budget) + .github/workflows/load-test.yml (workflow_dispatch ONLY); 3 Playwright e2e specs flipped GREEN (7 active specs) — contact-roundtrip + cloudinary-widget-smoke (absorbs DEF-4-12-04) + glyph-render (absorbs DEF-4-12-03) |
| 05-06 | 3 | closure | 2 webmaster verification HTML placeholders in /public/; 05-DOGFOOD-PROTOCOL.md (10-product timing log template); 05-VERIFICATION.md (closed-with-deferred-validation, 5 DEF-5-06-* entries); 04-VERIFICATION.md updated with absorbed_by: pointers + absorption note; REQUIREMENTS.md flipped 6 REQs; RETROSPECTIVE.md gained Phase 5 entry; STATE.md + ROADMAP.md updated |

### Requirements Closed (6 v1 REQs)

| REQ | Status | Evidence Anchor |
| --- | ------ | --------------- |
| CTA-01 | Complete | 05-02 withPublicAction triple-gate; 05-03 ContactForm SSOT; 05-04 canonical page; 05-05 e2e GREEN |
| CTA-02 | Complete | 05-02 atomic dbTx insert + audit + Resend fire-and-forget; 05-05 e2e asserts row in Neon |
| CTA-03 | Complete | 05-02 sourcePage validation + product-context auto-prepend (D-03); 05-03 usePathname() capture; 05-05 e2e asserts prepend prefix |
| CTA-04 | Complete | 05-01 contact_rate_limit table + (ip_hash, window_kind, window_start) PK; 05-02 HMAC + 2-bucket UPSERT; live-Neon tests GREEN |
| SEO-06 | Complete-with-deferred-validation | 05-04 sitemap /contact extension; 05-05 5-URL Lighthouse coverage; 05-06 placeholder verification HTML files; DEF-5-06-SEO06-GSC + DEF-5-06-SEO06-YANDEX track external-account work |
| OPS-02 | Complete-with-deferred-validation | 05-06 05-DOGFOOD-PROTOCOL.md ships timing log + sign-off; DEF-5-06-OPS02 tracks content-team execution |

### Phase-4 Carry-Over Absorbed (per CONTEXT D-13)

DEF-4-12-01..04 fold into Phase 5 plans:

- **DEF-4-12-01** (Google Rich Results) → DEF-5-06-SEO06-GSC (plan 05-06 ships placeholder; user registers + validates)
- **DEF-4-12-02** (Yandex TechArticle) → DEF-5-06-SEO06-YANDEX (plan 05-06 ships placeholder; user registers + validates)
- **DEF-4-12-03** (Cyrillic + Uzbek-Latin glyph QA) → automated portion absorbed by tests/e2e/glyph-render.spec.ts GREEN at 05-05 task 5.5; real-device portion → DEF-5-06-DEVICEQA (plan 05-06)
- **DEF-4-12-04** (Cloudinary widget e2e) → smoke portion absorbed by tests/e2e/cloudinary-widget-smoke.spec.ts GREEN at 05-05 task 5.4; manual upload roundtrip → DEF-5-06-CLOUDINARY-MANUAL (plan 05-06)

`absorbed_by:` markers added to 04-VERIFICATION.md frontmatter; absorption note section appended (plan 05-06 task 6.4).

### 5 DEF-5-06-* Gates (carried to v1 launch per D-15)

1. **DEF-5-06-SEO06-GSC** — Google Search Console registration + sitemap submission + International Targeting screenshot (also subsumes DEF-4-12-01 Google Rich Results validation for TechArticle).
2. **DEF-5-06-SEO06-YANDEX** — Yandex Webmaster registration + structured-data validator (also subsumes DEF-4-12-02). P4-4 acceptance: if industry TechArticle flagged, log v1.1 task to downgrade to '@type':'Article'.
3. **DEF-5-06-OPS02** — content team dogfood (10 trilingual products, ≤10 min each, signed-off via 05-DOGFOOD-PROTOCOL.md).
4. **DEF-5-06-DEVICEQA** — 3-phone × 3-locale × 3-page-type Slow-4G QA (27 visual checks).
5. **DEF-5-06-CLOUDINARY-MANUAL** — manual Cloudinary widget upload smoke against Vercel preview.

Per D-15 two-state model: "Phase 5 locally complete" is a separate gate from "v1 launched." v1 launch happens AFTER all 5 DEF-5-06-* entries clear.

## Key Files Delivered

### Source code (created)

- `src/db/schema/contact-rate-limit.ts` (Drizzle pgTable with composite PK + CHECK constraint + cleanup index)
- `src/lib/turnstile.ts` (Cloudflare siteverify wrapper)
- `src/lib/rate-limit.ts` (HMAC-SHA256 hashIp + parseClientIp + atomic 2-bucket UPSERT in dbTx)
- `src/lib/zod/contact.ts` (contactInsertSchema visitor input shape)
- `src/lib/email-contact.ts` (Resend dispatcher with fire-and-forget wrappers)
- `src/emails/contact-admin.tsx` (English-only admin notification)
- `src/emails/contact-auto-reply.tsx` (locale-parameterized visitor auto-reply with COPY map)
- `src/actions/contact.ts` (submitContactForm wrapping withPublicAction)
- `src/components/public/contact-form.tsx` (SSOT ContactForm — RHF + Turnstile + honeypot + sourcePage + page/modal modes)
- `src/components/public/contact-button.tsx` (shadcn Dialog modal trigger)
- `src/components/public/sticky-cta-contact-button.tsx` (product-detail variant with productContext pre-fill)
- `src/app/[locale]/contact/page.tsx` (canonical RSC page mounting mode='page' ContactForm + buildAlternates)
- `scripts/verify-05-01-migration.ts` (7-check live-DB verifier for contact_rate_limit migration)
- `scripts/load-test.sh` (ab -n 500 -c 50 across 5 read-only endpoints with p95 budget)
- `.github/workflows/load-test.yml` (workflow_dispatch ONLY)
- `drizzle/0004_phase5_contact_rate_limit.sql` + `drizzle/meta/0004_snapshot.json`
- `public/google_TODO_replace_with_real_hash.html` (Search Console verification slot — user replaces post-registration)
- `public/yandex_TODO_replace_with_real_hash.html` (Yandex Webmaster verification slot)
- 12 RED stub files in tests/ (all flipped GREEN through plans 05-02..05-05)

### Source code (modified)

- `src/lib/server-action.ts` (appended withPublicAction sibling to existing withAdminAction)
- `src/lib/audit.ts` (AUDIT_ACTIONS tuple extended 13 → 16 verbs)
- `src/lib/sitemap.ts` (one-line addition: '/contact' to staticPath array)
- `src/env.ts` (4 new env vars validated at boot)
- `.env.example` (4 new keys documented with Cloudflare test values)
- `src/components/public/site-header.tsx` (mounts ContactButton right of LocaleSwitcher)
- `src/components/public/sticky-cta-rail.tsx` (gains locale prop; #contact anchor swapped to StickyCtaContactButton)
- `src/app/[locale]/products/[slug]/page.tsx` (passes locale through to StickyCtaRail)
- `messages/{uz,ru,en}.json` (24-key public.contact namespace populated, 3-locale parity)
- `.lighthouserc.json` (warn → error severity; LCP budget 2500 → 3000 ms)
- `.github/workflows/lighthouse-preview.yml` (1 → 5 URL fan-out)

### Planning artifacts (created/modified)

- `.planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md` (10-product timing log)
- `.planning/phases/05-contact-launch-polish/05-VERIFICATION.md` (closure with 5 DEF-5-06-* entries)
- `.planning/phases/05-contact-launch-polish/05-01-SUMMARY.md` ... `05-06-SUMMARY.md` + this 05-SUMMARY.md
- `.planning/phases/04-content-features/04-VERIFICATION.md` (DEF absorption pointers + note section per D-13)
- `.planning/REQUIREMENTS.md` (CTA-01..04 + SEO-06 + OPS-02 status flips)
- `.planning/RETROSPECTIVE.md` (Phase 5 entry per D-15 two-state model)
- `.planning/STATE.md` (Phase 5 LOCALLY COMPLETE position; 5 DEF-5-06-* entries in Deferred Items table; Next Steps lists user actions)
- `.planning/ROADMAP.md` (Phase 5 row 6/6 + Complete + 2026-05-05; all 6 plan checkboxes flipped to [x])

## Patterns Locked (10)

1. **withPublicAction sibling to withAdminAction** — anonymous Server Action wrapper composing honeypot/Turnstile/rate-limit triple-gate inside the wrapper. Discriminated `{ ok, error }` with 5 error variants.
2. **2-bucket Postgres rate limit (no Redis)** — atomic UPSERT in `dbTx.transaction` with PK `(ip_hash, window_kind, window_start)` + opportunistic cleanup.
3. **HMAC-with-server-salt for any visitor identifier** — project default for visitor IP / fingerprint persistence.
4. **Locale-parameterized React Email template with COPY map + conditional fragments** — auto-reply uz/ru/en + optional product-context line.
5. **Closed-with-deferred-validation closure posture** — third phase using it (02 + 04 + 05). DEF-N-XX-* IDs are load-bearing audit trail.
6. **Wave 0 RED-stubs-then-flip pattern** — every Wave 1+ plan only flips it.skip → it. Locked across 2 phases.
7. **Inline-style off-screen honeypot** — Tailwind v4 purge cannot strip inline `React.CSSProperties`.
8. **Turnstile widget reset on rejected submit + disabled-until-token submit button** — Pitfall 2 mitigation for Cloudflare reused-token rejection.
9. **DEF absorption pointer pattern** — `absorbed_by:` field in original DEF entry's frontmatter + absorption-note section in original VERIFICATION.md.
10. **D-15 two-state phase closure** — "phase locally complete" vs "v1 launched" are distinct gates; RETROSPECTIVE entry documents both states explicitly.

## Stray Artifact Disposition

The pre-existing untracked file `.planning/phases/04-content-features/04-12-SUMMARY.md` was inspected at Phase-5-06 start. It is the genuine Phase-4 plan 04-12 SUMMARY (full content, frontmatter consistent with Phase-4 04-VERIFICATION.md, references real commits d59d035 / ed3b546 / b739ae5 / b713f34 that exist in `git log`). Decision: leave it as-is to preserve Phase-4's audit trail; it was authored at Phase-4 closure but never staged. Not committed in Phase-5-06 final commit because it belongs to Phase-4's commit chain conceptually; the user can decide to commit it separately or leave it as a working-tree artifact. Recorded here so it isn't lost.

## Verification Commands

```bash
pnpm tsc --noEmit                                                                # PASS
pnpm vitest run                                                                  # full suite GREEN; 12 stub files flipped
pnpm tsx scripts/verify-05-01-migration.ts                                       # 7/7 PASS against Neon dev branch
pnpm playwright test --list                                                      # listing succeeds; 7 new Phase-5 specs active (no fixme)
grep -rn "test\.fixme" tests/e2e/contact-roundtrip.spec.ts tests/e2e/cloudinary-widget-smoke.spec.ts tests/e2e/glyph-render.spec.ts  # 0 hits
ls public/google_*.html public/yandex_*.html                                     # 2 files
test -f .planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md          # exists
grep -c "absorbed_by" .planning/phases/04-content-features/04-VERIFICATION.md     # 4
grep -E "^- \[x\] \*\*(CTA-01|CTA-02|CTA-03|CTA-04|SEO-06|OPS-02)" .planning/REQUIREMENTS.md | wc -l  # 6
grep -c "Phase 5" .planning/RETROSPECTIVE.md                                     # >= 1
```

## Self-Check: PASSED

**Created files (Phase 5 phase-level):**
- `public/google_TODO_replace_with_real_hash.html` — FOUND
- `public/yandex_TODO_replace_with_real_hash.html` — FOUND
- `.planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md` — FOUND
- `.planning/phases/05-contact-launch-polish/05-VERIFICATION.md` — FOUND
- `.planning/phases/05-contact-launch-polish/05-SUMMARY.md` — FOUND (this file)

**Modified files (Phase 5 closure):**
- `.planning/phases/04-content-features/04-VERIFICATION.md` — `grep -c "absorbed_by"` returns 4
- `.planning/REQUIREMENTS.md` — 6 REQs flipped from `[ ]` to `[x]` (CTA-01..04 + SEO-06 + OPS-02)
- `.planning/RETROSPECTIVE.md` — Phase 5 entry appended with D-15 two-state model
- `.planning/STATE.md` — Phase 5 LOCALLY COMPLETE position; 5 DEF-5-06-* entries in Deferred Items
- `.planning/ROADMAP.md` — Phase 5 row 6/6 + Complete; all 6 plan checkboxes [x]

**Plan-06 task commits (this plan):**
- `377d170` (Task 6.1 — webmaster verification placeholders)
- `0799ea5` (Task 6.2 — OPS-02 dogfood protocol)
- `142a328` (Task 6.3 — 05-VERIFICATION.md)
- `dc4b585` (Task 6.4 — 04-VERIFICATION.md DEF absorption)
- `378d442` (Task 6.5 — REQUIREMENTS.md status flips)
- (final commit — Task 6.6 — RETROSPECTIVE + STATE + ROADMAP + 05-SUMMARY)

**Phase 5 LOCALLY COMPLETE 6/6.** v1 launch awaits 5 DEF-5-06-* user actions per D-15 two-state model.
