---
phase: 04-content-features
plan: 09
subsystem: recipe-public-pages
tags: [public, recipes, rsc, tiptap, jsonld, sitemap, cont-03, cont-06]
requires:
  - 04-02  # renderTiptapToHtml SSOT renderer + TIPTAP_EXTENSIONS allow-list
  - 04-03  # getRecipeBySlug + findPublishedRecipes + getLinkedProductsForRecipe + techArticleJsonLd
  - 04-05  # Server Actions (recipes must be authorable for content to exist; not strictly required to compile)
provides:
  - "/[locale]/recipes index RSC page (cards grid)"
  - "/[locale]/recipes/[slug] detail RSC page (Tiptap body + TechArticle JSON-LD + locale-fallback banner)"
  - RecipeCard primitive (reused by Used-In on product detail in 04-11)
  - LocaleFallbackBanner client primitive (Phase 3 D-05 cascade banner with dismiss button)
  - sitemap recipe entries (per-locale, hreflang alternates; sitemap.xml gains /recipes static index)
affects:
  - src/lib/sitemap.ts (extended buildLocaleSitemapEntries with recipes block + /recipes static path)
  - messages/{uz,ru,en}.json (added public.localeFallback.recipe + public.localeFallback.industry + public.recipes.index namespaces)
tech-stack:
  added: []
  patterns:
    - "RSC + Suspense shell from Phase 3 (manufacturers / products detail pattern)"
    - "JSON-LD < escape via JSON.stringify(obj).replace(/</g, '\\\\u003c') for </script> termination guard (Phase 3 D-09 carry-forward; T-04-XSS-02)"
    - "prose prose-slate scoped to a child div (Deviation Rule 2 — page <h1>/excerpt outside the prose typography)"
    - "TechArticle JSON-LD via techArticleJsonLd helper (D-10 LOCKED; manual Yandex gate validates in 04-12)"
    - "Locale fallback cascade banner mounted only when getRecipeBySlug returns usedFallbackLocale != null (D-07)"
    - "sitemap recipes block mirrors products GROUP BY pattern; status='published' filter inside SQL (T-04-INFO-01 mitigation)"
key-files:
  created:
    - src/components/public/recipe-card.tsx
    - src/components/public/locale-fallback-banner.tsx
    - src/app/[locale]/recipes/page.tsx
    - src/app/[locale]/recipes/[slug]/page.tsx
  modified:
    - src/lib/sitemap.ts
    - messages/uz.json
    - messages/ru.json
    - messages/en.json
decisions:
  - "LocaleFallbackBanner is a client component ('use client') with a stateful dismiss button (per the prompt's reading of Phase 3 D-05 spec); the parent RSC composes the localized message via next-intl and passes it down as a prop, keeping the component locale-agnostic"
  - "datePublished falls back to updatedAt when recipe.publishedAt is null (TechArticle requires a non-null datePublished; a published recipe with null publishedAt would be a data-integrity bug, but we render rather than crash — Phase-2 D-11 atomic dual-column lifecycle should prevent this in practice)"
  - "/recipes added to the static-paths array of buildLocaleSitemapEntries so the index URL appears in sitemap-{locale}.xml alongside /, /categories, /manufacturers"
  - "No CollectionPage JSON-LD on the index page in v1 (deferred per plan; the page emits Article-collection meta only via title/description); v1.1 follow-up if Yandex Rich Results requests it"
  - "Body HTML rendered inside <article> wrapper but the prose styling lives on a CHILD div ('article-body prose prose-slate max-w-none') so the page <h1> + lede paragraph keep their non-prose typography (Plan Deviation Rule 2)"
  - "Per Plan Rule 1: getRecipeBySlug already returns slugByLocale; getLinkedProductsForRecipe is the separate helper that powers JSON-LD mentions (no signature change to getRecipeBySlug needed — the rule's first branch was the right call in 04-03)"
metrics:
  duration: "~25 minutes"
  tasks: 3
  files: 9
  completed: 2026-05-01T10:45Z
---

# Phase 04 Plan 09: Recipe public pages — Summary

**One-liner:** Public recipe surface lands — `/[locale]/recipes` (RSC card grid via RecipeCard) + `/[locale]/recipes/[slug]` (RSC detail with server-side Tiptap body via `renderTiptapToHtml`, TechArticle JSON-LD with `<` escape, LocaleFallbackBanner mounted on cascade fallback, CldImage hero with priority for LCP). `src/lib/sitemap.ts` extended with the recipes block + `/recipes` static index path; per-locale hreflang alternates emitted for every published recipe.

## What shipped

### Task 9.1 — Public primitives (commit `53399b0`)

