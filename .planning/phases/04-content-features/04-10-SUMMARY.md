---
phase: 04-content-features
plan: 10
subsystem: industry-public-pages
tags: [public, industries, rsc, tiptap, jsonld, sitemap, cont-03, cont-06]
requires:
  - 04-02  # renderTiptapToHtml SSOT renderer + TIPTAP_EXTENSIONS allow-list
  - 04-03  # getIndustryBySlug + findPublishedIndustries + getLinkedProductsForIndustry + techArticleJsonLd
  - 04-06  # Server Actions (industries must be authorable for content to exist; not strictly required to compile)
  - 04-09  # LocaleFallbackBanner primitive (REUSED) + sitemap.ts already extended once for recipes (industries adds parallel block) + public.localeFallback.industry.{uz,ru,en} namespace pre-shipped
provides:
  - "/[locale]/industries index RSC page (cards grid)"
  - "/[locale]/industries/[slug] detail RSC page (Tiptap body + TechArticle JSON-LD + locale-fallback banner)"
  - IndustryCard primitive (reused by Used-In on product detail in 04-11)
  - sitemap industry entries (per-locale, hreflang alternates; sitemap.xml gains /industries static index)
affects:
  - src/lib/sitemap.ts (extended buildLocaleSitemapEntries with industries block + /industries static path)
  - messages/{uz,ru,en}.json (added public.industries.index namespace; localeFallback.industry was pre-shipped in 04-09)
tech-stack:
  added: []
  patterns:
    - "RSC + Suspense shell from Phase 3 + Plan 04-09 (recipes detail/index pattern)"
    - "JSON-LD < escape via JSON.stringify(obj).replace(/</g, '\\\\u003c') for </script> termination guard (Phase 3 D-09 carry-forward; T-04-XSS-02)"
    - "prose prose-slate scoped to a child div (Plan 04-09 Deviation Rule 2 — page <h1>/excerpt outside prose)"
    - "TechArticle JSON-LD via techArticleJsonLd helper (D-10 LOCKED for industries even though Article would be the strict semantic fit per RESEARCH P4-4 / A1; manual Yandex gate validates in 04-12)"
    - "LocaleFallbackBanner REUSE — entityType='industry' prop selects the variant, no duplicate component"
    - "sitemap industries block mirrors recipes GROUP BY pattern; status='published' filter inside SQL (T-04-INFO-01 mitigation)"
key-files:
  created:
    - src/components/public/industry-card.tsx
    - src/app/[locale]/industries/page.tsx
    - src/app/[locale]/industries/[slug]/page.tsx
  modified:
    - src/lib/sitemap.ts
    - messages/uz.json
    - messages/ru.json
    - messages/en.json
decisions:
  - "LocaleFallbackBanner is REUSED verbatim (not duplicated). The component already accepts entityType: 'recipe' | 'industry' from 04-09; the industry detail page passes entityType='industry'. Zero-change wiring (the public.localeFallback.industry namespace was pre-shipped in 04-09)."
  - "IndustryCard is duplicated alongside RecipeCard rather than abstracted into a shared <ContentCard> per the plan's intentional duplication note — each card type evolves independently in v1.1 if entity-specific affordances are added (industries 'vertical' tag vs recipes 'difficulty' tag)."
  - "TechArticle JSON-LD shipped for industries despite RESEARCH P4-4 noting Article would be the strict semantic fit. Per locked decision D-10, both recipe + industry use TechArticle for v1; manual gate DEF-4-12-02 in plan 04-12 runs Rich Results Test against both Google + Yandex; downgrade to Article in v1.1 if Yandex Webmaster flags type-mismatch."
  - "Same datePublished fallback as recipes — falls back to updatedAt when industry.publishedAt is null (TechArticle requires non-null datePublished; published row with null publishedAt is a data-integrity bug Phase-2 D-11 atomic dual-column lifecycle should prevent in practice)."
  - "/industries appended to the static-paths array of buildLocaleSitemapEntries (sitemap-{locale}.xml emits the index URL alongside /, /categories, /manufacturers, /recipes)."
  - "Body HTML rendered inside <article> wrapper but the prose styling lives on a CHILD div ('article-body prose prose-slate max-w-none') — Plan 04-09 Deviation Rule 2 carry-forward."
  - "No CollectionPage JSON-LD on the industries index in v1 (deferred per 04-09 precedent; v1.1 follow-up if Yandex Rich Results requests)."
metrics:
  duration: "~9 minutes"
  tasks: 2
  files: 7
  completed: 2026-05-02T06:00Z
---

# Phase 04 Plan 10: Industry public pages — Summary

