# Architecture Research

**Domain:** B2B multilingual industrial product catalog (Next.js App Router + Postgres)
**Researched:** 2026-04-21
**Confidence:** MEDIUM-HIGH (architecture patterns are well-established; external verification via Context7/WebSearch was unavailable this session, so concrete version-pin claims are marked LOW and should be validated at scaffold time)

> **Note on confidence:** Context7 MCP, Bash-based ctx7 CLI fallback, WebSearch, and WebFetch were all blocked for this research pass. Recommendations below are grounded in the well-documented, long-stable patterns of Next.js App Router (v13+), Postgres full-text search, and the "headless ecommerce / catalog" reference architecture. Version-specific APIs (Next.js 15 caching semantics in particular) should be verified in the official Next.js docs before phase implementation — they changed meaningfully between 14 and 15.

---

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browsers / Bots)                      │
│    Public users (UZ/RU/EN), SEO crawlers, Admin team (authenticated)  │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────┴─────────────────────────────────────────┐
│                     VERCEL EDGE (Middleware)                          │
│   - Locale detection + rewrite to /[locale]/...                       │
│   - Admin auth gate (cookie check) for /[locale]/admin/*              │
│   - hreflang / canonical header helpers                               │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │
┌─────────────────────────────┴─────────────────────────────────────────┐
│                     NEXT.JS APP (Vercel Node Runtime)                 │
│  ┌─────────────────────────────┐   ┌──────────────────────────────┐   │
│  │ PUBLIC ROUTES  (SSR + ISR)  │   │ ADMIN ROUTES (Dynamic, Auth) │   │
│  │ /[locale]/                  │   │ /[locale]/admin/             │   │
│  │ /[locale]/products/[slug]   │   │  products, categories,       │   │
│  │ /[locale]/categories/[...]  │   │  spec-schemas, recipes,      │   │
│  │ /[locale]/recipes/[slug]    │   │  manufacturers, users,       │   │
│  │ /[locale]/industries/[slug] │   │  contact-submissions         │   │
│  │ /[locale]/search            │   │  → Server Actions for writes │   │
│  └──────────────┬──────────────┘   └──────────────┬───────────────┘   │
│                 │                                 │                   │
│  ┌──────────────┴─────────────────────────────────┴──────────────┐    │
│  │                     SERVICE / REPO LAYER                      │    │
│  │   (pure functions, typed with Drizzle/Prisma, cached with     │    │
│  │    unstable_cache + tag-based revalidation)                   │    │
│  │   - products.repo.ts  - categories.repo.ts                    │    │
│  │   - specs.repo.ts     - search.repo.ts                        │    │
│  │   - i18n.repo.ts      - media.repo.ts                         │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ SQL (pooled, e.g. Neon serverless driver)
┌─────────────────────────────┴───────────────────────────────────────┐
│                    MANAGED POSTGRES  (Neon / Supabase)              │
│  Core tables       Translation layer        Search / Specs          │
│  ┌────────────┐    ┌─────────────────┐    ┌──────────────────────┐  │
│  │ category   │    │ *_translations  │    │ product_spec_values  │  │
│  │ product    │◄───┤ (entity_id,     │    │ (product_id, key,    │  │
│  │ spec_field │    │  locale, field) │    │  num_value, txt_val, │  │
│  │ manufactr  │    └─────────────────┘    │  unit, is_extra)     │  │
│  │ recipe     │                           └──────────────────────┘  │
│  │ industry   │    ┌─────────────────────────────────────────────┐  │
│  │ contact    │    │ search_index (product_id, locale, tsv GIN)  │  │
│  │ admin_user │    └─────────────────────────────────────────────┘  │
│  └────────────┘                                                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
│  Cloudinary  (images + PDFs via signed direct uploads)              │
│  Resend / SES  (contact-form notifications, admin invite emails)    │
│  Auth.js (NextAuth)  (email magic-link for admin team)              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Edge middleware** | Locale detection, locale redirect (`/` → `/uz/`), admin auth gate | `middleware.ts` at repo root, runtime `experimental-edge` |
| **Public RSC pages** | SEO-rendered product/category/recipe pages, faceted filters | Server Components, `generateStaticParams` + `revalidate` |
| **Admin RSC pages** | CRUD UI for content team | Server Components for reads, **Server Actions** for writes |
| **Repo layer** | All DB access; one file per aggregate root | Pure TS functions, Drizzle or Prisma, wrapped in `unstable_cache` |
| **Postgres** | Source of truth: core entities, translations, spec values, FTS index | Neon (branchable) or Supabase (includes Auth if wanted) |
| **Translations tables** | Per-entity, per-locale field values | `<entity>_translations` (entity_id, locale, field columns) |
| **Spec storage** | Normalized per-product key-value rows typed by field definition | `product_spec_values` row-per-value + `spec_field` catalog |
| **Search index** | Locale-aware tsvector GIN index per product per locale | `product_search` table, materialized by trigger on write |
| **Cloudinary** | Image optimization + PDF hosting + CDN | Signed uploads from admin client, store returned `public_id` |
| **Auth provider** | Admin login (email magic link) | Auth.js v5 with Email provider, session cookie |
| **Transactional email** | Contact notifications, admin invites | Resend (simplest) or AWS SES |

---

## Recommended Project Structure

```
manometr/
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── [locale]/                   # Locale-prefixed public + admin routes
│   │   │   ├── layout.tsx              # Locale provider, <html lang>
│   │   │   ├── page.tsx                # Home (SSR + ISR)
│   │   │   ├── products/
│   │   │   │   ├── page.tsx            # Product list with filters
│   │   │   │   └── [slug]/page.tsx     # Product detail (ISR, tagged cache)
│   │   │   ├── categories/
│   │   │   │   └── [...slug]/page.tsx  # Category tree + filtered products
│   │   │   ├── recipes/[slug]/page.tsx # Article
│   │   │   ├── industries/[slug]/page.tsx
│   │   │   ├── manufacturers/[slug]/page.tsx
│   │   │   ├── search/page.tsx         # Fully dynamic (query-driven)
│   │   │   ├── contact/page.tsx        # Server Action form
│   │   │   └── admin/                  # Auth-gated admin tree
│   │   │       ├── layout.tsx          # Requires session
│   │   │       ├── products/…
│   │   │       ├── categories/…
│   │   │       ├── spec-schemas/…
│   │   │       ├── recipes/…
│   │   │       ├── manufacturers/…
│   │   │       ├── submissions/…
│   │   │       └── users/…
│   │   ├── api/
│   │   │   ├── cloudinary/sign/route.ts   # Signs direct-upload params
│   │   │   ├── revalidate/route.ts        # On-demand tag revalidation
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── sitemap.xml/route.ts
│   │   └── robots.txt/route.ts
│   ├── middleware.ts                   # Locale + admin gate
│   ├── i18n/
│   │   ├── config.ts                   # ['uz','ru','en'], default 'ru'
│   │   ├── dictionaries/{uz,ru,en}.json
│   │   └── get-dictionary.ts
│   ├── db/
│   │   ├── client.ts                   # Drizzle client (Neon HTTP driver)
│   │   ├── schema/                     # Table definitions
│   │   │   ├── products.ts
│   │   │   ├── categories.ts
│   │   │   ├── spec-fields.ts
│   │   │   ├── spec-values.ts
│   │   │   ├── translations.ts
│   │   │   ├── search.ts
│   │   │   ├── recipes.ts
│   │   │   ├── manufacturers.ts
│   │   │   ├── industries.ts
│   │   │   ├── contact-submissions.ts
│   │   │   └── admin-users.ts
│   │   └── migrations/                 # drizzle-kit generated
│   ├── repo/                           # Pure data-access functions
│   │   ├── products.ts
│   │   ├── categories.ts
│   │   ├── specs.ts
│   │   ├── search.ts
│   │   ├── recipes.ts
│   │   └── …
│   ├── lib/
│   │   ├── auth.ts                     # Auth.js config
│   │   ├── cloudinary.ts               # Signing + URL helpers
│   │   ├── slug.ts                     # Transliteration (uz→latin safe slug)
│   │   ├── cache-tags.ts               # Centralized tag constants
│   │   └── zod/                        # Input schemas for server actions
│   ├── components/
│   │   ├── ui/                         # shadcn-style primitives
│   │   ├── product/                    # SpecTable, FilterSidebar, …
│   │   ├── admin/                      # SpecSchemaEditor, MediaUploader, …
│   │   └── layout/                     # TopNav, LocaleSwitcher, Footer
│   └── actions/                        # Server Actions (writes)
│       ├── products.ts
│       ├── categories.ts
│       ├── specs.ts
│       ├── recipes.ts
│       └── contact.ts
├── drizzle.config.ts
├── next.config.mjs
└── package.json
```

### Structure Rationale

- **`[locale]` segment at the root:** Matches Next.js App Router convention for subpath i18n; makes locale a first-class URL fact (not a cookie), which SEO crawlers need.
- **`repo/` separate from `db/`:** `db/` defines *what* the data looks like; `repo/` defines *how the app reads/writes it*. Repo functions wrap `unstable_cache` so pages stay cache-transparent.
- **`actions/` for writes only:** Server Actions for admin mutations (type-safe, progressive-enhancement-friendly); `api/` reserved for non-form integrations (Cloudinary sign, webhooks).
- **Admin routes live inside `[locale]/admin`, not a separate app:** Same Next.js build, same session model, one deploy. Middleware enforces gate. A separate app would double infra for no v1 gain.
- **Translations in `db/schema/translations.ts`:** All `*_translations` tables defined together so the translation pattern is easy to review and evolve.

---

## Architectural Patterns

### Pattern 1: Translated-fields = sibling `*_translations` table (one row per entity × locale)

**What:** Every content entity has a base table (locale-agnostic fields: id, slug-per-locale, timestamps, foreign keys, numeric spec values) and a sibling `<entity>_translations` table containing every translatable field per locale.

**When to use:** Three or more first-class locales, where untranslated rows are a real state and where SQL filtering/sorting on translated fields must work.

**Trade-offs:**
- Pros: Normal SQL indexes on translated text; clean "missing translation" state (absent row); trivial to add a 4th locale; per-locale FTS indexes align cleanly.
- Cons: Every read JOINs one translations table per entity — acceptable at 100–500 products; trivial at 10k with proper indexes.

**Why not JSONB-per-row (`{ "ru": "...", "uz": "...", "en": "..." }` in one column):**
- Cannot efficiently build a **per-locale tsvector** (you'd have to extract JSON at query time on every search).
- Harder to express "this product is not yet translated to EN" — null vs empty vs missing is messy.
- Postgres JSONB path expressions are fine but bespoke; translations table uses ordinary SQL every developer reads.

**Why not per-column (`name_uz`, `name_ru`, `name_en`):**
- Adding a 4th locale = schema migration + every query changes. Decision log already anticipates this: "designing for 3 from the start" explicitly avoids this trap.
- Massive column sprawl on Products (40+ columns with 10+ translatable fields × 3+ locales).

**Example:**
```sql
-- Base table: locale-agnostic, numerically filterable, slug per locale
CREATE TABLE product (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES category(id),
  manufacturer_id UUID REFERENCES manufacturer(id),
  sku           TEXT UNIQUE,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Translatable fields, one row per (product, locale)
CREATE TABLE product_translations (
  product_id    UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  locale        TEXT NOT NULL CHECK (locale IN ('uz','ru','en')),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  short_desc    TEXT,
  long_desc     TEXT,
  PRIMARY KEY (product_id, locale),
  UNIQUE (locale, slug)
);
CREATE INDEX product_translations_locale_slug ON product_translations(locale, slug);
```

Read pattern (single JOIN, locale fallback in SQL):

```sql
-- Fetch product with locale fallback: ru → en → uz
SELECT
  p.id, p.sku,
  COALESCE(t.name, tf.name)  AS name,
  COALESCE(t.slug, tf.slug)  AS slug
FROM product p
LEFT JOIN product_translations t   ON t.product_id  = p.id AND t.locale  = $1 -- requested
LEFT JOIN product_translations tf  ON tf.product_id = p.id AND tf.locale = 'ru' -- fallback
WHERE p.id = $2;
```

### Pattern 2: Hybrid spec schema = `spec_field` catalog + row-per-value `product_spec_values`

**What:** Categories own a set of *field definitions* (name, data_type, unit, required). Products materialize one row per (product, field) in a narrow long-table. Per-product extras live in the same table with `is_extra = true` and no `spec_field_id`.

**When to use:** You need filterable/sortable numeric specs *and* free-form extras, and the schema itself is edited by admins at runtime.

**Trade-offs:**
- Pros: Range filters and sorts are real SQL (`WHERE num_value BETWEEN ...`); compare-two-products is a JOIN on the same table keyed by field; admins can add fields without code changes.
- Cons: Classic EAV shape — requires disciplined indexes and a thin query helper. At 100–500 products × ~30 fields = ~15k rows, well within trivial Postgres territory.

**Why not JSONB-per-product (`specs: { pressure_max: 10 }`):**
- Range filters on JSONB need GIN + expression indexes per field, and unit/type enforcement lives in application code. The admin-edited schema in particular argues against it: you'd be validating dynamic shapes anyway.
- Cross-product comparison ("show voltage, pressure, material for these 3 products") is awkward in JSONB but a single SELECT in the long-table shape.

**Why not one wide column per spec (`products.pressure_max`, `products.material`)**:
- Admin cannot add fields at runtime without a migration — contradicts the "category admins define schema" requirement.

**Schema:**
```sql
CREATE TABLE spec_field (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES category(id),
  key           TEXT NOT NULL,               -- stable machine key, e.g. 'pressure_max'
  data_type     TEXT NOT NULL CHECK (data_type IN ('number','text','enum','bool')),
  unit          TEXT,                         -- 'bar', 'mm', '°C'
  required      BOOL NOT NULL DEFAULT false,
  sort_order    INT  NOT NULL DEFAULT 0,
  filter_kind   TEXT CHECK (filter_kind IN ('range','select','toggle',NULL)),
  UNIQUE (category_id, key)
);

CREATE TABLE spec_field_translations (
  spec_field_id UUID NOT NULL REFERENCES spec_field(id) ON DELETE CASCADE,
  locale        TEXT NOT NULL,
  label         TEXT NOT NULL,
  description   TEXT,
  PRIMARY KEY (spec_field_id, locale)
);

CREATE TABLE product_spec_values (
  id            BIGSERIAL PRIMARY KEY,
  product_id    UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  spec_field_id UUID REFERENCES spec_field(id) ON DELETE SET NULL, -- NULL for "extras"
  is_extra      BOOL NOT NULL DEFAULT false,
  extra_key     TEXT,                          -- machine key when is_extra=true
  num_value     NUMERIC,                       -- typed storage: filter on this
  text_value    TEXT,                          -- typed storage: free-form text
  bool_value    BOOL,
  enum_value    TEXT,
  unit          TEXT,                          -- override allowed
  sort_order    INT NOT NULL DEFAULT 0,
  CHECK (is_extra = false OR extra_key IS NOT NULL)
);

-- Free-form extras: translatable text values live in a sibling table
CREATE TABLE product_spec_value_translations (
  value_id      BIGINT NOT NULL REFERENCES product_spec_values(id) ON DELETE CASCADE,
  locale        TEXT NOT NULL,
  text_value    TEXT,
  PRIMARY KEY (value_id, locale)
);

-- Indexes: filters, sort, comparison
CREATE INDEX psv_field_num  ON product_spec_values (spec_field_id, num_value);
CREATE INDEX psv_field_enum ON product_spec_values (spec_field_id, enum_value);
CREATE INDEX psv_product    ON product_spec_values (product_id);
```

**Filter query ("pressure 0–10 bar, material = steel"):**
```sql
SELECT p.id
FROM product p
WHERE p.category_id = $cat
  AND EXISTS (SELECT 1 FROM product_spec_values v
              JOIN spec_field f ON f.id = v.spec_field_id
              WHERE v.product_id = p.id
                AND f.key = 'pressure_max'
                AND v.num_value BETWEEN 0 AND 10)
  AND EXISTS (SELECT 1 FROM product_spec_values v
              JOIN spec_field f ON f.id = v.spec_field_id
              WHERE v.product_id = p.id
                AND f.key = 'material'
                AND v.enum_value = 'steel');
```

**Compare-two-products query:**
```sql
SELECT f.key, f.id,
       MAX(CASE WHEN v.product_id = $a THEN COALESCE(v.num_value::text, v.enum_value, v.text_value) END) AS a_val,
       MAX(CASE WHEN v.product_id = $b THEN COALESCE(v.num_value::text, v.enum_value, v.text_value) END) AS b_val
FROM spec_field f
JOIN product_spec_values v ON v.spec_field_id = f.id
WHERE v.product_id IN ($a, $b)
GROUP BY f.key, f.id, f.sort_order
ORDER BY f.sort_order;
```

### Pattern 3: Locale routing via `[locale]` segment + middleware rewrite

**What:** A single dynamic segment `[locale]` at the root of `app/` carries locale through to every page. Middleware inspects the incoming path; if no locale prefix, it redirects to the best match (cookie → Accept-Language → default `ru`).

**When to use:** Three locales, SEO-critical pages, same-origin (no subdomains). Matches Next.js official "sub-path routing" guidance for App Router.

**Trade-offs:**
- Pros: Single origin, single cert, single deploy, clean hreflang generation; locale is explicit in the URL (crawlable, shareable).
- Cons vs. subdomains: No per-locale CDN / geo-pinning, but Vercel's global edge makes that irrelevant at this scale.
- Cons vs. Accept-Language only: Would fail SEO outright (crawlers index one URL per page).

**Decision: `/uz/...`, `/ru/...`, `/en/...` subpath routing. Default locale `ru`. Root `/` 307-redirects to `/<detected>/`.**

**hreflang / canonical rules:**
- Every public page emits `<link rel="alternate" hreflang="uz" href="/uz/…"/>` for each locale *plus* `<link rel="alternate" hreflang="x-default" href="/ru/…"/>`.
- `<link rel="canonical" href="/<currentLocale>/…"/>` points at the locale-scoped URL (each locale version is its own canonical — do NOT canonicalize all locales to one).
- Slugs are per-locale (`product_translations.slug` unique per locale). Same product has 3 different slug URLs, all cross-linked by hreflang.

**Middleware sketch:**
```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['uz','ru','en'] as const;
const DEFAULT = 'ru';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Admin gate: /[locale]/admin/* requires session
  if (/^\/(uz|ru|en)\/admin(\/|$)/.test(pathname)) {
    const session = req.cookies.get('authjs.session-token');
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = `/${pathname.split('/')[1]}/login`;
      return NextResponse.redirect(url);
    }
  }

  // 2. Locale rewrite for paths missing a locale prefix
  const hasLocale = LOCALES.some(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const cookie = req.cookies.get('locale')?.value;
    const header = req.headers.get('accept-language')?.slice(0,2);
    const chosen = LOCALES.includes(cookie as any) ? cookie!
                 : LOCALES.includes(header as any) ? header!
                 : DEFAULT;
    const url = req.nextUrl.clone();
    url.pathname = `/${chosen}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url, 307);
  }
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
```

### Pattern 4: Rendering strategy — RSC + per-route caching tags

**What:** Use React Server Components as the default; reach for Client Components only for interactive islands (filter sidebar, admin forms, language switcher). Use tag-based revalidation so admin edits invalidate exactly the right pages.

**Rendering decision matrix:**

| Route | Render | Cache | Client JS |
|-------|--------|-------|-----------|
| `/[locale]/` (home) | RSC, `revalidate = 3600` + tag `home` | ISR | minimal |
| `/[locale]/products/[slug]` | RSC, `generateStaticParams` for top products, `revalidate = 3600`, tag `product:<id>` | ISR, on-demand | SpecTable is server; ImageGallery is client |
| `/[locale]/products` (list w/ filters) | RSC page + client `<FilterSidebar/>`; read filters from `searchParams` | **Dynamic** (filter permutations infinite) — but wrap repo calls in `unstable_cache` keyed by filter hash | filters, pagination |
| `/[locale]/categories/[...slug]` | RSC, ISR, tag `category:<id>` | ISR | minimal |
| `/[locale]/recipes/[slug]` | RSC, ISR, tag `recipe:<id>` | ISR | minimal |
| `/[locale]/industries/[slug]` | RSC, ISR | ISR | minimal |
| `/[locale]/search` | **Fully dynamic** (`dynamic = 'force-dynamic'`) — query-driven | no cache | search box |
| `/[locale]/contact` | Static shell + Server Action form | static | form |
| `/[locale]/admin/*` | **Fully dynamic** (`dynamic = 'force-dynamic'`), session-gated | no cache | rich admin UI |
| `sitemap.xml`, `robots.txt` | RSC, `revalidate = 86400` | daily | — |

**On-demand revalidation after admin writes:**
```ts
// src/actions/products.ts
'use server';
import { revalidateTag } from 'next/cache';

export async function updateProduct(id: string, data: ProductInput) {
  await repo.products.update(id, data);
  revalidateTag(`product:${id}`);
  revalidateTag(`category:${data.categoryId}`);
  revalidateTag('sitemap');
}
```

> **LOW confidence on specific caching API names:** `unstable_cache`, `revalidateTag`, and their defaults have shifted between Next.js 14 and 15 (and 15's `"use cache"` directive is newer still). Verify current names against the official docs at scaffold time — the *pattern* (RSC + tag-based invalidation) is stable; the exact API names are not.

### Pattern 5: Full-text search — one `product_search` row per (product, locale), GIN-indexed

**What:** A dedicated search table stores a materialized `tsvector` per product per locale, built from weighted fields (name, short_desc, long_desc, relevant spec values concatenated). Populated by trigger (or by application code in the write path — simpler) on product write.

**When to use:** 100–500 products scaling toward a few thousand, with "results respect current locale, fall back gracefully when a field is untranslated" as an explicit requirement.

**Why a separate table (not a generated column on `product`):**
- Per-locale tsvectors need a per-locale row; a generated column would force one tsvector per locale as columns (fine but duplicative) or JSONB (unindexable per-locale).
- Clean to rebuild with a cron job or admin button.
- Keeps the hot write path off the product table's indexes.

**Why not Meilisearch / Typesense / Elasticsearch in v1:**
- At 100–500 documents × 3 locales = ~1500 documents, Postgres FTS is genuinely excellent and adds zero infra.
- Revisit at ~5k+ products or when typo-tolerance becomes a hard requirement — Postgres FTS is adequate but not as forgiving as Meilisearch.

**Schema:**
```sql
CREATE TABLE product_search (
  product_id   UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  locale       TEXT NOT NULL,
  search_tsv   TSVECTOR NOT NULL,
  PRIMARY KEY (product_id, locale)
);
CREATE INDEX product_search_tsv ON product_search USING GIN (search_tsv);
CREATE INDEX product_search_locale ON product_search (locale);
```

**Per-locale tsvector build (application-side, in the write path):**
```sql
-- Rebuild one locale row after a product write
INSERT INTO product_search (product_id, locale, search_tsv)
SELECT
  p.id,
  $locale,
  setweight(to_tsvector($pg_config, coalesce(t.name,''))     , 'A') ||
  setweight(to_tsvector($pg_config, coalesce(t.short_desc,'')), 'B') ||
  setweight(to_tsvector($pg_config, coalesce(t.long_desc,'')) , 'C') ||
  setweight(to_tsvector($pg_config, coalesce(agg.spec_text,'')), 'D')
FROM product p
LEFT JOIN product_translations t ON t.product_id = p.id AND t.locale = $locale
LEFT JOIN LATERAL (
  SELECT string_agg(COALESCE(psvt.text_value, v.text_value, v.enum_value, v.num_value::text, ''), ' ') AS spec_text
  FROM product_spec_values v
  LEFT JOIN product_spec_value_translations psvt
    ON psvt.value_id = v.id AND psvt.locale = $locale
  WHERE v.product_id = p.id
) agg ON true
WHERE p.id = $product_id
ON CONFLICT (product_id, locale) DO UPDATE SET search_tsv = EXCLUDED.search_tsv;
```

**`$pg_config` mapping:**
- `ru` → `'russian'` (stemmer for Russian morphology)
- `en` → `'english'`
- `uz` → `'simple'` (Postgres has no Uzbek dictionary; `simple` does lowercase + tokenize without stemming, which is the documented fallback for unsupported languages)

**Query with cross-locale fallback:**
```sql
-- Primary search in user's locale; if zero results, fall back to RU, then EN
WITH q AS (SELECT plainto_tsquery($pg_config, $query) AS tsq)
SELECT p.id, ts_rank(s.search_tsv, q.tsq) AS rank
FROM product_search s
JOIN product p ON p.id = s.product_id
CROSS JOIN q
WHERE s.locale = $locale AND s.search_tsv @@ q.tsq
ORDER BY rank DESC
LIMIT 50;
-- Application checks row count; if empty, re-runs with locale='ru', then 'en'
```

### Pattern 6: Admin writes via Server Actions; public reads via RSC; external integrations via API routes

**What:** Three distinct write/read surfaces:
- **Public reads:** RSC calling repo functions directly (no HTTP, no JSON).
- **Admin writes:** Server Actions (`'use server'`) invoked from admin forms. Zod-validate input, perform DB work, `revalidateTag` the affected pages.
- **External integrations:** `app/api/.../route.ts` for things that *must* be HTTP — Cloudinary upload-signature endpoint, Auth.js callbacks, on-demand revalidation webhook, email webhook callbacks.

**Why this split:**
- Server Actions eliminate hand-written JSON endpoints for internal CRUD and carry Zod validation naturally.
- API routes remain the right tool for anything external (third-party callbacks, signed-URL mint points).
- RSC reads skip the HTTP boundary entirely — simpler and faster than fetching your own API.

### Pattern 7: Cloudinary signed direct uploads

**What:** Admin UI uploads images and PDFs directly to Cloudinary from the browser using a short-lived signature the Next.js server mints. Next.js never touches the file bytes.

**Flow:**
```
[Admin browser]
   1. Select file
   2. POST /api/cloudinary/sign    → returns { signature, timestamp, apiKey, folder }
   3. POST https://api.cloudinary.com/v1_1/<cloud>/auto/upload  (file + params)
   4. Cloudinary returns { public_id, secure_url, ... }
   5. Admin form submits Server Action with { public_id }
   6. DB stores public_id; public pages build URL from it
```

**Why direct-upload not round-trip:**
- Vercel serverless has request-body size limits (default ~4.5 MB); PDFs and hi-res product images exceed this.
- Round-trip wastes Vercel execution time and bandwidth for no benefit.

**Example sign endpoint:**
```ts
// src/app/api/cloudinary/sign/route.ts
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) return new Response('Unauthorized', { status: 401 });

  const { folder } = await req.json();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  );
  return Response.json({
    signature, timestamp, folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
```

Store only `public_id` + `resource_type` (`image`/`raw` for PDFs) + `version` in DB; build URLs at read time with `cloudinary.url(public_id, { ... })` to get free transformations.

---

## Data Flow

### ERD Sketch (textual)

```
admin_user  ──────────────── (audits, not shown) ─────────────── *
                                                                 │
category (self-ref tree) ──< spec_field                           │ creates
      │                          │                                │
      │                          └──< spec_field_translations     │
      │                                                           │
      └──<─ product >──── manufacturer                            │
                │                                                 │
                ├──< product_translations                         │
                ├──< product_spec_values >──── spec_field (opt)   │
                │         │                                       │
                │         └──< product_spec_value_translations    │
                ├──< product_media (cloudinary public_ids)        │
                ├──< product_search (per-locale tsv GIN)          │
                ├──>── recipe (M:N via product_recipes)           │
                └──>── industry (M:N via product_industries)      │
                                                                  │
recipe ──< recipe_translations                                    │
industry ──< industry_translations                                │
manufacturer ──< manufacturer_translations                        │
                                                                  │
contact_submission (no translations — user-submitted raw) ────────┘
```

### Request Flow — public product page

```
GET /ru/products/manometr-md-100
    ↓
Edge middleware (locale=ru, not admin → pass through)
    ↓
app/[locale]/products/[slug]/page.tsx   (RSC)
    ↓
repo.products.getBySlug('ru','manometr-md-100')     ← unstable_cache, tag=product:<id>
    ↓
  SELECT product + JOIN product_translations(locale='ru')
  SELECT product_spec_values + JOIN spec_field + JOIN spec_field_translations('ru')
  SELECT product_media (cloudinary public_ids)
  SELECT manufacturer + JOIN manufacturer_translations('ru')
  SELECT related recipes/industries
    ↓
Render SpecTable (server), ImageGallery (client island), DatasheetLinks
    ↓
<Head>: hreflang for uz/ru/en + x-default; canonical to /ru/…; JSON-LD Product
    ↓
HTML response, cached for 1h (ISR), tag=product:<id>
```

### Request Flow — admin updates a product

```
Admin edits product form  →  Server Action updateProduct(id, data)
    ↓
Zod validation (src/lib/zod/product.ts)
    ↓
BEGIN TRANSACTION
  UPDATE product SET …
  UPSERT product_translations (ru / uz / en rows)
  DELETE product_spec_values WHERE product_id = id
  INSERT product_spec_values (all rows)
  UPSERT product_search (ru / uz / en rows — rebuild tsvectors)
COMMIT
    ↓
revalidateTag(`product:${id}`)
revalidateTag(`category:${catId}`)
revalidateTag('sitemap')
    ↓
Return { ok: true } — admin UI optimistically updates
```

### Request Flow — search

```
GET /ru/search?q=manometr+10bar
    ↓
Search RSC (force-dynamic)
    ↓
repo.search.query('ru', 'manometr 10bar')
    ↓
  SELECT … FROM product_search WHERE locale='ru' AND search_tsv @@ plainto_tsquery('russian', $q)
  If 0 rows → retry locale='en'
  If 0 rows → retry locale='uz' with 'simple'
    ↓
Hydrate product rows + translations (current locale with fallback)
    ↓
Render results list
```

### Request Flow — contact submission

```
Public contact form (client component inside RSC page)
    ↓ Server Action submitContact(data)
    ↓
Zod validate + basic rate-limit (upstash/redis optional) + honeypot
    ↓
INSERT contact_submission
    ↓
Enqueue Resend email to admins (fire-and-forget, with error logging)
    ↓
Return { ok: true }
```

### Request Flow — image/PDF upload

```
Admin form picks file
    ↓ POST /api/cloudinary/sign  → { signature, timestamp, folder, apiKey, cloudName }
    ↓ POST https://api.cloudinary.com/v1_1/<cloud>/auto/upload (direct, multipart)
    ↓ { public_id, secure_url, bytes, format, ... }
    ↓ Server Action saveProductMedia(productId, public_id, kind)
    ↓ INSERT product_media (product_id, public_id, kind, position)
    ↓ revalidateTag(`product:${productId}`)
```

---

## Build Order / Dependency Chain

Concrete dependency graph for the roadmap's phase ordering:

```
1. DB connection + migrations runner (drizzle-kit + Neon)
          │
2. Core schema: admin_user, category (tree), manufacturer, + their translations
          │
3. Auth.js email magic-link + admin gate middleware
          │
4. Admin shell layout + protected routes (empty CRUD pages)
          │
5. Admin: Category CRUD (tree editor) + Manufacturer CRUD (with translations)
          │
6. spec_field catalog CRUD per category  ◄── blocks everything spec-related
          │
7. product + product_translations CRUD in admin    (no specs yet, just content)
          │
8. product_spec_values CRUD (driven by the category's spec_field set + extras) ◄──── depends on 6,7
          │
9. Cloudinary signing endpoint + MediaUploader component ◄──── needed for useful products
          │
10. product_media linkage (images, datasheets)
          │
11. Public product detail page + category listing page (no filters yet)
          │
12. product_search table + trigger-or-hook to rebuild tsvectors on product writes  ◄── depends on 7,8
          │
13. /search page (query against product_search)
          │
14. Filter sidebar on category page (driven by spec_field.filter_kind) ◄── depends on 8,12
          │
15. recipe + recipe_translations CRUD + public recipe pages
          │
16. industry + industry_translations CRUD + public industry pages
          │
17. product ↔ recipe/industry M:N relationships ("Used in" section)
          │
18. contact_submission table + public form + Resend wiring + admin inbox
          │
19. sitemap.xml / robots.txt / JSON-LD / hreflang audit
          │
20. Admin invite flow (email invite → magic-link signup)
```

**Hard dependencies (cannot swap order):**
- `spec_field` before `product_spec_values` (values reference field definitions).
- `product_translations` before `product_search` (FTS sources translations).
- `product` + `product_spec_values` before filter UI (filter metadata comes from fields + value ranges).
- Cloudinary signing before media upload.
- Auth + middleware before any admin route is useful.

**Soft parallelizations (can interleave):**
- Recipes, industries, manufacturers — independent content types; can run in parallel once category/product are up.
- Contact form — can ship any time after phase 4 (admin shell exists to view submissions).

---

## Deployment Boundaries

| Runs on Vercel (Node runtime) | Runs on Vercel (Edge runtime) | Runs in Postgres |
|---|---|---|
| All RSC pages | `middleware.ts` only | Tables, indexes (B-tree + GIN) |
| Server Actions (writes) | (small, fast: locale detect + auth cookie check) | `tsvector`, `to_tsvector`, `ts_rank`, `plainto_tsquery` |
| API routes (Cloudinary sign, auth, revalidate) | | `JSONB` extras (minimal use — prefer typed columns) |
| `sitemap.xml`, `robots.txt` | | Referential integrity (`ON DELETE CASCADE`) |
| Cron revalidation (optional) | | Optional: trigger to call `pg_notify` on write (not needed v1) |

**Explicitly not server-side stored procedures:** search index rebuild is handled in the app's write path (simpler to reason about, visible in repo code, easy to unit test). Triggers become a "v1.5 optimization" if write amplification becomes painful.

**Connection pooling:** Use Neon's HTTP/serverless driver (or Supabase's pgBouncer) to survive Vercel's serverless cold-start fan-out. Avoid long-lived `pg` pools in serverless — they exhaust connection limits quickly.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–500 products, <1k DAU (v1 target) | Everything above. No caches beyond Next.js ISR. Single Postgres. |
| 500–5k products, 1k–10k DAU | Add Redis (Upstash) for hot filter-permutation caches on category pages. Revisit whether `product_search` should become a materialized view refreshed by cron. |
| 5k+ products, 10k+ DAU | Consider dedicated search engine (Meilisearch/Typesense) if typo-tolerance or synonyms matter. Read-replica for Postgres. Split admin to its own deploy if the team grows past 10 editors. |

### Scaling Priorities (what breaks first)

1. **Filter queries on category pages** — combinatorial joins on `product_spec_values`. Fix: cache repo results by filter hash (`unstable_cache`), add covering indexes per common filter field, and at worst denormalize "the 5 most-filtered spec fields" into columns on `product`.
2. **FTS recall quality in Uzbek** — Postgres has no Uzbek dictionary; `simple` is adequate but primitive. Fix when it hurts: build a custom dictionary with synonyms, or move to Meilisearch which has better unsupported-language defaults.
3. **Admin write fan-out** — rebuilding three `product_search` rows + three translation upserts + spec value replace is a ~5-statement transaction. Fine at 100–500 products; if editing becomes slow, move FTS rebuild to a background job (trigger → `pg_notify` → worker).

---

## Anti-Patterns

### Anti-Pattern 1: Storing translations as JSONB `{uz, ru, en}` columns on the base row

**What people do:** Add a `name JSONB` column on `product` holding `{ "uz": "...", "ru": "...", "en": "..." }`, and index with a GIN expression.
**Why it's wrong:** (1) Per-locale tsvector FTS becomes painful — you'd extract JSON fields in every indexed expression per locale. (2) "Not yet translated" becomes ambiguous — is an empty string different from missing? (3) Ordinary developers have to learn JSON path syntax to read the data. (4) Adding a 4th locale still touches every seeded row.
**Do this instead:** `*_translations` tables, one row per (entity, locale), with ordinary columns.

### Anti-Pattern 2: Wide-row spec storage (`products.pressure_max`, `products.material`, …)

**What people do:** Add a column per known spec field to the products table and migrate when admins need a new one.
**Why it's wrong:** The requirement explicitly says admins define fields at runtime per category. Every new field becomes a migration; the products table becomes 100+ columns, most NULL for any given row.
**Do this instead:** `spec_field` catalog + row-per-value `product_spec_values`, as above.

### Anti-Pattern 3: All specs in a single JSONB bag (`products.specs JSONB`)

**What people do:** Store the entire spec set as `{ pressure_max: 10, material: "steel", ... }` and filter with `specs->>'pressure_max'`.
**Why it's wrong:** Numeric range filters need casting on every query (`(specs->>'pressure_max')::numeric BETWEEN ...`) plus one expression index per filtered field. Type/unit enforcement lives entirely in app code. Admin-editable schema still needs a separate catalog table — so you end up with both shapes.
**Do this instead:** Typed long-table storage; reserve JSONB only for genuinely unstructured extras *if* the long-table shape proves too tedious — which at this scale it won't.

### Anti-Pattern 4: Serving all locales from the same URL via cookie/header

**What people do:** `example.com/products/manometr-md-100` changes language based on `Accept-Language` or a cookie.
**Why it's wrong:** Search engines index one URL per page — they see whatever locale happened to be detected on crawl. hreflang is impossible. Shared links show the sharer's locale to the recipient.
**Do this instead:** `/uz/…`, `/ru/…`, `/en/…` with per-locale canonicals and hreflang, as specified above.

### Anti-Pattern 5: Round-tripping uploads through Next.js API routes

**What people do:** `multipart/form-data` POST to `/api/upload` → Next.js reads file → streams to Cloudinary.
**Why it's wrong:** Vercel serverless request body limit (~4.5MB default) blocks larger PDFs/images; doubles bandwidth; burns execution time for bytes Vercel has no reason to see.
**Do this instead:** Signed direct upload — Next.js mints a signature, browser uploads to Cloudinary, server only stores the returned `public_id`.

### Anti-Pattern 6: One tsvector column on `product` union-ing all locales

**What people do:** `product.search_tsv` = `to_tsvector('simple', name_ru || name_uz || name_en)`.
**Why it's wrong:** No stemming per locale; cross-locale pollution in rankings; can't bias to current locale; can't fall back cleanly.
**Do this instead:** One row per (product, locale) with its own tsvector; query primary locale first, fall back if empty.

### Anti-Pattern 7: Server-rendering the admin on every read with no cache

**What people do:** Admin is a data grid; every keystroke refetches the world via SSR.
**Why it's wrong:** Admin is not SEO-sensitive but *is* latency-sensitive. Each SSR round-trip compounds.
**Do this instead:** Admin pages use `dynamic = 'force-dynamic'` but the interactive grids/forms are client components fetching via Server Actions (for writes) or RSC slots (for initial load) — avoid duplicate request cycles.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Cloudinary** | Signed direct uploads from browser; Next.js mints signatures via `/api/cloudinary/sign`; DB stores `public_id`. | Use `auto/upload` endpoint (handles both images and PDFs via `resource_type=auto`). Organize assets in folders `/products/<id>/…`, `/recipes/<id>/…`. |
| **Neon / Supabase Postgres** | Drizzle ORM with serverless HTTP driver. | Use branched databases for preview deploys (Neon feature); run migrations in a Vercel deploy step. |
| **Auth.js (NextAuth) v5** | Email magic-link provider; session stored as JWT cookie; `admin_user` table keyed by email. | Keep `admin_user` as app-owned table — Auth.js only authenticates identity; authorization is your code reading `admin_user.role = 'admin'`. |
| **Resend (email)** | Server-side SDK call from Server Actions (`sendContactNotification`, `sendAdminInvite`). | Use React Email for templates; test with preview deploys. Fire-and-forget but log failures. |
| **Vercel** | Standard deploy target; `vercel.json` for cron jobs if added later; env vars in project settings. | Preview deploys must use preview Neon branch to avoid polluting prod data. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Public page ↔ repo layer** | Direct function call in RSC (no HTTP) | Repo functions are the SQL boundary; pages never write raw SQL. |
| **Admin form ↔ repo layer** | Server Action → Zod validate → repo function → `revalidateTag` | Zod schemas live in `src/lib/zod/*`, shared between form and action. |
| **Repo layer ↔ DB** | Drizzle query builder (typed) | Never use raw client except for FTS expressions (`sql\`\`` tag). |
| **RSC ↔ Client islands** | Props passed server → client; client events invoke Server Actions | No custom API endpoints for internal UI. |
| **Cloudinary upload ↔ DB** | `public_id` only; URLs built at read time | Never store the full URL — lets you switch CDNs or re-sign transformations later. |
| **Search ↔ FTS index** | Read from `product_search`, hydrate via `product_translations` | Write path updates both in the same transaction. |

---

## Sources

External sources could not be retrieved for this research pass (Context7/Bash/WebSearch/WebFetch were all blocked). Claims below rest on well-established, long-stable patterns. Before acting on version-sensitive details (especially Next.js 15 caching), confirm against:

- **Next.js App Router — Internationalization:** https://nextjs.org/docs/app/building-your-application/routing/internationalization
- **Next.js — Caching & Revalidation (`revalidateTag`, `unstable_cache`, `"use cache"` in v15):** https://nextjs.org/docs/app/building-your-application/caching
- **Next.js — Server Actions & Mutations:** https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- **Postgres — Full Text Search configurations:** https://www.postgresql.org/docs/current/textsearch-configuration.html
- **Postgres — `tsvector`, `to_tsvector`, `GIN`:** https://www.postgresql.org/docs/current/textsearch-indexes.html
- **Cloudinary — Signed Upload from the Browser:** https://cloudinary.com/documentation/upload_images#signed_upload
- **Drizzle ORM — Neon HTTP driver:** https://orm.drizzle.team/docs/get-started-postgresql#neon
- **Auth.js v5 (NextAuth) — Email magic link:** https://authjs.dev/getting-started/authentication/email
- **Google — hreflang & canonical for multilingual sites:** https://developers.google.com/search/docs/specialty/international/localized-versions

---
*Architecture research for: Manometr (B2B multilingual industrial catalog)*
*Researched: 2026-04-21*
