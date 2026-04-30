# Phase 3: Public Rendering, Search, SEO - Research

**Researched:** 2026-04-30
**Domain:** Next.js 16 App Router RSC + ISR + next-intl v4 + Postgres FTS + Cloudinary CWV + JSON-LD
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Product detail page = sketch 003 premium-SaaS finish (slate/charcoal palette, Inter, 1fr + 380px sticky CTA rail, frosted-glass header, 2-column layout). `<CldImage>` for gallery. Below 1100px rail collapses to stacked card.
- **D-02:** Catalog/listing page = sketch 002 variant A (left sidebar filters + 3-col grid, nuqs URL state). Numeric range with dual-input + slider, enum checkboxes with server-aggregate counts, bool toggles, manufacturer enum with overflow. Active filter pills above grid. Mobile (<900px) sidebar collapses to drawer.
- **D-03:** Compare-products (sketch 002-C) deferred to v1.1. NOT in Phase 3.
- **D-04:** Default theme = slate-blue premium-SaaS direction from sketch 003.
- **D-05:** Locale fallback chain: current → uz → ru → en (cascade, stop at first non-empty). Display current-locale `product_translations` row; if absent, use the locale-where-found row. Banner shown when fallback fires.
- **D-06:** Autocomplete: products + part numbers only. Each row shows breadcrumb chips (manufacturer name + category name). No manufacturer/category sections in v1 dropdown.
- **D-07:** Exact SKU match → 302 redirect to `/[locale]/products/<slug>`. Implemented at `/[locale]/search?q=...` route before rendering results.
- **D-08:** Product JSON-LD omits `offers` (informational platform). `Product` with name, image, description, brand, sku, gtin/mpn only.
- **D-09:** JSON-LD set: `Product` (detail) + `Organization` (root layout) + `BreadcrumbList` (every nav-aware page) + `CollectionPage` (category listings). Helper module `src/lib/jsonld.ts`. `AggregateRating` and `ImageObject` deferred.
- **D-10:** Manufacturer landing pages at `/[locale]/manufacturers/<slug>` + index at `/[locale]/manufacturers`.
- **D-11:** Phase-3 additive migration: `manufacturer.is_official_rep BOOLEAN NOT NULL DEFAULT false` + `manufacturer_translations.relationship_note TEXT NULL`. Admin UI extension folded into existing manufacturer-edit page (plan 02-10 follow-on).

### Claude's Discretion

- Cache + ISR strategy: default Next 16 RSC + `'use cache'` + `cacheTag`/`cacheLife`; reuse 7 typed `revalidate*` helpers from Phase 2 (already use the 2-arg `revalidateTag(tag, 'max')` form).
- Sitemap segmentation: per-locale `sitemap-uz.xml` / `sitemap-ru.xml` / `sitemap-en.xml` referenced from `sitemap-index.xml` in `robots.txt`. Regenerated on `revalidateTag('sitemap', 'max')`.
- 404 vs locale-fallback: planner picks exact handler (middleware slug resolution + page-level content rendering).
- Filter empty-state copy: standard "Нет товаров по выбранным фильтрам — сбросьте фильтры".
- LCP image strategy: `<CldImage priority>` with responsive `sizes` on hero image; `loading="lazy"` on gallery thumbs.
- Typeface: Inter with subsets `['latin','latin-ext','cyrillic']` — already wired in `src/app/[locale]/layout.tsx`.
- Autocomplete SQL: tsvector prefix UNION `LOWER(sku) LIKE $1 || '%'`.

### Deferred Ideas (OUT OF SCOPE)

- Compare-products feature (v1.1 backlog)
- `product.stock_status` column — drop the "в наличии" pill by default unless user decides otherwise
- `ImageObject` JSON-LD
- `AggregateRating` JSON-LD
- Pure-SSR vs ISR for search-results page (Claude's discretion)
- Cross-locale slug uniqueness (non-issue per D-05 cross-reference)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | Locale switcher site-wide; current locale reflected in URL | next-intl `Link` + locale-prefixed routing already wired via `routing.ts` |
| CAT-02 | Category tree persistent navigation (left nav or mega-menu) | RSC tree query from `category`+`category_translations`; client island for expand/collapse |
| CAT-03 | Category listing page with products, filters, result count | RSC page + `createSearchParamsCache` (nuqs/server) for filter params |
| CAT-04 | Faceted filters driven by category's typed spec fields | EAV filter queries on `product_spec_values`; filter metadata from `spec_field` (filter_kind=range/select/toggle) |
| CAT-05 | Filter state reflected in URL via nuqs (shareable) | `useQueryStates` client island; `createSearchParamsCache` for RSC read |
| CAT-06 | Product detail page with hero, gallery, spec tables, manufacturer, PDFs, applications | RSC + client gallery island; spec table grouped by `spec_field_group`; `<CldImage>` |
| CAT-07 | All public pages SSR/ISR — HTML populated on first byte | `'use cache'` + `cacheTag`; never `dynamic = 'force-dynamic'` on detail/listing pages |
| CAT-08 | Product detail → Product JSON-LD; org/category → Organization + CollectionPage + BreadcrumbList | `generateMetadata` + `<script type="application/ld+json">` in RSC |
| SRCH-01 | Full-text search across product name/desc/spec in current locale | `product_search` GIN table query via `plainto_tsquery` |
| SRCH-02 | Results ranked by relevance; fallback to another locale with hint | ts_rank_cd ordering; application-level cascade: current → uz → ru → en |
| SRCH-03 | Autocomplete suggestions as user types | Client island + API route `/api/search/autocomplete`; tsvector prefix + SKU LIKE |
| SRCH-04 | Exact SKU match → 302 redirect | Route handler pre-check before render |
| SRCH-05 | Search index rebuilt transactionally when product updated | `saveProduct` tx must include `INSERT … ON CONFLICT DO UPDATE` on `product_search`; currently MISSING — this is a Phase-3 write-path addition |
| MFG-01 | Manufacturers index page with logos | RSC at `/[locale]/manufacturers` |
| MFG-02 | Manufacturer detail page with description + product list | RSC at `/[locale]/manufacturers/[slug]` with paginated product grid |
| SEO-01 | `<link rel="alternate" hreflang>` for uz/ru/en + x-default on every page | `generateMetadata` returning `alternates.languages`; next-intl middleware already adds `link` header |
| SEO-02 | Per-locale canonical URL on every page | `alternates.canonical` in `generateMetadata` |
| SEO-03 | Per-locale XML sitemaps from `robots.txt` | App Router `sitemap.ts` per locale + `robots.ts` |
| SEO-04 | `next/font` with `['latin','latin-ext','cyrillic']`; Uzbek U+02BB renders correctly | Already wired in layout; no Phase-3 change needed |
| SEO-05 | `<CldImage>` with responsive `sizes`; LCP on product detail passes CWV Slow 4G | `priority` prop on hero; `sizes` tuned to 2-col layout width |
</phase_requirements>

---

## Summary

Phase 3 builds the entire public-facing surface of Manometr. The core challenges are (1) a product detail page with fiztech-grade information density that still passes Slow-4G Core Web Vitals, (2) per-locale tsvector FTS with a 3-step fallback cascade, (3) typed-spec faceted filters driven by an EAV long-table, (4) JSON-LD that validates in the Rich Results Test, and (5) a correct hreflang/canonical graph across 3 locales.

The Phase-2 foundations land all 7 revalidation helpers, the complete schema, the `product_search` table (declared but empty), and the `shadcn/ui` primitive set. Phase 3 consumes these directly. The most important gap from Phase 2 is that `imagePublicIds` and `datasheetPublicIds` are collected in the product editor form but are **not persisted to the database** — `saveProduct` drops them silently. Phase 3 must add a schema migration to store them (columns or a sibling table) and wire the write path before the public detail page can render a gallery or datasheet list.

The second critical gap: `product_search` rows are never populated (Phase 2 left it as a no-op). Phase 3 must add the tsvector build step inside `saveProduct`'s transaction for SRCH-05.

Third gap: `unaccent` and `pg_trgm` extensions are referenced in the stack research and CLAUDE.md but are **not in any existing migration**. Phase 3 must add `CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;` in the Phase-3 schema migration.

**Primary recommendation:** Structure Phase 3 around 4 waves: (0) schema migration + write-path gaps, (1) public layout + navigation + locale switcher, (2) category/product/manufacturer pages + JSON-LD, (3) search + autocomplete + sitemaps + final SEO wiring.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Category tree navigation | Frontend Server (RSC) | Browser (expand/collapse island) | Tree data is SSR; interactive open/close is client-only |
| Category listing + faceted filters | Frontend Server (RSC) | Browser (filter sidebar island) | ISR page shell; filter UI is a client component reading nuqs URL state |
| Product detail page | Frontend Server (RSC) | Browser (image gallery island) | Spec tables, JSON-LD, and hreflang are entirely server-side |
| Full-text search results | Frontend Server (RSC, force-dynamic) | — | Every query is unique; ISR caching not applicable |
| Search autocomplete | API (Route Handler) | Browser (debounced client fetch) | Needs to return quickly; no ISR cache on dynamic queries |
| Facet aggregate counts | Database / API | — | Aggregate SQL on `product_spec_values`; computed server-side |
| tsvector search index maintenance | Database / Backend | — | Populated transactionally in the admin write path |
| Cloudinary image delivery | CDN / Static | Browser (next/image srcset) | Cloudinary CDN handles optimization; browser selects size via srcset |
| JSON-LD emission | Frontend Server (RSC) | — | Must be in SSR HTML for crawlers |
| hreflang / canonical | Frontend Server (RSC) | Edge (link header via next-intl middleware) | Both paths active; `generateMetadata` for `<head>`; middleware for `link` header |
| Per-locale sitemaps | Frontend Server (Route Handler, ISR) | — | Generated from DB query; cached with `revalidateTag('sitemap','max')` |
| Manufacturer landing pages | Frontend Server (RSC) | — | Same ISR pattern as product/category pages |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.x | RSC + ISR + `'use cache'` | Verified current stable [VERIFIED: nextjs.org/blog] |
| next-intl | ^4.x | i18n routing, `generateMetadata`, `getTranslations`, `getPathname` | App Router first-class; `getPathname` for sitemap alternates [VERIFIED: Context7 /amannn/next-intl] |
| nuqs | ^2.x | URL state for filters and search params | `createSearchParamsCache` for RSC; `useQueryStates` for client filter island [VERIFIED: Context7 /47ng/nuqs] |
| next-cloudinary | ^6.x | `<CldImage>` with auto `srcset`, `priority`, responsive sizes | Already wired; `f_auto/q_auto` on Cloudinary CDN [VERIFIED: Context7 /cloudinary-community/next-cloudinary] |
| Drizzle ORM | ^0.40.x | Typed queries including `sql\`\`` for tsvector ops | Already installed |
| shadcn/ui | copy-paste | 19 primitives already scaffolded (Button, Badge, Sheet, Card, etc.) | Public pages reuse same primitives as admin |
| Tailwind v4 | already installed | Styling | Already installed |

### New Additions for Phase 3

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `schema-dts` | ^1.x | TypeScript types for JSON-LD schema.org | Strongly-typed `Product`, `Organization`, `BreadcrumbList`, `CollectionPage` objects |
| `@radix-ui/react-slider` | already via shadcn | Numeric range dual-input slider | shadcn/ui Slider primitive for `filter_kind='range'` facets |

**Version verification:** Run `npm view schema-dts version` at install time to confirm latest. [ASSUMED]

**Installation:**
```bash
pnpm add schema-dts
```
(`@radix-ui/react-slider` is already available via existing shadcn install.)

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser]
  │ URL: /uz/categories/manometry/industrial
  │
  ▼
