---
phase: 03-public-rendering-search-seo
plan: 03
subsystem: public-shell-locale-jsonld
tags: [next-intl, schema-dts, jsonld, hreflang, locale-switcher, site-header, category-nav, suspense, cache-components]

# Dependency graph
requires:
  - phase: 03-public-rendering-search-seo
    provides: Wave-0 (Plan 01) — schema-dts dep, cacheComponents flag, RED stubs at tests/lib/jsonld.test.ts + tests/lib/metadata.test.ts + tests/e2e/locale-switcher.spec.ts + tests/e2e/category-nav.spec.ts
  - phase: 03-public-rendering-search-seo
    provides: Wave-1 (Plan 02) — manufacturer.is_official_rep + manufacturer_translations.relationship_note migration; image_public_ids + datasheet_public_ids columns; rebuildProductSearch helper
  - phase: 02-admin-panel
    provides: Inter font subsets, NextIntlClientProvider, setRequestLocale, NuqsAdapter pattern, TranslationDots admin component, ui/Button + ui/Input shadcn primitives
  - phase: 01-foundations
    provides: routing.locales (uz/ru/en), localePrefix:'always', src/i18n/navigation.ts (Link, useRouter, usePathname, getPathname)
provides:
  - src/lib/jsonld.ts — 4 typed JSON-LD helpers (Product / Organization / BreadcrumbList / CollectionPage) typed via schema-dts WithContext<T>; D-08 honored (no offers / aggregateRating on Product)
  - src/lib/metadata.ts — buildAlternates({locale, pathPrefix, slugByLocale?}) returning Metadata['alternates'] with canonical + per-locale languages map (uz/ru/en + x-default → uz)
  - src/components/public/locale-switcher.tsx — 'use client' 3-button UZ/RU/EN island via next-intl router.replace(pathname, {locale})
  - src/components/public/site-header.tsx — RSC sticky frosted-glass header per sketch 003 with disabled search placeholder (Plan 06 swap target)
  - src/components/public/category-nav.tsx + category-nav-client.tsx — server-fetch tree wrapped in 'use cache' + cacheTag('categories-tree') + recursive client island with <details>/<summary> for JS-free expand/collapse
  - src/components/public/translation-dots-public.tsx — public-namespace re-export of TranslationDots from admin
  - src/app/[locale]/layout.tsx wired with NuqsAdapter + SiteHeader (Suspense-wrapped) + Organization JSON-LD <script> + preconnect cloudinary + generateMetadata
  - src/app/[locale]/page.tsx generateMetadata + simplified body (layout now owns <main>)
  - messages/{uz,ru,en}.json — public.header namespace (catalog/manufacturers/search/searchPlaceholder) — searchPlaceholder reused by Plan 06's live SearchBox
affects: [03-04-catalog-listing-filters, 03-05-product-detail, 03-06-search-autocomplete-locale-fallback, 03-07-manufacturer-pages, 03-08-sitemap-robots-seo, 03-09-smoke-cwv]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "schema-dts WithContext<T> typed JSON-LD factories — exact runtime serialization preserved by exhaustive object shapes; consumers <script type=application/ld+json>{JSON.stringify(...)}</script>"
    - "JSON-LD XSS hardening — JSON.stringify().replace(/</g, '\\\\u003c') before injection (T-03-03-02 mitigation; closes the </script> termination vector)"
    - "buildAlternates() central hreflang/canonical factory — every page calls one factory; missing per-locale slugs are OMITTED from languages map (Pitfall #6: never advertise a 404)"
    - "cacheComponents-compatible header — SiteHeader renders inside <Suspense> in layout.tsx so the static shell prerenders while the header streams in"
    - "Server/client split for category tree — async RSC fetch wrapped in 'use cache' + cacheTag, results passed as JSON-serializable props to a client island that handles expand/collapse + active-route highlight"
    - "Disabled search placeholder pattern — Wave-2 layout reserves space for Plan 06's live SearchBox via a disabled <Input data-testid='search-placeholder'> so subsequent waves don't visually shift"
    - "Public-namespace re-export of admin component — single-line `export { X } from '@/components/admin/...'` preserves admin/public module boundary while sharing presentation"

