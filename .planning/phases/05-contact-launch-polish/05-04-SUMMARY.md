---
phase: 05
plan: 04
subsystem: contact-launch-polish
tags: [seo, canonical-page, hreflang, sitemap, rsc, contact, i18n]
requires:
  - "05-03-SUMMARY.md (<ContactForm /> SSOT with mode='page'; public.contact.pageTitle/pageSubtitle messages)"
  - "05-02-SUMMARY.md (submitContactForm Server Action — invoked client-side from ContactForm)"
  - "Phase-3 plan 03-03 (buildAlternates helper for canonical + hreflang fan-out)"
  - "Phase-3 plan 03-08 (buildLocaleSitemapEntries staticPath fan-out loop)"
provides:
  - "/[locale]/contact canonical SEO page (RSC + generateMetadata)"
  - "Per-locale canonical + hreflang fan-out for uz/ru/en + x-default on /contact"
  - "/contact entry in sitemap-{uz,ru,en}.xml with hreflang fan-out"
affects:
  - "src/lib/sitemap.ts (one-line staticPath addition; surrounding fan-out loop unchanged)"
  - "tests/api/sitemap.test.ts (3 RED stubs flipped GREEN + 1 full-coverage spec appended)"
tech-stack:
  added: []
  patterns:
    - "RSC + setRequestLocale(locale) BEFORE getTranslations (Pattern F invariant — preserves ISR)"
    - "buildAlternates({ locale, pathPrefix: '/contact' }) — reuses Phase-3 SEO-01/SEO-02 helper unchanged"
    - "Sitemap one-line addition to staticPath array literal — surrounding for-of loop substitutes per locale"
    - "Sitemap test asserts BOTH the rendered XML body AND the typed entries[] alternates map"
key-files:
  created:
    - "src/app/[locale]/contact/page.tsx"
  modified:
    - "src/lib/sitemap.ts"
    - "tests/api/sitemap.test.ts"
decisions:
  - "Honoring D-01 (05-CONTEXT.md): canonical /[locale]/contact page renders the SAME <ContactForm> the modal renders — only `mode` differs. SSOT preserved across both surfaces."
  - "No <Suspense> boundary on ContactPage — ContactForm is a client island handling its own loading state; the RSC has no async DB read so streaming has no benefit."
  - "No `productContext` prop on the canonical page — the page doesn't know which product the visitor came from (that's the modal's job from product-detail rail). Canonical is for direct-search arrivals."
  - "Sitemap test appended a 4th 'all 3 locale sitemaps include /contact' coverage spec (T-05-04-02 mitigation — full hreflang coverage, not just per-locale presence)."
  - "Each per-locale describe spec also asserts the typed `alternates` map (uz/ru/en) on the contact entry — locks the hreflang fan-out contract in addition to <loc> string-match."
metrics:
  duration_minutes: 9
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_changed: 3
  commits: 2
---

# Phase 5 Plan 4: Canonical Contact Page + Sitemap Extension Summary

Wave 1 SEO surface: shipped the canonical `/[locale]/contact` RSC page mounting `<ContactForm mode="page">` (the same SSOT the SiteHeader modal renders), emits per-locale canonical + hreflang fan-out for uz/ru/en + x-default via `buildAlternates({ pathPrefix: '/contact' })`; extended `src/lib/sitemap.ts` staticPath fan-out with `/contact` (one-line edit, hreflang fan-out auto-emitted by the existing `for (const l of ALL_LOCALES)` substitution loop); flipped plan 05-01's 3 RED skipped sitemap stubs GREEN and appended a 4th full-coverage assertion (16 sitemap specs total, all green). Wave 1 closes; Wave 2 (plan 05) is unblocked.

## What Was Built

### `src/app/[locale]/contact/page.tsx` (new)

Pure RSC. Two top-level exports per the plan contract:

- `generateMetadata({ params })` — awaits the locale param, fetches `public.contact` namespace via `getTranslations`, returns:
  - `title: t('pageTitle')` ("Biz bilan bog'laning" / "Свяжитесь с нами" / "Contact us")
  - `description: t('pageSubtitle')` (3-locale visitor copy from plan 05-03)
  - `alternates: buildAlternates({ locale, pathPrefix: '/contact' })` — produces `canonical: https://manometr.uz/<locale>/contact` + `languages: { uz, ru, en, 'x-default' }` map. The `buildAlternates` helper (Phase-3 plan 03-03) handles x-default → uz mapping per D-05 unchanged.