[Vercel Edge — proxy.ts]
  │ Locale detection + /→/uz/ rewrite (no admin path → pass through)
  │
  ▼
[Next.js App Router — RSC]
  │
  ├─ src/app/[locale]/categories/[...slug]/page.tsx (ISR, 'use cache', cacheTag('category:<id>'))
  │    ├─ Drizzle query: category tree + spec fields + aggregate facet counts
  │    ├─ nuqs createSearchParamsCache.parse(searchParams) → filter state
  │    ├─ Drizzle query: products WHERE spec_field filters (EAV EXISTS subqueries)
  │    └─ RSC renders: <FilterSidebar /> (client island), <ProductGrid />, <BreadcrumbList>
  │
  ├─ src/app/[locale]/products/[slug]/page.tsx (ISR, 'use cache', cacheTag('product:<id>'))
  │    ├─ Drizzle query: product + translations + spec_values grouped by spec_field_group
  │    ├─ Drizzle query: manufacturer + translations
  │    ├─ RSC renders: <ProductDetail /> with <CldImage priority> hero + spec tables
  │    ├─ generateMetadata → alternates.canonical + alternates.languages (hreflang)
  │    └─ JSON-LD <script> inline: productJsonLd() + organizationJsonLd() + breadcrumbJsonLd()
  │
  ├─ src/app/[locale]/search/page.tsx (force-dynamic)
  │    ├─ SKU exact match → 302 redirect
  │    ├─ Drizzle FTS query: product_search WHERE locale=current AND tsv @@ query
  │    ├─ If 0 results → retry uz → ru → en; add fallback banner
  │    └─ RSC renders: search results list + <SearchBox /> client island
  │
  ├─ src/app/[locale]/manufacturers/[slug]/page.tsx (ISR, cacheTag('manufacturer:<id>'))
  │
  ├─ src/app/sitemap-[locale].xml/route.ts (ISR, cacheTag('sitemap','max'))
  │
  └─ src/app/robots.txt/route.ts (static)
  │
  ▼
[Neon Postgres 16]
  ├─ product_search (GIN tsvector, per-locale)
  ├─ product_spec_values (EAV for filter queries)
  └─ *_translations sibling tables

[Cloudinary CDN]
  └─ CldImage srcset → browser picks best width
```

### Recommended Project Structure (Phase 3 additions)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx                   # EXISTING — add Organization JSON-LD here
│   │   ├── page.tsx                     # EXISTING — homepage (add hreflang)
│   │   ├── categories/
│   │   │   └── [...slug]/
│   │   │       └── page.tsx             # NEW — category listing + filters
│   │   ├── products/
│   │   │   └── [slug]/
│   │   │       └── page.tsx             # NEW — product detail
│   │   ├── manufacturers/
│   │   │   ├── page.tsx                 # NEW — manufacturer index
│   │   │   └── [slug]/page.tsx          # NEW — manufacturer detail
│   │   └── search/
│   │       └── page.tsx                 # NEW — full-text search results
│   ├── api/
│   │   └── search/
│   │       └── autocomplete/route.ts    # NEW — autocomplete API route
│   ├── sitemap-uz.xml/route.ts          # NEW — per-locale sitemap
│   ├── sitemap-ru.xml/route.ts          # NEW
│   ├── sitemap-en.xml/route.ts          # NEW
│   ├── sitemap-index.xml/route.ts       # NEW — sitemap index
│   └── robots.txt/route.ts             # NEW
├── components/
│   ├── public/
│   │   ├── category-nav.tsx             # NEW — category tree (client expand/collapse)
│   │   ├── filter-sidebar.tsx           # NEW — faceted filter sidebar (client)
│   │   ├── product-card.tsx             # NEW — card for listing grid
│   │   ├── product-gallery.tsx          # NEW — CldImage gallery (client for slide)
│   │   ├── spec-table.tsx               # NEW — grouped spec table (server)
│   │   ├── locale-switcher.tsx          # NEW — 3-button UZ/RU/EN group
│   │   ├── search-box.tsx               # NEW — global search input + autocomplete
│   │   └── translation-dots-public.tsx  # NEW — reuses TranslationDots in listings
│   └── ui/                              # EXISTING 19 shadcn primitives
├── lib/
│   ├── jsonld.ts                        # NEW — typed JSON-LD helpers
│   ├── search.ts                        # NEW — tsvector query helpers
│   ├── facets.ts                        # NEW — aggregate count queries
│   ├── revalidation.ts                  # EXISTING — already covers Phase 3 tags
│   ├── translation-completeness.ts      # EXISTING — reuse on listing/detail
│   └── slug.ts                          # EXISTING
└── db/
    └── schema/
        └── migrations/
            └── 0002_phase3_media_search_manufacturer.sql  # NEW
```

