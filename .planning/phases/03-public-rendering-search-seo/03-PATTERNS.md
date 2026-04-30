# Phase 3: Public Rendering, Search, SEO — Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 27 new/modified files
**Analogs found:** 18 / 27 (9 net-new, no close codebase analog)

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/[locale]/layout.tsx` | RSC layout (MODIFY) | read-only + cache | `src/app/[locale]/admin/layout.tsx` | role-match |
| `src/app/[locale]/page.tsx` | RSC page (MODIFY) | read-only | existing `page.tsx` | exact |
| `src/app/[locale]/categories/[...slug]/page.tsx` | RSC page | read-only + nuqs filter | `src/app/[locale]/admin/categories/page.tsx` | role-match |
| `src/app/[locale]/products/[slug]/page.tsx` | RSC page | read-only + 'use cache' | `src/app/[locale]/admin/products/[id]/edit/page.tsx` | role-match |
| `src/app/[locale]/manufacturers/page.tsx` | RSC page | read-only + 'use cache' | `src/app/[locale]/admin/manufacturers/page.tsx` | exact |
| `src/app/[locale]/manufacturers/[slug]/page.tsx` | RSC page | read-only + 'use cache' | `src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx` | role-match |
| `src/app/[locale]/search/page.tsx` | RSC page | force-dynamic FTS | `src/app/[locale]/admin/products/page.tsx` | partial |
| `src/app/api/search/autocomplete/route.ts` | API route handler | request-response | `src/app/api/cloudinary/sign/route.ts` | role-match |
| `src/app/sitemap-uz.xml/route.ts` | route handler | ISR read | NET NEW | none |
| `src/app/sitemap-ru.xml/route.ts` | route handler | ISR read | NET NEW | none |
| `src/app/sitemap-en.xml/route.ts` | route handler | ISR read | NET NEW | none |
| `src/app/sitemap-index.xml/route.ts` | route handler | ISR read | NET NEW | none |
| `src/app/robots.txt/route.ts` | route handler | static read | NET NEW | none |
| `src/components/public/category-nav.tsx` | client island | event-driven expand/collapse | `src/components/admin/sidebar.tsx` | partial |
| `src/components/public/filter-sidebar.tsx` | client island | nuqs URL state | NET NEW | none |
| `src/components/public/product-card.tsx` | RSC component | read-only | `src/components/admin/data-table.tsx` (card shape) | partial |
| `src/components/public/product-gallery.tsx` | client island | event-driven | `src/components/admin/media-uploader.tsx` (`CldImage` usage) | partial |
| `src/components/public/spec-table.tsx` | RSC component | read-only | NET NEW | none |
| `src/components/public/locale-switcher.tsx` | client island | request-response | `src/components/admin/locale-tabs.tsx` | role-match |
| `src/components/public/search-box.tsx` | client island | event-driven + debounce | NET NEW | none |
| `src/components/public/translation-dots-public.tsx` | RSC/client component | read-only | `src/components/admin/translation-completeness.tsx` | exact |
| `src/lib/jsonld.ts` | library helper | transform | NET NEW | none |
| `src/lib/search.ts` | library helper | CRUD read (FTS) | `src/lib/translation-completeness.ts` | partial |
| `src/lib/facets.ts` | library helper | CRUD read (aggregate) | `src/lib/translation-completeness.ts` | partial |
| `src/db/schema/manufacturers.ts` | Drizzle schema (MODIFY) | write-on-migration | `src/db/schema/manufacturers.ts` | exact |
| `src/db/schema/products.ts` | Drizzle schema (MODIFY) | write-on-migration | `src/db/schema/products.ts` | exact |
| `drizzle/0002_phase3_media_search_manufacturer.sql` | SQL migration | write-on-migration | `drizzle/0001_overrated_shiva.sql` | exact |

---

## Pattern Assignments

---

### `src/app/[locale]/layout.tsx` — MODIFY (RSC layout, read-only)

**Analog:** `src/app/[locale]/layout.tsx` (existing) + `src/app/[locale]/admin/layout.tsx`

**What to add:** Organization JSON-LD `<script>` tag + `generateMetadata` with root-level hreflang + canonical. The existing layout already wires `setRequestLocale`, `NextIntlClientProvider`, `NuqsAdapter` must be added for public filter pages, and `inter.variable` is already set.

**Existing layout pattern** (`src/app/[locale]/layout.tsx` lines 1–41):
```typescript
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**getTranslations pattern from admin layout** (`src/app/[locale]/admin/layout.tsx` lines 17–33):
```typescript
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });
  return (
    <NuqsAdapter>
      <div className="flex min-h-screen">
        {children}
      </div>
    </NuqsAdapter>
  );
}
```

