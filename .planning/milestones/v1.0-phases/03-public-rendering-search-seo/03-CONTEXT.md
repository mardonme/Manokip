# Phase 3: Public Rendering, Search, SEO - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the entire trilingual public-facing surface: locale switcher site-wide, persistent category-tree navigation, category listing pages with typed-spec faceted filters (URL state via nuqs), fiztech-density product detail pages with grouped spec tables and downloadable PDFs, full-text search per-locale `tsvector` with locale fallback + autocomplete + exact part-number short-circuit, manufacturer SEO landing pages, per-locale canonical + hreflang for `uz`/`ru`/`en` + `x-default`, per-locale XML sitemaps referenced from `robots.txt`, Product/Organization/CollectionPage/BreadcrumbList JSON-LD that validates in the Rich Results Test, and a Slow-4G Core-Web-Vitals-passing LCP on the product detail page.

Phase 3 does NOT build any admin CRUD surfaces (those shipped in Phase 2), the recipe/industry rich-text editor (Phase 4), recipe/industry public pages (Phase 4), the contact form (Phase 5), observability hardening (Phase 5), or the launch dogfood gate (Phase 5). Phase 3 also does NOT add new admin requirements — the `manufacturer.is_official_rep` schema additive (D-10 below) extends an existing Phase-2 surface.

Covers requirements: **CAT-01..08, SRCH-01..05, MFG-01..02, SEO-01..05**.

</domain>

<decisions>
## Implementation Decisions

### Visual direction (locked from sketches 001/002/003)

- **D-01:** **Product detail page is sketch 003 — premium-SaaS finish.** Slate/charcoal palette (`#0f172a` text on `#f8fafc` bg) with deep blue primary `#1e40af`. Inter typography with cv11+ss01 OpenType features and tabular numerics throughout. Frosted-glass sticky header with `backdrop-filter: blur(14px)`. Two-column layout: 1fr (gallery + meta + key-facts ribbon + spec tables + manufacturer card + applications) on the left + 380px sticky CTA rail on the right (CTA card with eyebrow + headline + 4 trust bullets + 3 stacked buttons + phone/email block + trust strip + downloads list + dark help-card with technical-specialist avatar). Below 1100px viewport the rail collapses to a stacked card. The hand-drawn gauge SVG in sketch 003 is illustrative — production uses `<CldImage>` with the same 4:3 aspect ratio.

- **D-02:** **Catalog/listing page is sketch 002 variant A — left sidebar filters + 3-column grid.** Persistent left rail with collapsible filter groups: numeric range with dual-input + slider, enum checkboxes with server-aggregate counts (`142` next to `1.6`), bool toggles with descriptions, manufacturer enum with `+ ещё N` overflow. Active filters render as removable pills above the grid. URL state via nuqs (`page`, `pageSize`, `q`, `sort`, plus per-spec-key params). Mobile (<900px) collapses sidebar to a drawer button.

- **D-03:** **Compare-products (sketch 002-C bottom tray) is deferred to v1.1 backlog.** NOT in CAT-01..08 — a scope expansion would add ~2–3 plans (compare state model, compare page route with side-by-side spec table, share-compare URL). Logged as a backlog entry; do NOT render compare UI in Phase 3.

- **D-04:** **Default theme is the slate-blue premium-SaaS direction from sketch 003.** Industrial-clean default theme (`.planning/sketches/themes/default.css`) and the dense alt theme (`themes/dense.css`) remain in the sketches directory as historical artifacts — the production CSS variable system reuses sketch-003's palette, spacing scale, and shadow system as its baseline.

### Search UX & locale fallback (SRCH-01..05)

- **D-05:** **Locale fallback chain when current-locale tsvector returns 0 hits: current → uz → ru → en (cascade, stop at first non-empty).** Search runs against the current-locale `product_search` row first. If 0 hits, run against `uz`, then `ru`, then `en`. Display ONLY the first non-empty fallback locale's results with a banner: `"Показаны результаты на русском — нет совпадений на узбекском"` (per locale). Display the `<product_translations>` row matching the *current* visible locale (or fallback to the locale-where-found row if the visible locale has no translation, per D-05 of phase 1 / D-11 of phase 2). uz is the fallback root because uz is the default locale and most likely to have data given the audience.

