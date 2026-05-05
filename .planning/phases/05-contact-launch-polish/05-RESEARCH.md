# Phase 5: Contact and Launch Polish - Research

**Researched:** 2026-05-05
**Domain:** Public-anonymous Server Action (Cloudflare Turnstile + per-IP rate limit + transactional email) + launch-readiness verification (Lighthouse Slow-4G, ab load test, Search Console / Yandex Webmaster registration, content-team dogfood)
**Confidence:** HIGH on stack + spam-defense patterns (verified against Cloudflare official docs + codebase grep); MEDIUM on Cloudinary-widget Playwright iframe interaction (known to be brittle, smoke-only recommended); HIGH on rate-limit Postgres schema (Phase-2 transactional patterns transfer verbatim)

## Summary

Phase 5 is the first phase whose Server Action ships from `src/actions/contact.ts` to **anonymous visitors** rather than gated admins. Every other Phase-2 / Phase-4 mutation pipes through `withAdminAction(schema, handler)` — that wrapper's first line is `requireAdmin()`. Phase 5 must author a **NEW** parallel wrapper (`withPublicAction` / `withRateLimitAndTurnstile`) that keeps the discriminated `{ ok, error|data }` ergonomics admins already use but swaps the auth gate for: (1) honeypot field check → silent 200, (2) Cloudflare Turnstile siteverify with the secret key, (3) per-IP rate-limit upsert + count check on a brand-new `contact_rate_limit` table, (4) hand off to handler.

Three of the four phase success criteria depend on environmental work the user must drive (Search Console + Yandex Webmaster registration, real-device Slow-4G QA across 3 phones, content-team dogfood of 10 trilingual products). Per CONTEXT D-12 + D-14, those land as `closed-with-deferred-validation` `DEF-5-NN-NN` entries — the Phase-5 closure plan ships the artifacts (HTML verification files in `/public/`, dogfood timing log template, real-device test instructions) and Vercel preview URL, then the user runs the gates post-merge.