**One-liner:** Public industry surface lands — `/[locale]/industries` (RSC card grid via IndustryCard) + `/[locale]/industries/[slug]` (RSC detail with server-side Tiptap body via `renderTiptapToHtml`, TechArticle JSON-LD with `<` escape, LocaleFallbackBanner REUSED with `entityType="industry"`, CldImage hero with priority for LCP). `src/lib/sitemap.ts` extended with the industries block + `/industries` static index path; per-locale hreflang alternates emitted for every published industry. Mirror of plan 04-09 with industry entity; LocaleFallbackBanner + `public.localeFallback.industry` namespace inherited from 04-09 with zero-change wiring.

## What shipped

### Task 10.1 — IndustryCard primitive (commit `579da49`)

- **`src/components/public/industry-card.tsx`** (RSC, no 'use client')
  - Props: `{ industry: { id, title, slug, excerpt, featuredImagePublicId }, locale }`
  - 16:9 `<CldImage>` (lazy, w=480/h=270, sizes per Phase 3 catalog grid — same as RecipeCard)
  - Routed via `<Link>` from `@/i18n/navigation` so locale prefix is automatic
  - Reused by `/industries` index AND the Used-In section in 04-11
  - `data-testid="industry-card"` for closure assertions
  - **Intentional duplication vs RecipeCard** per plan 04-10 objective — each card type evolves independently with entity-specific v1.1 affordances.

### Task 10.2 — `/[locale]/industries` index + detail pages + sitemap extension + messages (commit `c9c3003`)

- **`src/app/[locale]/industries/page.tsx`** (RSC + Suspense shell)
  - `generateMetadata`: `title` + `description` from `public.industries.index` + `alternates` via `buildAlternates({ locale, pathPrefix: '/industries' })` — same path under each locale, no slug map
  - `IndustriesIndexContent`: `setRequestLocale(locale)` → `findPublishedIndustries(locale)` → grid of `<IndustryCard>` per industry, with localized empty state when 0 published industries
  - Cached fetch via `findPublishedIndustries`'s `'use cache'` + `cacheTag('industries:list:${locale}')` — invalidated by `revalidateIndustry(id)` from 04-03 fan-out
  - `data-testid="industries-list"` on the grid + `data-testid="industries-empty"` on the empty-state node