### Pattern 1: Next.js 16 "use cache" + cacheTag for ISR

**What:** The new stable Cache Components model in Next.js 16. Add `cacheComponents: true` to `next.config.ts`, then mark async functions or page files with `'use cache'` + `cacheTag(...)` for on-demand invalidation via `revalidateTag(tag, 'max')`.

**When to use:** All ISR public pages (product detail, category listing, manufacturer pages). Search results remain `force-dynamic`.

**Critical note:** The old `unstable_cache` API is deprecated in Next.js 16. The recommended path is `'use cache'` + `cacheTag`. However, the existing Phase-2 helpers in `src/lib/revalidation.ts` already use the 2-arg `revalidateTag(tag, 'max')` form — they are **compatible with the new model** and require no changes. [VERIFIED: nextjs.org/docs/app/guides/upgrading/version-16]

**Example — caching a data fetch function:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/directives/use-cache
import { cacheTag } from 'next/cache';

export async function getProductBySlug(locale: string, slug: string) {
  'use cache';
  const product = await db.query.productTranslations.findFirst({
    where: and(eq(productTranslations.locale, locale), eq(productTranslations.slug, slug)),
    with: { product: true }
  });
  if (product) {
    cacheTag(`product:${product.productId}`);
    cacheTag('products-list');
  }
  return product;
}
```

**Example — enabling cacheComponents:**
```typescript
// next.config.ts — add to existing config
const nextConfig: NextConfig = {
  cacheComponents: true,   // enables 'use cache' + PPR
  turbopack: { root: path.resolve(__dirname) },  // EXISTING
  // ...
};
```

**Caution:** `'use cache'` cannot directly call `cookies()`, `headers()`, or access `searchParams` — pass them as arguments. Category listing pages that read `searchParams` for filters must parse params OUTSIDE the cached function and pass filter values in.

### Pattern 2: nuqs Server + Client Split for Faceted Filters

**What:** `createSearchParamsCache` (nuqs/server) parses filter state in the RSC page once; `useQueryStates` (client) manages interactive updates. The RSC re-executes with new `searchParams` on each filter change.

**When to use:** Category listing page filter sidebar (D-02).

**Example — RSC page:**
```typescript
// Source: Context7 /47ng/nuqs
import { createSearchParamsCache, parseAsInteger, parseAsString, parseAsArrayOf } from 'nuqs/server';

export const filterCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(''),
  // Dynamic spec filters keyed by spec_field.key, e.g. 'pressure_min', 'pressure_max'
  // Use parseAsFloat for numeric range fields
});

export default async function CategoryPage({ searchParams, params }) {
  const { locale, ...slug } = await params;
  const filters = await filterCache.parse(searchParams);
  const products = await getFilteredProducts(categoryId, filters, locale);
  return (
    <div>
      <FilterSidebar />  {/* client island — reads same filterCache.get() */}
      <ProductGrid products={products} />
    </div>
  );
}
```

**Example — client filter sidebar:**
```typescript
// Source: Context7 /47ng/nuqs
'use client';
import { useQueryStates, parseAsFloat } from 'nuqs';

export function FilterSidebar({ specFields }) {
  const [rangeFilters, setRangeFilters] = useQueryStates({
    pressure_min: parseAsFloat,
    pressure_max: parseAsFloat,
  });
  // ...
}
```

**Key nuqs behavior:** Setting a param to `null` removes it from the URL. `history: 'push'` vs `'replace'` (default: replace — correct for filters). [VERIFIED: Context7 /47ng/nuqs]

### Pattern 3: next-intl generateMetadata for hreflang + canonical

**What:** `generateMetadata` returns `alternates.canonical` (per-locale URL) and `alternates.languages` (all locale alternates + x-default). next-intl's middleware ALSO adds a `link` header for hreflang — both fire on every request.

**When to use:** Every public page layout and page-level `generateMetadata`.

**Example:**
```typescript
// Source: Context7 /amannn/next-intl
import { getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';

const host = 'https://manometr.uz';

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'Product' });
  const product = await getProductBySlug(locale, slug);
  
  return {
    title: product.name,
    description: product.shortDesc,
    alternates: {
      canonical: `${host}/${locale}/products/${slug}`,
      languages: {
        uz: `${host}/uz/products/${product.slugUz}`,
        ru: `${host}/ru/products/${product.slugRu}`,
        en: `${host}/en/products/${product.slugEn}`,
        'x-default': `${host}/uz/products/${product.slugUz}`,  // default locale is uz
      },
    },
  };
}
```

**Note:** The `x-default` should point to the default locale (uz) per D-03 of Phase 1 (defaultLocale = 'uz'). [VERIFIED: Context7 /amannn/next-intl]

**Sitemap with alternates:**
```typescript
// Source: Context7 /amannn/next-intl
import { getPathname } from '@/i18n/navigation';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.select({ id: products.id, /* slugs */ }).from(products);
  return products.map(p => ({
    url: `${host}/uz/products/${p.slugUz}`,
    lastModified: p.updatedAt,
    alternates: {
      languages: {
        uz: `${host}/uz/products/${p.slugUz}`,
        ru: `${host}/ru/products/${p.slugRu}`,
        en: `${host}/en/products/${p.slugEn}`,
      }
    }
  }));
}
```

### Pattern 4: Postgres FTS with Per-Locale tsvector + Fallback

**What:** Query `product_search` by locale. If 0 rows, cascade through uz → ru → en. Use `plainto_tsquery` (handles multi-word input safely) with per-locale text config.

**pg_config mapping (VERIFIED: ARCHITECTURE.md + Postgres docs):**
- `uz` → `'simple'` (Postgres has no Uzbek dictionary; simple = lowercase + tokenize, no stemming — documented fallback for unsupported languages)
- `ru` → `'russian'` (native Postgres Russian stemmer)
- `en` → `'english'` (native Postgres English stemmer)

**Primary search query:**
```sql
-- Source: .planning/research/ARCHITECTURE.md §Pattern 5
SELECT p.id, ts_rank_cd(s.search_tsv, q.tsq) AS rank,
       pt.name, pt.slug, pt.short_desc
FROM product_search s
JOIN product p ON p.id = s.product_id
JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = $locale
CROSS JOIN (SELECT plainto_tsquery($pg_config, $query) AS tsq) q
WHERE s.locale = $locale
  AND p.status = 'published'
  AND s.search_tsv @@ q.tsq