- **`src/components/public/locale-fallback-banner.tsx`** (client component, 'use client')
  - Props: `{ message, fallbackLocale, requestedLocale, entityType: 'recipe' | 'industry' }`
  - Renders an amber-tinted alert with a dismiss button (stateful — `useState` for dismissed flag)
  - `data-testid="locale-fallback-banner"` + `data-fallback-locale` + `data-requested-locale` + `data-entity-type` data attrs for Playwright assertions in 04-12 closure
  - Locale-agnostic — parent RSC composes the message via `next-intl` and passes it down

- **`src/components/public/recipe-card.tsx`** (RSC, no 'use client')
  - Props: `{ recipe: { id, title, slug, excerpt, featuredImagePublicId }, locale }`
  - 16:9 `<CldImage>` (lazy, w=480/h=270, sizes per Phase 3 catalog grid)
  - Routed via `<Link>` from `@/i18n/navigation` so locale prefix is automatic
  - Reused by `/recipes` index AND the Used-In section in 04-11
  - `data-testid="recipe-card"` for closure assertions

- **Messages files** — added 3 new namespaces to `messages/{uz,ru,en}.json`:
  - `public.localeFallback.recipe.{uz,ru,en}` — banner copy keyed by the resolved fallback locale
  - `public.localeFallback.industry.{uz,ru,en}` — same shape (consumed by 04-10 industry detail page)
  - `public.recipes.index.{title, subtitle, empty}` — index page header copy

### Task 9.2 — `/[locale]/recipes` index page (commit `d842f88`)

- **`src/app/[locale]/recipes/page.tsx`** (RSC + Suspense shell)
  - `generateMetadata`: `title` + `description` from `public.recipes.index` + `alternates` via `buildAlternates({ locale, pathPrefix: '/recipes' })` — same path under each locale, no slug map
  - `RecipesIndexContent`: `setRequestLocale(locale)` → `findPublishedRecipes(locale)` → grid of `<RecipeCard>` per recipe, with localized empty state when 0 published recipes
  - Cached fetch via `findPublishedRecipes`'s `'use cache'` + `cacheTag('recipes:list:${locale}')` — invalidated by `revalidateRecipe(id)` from 04-03 fan-out
  - `data-testid="recipes-list"` on the grid + `data-testid="recipes-empty"` on the empty-state node

### Task 9.3 — `/[locale]/recipes/[slug]` detail + sitemap extension (commit `63d19fb`)