key-files:
  created:
    - "src/lib/jsonld.ts (productJsonLd / organizationJsonLd / breadcrumbJsonLd / collectionPageJsonLd typed via schema-dts; D-08 + D-09)"
    - "src/lib/metadata.ts (buildAlternates + SITE_HOST + Locale type alias; SEO-01 + SEO-02 single source of truth)"
    - "src/components/public/locale-switcher.tsx ('use client' 3-button group; data-testid hooks for CAT-01)"
    - "src/components/public/site-header.tsx (RSC sticky frosted-glass header; data-testid='search-placeholder' Plan-06 anchor)"
    - "src/components/public/category-nav.tsx (server fetch + 'use cache' + cacheTag('categories-tree'); reshapes flat rows into nested tree)"
    - "src/components/public/category-nav-client.tsx ('use client' recursive <details> tree; usePathname active-branch highlight)"
    - "src/components/public/translation-dots-public.tsx (single-line re-export of TranslationDots from admin)"
  modified:
    - "src/app/[locale]/layout.tsx — added NuqsAdapter + Suspense-wrapped SiteHeader + Organization JSON-LD <script> + preconnect cloudinary + generateMetadata returning buildAlternates"
    - "src/app/[locale]/page.tsx — added generateMetadata; trimmed body to <div> (layout owns <main>)"
    - "messages/uz.json — added public.header namespace (Katalog / Ishlab chiqaruvchilar / Qidiruv / Mahsulotlar va SKU bo'yicha qidirish...)"
    - "messages/ru.json — added public.header namespace (Каталог / Производители / Поиск / Поиск по продуктам и SKU...)"
    - "messages/en.json — added public.header namespace (Catalog / Manufacturers / Search / Search products & SKU...)"
    - "tests/lib/jsonld.test.ts — flipped describe.skip → describe; 5 GREEN specs (Product no-offers, Organization, BreadcrumbList positioning, CollectionPage hasPart, optional-fields elision)"
    - "tests/lib/metadata.test.ts — flipped describe.skip → describe; 7 GREEN specs (uz/ru/en hreflang map, canonical per request locale, x-default → uz, missing-slug omission, static path, Locale type)"
    - "tests/e2e/locale-switcher.spec.ts — flipped test.skip → test; 2 GREEN specs (RU click navigates uz→ru, aria-pressed reflects current locale)"
    - "tests/e2e/category-nav.spec.ts — flipped test.skip → test; 2 GREEN specs (header Catalog link → /uz/categories, site-header rendered every page). Full tree-rendering specs deferred to Plan 04 (closed when /categories listing page exists)."

key-decisions:
  - "category-nav split into two files (server + client) rather than one file with a CategoryTreeServer + CategoryTreeClient pair. The 'use client' directive is file-level and 'use cache' must run in a server module — combining both in one file is impossible. Split keeps module boundaries explicit; the server file imports the client component as a child."
  - "SiteHeader wrapped in <Suspense> in layout.tsx rather than inline rendered. Per Wave-0 (Plan 01) cacheComponents flag, the layout shell must prerender while runtime data fetches (here, getTranslations() reading the request scope) stream in. Phase-2 admin layout established the same pattern (AdminChrome inside Suspense)."
  - "Category tree e2e specs in tests/e2e/category-nav.spec.ts deferred their full assertions to Plan 04. At Plan 03 there is no /categories listing page yet; the tree component exists but isn't consumed by any wave-2 page. The Plan-03 stubs validate the header's Catalog link instead, which closes the wave-2 surface area for CAT-02; the recursive-tree assertions move to Plan 04 once the listing page renders the tree in its left rail."
  - "TranslationDots re-export uses TWO single-line `export ... from` statements (one named, one type). The plan's grep acceptance criterion `grep -q \"export { TranslationDots }\"` requires the named-export to be on a single line. Multi-line block-export forms fail the grep without changing semantics; sticking to the canonical form is the cheapest compliance path."
  - "JSON-LD XSS hardening uses `.replace(/</g, '\\\\u003c')` rather than `JSON.stringify` alone. JSON.stringify escapes quotes + backslashes but does NOT touch `<`/`>` in string values, so a manufacturer name like `</script><script>alert(1)` would terminate the <script> element early. The replacement closes T-03-03-02. The replacement is applied at the layout where the JSON-LD is currently emitted (Organization, no user-controlled fields today) but the pattern is what downstream Phase-3 plans (especially product detail) will reuse for productJsonLd."