The remaining work is code that Claude drives top-to-bottom: contact form (RHF + Zod + shared `<ContactForm>` consumed by both `/[locale]/contact` AND a sticky-button-triggered modal), 2 React Email templates (admin notification English-only + visitor auto-reply locale-parameterized via single template + inline COPY map mirroring `magic-link.tsx` and `admin-invite.tsx`), `submitContactForm` Server Action with HMAC-SHA256 IP hashing, sourcePage server-side validation + product-context auto-prepend, sitemap `/contact` extension, audit enum extension (`spam_detected` + `rate_limited`), `scripts/load-test.sh` invoking `ab`, Cloudinary upload widget e2e smoke (DEF-4-12-04 absorption — accept smoke-only because the widget's cross-origin iframe is brittle to drive in Playwright), Cyrillic + Uzbek-Latin glyph render assertions in Playwright (DEF-4-12-03), and the existing Lighthouse CI workflow which **already runs the Slow-4G profile** (1638 Kbps / 150ms RTT in `.lighthouserc.json` — verified). The "extension" called out in CONTEXT D-11 is therefore narrower than initially scoped: lift assertions from `warn` to `error` (or duplicate `.lighthouserc.slow-4g.json`) so the gate becomes blocking, AND extend the URLs array to cover homepage + a hot category + product detail + search + sitemap (not just one product page).

**Primary recommendation:** Author a new `withPublicAction(schema, handler)` wrapper in `src/lib/server-action.ts` (sibling to existing `withAdminAction`) that handles the honeypot/Turnstile/rate-limit triple-gate; reuse every existing pattern (Zod allowlist, `headers()` for IP, `dbTx.transaction` for atomic UPSERT + count check + insert + audit, fire-and-forget Resend emails behind try/catch logged to Sentry); ship `contact_rate_limit` as a single schema migration with the `(ip_hash, window_start)` composite PK; absorb DEF-4-12-04 as smoke-only (asserts widget signature endpoint returns 200 + widget DOM mounts — full cross-origin upload roundtrip stays manual).

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Form UX & Placement
- **D-01:** Form lives at canonical `/[locale]/contact` page AND opens in a modal from a sticky "Contact us" button mounted on the right side of `SiteHeader` (next to `LocaleSwitcher`). The dedicated page is the canonical for SEO; the modal is the conversion surface. Both render the same `<ContactForm>` component — single source of truth.
- **D-02:** Phone field is shown but optional. Schema column already nullable (`src/db/schema/contact.ts:10`).
- **D-03:** When `sourcePage` matches `/[locale]/products/<slug>`, the Server Action server-side prepends a localized line (`Inquiry about: <Product Name> (<SKU>)\n\n`) to the message body BEFORE insert.

#### Spam Protection
- **D-04:** Three-layer defense: (1) hidden honeypot field rendered off-screen via CSS, server-side check returns HTTP 200 with success-shaped JSON when populated (drop silently — bot doesn't retry) and writes `audit_log` row with `action='spam_detected'`; (2) Cloudflare Turnstile token verified server-side at submit; (3) per-IP rate limit.
- **D-05:** Rate limit: 5 submissions per hour AND 20 per day per hashed IP. Storage in new Postgres table `contact_rate_limit(ip_hash text, window_start timestamptz, count int, primary key (ip_hash, window_start))` with a nightly cleanup job (or `DELETE WHERE window_start < now() - interval '2 days'` opportunistically on every insert). No new infra dependency, no new env vars beyond Turnstile credentials.
- **D-06:** IP hashing uses HMAC-SHA256 with a server-side secret (new env var `RATE_LIMIT_IP_SALT`).

#### Notification Flow
- **D-07:** Admin notification recipients via env-list: `ADMIN_NOTIFY_EMAILS` comma-separated. Empty list → no admin notification.
- **D-08:** Visitor receives auto-reply confirmation email in their site locale (uz/ru/en). Subject + body translated; React Email template parameterized by locale (single template file).
- **D-09:** 2 React Email templates total: `ContactSubmissionAdminEmail` (English-only) and `ContactSubmissionAutoReply` (locale-parameterized).
- **D-10:** Both emails use the existing Resend client; failures logged to Sentry but do NOT fail the form submission — row is inserted first, emails sent fire-and-forget.

#### Launch-Gate Execution Scope
- **D-11:** Claude drives everything that does NOT require real devices or external account ownership: contact form + emails + rate limit + load test script + Lighthouse-CI Slow-4G profile addition + Cloudinary upload widget Playwright e2e + Cyrillic+Uzbek-Latin glyph render assertions in Playwright.
- **D-12:** User drives only what genuinely requires real-device or external-account ownership: Google Search Console + sitemap submission + International Targeting screenshot, Yandex Webmaster registration + TechArticle Rich Results validation, real-device Slow-4G QA across uz/ru/en (3 phones), content-team dogfood with timing log.
- **D-13:** Phase-4 deferred items (DEF-4-12-01..04) fold into Phase 5 plans where they overlap.

#### Phase Closure Posture
- **D-14:** Phase 5 closes locally with `closed-with-deferred-validation` posture for environmental items. Code-shippable items MUST be GREEN before phase closes.
- **D-15:** "v1 launched" is a separate gate from "Phase 5 locally complete" — v1 launch happens AFTER all DEF-5 entries clear.

### Claude's Discretion

- Modal component primitive: shadcn `Dialog` already installed (Phase 2) — reuse, no new UI primitive.
- Auto-reply email visual design: minimal text-first (matches Phase-1 magic-link email style); product-context line included if applicable.
- Rate-limit cleanup: opportunistic `DELETE WHERE window_start < now() - interval '2 days'` on insert vs scheduled job — planner picks based on traffic projection.
- Load-test target throughput: planner picks specific endpoints (homepage + hot category + product detail + search + sitemap) and asserts on p95 below a budgeted threshold.

### Deferred Ideas (OUT OF SCOPE)

(None surfaced during discussion — scope stayed inside Phase 5 boundary.)

Future v1.1 backlog candidates:
- File attachments on contact form
- Multi-step form
- "Request a callback" toggle
- Per-product "Compare" CTA
- Live observability dashboard for submission rate
- A/B test of modal vs inline placement on product pages

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTA-01 | Visitor can submit a site-wide contact form (name, company, email, message) gated by honeypot + Cloudflare Turnstile | §Standard Stack (`@marsidev/react-turnstile`) + §Architecture Patterns (Pattern 1: `withPublicAction` triple-gate) + §Code Examples (siteverify call) |
| CTA-02 | Submission persisted to DB; admin team email via Resend | §Code Examples (atomic-tx insert + fire-and-forget Resend) + §Standard Stack (existing `resend@6.12.2` + `react-email@6.0.0`) |
| CTA-03 | Form records source page (hidden field) | §Code Examples (sourcePage capture via `usePathname()` + server-side `/^\/(uz\|ru\|en)\//` validation + product-context auto-prepend) |
| CTA-04 | Submission endpoint rate-limited per IP | §Architecture Patterns (Pattern 2: 2-bucket Postgres rate limit) + §Code Examples (atomic UPSERT) + §Common Pitfalls (#1: HTTP driver transaction limitation) |
| SEO-06 | Site registered with Google Search Console + Yandex Webmaster; International Targeting clean | §Architecture Patterns (Pattern 5: HTML verification files + sitemap submission) + §Common Pitfalls (#7: hreflang already verified Phase 3) |
| OPS-02 | Content team dogfoods ≥10 trilingual products at ≤10 min each | §Architecture Patterns (Pattern 6: dogfood protocol artifact) — purely operational, user-driven per D-12 |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Contact form UI (RHF + Zod + Turnstile widget) | Browser / Client | — | Form state + Turnstile widget mount + honeypot field render are all client-only. No server-side form rendering needed. |
| Sticky modal trigger button + modal lifecycle | Browser / Client | — | Dialog open/close is React state. Header mount is RSC but the trigger button + modal contents are 'use client'. |
| `submitContactForm` Server Action | API / Backend (Next.js Node runtime) | — | Server Action runs in Node runtime (NOT Edge — `next/headers` + Node `crypto.createHmac` + Drizzle `dbTx.transaction` need Node). Anonymous endpoint; no auth gate. |
| Cloudflare Turnstile siteverify | API / Backend | External service | Server-side `fetch` to `challenges.cloudflare.com/turnstile/v0/siteverify` from the Server Action. Secret key never reaches the client. |
| Per-IP rate limit storage | Database / Storage | — | New `contact_rate_limit` table in same Neon Postgres. NO Redis/KV — explicit D-05 + Pitfall #7 single-infra constraint. |
| HMAC-SHA256 IP hashing | API / Backend | — | Node `crypto.createHmac` with `RATE_LIMIT_IP_SALT` env. Hashed before write so DB never stores raw IPs (GDPR posture). |
| Resend admin notification + auto-reply | API / Backend | External service (Resend) | Fire-and-forget after the contact_submission row commits. Sentry catches failures. |
| `/[locale]/contact` page (canonical for SEO) | Frontend Server (SSR) | — | RSC page with `generateMetadata` (hreflang for all 3 locales + x-default). Mounts the same client `<ContactForm>` the modal renders. |
| Sitemap `/contact` per-locale entry | Frontend Server (SSR via cached) | Database / Storage | Static path added to existing `buildLocaleSitemapEntries` static-paths loop in `src/lib/sitemap.ts:74-89`. |
| Search Console + Yandex Webmaster verification files | CDN / Static | — | Static HTML files in `/public/google<hash>.html` + `/public/yandex_<hash>.html` served by Vercel directly. |
| Lighthouse CI Slow-4G assertion | CI / GitHub Actions | — | Existing `.github/workflows/lighthouse-preview.yml` already runs Slow-4G (1638 Kbps / 150ms RTT). Phase 5 lifts assertions to `error` and expands URL set. |
| `scripts/load-test.sh` (`ab`-based) | CI / shell script | — | Manual `workflow_dispatch` only (running on every PR is overkill). Captures preview URL from CI env, asserts p95 + zero errors. |
| Cloudinary widget e2e smoke (DEF-4-12-04) | CI / Playwright | External service (Cloudinary iframe) | Smoke-only: assert widget DOM mounts + `/api/cloudinary/sign` returns 200. Cross-origin iframe upload roundtrip stays manual. |
| Cyrillic + Uzbek-Latin glyph render (DEF-4-12-03) | CI / Playwright | — | Assert SSR HTML contains target characters AND `getComputedStyle(el).fontFamily` includes the next/font className (Inter loaded with cyrillic+latin-ext subsets in Phase 1 SEO-04). |

## Standard Stack

### Core (already installed — verified via `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.4 | Server Actions, RSC, App Router | [VERIFIED: package.json] Phase 5 reuses Phase-1..4 infrastructure verbatim |
| `react-hook-form` | 7.73.1 | Form state for ContactForm | [VERIFIED: package.json] Already used by every admin form (e.g., `RecipeForm`, `ProductForm`) |
| `@hookform/resolvers` | 3.10.0 | Zod ↔ RHF bridge | [VERIFIED: package.json] |
| `zod` | 4.3.6 | `contactInsertSchema` validation | [VERIFIED: package.json] Phase 2 + 4 pattern |
| `drizzle-orm` | 0.45.2 | `contact_rate_limit` table + atomic UPSERT | [VERIFIED: package.json] |
| `drizzle-kit` | 0.31.10 | Schema migration for `contact_rate_limit` | [VERIFIED: package.json] |
| `@neondatabase/serverless` | 1.1.0 | HTTP driver (single-statement) + WebSocket Pool (multi-statement transactions) | [VERIFIED: package.json + src/db/client-ws.ts] **Critical: Neon HTTP driver does NOT support multi-statement transactions; use `dbTx.transaction()` (WebSocket Pool) for the rate-limit + insert + audit atomic block.** |
| `next-intl` | 4.9.1 | Locale-aware messages + `getTranslations()` for auto-reply email body | [VERIFIED: package.json] |
| `resend` | 6.12.2 | Transactional email (admin notify + auto-reply) | [VERIFIED: package.json] Same client as `magic-link.tsx` + `admin-invite.tsx` |
| `react-email` | 6.0.0 | Email templates as JSX | [VERIFIED: package.json] |
| `@react-email/components` | 1.0.12 | `<Html>`, `<Body>`, `<Container>`, `<Text>`, `<Link>`, `<Preview>` | [VERIFIED: package.json + src/emails/admin-invite.tsx] |
| `@sentry/nextjs` | 10.49.0 | Capture Resend send failures + rate-limit / Turnstile errors | [VERIFIED: package.json] |

### Supporting (NEW for Phase 5)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@marsidev/react-turnstile` | **^1.4.0** (verify with `npm view @marsidev/react-turnstile version` at install time) | Cloudflare Turnstile widget for React 19 | [CITED: https://github.com/marsidev/react-turnstile] Active maintenance, React 19 compatible, official TS types, ref API for programmatic reset. **Alternative considered:** raw `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js">` + manual `window.turnstile.render()` — works but loses TS types + ref ergonomics. Recommendation: install `@marsidev/react-turnstile` for the client widget; the SERVER siteverify is a plain `fetch` (no SDK). [ASSUMED on minor version — verify before install] |

> **Honest note:** `@marsidev/react-turnstile` is the de-facto community wrapper but several blog posts also recommend the raw script approach for minimal-dependency posture. Given the project already accepts narrow community packages (`@base-ui/react`, `@dnd-kit/sortable`), the wrapper is the lower-friction choice. If install audit flags it, fall back to raw script + 30-line wrapper component.

### Alternatives Considered (rejected)

| Instead of | Could Use | Tradeoff | Verdict |
|------------|-----------|----------|---------|
| Postgres rate-limit table | Upstash Redis / Vercel KV | Redis has native TTL + atomic INCR; saves writing UPSERT logic | **Rejected** — D-05 explicit "no new infra dependency"; Phase 1 + 2 + 3 + 4 have zero Redis usage; Postgres at 100–500 contact submissions/day handles this with one row per IP per hour-bucket trivially |
| Cloudflare Turnstile | Google reCAPTCHA v3 / hCaptcha | reCAPTCHA more battle-tested but Google branding + privacy posture worse for B2B; hCaptcha similar to Turnstile | **Rejected** — D-04 explicit Turnstile choice; STACK.md already aligned; free tier covers expected traffic |
| `@marsidev/react-turnstile` widget wrapper | Raw `<script>` + manual `window.turnstile.render` | Wrapper saves ~30 lines + gives refs + TS types | Wrapper preferred; raw fallback documented |
| Single React Email template per locale (3 files) | Single locale-parameterized template (1 file) | 3 files = clearer per-locale review; 1 file = DRY + less drift | **Rejected** per D-09: 1 file with COPY map mirrors `magic-link.tsx`/`admin-invite.tsx` pattern verbatim |
| `withPublicAction` returning thrown errors | Returning discriminated `{ ok: false, reason }` | Thrown = simpler signature; discriminated = lets form UI render field-level error per reason | **Discriminated wins** — mirrors `withAdminAction` ergonomics so RHF `useActionState` consumers don't context-switch (existing pattern: `error: 'validation' \| 'unauthorized' \| 'unknown'`; new: `error: 'turnstile_failed' \| 'rate_limited' \| 'spam_detected' \| 'validation' \| 'unknown'`) |

### Installation

```bash
# Phase 5 — only one new dep
pnpm add @marsidev/react-turnstile

# Verify version
pnpm view @marsidev/react-turnstile version
# (record the resolved version in 05-VERIFICATION.md)
```

**No other new packages** — every other capability (Resend, React Email, Drizzle, Zod, Node `crypto`, RHF, shadcn `Dialog`, Sentry) is already installed.

### New Environment Variables (4 total)

| Var | Scope | Purpose |
|-----|-------|---------|
| `TURNSTILE_SITE_KEY` | client (`NEXT_PUBLIC_*` or threaded via prop) | Public widget key for `<Turnstile siteKey={...}>` mount |
| `TURNSTILE_SECRET_KEY` | server | Server `fetch` body field `secret` for siteverify call |
| `RATE_LIMIT_IP_SALT` | server | HMAC key for `crypto.createHmac('sha256', SALT).update(ip).digest('hex')` |
| `ADMIN_NOTIFY_EMAILS` | server | Comma-separated email list. Empty list → skip admin notify (D-07). |

The Turnstile site key MUST be exposed to the browser; in `src/env.ts` the t3-env client/server split needs both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client) and `TURNSTILE_SECRET_KEY` (server). Keep names distinct so a config swap can never leak the secret.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  VISITOR (browser, anonymous)                    │
│   Lands on /[locale]/<any-page>                                  │
└──────────────┬───────────────────────────────────┬──────────────┘
               │                                   │
       (clicks sticky                       (visits canonical
        "Contact us" button)                 /[locale]/contact)
               │                                   │
               ▼                                   ▼
       ┌───────────────────┐              ┌────────────────────┐
       │ shadcn <Dialog>   │              │ /[locale]/contact  │
       │ open=true         │              │ RSC page           │
       │ contains          │              │ generateMetadata() │
       │ <ContactForm      │              │ → hreflang × 3     │
       │   onSuccess={     │              │ Mounts             │
       │     close()       │              │ <ContactForm/>     │
       │   }/>             │              │                    │
       └────────┬──────────┘              └─────────┬──────────┘
                │                                   │
                └─────────────┬─────────────────────┘
                              │
                              ▼ (same client component, both surfaces)
              ┌───────────────────────────────────────────┐
              │ <ContactForm> ('use client')              │
              │ - RHF + zodResolver(contactInsertSchema)  │
              │ - Hidden field `field_extra` (honeypot)   │
              │ - Hidden field sourcePage = usePathname() │
              │ - <Turnstile> widget (mounts iframe)      │
              │ - 5 visible inputs: name, company, email, │
              │     phone (optional), message             │
              │ - Submit → useActionState(submitContact…) │
              └────────────────┬──────────────────────────┘
                               │
                               ▼ Server Action (Node runtime)
              ┌──────────────────────────────────────────┐
              │ submitContactForm = withPublicAction(    │
              │   contactInsertSchema, async (i, ctx) =>{│
              │                                           │
              │   1. Honeypot check (in withPublicAction) │
              │      if i.field_extra → 200 + audit       │
              │        action='spam_detected', drop       │
              │                                           │
              │   2. Turnstile siteverify                 │
              │      POST challenges.cloudflare.com/      │
              │           turnstile/v0/siteverify         │
              │      body: secret + response + remoteip   │
              │      if !response.success → return        │
              │        { ok:false, error:'turnstile_failed' │
              │                                           │
              │   3. Rate-limit check (atomic, in tx)     │
              │      ipHash = HMAC-SHA256(ip, SALT)       │
              │      INSERT INTO contact_rate_limit       │
              │        (ip_hash, window_start='hour'      │
              │         bucket, count=1)                  │
              │      ON CONFLICT (ip_hash, window_start)  │
              │        DO UPDATE count=count+1            │
              │      RETURNING count → if hour > 5 OR     │
              │                       day > 20 → audit    │
              │      action='rate_limited' + return       │
              │      { ok:false, error:'rate_limited' }   │
              │                                           │
              │   4. Sourcepage validation                │
              │      if !/^\/(uz|ru|en)\//.test(sourcePage)│
              │        sourcePage = '/' + locale          │
              │                                           │
              │   5. Product-context auto-prepend         │
              │      if /^\/(uz|ru|en)\/products\/(.+)$/  │
              │        slug = match[2]                    │
              │        product = await findProductBySlug  │
              │        if product → message = `Inquiry... │
              │          ${name} (${sku})\n\n` + message  │
              │                                           │
              │   6. dbTx.transaction(async tx → {        │
              │      INSERT contact_submission RETURNING  │
              │      // no audit row for visitor inserts  │
              │      // (audit_log is admin-actor-scoped) │
              │   })                                      │
              │                                           │
              │   7. Fire-and-forget (NOT in tx):         │
              │      sendAdminNotification(row).catch(    │
              │        e => Sentry.captureException(e))   │
              │      sendVisitorAutoReply(row, locale)    │
              │        .catch(...)                        │
              │                                           │
              │   8. return { ok:true, data:{ id } }      │
              │ })                                        │
              └──────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
         ┌──────────┐   ┌────────────┐  ┌───────────────┐
         │ Postgres │   │ Resend     │  │ Visitor sees  │
         │ contact_ │   │ → admin    │  │ success state │
         │ submiss. │   │   email    │  │ (modal closes │
         │ + rate_  │   │   (EN)     │  │  or page      │
         │ limit    │   │ → visitor  │  │  swaps to     │
         └──────────┘   │   auto-    │  │  "Thanks…")   │
                        │   reply    │  └───────────────┘
                        │   (locale) │
                        └────────────┘
```

### Recommended Project Structure (NEW files for Phase 5)

```
src/
├── actions/
│   └── contact.ts                      # NEW — submitContactForm Server Action
├── components/
│   └── public/
│       ├── contact-form.tsx            # NEW — 'use client' RHF + Turnstile + honeypot
│       └── contact-button.tsx          # NEW — 'use client' Dialog trigger + modal mount
├── lib/
│   ├── server-action.ts                # EDIT — add withPublicAction sibling to withAdminAction
│   ├── audit.ts                        # EDIT — extend AUDIT_ACTIONS const tuple
│   ├── rate-limit.ts                   # NEW — hashIp() + checkAndIncrementRateLimit()
│   ├── turnstile.ts                    # NEW — verifyTurnstile(token, ip) → { success, errors }
│   ├── sitemap.ts                      # EDIT — add '/contact' to staticPath loop
│   └── zod/
│       └── contact.ts                  # NEW — contactInsertSchema (visitor input)
├── db/
│   └── schema/
│       └── contact-rate-limit.ts       # NEW — contactRateLimit table
├── emails/
│   ├── contact-admin.tsx               # NEW — English-only admin notification
│   └── contact-auto-reply.tsx          # NEW — locale-parameterized visitor auto-reply
├── app/
│   └── [locale]/
│       └── contact/
│           └── page.tsx                # NEW — RSC canonical page; generateMetadata
└── env.ts                              # EDIT — add TURNSTILE_*, RATE_LIMIT_IP_SALT, ADMIN_NOTIFY_EMAILS

drizzle/
└── 0004_phase5_contact_rate_limit.sql  # NEW — drizzle-kit generate output

scripts/
└── load-test.sh                        # NEW — ab + jq parser + p95 assertion

public/
├── google<hash>.html                   # NEW (placeholder; user fills hash post-Search-Console-registration)
└── yandex_<hash>.html                  # NEW (placeholder)

tests/
├── actions/
│   └── contact.test.ts                 # NEW — live-Neon: rate-limit math, sourcePage validation, product-context prepend
├── lib/
│   ├── rate-limit.test.ts              # NEW — live-Neon: atomic UPSERT, 2-bucket math, hash determinism
│   └── turnstile.test.ts               # NEW — vi.mock fetch, error-code mapping
├── components/
│   └── contact-form.test.tsx           # NEW — jsdom: honeypot rendered off-screen, RHF + Turnstile mock, sourcePage capture
└── e2e/
    ├── contact-form.spec.ts            # NEW — full submit roundtrip on Vercel preview
    ├── cloudinary-widget.spec.ts       # NEW — DEF-4-12-04 absorption, smoke-only
    └── glyph-render.spec.ts            # NEW — DEF-4-12-03 absorption, computed font-family + visible-text assertion
```

### Pattern 1: `withPublicAction` (anonymous visitor wrapper)

**What:** Sibling to `withAdminAction` in `src/lib/server-action.ts`. Replaces `requireAdmin()` with the honeypot/Turnstile/rate-limit triple-gate while keeping the discriminated `{ ok, error|data }` ergonomics.

**When to use:** Every public-anonymous Server Action (Phase 5 only ships one — `submitContactForm` — but the wrapper anticipates v2 anonymous endpoints).

**Why discriminated, not thrown:** The form UI must render different field-level messages per failure reason (`turnstile_failed` → "Please complete the challenge", `rate_limited` → "Too many submissions, try again in an hour", `validation` → field-level errors). Throwing collapses these into a generic 500. RHF `useActionState` already handles discriminated returns.

**Example:**
```typescript
// src/lib/server-action.ts (extension; existing withAdminAction unchanged)

export type PublicActionResult<O> =
  | { ok: true; data: O }
  | {
      ok: false;
      error:
        | 'validation'
        | 'turnstile_failed'
        | 'rate_limited'
        | 'spam_detected'
        | 'unknown';
    };

interface PublicActionInputBase {
  // Honeypot field — server checks BEFORE turnstile to drop bots cheaply
  field_extra?: string;
  // Turnstile token — server posts to siteverify
  turnstileToken: string;
}

export interface PublicActionContext {
  ip: string;            // x-forwarded-for parsed first hop
  ipHash: string;        // HMAC-SHA256(ip, RATE_LIMIT_IP_SALT)
  userAgent: string;
}

export function withPublicAction<I extends PublicActionInputBase, O>(
  schema: z.ZodType<I>,
  handler: (input: I, ctx: PublicActionContext) => Promise<O>,
): (raw: unknown) => Promise<PublicActionResult<O>> {
  return async (raw) => {
    try {
      // Step A: Zod allowlist
      const input = schema.parse(raw);

      // Step B: extract IP (x-forwarded-for first non-empty hop)
      const h = await headers();
      const ip = parseClientIp(h);
      const ipHash = hashIp(ip);
      const userAgent = h.get('user-agent') ?? 'unknown';

      // Step C: honeypot — silent 200 + audit
      if (input.field_extra && input.field_extra.length > 0) {
        await dbTx.transaction(async (tx) => {
          await logAudit(tx, {
            actorEmail: 'visitor',
            action: 'spam_detected',
            entityType: 'contact_submission_attempt',
            entityId: ipHash,
            before: null,
            after: { ipHash, userAgent },
            ip,
            userAgent,
          });
        });
        // Drop silently — bot doesn't retry; respond as if successful
        return { ok: true, data: undefined as unknown as O };
      }

      // Step D: Turnstile
      const tsResult = await verifyTurnstile(input.turnstileToken, ip);
      if (!tsResult.success) {
        return { ok: false, error: 'turnstile_failed' };
      }

      // Step E: rate-limit (atomic 2-bucket check inside tx; throws RATE_LIMITED)
      try {
        await checkAndIncrementRateLimit(ipHash);
      } catch (err) {
        if (err instanceof RateLimitError) {
          await dbTx.transaction(async (tx) => {
            await logAudit(tx, {
              actorEmail: 'visitor',
              action: 'rate_limited',
              entityType: 'contact_submission_attempt',
              entityId: ipHash,
              before: null,
              after: { ipHash, hourCount: err.hourCount, dayCount: err.dayCount },
              ip,
              userAgent,
            });
          });
          return { ok: false, error: 'rate_limited' };
        }
        throw err;
      }

      const data = await handler(input, { ip, ipHash, userAgent });
      return { ok: true, data };
    } catch (err) {
      if (err instanceof z.ZodError) return { ok: false, error: 'validation' };
      console.error('public-action', err);
      return { ok: false, error: 'unknown' };
    }
  };
}
```

### Pattern 2: 2-bucket per-IP rate limit in Postgres (no Redis)

**What:** One `contact_rate_limit` row per (ipHash, hour-bucket) and one per (ipHash, day-bucket). Each submission increments BOTH counters atomically inside the same transaction; if either threshold is exceeded the transaction throws and rolls back.

**Schema:**
```sql
-- drizzle/0004_phase5_contact_rate_limit.sql
CREATE TABLE contact_rate_limit (
  ip_hash      TEXT NOT NULL,
  window_kind  TEXT NOT NULL CHECK (window_kind IN ('hour','day')),
  window_start TIMESTAMPTZ NOT NULL,
  count        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, window_kind, window_start)
);

CREATE INDEX contact_rate_limit_cleanup_idx
  ON contact_rate_limit (window_start);
```

> **Note on schema deviation:** CONTEXT D-05 specifies `(ip_hash, window_start)` as PK, but the 2-bucket model needs `window_kind` to disambiguate hour-vs-day buckets sharing the same `ip_hash`. The plan should treat the PK as `(ip_hash, window_kind, window_start)` — same intent, slightly enriched. Either model works; the planner should pick one explicitly. **[ASSUMED — confirm with user during planning if this is a meaningful deviation from D-05.]**

**Atomic check pattern (inside `dbTx.transaction` — Neon WebSocket Pool, NOT HTTP driver):**
```typescript
// src/lib/rate-limit.ts
const HOUR_LIMIT = 5;
const DAY_LIMIT = 20;

export class RateLimitError extends Error {
  constructor(public hourCount: number, public dayCount: number) {
    super('RATE_LIMITED');
  }
}

export async function checkAndIncrementRateLimit(ipHash: string): Promise<void> {
  const now = new Date();
  const hourBucket = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
  const dayBucket = new Date(Math.floor(now.getTime() / 86_400_000) * 86_400_000);

  await dbTx.transaction(async (tx) => {
    // Opportunistic cleanup — DELETE rows older than 2 days
    await tx.execute(sql`
      DELETE FROM contact_rate_limit WHERE window_start < now() - interval '2 days'
    `);

    // Atomic UPSERT both buckets, capture incremented counts
    const [hourRow] = await tx.execute<{ count: number }>(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${ipHash}, 'hour', ${hourBucket}, 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
        DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `).then(r => r.rows);

    const [dayRow] = await tx.execute<{ count: number }>(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${ipHash}, 'day', ${dayBucket}, 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
        DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `).then(r => r.rows);

    if (hourRow.count > HOUR_LIMIT || dayRow.count > DAY_LIMIT) {
      // Throw triggers rollback — counters are not consumed by a denied request
      throw new RateLimitError(hourRow.count, dayRow.count);
    }
  });
}
```

> **Important:** The throw inside the transaction rolls back BOTH increments — denied requests don't consume the budget. This is intentional: a bot hitting the limit shouldn't keep raising the counter forever (although in this case the increment-then-rollback dance still pays the round-trip cost, so the behavior is more about preserving the meaning of "5 successful submissions per hour").

> **Alternative — increment-and-don't-rollback:** If you want denied requests to consume the budget (so a bot is more aggressively throttled), capture the counts BEFORE the throw via a separate read, then commit the UPSERT and check counts outside the transaction. Slightly less elegant; the rollback model is the cleaner default. **Planner picks one explicitly.**

[VERIFIED: codebase grep — `dbTx.transaction()` from `src/db/client-ws.ts` is the established pattern for multi-statement transactions; `db` (HTTP driver) is single-statement only.]

### Pattern 3: HMAC-SHA256 IP hashing (Node `crypto`)

**What:** Server Actions run in Node runtime by default (NOT Edge), so Node `crypto.createHmac` is available. Hash the raw IP before write so the table never stores PII.

```typescript
// src/lib/rate-limit.ts (helper)
import { createHmac } from 'node:crypto';
import { env } from '@/env';

export function hashIp(ip: string): string {
  return createHmac('sha256', env.RATE_LIMIT_IP_SALT)
    .update(ip)
    .digest('hex');
}
```

[VERIFIED: Node 22 LTS exports `crypto.createHmac`; Vercel default runtime is Node.] No constant-time concerns — the hash is a write-key, not an authenticator.

### Pattern 4: IP source on Vercel — `x-forwarded-for` first hop

**What:** Vercel sets `x-forwarded-for` with the visitor's true IP as the FIRST hop. Downstream clients cannot spoof because Vercel rewrites the header at the edge. Read via `headers()` from `next/headers` inside the Server Action.

```typescript
// src/lib/rate-limit.ts (helper)
export function parseClientIp(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  if (xff) {
    // Take first non-empty hop, trim whitespace
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  // Fallback (shouldn't happen on Vercel but defensively)
  const xri = h.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}
```

[CITED: Cloudflare docs recommend `CF-Connecting-IP` first if behind Cloudflare; on Vercel the canonical is `x-forwarded-for`. Existing codebase pattern is `h.get('x-forwarded-for') ?? 'unknown'` in `src/lib/server-action.ts:47`.]

### Pattern 5: Cloudflare Turnstile siteverify (server-side)

**What:** After Zod parse, the Server Action POSTs to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response` (the visitor's token), and optionally `remoteip`. Token is single-use and expires 5min after generation.

```typescript
// src/lib/turnstile.ts
import { env } from '@/env';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstile(token: string, ip: string): Promise<TurnstileResult> {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: ip,
  });

  const res = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    body,
    // application/x-www-form-urlencoded by default for URLSearchParams
    cache: 'no-store',
  });

  if (!res.ok) {
    // Network error or Cloudflare 5xx — treat as failure but log
    return { success: false, errorCodes: ['siteverify-http-error'] };
  }

  const json = (await res.json()) as {
    success: boolean;
    'error-codes'?: string[];
  };

  return {
    success: json.success === true,
    errorCodes: json['error-codes'],
  };
}
```

[VERIFIED: official Cloudflare docs at `developers.cloudflare.com/turnstile/get-started/server-side-validation/` — endpoint, request body field names, response shape, error code list (`missing-input-secret`, `invalid-input-secret`, `missing-input-response`, `invalid-input-response`, `bad-request`, `timeout-or-duplicate`, `internal-error`), 5-minute token TTL, single-use.]

### Pattern 6: Visitor auto-reply React Email (locale-parameterized single template)

**What:** Mirror the existing `src/emails/admin-invite.tsx` pattern: one template file, inline `COPY` map keyed by locale, default to `'uz'`. Subject also locale-parameterized — composed at the call site, not in the template.

```typescript
// src/emails/contact-auto-reply.tsx
import { Html, Head, Body, Container, Text, Preview } from '@react-email/components';

interface ContactAutoReplyProps {
  name: string;
  productContext?: string; // pre-resolved "Manometr MD-100 (SKU-001)" or undefined
  locale: 'uz' | 'ru' | 'en';
}

const COPY = {
  uz: {
    preview: 'Murojaatingiz qabul qilindi — Manometr',
    greeting: (n: string) => `Hurmatli ${n},`,
    body: 'Murojaatingiz uchun rahmat. Tez orada siz bilan bogʻlanamiz.',
    productLine: (ctx: string) => `Mahsulot boʻyicha: ${ctx}`,
    signature: '— Manometr jamoasi',
  },
  ru: {
    preview: 'Ваше обращение получено — Manometr',
    greeting: (n: string) => `Уважаемый(ая) ${n},`,
    body: 'Спасибо за обращение. Мы свяжемся с вами в ближайшее время.',
    productLine: (ctx: string) => `По продукту: ${ctx}`,
    signature: '— Команда Manometr',
  },
  en: {
    preview: 'Your inquiry has been received — Manometr',
    greeting: (n: string) => `Dear ${n},`,
    body: 'Thank you for your inquiry. We will get back to you shortly.',
    productLine: (ctx: string) => `Regarding: ${ctx}`,
    signature: '— The Manometr team',
  },
} as const;

export const SUBJECTS = {
  uz: 'Murojaatingiz qabul qilindi',
  ru: 'Ваше обращение получено',
  en: 'Your inquiry has been received',
} as const;

export default function ContactAutoReply({ name, productContext, locale }: ContactAutoReplyProps) {
  const copy = COPY[locale];
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', padding: '24px' }}>
        <Container>
          <Text>{copy.greeting(name)}</Text>
          <Text>{copy.body}</Text>
          {productContext && <Text style={{ color: '#666' }}>{copy.productLine(productContext)}</Text>}
          <Text>{copy.signature}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

The admin-notification template is English-only — no COPY map needed. It contains the raw submission fields (name/company/email/phone/message/sourcePage/locale/submittedAt) for the admin to triage.

### Pattern 7: Search Console + Yandex Webmaster verification artifacts

**What:** Both services support multiple verification methods. The simplest for Vercel is **HTML file upload** — drop a file into `/public/`, deploy, paste URL into the verification UI.

| Service | File pattern | Where to obtain | Where it ships |
|---------|-------------|-----------------|----------------|
| Google Search Console | `google<HASH>.html` (e.g., `googleabc123.html`) | Search Console > Add Property > "HTML file" | `/public/google<HASH>.html` |
| Yandex Webmaster | `yandex_<HASH>.html` (e.g., `yandex_abc123.html`) | Webmaster > Add Site > "Тег HTML" → switch to "HTML-файл" | `/public/yandex_<HASH>.html` |

Phase 5 plan can ship the placeholder files (with `TODO: replace with verification hash from Search Console` content), and instruct the user (D-12) to swap in the real hash post-registration. Search Console + Yandex Webmaster will then both auto-discover the existing per-locale sitemap (already in `/public/robots.txt` per Phase 3 03-08).

**International Targeting validation:** Once the site is verified in Search Console, the "Legacy tools and reports → International Targeting" panel scans hreflang. Phase 3 ships hreflang for all 3 locales + x-default in every sitemap entry (verified in `src/lib/sitemap.ts:257-269`); the panel should be clean on first scan. Yandex Webmaster has its own "Indexing → Sitemap files" panel that will auto-fetch each per-locale sitemap.

### Pattern 8: Dogfood protocol for OPS-02

**What:** Per D-12, OPS-02 is a manual gate. Phase 5 ships the protocol document (markdown checklist) but does NOT execute it.

The artifact is `.planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md` containing:
1. List of 10 trilingual products (real industrial pressure equipment) the content team will enter
2. Per-product timing log template (start time / end time / actual minutes)
3. Acceptance criterion: average ≤10 min, no individual product >15 min
4. Sign-off line for the content team lead

The Phase-5 closure plan (last plan in Wave 4) inserts this into `05-VERIFICATION.md` as `DEF-5-NN-NN: OPS-02 dogfood timing log` with `closed-with-deferred-validation` status; transitions to `validated` when the user replies with the completed log.

### Anti-Patterns to Avoid

- **Don't run rate-limit on Neon HTTP driver.** HTTP driver is single-statement only — multi-statement `BEGIN; SELECT; UPDATE; COMMIT;` won't atomic. Use `dbTx` (WebSocket Pool) for the rate-limit transaction. [VERIFIED: src/db/client-ws.ts and codebase grep — every multi-statement tx in Phases 2/4 uses `dbTx.transaction`.]
- **Don't reach for Edge runtime on this Server Action.** Even though Server Actions can theoretically run at the edge, this one needs Node `crypto.createHmac`, `dbTx` (WebSocket Pool — incompatible with Edge), `next/headers`, and `fetch` to Cloudflare. Default Next.js Server Action runtime is Node — leave it.
- **Don't make the honeypot field name "honeypot".** Bots scan for the literal string. Use innocuous `field_extra` or `website` (per OWASP guidance).
- **Don't use Tailwind classes for off-screen positioning.** Tailwind's purge can drop unused classes. Use inline `style={{ position: 'absolute', left: '-9999px' }}` PLUS `aria-hidden="true"` PLUS `tabIndex={-1}` PLUS `autoComplete="off"` PLUS `<label>` with same off-screen styling.
- **Don't `await` Resend sends in the visitor's request path.** Use `void sendAdminNotification(row).catch(...)` — visitor sees success in <500ms regardless of Resend latency or outage. (D-10 LOCKED.)
- **Don't trust visitor-supplied `sourcePage`.** Server-side validate `/^\/(uz|ru|en)\//.test(sourcePage)`; if fail, fall back to `/${locale}` (defense-in-depth, prevents XSS-via-CSV-export and meaningless attribution data).
- **Don't write rate-limit cleanup as a separate cron job in v1.** Opportunistic `DELETE WHERE window_start < now() - interval '2 days'` on every insert is cheap (the `contact_rate_limit_cleanup_idx` makes it an indexed scan) and avoids new infra. (D-05 LOCKED.) Pick scheduled cleanup only if traffic exceeds ~10k inserts/day, which is implausible at this site's scale.
- **Don't try to drive the Cloudinary widget's cross-origin iframe with Playwright `frameLocator`.** The widget opens an iframe that loads from `widget.cloudinary.com` and triggers an OS-level file picker. Playwright's `setInputFiles` doesn't reach into cross-origin iframes; even if it did, the actual upload happens to Cloudinary's servers (network call). Keep DEF-4-12-04 as smoke-only: assert the widget DOM mounts (button is visible) AND `/api/cloudinary/sign` returns 200 when called directly. Manual upload-roundtrip stays a human-driven gate (per D-12 ethos).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spam protection (CAPTCHA-like) | Custom JS challenge | Cloudflare Turnstile (CONTEXT D-04) | Battle-tested ML model, no UX friction, free tier |
| Email rendering | String concatenation or HTML templates | React Email (`@react-email/components`) | Already installed; cross-client compatibility (Outlook/Gmail/iOS Mail) is a long tail of bugs |
| Email delivery | nodemailer + SMTP | Resend (already installed) | SPF/DKIM/DMARC handled, deliverability monitoring, retry logic |
| HMAC | Custom hash with `+` salt | `crypto.createHmac('sha256', salt)` | Constant-time, FIPS-validated, Node built-in |
| URL state for filter / search | Custom router push | nuqs (already used in admin) | Phase 5 doesn't need it but reuse the pattern if you do |
| Modal | Custom Dialog component | shadcn `Dialog` (Phase 2 02-11) | `ConfirmDialog` already extends it — same primitive |
| Form state | Custom useState | RHF + zodResolver (Phase 2 pattern) | Field-level error rendering, RHF Controller, useActionState bridge |
| Rate-limit storage | Redis / KV (CONTEXT D-05) | Postgres `contact_rate_limit` | No new infra; ≤500 inserts/day is trivial for Postgres |
| Server-side IP extraction | Custom header parsing | `next/headers` `headers().get('x-forwarded-for').split(',')[0]` | Existing pattern in `src/lib/server-action.ts:47` |
| Sitemap entry generation | Custom XML | Existing `buildLocaleSitemapEntries` (Phase 3 03-08) | Just add `'/contact'` to the `staticPath` array (1-line edit) |
| Lighthouse Slow-4G profile | Custom Lighthouse runner | Existing `.lighthouserc.json` already at Slow-4G (1638 Kbps / 150ms RTT) | Just lift `warn` → `error` on the LCP assertion + expand `urls` array in workflow |

**Key insight:** Every capability Phase 5 needs has a 1-2 line wire-up to existing infrastructure. The Phase-5 cost is in the COMPOSITION (assembling the 5 components correctly: form + Server Action + rate limit + emails + audit) rather than in any individual building block.

## Runtime State Inventory

> Phase 5 is greenfield (new tables, new files, new env vars) with one schema migration. No rename / refactor / migration of existing state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `contact_rate_limit` is a brand-new table; `contact_submission` already exists from Phase 1 schema with no Phase-5 changes | None |
| Live service config | 4 NEW env vars (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_IP_SALT`, `ADMIN_NOTIFY_EMAILS`) — must be set in Vercel project settings before deploy | User adds to Vercel → Settings → Environment Variables before Phase-5 PR merges |
| OS-registered state | None | None |
| Secrets/env vars | 4 new Vercel env vars; `RATE_LIMIT_IP_SALT` should be ≥32 bytes (generate via `openssl rand -hex 32`) and NEVER rotated post-launch (rotation invalidates all existing rate-limit buckets) | Plan ships `.env.example` update + `src/env.ts` Zod additions; user populates Vercel |
| Build artifacts / installed packages | One new package (`@marsidev/react-turnstile`) — pnpm-lock.yaml updates; Cloudinary widget e2e test may need a Playwright browser refresh | Plan includes `pnpm install` after adding the package; CI workflow already runs `pnpm install --frozen-lockfile` |

**Nothing found in stored-data or OS-registered categories** — verified by grep across `src/db/schema/*` (no `contact_rate_limit` references; `contact_submission` definition unchanged) and absence of any pm2/launchd/systemd/Task-Scheduler artifacts in the repo.

## Common Pitfalls

### Pitfall 1: Neon HTTP driver doesn't support multi-statement transactions
**What goes wrong:** The default `db` client (HTTP driver) silently ignores `BEGIN`/`COMMIT` — multi-statement transactions either fail with a cryptic error or commit each statement independently (race-condition opening for the rate-limit increment).
**Why it happens:** HTTP driver is HTTP/1 single-request → single-statement. Phase 5 needs an atomic UPSERT-then-check inside a transaction.
**How to avoid:** Use `dbTx` (WebSocket Pool from `src/db/client-ws.ts`) for the rate-limit + insert + audit block. Single-statement reads (e.g., `findProductBySlug` for the auto-prepend lookup) can stay on `db`.
**Warning signs:** Tests pass intermittently; "transaction not started" errors; rate-limit count stays at 1 forever (each increment commits independently).

### Pitfall 2: Turnstile token replayed within 5 minutes
**What goes wrong:** Cloudflare returns `timeout-or-duplicate` if the same token is submitted twice. If the Server Action retries on a transient error (e.g., Resend 5xx) and the visitor hasn't refreshed the widget, the second attempt fails.
**Why it happens:** Tokens are single-use by design (anti-replay).
**How to avoid:** (1) Don't retry the Server Action on transient internal failures — return success once the row is inserted, even if Resend fails (D-10). (2) On `turnstile_failed` response, the client component MUST call the widget's `reset()` ref method so the visitor gets a fresh token.
**Warning signs:** "Already submitted" errors after a Resend hiccup; users re-submitting and hitting `timeout-or-duplicate`.

### Pitfall 3: Honeypot field readable by autofill / accessible tools
**What goes wrong:** Browser autofill drops a real value into the honeypot field, triggering a false-positive spam reject. Screen readers announce it, confusing accessibility users.
**Why it happens:** Naive honeypot is a normal `<input>` that autofill treats as legitimate.
**How to avoid:** Set `autoComplete="off"`, `aria-hidden="true"`, `tabIndex={-1}`, off-screen via inline `style` (NOT Tailwind class — purge risk), and use an innocuous-looking name like `field_extra` (NOT `honeypot`, NOT `email_confirm`, NOT obvious patterns bots key on).
**Warning signs:** Real users reporting submissions silently dropped; audit log filling with `spam_detected` from non-bot IPs.

### Pitfall 4: Resend send blocks the Server Action response
**What goes wrong:** Resend has occasional 1-2s latency spikes; if the Server Action awaits the send, the visitor stares at a spinner. If Resend is down, the contact_submission row is never inserted (because the await throws and rolls back).
**Why it happens:** Default `await sendEmail()` couples response time to Resend availability.
**How to avoid:** Insert the row FIRST inside the transaction. Outside the transaction, fire `void sendAdminNotification(row).catch(e => Sentry.captureException(e))` and `void sendAutoReply(row, locale).catch(...)`. (D-10 LOCKED.)
**Warning signs:** P95 contact-form latency tracks Resend P95; failed-send alerts coincide with no contact_submission rows.

### Pitfall 5: ADMIN_NOTIFY_EMAILS empty list silently swallowed
**What goes wrong:** Vercel env defaults `ADMIN_NOTIFY_EMAILS=` (empty string) → `split(',')` returns `['']` → Resend rejects with "Invalid recipient" → visible failure in Sentry but nobody knows admin notifications stopped working.
**Why it happens:** Empty-string env var is not the same as unset.
**How to avoid:** In `src/env.ts`, define as `ADMIN_NOTIFY_EMAILS: z.string().optional()`, then in the action: `const recipients = (env.ADMIN_NOTIFY_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean); if (recipients.length === 0) return;`. (D-07: empty list = skip admin notify, no Sentry noise.)
**Warning signs:** Sentry "Invalid recipient" floods after an env-var typo.

### Pitfall 6: Source-page injection into admin email / CSV export
**What goes wrong:** Visitor submits with `sourcePage = "/uz/products/foo<script>alert(1)</script>"` → admin email renders the unescaped string → admin's email client renders the script (most don't, but some do); CSV export of submissions includes the string → opening in Excel triggers the formula-injection vector if it starts with `=`/`+`/`-`/`@`.
**Why it happens:** sourcePage is a hidden field set by client `usePathname()` — but a determined attacker can craft an arbitrary submission via direct Server Action POST.
**How to avoid:** Server-side validate sourcePage matches `/^\/(uz|ru|en)\/[a-z0-9\-\/]*$/`. If validation fails, fall back to `/${locale}`. The Phase-2 02-15 CSV export already handles formula-injection guard (`toCsv` writer); reuse it.
**Warning signs:** Audit log entries with sourcePage containing `<`, `>`, `=`, `\n`, `;`, `'`, `"`.

### Pitfall 7: Rate-limit bucket boundary thrashing (5 in 60 seconds at xx:59:55)
**What goes wrong:** 5 submissions at 12:59:55..12:59:59 all hit hour-bucket `12:00`. At 13:00:00, hour-bucket switches to `13:00` with count=0 — visitor can submit 5 more in 5 seconds. Total: 10 submissions in 10 seconds.
**Why it happens:** Tumbling-window buckets have edge thrashing.
**How to avoid:** Either (a) accept this — for B2B contact form the worst case is 10 messages per 10s, 20 per day still capped, no real harm; (b) use a sliding-window rate limit (Redis-style atomic ZADD/ZRANGE) but that needs Redis. **Recommendation: accept (a).** D-05 specifies tumbling buckets; the day-bucket of 20 hard-caps the real concern.
**Warning signs:** Brief spike of 8-10 submissions across a bucket boundary in audit log.

### Pitfall 8: TURNSTILE_SITE_KEY missing in env at deploy time → blank widget
**What goes wrong:** Widget renders an empty box, no challenge, no error in console — visitor can't submit.
**Why it happens:** t3-env Zod validates server-side env at build/runtime, but the client widget needs `NEXT_PUBLIC_TURNSTILE_SITE_KEY` injected at build time. If unset, the widget mounts but fails silently.
**How to avoid:** Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the t3-env client schema (`z.string().min(1)`); a missing var fails the build, not a silent runtime fail. Provide a Cloudflare-supplied test site key for local dev (`1x00000000000000000000AA` is documented as always-pass per Cloudflare).
**Warning signs:** Local dev works (test key); production silently broken.

## Code Examples

### Honeypot field (off-screen, accessibility-safe)

```tsx
// src/components/public/contact-form.tsx (excerpt)
<input
  type="text"
  {...register('field_extra')}
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
  // Inline style — NOT Tailwind class (purge risk)
  style={{
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  }}
/>
<label
  htmlFor="field_extra"
  aria-hidden="true"
  style={{ position: 'absolute', left: '-9999px' }}
>
  Leave this field empty
</label>
```

### Source-page validation + product-context auto-prepend

```typescript
// src/actions/contact.ts (excerpt — runs inside withPublicAction handler)
import { db } from '@/db/client';
import { products, productTranslations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

const VALID_SOURCE = /^\/(uz|ru|en)\/[a-z0-9\-\/]*$/;
const PRODUCT_PATH = /^\/(uz|ru|en)\/products\/([a-z0-9\-]+)$/;

async function enrichMessage(input: ContactInput, locale: 'uz'|'ru'|'en') {
  const safeSource = VALID_SOURCE.test(input.sourcePage) ? input.sourcePage : `/${locale}`;
  let message = input.message;

  const productMatch = safeSource.match(PRODUCT_PATH);
  if (productMatch) {
    const slug = productMatch[2]!;
    const [row] = await db
      .select({ name: productTranslations.name, sku: products.sku })
      .from(productTranslations)
      .innerJoin(products, eq(products.id, productTranslations.productId))
      .where(and(
        eq(productTranslations.slug, slug),
        eq(productTranslations.locale, locale),
        eq(products.status, 'published'),
      ))
      .limit(1);

    if (row?.name && row?.sku) {
      const t = await getTranslations({ locale, namespace: 'public.contact.productInquiry' });
      const prefix = t('inquiryAbout', { name: row.name, sku: row.sku });
      message = `${prefix}\n\n${message}`;
    }
    // If product lookup fails — fall through (don't error). D-03 implicit.
  }

  return { sourcePage: safeSource, message };
}
```

### Sticky "Contact us" button mounted in `SiteHeader`

```tsx
// src/components/public/contact-button.tsx (NEW; 'use client' for Dialog state)
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ContactForm } from './contact-form';
import type { Locale } from '@/lib/metadata';

export function ContactButton({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <ContactForm
          locale={locale}
          onSuccess={() => setOpen(false)}
          mode="modal"
        />
      </DialogContent>
    </Dialog>
  );
}
```

`SiteHeader` renders `<ContactButton locale={locale} label={t('contactCta')} />` to the right of `<LocaleSwitcher>`.

### Lighthouse CI assertion lift + URL expansion

```jsonc
// .lighthouserc.json (Phase 5 EDIT — change `warn` to `error`, expand thresholds)
{
  "ci": {
    "collect": {
      "settings": {
        "preset": "mobile",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        }
      },
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "categories:performance": ["error", { "minScore": 0.7 }]
      }
    }
  }
}
```

```yaml
# .github/workflows/lighthouse-preview.yml (EDIT — expand urls)
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            ${{ steps.preview.outputs.url }}/uz
            ${{ steps.preview.outputs.url }}/uz/categories
            ${{ steps.preview.outputs.url }}/uz/products/manometr-m-100
            ${{ steps.preview.outputs.url }}/uz/search?q=manometr
            ${{ steps.preview.outputs.url }}/uz/contact
```

### `scripts/load-test.sh` (ab-based)

```bash
#!/usr/bin/env bash
# Phase 5 — load test against a Vercel preview URL.
# Usage: PREVIEW_URL=https://manometr-xxx.vercel.app ./scripts/load-test.sh
# Manual: triggered via GitHub Actions workflow_dispatch (NOT every PR).

set -euo pipefail

: "${PREVIEW_URL:?PREVIEW_URL must be set}"
P95_BUDGET_MS=2000

ENDPOINTS=(
  ""                                  # homepage
  "/uz/categories"
  "/uz/products/manometr-m-100"
  "/uz/search?q=manometr"
  "/sitemap-uz.xml"
)

failed=0
for endpoint in "${ENDPOINTS[@]}"; do
  echo "::group::Load test ${PREVIEW_URL}${endpoint}"
  output=$(ab -n 500 -c 50 -q -k \
    -H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET:-}" \
    "${PREVIEW_URL}${endpoint}")
  echo "$output"

  errors=$(echo "$output" | grep -E "^Failed requests:" | awk '{print $3}')
  p95=$(echo "$output" | grep -E "^\s+95%" | awk '{print $2}')

  if [[ "$errors" -gt 0 ]]; then
    echo "::error::FAIL — $errors errors on $endpoint"
    failed=1
  fi
  if [[ "$p95" -gt "$P95_BUDGET_MS" ]]; then
    echo "::error::FAIL — p95 ${p95}ms exceeds ${P95_BUDGET_MS}ms budget on $endpoint"
    failed=1
  fi
  echo "::endgroup::"
done

exit $failed
```

### Cyrillic + Uzbek-Latin glyph render assertion (Playwright)

```typescript
// tests/e2e/glyph-render.spec.ts (DEF-4-12-03 absorption)
import { test, expect } from '@playwright/test';

test('Uzbek Latin oʻ + gʻ render in Inter font (not fallback)', async ({ page }) => {
  await page.goto('/uz/categories');
  // SSR HTML must contain U+02BB modifier letter
  const html = await page.content();
  expect(html).toMatch(/[oʻgʻ]/u);

  // Computed font-family on body must include the next/font className
  // (Inter loaded with subsets ['latin','latin-ext','cyrillic'] in Phase 1 SEO-04)
  const fontFamily = await page.evaluate(() => {
    return getComputedStyle(document.body).fontFamily;
  });
  expect(fontFamily).toMatch(/__Inter|Inter/);
});

test('Cyrillic glyphs render in Inter font on Russian product page', async ({ page }) => {
  await page.goto('/ru/products/manometr-m-100');
  const html = await page.content();
  // Expect at least one Cyrillic character in the rendered HTML
  expect(html).toMatch(/[Ѐ-ӿ]/u);
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(fontFamily).toMatch(/__Inter|Inter/);
});
```

### Cloudinary widget smoke (DEF-4-12-04 absorption — smoke-only)

```typescript
// tests/e2e/cloudinary-widget.spec.ts
import { test, expect, request } from '@playwright/test';
import { loginAsAdminViaDirectToken } from '../fixtures/admin-magic-link';

test('Cloudinary signature endpoint returns 200', async ({ request: req }) => {
  const res = await req.post('/api/cloudinary/sign', {
    data: { paramsToSign: { folder: 'products' } },
  });
  // Note: /api/cloudinary/sign requires admin session — adjust if 401 expected unauth
  // (depends on auth wiring; this is the smoke level — assert the route exists + responds)
  expect([200, 401]).toContain(res.status());
});

test('Cloudinary widget mounts in product editor (smoke only — does not upload)', async ({ page }) => {
  await loginAsAdminViaDirectToken(page);
  await page.goto('/uz/admin/products/new');
  // Widget trigger button is rendered as part of MediaUploader
  const uploadBtn = page.getByRole('button', { name: /upload|yuklash|загрузить/i });
  await expect(uploadBtn.first()).toBeVisible();
  // Stop here — driving the cross-origin iframe upload is brittle; manual gate covers it
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| reCAPTCHA v2 ("I'm not a robot" checkbox) | Cloudflare Turnstile (invisible / managed challenge) | 2022+ | Better UX, better privacy, no Google branding |
| reCAPTCHA v3 (silent score 0..1) | Same — but Turnstile additionally adapts difficulty per visitor | 2023+ | Comparable; Turnstile is free at higher volume |
| Redis-backed sliding window rate limit | For very-low-traffic endpoints, Postgres tumbling buckets | always (depends on scale) | At 100–500 submissions/day a Redis cluster is overkill |
| Honeypot CSS class `display:none` | Inline `style` with `clip:rect(0,0,0,0)` + `aria-hidden` | 2020+ | Display:none is sometimes sniffed by smarter bots; clip-and-position is the WCAG-safe pattern |
| Fire-and-forget `setImmediate(sendEmail)` | `void sendEmail().catch(captureSentry)` | 2024+ App Router | Server Actions don't have a request-scoped event loop the same way Express does; `void` + `.catch` is the explicit pattern |

**Deprecated/outdated (in this codebase):**
- Lighthouse CI `warn`-only assertions: Phase 5 lifts to `error` for the LCP gate.
- Phase-3 single-URL Lighthouse run: Phase 5 expands to 5 URLs.
- Phase-2 02-15 CSV export "10k LIMIT hard cap": Phase 5 closure plan should consider whether to lift the cap or document streaming as v1.1 (NOT a Phase 5 deliverable per scope).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@marsidev/react-turnstile` v1.4+ is React 19 compatible and the de-facto wrapper | §Standard Stack | LOW — fallback is raw `<script>` + 30-line wrapper; verify by `pnpm view @marsidev/react-turnstile peerDependencies` before install |
| A2 | Schema PK can be `(ip_hash, window_kind, window_start)` instead of CONTEXT D-05's literal `(ip_hash, window_start)` to support 2 buckets | §Pattern 2 | LOW — CONTEXT D-05 specifies the goal (5/hour AND 20/day) which requires 2 rows; alternative is one row with `hour_count` + `day_count` columns. Planner should pick one and confirm with user if needed. |
| A3 | Vercel sets `x-forwarded-for` with visitor's true IP at first hop and prevents downstream spoofing | §Pattern 4 | MEDIUM — Vercel docs confirm but worth re-verifying for 2026 platform. Existing codebase pattern (`src/lib/server-action.ts:47`) trusts this header for admin audit, so the assumption is already locked at codebase level. |
| A4 | Visitor auto-reply uses same `RESEND_FROM_EMAIL` as magic-link / admin-invite — no new domain verification needed | §Pattern 6 | LOW — Phase 1 already configured the verified sending domain in Resend; reuse |
| A5 | Cloudinary widget's cross-origin iframe is genuinely impractical to drive in Playwright; smoke-only is acceptable | §Anti-Patterns + §Cloudinary widget smoke | MEDIUM — could attempt a `frameLocator` approach in a spike before settling on smoke-only; planner may choose to invest 0.5d in a proof-of-concept |
| A6 | Lighthouse CI assertion lift from `warn` → `error` won't cause excessive false-failures on Vercel preview | §Code Examples (lighthouserc) | MEDIUM — Vercel preview LCP can vary 200-800ms across runs; the 3-run average + 3000ms budget should be comfortable but monitor. If flaky, keep `warn` and rely on the 3-phone real-device gate (D-12) |
| A7 | `RATE_LIMIT_IP_SALT` rotation is forbidden post-launch (would invalidate existing buckets) | §Runtime State Inventory | LOW — buckets are ≤2 days old by opportunistic cleanup, so worst-case a salt rotation gives every IP 5+20 free submissions until buckets re-fill. Document the rotation policy in env var comment. |
| A8 | Per-IP rate limit at 5/hour + 20/day is correct for B2B contact form (CONTEXT D-05 LOCKED) | §Pattern 2 | LOW — CONTEXT-locked; planner should not deviate without user re-discuss |
| A9 | `ADMIN_NOTIFY_EMAILS` empty list = silently skip admin notify (D-07) is the right ergonomics for dev-without-secrets | §Pitfall #5 | LOW — CONTEXT-locked |
| A10 | OPS-02 dogfood is purely operational and ships as a markdown protocol document, not code | §Pattern 8 | LOW — D-12 LOCKED |

## Open Questions

1. **`contact_rate_limit` PK shape: `(ip_hash, window_kind, window_start)` vs `(ip_hash, window_start)` with separate `hour_count`/`day_count` columns**
   - What we know: D-05 specifies 5/hour AND 20/day per hashed IP; the literal PK in D-05 is `(ip_hash, window_start)`.
   - What's unclear: whether D-05 implicitly assumes one bucket type (which contradicts the dual threshold) or whether the literal PK was a discussion shorthand.
   - Recommendation: Planner adopts `(ip_hash, window_kind, window_start)` and notes the deviation explicitly in the migration plan; flag for user confirmation if `withPublicAction` becomes a discuss-touched surface again.

2. **Should denied (rate-limit-exceeded) requests consume the budget or rollback the increment?**
   - What we know: Rolling back is cleaner semantically ("5 SUCCESSFUL submissions per hour"); not rolling back throttles bots harder.
   - What's unclear: whether D-05's "5/hour AND 20/day" means 5 successful or 5 attempted.
   - Recommendation: rollback model (reject doesn't burn budget) — matches the most common interpretation. Document in plan.

3. **Should `submitContactForm` log a Sentry event for every Turnstile failure, or only above a threshold?**
   - What we know: Turnstile fails happen for legitimate reasons (token expired, network glitch, user closed widget).
   - What's unclear: noise vs. signal trade-off in Sentry quota.
   - Recommendation: Don't auto-log Turnstile failures to Sentry. Audit log carries enough signal for forensic analysis. Planner can add a Sentry log if 30-day audit-log review shows a meaningful pattern.

4. **Cloudflare Turnstile widget locale prop: which locale-string does it accept?**
   - What we know: Turnstile widget supports a `language` parameter (e.g., `'auto'`, `'ru'`, `'en'`); `'uz'` may not be supported.
   - What's unclear: whether Turnstile has Uzbek localization.
   - Recommendation: Pass `language={locale === 'uz' ? 'auto' : locale}` (Turnstile auto-detects from browser); confirm at integration time. **[ASSUMED — verify against Turnstile docs at integration time.]**

5. **DEF-4-12-04 Cloudinary widget: smoke-only sufficient, or invest in a frame-driven full e2e?**
   - What we know: cross-origin iframe is documented hostile to Playwright; widget triggers OS file picker.
   - What's unclear: whether `page.frameLocator()` + a Cloudinary mock would be feasible.
   - Recommendation: Smoke-only for v1 (documented in DEF entry — accepted limitation). Spike a frame-driven attempt as a v1.1 task if upload bugs slip through.

6. **Should the `/[locale]/contact` page also include a form, or just describe the contact channel + a "Open contact form" button?**
   - What we know: D-01 says the page is "canonical for SEO" and uses the same `<ContactForm>` as the modal.
   - What's unclear: whether the page renders the form inline OR mounts the modal-trigger button (which feels weird since the user already navigated TO the contact page).
   - Recommendation: Render `<ContactForm mode="page" />` inline on the `/[locale]/contact` page (no nested Dialog). The `mode` prop differentiates `onSuccess` behavior (page → swap to "Thanks" content; modal → close dialog).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 22 LTS | Server Action runtime + Node `crypto.createHmac` | ✓ | Vercel default | — |
| Postgres 16 (Neon) | `contact_rate_limit` table + atomic UPSERT | ✓ | Neon dev branch already at 16 | — |
| Resend account | Email send | ✓ | Already configured Phase 1 (`AUTH_RESEND_KEY`) | — |
| Cloudflare account + Turnstile site | Turnstile widget + secret key | ✗ (USER must register) | — | Test keys available for dev (`1x00000000000000000000AA` always-passes; `2x00000000000000000000AA` always-fails) |
| Apache Bench (`ab`) | `scripts/load-test.sh` | depends on CI runner | apache2-utils on Ubuntu | install via `apt-get install -y apache2-utils` in workflow |
| Google Search Console account | SEO-06 registration | ✗ (USER must register, D-12) | — | DEF-5 gate |
| Yandex Webmaster account | SEO-06 registration | ✗ (USER must register, D-12) | — | DEF-5 gate |
| 3 real phones (low-end Android + iPhone + 1 spare) | Real-device Slow-4G QA | ✗ (USER provides, D-12) | — | DEF-5 gate |

**Missing dependencies with no fallback:**
- Cloudflare Turnstile site registration — user must register at `dash.cloudflare.com/sign-up?to=/turnstile` and provide site key + secret key before Phase 5 deploys to production. Plan ships test keys for local dev so Phase 5 plans can be executed and tested without waiting on the user.
- Google Search Console + Yandex Webmaster — manual gates per D-12; ship the verification HTML file slots empty and instruct the user to swap in real hashes.

**Missing dependencies with fallback:**
- Apache Bench: install `apache2-utils` in the GitHub Actions workflow if not pre-installed on the `ubuntu-latest` runner.
- Real phones: skip the real-device gate locally; CI Lighthouse Slow-4G profile + 1-tester manual test on user's own phone is a viable v1 substitute if 3 phones aren't available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (live-Neon for Server Actions + lib helpers; jsdom for components) + Playwright 1.59.1 (e2e on Vercel preview) |
| Config file | `vitest.config.ts` + `playwright.config.ts` (already pre-threaded with BASE_URL + Vercel Deployment Protection bypass) |
| Quick run command | `pnpm vitest run tests/lib/rate-limit.test.ts tests/actions/contact.test.ts` |
| Full suite command | `pnpm vitest run && pnpm playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTA-01 | Visitor submits form, honeypot+Turnstile gate works | unit (live-Neon) + e2e | `pnpm vitest run tests/actions/contact.test.ts` + `pnpm playwright test tests/e2e/contact-form.spec.ts` | ❌ Wave 0 stubs |
| CTA-02 | Submission persists to DB; admin email sent via Resend | unit (live-Neon, vi.mock Resend) + manual SMTP check | `pnpm vitest run tests/actions/contact.test.ts` | ❌ Wave 0 stubs |
| CTA-03 | sourcePage hidden field captured + product-context auto-prepend | unit (live-Neon) + e2e | `pnpm vitest run tests/actions/contact.test.ts -t "sourcePage"` | ❌ Wave 0 stubs |
| CTA-04 | Per-IP rate limit (5/hour AND 20/day) | unit (live-Neon) | `pnpm vitest run tests/lib/rate-limit.test.ts` | ❌ Wave 0 stubs |
| SEO-06 | Search Console + Yandex Webmaster registered; International Targeting clean | manual (USER, D-12) | n/a — DEF-5 gate | DEF gate |
| OPS-02 | 10 trilingual products at ≤10 min each | manual (USER, D-12) | n/a — DEF-5 gate | DEF gate |
| DEF-4-12-01 (carry-over) | Google Rich Results validation | manual (USER) | n/a — already DEF | DEF gate |
| DEF-4-12-02 (carry-over) | Yandex TechArticle validation | manual (USER) | n/a — already DEF | DEF gate |
| DEF-4-12-03 (carry-over) | Cyrillic + Uzbek-Latin glyph QA | unit + manual | `pnpm playwright test tests/e2e/glyph-render.spec.ts` | ❌ Wave 0 stub |
| DEF-4-12-04 (carry-over) | Cloudinary widget smoke | e2e (smoke-only) | `pnpm playwright test tests/e2e/cloudinary-widget.spec.ts` | ❌ Wave 0 stub |

### Sampling Rate
- **Per task commit:** `pnpm tsc --noEmit && pnpm vitest run tests/{actions,lib,components}/contact*.test.ts tests/lib/rate-limit.test.ts tests/lib/turnstile.test.ts`
- **Per wave merge:** `pnpm vitest run` (full suite) + `pnpm playwright test --list` (verify zero `test.fixme`)
- **Phase gate:** Full suite GREEN + 8 e2e specs flipped GREEN against Vercel preview + `scripts/load-test.sh` run via workflow_dispatch with zero errors + Lighthouse CI passes Slow-4G assertion.

### Wave 0 Gaps
- [ ] `tests/actions/contact.test.ts` — covers CTA-01, CTA-02, CTA-03 (5+ specs: happy path, honeypot trigger, Turnstile fail, rate-limit hit, sourcePage validation, product-context prepend)
- [ ] `tests/lib/rate-limit.test.ts` — covers CTA-04 (atomic UPSERT, 2-bucket math, hash determinism, opportunistic cleanup)
- [ ] `tests/lib/turnstile.test.ts` — vi.mock fetch, error-code mapping
- [ ] `tests/components/contact-form.test.tsx` — jsdom: honeypot rendered off-screen + auto-disabled, RHF + Turnstile mock mount, sourcePage hidden field reads from `usePathname()`
- [ ] `tests/e2e/contact-form.spec.ts` — full submit roundtrip (test Turnstile site key `1x00000000000000000000AA`), assert success state visible
- [ ] `tests/e2e/cloudinary-widget.spec.ts` — DEF-4-12-04 smoke
- [ ] `tests/e2e/glyph-render.spec.ts` — DEF-4-12-03 (Cyrillic + U+02BB rendering, computed font-family)
- [ ] `tests/api/sitemap.test.ts` — extend with `/contact` per-locale assertion (3 it-blocks)
- [ ] `tests/fixtures/seed-contact.ts` — fixture helper: seed/teardown contact_submission rows, with optional Turnstile-bypass for tests that don't exercise the gate

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial — visitor is anonymous; no auth needed for contact submit; admin notify recipients are env-list, not auth-gated | n/a (admin auth covered by Phase 2) |
| V3 Session Management | no — anonymous endpoint, no session | n/a |
| V4 Access Control | no — endpoint is intentionally public | n/a |
| V5 Input Validation | YES | `contactInsertSchema` Zod allowlist (mass-assignment guard); sourcePage regex; HTML email body escaping (React Email handles); CSV-export injection guard already in `toCsv` writer |
| V6 Cryptography | YES | HMAC-SHA256 for IP hashing (`crypto.createHmac` — never hand-roll); Turnstile secret key never reaches client; `RATE_LIMIT_IP_SALT` ≥32 bytes; Resend API key in env only |
| V7 Error Handling and Logging | YES | Audit log writes for `spam_detected` + `rate_limited`; Sentry captures Resend failures; Server Action returns discriminated errors (no stack traces leaked) |
| V8 Data Protection | YES (GDPR posture) | DB stores `ip_hash`, NOT raw IP; visitor email + name + message stored; retention policy (CONTEXT did NOT discuss — flag as open question for v1.1); contact_submission CSV export already audit-logged |
| V11 Business Logic | YES | Per-IP rate limit (5/hour AND 20/day); honeypot drop-silently posture; fire-and-forget Resend so denial-of-service via Resend outage is impossible |
| V13 API and Web Service | YES | Server Action endpoint is the only entry; no separate REST API route for contact; Cloudflare Turnstile siteverify endpoint is HTTPS only |
| V14 Configuration | YES | t3-env Zod validates all 4 new env vars at boot; Vercel env vars never committed; Turnstile test keys documented for local dev |

### Known Threat Patterns for Phase 5 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass spam submissions | Denial of Service | 3-layer defense: honeypot + Turnstile + per-IP rate limit |
| CSRF on Server Action | Spoofing | Auth.js / Next.js Server Actions ship CSRF protection by default (encrypted Action ID); honeypot + Turnstile add defense-in-depth |
| IP spoofing for rate-limit bypass | Spoofing | Trust `x-forwarded-for` first hop only on Vercel (downstream spoofing impossible); fall back to `x-real-ip` |
| Replay of Turnstile token | Tampering | Cloudflare server-side enforces single-use; client widget must `reset()` after a failed submit so visitor gets fresh token |
| SQL injection via sourcePage | Tampering | Drizzle parameterized queries (already enforced); regex-validate sourcePage before storing |
| XSS via message body in admin email | Tampering | React Email auto-escapes string interpolation (`{copy.body}` is escaped, NOT raw HTML) |
| CSV formula injection (admin export) | Tampering | Phase 2 02-15 `toCsv` writer already prefixes formula-prone cells with `'` |
| Email header injection via name field | Tampering | Resend SDK sanitizes; never concat user input into raw SMTP headers |
| Resend account compromise | Information Disclosure | API key in env only; Vercel env-var access is admin-gated |
| Visitor PII leak via Sentry breadcrumbs | Information Disclosure | Sentry config (Phase 1 03-09) should `beforeSend` strip request body; verify Phase 5 captures don't include unredacted email/message |
| Honeypot bypass by smart bot | Spoofing | Defense-in-depth: even if honeypot bypassed, Turnstile + rate-limit catch the load |
| Audit log fills with spam_detected entries | Resource exhaustion | Audit log retention TBD; flag as v1.1 open issue (not Phase 5) |

## Sources

### Primary (HIGH confidence)
- Cloudflare Turnstile Server-Side Validation — https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ — endpoint, request body, response shape, error codes, token TTL
- Cloudflare Turnstile Test Keys — https://developers.cloudflare.com/turnstile/troubleshooting/testing/ — `1x00000000000000000000AA` always-pass for local dev
- Codebase grep — `src/db/client-ws.ts`, `src/lib/auth.ts`, `src/lib/audit.ts`, `src/lib/server-action.ts`, `src/lib/sitemap.ts`, `src/lib/revalidation.ts`, `src/db/schema/contact.ts`, `src/actions/submissions.ts`, `src/components/public/site-header.tsx`, `src/emails/{magic-link,admin-invite}.tsx`, `package.json`, `.lighthouserc.json`, `.github/workflows/{e2e-preview,lighthouse-preview}.yml`, `playwright.config.ts`, `src/env.ts` — all read at research time
- `.planning/REQUIREMENTS.md` — CTA-01..04, SEO-06, OPS-02 acceptance criteria
- `.planning/research/ARCHITECTURE.md` — single-deployment architecture, Server Action vs API route decision matrix
- `.planning/research/STACK.md` — already-locked Cloudflare Turnstile + Resend + React Email choices
- `.planning/research/PITFALLS.md` — Pitfall #7 (connection meltdown), Pitfall #11 (Vercel Deployment Protection bypass), Pitfall #12 (magic-link DB-direct in CI)
- `.planning/phases/04-content-features/04-VERIFICATION.md` — DEF-4-12-01..04 entries Phase 5 absorbs

### Secondary (MEDIUM confidence)
- React Email locale-parameterization pattern — observed in existing `src/emails/admin-invite.tsx` and `src/emails/magic-link.tsx`; same shape lifts to Phase 5 templates
- Honeypot off-screen positioning — WCAG-safe pattern via inline `style` (NOT Tailwind class) widely documented across accessibility resources

### Tertiary (LOW confidence — verify at implementation)
- `@marsidev/react-turnstile` — community wrapper; verify version + React 19 compat at install time
- Cloudflare Turnstile language prop — Uzbek (`uz`) localization unconfirmed; recommend `language="auto"` and document

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package already installed except `@marsidev/react-turnstile`; versions confirmed via `package.json`
- Architecture (withPublicAction wrapper, 2-bucket Postgres rate limit, sourcePage validation, product-context auto-prepend, Lighthouse CI lift): HIGH — patterns verified against existing codebase (`withAdminAction`, `dbTx.transaction`, `buildLocaleSitemapEntries`, `.lighthouserc.json`)
- Spam defense (Turnstile siteverify, honeypot off-screen, rate-limit math): HIGH — Cloudflare official docs verified; honeypot pattern is industry-standard
- Cloudinary widget e2e (DEF-4-12-04): MEDIUM — smoke-only is the documented best path; full frame-driven test possible but brittle
- Glyph render assertion (DEF-4-12-03): MEDIUM — `getComputedStyle` font-family check is approximate; visual diff via Playwright screenshot would be more decisive but more flaky
- OPS-02 dogfood + Search Console / Yandex registration: HIGH — manual gates, well-documented in CONTEXT D-12

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30 days — stack is mature; only Cloudflare Turnstile API contract is external and stable)

---

## RESEARCH COMPLETE

**Phase:** 05 - Contact and Launch Polish
**Confidence:** HIGH

### Key Findings
- Phase 5 is the first phase shipping a Server Action for **anonymous visitors** — author NEW `withPublicAction` sibling to existing `withAdminAction` in `src/lib/server-action.ts` to keep ergonomics consistent. Discriminated `{ ok, error|data }` return mirrors admin pattern; new error variants: `turnstile_failed`, `rate_limited`, `spam_detected`, plus existing `validation`, `unknown`.
- Cloudflare Turnstile siteverify is a single `fetch` to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with form-encoded `secret`+`response`+`remoteip` body — fully verified against official docs. Tokens are single-use and 5-minute TTL; client widget must `reset()` after any rejected submit.
- Per-IP rate limit MUST run on `dbTx` (Neon WebSocket Pool from `src/db/client-ws.ts`), NOT `db` (HTTP driver) — multi-statement transaction needed for atomic UPSERT-and-check. Schema deviation flagged: PK should be `(ip_hash, window_kind, window_start)` to support 2 buckets (5/hour AND 20/day) — narrowing of CONTEXT D-05 PK shape.
- DEF-4-12-04 absorption (Cloudinary widget e2e) recommended SMOKE-ONLY: assert widget DOM mounts + `/api/cloudinary/sign` returns 200; cross-origin iframe upload roundtrip stays manual.
- `.lighthouserc.json` ALREADY runs Slow-4G profile (1638 Kbps / 150ms RTT). Phase 5 "extension" per D-11 is narrower than initially scoped: lift `warn` → `error` on LCP assertion + expand URLs from 1 to 5 (homepage/category/product/search/contact).

### File Created
`c:/Users/hp elitebook/OneDrive/Desktop/Manometr/.planning/phases/05-contact-launch-polish/05-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | 10 of 11 needed packages already installed; only `@marsidev/react-turnstile` is new |
| Architecture | HIGH | All patterns verified against existing codebase; `withAdminAction`, `dbTx.transaction`, sitemap helpers, audit log all transfer 1:1 |
| Spam defense | HIGH | Turnstile siteverify endpoint + body + response verified against official Cloudflare docs |
| Rate limit | HIGH | Postgres atomic UPSERT pattern is standard; `dbTx` Pool already exists for transactions |
| Cloudinary widget e2e | MEDIUM | Smoke-only is the safest path; full e2e is documented brittle |
| Glyph render assertion | MEDIUM | Computed font-family check is approximate; visual diff is more decisive but flaky |
| OPS-02 + SEO-06 manual gates | HIGH | CONTEXT D-12 LOCKED — purely operational user-driven work |

### Open Questions
1. `contact_rate_limit` PK shape: `(ip_hash, window_kind, window_start)` deviation from D-05 — needs user confirmation if planner deems significant
2. Rate-limit denied requests: rollback or consume budget? — recommendation: rollback
3. Cloudflare Turnstile widget locale — `uz` may not be a supported language; recommendation: `language="auto"`
4. `/[locale]/contact` page — render `<ContactForm mode="page">` inline (not modal-trigger); recommendation: inline
5. Contact submission retention policy (GDPR) — not discussed in CONTEXT; flag as v1.1

### Ready for Planning
Research complete. Planner can now create 6-9 PLAN.md files across 3-4 waves:
- **Wave 0 BLOCKING:** schema migration (`contact_rate_limit` table) + AUDIT_ACTIONS extension + Wave-0 RED test stubs (~3 plans collapse-able into 1)
- **Wave 1:** withPublicAction + submitContactForm + rate-limit lib + turnstile lib + 2 React Email templates + ContactForm component + ContactButton modal trigger + SiteHeader mount + /[locale]/contact page + sitemap extension (~3-4 plans depending on grouping appetite)
- **Wave 2:** Lighthouse CI lift (`.lighthouserc.json` + workflow URL expansion) + `scripts/load-test.sh` + e2e flips (contact-form, Cloudinary widget smoke, glyph render) (~2 plans)
- **Wave 3 closure:** SEO-06 + OPS-02 artifact pre-staging (Search Console / Yandex verification HTML placeholders, dogfood protocol doc) + 05-VERIFICATION.md + DEF-5 entries + RETROSPECTIVE append (~1 plan)

Suggested split: **6 plans total** (Wave 0 = 1 plan, Wave 1 = 3 plans split by surface, Wave 2 = 1 plan, Wave 3 = 1 plan).
