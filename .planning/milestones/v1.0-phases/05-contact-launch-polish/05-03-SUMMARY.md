---
phase: 05
plan: 03
subsystem: contact-launch-polish
tags: [ui, contact-form, modal, turnstile, honeypot, i18n, sticky-cta, react-hook-form]
requires:
  - "05-02-SUMMARY.md (submitContactForm Server Action + contactInsertSchema)"
  - "05-01-SUMMARY.md (messages skeleton + 2 RED stubs flipped here)"
provides:
  - "<ContactForm /> SSOT for both modal and canonical /contact page"
  - "<ContactButton /> sticky modal trigger mounted in SiteHeader"
  - "<StickyCtaContactButton /> product-detail variant with productContext pre-fill"
  - "public.contact.* 24-key namespace populated across uz/ru/en"
affects:
  - "src/components/public/site-header.tsx (mounts ContactButton right of LocaleSwitcher)"
  - "src/components/public/sticky-cta-rail.tsx (gains `locale` prop; #contact anchor swapped)"
  - "src/app/[locale]/products/[slug]/page.tsx (passes `locale` through to StickyCtaRail)"
tech-stack:
  added: []
  patterns:
    - "RHF + zodResolver + useTransition (mirrors LoginForm useActionState pattern)"
    - "@marsidev/react-turnstile via forwardRef with imperative `reset()` handle (Pitfall 2)"
    - "Inline-style off-screen honeypot (T-05-03-01: Tailwind purge cannot affect inline styles)"
    - "shadcn Dialog `<DialogTrigger render={<Button … />} />` base-ui idiom"
    - "Vitest jsdom mocks: useTranslations identity-fn + Turnstile stub with token-emit handle"
key-files:
  created:
    - "src/components/public/contact-form.tsx"
    - "src/components/public/contact-button.tsx"
    - "src/components/public/sticky-cta-contact-button.tsx"
  modified:
    - "src/components/public/site-header.tsx"
    - "src/components/public/sticky-cta-rail.tsx"
    - "src/app/[locale]/products/[slug]/page.tsx"
    - "messages/uz.json"
    - "messages/ru.json"
    - "messages/en.json"
    - "tests/components/contact-form.test.tsx"
    - "tests/components/contact-button.test.tsx"
decisions:
  - "Turnstile widget `language` prop: 'auto' for uz (not supported), 'ru'/'en' literal otherwise (Open Q §4)"
  - "Honeypot uses inline React.CSSProperties — NEVER a Tailwind class (T-05-03-01 mitigation)"
  - "StickyCtaContactButton wraps ContactButton in a div carrying the legacy data-testid='cta-request-price' (back-compat for Phase 3 e2e)"
  - "Submit button disabled while turnstileToken === '' so visitor cannot resubmit until widget produces a fresh token (T-CTA-02 mitigation)"
  - "StickyCtaRail.labels.requestPrice retained but unused — ContactButton sources its own label from public.contact.cta (W-5)"
metrics:
  duration_minutes: 16
  completed_date: "2026-05-05"
  tasks_completed: 3
  files_changed: 11
  commits: 3
---

# Phase 5 Plan 3: Visitor Contact UI Summary

Visitor-facing contact surface: shared `<ContactForm />` SSOT (RHF + zodResolver + Cloudflare Turnstile + off-screen honeypot + sourcePage capture) mounted by `<ContactButton />` modal trigger in SiteHeader and by a small `<StickyCtaContactButton />` client island that replaces the product-detail rail's `#contact` placeholder anchor; 3-locale `public.contact.*` namespace populated (24 keys per locale, no drift); 2 jsdom RED stubs flipped GREEN (12 specs total).

## What Was Built

### `src/components/public/contact-form.tsx` (new)
The single-source visitor form. `'use client'`, RHF + `zodResolver(contactInsertSchema)`, `useTransition` for the Server Action call, two `mode` values:
- `mode="page"` — on `ok:true` swaps to a thank-you state in-place (used by plan 05-04 canonical /contact page).
- `mode="modal"` — on `ok:true` calls `onSuccess` so the parent `<ContactButton />` Dialog can close.

5 visible inputs (name/company/email/phone/message), off-screen honeypot `field_extra` rendered with INLINE `React.CSSProperties` (NEVER a Tailwind class — T-05-03-01: Tailwind v4 purge cannot affect inline styles), hidden `sourcePage` captured from `usePathname()` at mount and re-synced on route changes (modals can outlive navigation), hidden `locale`, hidden `turnstileToken`. The `<Turnstile>` widget is held in a `useRef<TurnstileInstance>` so the rejected-submit branch can call `turnstileRef.current?.reset()` (Pitfall 2 — Cloudflare siteverify rejects reused tokens).

