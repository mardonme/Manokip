---
phase: quick-260509-oha
plan: 01
subsystem: public-homepage
tags:
  - homepage
  - mock
  - showcase
  - throwaway
requires:
  - getRootCategories (src/lib/catalog.ts)
  - getCategoryProducts (src/lib/catalog.ts)
  - findPublishedIndustries (src/lib/industries.ts)
  - ContactButton (src/components/public/contact-button.tsx)
  - Gauge (src/components/public/gauge.tsx)
  - ProductCard (src/components/public/product-card.tsx)
provides:
  - Three-locale homepage mock at /[locale] (uz, ru, en)
  - home.* translation namespace shared across all 3 locales
affects:
  - src/app/[locale]/page.tsx (replaced)
  - messages/{uz,ru,en}.json (added home.* subtree)
key-files:
  created:
    - src/app/[locale]/_components/home-stat-ticker.tsx
  modified:
    - src/app/[locale]/page.tsx
    - messages/uz.json
    - messages/ru.json
    - messages/en.json
decisions:
  - Removed `export const revalidate = 60` — incompatible with project's `cacheComponents` Next.js 16 flag (caused HTTP 500). Cache/revalidation already flows through `'use cache'` + cacheTag in the data layer.
  - Filter pills below the Featured band are visual-only `<span>` chips (not links/buttons) per the throwaway scope — Phase 8 will wire interactivity.
  - Solutions band uses inline dark-themed JSX rather than the existing light-themed `<IndustryCard />` to avoid touching that Phase-4 component for a one-off background.
  - Hero gauge callouts are absolute-positioned pills around the gauge SVG; connecting lines were skipped as too fiddly for throwaway code.
metrics:
  duration: ~30 min
  completed: 2026-05-09
---

# Quick Task 260509-oha: Homepage Mock for Client Showcase — Summary

A three-locale (uz/ru/en) high-fidelity Phase-8 homepage mock at `/[locale]` composed of hero (Gauge + count-up stats + dual CTAs), 4×3 hairline category grid, featured-products band, dark Solutions band, and 3-tile service strip — all using REAL seeded data and existing Phase-6 reusable components. Throwaway code: Phase 8 plan 08-HOME-* will replace this file wholesale.

## What was built

### 1. Rebuilt `src/app/[locale]/page.tsx`

Pure RSC composing 5 sections from HOME-01..06:

| Section | HOME ID | Source data |
|---------|---------|-------------|
| Hero (eyebrow, h1 lockup, lede, 2 CTAs, 4-stat ticker, Gauge + 3 callouts) | HOME-01 | `home.hero.*` translations + Gauge + ContactButton |
| 4×3 hairline category grid | HOME-02 | `getRootCategories(locale)` + placeholder fill |
| Featured products band (4 products + 5 filter pills) | HOME-03 | `getCategoryProducts(firstCategory.id, locale, [], 1, 4)` → ProductCard |
| Dark Solutions band | HOME-04 | `findPublishedIndustries(locale)` or 4 placeholder titles |
| 3-tile service strip (calibration / warranty / certification) | HOME-05 | `home.service.fact{1,2,3}` translations |

Uses Phase-6 design tokens directly (`bg-surface`, `text-ink`, `text-ink-2`, `border-line`, `text-accent`, `.mk-eyebrow`, `.mk-mono`, `.mk-ph .mk-ph-corners`). No new CSS variables introduced.

### 2. New client island: `src/app/[locale]/_components/home-stat-ticker.tsx`

The single new component. Why a client island?

- The 5-section homepage is RSC and stays RSC for cacheability and SEO.
- The 4-stat strip needs a mounted-on-load count-up animation (rAF easeOutCubic, 1200ms) — that's the only piece that requires `useState` + `useEffect`.
- Phase 8 will likely replace this with a CSS-only counter or scroll-triggered effect, so we kept it minimal: ~50 lines, no external deps.

### 3. New `home.*` translation namespace in all 3 message files

Shape (mirrored across `messages/{uz,ru,en}.json`):