**What Phase 3 adds to the root layout:**
- Wrap body in `<NuqsAdapter>` (required by filter pages that use `useQueryStates`).
- Add `generateMetadata` returning `alternates.canonical` + `alternates.languages` at the locale root level.
- Inject `organizationJsonLd()` as `<script type="application/ld+json">` in `<head>` (see `src/lib/jsonld.ts` pattern below).

---

### `src/app/[locale]/page.tsx` — MODIFY (RSC page)

**Analog:** existing `src/app/[locale]/page.tsx`

**Existing pattern** (lines 1–14):
```typescript
import { setRequestLocale, getTranslations } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('common');
  return (
    <main style={{ ... }}>
      <h1>{t('siteTitle')}</h1>
    </main>
  );
}
```

**What Phase 3 adds:** `generateMetadata` with `alternates.canonical` + `alternates.languages` hreflang map using `src/i18n/navigation.ts`'s `getPathname`. No data fetching needed on the homepage itself.

---

### `src/app/[locale]/categories/[...slug]/page.tsx` (RSC page, read-only + nuqs)

**Analog:** `src/app/[locale]/admin/categories/page.tsx` + `src/app/[locale]/admin/products/page.tsx`

**RSC page shape with searchParams** (`src/app/[locale]/admin/products/page.tsx` lines 32–52):
```typescript
export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // NOTE: public page drops requireAdmin() — no auth check

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 20)));
  ...
}
```

**Multi-table Drizzle join with alias** (`src/app/[locale]/admin/categories/page.tsx` lines 40–78):
```typescript
const tCurrent = alias(categoryTranslations, 'tCurrent');
const tUz = alias(categoryTranslations, 'tUz');
const tParent = alias(categoryTranslations, 'tParent');

const [rows, [countRow]] = await Promise.all([
  db
    .select({ id: categories.id, name: tCurrent.name, slugUz: tUz.slug })
    .from(categories)
    .leftJoin(tCurrent, and(eq(tCurrent.categoryId, categories.id), eq(tCurrent.locale, locale)))
    .leftJoin(tUz, and(eq(tUz.categoryId, categories.id), eq(tUz.locale, 'uz')))
    .orderBy(asc(categories.sortOrder), asc(tCurrent.name))
    .limit(size)
    .offset((page - 1) * size),
  db.select({ count: sql<number>`count(*)` }).from(categories),
]);
```

**nuqs server-side parse pattern (RESEARCH.md Pattern 2):**
```typescript
// Parse OUTSIDE any 'use cache' boundary — searchParams cannot cross the cache boundary
import { createSearchParamsCache, parseAsInteger, parseAsString, parseAsFloat } from 'nuqs/server';

export const filterCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(''),
  // per-spec-field dynamic keys added at runtime
});

// In page component:
const filters = await filterCache.parse(searchParams);
// Pass resolved primitives into cached data-fetch functions
const products = await getFilteredProducts(categoryId, filters, locale);
```

**'use cache' + cacheTag pattern (RESEARCH.md Pattern 1):**
```typescript
import { cacheTag } from 'next/cache';

async function getCategoryProducts(categoryId: string, locale: string, filters: FilterState) {
  'use cache';
  cacheTag(`category:${categoryId}`);
  cacheTag('products-list');
  // Drizzle query with EAV EXISTS subqueries (RESEARCH.md Pattern 5)
  ...
}
```

**generateMetadata with alternates** (RESEARCH.md Pattern 3):
```typescript
import { getPathname } from '@/i18n/navigation';
const host = 'https://manometr.uz';

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(locale, slug);
  return {
    title: category.name,
    alternates: {
      canonical: `${host}/${locale}/categories/${slug}`,
      languages: {
        uz: `${host}/uz/categories/${category.slugUz}`,
        ru: `${host}/ru/categories/${category.slugRu}`,
        en: `${host}/en/categories/${category.slugEn}`,
        'x-default': `${host}/uz/categories/${category.slugUz}`,
      },
    },
  };
}
```

---

### `src/app/[locale]/products/[slug]/page.tsx` (RSC page, ISR, read-only)

**Analog:** `src/app/[locale]/admin/products/[id]/edit/page.tsx`