- **D-06:** **Autocomplete content: products + part numbers only.** As the user types in the global search bar, suggest matching product names by prefix + exact part-number matches highlighted at the top. Each suggestion row shows breadcrumb chips (manufacturer name + category name in the current locale) so the engineer can disambiguate. Manufacturers and categories do NOT get their own dropdown sections in v1 — keeps the dropdown fast (single query path) and on-task.

- **D-07:** **Exact part-number match short-circuits via 302-redirect.** If the search query exactly matches a `product.sku` (case-insensitive, trimmed), 302-redirect to the product detail page in the current locale (`/[locale]/products/<slug>`). Implemented at the `/[locale]/search?q=...` route handler before rendering results. The user typed a specific part number — they want the page, not a list.

### Public-facing schema markup (CAT-08, SEO-04)

- **D-08:** **Product JSON-LD omits `offers` entirely.** Manometr is informational (no price, no inventory, no cart). Emit `Product` with `name`, `image` (Cloudinary CDN URL via `getCldImageUrl`), `description`, `brand` (manufacturer Organization sub-object), `sku`, `gtin`/`mpn` if available — but no `offers`. Loses Google rich-results product-snippet eligibility (Google requires `offers` or `aggregateRating`); this is an explicit honesty tradeoff. Yandex still parses `Product` cleanly. Product knowledge-graph signal is preserved.

- **D-09:** **Phase-3 JSON-LD set: `Product` (detail) + `Organization` (root layout, all pages) + `BreadcrumbList` (every nav-aware page) + `CollectionPage` (category listings).** All four are mandatory per CAT-08 + SEO-04 wording. Implementation: a typed helper `src/lib/jsonld.ts` exports `productJsonLd(p)`, `organizationJsonLd()`, `breadcrumbJsonLd(crumbs)`, `collectionPageJsonLd(category, items)` — emitted as `<script type="application/ld+json">` server-rendered (RSC). `ImageObject` and `AggregateRating` are explicitly DEFERRED — `AggregateRating` would require fabricating ratings (manual penalty risk); `ImageObject` is low-impact and not requirement-mandated.

### Manufacturer pages (MFG-01, MFG-02)

- **D-10:** **Per-manufacturer SEO landing pages at `/[locale]/manufacturers/<slug>` + index at `/[locale]/manufacturers`.** Each manufacturer landing page renders: logo (Cloudinary `<CldImage>`), 3-locale bio (the existing `manufacturer_translations.description` field), `is_official_rep` verified badge if true (per D-11), per-locale `relationship_note` paragraph (per D-11), paginated product list scoped to that manufacturer (reuses the catalog `DataTable`-equivalent server-paginated grid pattern). Per-locale canonical + hreflang. Index page `/[locale]/manufacturers` shows all manufacturers as cards (logo + name + product count + "Authorized" pill if applicable). Each manufacturer becomes its own ranked landing page for branded queries (e.g., "WIKA Узбекистан"), aligned with PROJECT.md's "authoritative source" positioning.

- **D-11:** **Phase-3 ships an additive schema migration for `manufacturer.is_official_rep` + `manufacturer_translations.relationship_note`.** Migration adds `manufacturer.is_official_rep BOOLEAN NOT NULL DEFAULT false` and `manufacturer_translations.relationship_note TEXT NULL` (the per-locale text that becomes "Официальный представитель WIKA в Узбекистане с 2019 г." on the public side). Admin UI for both fields gets folded into the existing manufacturer-edit page (shipped in Phase 2 plan 02-10) — small admin-side extension is part of Phase-3 scope. The `is_official_rep` flag drives the rendering of the `Verified` pill on both the product detail page (D-01) and the manufacturer landing page (D-10).