```
home
├── hero
│   ├── eyebrow, titleLine1, titleLine2, lede, ctaBrowse
│   ├── gaugeLabel, callout1, callout2, callout3
│   └── stats
│       ├── label{1..4}, value{1..4}, suffix{1..4}
├── categories
│   └── eyebrow, title, cardCaption, viewAll, placeholder
├── featured
│   └── eyebrow, title, viewAll, pillAll, empty
├── solutions
│   └── eyebrow, title, lede, cta, placeholderTitles
└── service
    ├── eyebrow, title
    └── fact{1,2,3}
        └── title, body
```

The "Request quote" hero primary CTA reuses the EXISTING `public.contact.cta` key via `<ContactButton />` — no duplicate key was added.

`solutions.placeholderTitles` is a single pipe-separated string per locale (split client-side by `|`) to keep the messages tree flat and identical across locales.

## Placeholder-fill rules

The seed-demo dataset (uz-only) means real data is sparse outside uz:

| What | uz | ru | en |
|------|----|----|----|
| Real seeded categories | 4 | 0 | 0 |
| Category grid placeholders (mk-ph) | 8 (pads to 4×3) | 12 | 12 |
| Real seeded products in first category | up to 4 | 0 | 0 |
| Featured-band fallback (`featured.empty`) | n/a | shown | shown |
| Real seeded industries | 0 | 0 | 0 |
| Solutions placeholder tiles (4 titles) | shown | shown | shown |

This is the intended graceful-degradation behavior for the showcase: ru/en still render every section without missing-translation literals.

## Decisions

- **`export const revalidate = 60` removed (Rule 1 fix).** The plan instructed adding the export, but Next.js 16 with the project's `cacheComponents` config rejects it at runtime (HTTP 500 on every `/[locale]` request). The data helpers already use `'use cache'` + `cacheTag()`, so revalidation continues to flow through the Phase-2 `revalidateCategory` / `revalidateIndustry` server actions — removing the segment-level knob is a no-op for cache behavior.
- **Filter pills are visual-only spans.** Throwaway scope; Phase 8 will wire real category filtering.
- **Solutions band uses inline dark JSX, not `<IndustryCard />`.** That component is light-themed (`bg-slate-50`); inlining the dark variant avoids touching Phase-4 code for a one-off mock background.
- **`aspect-[4/3]` normalized to `aspect-4/3`** for Tailwind 4 canonical-class lint cleanliness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `export const revalidate = 60` caused HTTP 500**
- **Found during:** dev-server smoke test after Tasks 1+2
- **Issue:** Plan instructed `export const revalidate = 60;` at the top of `page.tsx`. Next 16 with `cacheComponents` enabled rejects the export with `Route segment config "revalidate" is not compatible with nextConfig.cacheComponents. Please remove it.`
- **Fix:** Removed the export and replaced it with a comment explaining the data-layer caching strategy.
- **Files modified:** `src/app/[locale]/page.tsx`
- **Commit:** `0c70dc0`

