# Phase 05: Contact and Launch Polish - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 ships the sole CTA (site-wide contact form), validates launch readiness, and registers the site with Google Search Console + Yandex Webmaster. After Phase 5, Manometr v1 goes live to public traffic.

**In scope (from REQUIREMENTS.md):**
- CTA-01..04: Contact form with name/company/email/(phone)/message + honeypot + Cloudflare Turnstile + per-IP rate limit + sourcePage hidden field; persists to `contact_submission` and notifies admin team via Resend
- SEO-06: Google Search Console + Yandex Webmaster registered; International Targeting panel clean
- OPS-02: Content team dogfoods ≥10 trilingual products at ≤10 min/product

**Also folded in (Phase-4 carry-over):**
- DEF-4-12-01: Google Rich Results validation against Vercel preview (overlaps SEO-06)
- DEF-4-12-02: Yandex Webmaster TechArticle validation (overlaps SEO-06)
- DEF-4-12-03: Cyrillic + Uzbek-Latin (`oʻ`/`gʻ` U+02BB) glyph QA on real devices (overlaps Slow-4G QA)
- DEF-4-12-04: Cloudinary upload widget e2e smoke (Phase 5 e2e plan absorbs this)

**Out of scope:**
- Any new public catalog/admin features (v1.1 backlog)
- Live-chat / Intercom-style widgets (intentionally B2B contact-only per PROJECT.md)
- Visitor accounts / saved-products / quote-builder (explicitly v2 per REQUIREMENTS.md)

</domain>

<decisions>
## Implementation Decisions

### Form UX & Placement
- **D-01:** Form lives at canonical `/[locale]/contact` page AND opens in a modal from a sticky "Contact us" button mounted on the right side of `SiteHeader` (next to `LocaleSwitcher`). The dedicated page is the canonical for SEO; the modal is the conversion surface. Both render the same `<ContactForm>` component — single source of truth.
- **D-02:** Phone field is shown but optional. Schema column already nullable (`src/db/schema/contact.ts:10`).
- **D-03:** When `sourcePage` matches `/[locale]/products/<slug>`, the Server Action server-side prepends a localized line (`Inquiry about: <Product Name> (<SKU>)\n\n`) to the message body BEFORE insert. Admin sees product context inline in the existing submissions inbox — zero new UI in `/admin/submissions`.