ORDER BY rank DESC
LIMIT 20;
```

**tsvector build (runs inside saveProduct transaction for SRCH-05):**
```sql
-- Source: .planning/research/ARCHITECTURE.md §Pattern 5
INSERT INTO product_search (product_id, locale, search_tsv)
SELECT $product_id, $locale,
  setweight(to_tsvector($pg_config, coalesce(t.name,'')), 'A') ||
  setweight(to_tsvector($pg_config, coalesce(t.short_desc,'')), 'B') ||
  setweight(to_tsvector($pg_config, coalesce(t.long_desc,'')) , 'C') ||
  setweight(to_tsvector($pg_config, coalesce(agg.spec_text,'')), 'D')
FROM product_translations t
LEFT JOIN LATERAL (
  SELECT string_agg(COALESCE(psvt.text_value, v.text_value, v.enum_value, v.num_value::text, ''), ' ') AS spec_text
  FROM product_spec_values v
  LEFT JOIN product_spec_value_translations psvt ON psvt.value_id = v.id AND psvt.locale = $locale
  WHERE v.product_id = $product_id
) agg ON true
WHERE t.product_id = $product_id AND t.locale = $locale
ON CONFLICT (product_id, locale) DO UPDATE SET search_tsv = EXCLUDED.search_tsv;
```
Run this for all 3 locales inside the same transaction. [VERIFIED: ARCHITECTURE.md]

**Autocomplete query (D-06):**
```sql
-- Products matched by name prefix in current locale OR exact/prefix SKU
(
  SELECT p.id, pt.name, pt.slug, mt.name AS manufacturer_name, ct.name AS category_name
  FROM product_search s
  JOIN product p ON p.id = s.product_id AND p.status = 'published'
  JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = $locale
  LEFT JOIN manufacturers m ON m.id = p.manufacturer_id
  LEFT JOIN manufacturer_translations mt ON mt.manufacturer_id = m.id AND mt.locale = $locale
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = $locale
  WHERE s.locale = $locale
    AND s.search_tsv @@ to_tsquery($pg_config, $prefix || ':*')
  LIMIT 8
)
UNION ALL
(
  SELECT p.id, pt.name, pt.slug, mt.name, ct.name
  FROM product p
  JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = $locale
  LEFT JOIN manufacturers m ON m.id = p.manufacturer_id
  LEFT JOIN manufacturer_translations mt ON mt.manufacturer_id = m.id AND mt.locale = $locale
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = $locale
  WHERE p.status = 'published'
    AND LOWER(p.sku) LIKE LOWER($q) || '%'
  LIMIT 4
)
ORDER BY (sku_match_rank DESC), name
LIMIT 10;
```
Note: `to_tsquery(config, term || ':*')` is the prefix search form for autocomplete. `plainto_tsquery` does NOT support prefix. [ASSUMED — confirm against Postgres docs at implementation time]

### Pattern 5: EAV Filter Queries on product_spec_values

**What:** For each active filter, add an `EXISTS` subquery against `product_spec_values`. Each filter is independent — no cross-filter JOIN needed.

**When to use:** Category listing page with `filter_kind='range'` (numeric), `filter_kind='select'` (enum), `filter_kind='toggle'` (bool). [VERIFIED: existing schema + ARCHITECTURE.md Pattern 2]

**Filter query shape:**
```sql
-- Dynamic WHERE building from active filters
SELECT DISTINCT p.id, pt.name, pt.slug, pt.short_desc
FROM product p
JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = $locale
WHERE p.category_id = $category_id
  AND p.status = 'published'
  -- Numeric range filter (filter_kind='range', filter_group_key pairs min/max)
  AND EXISTS (
    SELECT 1 FROM product_spec_values v
    JOIN spec_field sf ON sf.id = v.spec_field_id
    WHERE v.product_id = p.id AND sf.key = 'pressure_max'
    AND v.num_value BETWEEN $pressure_min AND $pressure_max
  )
  -- Enum/select filter (filter_kind='select')
  AND EXISTS (
    SELECT 1 FROM product_spec_values v
    JOIN spec_field sf ON sf.id = v.spec_field_id
    WHERE v.product_id = p.id AND sf.key = 'material'
    AND v.enum_value = ANY($materials_array)
  )
ORDER BY pt.name
LIMIT $page_size OFFSET $offset;
```

**Aggregate counts for sidebar filter chips:**
```sql
-- Count products per enum value for a spec field (to show "Сталь (14)")
SELECT v.enum_value, COUNT(DISTINCT v.product_id) AS count
FROM product_spec_values v
JOIN spec_field sf ON sf.id = v.spec_field_id
JOIN product p ON p.id = v.product_id
WHERE sf.key = $field_key
  AND p.category_id = $category_id
  AND p.status = 'published'
GROUP BY v.enum_value
ORDER BY count DESC;
```
[VERIFIED: ARCHITECTURE.md Pattern 2]

**Performance note:** At 100–500 products, these EXISTS queries run in sub-10ms on indexes `psv_field_num_idx(spec_field_id, num_value)` and `psv_field_enum_idx(spec_field_id, enum_value)` which are already in the Phase-1 migration. No denormalized projection needed at v1 scale. [VERIFIED: existing schema indexes]

### Pattern 6: CldImage for Slow-4G LCP (SEO-05)

**What:** `<CldImage>` with `priority` prop marks the hero image as `fetchpriority="high"` + `loading="eager"` + eliminates render-blocking. Combine with tight `sizes` for the 1fr column of the 2-col layout.

**CWV budget on Slow 4G:** Slow 4G = ~1.5 Mbps downstream. LCP target < 2.5s. A Cloudinary AVIF/WebP `q_auto` image at `w_800` is typically 50–120 KB, which transfers in ~300–640ms on Slow 4G — well within budget if the image is prioritized. The critical path is: DNS + TCP (≈400ms) + TTFB (≈200ms) + image download (≈400ms) = ~1s. HTML streaming starts before full page parse, so LCP fires when the hero image fully loads.

**Example:**
```tsx
// Source: Context7 /cloudinary-community/next-cloudinary
<CldImage
  src={product.heroPublicId}
  alt={product.name}
  width={960}
  height={720}
  priority                    // fetchpriority="high" + loading="eager"
  sizes="(max-width: 1100px) 100vw, calc(100vw - 420px)"
  // 420px = 380px rail + 40px gap; at ≤1100px single column = 100vw
/>
```

**Gallery thumbs:** Use `loading="lazy"` on all non-hero images.

**Preconnect hint:** Add `<link rel="preconnect" href="https://res.cloudinary.com">` to the `<head>` (via Next.js `metadata.other` or root layout). This shaves ~100ms from first Cloudinary image fetch on cold connections. [VERIFIED: Context7 /cloudinary-community/next-cloudinary]

### Pattern 7: JSON-LD Typed Helpers (D-09)

**What:** Server-rendered `<script type="application/ld+json">` in RSC. TypeScript-typed via `schema-dts`.

**Example:**
```typescript
// src/lib/jsonld.ts
import type { Product, Organization, BreadcrumbList, WithContext } from 'schema-dts';

export function productJsonLd(p: ProductData): WithContext<Product> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.shortDesc ?? undefined,
    sku: p.sku ?? undefined,
    image: p.heroPublicId
      ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_800/${p.heroPublicId}`
      : undefined,
    brand: {
      '@type': 'Organization',
      name: p.manufacturerName,
    },
  };
}

export function organizationJsonLd(): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Manometr',
    url: 'https://manometr.uz',
  };
}
```

**Emission in RSC:**
```tsx
// In page.tsx — note: must be inside RSC, not a Client Component
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
/>
```
[ASSUMED — schema-dts package approach; verify against current npm at install time]

### Anti-Patterns to Avoid