**2. [Rule 1 - Bug] Tailwind canonical-class lint warnings**
- **Found during:** IDE diagnostics post-edit
- **Fix:** Replaced two `aspect-[4/3]` occurrences with `aspect-4/3`.
- **Commit:** `0c70dc0` (same commit as fix #1)

## Verification

- `pnpm tsc --noEmit` → exit 0 (clean) after both auto tasks and after the runtime fix.
- `node -e "..."` JSON shape verifier (Task 2 done criterion) → printed `uz ok / ru ok / en ok`, exit 0.
- Commerce-token grep on the two new files → no matches (no `price | cart | qty | stock | currency | сум | sum | so'm | UZS | RUB | USD`).
- Dev server smoke test (`pnpm dev` + curl):
  - `GET /uz` → HTTP 200, contains all 5 section markers + `data-testid` for `home-stat-ticker`, `gauge-svg`, `contact-button`, `product-card`.
  - `GET /ru` → HTTP 200, all section markers + ticker/gauge/contact-button (product-card 0 because seed-demo is uz-only — `featured.empty` placeholder visible).
  - `GET /en` → HTTP 200, same as ru.
  - No missing-translation literals (`home.hero.*` etc.) appear in any rendered HTML.
  - Server log shows no red errors related to the new code (one pre-existing `seed cat` duplicate-key warning is from elsewhere in the app, not page.tsx).

## Deferred Issues

- **`pnpm lint` is broken project-wide.** `next lint` interprets the trailing word as a project directory (`Invalid project directory provided, no such directory: .../lint`). `pnpm exec eslint` fails with `Cannot find package '@eslint/eslintrc' imported from eslint.config.mjs`. Both are pre-existing config issues unrelated to this quick task — out of scope per executor scope-boundary rule. File a separate ticket / quick task to fix the eslint config.
- **Pre-existing duplicate React key warning** (`seed cat`) seen in the dev server log originates outside `page.tsx` (grep across `src/` finds no match — likely in a node_modules seeded preview).
- **`scripts/seed-demo.ts` has uncommitted changes** unrelated to this task; left untouched.

## Pending: Visual Sign-off Checkpoint (Task 3)

Per the plan's `<task type="checkpoint:human-verify" gate="blocking">`, a human must visually verify the mock at `/[locale]` for uz/ru/en at desktop (1440px), tablet (768px), and mobile (375px) widths. The agent successfully ran the dev server and confirmed all 3 locales return HTTP 200 with all 5 section markers + the expected data-testids in the HTML, but the visual / layout / hover-state / animation evaluation requires human eyes.

**To complete the visual checkpoint:**

1. Run `pnpm dev` and open `http://localhost:3000/uz`, `/ru`, `/en` at 1440px width.
2. Confirm in EACH locale:
   - Hero shows eyebrow + 2-line h1 + lede + 2 CTAs + 4-stat strip (numbers animate from 0 once on load) + Gauge SVG with 3 callout pills.
   - Primary CTA opens the Phase-5 contact dialog.
   - Secondary CTA navigates to `/[locale]/categories`.
   - Category grid is a 4×3 hairline grid; uz shows 4 real categories + 8 placeholders, ru/en show 12 placeholders.
   - Featured band: uz shows 4 ProductCards + 5 filter pills; ru/en show the empty-state placeholder.
   - Dark Solutions band: 4 placeholder tiles (no industries seeded yet).
   - Service strip: 3 cells with hairline dividers, accent-blue numbers, calibration/warranty/certification copy.
   - Page background `#f5f3ee`, body text `#14161b`, accent strokes `#1240e5`.
3. Resize to 768px and 375px: category grid should collapse 4 → 2 → 1 cols, product grid 4 → 2 → 1, service strip stacks.
4. DevTools console: zero new red errors (the pre-existing `seed cat` duplicate-key warning is unrelated).

If anything looks off, file follow-up notes back to the agent. If approved, the worktree commits below can be merged into the showcase branch.

## Self-Check: PASSED

Verified the following exist on disk and in git:

- `src/app/[locale]/page.tsx` — modified ✓
- `src/app/[locale]/_components/home-stat-ticker.tsx` — created ✓
- `messages/uz.json` — modified, includes `home` namespace ✓
- `messages/ru.json` — modified, includes `home` namespace ✓
- `messages/en.json` — modified, includes `home` namespace ✓
- Commit `a320150` (Task 1: page rebuild + ticker) ✓
- Commit `3175efe` (Task 2: home.* translations) ✓
- Commit `0c70dc0` (Rule 1 fix: revalidate + aspect classes) ✓
- All 3 locales return HTTP 200 from dev server with all 5 section markers ✓

## Throwaway caveat

This entire homepage is a **client-showcase mock** scheduled for wholesale replacement by Phase 8 plan `08-HOME-*`. The intent is fidelity for a single demo, not maintainability. No tests were added, no shared components were extracted, and the filter-pill / placeholder-cell interactivity was deliberately left visual-only.