### Claude's Discretion

The planner and researcher may decide these without asking the user again — the carry-forward decisions and phase-1/phase-2 patterns are sufficient signal:

- **Cache + ISR strategy.** Default to Next 16 RSC + ISR with `cacheLife('max')`; reuse the 7 typed `revalidate*` helpers from phase-2 plan 02-05. Search-results pages: planner's call (per-query-per-locale tag with short TTL is the obvious shape; fully dynamic is also acceptable for v1).
- **Sitemap segmentation.** Per-locale `sitemap-uz.xml`, `sitemap-ru.xml`, `sitemap-en.xml` referenced from a `sitemap-index.xml`, in turn referenced from `robots.txt`. Regenerated on `revalidateTag('sitemap')` (already wired by phase-2 plan 02-05).
- **404 vs locale-fallback for missing translations.** Mostly answered by D-05's cascade; the planner picks the exact handler at the route level (likely middleware-driven for slug resolution, page-level for content rendering).
- **Filter-empty-state copy.** Standard "Нет товаров по выбранным фильтрам — попробуйте сбросить какой-нибудь фильтр" is fine; localize per locale.
- **LCP image strategy.** `<CldImage>` with responsive `sizes` and `priority` on the hero image; `loading="lazy"` on gallery thumbs.
- **Typeface choice.** Inter (chosen in sketch 003) is the recommended baseline. Researcher may evaluate Golos Text or IBM Plex if a stronger Cyrillic/Latin pairing emerges, but the default is Inter with subsets `['latin','latin-ext','cyrillic']` already locked in Phase-1 plan 01-04.
- **`autocomplete` query implementation.** Single `tsvector` prefix query against the current-locale `product_search` row + a UNION on `LOWER(product.sku) LIKE $1 || '%'` — planner picks the exact SQL.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements

- `.planning/ROADMAP.md` §"Phase 3: Public Rendering, Search, SEO" — phase goal + 5 success criteria + requirement IDs (CAT-01..08, SRCH-01..05, MFG-01..02, SEO-01..05).
- `.planning/REQUIREMENTS.md` §"Public Catalog (CAT)", §"Search (SRCH)", §"Partners / manufacturers (MFG)", §"SEO / presentation (SEO)" — full requirement text per ID.
- `.planning/PROJECT.md` §"Validated" + §"Active" — what already shipped in Phases 1–2 + what Phase 3 still needs to deliver.

### Architecture + tech stack

- `.planning/research/ARCHITECTURE.md` §"Pattern 5: Full-text search — one `product_search` row per (product, locale)" — schema declared in Phase 1, populated transactionally on the product write path in Phase 3.
- `.planning/research/ARCHITECTURE.md` §"Pattern 3: Locale routing via `[locale]` segment + middleware rewrite" — middleware contract.
- `.planning/research/STACK.md` — version pins (Next.js 16 App Router + RSC, next-intl v4, Drizzle, Postgres native FTS with `unaccent` + `pg_trgm`, Cloudinary + `next-cloudinary`).

### Carry-forward decisions

- `.planning/phases/01-foundations/01-CONTEXT.md` §"Implementation Decisions" — D-02 default `uz`, D-03 detection cascade, D-04 next-intl `localePrefix:always`, locale-redirect e2e contract.
- `.planning/phases/02-admin-panel/02-CONTEXT.md` §"Implementation Decisions" — D-04 translation-completeness pgView (Phase 3 reads from this on listing/detail pages), D-09 spec_field_group (Phase 3 renders grouped spec tables), D-11 product.status enum + cross-locale fallback policy, D-12 revalidate fan-out helpers, D-16 audit_log shape (no Phase-3 emissions; read-only consumption).

### Sketch winners