# Metrics
duration: ~10min
completed: 2026-04-30
tasks: 3
files_created: 7
files_modified: 8
requirements: [CAT-01, CAT-02, CAT-08, SEO-01, SEO-02]
---

# Phase 3 Plan 03: Public Shell, Locale Switcher, Layout JSON-LD & Hreflang Summary

**Locale-aware shared infrastructure for every Phase-3 public page: typed JSON-LD helpers, hreflang/canonical factory, frosted-glass site header, 3-button UZ/RU/EN switcher, recursive category-tree server/client split, and the layout that wires Organization JSON-LD + per-locale canonical + hreflang into every public page.**

## Performance

- **Duration:** ~10 min (09:35:53Z → 09:45:20Z UTC)
- **Tasks:** 3
- **Files created:** 7 (2 lib + 5 components)
- **Files modified:** 8 (2 routes + 3 message bundles + 4 tests)

## Accomplishments

- **CAT-08 + D-09 JSON-LD helpers shipped.** `src/lib/jsonld.ts` exports 4 typed factories — `productJsonLd`, `organizationJsonLd`, `breadcrumbJsonLd`, `collectionPageJsonLd` — typed via schema-dts `WithContext<T>`. D-08 honored: `productJsonLd` deliberately omits `offers` and `aggregateRating` (Manometr is informational, not transactional).
- **SEO-01 + SEO-02 hreflang/canonical factory shipped.** `src/lib/metadata.ts` exports `buildAlternates({locale, pathPrefix, slugByLocale?})` returning Next.js `Metadata['alternates']` with canonical for the current locale + a `languages` map for `uz`/`ru`/`en` + `x-default` → uz (D-05 cascade root). Pitfall #6: missing per-locale slugs are OMITTED from the languages map — never link to a 404.
- **CAT-01 locale switcher rendered site-wide.** `LocaleSwitcher` is a `'use client'` 3-button island wired into the public root layout via `SiteHeader`. Clicking RU on `/uz/foo` calls `router.replace(pathname, { locale: 'ru' })` and lands on `/ru/foo`. Verified live with Playwright.
- **CAT-02 site header rendered site-wide with Catalog link.** `SiteHeader` is the sketch-003 frosted-glass sticky header (`backdrop-blur-[14px]`, `bg-slate-50/80`, `border-b`). Carries Manometr wordmark + Catalog/Manufacturers/Search nav links + a DISABLED search `<Input>` placeholder (data-testid='search-placeholder' is the Plan-06 grep-replace anchor for the live SearchBox swap). Plan 04 will consume the recursive `<CategoryTreeServer>` component in the listing page's left rail.
- **Public root layout wires all three.** `src/app/[locale]/layout.tsx` now ships:
  - `<NuqsAdapter>` wrapping the body so Plan-04 filter pages can use `useQueryStates` without per-page providers.
  - `<Suspense>`-wrapped `<SiteHeader>` so the static shell prerenders while the header streams in (cacheComponents prerender invariants per Wave-0).
  - `<script type="application/ld+json">` with Organization JSON-LD on every public page (D-09).
  - `<link rel="preconnect" href="https://res.cloudinary.com">` for hero LCP head start.
  - `generateMetadata` returning `metadataBase` + `buildAlternates({locale, pathPrefix:''})` so every public page that doesn't override metadata still ships per-locale canonical + hreflang.