Submit button is disabled while `pending || !turnstileToken`, so the visitor cannot resubmit until the widget has produced a fresh token (T-CTA-02 mitigation). Server-action error codes are mapped to the localized `public.contact.form.error{Validation,Turnstile,RateLimit,Unknown}` messages.

Turnstile `language` prop: `'auto'` for `locale === 'uz'` (Cloudflare's widget UI does NOT ship Uzbek), the literal locale otherwise (Open Q §4 from RESEARCH.md).

### `src/components/public/contact-button.tsx` (new)
`'use client'` shadcn `Dialog` wrapper. Uses base-ui's `<DialogTrigger render={<Button …/>} />` idiom (matches the existing `admins-table.tsx` pattern, NOT Radix `asChild`). Mounts `<ContactForm mode="modal" onSuccess={() => setOpen(false)} />` inside the Dialog body. Pulls its own copy from `useTranslations('public.contact')` so callers don't have to thread label props.

### `src/components/public/sticky-cta-contact-button.tsx` (new)
Small client island used inside the existing `<StickyCtaRail />` RSC. Composes `productContext` from `<productName> (<productSku>)` (or just `<productName>` if SKU is null) and forwards it to `<ContactButton productContext />`. Wrapping `<div data-testid="cta-request-price">` preserves the legacy testid that Phase 3 e2e specs target.

### `src/components/public/site-header.tsx` (edit)
Adds one import + one element: `<ContactButton locale={locale} />` mounted right of `<LocaleSwitcher />` per D-01. Header layout dimensions (max-width, gap, padding) untouched — no CLS regression.

### `src/components/public/sticky-cta-rail.tsx` (edit)
- Replaces the placeholder `<a href="#contact">…</a>` block with `<StickyCtaContactButton locale productName productSku={sku} />`.
- Adds a `locale: Locale` prop so the embedded client island can pass it through to ContactButton → ContactForm.
- `labels.requestPrice` is no longer rendered (ContactButton sources `public.contact.cta` itself) but the prop is preserved on the `StickyCtaRailLabels` interface to keep page callers from breaking — safe to remove next phase.

### `src/app/[locale]/products/[slug]/page.tsx` (edit)
Passes `locale={locale as Locale}` to `<StickyCtaRail />` to satisfy the new required prop.

### `messages/{uz,ru,en}.json` (edit)
Replaces 24 `"TODO: 05-03"` placeholders per locale with the agreed v1 visitor copy:
- `cta`: "Bog'lanish" / "Связаться" / "Contact us"
- `pageTitle` + `pageSubtitle`
- `form.{name,company,email,phone,message,submit,submitting,successTitle,successBody,errorValidation,errorTurnstile,errorRateLimit,errorUnknown,honeypotLabel}` (15 keys)
- `productInquiry.inquiryAbout` ICU template ("…: {name} ({sku})")
- `autoReply.{subject,preview,greeting,body,productLine,signature}` parallel source for the email auto-reply (kept in sync with plan 05-02's hardcoded `contact-auto-reply.tsx` COPY map; ready for v1.1 in-app preview).

Verified key-tree parity: all 3 files have identical 24-key shapes under `public.contact`, so `next-intl` will not throw missing-key warnings at runtime.

### Tests flipped GREEN

`tests/components/contact-form.test.tsx` — 8 specs (was 6 RED stubs). Mocks: `@marsidev/react-turnstile` (forwardRef stub exposing `reset` spy + `__emitToken` test handle via captured `onSuccess`), `next/navigation` `usePathname` (fixed `/uz/products/manometr-m-100`), `@/actions/contact` `submitContactForm` (controlled discriminated returns), `@/env` (stub `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), `next-intl` `useTranslations` (identity-fn with values appended for ICU coverage).

Specs: 5 visible inputs render; honeypot has off-screen inline style + `aria-hidden="true"` + `tabIndex={-1}` + `autoComplete="off"`; sourcePage hidden input has the mocked pathname value; `error: 'turnstile_failed'` calls `turnstileRef.current.reset()` exactly once and shows the localized error; `error: 'rate_limited'` shows the rate-limit error; `mode="page"` ok:true swaps to success state; `mode="modal"` ok:true calls `onSuccess`; `productContext` prop renders the prefill text.

`tests/components/contact-button.test.tsx` — 4 specs (was 4 RED stubs). Mocks `@/components/public/contact-form` with a stub that records the props it receives so specs can assert `mode="modal"` + `onSuccess` + `productContext` forwarding. `next-intl` is mocked identity. Specs: button renders the localized cta label; clicking the trigger opens the Dialog (ContactForm mounts); the form receives `mode="modal"` + `onSuccess` function + correct `locale`; `productContext` flows through unchanged.

## Architecture Notes

- **SSOT pattern (D-01):** Both the SiteHeader modal and the future canonical `/contact` page (plan 05-04) mount the same `<ContactForm />` — only `mode` differs. No duplicated form logic.
- **Client island for sticky CTA (PATTERNS option 2):** Rather than fork the entire StickyCtaRail RSC into a client component, only the CTA button is hoisted into a tiny `'use client'` island. The rail stays an RSC, only the modal-bearing button is hydrated.
- **Threat model coverage:** T-CTA-02 (Turnstile token replay) mitigated by widget reset on rejected submit + disabled-until-token submit button. T-CTA-03 (honeypot autofill leak) mitigated by `field_extra` field name (not `honeypot`/`email_confirm`) + autoComplete=off + tabIndex=-1 + aria-hidden + INLINE off-screen style. T-CTA-04 (sourcePage tampering) is server-side; UI capture is convenience only. T-05-03-01 (Tailwind purge dropping the off-screen rules) mitigated by inline-style honeypot; jsdom assertion locks the `position: 'absolute'` + `clip: 'rect(...)'` invariants.

## Deviations from Plan

None of substance. Two minor adjustments:

**1. [Rule 3 — Blocking issue] StickyCtaRail required a new `locale` prop**
- **Found during:** Task 3.2.
- **Issue:** `StickyCtaContactButton` needs `locale` to pass to ContactButton, but the existing `StickyCtaRail` RSC didn't carry locale on its prop interface.
- **Fix:** Added `locale: Locale` to `StickyCtaRailProps` and updated the single page caller (`src/app/[locale]/products/[slug]/page.tsx`) to pass `locale={locale as Locale}`. The cast is consistent with neighbouring usages on the same page (`UsedInSection`, `ManufacturerCard`) which all cast the route param `string` to `Locale`.
- **Files modified:** `src/components/public/sticky-cta-rail.tsx`, `src/app/[locale]/products/[slug]/page.tsx`.
- **Commit:** `413daf0`.

**2. [Rule 2 — Required correctness] Test mock returns interpolated values**
- **Found during:** Task 3.1 first run.
- **Issue:** Initial `useTranslations` mock returned `key` verbatim even when `values` were passed; `productContext` prefill spec failed because `productInquiry.inquiryAbout` doesn't contain `{name}`/`{sku}` literally.
- **Fix:** Mock now appends ` k=v` pairs after the key when values are provided so specs can assert on values without depending on real ICU strings.
- **Files modified:** `tests/components/contact-form.test.tsx`.
- **Commit:** `f7967ad` (same task commit).

## Verification

- `pnpm tsc --noEmit` — exit 0
- `pnpm vitest run --project=dom` — 32 specs passing across 8 files (contact-form 8/8, contact-button 4/4, plus all prior DOM tests)
- `grep -c "it.skip" tests/components/contact-form.test.tsx tests/components/contact-button.test.tsx` — 0 skipped specs
- `grep -c "TODO: 05-03" messages/uz.json messages/ru.json messages/en.json` — 0 placeholders
- `grep "href=\"#contact\"" src/components/public/sticky-cta-rail.tsx` — no matches
- `grep "<ContactButton" src/components/public/site-header.tsx` — 1 mount confirmed
- 3-locale key-tree parity: 24 identical keys per file under `public.contact`

## Wave 1 Status

Plan 05-03 closes the visitor-UI half of Wave 1. Plan 05-04 (canonical `/[locale]/contact` RSC + sitemap.ts `/contact` extension) is now unblocked — it consumes:
- `<ContactForm />` (this plan) with `mode="page"` and locale-derived metadata
- `submitContactForm` Server Action (plan 05-02)
- `public.contact.pageTitle` / `pageSubtitle` / `form.*` strings (this plan)

## Self-Check: PASSED

Verified files exist:
- FOUND: `src/components/public/contact-form.tsx`
- FOUND: `src/components/public/contact-button.tsx`
- FOUND: `src/components/public/sticky-cta-contact-button.tsx`

Verified commits exist on `master`:
- FOUND: `f7967ad` — feat(05-03): add ContactForm
- FOUND: `413daf0` — feat(05-03): wire ContactButton into SiteHeader + sticky CTA rail
- FOUND: `9538907` — feat(05-03): populate public.contact.* messages

All 12 jsdom specs (8 form + 4 button) green; `pnpm tsc --noEmit` clean.