### Spam Protection
- **D-04:** Three-layer defense: (1) hidden honeypot field rendered off-screen via CSS, server-side check returns HTTP 200 with success-shaped JSON when populated (drop silently — bot doesn't retry) and writes `audit_log` row with `action='spam_detected'`; (2) Cloudflare Turnstile token verified server-side at submit; (3) per-IP rate limit.
- **D-05:** Rate limit: 5 submissions per hour AND 20 per day per hashed IP. Storage in new Postgres table `contact_rate_limit(ip_hash text, window_start timestamptz, count int, primary key (ip_hash, window_start))` with a nightly cleanup job (or `DELETE WHERE window_start < now() - interval '2 days'` opportunistically on every insert). No new infra dependency, no new env vars beyond Turnstile credentials.
- **D-06:** IP hashing uses HMAC-SHA256 with a server-side secret (new env var `RATE_LIMIT_IP_SALT`) so the table never stores raw visitor IPs (GDPR posture).

### Notification Flow
- **D-07:** Admin notification recipients via env-list: `ADMIN_NOTIFY_EMAILS` comma-separated (matches the Phase-1 admin-bootstrap pattern). Empty list → no admin notification (preserves dev-without-secrets ergonomics).
- **D-08:** Visitor receives auto-reply confirmation email in their site locale (uz/ru/en). Subject + body translated; React Email template parameterized by locale (single template file, not three).
- **D-09:** 2 React Email templates total: `ContactSubmissionAdminEmail` (one for admin, English-only since admins read English) and `ContactSubmissionAutoReply` (locale-parameterized, renders uz/ru/en).
- **D-10:** Both emails use the existing Resend client (`src/lib/auth.ts` pattern); failures are logged to Sentry but do NOT fail the form submission — the row is inserted first, emails sent fire-and-forget so a Resend outage never blocks the visitor.

### Launch-Gate Execution Scope
- **D-11:** Claude drives everything that does NOT require real devices or external account ownership: contact form + emails + rate limit + load test script (`scripts/load-test.sh` running `ab -n 500 -c 50` against a Vercel preview URL captured in CI logs) + Lighthouse-CI Slow-4G profile addition (extending Phase-3 plan 03-09's existing Lighthouse workflow) + Cloudinary upload widget Playwright e2e + Cyrillic+Uzbek-Latin glyph render assertions in Playwright.
- **D-12:** User drives only what genuinely requires real-device or external-account ownership: Google Search Console registration + sitemap submission + International Targeting panel screenshot, Yandex Webmaster registration + TechArticle Rich Results validation, real-device Slow-4G QA across uz/ru/en (3 phones), content-team dogfood with timing log.
- **D-13:** Phase-4 deferred items (DEF-4-12-01..04) fold into Phase 5 plans where they overlap — they do NOT remain as separate tracked items. Yandex Webmaster validation lands inside the SEO-06 plan; Cloudinary widget e2e lands inside the contact-form e2e plan; glyph QA lands inside the Slow-4G QA plan; Google Rich Results validation lands inside the SEO-06 plan as the manual gate.

### Phase Closure Posture
- **D-14:** Phase 5 closes locally with `closed-with-deferred-validation` posture for environmental items (same model as Phases 2 + 4). Code-shippable items MUST be GREEN before phase closes; environmental items are tracked as `DEF-5-NN-NN` deferred validation entries with explicit owner = user.
- **D-15:** "v1 launched" is a separate gate from "Phase 5 locally complete" — v1 launch happens AFTER all DEF-5 entries clear. Phase 5 retrospective documents both states.

### Claude's Discretion
- Modal component primitive: shadcn `Dialog` is already installed (Phase 2) — reuse it; no new UI primitive needed.
- Auto-reply email visual design: minimal text-first (matches Phase-1 magic-link email style); product-context line included if applicable.
- Rate-limit cleanup: opportunistic `DELETE WHERE window_start < now() - interval '2 days'` on insert vs scheduled job — planner picks based on traffic projection.
- Load-test target throughput: planner picks specific endpoints to hit (homepage + a hot category + product detail + search + sitemap) and asserts on p95 < a budgeted threshold.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/REQUIREMENTS.md` — CTA-01..04, SEO-06, OPS-02 acceptance criteria
- `.planning/ROADMAP.md` §"Phase 5: Contact and Launch Polish" — goal + 4 success criteria
- `.planning/PROJECT.md` — core value (informational catalog, single CTA, B2B audience)

### Architecture & Stack
- `.planning/research/ARCHITECTURE.md` — data flows, ERD, component boundaries
- `.planning/research/STACK.md` — Resend + React Email + Cloudflare Turnstile rationale
- `.planning/research/PITFALLS.md` — review for Phase-5 risks (rate-limit pitfalls, email deliverability, sitemap submission gotchas)
- `.planning/research/FEATURES.md` — feature inventory

### Phase-4 Carry-Over
- `.planning/phases/04-content-features/04-VERIFICATION.md` — DEF-4-12-01..04 entries and acceptance criteria
- `.planning/phases/04-content-features/04-12-PLAN.md` — original deferral rationale

### Reusable Code (already shipped)
- `src/db/schema/contact.ts` — existing `contact_submission` table; Phase 5 ADDS only `contact_rate_limit` (no schema change to `contact_submission`)
- `src/actions/submissions.ts` — admin-side mark-read + CSV export (Phase-2 02-15); Phase 5 visitor-side `submitContactForm` action lives in a new `src/actions/contact.ts`
- `src/lib/zod/submission.ts` — existing schema for admin filters; Phase 5 adds new `contactInsertSchema` in `src/lib/zod/contact.ts` (visitor-input shape distinct from admin read shape)
- `src/lib/auth.ts` — Resend client + `sendVerificationRequest` pattern to mirror for transactional sends
- `emails/` directory — Phase-1 magic-link `LoginEmail` + Phase-2 `AdminInviteEmail` — copy structure for `ContactSubmissionAdminEmail` + `ContactSubmissionAutoReply`
- `src/components/public/site-header.tsx` — mount point for the sticky "Contact us" button (right of `LocaleSwitcher`)
- `src/app/[locale]/admin/submissions/page.tsx` — existing inbox; Phase-5 form feeds it (no UI changes required there)

### SEO Infra (already shipped Phase-3)
- `src/lib/sitemap.ts` — sitemap-{uz,ru,en}.xml emitters; Phase 5 ADDS `/contact` static-paths entry per locale
- `src/app/robots.ts` (or static `public/robots.txt`) — sitemap reference; verify Search Console can fetch
- `.github/workflows/lighthouse-ci.yml` (Phase-3 plan 03-09) — Phase 5 EXTENDS with Slow-4G profile; does not replace

### CI Gates (already shipped Phase-2)
- `.github/workflows/e2e-preview.yml` — pattern for Vercel-preview-gated Playwright; Phase-5 contact-form + Cloudinary-widget e2e specs slot into this workflow
- `playwright.config.ts` — BASE_URL + Vercel Deployment Protection bypass already threaded; Phase-5 specs inherit

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`contact_submission` table** (`src/db/schema/contact.ts`) — schema is FULLY shipped including `phone` (nullable) and `source_page` columns. Phase 5 inserts into it; no migration on this table.
- **Admin submissions inbox** (`src/app/[locale]/admin/submissions/`) — Phase-2 02-15 already ships read/filter/export. Phase 5 visitor form feeds rows directly; admins see them in the existing inbox with zero new UI.
- **Resend client + email pipeline** (`src/lib/auth.ts` + `emails/`) — Phase-1 + Phase-2 email patterns transfer directly to contact-form admin notifications and visitor auto-replies.
- **shadcn `Dialog` primitive** — already installed in Phase 2; powers the modal trigger.
- **`SiteHeader`** (`src/components/public/site-header.tsx`) — Phase-3 03-03; mount point for sticky "Contact us" button.
- **Sticky CTA rail on product detail** (Phase-3 sketch 003) — already has a "Get in touch" call-to-action; Phase 5 wires its onClick to open the new modal (not a new button).
- **Audit log** (`src/lib/audit.ts`) — Phase-2 02-04; honeypot trips and rate-limit blocks log via existing `logAudit()` helper with new action enum values (`spam_detected`, `rate_limited`).

### Established Patterns
- **Server Actions with Zod + `requireAdmin` wrapper** — Phase 5 contact submission uses the SAME atomic-tx + audit pattern as `saveProduct`/`saveRecipe` BUT with a NEW public-facing wrapper (`withRateLimit` + `withTurnstile`) instead of `requireAdmin` since visitors are anonymous.
- **Email templates as React components** in `emails/` — `ContactSubmissionAdminEmail` and `ContactSubmissionAutoReply` follow the same shape as `LoginEmail` and `AdminInviteEmail`.
- **i18n via next-intl** — visitor auto-reply messages live in `messages/{uz,ru,en}.json` under a new `public.contact.autoReply` namespace; admin email subject/body in English only.
- **Closed-with-deferred-validation phase closure** — Phases 2 and 4 already use this; Phase 5 mirrors the posture for environmental items.

### Integration Points
- `SiteHeader` button → `Dialog` open state → `<ContactForm>` (same component as `/contact` page renders)
- Sticky CTA rail "Get in touch" button on product detail → same `Dialog` open state — passes `productContext` prop derived from current product so the auto-prepend prefix lands client-side too (server still re-derives from `sourcePage` for trust)
- `submitContactForm` Server Action → wraps body in honeypot check → Turnstile verify → rate-limit check → `contact_submission` INSERT → fire-and-forget `sendAdminNotification()` + `sendAutoReply()` → return success state
- Sitemap extension: 1 line added per locale for `/contact`
- Lighthouse CI: extend existing workflow's profile array with a `slow-4g` config

</code_context>

<specifics>
## Specific Ideas

- Modal trigger button copy: localized via `messages/*/public.contact.cta` namespace ("Bog'lanish" / "Связаться" / "Contact us") — keep the same as the dedicated page link
- Rate-limit error UX: show a localized "Too many submissions — please try again in an hour" message in the form (not a 429 page); keep visitor on the form
- Honeypot field name: NOT obviously named (`field_extra` not `honeypot`); rendered with `aria-hidden="true"` + CSS `position: absolute; left: -9999px` so screen readers skip it
- IP source: read from `x-forwarded-for` (Vercel-canonical), fallback to `x-real-ip`, never trust raw `req.ip` in serverless

</specifics>

<deferred>
## Deferred Ideas

(None surfaced during discussion — scope stayed inside Phase 5 boundary.)

Future v1.1 backlog candidates (not for Phase 5):
- File attachments on contact form (engineers may want to upload an RFQ PDF)
- Multi-step form (qualification questions before message)
- "Request a callback" toggle with preferred-time picker
- Per-product "Compare" CTA that pre-loads multiple products into a single inquiry
- Live observability dashboard for contact-form submission rate / spam-block rate
- A/B test of modal vs inline placement on product pages (would need posthog or similar)

</deferred>

---

*Phase: 05-contact-launch-polish*
*Context gathered: 2026-05-05*