- **`dynamic = 'force-dynamic'` on listing/detail pages:** Kills ISR. Only the search page should be force-dynamic.
- **Calling `cacheTag()` outside `'use cache'` scope:** No-op; tags must be set inside the cached function.
- **Putting `cookies()` or `headers()` inside `'use cache'`:** Build will hang (50s timeout) or throw. Read them outside and pass as args.
- **Single tsvector union-ing all locales:** Cross-locale pollution in rankings; no per-locale fallback possible. One row per (product, locale).
- **Using `plainto_tsquery` for autocomplete prefix search:** `plainto_tsquery` doesn't support `:*` prefix operator. Use `to_tsquery(config, term || ':*')` instead.
- **Placing filter aggregate SQL in the page render path without caching:** Aggregate counts are expensive; wrap in `'use cache'` with `cacheTag('category:<id>')`.
- **`images.domains` in next.config.ts:** Deprecated in Next.js 16. Already using `images.remotePatterns` — keep it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state for filters | Custom URLSearchParams serialization | `nuqs` `useQueryStates` + `createSearchParamsCache` | Type safety, server/client sync, shallow push/replace, SSR-correct |
| Image optimization + srcset | Manual `<img srcset>` + Cloudinary URL building | `<CldImage>` with `sizes` + `priority` | Auto f_auto/q_auto, correct srcset widths, fetchpriority management |
| hreflang link tags | Manual `<link>` elements | `generateMetadata().alternates.languages` | Next.js renders these in `<head>` correctly; middleware adds `link` header too |
| JSON-LD type safety | Plain object `as any` | `schema-dts` types | Catches invalid schema.org shapes at compile time |
| Locale-prefixed URLs in sitemaps | Manual string concatenation | `next-intl` `getPathname()` | Handles `localePrefix: 'always'` routing transparently |
| FTS query construction | Hand-building tsvector strings | `plainto_tsquery` / `to_tsquery` with Drizzle `sql\`\`` | Handles special chars, injection-safe |
| Filter facet counts | In-memory JS aggregation over all products | SQL `GROUP BY` aggregate query | Set-based, indexed, scales to 10k products |

---

## Phase-3 Schema Migration Requirements

### Gap 1: Product media storage (CRITICAL — blocks CAT-06)

The Zod schema (`productInsertSchema`) accepts `imagePublicIds: string[]` and `datasheetPublicIds: string[]`, but `saveProduct` silently drops them — no persistence to DB. Phase-3 migration must add storage.

**Recommended shape (additive — matches PROJECT.md architecture):**
```sql
ALTER TABLE "product"
  ADD COLUMN "image_public_ids" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN "datasheet_public_ids" text[] NOT NULL DEFAULT '{}';
```
Postgres native `text[]` arrays are simple and queryable. Drizzle supports them via `text('col_name').array()`. The write path in `saveProduct` must be updated to write these columns. [ASSUMED — planner should consider a `product_media` sibling table if ordering/reordering matters more than simplicity; arrays lose position stability under concurrent edits but are fine for v1]

### Gap 2: product_search write path (CRITICAL — blocks SRCH-05)

`saveProduct` transaction currently has 5 steps (product, translations, spec values, MT flags, audit). Phase 3 must add **Step 6**: rebuild `product_search` for all 3 locales inside the same transaction. Pattern 4 above shows the exact SQL.

**Extensions required (CRITICAL):**
```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
These are NOT in any existing migration (verified: grepped both SQL migration files — no `CREATE EXTENSION` statements found). Must be first statements in the Phase-3 migration. [VERIFIED: grep of drizzle/ directory returned no matches for CREATE EXTENSION]

### Gap 3: D-11 manufacturer fields (additive, blocks MFG-01/02)

```sql
ALTER TABLE "manufacturer"
  ADD COLUMN "is_official_rep" boolean NOT NULL DEFAULT false;

ALTER TABLE "manufacturer_translations"
  ADD COLUMN "relationship_note" text;
```
These are purely additive — no default constraint conflicts. Drizzle schema files need corresponding column additions. [VERIFIED: manufacturers.ts + 0000/0001 migrations have no such columns]

### Drizzle Schema Updates Required

1. `src/db/schema/products.ts` — add `imagePublicIds` and `datasheetPublicIds` columns
2. `src/db/schema/manufacturers.ts` — add `isOfficialRep` column
3. `src/db/schema/manufacturer-translations.ts` — add `relationshipNote` column (new file, currently inlined in manufacturers.ts as `manufacturerTranslations`)

---

## Revalidation Tag-Set Gap Analysis

**Existing tags from Phase-2 revalidation.ts (VERIFIED: src/lib/revalidation.ts):**
- `revalidateProduct(id)` → fans out: `product:${id}`, `products-list`, `sitemap`, `search-index`
- `revalidateCategory(id)` → fans out: `category:${id}`, `categories-tree`, `sitemap`
- `revalidateCategoryMove(...)` → fans out: old parent, new parent, moved, `categories-tree`, `sitemap`
- `revalidateManufacturer(id)` → fans out: `manufacturer:${id}`, `manufacturers-list`, `sitemap`
- `revalidateSpecField(id, categoryId)` → fans out: `spec-field:${id}`, `category:${categoryId}`, `search-index`
- `revalidateSpecFieldGroup(id, categoryId)` → fans out: `spec-field-group:${id}`, `category:${categoryId}`

**Tag gaps identified:**

1. **`search-index` tag is never consumed on the public side.** Phase 3 search results pages should NOT use this as a cache tag (they are `force-dynamic`). The `search-index` tag is an internal signal used by any cached data-fetching that needs to know when FTS is stale. Current usage is fine.

2. **`products-list` covers category listing pages?** Only if the category listing page uses `cacheTag('products-list')`. It should also use `cacheTag('category:<id>')` for per-category invalidation. Both tags are needed: product edit → `products-list` clears listing, category edit → `category:<id>` clears listing.

3. **Manufacturer page tags:** `revalidateManufacturer(id)` fans out to `manufacturer:${id}` and `manufacturers-list`. The D-11 migration (adding `is_official_rep`) runs through the existing admin manufacturer-edit page, which calls `revalidateManufacturer`. No new tag needed.

4. **`spec-field-group` tag gap:** `revalidateSpecFieldGroup` fans out `spec-field-group:<id>` and `category:<id>`. The product detail page renders spec tables grouped by `spec_field_group`. If a group label changes, `category:<id>` is invalidated, which should cover the detail page IF the detail page uses `cacheTag('category:...')` in addition to `cacheTag('product:...')`. Planner should add `cacheTag('category:<categoryId>')` to the product detail page's data fetch.

5. **`manufacturer:${id}` must be in product detail cache.** The product detail page renders manufacturer name/logo. If a manufacturer is renamed, `revalidateManufacturer(id)` fires `manufacturer:${id}`. The product detail page must declare `cacheTag('manufacturer:<manufacturerId>')` — otherwise, a manufacturer rename doesn't clear the product detail page.

**Conclusion:** Two tag additions needed in Phase-3 page data-fetch functions:
- Product detail page data fetch: add `cacheTag('category:<categoryId>')` + `cacheTag('manufacturer:<manufacturerId>')`
- Category listing page data fetch: add `cacheTag('category:<id>')` + `cacheTag('products-list')`

No new revalidation helpers needed — existing fan-out covers Phase-3 correctly if pages declare the right tags.

---

## Common Pitfalls

### Pitfall 1: `'use cache'` not enabled in next.config.ts

**What goes wrong:** `cacheTag`, `cacheLife`, `'use cache'` directive are silently ignored or throw at build time.
**Why it happens:** `cacheComponents: true` must be added to `next.config.ts` before any `'use cache'` directive is used.
**How to avoid:** First task in the Phase-3 schema migration plan: add `cacheComponents: true` to `next.config.ts`. [VERIFIED: nextjs.org/docs/app/guides/upgrading/version-16]

### Pitfall 2: `'use cache'` + `searchParams` build timeout

**What goes wrong:** Build hangs for 50s and fails with "Filling a cache during prerender timed out".
**Why it happens:** If `searchParams` is passed INTO a `'use cache'` function (as a Promise), the build can't resolve it at static time.
**How to avoid:** Parse `searchParams` via `createSearchParamsCache.parse(searchParams)` OUTSIDE any `'use cache'` boundary, then pass the resolved primitive filter values as arguments. Category listing pages are `force-dynamic` anyway due to `searchParams`, but product detail pages must not access `searchParams`.

### Pitfall 3: Autocomplete using `plainto_tsquery` for prefix search

**What goes wrong:** User types "mano" and gets no results because `plainto_tsquery('russian', 'mano')` won't match "manometr" (no stemming for prefix).
**Why it happens:** `plainto_tsquery` is for full-word matching, not prefix. Prefix requires `to_tsquery(config, 'mano:*')`.
**How to avoid:** Autocomplete SQL must use `to_tsquery($config, $sanitized_term || ':*')`. Sanitize `$term` to remove `!`, `&`, `|`, `(`, `)` before appending `:*`. [ASSUMED — common Postgres FTS pitfall; verify sanitization logic in implementation]

### Pitfall 4: Missing `unaccent` extension blocks tsvector build

**What goes wrong:** `saveProduct` throws `function unaccent(text) does not exist` when building tsvectors.
**Why it happens:** `unaccent` is a PostgreSQL contrib extension — it must be installed with `CREATE EXTENSION unaccent;`. It is not installed by default on Neon.
**How to avoid:** Phase-3 migration must start with `CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;`. The migration is already additive; these statements are idempotent.
**Warning signs:** `saveProduct` works but FTS returns no results. Or the tsvector build SQL errors immediately.

### Pitfall 5: Product detail LCP fails on Slow 4G due to lazy hero image

**What goes wrong:** LCP element (hero image) loads slowly because it is treated as lazy-loaded.
**Why it happens:** `<CldImage>` defaults to `loading="lazy"` like `<Image>`. The hero image is always above the fold and must be prioritized.
**How to avoid:** `<CldImage priority>` on the first/hero image only. Confirm by running Lighthouse on the preview deployment on throttled Slow 4G profile.

### Pitfall 6: hreflang points to wrong slugs

**What goes wrong:** hreflang links point to the current locale's slug for all locales (e.g., uz slug repeated for ru and en alternates).
**Why it happens:** The slug is per-locale (`product_translations.slug` unique per (locale, slug)). The detail page must JOIN all 3 locale translation rows to get all 3 slugs, not just the current locale's.
**How to avoid:** Product detail data fetch must `SELECT * FROM product_translations WHERE product_id = $id` (all locales, not `WHERE locale = $locale`) to build the `alternates.languages` map. Fallback: if a locale row is missing, omit that language from alternates rather than linking to a broken URL.

### Pitfall 7: `saveProduct` doesn't rebuild `product_search` (SRCH-05 gap)

**What goes wrong:** Admins save products but search returns no results. Phase 2 shipped `saveProduct` without the tsvector rebuild step.
**Why it happens:** Phase 2 CONTEXT.md explicitly noted: "Phase 2 ships with `product_search` empty/no-op."
**How to avoid:** Phase-3 must add the tsvector rebuild inside `saveProduct`'s transaction. Use `sql\`...\`` Drizzle escape for the `INSERT ... ON CONFLICT DO UPDATE` shape shown in Pattern 4.