- `default async function ContactPage({ params })` — `setRequestLocale(locale)` BEFORE the `getTranslations()` call (Pattern F invariant — keeps the page on the prerender path; forgetting this forces dynamic rendering and breaks ISR per T-05-04-01). Renders a minimal header (`<h1>` from `pageTitle`, `<p>` from `pageSubtitle`) and mounts `<ContactForm locale={locale as Locale} mode="page" />`.

The `mode="page"` prop tells ContactForm to swap to its inline "Thanks…" success state on `ok:true` instead of calling `onSuccess` (the modal's path). No `productContext` is forwarded — direct-search arrivals don't carry product context; that signal flows only via `<StickyCtaContactButton />` on product-detail pages.

`pnpm next build` confirmed the route prerenders for all 3 locales (Partial Prerender — `/uz/contact`, `/ru/contact`, `/en/contact`).

### `src/lib/sitemap.ts` (edit)

Single-line addition to the `staticPath` array literal inside `buildLocaleSitemapEntries`:

```diff
   for (const staticPath of [
     '',
     '/categories',
     '/manufacturers',
     '/recipes',
     '/industries',
+    '/contact',
   ] as const) {
```

The surrounding `for (const l of ALL_LOCALES) { alternates[l] = ${HOST}/${l}${staticPath} }` substitution emits the hreflang fan-out automatically — every locale's sitemap now includes one `<url>` entry with `<loc>HOST/<locale>/contact</loc>` plus `<xhtml:link rel="alternate" hreflang="..."/>` rows for uz/ru/en + x-default→uz (the latter handled by `renderUrlsetXml`'s existing x-default emission).

No other changes to sitemap.ts. The contract for products/categories/manufacturers/recipes/industries is untouched.

### `tests/api/sitemap.test.ts` (edit)

Flipped plan 05-01 task 1.6's 3 RED `it.skip` stubs to `it` and strengthened each:

- Per-locale `<loc>` string-match against the rendered XML body (the original RED assertion shape).
- Per-locale typed `alternates` map inspection via `buildLocaleSitemapEntries(locale)` — locks the full hreflang fan-out contract, not just the URL emission. Each `contactEntry?.alternates.uz/ru/en` is asserted to equal the canonical per-locale URL.

Appended a 4th spec — `'all 3 locale sitemaps include /contact (full coverage; no locale missing)'` — that fetches all 3 locale sitemaps and asserts `/contact` in each. This locks the T-05-04-02 invariant: a missing locale would cause Search Console / Yandex Webmaster to flag hreflang inconsistency in International Targeting; the spec catches the regression before SEO-06 validation.