- `.planning/sketches/MANIFEST.md` — Phase-3 winners table.
- `.planning/sketches/003-product-detail-premium-saas/index.html` — **product detail implementation target** (HTML mockup, full styles inline, Russian copy with locale switcher; treat layout / typography / spacing / shadow system / spec table styling / sticky CTA card / manufacturer card / downloads list / footer as the visual contract).
- `.planning/sketches/002-public-catalog-filters/index.html` — **catalog page variant A** (left sidebar filters + 3-col grid; treat the sidebar filter primitives, active-pill row, product card shape, and toolbar as the visual contract).

### Existing reusable code (Phase 1 + Phase 2)

- `src/db/schema/views/product-translation-completeness.ts` — pgView Phase 3 reads.
- `src/lib/translation-completeness.ts` — `findCompletenessForProducts(productIds[])` batched helper for listing pages.
- `src/lib/revalidation.ts` — 7 typed `revalidate*` helpers (`revalidateProduct`, `revalidateCategory`, `revalidateCategoryMove`, `revalidateManufacturer`, `revalidateSpecField`, `revalidateSpecFieldGroup`, `revalidateSubmissionsCollection`).
- `src/lib/slug.ts` — Uzbek Latin slug normalization with U+02BB apostrophe-variant set.
- `proxy.ts` — Edge-runtime locale rewrite + admin auth gate (Phase 3 doesn't touch admin paths).
- `src/components/ui/*` — 19 shadcn primitives scaffolded in Phase 2 plan 02-02 (button, input, label, card, badge, sheet, tabs, etc.).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- **`src/lib/translation-completeness.ts`** — already batches per-product completeness reads via the pgView. Listing pages can render TranslationDots without a new helper; detail pages can call `findProductCompleteness(productId)` directly.
- **`src/lib/revalidation.ts`** — the `revalidateProduct` / `revalidateCategory` / etc. helpers fan out the right tag set per Phase 2 D-12. Phase 3 read paths simply use Next 16's tag-cached `fetch`/`unstable_cache` with the matching tags; no new revalidation helpers needed.
- **`src/components/ui/*`** — Card, Badge, Tabs, Sheet, Tooltip, Switch, Select, Separator, Sonner, etc. all scaffolded — public components reuse the same shadcn primitives that the admin uses, ensuring visual consistency.
- **`src/db/schema/products.ts` etc.** — All schema types (Product, ProductTranslation, ProductSpecValue, ProductSpecValueTranslation, etc.) are already exported with proper Drizzle inference. RSC pages can import types directly.
- **`src/lib/active-admin-check.ts`** — irrelevant to Phase 3 (admin-only) but confirms the codebase has clean module boundaries between admin and public paths.

### Established patterns

- **Server Component + RSC by default.** Phase 1 layout, Phase 2 admin pages all use the App Router RSC pattern with `setRequestLocale(locale)` at the layout level. Phase 3 follows the same shape.
- **Drizzle queries directly in RSC.** Phase 2 admin RSC pages call `db.select().from(...)` inline — Phase 3 should do the same. Wrap reads in `unstable_cache` with the appropriate tag for ISR + tag-invalidation.
- **next-intl `useTranslations` for client islands, `getTranslations` for RSC.** Phase 1 + Phase 2 use this consistently; Phase 3 inherits.
- **3-locale message bundles in `messages/{uz,ru,en}.json`.** Phase 2 added admin-namespaced keys; Phase 3 adds `public.*` namespace.
- **`<CldImage>` for Cloudinary-hosted media.** Phase 2 admin upload flow stores `public_id`; Phase 3 reads from those rows and renders.

### Integration points

- **Locale routing** (`[locale]` segment) — Phase 3 pages slot into `src/app/[locale]/products/`, `src/app/[locale]/categories/`, `src/app/[locale]/manufacturers/`, `src/app/[locale]/search/`, `src/app/[locale]/page.tsx` (homepage).
- **Edge proxy** (`proxy.ts`) — already redirects `/` → `/{locale}/` and gates admin paths. Phase 3 routes are public — no proxy changes needed.
- **`/api/cloudinary/sign`** — admin-only, Phase 3 reads pre-uploaded `public_id` values, no upload flow on the public side.
- **Sitemap generation** — new `src/app/sitemap-{locale}.xml/route.ts` (or equivalent App Router `sitemap.ts`) routes; tag-invalidated via `revalidateTag('sitemap')` from Phase-2 mutations.

</code_context>

<specifics>
## Specific Ideas

- **Russian copy is the default UX language for sketches** — the "Запросить цену" CTA, "Скачать ↓" download buttons, "Где применяется" applications section, "Документация" section header all come straight from sketch 003. Phase 3 implementation lifts this copy and produces matching uz + en translations.
- **fiztech.ru as the density reference, not the visual reference** — engineers expect 4–5 spec groups with 6–10 rows each, all visible at once, not hidden behind tabs. Sketch 003's spec-table styling (44%-key + 56%-value + row-hover + tabular numerics + dashed bottom borders + small "note" parentheticals after values) is the target.
- **Locale switcher is a 3-button group (UZ/RU/EN)** — same in admin (shipped Phase 2) and public (Phase 3). NOT a dropdown.
- **Hero image** in sketch 003 is a hand-drawn SVG manometer face for the mockup — production uses `<CldImage>` rendering the actual product photo with the same 4:3 aspect ratio (placeholder during Phase 3 dev should match this aspect ratio).
- **Trust signals on the product page** (sketch 003): in-stock pill, lead-time pill, certification pill, 6-tile key-facts strip, manufacturer card with "Verified" badge, technical-specialist help-card. The "in-stock" pill specifically requires a `product.stock_status` column that does NOT exist today — see Deferred Ideas below.

</specifics>

<deferred>
## Deferred Ideas

These came up during discussion but belong outside Phase 3 scope. Captured so they don't get lost.

### Compare-products feature (v1.1 backlog)

Sketch 002-C demonstrated a sticky bottom compare tray with up to 4 product slots and a `Сравнить (N)` action that lands on a side-by-side spec comparison page. Compare is genuinely valuable for engineering buyers (fiztech.ru shipped a similar feature within the last 2 weeks per the original sketch notes), but it is NOT in v1 requirements (CAT-01..08). Adding it would add: a compare-state model (cookies or query-string list), a `/compare?p=id1,id2,id3` route, a side-by-side spec table component, share-compare URL, and ~2–3 plans of work that doesn't close any current requirement. Surface this in `/gsd-add-backlog` after Phase 3 ships.

### `product.stock_status` column for the "На складе в Ташкенте" pill

Sketch 003's "В наличии" pill renders without backing data — the schema has no stock flag on `product`. Two paths:

- Add `product.stock_status TEXT CHECK (...) DEFAULT 'unknown'` in a Phase-3 additive migration (similar shape to the `is_official_rep` migration in D-11), with admin-side toggle in the existing product editor. Surfaces real-time inventory signal.
- Alternatively, drop the pill from the public side and treat stock as a sales-conversation topic only (the "Запросить цену" flow surfaces it).

NOT decided in this phase — flag for the planner to ask. Default if planner doesn't surface: drop the visual.

### `ImageObject` JSON-LD

Skipped per D-09. If Google ever requires ImageObject for product image-search rich results, revisit.

### `AggregateRating` JSON-LD

Permanently rejected — we have no ratings system in v1 and fabricating ratings is grounds for manual penalty.

### Pure-SSR vs ISR for search-results page

Left to Claude's discretion. If the planner picks ISR-with-short-TTL, document the cache-key shape (locale + query + filters) in the plan.

### Cross-locale slug uniqueness

Phase 1 ensured slug uniqueness *per locale* (`product_translations(locale, slug)` UNIQUE). If two locales of the same product happen to share a slug, that's fine — the URL `/uz/products/<slug>` and `/ru/products/<slug>` resolve to the same product via the locale-aware route lookup. Planner: confirm this works correctly with hreflang (it should — hreflang alternates point to the same product by ID, just different `<slug>` per locale).

</deferred>

---

*Phase: 03-public-rendering-search-seo*
*Context gathered: 2026-04-29*
