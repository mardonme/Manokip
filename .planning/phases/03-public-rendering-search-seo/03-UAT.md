---
status: complete
phase: 03-public-rendering-search-seo
source:
  - 03-01-SUMMARY.md
  - 03-02-SUMMARY.md
  - 03-03-SUMMARY.md
  - 03-04-SUMMARY.md
  - 03-05-SUMMARY.md
  - 03-06-SUMMARY.md
  - 03-07-SUMMARY.md
  - 03-08-SUMMARY.md
  - 03-09-SUMMARY.md
started: 2026-05-01T00:00:00Z
updated: 2026-05-01T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running `next dev` / `next start`. Run `pnpm dev` (or `pnpm build && pnpm start`) from a clean shell. Server boots without errors, the Phase-3 schema migration is applied to Neon dev, and visiting `http://localhost:3000/` 307-redirects to `/uz/` and renders the homepage.
result: issue
reported: "[@sentry/nextjs] DEPRECATION WARNING: disableLogger is deprecated and will be removed in a future version. Use webpack.treeshake.removeDebugLogging instead. (Not supported with Turbopack.) - Cache Components enabled - Experiments (use with caution): · clientTraceMetadata ○ Compiling /_not-found/page ... GET / 404 in 5.0s (next.js: 4.4s, application-code: 579ms) ○ Compiling /[locale] ... GET /favicon.ico 404 in 5.0s (next.js: 4.4s, generate-params: 967ms, application-code: 602ms)"
severity: blocker

### 2. Locale Switcher Site-Wide
expected: On any page, click the locale switcher in the site header. Switching from `uz → ru → en` updates the URL prefix (`/uz/...` → `/ru/...` → `/en/...`) and the page content (nav, headings, body copy) re-renders in the chosen locale. Returning to a previous locale preserves the same path shape.
result: pass

### 3. Category Tree Browse
expected: Open the site header's category nav. Categories render as a tree (parent → child). Clicking a category navigates to `/[locale]/categories/<slug>` and shows that category's product grid.
result: pass

### 4. Category Faceted Filters
expected: On a category listing page, the sidebar exposes filters driven by the category's typed spec schema — numeric ranges, enum selections, boolean toggles. Applying a filter narrows the visible product cards AND reflects the filter state in the URL via nuqs (so the filtered view is shareable). Clearing filters resets the grid.
result: pass

### 5. Product Detail Page
expected: From a category page, click a product card. The product detail page (`/[locale]/products/<slug>`) renders with: grouped spec tables (fiztech-density), image gallery, manufacturer attribution card, downloadable datasheets/certificates, key-facts ribbon, sticky CTA rail. First-byte HTML is real SSR (not a loading state).
result: pass

### 6. Product JSON-LD
expected: View source on a product detail page. You see Product + BreadcrumbList JSON-LD blocks (no `offers` field per D-08). Optionally validate at the Rich Results Test (`https://search.google.com/test/rich-results`) — should report 0 errors.
result: pass

### 7. Search — Locale-Ranked Results
expected: Click the header search box, type a query (e.g. a partial product name) in your current locale, submit. The `/[locale]/search?q=...` page renders ranked results from the per-locale `tsvector`. Each result row shows manufacturer name + category breadcrumb.
result: pass

### 8. Search — SKU Exact-Match Redirect
expected: In the search box, type the exact SKU of a known product (case-insensitive) and submit. The browser is 302-redirected to `/[locale]/products/<slug>` directly (no intermediate results page).
result: pass

### 9. Search — Cascade Fallback Banner
expected: Search for a term that has 0 hits in your current locale but exists in another locale. Results render from the fallback locale (cascade: current → uz → ru → en) and a banner indicates "shown in [other locale]".
result: pass

### 10. Search Autocomplete
expected: Type 2+ characters into the header search box. A dropdown shows ≤10 suggestions: prefix-matching products with manufacturer + category breadcrumb chips, with any exact SKU match elevated to the top. Clicking a suggestion navigates to that product.
result: pass

### 11. Manufacturer Pages
expected: Navigate to `/[locale]/manufacturers`. The index lists every manufacturer with logo. Clicking a manufacturer opens `/[locale]/manufacturers/<slug>` with their product list, official-rep badge (when set), and relationship note.
result: pass

### 12. Sitemap Index + Per-Locale Sitemaps
expected: Visit `/sitemap-index.xml` — lists 3 children (`sitemap-uz.xml`, `sitemap-ru.xml`, `sitemap-en.xml`). Visit `/sitemap-uz.xml` — lists every published product, category, and manufacturer in uz with `<xhtml:link rel="alternate" hreflang=...>` for all 3 locales + `x-default`. Same shape for ru and en.
result: pass

### 13. Robots.txt
expected: Visit `/robots.txt`. Allows all crawlers (`Allow: /`) and includes `Sitemap: https://manometr.uz/sitemap-index.xml`.
result: pass

### 14. Hreflang + Canonical (Manual)
expected: View source on `/uz/`, `/uz/categories/<slug>`, `/uz/products/<slug>`, `/uz/manufacturers/<slug>`. Each page has `<link rel="canonical">` for the current-locale URL and `<link rel="alternate" hreflang="uz|ru|en|x-default">` for all three locales. (The automated `tests/e2e/seo-coverage.spec.ts` covers this against a Vercel preview — manual visual confirmation here is the cross-check.)
result: pass

### 15. Cyrillic + Uzbek-Latin Glyph Rendering (Manual)
expected: On `/ru/products/<slug>` confirm Cyrillic glyphs render cleanly. On `/uz/products/<slug>` confirm Uzbek Latin modifier letters `oʻ` and `gʻ` (U+02BB) render correctly (NOT as `o'` / `g'` ASCII apostrophes, NOT as boxes). `next/font` Inter subsets `['latin','latin-ext','cyrillic']` should cover both.
result: pass

## Summary

total: 15
passed: 14
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Visiting / 307-redirects to /<detected-locale>/ and renders the homepage"
  status: failed
  reason: "User reported: GET / 404 in 5.0s — Next.js compiled /_not-found/page for the root request instead of running the locale-redirect proxy. Sidecars: Sentry disableLogger deprecation warning (Turbopack incompatibility) + Cache Components enabled + clientTraceMetadata experiment active."
  severity: blocker
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