- **`src/app/[locale]/recipes/[slug]/page.tsx`** (RSC + Suspense shell)
  - `generateMetadata`: `getRecipeBySlug(slug, locale)` → `notFound metadata` if null; else `title` + `description` + `alternates` via `buildAlternates({ slugByLocale: recipe.slugByLocale })` (Pitfall #6 — null-locale slugs are omitted)
  - `RecipeDetailContent`:
    - `getRecipeBySlug` (filters status='published'; T-04-INFO-01 mitigation; cascades on missing/empty body per D-07) — `notFound()` on null
    - `getLinkedProductsForRecipe(recipe.id, locale)` — powers TechArticle `mentions` array
    - When `recipe.usedFallbackLocale != null`: composes the localized message via `next-intl` `public.localeFallback.recipe.<fallbackLocale>` and mounts `<LocaleFallbackBanner>` at the top
    - Hero `<CldImage>` (priority, w=1200, sizes=`(max-width: 900px) 100vw, 768px`) — recipe page LCP
    - `<h1 data-testid="recipe-title">` + `<p data-testid="recipe-excerpt">` lede OUTSIDE the prose wrapper
    - `<div className="article-body prose prose-slate max-w-none" data-testid="recipe-body">` inside `<article>` — prose styling scoped to body only
    - Body HTML via `renderTiptapToHtml(recipe.translation.body as JSONContent)` — server-side static-renderer, zero client ProseMirror bundle
    - TechArticle JSON-LD: `techArticleJsonLd({ headline, excerpt, featuredImagePublicId, datePublished: (publishedAt ?? updatedAt).toISOString(), dateModified: updatedAt.toISOString(), inLanguage, canonicalUrl: HOST + canonicalPath, mentions })` → emitted via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />` (T-04-XSS-02 mitigation)

- **`src/lib/sitemap.ts`** — extended:
  - `/recipes` appended to the static-paths array (sitemap-{locale}.xml emits the index URL alongside /, /categories, /manufacturers)
  - New recipes block — same `GROUP BY r.id, r.updated_at` pattern as products with `MAX(CASE WHEN rt.locale=...)` per-locale slug pivot
  - `WHERE r.status = 'published'` — defense-in-depth filter alongside the public read helpers (T-04-INFO-01)
  - `pickSlug` skip when current-locale slug missing → emits hreflang alternates only for translation-present locales (Pitfall #6)
  - Existing `tests/api/sitemap.test.ts` `>= 14` assertion still satisfied (we only ADD entries; never remove)

## Deviations from Plan

### Auto-fixed issues

**None.** Plan executed exactly as written. The two pre-emptive deviations the plan called out were already accounted for during authorship:

- **Plan Rule 1** (`getRecipeBySlug` linked-products shape) — the plan's first branch was correct. `getLinkedProductsForRecipe` already exists as a separate helper in `src/lib/recipes.ts` (shipped in 04-03) and was wired here without a signature change to `getRecipeBySlug`.
- **Plan Rule 2** (prose Tailwind-typography conflict with page <h1>) — applied pre-emptively. The detail page renders `<h1>` + excerpt outside the `prose` wrapper and uses a child `<div className="article-body prose prose-slate max-w-none">` for the body HTML. This keeps page-level headings on their non-prose typography (text-4xl font-semibold tracking-tight) and lets the article body inherit prose-slate defaults for h2/h3/lists/blockquote/code.
- **Plan Rule 3** (cacheComponents `rootParams: true` carry-forward) — no per-page change needed; inherited from Phase 3.

### Auth gates

None — execution was fully autonomous, no auth-required tooling invoked.

## Verification

- **`pnpm tsc --noEmit`** — clean (no errors).
- **`pnpm vitest run tests/lib/jsonld.test.ts tests/lib/tiptap-render.test.ts`** — 9/9 tests pass (recipe-relevant logic suites).
- **Full lib + api suite** — 12/13 test files pass; the single failure (`tests/api/autocomplete.test.ts`) is a Neon serverless `ECONNRESET` in the seed-fixture teardown (pre-existing infra constraint, NOT a code regression caused by this plan; the failure is in the seed-public fixture's network call to Neon, not in any sitemap or recipe assertion).
- **Manual smoke deferred to 04-12** per the plan: `/uz/recipes` + `/uz/recipes/<seed-slug>` browser visit; view-source assertion that `<script type="application/ld+json">` contains `"@type":"TechArticle"` is part of the 04-12 closure manual gate.

## Threat surface check

No new attack surface beyond what the plan's `<threat_model>` enumerates. All STRIDE entries are mitigated as designed:

- T-04-XSS-01 (Tiptap body XSS) — `renderTiptapToHtml` SSOT call; the locked TIPTAP_EXTENSIONS array is the allow-list (verified in 04-02).
- T-04-XSS-02 (JSON-LD `</script>` termination) — `JSON.stringify(ld).replace(/</g, '\\u003c')` wrapper at every emit site (recipe detail page line ~131).
- T-04-INFO-01 (draft serving) — `WHERE status='published'` enforced in `getRecipeBySlug` + `findPublishedRecipes` + `sitemap.ts` recipes block.
- T-04-INFO-02 (404 hreflang) — `buildAlternates({ slugByLocale })` omits null slots; sitemap recipes block `pickSlug` skip when current-locale slug missing.
- T-04-TAMP-01 (locale param injection) — handled by Phase 3 layout-level `hasLocale` guard at `src/app/[locale]/layout.tsx`.
- T-04-TAMP-02 (slug SQL injection) — Drizzle parameterized `eq()` everywhere.

## Self-Check: PASSED

**Files exist:**
- FOUND: `src/components/public/locale-fallback-banner.tsx`
- FOUND: `src/components/public/recipe-card.tsx`
- FOUND: `src/app/[locale]/recipes/page.tsx`
- FOUND: `src/app/[locale]/recipes/[slug]/page.tsx`
- FOUND: `src/lib/sitemap.ts` (recipes block present at line ~167+)
- FOUND: `messages/uz.json` + `messages/ru.json` + `messages/en.json` (public.localeFallback + public.recipes namespaces present)

**Commits exist:**
- FOUND: `53399b0` (Task 9.1 — primitives + messages)
- FOUND: `d842f88` (Task 9.2 — index page)
- FOUND: `63d19fb` (Task 9.3 — detail page + sitemap)

## What's next

- **Plan 04-10** mirrors this plan for industries (`/[locale]/industries` + `/[locale]/industries/[slug]`). The `LocaleFallbackBanner` already accepts `entityType: 'industry'` and the messages files already carry the `public.localeFallback.industry` namespace, so 04-10 inherits the wiring with zero change to either.
- **Plan 04-11** mounts the Used-In section on product detail using `RecipeCard` (this plan) + `IndustryCard` (04-10).
- **Plan 04-12** closure flips the Wave-0 e2e specs (Playwright RecipeDetailPage navigation + TechArticle JSON-LD substring assertion + LocaleFallbackBanner visibility on cascade fallback) and runs the manual Rich Results Test gate against a Vercel preview URL.