Added a `beforeAll(() => requireTestDatabaseUrl())` to the new describe block — `buildLocaleSitemapEntries` hits Neon for product/category/manufacturer/recipe/industry rows even though `/contact` is a static path (the helper doesn't short-circuit DB access).

`pnpm vitest run tests/api/sitemap.test.ts` — 16/16 specs green (12 prior + 4 new).

## Architecture Notes

- **D-01 SSOT preserved end-to-end.** Both modal (SiteHeader `<ContactButton />`) and canonical page (`/[locale]/contact`) render the same `<ContactForm />` source — only `mode` differs. No fork. Plan 05-04 added zero ContactForm code; it only mounts the existing component with `mode="page"`.
- **buildAlternates reuse.** The page emits Phase-3-pattern canonical + hreflang via the same helper recipes/industries/products use. No new metadata helper introduced — the helper is path-prefix-parameterized and handles static paths by omitting `slugByLocale`.
- **Sitemap one-line touch.** The static-path fan-out loop in `buildLocaleSitemapEntries` was designed to take additions exactly this shape (one element, no other code). Recipes (Phase 4) and industries (Phase 4) followed the same pattern; `/contact` is the next addition in line.
- **Hreflang fan-out completeness.** Each per-locale sitemap entry's `alternates` map is fully populated for uz/ru/en (the for-of substitution does not skip locales for static paths because `slugByLocale` is implicitly identical), so the rendered XML emits `<xhtml:link rel="alternate" hreflang="uz"/>`, `hreflang="ru"`, `hreflang="en"` plus `hreflang="x-default"` (uz). Search Console / Yandex Webmaster International Targeting will validate clean.

## Threat Model Coverage

- **T-05-04-01 (forced-dynamic rendering on /contact)** — mitigated. `setRequestLocale(locale)` is called BEFORE any `getTranslations()` invocation in both the page default export and `generateMetadata`. Verified by source inspection. The route appears as `◐ Partial Prerender` in `next build` output, not `ƒ Dynamic`.
- **T-05-04-02 (sitemap /contact missing in one locale → hreflang inconsistency)** — mitigated. Single staticPath array + `for (const l of ALL_LOCALES)` substitution loop guarantees identical per-locale emission. The 4th appended sitemap spec asserts presence in all 3 locale sitemaps simultaneously — regression-locked.
- **T-05-04-03 (route shape `/[locale]/contact` vs sitemap path `/contact` misalignment)** — mitigated. Both use the literal `/contact` (no trailing slash). The sitemap test asserts `<loc>` ends in exactly `/<locale>/contact` (no `/`). Confirmed via build output: `/uz/contact`, `/ru/contact`, `/en/contact`.

## Deviations from Plan

None of substance. One minor environment note (out-of-scope for this plan):

**1. [Out-of-scope build env] Phase-5 env vars absent from local `.env.local`**
- **Found during:** Task 4.1 verification (`pnpm next build`).
- **Issue:** `pnpm next build` failed env-validation because `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and `RATE_LIMIT_IP_SALT` (added by plan 05-02 to `src/env.ts`) are absent from the developer's `.env.local`.
- **Disposition:** Pre-existing requirement from plan 05-02 (Server Action env contract), NOT introduced by 05-04. Per scope-boundary rule, NOT auto-fixed.
- **Workaround used for verification:** Inline-passed Cloudflare's published always-pass test keys (`1x000…`) to confirm `/contact` route compiles and is included in the build output. The route prerendered cleanly for all 3 locales.
- **Action:** Logged for plan 06 (Wave 2) to ensure the launch-readiness checklist instructs the user to populate these secrets before deploy. Plan 05-02 already documented the env requirement in `.env.example`; the gap is purely local to this developer's `.env.local`.

## Verification

- `pnpm tsc --noEmit` — exit 0
- `pnpm vitest run tests/api/sitemap.test.ts` — 16/16 specs green (incl. 3 flipped + 1 appended for /contact)
- `pnpm vitest run` — 254/254 specs across 48 files green; no Phase-5 RED stubs remaining anywhere
- `pnpm next build` (with Phase-5 test env vars inline) — `/[locale]/contact` route compiled and prerendered for `/uz/contact`, `/ru/contact`, `/en/contact` as Partial Prerender; no errors related to /contact
- `grep -c "'/contact'" src/lib/sitemap.ts` → 1
- `grep -c "it.skip" tests/api/sitemap.test.ts` → 0
- Source inspection: `setRequestLocale(locale)` called before `getTranslations()` in both default export and generateMetadata; `buildAlternates({ pathPrefix: '/contact' })` invoked; `<ContactForm` invoked with `mode="page"` and `locale={locale as Locale}`; `t('pageTitle')` + `t('pageSubtitle')` both rendered

## Wave 1 Status

Plan 05-04 closes Wave 1 of Phase 5. All Wave 1 plans complete:

- ✅ 05-01 — RED skeleton + messages skeleton + 13 RED test stubs (3 flipped here)
- ✅ 05-02 — server stack: contactInsertSchema + withPublicAction + submitContactForm + 2 React Email templates + 1 Drizzle migration (`contact_rate_limit` table)
- ✅ 05-03 — visitor UI: ContactForm SSOT + ContactButton + sticky-cta-contact-button + populated public.contact.* messages (24 keys × 3 locales)
- ✅ 05-04 — canonical /contact RSC page + sitemap fan-out + sitemap test contract locked

Wave 2 (plan 05 — perf + e2e flips) is now unblocked. Wave 2 consumes:
- The shipped canonical `/[locale]/contact` route (e2e-spec target)
- The shipped `<ContactForm />` + `<ContactButton />` (Playwright modal e2e)
- The shipped sitemap with `/contact` entry (Lighthouse-CI + sitemap-submission rehearsal)

Phase 5 progress: **4/6 plans complete** (Wave 1 done; Wave 2 plan 05 + Wave 3 plan 06 + Wave 4 plan 07 remain — adjust if planner numbering differs).

## Self-Check: PASSED

Verified files exist:
- FOUND: `src/app/[locale]/contact/page.tsx`
- FOUND: `src/lib/sitemap.ts` (modified — contains `'/contact'`)
- FOUND: `tests/api/sitemap.test.ts` (modified — 0 `it.skip`, 4 contact-coverage specs)

Verified commits exist on `master`:
- FOUND: `a3c02db` — feat(05-04): add canonical /[locale]/contact RSC page
- FOUND: `e8f03fe` — feat(05-04): extend sitemap staticPath with /contact + flip RED tests GREEN

All 16 sitemap specs green; full vitest run 254/254 green; `pnpm tsc --noEmit` clean; `pnpm next build` confirms `/contact` prerenders for all 3 locales.