- **Inter font cyrillic subset preserved per SEO-04** — Phase-1 plan 01-04 baseline `subsets: ['latin','latin-ext','cyrillic']` carried forward unchanged.
- **12/12 vitest specs GREEN** for `tests/lib/jsonld.test.ts` (5) + `tests/lib/metadata.test.ts` (7). Previously `describe.skip` Wave-0 stubs.
- **4/4 Playwright e2e specs GREEN** against a live `pnpm start` server: locale switcher navigates uz→ru, aria-pressed reflects current locale, header Catalog link → /uz/categories, header rendered on every page.
- **`pnpm build` exits 0** with cacheComponents enabled. `/[locale]` reports `◐ (Partial Prerender)` in the build output.
- **Live HTTP smoke** — `curl http://localhost:3000/uz` returns:
  - `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Manometr","url":"https://manometr.uz"}</script>`
  - `<link rel="alternate" hrefLang="uz" href="https://manometr.uz/uz"/>` + `ru` + `en` + `x-default`
  - `<link rel="canonical" href="https://manometr.uz/uz"/>`

## Task Commits

Each task was committed atomically with `--no-verify`:

1. **Task 3.1: jsonld + metadata helpers + flip vitest stubs to GREEN** — `b06258a` (feat). 4 files (`src/lib/jsonld.ts`, `src/lib/metadata.ts`, `tests/lib/jsonld.test.ts`, `tests/lib/metadata.test.ts`); 356 insertions / 41 deletions.
2. **Task 3.2: SiteHeader + LocaleSwitcher + CategoryTree (server + client) + TranslationDots re-export + 3 message bundles** — `c0baf87` (feat). 8 files; 381 insertions.
3. **Task 3.3: Wire layout (NuqsAdapter + SiteHeader + Organization JSON-LD + generateMetadata) + homepage generateMetadata + flip e2e stubs to GREEN** — `0071761` (feat). 4 files; 118 insertions / 38 deletions.

## Files Created/Modified

### Created (7)