**Deep multi-table fetch with Promise.all** (`src/app/[locale]/admin/products/[id]/edit/page.tsx` lines 38–96):
```typescript
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  // Public page: no requireAdmin()

  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) notFound();

  const [translationRows, specValueRows, catalog, categoryRows, manufacturerRows] =
    await Promise.all([
      db.select().from(productTranslations).where(eq(productTranslations.productId, id)),
      db.select().from(productSpecValues)
        .where(eq(productSpecValues.productId, id))
        .orderBy(asc(productSpecValues.sortOrder)),
      ...
    ]);
  ...
}
```

**notFound() pattern** (`src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx` lines 26–33):
```typescript
const [row] = await db
  .select()
  .from(manufacturers)
  .where(eq(manufacturers.id, id))
  .limit(1);

if (!row) notFound();
```

**Key differences vs admin analog:**
- No `requireAdmin()`.
- Slug-based lookup instead of id-based: join `productTranslations` on `(locale, slug)` to resolve the `productId`, then fetch all 3 locale rows for hreflang (Pitfall #6 — must SELECT all locales, not just current).
- Add `'use cache'` + multiple `cacheTag(...)` calls: `product:<id>`, `category:<categoryId>`, `manufacturer:<manufacturerId>`.
- Add `generateMetadata` returning `alternates.canonical` + `alternates.languages`.
- Add `<script type="application/ld+json">` with `productJsonLd()` + `breadcrumbJsonLd()`.

---

### `src/app/[locale]/manufacturers/page.tsx` (RSC page, ISR, read-only)

**Analog:** `src/app/[locale]/admin/manufacturers/page.tsx` — near-exact structural match.

**Core pattern** (`src/app/[locale]/admin/manufacturers/page.tsx` lines 23–101):
```typescript
export default async function ManufacturersPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Public page: no requireAdmin()

  const tCurrent = alias(manufacturerTranslations, 'tCurrent');
  const tUz = alias(manufacturerTranslations, 'tUz');

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: manufacturers.id,
        logoPublicId: manufacturers.logoPublicId,
        name: tCurrent.name,
        slugUz: tUz.slug,
        updatedAt: manufacturers.updatedAt,
      })
      .from(manufacturers)
      .leftJoin(tCurrent, and(eq(tCurrent.manufacturerId, manufacturers.id), eq(tCurrent.locale, locale)))
      .leftJoin(tUz, and(eq(tUz.manufacturerId, manufacturers.id), eq(tUz.locale, 'uz')))
      .orderBy(asc(tCurrent.name))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(manufacturers),
  ]);
  ...
}
```

**What Phase 3 adds:**
- `'use cache'` + `cacheTag('manufacturers-list')` on the data-fetch function.
- `generateMetadata` with `alternates`.
- Organization JSON-LD already in root layout — no per-page JSON-LD needed here.
- Render cards with `<CldImage>` for logo + `is_official_rep` badge (D-11).

---

### `src/app/[locale]/manufacturers/[slug]/page.tsx` (RSC page, ISR, read-only)

**Analog:** `src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx`

**Fetch + notFound pattern** (`src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx` lines 18–63):
```typescript
export default async function EditManufacturerPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [row] = await db.select().from(manufacturers).where(eq(manufacturers.id, id)).limit(1);
  if (!row) notFound();

  const translationRows = await db
    .select()
    .from(manufacturerTranslations)
    .where(eq(manufacturerTranslations.manufacturerId, id));

  // Reshape 3 sibling rows into per-locale map
  const translations = LOCALES.reduce((acc, l) => {
    const t = translationRows.find((r) => r.locale === l);
    acc[l] = t ? { name: t.name, slug: t.slug, description: t.description ?? '' } : emptyLocale;
    return acc;
  }, {} as ManufacturerInput['translations']);
  ...
}
```

**What Phase 3 changes:**
- Slug-based lookup (join `manufacturer_translations` on `(locale, slug)`).
- `'use cache'` + `cacheTag('manufacturer:<id>')`.
- `generateMetadata` with hreflang.
- Render paginated product grid scoped to `manufacturer_id` (reuse category listing product query shape).

---

### `src/app/[locale]/search/page.tsx` (RSC page, force-dynamic, FTS)

**Analog:** `src/app/[locale]/admin/products/page.tsx` (same searchParams + pagination shape, different query)

**searchParams + pagination shape** (`src/app/[locale]/admin/products/page.tsx` lines 32–48):
```typescript
export default async function ProductsPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 20)));
  ...
}
```

**What Phase 3 adds (no direct analog):**
```typescript
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic'; // search results are never ISR

export default async function SearchPage({ params, searchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  // D-07: SKU exact match → 302 redirect
  if (q) {
    const skuMatch = await db.select({ id: products.id })
      .from(products)
      .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
      .where(sql`LOWER(${products.sku}) = LOWER(${q})`)
      .limit(1);
    if (skuMatch[0]) {
      redirect(`/${locale}/products/${skuMatch[0].slug}`);
    }
  }
  // FTS query via src/lib/search.ts helpers (see below)
  ...
}
```

---

### `src/app/api/search/autocomplete/route.ts` (API route handler, request-response)

**Analog:** `src/app/api/cloudinary/sign/route.ts`

**Route handler shape** (`src/app/api/cloudinary/sign/route.ts` lines 38–80):
```typescript
import { z } from 'zod';
export const runtime = 'nodejs';

const bodySchema = z.object({ q: z.string() });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  // No auth gate — public autocomplete endpoint
  // Validate + sanitize q before passing to to_tsquery
  if (!q || q.length < 2) return Response.json({ suggestions: [] });
  ...
  return Response.json({ suggestions });
}
```

**Key differences:** GET not POST; no auth gate; uses `sql\`\`` Drizzle escape for `to_tsquery(config, term || ':*')` prefix query (RESEARCH.md Pattern 4 autocomplete SQL).

---

### `src/db/schema/manufacturers.ts` — MODIFY

**Analog:** existing `src/db/schema/manufacturers.ts`

**Current schema** (`src/db/schema/manufacturers.ts` lines 16–47):
```typescript
export const manufacturers = pgTable('manufacturer', {
  id: uuid().primaryKey().defaultRandom(),
  logoPublicId: text('logo_public_id'),
  websiteUrl: text('website_url'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const manufacturerTranslations = pgTable('manufacturer_translations', {
  manufacturerId: uuid('manufacturer_id').notNull().references(() => manufacturers.id, { onDelete: 'cascade' }),
  locale: text().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  description: text(),
}, ...);
```

**D-11 additions (additive only):**
```typescript
export const manufacturers = pgTable('manufacturer', {
  // ... existing columns unchanged ...
  isOfficialRep: boolean('is_official_rep').notNull().default(false), // D-11 NEW
});

export const manufacturerTranslations = pgTable('manufacturer_translations', {
  // ... existing columns unchanged ...
  relationshipNote: text('relationship_note'), // D-11 NEW — nullable per-locale text
}, ...);
```

---

### `src/db/schema/products.ts` — MODIFY

**Analog:** existing `src/db/schema/products.ts`

**Current schema** (`src/db/schema/products.ts` lines 19–43 — `products` table only):
```typescript
export const products = pgTable('product', {
  id: uuid().primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  manufacturerId: uuid('manufacturer_id').references(() => manufacturers.id),
  sku: text().unique(),
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, ...);
```

**Gap 1 additions (media storage — blocks CAT-06):**
```typescript
export const products = pgTable('product', {
  // ... existing columns unchanged ...
  imagePublicIds: text('image_public_ids').array().notNull().default(sql`'{}'::text[]`), // NEW
  datasheetPublicIds: text('datasheet_public_ids').array().notNull().default(sql`'{}'::text[]`), // NEW
}, ...);
```

---

### `drizzle/0002_phase3_media_search_manufacturer.sql` (SQL migration)

**Analog:** `drizzle/0001_overrated_shiva.sql`

**Migration shape** (`drizzle/0001_overrated_shiva.sql` lines 1–48 — additive ALTER TABLE + CREATE VIEW):
```sql
-- Statement-breakpoint style: each statement separated by --> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "spec_field" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
```

**Phase 3 migration shape:**
```sql
-- 1. pg extensions (idempotent, must be FIRST — Pitfall #4)
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
-- 2. Product media columns (Gap 1 — blocks CAT-06)
ALTER TABLE "product"
  ADD COLUMN "image_public_ids" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN "datasheet_public_ids" text[] NOT NULL DEFAULT '{}';--> statement-breakpoint
-- 3. Manufacturer D-11 fields (Gap 3 — blocks MFG-01/02)
ALTER TABLE "manufacturer"
  ADD COLUMN "is_official_rep" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "manufacturer_translations"
  ADD COLUMN "relationship_note" text;--> statement-breakpoint
-- 4. product_search is already declared in Phase-1 migration — no schema change needed.
--    Gap 2 (tsvector population) is a write-path change in saveProduct, not a migration.
```

---

### `src/actions/products.ts` — MODIFY (add Step 6: tsvector rebuild)

**Analog:** existing `src/actions/products.ts`

**Transaction step pattern** (`src/actions/products.ts` lines 101–243 — the 5-step block):
```typescript
const result = await dbTx.transaction(async (tx) => {
  // Step 1: base product row upsert
  const [row] = input.id
    ? await tx.update(products).set({ ... }).where(eq(products.id, input.id)).returning()
    : await tx.insert(products).values({ ... }).returning();
  if (!row) throw new Error('product row not found after upsert');

  // Step 2: translation rows (upsert per locale)
  for (const locale of LOCALES) {
    await tx.insert(productTranslations).values({ ... })
      .onConflictDoUpdate({ target: [...], set: { ... } });
  }

  // Steps 3–5: spec values replace, MT flags replace, audit log
  ...

  // Step 6 (Phase 3 addition): rebuild tsvector for all 3 locales
  for (const locale of LOCALES) {
    const pgConfig = locale === 'ru' ? 'russian' : locale === 'en' ? 'english' : 'simple';
    await tx.execute(sql`
      INSERT INTO product_search (product_id, locale, search_tsv)
      SELECT ${row.id}, ${locale},
        setweight(to_tsvector(${pgConfig}, coalesce(t.name,'')), 'A') ||
        setweight(to_tsvector(${pgConfig}, coalesce(t.short_desc,'')), 'B') ||
        setweight(to_tsvector(${pgConfig}, coalesce(t.long_desc,'')), 'C')
      FROM product_translations t
      WHERE t.product_id = ${row.id} AND t.locale = ${locale}
      ON CONFLICT (product_id, locale) DO UPDATE SET search_tsv = EXCLUDED.search_tsv
    `);
  }

  return row;
});
// AFTER tx.commit — pattern unchanged:
await revalidateProduct(result.id);
```

**Also add `imagePublicIds` + `datasheetPublicIds` writes in Step 1:**
```typescript
// Step 1 set clause additions:
.set({
  ...existingFields,
  imagePublicIds: input.imagePublicIds,       // NEW — Gap 1
  datasheetPublicIds: input.datasheetPublicIds, // NEW — Gap 1
})
```

---

### `src/lib/search.ts` (library helper, FTS query)

**Analog:** `src/lib/translation-completeness.ts` — same typed-helper pattern (module-level typed functions, Drizzle db import, no class)

**Pattern to copy** (`src/lib/translation-completeness.ts` lines 1–84):
```typescript
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { productTranslationCompleteness } from '@/db/schema';

export type LocaleKey = 'uz' | 'ru' | 'en';

export async function findProductCompleteness(productId: string): Promise<CompletenessByLocale> {
  const rows = await db.select().from(productTranslationCompleteness)
    .where(eq(productTranslationCompleteness.productId, productId));
  const out = emptyCompleteness();
  for (const r of rows) {
    if (isLocaleKey(r.locale)) out[r.locale] = r.percent;
  }
  return out;
}
```

**What `src/lib/search.ts` exports instead:**
```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { productSearch, products, productTranslations } from '@/db/schema';

export type LocaleKey = 'uz' | 'ru' | 'en';
const PG_CONFIG: Record<LocaleKey, string> = { uz: 'simple', ru: 'russian', en: 'english' };

export async function searchProducts(query: string, locale: LocaleKey, page = 1, pageSize = 20) {
  const cfg = PG_CONFIG[locale];
  const rows = await db.execute(sql`
    SELECT p.id, ts_rank_cd(s.search_tsv, q.tsq) AS rank, pt.name, pt.slug, pt.short_desc
    FROM product_search s
    JOIN product p ON p.id = s.product_id
    JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ${locale}
    CROSS JOIN (SELECT plainto_tsquery(${cfg}, ${query}) AS tsq) q
    WHERE s.locale = ${locale}
      AND p.status = 'published'
      AND s.search_tsv @@ q.tsq
    ORDER BY rank DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `);
  return rows;
}
```

---

### `src/lib/facets.ts` (library helper, aggregate counts)

**Analog:** `src/lib/translation-completeness.ts` — same typed-helper module pattern.

**Module structure to copy** (`src/lib/translation-completeness.ts` lines 16–84 — module-level exported functions, typed return):
```typescript
import { db } from '@/db/client';
// ...
export async function findCompletenessForProducts(productIds: string[]): Promise<Record<string, CompletenessByLocale>> {
  if (productIds.length === 0) return {};
  const rows = await db.select()...
  const out: Record<string, CompletenessByLocale> = {};
  for (const id of productIds) { out[id] = emptyCompleteness(); }
  ...
  return out;
}
```

**What `src/lib/facets.ts` exports instead:**
```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

export interface FacetCount { value: string; count: number; }

export async function getEnumFacetCounts(
  specFieldKey: string,
  categoryId: string,
): Promise<FacetCount[]> {
  // SQL per RESEARCH.md Pattern 5 aggregate
}

export async function getNumericFacetRange(
  specFieldKey: string,
  categoryId: string,
): Promise<{ min: number; max: number }> { ... }
```

---

### `src/lib/jsonld.ts` (library helper, transform — NET NEW with research reference)

No codebase analog. Relies on RESEARCH.md Pattern 7 and `schema-dts` package.

**Reference pattern from RESEARCH.md Pattern 7:**
```typescript
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
    brand: { '@type': 'Organization', name: p.manufacturerName },
  };
}

export function organizationJsonLd(): WithContext<Organization> {
  return { '@context': 'https://schema.org', '@type': 'Organization', name: 'Manometr', url: 'https://manometr.uz' };
}
```

**RSC emission pattern (inline in page.tsx — copy this exactly):**
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
/>
```

---

### `src/components/public/locale-switcher.tsx` (client island)

**Analog:** `src/components/admin/locale-tabs.tsx` — same 3-locale concept but rendered as a button group, not tab strip.

**LOCALES constant and locale type** (`src/components/admin/locale-tabs.tsx` lines 29–31):
```typescript
export type Locale = 'uz' | 'ru' | 'en';
export const LOCALES: Locale[] = ['uz', 'ru', 'en'];
```

**Tabs pattern to adapt** (`src/components/admin/locale-tabs.tsx` lines 49–81):
```typescript
'use client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function LocaleTabs({ defaultValue = 'uz', children }: LocaleTabsProps) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        {LOCALES.map((l) => (
          <TabsTrigger key={l} value={l}>{l.toUpperCase()}</TabsTrigger>
        ))}
      </TabsList>
      {LOCALES.map((l) => (
        <TabsContent key={l} value={l}>{children(l)}</TabsContent>
      ))}
    </Tabs>
  );
}
```

**What `LocaleSwitcher` does differently:** uses `useRouter` + `usePathname` from `@/i18n/navigation` (already exported in `src/i18n/navigation.ts`) to push a locale-switched URL on click. Not a tab strip — three `<Button>` components highlighting the current locale.

```typescript
'use client';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
const LOCALES = ['uz', 'ru', 'en'] as const;

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex gap-1">
      {LOCALES.map((l) => (
        <Button
          key={l}
          variant={l === currentLocale ? 'default' : 'outline'}
          size="sm"
          onClick={() => router.replace(pathname, { locale: l })}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
```

---

### `src/components/public/translation-dots-public.tsx` (component)

**Analog:** `src/components/admin/translation-completeness.tsx` — exact reuse. Phase 3 can re-export `TranslationDots` directly without a new file; the public wrapper merely re-imports it under a public-namespace path.

**Import pattern to copy** (`src/components/admin/translation-completeness.tsx` lines 21–33):
```typescript
'use client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LOCALES, type CompletenessByLocale } from '@/lib/translation-completeness';
```

**Component export to re-use** (`src/components/admin/translation-completeness.tsx` lines 116–146):
```typescript
export function TranslationDots({ completeness, className }: TranslationDotsProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {LOCALES.map((locale) => {
          const pct = clampPercent(completeness[locale]);
          const t = tone(pct);
          const labelText = `${locale.toUpperCase()}: ${pct}%`;
          return (
            <Tooltip key={locale}>
              <TooltipTrigger aria-label={labelText} className={cn('inline-block h-2 w-2 rounded-full', TONE_BG[t])} />
              <TooltipContent>{labelText}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
```

---

### `src/components/public/product-gallery.tsx` (client island, CldImage)

**Analog:** `src/components/admin/media-uploader.tsx` — CldImage usage pattern.

**CldImage usage** (`src/components/admin/media-uploader.tsx` lines 100–116):
```typescript
import { CldImage } from 'next-cloudinary';

function SortableTile({ publicId }: SortableTileProps) {
  return (
    <div className="relative h-24 w-24 overflow-hidden rounded border">
      <CldImage src={publicId} width="96" height="96" alt="" />
    </div>
  );
}
```

**Hero image CWV pattern (RESEARCH.md Pattern 6 — no codebase analog):**
```tsx
<CldImage
  src={product.imagePublicIds[0]}
  alt={product.name}
  width={960}
  height={720}
  priority                             // fetchpriority="high" + loading="eager"
  sizes="(max-width: 1100px) 100vw, calc(100vw - 420px)"
/>
// Gallery thumbs — all non-hero:
<CldImage src={publicId} width={120} height={90} alt="" loading="lazy" />
```

---

### `src/components/public/category-nav.tsx` (client island)

**Analog:** `src/components/admin/sidebar.tsx` — nav link list pattern. Closest available pattern; sidebar does not have tree expand/collapse but has the same `'use client'` + list-of-links shape.

**Client component nav pattern** (`src/components/admin/sidebar.tsx` — read separately; key shape):
```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminSidebar({ labels }: { labels: AdminNavLabels }) {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r bg-background">
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('px-3 py-2 rounded text-sm', pathname === item.href && 'bg-accent')}
          >
            {labels[item.key]}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

**What category-nav adds:** tree expand/collapse with `useState`, recursive rendering for child categories, `usePathname` to highlight active category.

---

## Shared Patterns

### RSC page entry shape (all public pages)

**Source:** `src/app/[locale]/admin/manufacturers/page.tsx` lines 23–33 and `src/app/[locale]/admin/products/[id]/edit/page.tsx` lines 38–43

**Apply to:** Every new public page file.
```typescript
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

export default async function PublicPage({
  params,
}: {
  params: Promise<{ locale: string; slug?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);   // REQUIRED — next-intl RSC contract
  // No requireAdmin() on public pages
  ...
}
```

### `generateStaticParams` for locale segments

**Source:** `src/app/[locale]/layout.tsx` lines 21–23

**Apply to:** Every new public page with dynamic segments (`[slug]`, `[...slug]`).
```typescript
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
// For product/category/manufacturer pages, also fetch and return all slugs
// per locale at build time (generateStaticParams + 'use cache' = ISR pre-population).
```

### getTranslations for public namespaces

**Source:** `src/app/[locale]/page.tsx` lines 1–8 + `src/app/[locale]/admin/layout.tsx` lines 17–33

**Apply to:** All public pages that need i18n copy (search, filters, labels).
```typescript
import { getTranslations } from 'next-intl/server';

const t = await getTranslations({ locale, namespace: 'public' });
// Messages in messages/{uz,ru,en}.json under "public.*" keys
```

### `'use cache'` + cacheTag ISR data-fetch pattern

**Source:** RESEARCH.md Pattern 1 (no codebase analog yet — first usage in Phase 3)

**Apply to:** product detail, category listing, manufacturer pages (NOT search page).
```typescript
import { cacheTag } from 'next/cache';

async function getProductDetail(locale: string, slug: string) {
  'use cache';                          // MUST be first statement in function body
  // ...Drizzle query...
  if (product) {
    cacheTag(`product:${product.id}`);
    cacheTag(`category:${product.categoryId}`);
    cacheTag(`manufacturer:${product.manufacturerId}`);
  }
  return product;
}
// NOTE: searchParams CANNOT be passed into a 'use cache' function (Pitfall #2).
// Parse outside, pass primitives in.
```

**Also required in next.config.ts before any 'use cache' usage:**
```typescript
const nextConfig: NextConfig = {
  cacheComponents: true,   // enables 'use cache' + PPR
  turbopack: { root: path.resolve(__dirname) },  // EXISTING — keep
  ...
};
```

### Translation row reshape (per-locale sibling rows → per-locale map)

**Source:** `src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx` lines 43–56

**Apply to:** Any public page that needs all 3 locale slugs for hreflang (product detail, category, manufacturer detail).
```typescript
const emptyLocale = { name: '', slug: '', description: '' };
const translations = LOCALES.reduce((acc, l) => {
  const t = translationRows.find((r) => r.locale === l);
  acc[l] = t
    ? { name: t.name, slug: t.slug, description: t.description ?? '' }
    : { ...emptyLocale };
  return acc;
}, {} as Record<Locale, typeof emptyLocale>);
// Use translations.uz.slug, translations.ru.slug, translations.en.slug for hreflang
```

### Drizzle `sql\`\`` for raw SQL (FTS queries + array ops)

**Source:** `drizzle/0001_overrated_shiva.sql` (SQL shape) + `src/db/schema/search.ts` (tsvector customType)

**Apply to:** `src/lib/search.ts`, `src/lib/facets.ts`, tsvector rebuild in `saveProduct`.
```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

// Execute raw SQL through Drizzle (preserves connection pool + type safety where possible)
const rows = await db.execute(sql`
  SELECT p.id, ts_rank_cd(s.search_tsv, q.tsq) AS rank
  FROM product_search s
  JOIN product p ON p.id = s.product_id
  CROSS JOIN (SELECT plainto_tsquery(${pgConfig}, ${query}) AS tsq) q
  WHERE s.locale = ${locale} AND s.search_tsv @@ q.tsq
  ORDER BY rank DESC LIMIT 20
`);
```

### `notFound()` on missing slug/id

**Source:** `src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx` lines 26–33

**Apply to:** All public detail pages (`/products/[slug]`, `/manufacturers/[slug]`, `/categories/[...slug]`).
```typescript
import { notFound } from 'next/navigation';
const [row] = await db.select().from(...).where(...).limit(1);
if (!row) notFound();
```

### Serialize Dates for RSC→client boundary

**Source:** `src/app/[locale]/admin/manufacturers/page.tsx` lines 71–79

**Apply to:** Any RSC that passes data to client islands (product-card, filter-sidebar, etc.).
```typescript
// RSC serializes Date → ISO string before passing to client island
updatedAt: r.updatedAt.toISOString(),
// Client island re-parses:
const date = new Date(props.updatedAt);
```

### vitest unit test shape

**Source:** `tests/lib/revalidation.test.ts` lines 1–50 + `tests/actions/manufacturers.test.ts` lines 27–60

**Apply to:** `tests/lib/search.test.ts`, `tests/lib/jsonld.test.ts`, `tests/lib/facets.test.ts`.
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(async () => ({ user: { email: 'test@manometr.uz' } })),
}));

describe('search helpers (live Neon)', () => {
  it('returns products matching query', async () => { ... });
});
```

### Playwright e2e test shape

**Source:** `tests/e2e/admin-edit-revalidates.spec.ts` lines 1–60

**Apply to:** Phase 3 public-page e2e specs (CWV LCP, hreflang, JSON-LD validation).
```typescript
import { test, expect } from '@playwright/test';
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test('product detail page renders JSON-LD', async ({ page }) => {
  await page.goto(`${baseURL}/uz/products/test-product-slug`);
  const ldJson = await page.locator('script[type="application/ld+json"]').first().textContent();
  const schema = JSON.parse(ldJson!);
  expect(schema['@type']).toBe('Product');
});
```

---

## NET NEW — No Codebase Analog

These files have no close existing analog. The planner must rely on RESEARCH.md patterns and external references.

| File | Role | Data Flow | Reference |
|---|---|---|---|
| `src/app/sitemap-uz.xml/route.ts` | route handler | ISR read | RESEARCH.md Pattern 3 "Sitemap with alternates" + Next.js App Router `sitemap.ts` convention + Pitfall #8 (`id` is `Promise<string>` in Next 16) |
| `src/app/sitemap-ru.xml/route.ts` | route handler | ISR read | same |
| `src/app/sitemap-en.xml/route.ts` | route handler | ISR read | same |
| `src/app/sitemap-index.xml/route.ts` | route handler | static | RESEARCH.md §"Claude's Discretion" — `sitemap-index.xml` references the 3 per-locale sitemaps |
| `src/app/robots.txt/route.ts` | route handler | static | Next.js `MetadataRoute.Robots` type; references sitemap-index.xml |
| `src/components/public/filter-sidebar.tsx` | client island | nuqs `useQueryStates` | RESEARCH.md Pattern 2 "nuqs Server + Client Split"; `@radix-ui/react-slider` for range slider |
| `src/components/public/spec-table.tsx` | RSC component | read-only | CONTEXT.md D-01 spec-table styling contract from `sketch-003`; no RSC table component exists in admin (admin uses TanStack Table client component); fiztech.ru density reference |
| `src/components/public/search-box.tsx` | client island | debounced fetch | RESEARCH.md SRCH-03 + autocomplete SQL; no analogous debounced-input component in codebase |
| `src/lib/jsonld.ts` | library helper | transform | RESEARCH.md Pattern 7; `schema-dts` npm package |

---

## Metadata

**Analog search scope:** `src/app/[locale]/admin/**`, `src/components/admin/**`, `src/components/ui/**`, `src/lib/**`, `src/actions/**`, `src/db/schema/**`, `drizzle/*.sql`, `proxy.ts`, `tests/**`, `next.config.ts`, `src/i18n/**`
**Files scanned:** 36 source files read directly
**Pattern extraction date:** 2026-04-30