### Pitfall 8: Sitemap `id` param is now a Promise in Next.js 16

**What goes wrong:** TypeScript error or runtime crash in `generateSitemaps` / `sitemap()` function.
**Why it happens:** Next.js 16 breaking change — `sitemap({ id })` now receives `id` as `Promise<string>`, not `string`.
**How to avoid:** `const resolvedId = await id;` in the sitemap function. [VERIFIED: nextjs.org/docs/app/guides/upgrading/version-16]

### Pitfall 9: imagePublicIds / datasheetPublicIds silently not persisted

**What goes wrong:** Admin uploads product images; they appear in the editor form but not on the public detail page.
**Why it happens:** `saveProduct` Zod schema accepts these arrays but the transaction body does NOT write them to the DB (verified by reading src/actions/products.ts — no image/datasheet INSERT). This is a Phase-2 deferred item that Phase 3 must close.
**How to avoid:** Phase-3 schema migration adds columns; Phase-3 saveProduct patch adds Step 6 (write arrays). Also update `duplicateProduct` to clone them.

### Pitfall 10: `manufacturer.is_official_rep` admin UI edit triggers revalidation correctly?

**What goes wrong:** Admin toggles `is_official_rep` on a manufacturer; public pages show stale data.
**Why it happens:** The existing `revalidateManufacturer(id)` fans out to `manufacturer:${id}` and `manufacturers-list`. As long as the admin-side manufacturer-edit form (plan 02-10) calls `revalidateManufacturer` after saving (it does — verified in `src/actions/manufacturers.ts`), the Phase-3 manufacturer landing pages will invalidate correctly. No new helper needed.
**Confirmation:** D-11 additive migration + admin UI extension are wired through the existing `saveManufacturer` Server Action which already calls `revalidateManufacturer`. [VERIFIED: revalidation.ts + actions/manufacturers.ts pattern]

---

## Code Examples

### ISR Product Detail Page with cacheTag

```typescript
// src/app/[locale]/products/[slug]/page.tsx
// Source: next.config.ts cacheComponents + nextjs.org/docs/app/api-reference/directives/use-cache

export default async function ProductDetailPage({ params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(locale, slug); // 'use cache' inside
  if (!product) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <ProductDetail product={product} locale={locale} />
    </>
  );
}

// Data fetch function (cached + tagged)
async function getProductBySlug(locale: string, slug: string) {
  'use cache';
  const row = await db
    .select({ /* all fields including all 3 locale slugs */ })
    .from(productTranslations)
    .innerJoin(products, eq(products.id, productTranslations.productId))
    .where(and(
      eq(productTranslations.locale, locale),
      eq(productTranslations.slug, slug),
      eq(products.status, 'published')
    ))
    .limit(1);
  if (!row[0]) return null;
  const p = row[0];
  cacheTag(`product:${p.products.id}`);
  cacheTag(`category:${p.products.categoryId}`);
  if (p.products.manufacturerId) cacheTag(`manufacturer:${p.products.manufacturerId}`);
  return p;
}
```

### Per-Locale Sitemap

```typescript
// src/app/sitemap-uz.xml/route.ts
// Source: Context7 /amannn/next-intl — getPathname for alternates
import { getPathname } from '@/i18n/navigation';
import type { MetadataRoute } from 'next';

export async function GET() {
  'use cache';
  cacheTag('sitemap');
  cacheLife('max');
  
  const products = await db
    .select({ id: productTranslations.productId, slug: productTranslations.slug, updated: products.updatedAt })
    .from(productTranslations)
    .innerJoin(products, and(eq(products.id, productTranslations.productId), eq(products.status, 'published')))
    .where(eq(productTranslations.locale, 'uz'));
  
  const entries: MetadataRoute.Sitemap = products.map(p => ({
    url: `https://manometr.uz/uz/products/${p.slug}`,
    lastModified: p.updated,
  }));
  
  const xml = buildSitemapXml(entries);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

### robots.txt

```typescript
// src/app/robots.txt/route.ts
export async function GET() {
  const content = `User-agent: *
Allow: /