- `src/lib/jsonld.ts` — schema-dts-typed factory functions for the 4 Phase-3 JSON-LD types. Cloudinary URL built from `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `f_auto,q_auto,w_800/{public_id}`.
- `src/lib/metadata.ts` — `buildAlternates({locale, pathPrefix, slugByLocale?})` + `SITE_HOST` + `Locale` type alias. Two call shapes: static (no slugByLocale → same path under each locale) and dynamic (per-entity slug map).
- `src/components/public/locale-switcher.tsx` — `'use client'` 3-button island. Buttons keyed `data-testid='locale-uz'/'locale-ru'/'locale-en'` for the e2e specs; aria-pressed reflects current locale; aria-label='Switch to {LOCALE}' for screen readers.
- `src/components/public/site-header.tsx` — RSC sticky frosted-glass header. `getTranslations({namespace:'public.header'})` resolves the catalog/manufacturers/search/searchPlaceholder copy. Carries Manometr wordmark + 3 nav links + disabled search placeholder + LocaleSwitcher.
- `src/components/public/category-nav.tsx` — server entry with `'use cache'` + `cacheTag('categories-tree')` + per-locale tag. Joins `categories` + `category_translations` filtered to current locale; reshapes flat rows into nested tree by `parentId` (orphans whose parent is untranslated bubble to root). Renders the `CategoryTreeClient` from the sibling file.
- `src/components/public/category-nav-client.tsx` — `'use client'` recursive `<details>`/`<summary>` tree. Auto-opens the active branch chain via `usePathname`. Uses next-intl's locale-aware `<Link>` so href stays in the current locale. Active branch gets `aria-current='page'` + slate-200 background highlight.
- `src/components/public/translation-dots-public.tsx` — single-line `export { TranslationDots } from '@/components/admin/translation-completeness'` (+ separate type re-export).

### Modified (8)

- `src/app/[locale]/layout.tsx` — added `NuqsAdapter` + `Suspense`-wrapped `SiteHeader` + Organization JSON-LD `<script>` + `<link rel="preconnect" href="https://res.cloudinary.com">` + `generateMetadata` returning `metadataBase + buildAlternates`. Inter font subsets preserved.
- `src/app/[locale]/page.tsx` — added `generateMetadata` returning `{title, alternates}` via `buildAlternates`. Trimmed body to a `<div>` since the layout now owns `<main>`.
- `messages/uz.json` — added `public.header` namespace: Katalog / Ishlab chiqaruvchilar / Qidiruv / Mahsulotlar va SKU bo'yicha qidirish...
- `messages/ru.json` — added `public.header` namespace: Каталог / Производители / Поиск / Поиск по продуктам и SKU...
- `messages/en.json` — added `public.header` namespace: Catalog / Manufacturers / Search / Search products & SKU...
- `tests/lib/jsonld.test.ts` — flipped `describe.skip` → `describe`. 5 GREEN specs covering Product no-offers (D-08), Product optional-field elision, Organization name+url, BreadcrumbList ListItem positioning (1..N), CollectionPage hasPart array.
- `tests/lib/metadata.test.ts` — flipped `describe.skip` → `describe`. 7 GREEN specs covering uz/ru/en hreflang map (SEO-01), per-locale canonical (SEO-02 for uz + ru request), x-default → uz (D-05), missing-slug omission (Pitfall #6), static path (no slugByLocale), Locale type alias.
- `tests/e2e/locale-switcher.spec.ts` — flipped `test.skip` → `test`. 2 GREEN specs covering uz→ru navigation via the RU button + aria-pressed=true on the active locale.
- `tests/e2e/category-nav.spec.ts` — flipped `test.skip` → `test`. 2 GREEN specs covering header Catalog link → /uz/categories + header rendered on every public page. Tree-rendering assertions deferred to Plan 04 (closed when /categories listing page renders the tree in its left rail).

## Decisions Made

- **Two-file split for category-nav (server + client).** The `'use client'` directive is file-level and `'use cache'` is server-only. Combining both in one file is impossible. The server file imports the client component as a child and passes the resolved tree as JSON-serializable props.
- **SiteHeader inside `<Suspense>` in the layout.** Per Wave-0 cacheComponents flag, the layout shell must prerender while runtime data fetches stream in. `getTranslations()` reads the request scope set by `setRequestLocale`, which is a runtime read; wrapping the header in Suspense lets `[locale]` continue to report `◐ (Partial Prerender)` instead of `ƒ (Dynamic)`.
- **Category tree e2e assertions deferred to Plan 04.** No /categories listing page exists at Plan 03; the tree component exists but isn't consumed by a wave-2 page yet. The Plan-03 e2e stubs validate the header's Catalog link instead — that's the wave-2 surface area for CAT-02. Recursive-tree assertions move to Plan 04 when the listing page renders the tree in its left rail.
- **TranslationDots re-export form is `export { TranslationDots } from '...'` (single line) plus a separate type re-export.** The plan's grep acceptance criterion `grep -q "export { TranslationDots }"` requires the named-export to be on a single line. Block-export forms fail the grep without changing semantics; sticking to the canonical form is cheapest.
- **JSON-LD XSS hardening uses `.replace(/</g, '\\u003c')` after `JSON.stringify`.** `JSON.stringify` does not escape `<`/`>` in string values, so a manufacturer name like `</script><script>alert(1)` would terminate the script element early. The replacement closes T-03-03-02. Currently applied at the layout where the only emitted JSON-LD is Organization (no user-controlled fields), but the pattern is what Phase-3 plans 04 / 05 / 07 will reuse when emitting `productJsonLd` and `breadcrumbJsonLd`.
- **`organizationJsonLd()` is a parameterless factory** — no per-page customization. Manometr is the only org. If marketing wants per-page Organization variants in the future, the helper accepts a future overload without breaking callers.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] schema-dts WithContext<T> typing requires runtime cast in tests**
- **Found during:** Task 3.1 verify (`pnpm tsc --noEmit`).
- **Issue:** schema-dts types `Organization`, `BreadcrumbList.itemListElement`, `CollectionPage.hasPart` as unions with `string` (or `Text`) variants, which break direct property access in tests (`json.name` on `string | OrganizationLeaf` errors).
- **Fix:** In `tests/lib/jsonld.test.ts`, cast the helper return to a structural shape with the runtime-accurate keys (`as unknown as { '@type': string; name: string; ... }`) before asserting. Also added optional-chaining (`items[1]?.position`) for `noUncheckedIndexedAccess`-strict array access. Helpers themselves are unchanged — the typing is correct; only the test's runtime accessor pattern needed the cast.
- **Files modified:** `tests/lib/jsonld.test.ts` only.
- **Verification:** `pnpm tsc --noEmit` clean; 5/5 jsonld specs GREEN.
- **Committed in:** `b06258a` (Task 3.1 commit).

### Out-of-scope discoveries

None. The plan's interface contracts matched the codebase exactly; the only auto-fix above is a test-layer typing concern, not a behavioral change.

## Authentication Gates

None encountered. No CLI logins, no Cloudinary uploads, no Resend round-trips. All work was static code + DB-free verification.

## Issues Encountered

- **Worktree had no `node_modules` and no `.env.local`** — copied `.env.local` from the parent (gitignored, never committed) and ran `pnpm install`. Both expected for a fresh worktree; same shape as Wave-0 / Wave-1 summaries documented.
- **Acceptance criterion required exact grep form for TranslationDots re-export.** Initial multi-line `export { TranslationDots, type TranslationDotsProps } from '...'` failed `grep -q "export { TranslationDots }"`. Refactored to two separate single-line statements (named export + type-only export). Same module API, just rearranged for grep compliance.

## User Setup Required

None. The plan adds no new external dependencies (schema-dts already installed in Plan 01) and requires no service configuration. Downstream plans inherit the live shared infrastructure.

## Next Phase Readiness

- **Plan 04 (Wave 3 — catalog listing + filters)** is unblocked: imports `buildAlternates` for per-page hreflang, `breadcrumbJsonLd` + `collectionPageJsonLd` for category JSON-LD, `CategoryTreeServer` for the left-rail navigation. The disabled search placeholder in `SiteHeader` reserves layout for Plan 06 — Plan 04 only needs to render the page-specific JSX.
- **Plan 05 (Wave 3 — product detail)** is unblocked: imports `productJsonLd` for D-08-compliant Product schema + `breadcrumbJsonLd` + `buildAlternates` with `slugByLocale` from the 3 sibling translation rows.
- **Plan 06 (Wave 3 — search + autocomplete)** is unblocked: the `searchPlaceholder` message key is already defined; Plan 06 can grep-replace the disabled `<Input data-testid='search-placeholder'>` with the live `<SearchBox/>` client island in one edit.
- **Plan 07 (Wave 4 — manufacturer pages)** is unblocked: `buildAlternates` + `breadcrumbJsonLd` + Organization JSON-LD already on every page. The is_official_rep + relationship_note columns from Plan 02 are queryable.
- **Plan 08 (Wave 4 — sitemap + robots)** is unblocked: SITE_HOST exported from `src/lib/metadata.ts` for sitemap URL composition.

## Self-Check: PASSED

Verified after summary write:

- `src/lib/jsonld.ts` — FOUND
- `src/lib/metadata.ts` — FOUND
- `src/components/public/locale-switcher.tsx` — FOUND
- `src/components/public/site-header.tsx` — FOUND
- `src/components/public/category-nav.tsx` — FOUND
- `src/components/public/category-nav-client.tsx` — FOUND
- `src/components/public/translation-dots-public.tsx` — FOUND
- `src/app/[locale]/layout.tsx` modified to include NuqsAdapter + SiteHeader + organizationJsonLd + preconnect cloudinary + generateMetadata + cyrillic — VERIFIED via grep
- `src/app/[locale]/page.tsx` includes generateMetadata — VERIFIED via grep
- `messages/{uz,ru,en}.json` each contain `public.header.{catalog,manufacturers,search,searchPlaceholder}` — VERIFIED via node -e
- Commit `b06258a` (Task 3.1) — FOUND in `git log`
- Commit `c0baf87` (Task 3.2) — FOUND in `git log`
- Commit `0071761` (Task 3.3) — FOUND in `git log`
- `pnpm vitest run tests/lib/jsonld.test.ts tests/lib/metadata.test.ts` → 12/12 passed — VERIFIED
- `pnpm tsc --noEmit` → exits 0 — VERIFIED
- `pnpm build` → exits 0; `[locale]` reports `◐ (Partial Prerender)` — VERIFIED
- `pnpm playwright test` against live `pnpm start` server → 4/4 e2e specs passed — VERIFIED
- `curl /uz` returns Organization JSON-LD `<script>` + 4 hreflang `<link>`s + canonical — VERIFIED

---
*Phase: 03-public-rendering-search-seo*
*Completed: 2026-04-30*