- **`src/app/[locale]/industries/[slug]/page.tsx`** (RSC + Suspense shell)
  - `generateMetadata`: `getIndustryBySlug(slug, locale)` → `notFound metadata` if null; else `title` + `description` + `alternates` via `buildAlternates({ slugByLocale: industry.slugByLocale })` (Pitfall #6 — null-locale slugs are omitted)
  - `IndustryDetailContent`:
    - `getIndustryBySlug` (filters status='published'; T-04-INFO-01 mitigation; cascades on missing/empty body per D-07) — `notFound()` on null
    - `getLinkedProductsForIndustry(industry.id, locale)` — powers TechArticle `mentions` array
    - When `industry.usedFallbackLocale != null`: composes the localized message via `next-intl` `public.localeFallback.industry.<fallbackLocale>` and mounts `<LocaleFallbackBanner entityType="industry">` at the top — REUSE, no new component
    - Hero `<CldImage>` (priority, w=1200, sizes=`(max-width: 900px) 100vw, 768px`) — industry page LCP
    - `<h1 data-testid="industry-title">` + `<p data-testid="industry-excerpt">` lede OUTSIDE the prose wrapper
    - `<div className="article-body prose prose-slate max-w-none" data-testid="industry-body">` inside `<article>` — prose styling scoped to body only
    - Body HTML via `renderTiptapToHtml(industry.translation.body as JSONContent)` — server-side static-renderer, zero client ProseMirror bundle
    - TechArticle JSON-LD: `techArticleJsonLd({ headline, excerpt, featuredImagePublicId, datePublished: (publishedAt ?? updatedAt).toISOString(), dateModified: updatedAt.toISOString(), inLanguage, canonicalUrl: HOST + canonicalPath, mentions })` → emitted via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />` (T-04-XSS-02 mitigation)

- **`src/lib/sitemap.ts`** — extended:
  - `/industries` appended to the static-paths array (sitemap-{locale}.xml emits the index URL alongside /, /categories, /manufacturers, /recipes)
  - New industries block — same `GROUP BY i.id, i.updated_at` pattern as recipes/products with `MAX(CASE WHEN it.locale=...)` per-locale slug pivot
  - `WHERE i.status = 'published'` — defense-in-depth filter alongside the public read helpers (T-04-INFO-01)
  - `pickSlug` skip when current-locale slug missing → emits hreflang alternates only for translation-present locales (Pitfall #6)
  - Existing `tests/api/sitemap.test.ts` `>= 14` assertion still satisfied (we only ADD entries; never remove)

- **`messages/{uz,ru,en}.json`** — added `public.industries.index.{title, subtitle, empty}` namespace (UZ "Sohalar"; RU "Отрасли"; EN "Industries"). The `public.localeFallback.industry.{uz,ru,en}` namespace was pre-shipped in 04-09, so the LocaleFallbackBanner copy required zero new strings here.

## Deviations from Plan

### Auto-fixed issues

**None.** Plan executed exactly as written. The plan's three deviation rules were not triggered:

- **Plan Rule 1** (sitemap.ts merge conflict between 04-09 + 04-10) — N/A in sequential mode; recipes block was already shipped in 04-09, industries block was simply appended.
- **Plan Rule 2** (LocaleFallbackBanner industry-specific message variant) — Not needed. The existing `public.localeFallback.industry` namespace from 04-09 already keys copy by fallback locale; component renders identically for both entity types in v1. The `entityType` prop is wired purely as a `data-entity-type` attribute hook for future styling differentiation (Playwright assertions in 04-12).
- **Plan Rule 3** (cacheComponents `rootParams: true` carry-forward) — no per-page change needed; inherited from Phase 3.

### Auth gates

None — execution was fully autonomous, no auth-required tooling invoked.

## Verification

- **`pnpm tsc --noEmit`** — clean (no errors).
- **`pnpm vitest run tests/lib/jsonld.test.ts tests/lib/tiptap-render.test.ts`** — 9/9 tests pass (industry-relevant logic: techArticleJsonLd helper + Tiptap static-renderer XSS escape are both reused unchanged from 04-09).
- **Full lib suite** — 9/10 test files pass; the single failure (`tests/lib/require-admin.test.ts`) is a Neon serverless `ECONNRESET` in the admin-session fixture's network call to Neon — pre-existing infra flake (same class of failure documented in 04-09 SUMMARY for `tests/api/autocomplete.test.ts`). This is NOT a regression caused by this plan: my changes touch only `src/components/public/industry-card.tsx`, `src/app/[locale]/industries/*`, `src/lib/sitemap.ts`, and the three messages files — none of which are loaded by the require-admin tests.
- **Manual smoke deferred to 04-12** per the plan: `/uz/industries` + `/uz/industries/<seed-slug>` browser visit; view-source assertion that `<script type="application/ld+json">` contains `"@type":"TechArticle"` is part of the 04-12 closure manual gate (DEF-4-12-02).

## Threat surface check

No new attack surface beyond what the plan's `<threat_model>` enumerates. All STRIDE entries are mitigated as designed:

- **T-04-XSS-01** (Industry body XSS) — `renderTiptapToHtml` SSOT call; the locked TIPTAP_EXTENSIONS array is the allow-list (verified in 04-02).
- **T-04-XSS-02** (TechArticle JSON-LD `</script>` termination) — `JSON.stringify(ld).replace(/</g, '\\u003c')` wrapper at the emit site (`src/app/[locale]/industries/[slug]/page.tsx` line ~141).
- **T-04-INFO-01** (draft serving) — `WHERE i.status='published'` enforced in `getIndustryBySlug` + `findPublishedIndustries` + `sitemap.ts` industries block.
- **T-04-INFO-02** (404 hreflang) — `buildAlternates({ slugByLocale })` omits null slots; sitemap industries block `pickSlug` skip when current-locale slug missing.
- **T-04-TAMP-01** (locale param injection) — handled by Phase 3 layout-level `hasLocale` guard at `src/app/[locale]/layout.tsx`.
- **T-04-TAMP-02** (slug SQL injection) — Drizzle parameterized `eq()` everywhere.
- **P4-4** (Schema mismatch — Yandex parses TechArticle on industry pages as type-mismatch) — `accept-with-deferred-validation`. Manual gate DEF-4-12-02 in plan 04-12 will run Rich Results Test for both Google + Yandex Webmaster; downgrade to Article in v1.1 if flagged.

## Self-Check: PASSED

**Files exist:**
- FOUND: `src/components/public/industry-card.tsx`
- FOUND: `src/app/[locale]/industries/page.tsx`
- FOUND: `src/app/[locale]/industries/[slug]/page.tsx`
- FOUND: `src/lib/sitemap.ts` (industries block present at line ~200+)
- FOUND: `messages/uz.json` + `messages/ru.json` + `messages/en.json` (public.industries.index namespace present)

**Commits exist:**
- FOUND: `579da49` (Task 10.1 — IndustryCard primitive)
- FOUND: `c9c3003` (Task 10.2 — index + detail + sitemap + messages)

## What's next

- **Plan 04-11** mounts the Used-In section on product detail using `RecipeCard` (04-09) + `IndustryCard` (this plan). Both card primitives have identical shape, simplifying the section's compose logic.
- **Plan 04-12** closure flips the Wave-0 e2e specs (Playwright IndustryDetailPage navigation + TechArticle JSON-LD substring assertion + LocaleFallbackBanner visibility on cascade fallback for entityType="industry") and runs the manual Rich Results Test gate against a Vercel preview URL — including the deferred Yandex type-mismatch validation for TechArticle on industry pages (P4-4 in the threat register).
- **Wave 3 closes** when 04-11 ships. Wave 4 (closure: 04-12) takes over.