Sitemap: https://manometr.uz/sitemap-index.xml`;
  return new Response(content, { headers: { 'Content-Type': 'text/plain' } });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unstable_cache` + `revalidate: number` | `'use cache'` + `cacheTag` + `cacheLife` | Next.js 16.0 | More granular; `unstable_cache` deprecated |
| `revalidateTag(tag)` single arg | `revalidateTag(tag, 'max')` two args | Next.js 16 (deprecated single-arg) | Phase-2 helpers already use 2-arg form — no change needed |
| `middleware.ts` convention | `proxy.ts` convention | Next.js 16 | Already correct in this codebase |
| `experimental.ppr` route segment | `cacheComponents: true` config | Next.js 16 | `cacheComponents` flag enables PPR + `'use cache'` |
| `images.minimumCacheTTL: 60` | `images.minimumCacheTTL: 14400` (4h default) | Next.js 16 | Better CDN cache hit ratio for product images |
| `sitemap({ id })` sync id | `sitemap({ id })` where `id` is `Promise<string>` | Next.js 16 | `await id` required |

**Deprecated/outdated:**
- `unstable_cache`: deprecated, replace with `'use cache'` directive
- `revalidateTag(tag)` single-argument: deprecated, TypeScript error, use `revalidateTag(tag, 'max')`
- `images.domains`: deprecated in Next.js 16, use `images.remotePatterns` (already correct)
- `middleware.ts` file: deprecated, use `proxy.ts` (already correct in this codebase)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `schema-dts` ^1.x is the current package for TypeScript JSON-LD types | Standard Stack | Minor — any typed JSON-LD approach works; `schema-dts` is the community standard |
| A2 | `to_tsquery(config, term || ':*')` is the correct prefix form for autocomplete | Pattern 4, Pitfall 3 | Autocomplete query fails; switch to `websearch_to_tsquery` or trigram similarity |
| A3 | Sanitizing `!&|()` from autocomplete input before appending `:*` is sufficient | Pitfall 3 | SQL injection via tsquery syntax — test thoroughly |
| A4 | `text[] DEFAULT '{}'` columns are sufficient for `imagePublicIds`/`datasheetPublicIds` vs a `product_media` sibling table | Gap 1 | If ordering/metadata per image (alt text, caption) is needed in v1, arrays are insufficient — use a sibling table |
| A5 | Neon does NOT have `unaccent` and `pg_trgm` pre-installed | Pitfall 4 | If already installed, `CREATE EXTENSION IF NOT EXISTS` is a no-op (safe either way) |
| A6 | `cacheComponents: true` in next.config.ts doesn't break existing admin pages | Pitfall 1 | Admin pages use `force-dynamic` which bypasses the cache — risk is low but test after enabling |

---

## Open Questions

1. **`imagePublicIds` / `datasheetPublicIds` storage shape**
   - What we know: Zod schema collects them; saveProduct drops them. Arrays exist in form.
   - What's unclear: Should Phase 3 use `text[] columns` on `product` (simple, no ordering) or a `product_media` table (ordered, supports alt text in Phase 4)?
   - Recommendation: `text[]` columns for v1 (simpler); Phase 4 can migrate to a media table if per-image metadata is needed for recipe/industry featured images.

2. **`product.stock_status` pill (Deferred from CONTEXT.md)**
   - What we know: Sketch 003 shows "В наличии" pill; `product` has no `stock_status` column.
   - What's unclear: User decision pending.
   - Recommendation: Drop the visual by default per CONTEXT.md deferred guidance. If user requests it, Phase-3 migration adds `product.stock_status TEXT CHECK (...) DEFAULT 'unknown'`.

3. **Search-results page: ISR-with-TTL vs force-dynamic**
   - What we know: Every query/locale combo is unique; caching by query would require per-query tags (complex).
   - Recommendation: `force-dynamic` for the search results page is the correct v1 choice — simple, correct, fast enough at 100–500 products. ISR-with-short-TTL adds cache-key management complexity for negligible gain.

4. **Admin UI extension for D-11 manufacturer fields**
   - What we know: D-11 says "Admin UI extension folded into existing manufacturer-edit page (plan 02-10 follow-on)".
   - What's unclear: Does this require a new admin plan (e.g., 03-XX-MANUFACTURER-ADMIN-EXTENSION) or is it small enough to fold into the Phase-3 migration plan?
   - Recommendation: Fold into the Phase-3 schema migration plan. The admin UI change is 2 form fields in an existing form — not a standalone plan.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | Next.js 16 | Yes | 20.19.4 | — |
| Postgres 16 (Neon) | FTS, migrations | Yes (Neon) | 16.x | — |
| `unaccent` extension | tsvector build | Unknown — NOT in migrations | — | Phase-3 migration adds `CREATE EXTENSION IF NOT EXISTS unaccent` |
| `pg_trgm` extension | trigram similarity | Unknown — NOT in migrations | — | Phase-3 migration adds `CREATE EXTENSION IF NOT EXISTS pg_trgm` |
| `schema-dts` | JSON-LD types | Not installed | — | Install via `pnpm add schema-dts` |
| `playwright` | E2E tests | Yes (installed) | — | — |
| Cloudinary credentials | CldImage | Yes (FOUND-06 verified) | — | — |

**Missing dependencies with no fallback:**
- None that block execution.

**Missing dependencies with fallback:**
- `unaccent` + `pg_trgm`: migration handles installation.
- `schema-dts`: install at Phase-3 start.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (node + dom projects) + Playwright (e2e) |
| Config file | `vitest.config.ts` (root), `playwright.config.ts` (root) |
| Quick run command | `pnpm vitest run` |
| Full suite command | `pnpm vitest run && pnpm playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | Locale switcher renders UZ/RU/EN buttons and navigates to correct URL | e2e | `pnpm playwright test tests/e2e/locale-switcher.spec.ts` | Wave 0 |
| CAT-02 | Category tree renders and category links work | e2e | `pnpm playwright test tests/e2e/category-nav.spec.ts` | Wave 0 |
| CAT-03 | Category listing page returns correct product count | integration | `pnpm vitest run tests/db/catalog.test.ts` | Wave 0 |
| CAT-04 | Faceted filter by numeric range + enum returns correct subset | integration | `pnpm vitest run tests/db/catalog.test.ts` | Wave 0 |
| CAT-05 | Filter state reflected in URL; shareable link returns same results | e2e | `pnpm playwright test tests/e2e/catalog-filters.spec.ts` | Wave 0 |
| CAT-06 | Product detail page renders spec tables grouped by group + hero image | e2e | `pnpm playwright test tests/e2e/product-detail.spec.ts` | Wave 0 |
| CAT-07 | Product detail serves HTML with product name on first byte (SSR) | e2e (fetch) | within `product-detail.spec.ts` | Wave 0 |
| CAT-08 | Product detail `<script type="application/ld+json">` contains Product type | unit | `pnpm vitest run tests/lib/jsonld.test.ts` | Wave 0 |
| SRCH-01 | Search query returns products matching name in current locale | integration | `pnpm vitest run tests/db/search.test.ts` | Wave 0 |
| SRCH-02 | Zero-hit locale falls back with banner | integration | `pnpm vitest run tests/db/search.test.ts` | Wave 0 |
| SRCH-03 | Autocomplete API returns products matching prefix | integration | `pnpm vitest run tests/api/autocomplete.test.ts` | Wave 0 |
| SRCH-04 | Exact SKU in search bar redirects 302 | e2e | within `product-detail.spec.ts` | Wave 0 |
| SRCH-05 | `saveProduct` transaction rebuilds `product_search` rows | integration | `pnpm vitest run tests/actions/products.test.ts` | Extend existing |
| MFG-01 | Manufacturers index page renders all manufacturers with logos | e2e | `pnpm playwright test tests/e2e/manufacturers.spec.ts` | Wave 0 |
| MFG-02 | Manufacturer detail page shows description + product list | e2e | within `manufacturers.spec.ts` | Wave 0 |
| SEO-01 | Every public page has hreflang for uz/ru/en + x-default | unit | `pnpm vitest run tests/lib/metadata.test.ts` | Wave 0 |
| SEO-02 | Product detail canonical matches current locale URL | unit | within `metadata.test.ts` | Wave 0 |
| SEO-03 | Sitemap XML includes products in all 3 locales | integration | `pnpm vitest run tests/api/sitemap.test.ts` | Wave 0 |
| SEO-04 | `next/font` Inter loads with cyrillic subset | manual | Lighthouse audit — manual only | — |
| SEO-05 | LCP on product detail < 2.5s on Slow 4G | manual/e2e | Lighthouse on preview deployment | — |
| OPS-01 migration | Phase-3 goto target swap in `admin-edit-revalidates.spec.ts` | e2e | Update goto in existing spec | Modify existing |

### Sampling Rate

- **Per task commit:** `pnpm vitest run`
- **Per wave merge:** `pnpm vitest run && pnpm playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/locale-switcher.spec.ts` — covers CAT-01
- [ ] `tests/e2e/category-nav.spec.ts` — covers CAT-02
- [ ] `tests/db/catalog.test.ts` — covers CAT-03, CAT-04
- [ ] `tests/e2e/catalog-filters.spec.ts` — covers CAT-05
- [ ] `tests/e2e/product-detail.spec.ts` — covers CAT-06, CAT-07, SRCH-04
- [ ] `tests/lib/jsonld.test.ts` — covers CAT-08
- [ ] `tests/db/search.test.ts` — covers SRCH-01, SRCH-02
- [ ] `tests/api/autocomplete.test.ts` — covers SRCH-03
- [ ] `tests/e2e/manufacturers.spec.ts` — covers MFG-01, MFG-02
- [ ] `tests/lib/metadata.test.ts` — covers SEO-01, SEO-02
- [ ] `tests/api/sitemap.test.ts` — covers SEO-03
- [ ] Extend `tests/actions/products.test.ts` — add SRCH-05 tsvector rebuild assertion
- [ ] Update `tests/e2e/admin-edit-revalidates.spec.ts` — swap goto target from `/uz/admin/products` to `/uz/products/<slug>` (noted in spec header as Phase-3 migration item)

---

## Security Domain

> `security_enforcement` is not set in `.planning/config.json` — treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Admin-only; public pages have no auth |
| V3 Session Management | No | Public pages have no sessions |
| V4 Access Control | No | All public routes are publicly accessible |
| V5 Input Validation | Yes | Search query sanitization before `to_tsquery`; filter params via nuqs type-safe parsers |
| V6 Cryptography | No | No crypto operations in public rendering |
| V7 Error Handling | Yes | `notFound()` for missing slugs; never expose DB errors in responses |

### Known Threat Patterns for Postgres FTS + EAV Filters

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| tsquery injection via search input | Tampering | Sanitize `!&|()` chars; use `plainto_tsquery` for full search, `to_tsquery(config, sanitized || ':*')` for autocomplete; Drizzle `sql\`\`` parameterizes the config arg |
| EAV filter parameter injection | Tampering | nuqs `parseAsFloat`/`parseAsString` parsers reject invalid types; Drizzle query builder parameterizes all values |
| Open redirect via SKU exact-match | Spoofing | 302 target is constructed from DB slug lookup (`/[locale]/products/<slug>`), never from user input directly |
| Denial of service via expensive filter combinations | Availability | Set `LIMIT` on all filter queries; aggregate counts cached with `cacheTag`; no unbounded queries |

---

## Project Constraints (from CLAUDE.md)

- **No e-commerce**: No prices, no cart, no `offers` JSON-LD (explicitly D-08). All "buy" intent routes to the contact form.
- **Translations**: Every translatable entity MUST use sibling `*_translations` tables. No per-locale columns on base tables.
- **Locale routing**: `/uz/...`, `/ru/...`, `/en/...`. Root redirects to detected locale. `localePrefix: 'always'` already wired.
- **Cache invalidation**: Every Server Action mutation MUST call `revalidateTag` for affected public pages. Phase-3 read paths consume the tags emitted by Phase-2 helpers.
- **Cloudinary**: Admin uploads only; DB stores `public_id` only. Phase-3 reads `public_id` and renders via `<CldImage>`.
- **Admin auth**: Not applicable to public pages. Phase-3 adds no admin surfaces (except D-11 manufacturer field extension which uses existing `saveManufacturer` action with `requireAdmin()` already wrapping it).

---

## Sources

### Primary (HIGH confidence)

- `nextjs.org/docs/app/api-reference/directives/use-cache` — `'use cache'` directive, `cacheTag`, `cacheLife` APIs [VERIFIED]
- `nextjs.org/docs/app/api-reference/functions/revalidateTag` — 2-arg form, stale-while-revalidate semantics [VERIFIED]
- `nextjs.org/docs/app/guides/upgrading/version-16` — breaking changes: async `sitemap({ id })`, removed `unstable_cache`, `cacheComponents` flag [VERIFIED]
- Context7 `/amannn/next-intl` — `generateMetadata` + `alternates.languages`, `getPathname` for sitemaps, middleware `link` header [VERIFIED]
- Context7 `/47ng/nuqs` — `createSearchParamsCache`, `useQueryStates`, server/client split [VERIFIED]
- Context7 `/cloudinary-community/next-cloudinary` — `<CldImage>` `priority` + `sizes` srcset behavior [VERIFIED]
- `.planning/research/ARCHITECTURE.md` — Pattern 5 tsvector build SQL, Pattern 2 EAV filter queries, Pattern 3 locale routing [VERIFIED: read full file]
- `src/lib/revalidation.ts` — exact tag fan-out per entity type [VERIFIED: read full file]
- `drizzle/0000_phase1_foundations.sql` + `drizzle/0001_overrated_shiva.sql` — confirmed no `CREATE EXTENSION`, no `image_public_ids` columns [VERIFIED: grep + read]
- `src/actions/products.ts` — confirmed `saveProduct` does not persist `imagePublicIds`/`datasheetPublicIds` [VERIFIED: read full file]

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — version pins, unaccent/pg_trgm rationale [CITED: project research doc]
- `.planning/phases/02-admin-panel/02-CONTEXT.md` — D-09 spec_field_group, D-11 product.status, D-12 revalidation helpers [CITED: project context doc]
- `.planning/phases/03-public-rendering-search-seo/03-CONTEXT.md` — all D-01 through D-11 locked decisions [CITED: project context doc]

### Tertiary (LOW confidence / ASSUMED)

- `schema-dts` as the TypeScript JSON-LD types package — [ASSUMED: well-known in the ecosystem but not verified via npm]
- `to_tsquery(config, term || ':*')` for autocomplete prefix — [ASSUMED: common Postgres pattern but not verified against official docs this session]
- `text[]` array columns as sufficient media storage shape — [ASSUMED: acceptable for v1; planner should confirm]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all key libraries verified via Context7 + official Next.js docs
- Architecture: HIGH — based on verified codebase reading + official docs
- Phase-2 tag coverage gaps: HIGH — derived from reading actual `revalidation.ts` source
- Schema gaps (media, extensions): HIGH — verified by reading actual migration SQL files
- Pitfalls: HIGH (structural) / MEDIUM (FTS query forms, autocomplete SQL)

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (Next.js 16 is stable; no fast-moving changes expected)
