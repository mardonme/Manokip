// Plan 03-04 Task 4.3 — /[locale]/categories/[...slug] (CAT-02 / CAT-03 /
// CAT-04 / CAT-05 / CAT-08 / SEO-01 / SEO-02).
//
// Composes the full catalog detail surface:
//   - Server-resolves the category by (locale, slug).
//   - Fetches the per-locale filter schema (labels JOINed from
//     spec_field_translations).
//   - Parses searchParams OUTSIDE 'use cache' (Pitfall #2) into the
//     dynamic CategoryFilterValue[] shape.
//   - Fetches paginated products + facet aggregates in parallel.
//   - Renders <FilterSidebar /> + <ActiveFilterPills /> + <ProductCard /> grid
//     in the sketch-002 variant-A layout.
//   - Emits CollectionPage + BreadcrumbList JSON-LD via the helpers from
//     src/lib/jsonld.ts (Wave 2).
//   - generateMetadata returns per-locale canonical + hreflang via
//     buildAlternates (Wave 2 helper) using the slugByLocale map resolved
//     from getCategoryBySlug.
//
// The XSS-hardening replace(/</g, '<') matches the pattern established
// in Wave 2 (T-03-03-02 mitigation).
//
// cacheComponents (Wave 0): the page shell statically prerenders; the
// runtime-data work (searchParams parse + uncached facet/product fetches)
// lives inside <Suspense>-wrapped <CategoryDetailContent /> per
// Phase-3 Wave-0 pattern (Pitfall A6). This keeps `/[locale]/categories/[...slug]`
// reporting Partial Prerender (◐) in the build output instead of failing
// the prerender invariant.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  getCategoryBySlug,
  getCategoryFilterSchema,
  getCategoryProducts,
  type CategoryFilterValue,
  type CategoryFilterSchemaEntry,
} from '@/lib/catalog';
import {
  getEnumFacetCounts,
  getNumericFacetRange,
  getBoolFacetCount,
} from '@/lib/facets';
import { collectionPageJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildAlternates, SITE_HOST, type Locale } from '@/lib/metadata';
import { FilterSidebar, type FacetData } from '@/components/public/filter-sidebar';
import { ActiveFilterPills } from '@/components/public/active-filter-pills';
import { ProductCard } from '@/components/public/product-card';

type SP = Promise<Record<string, string | string[] | undefined>>;

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: SP;
}

function spString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}

function parseDynamicFilters(
  schema: CategoryFilterSchemaEntry[],
  sp: Record<string, string | string[] | undefined>,
): CategoryFilterValue[] {
  const out: CategoryFilterValue[] = [];
  for (const entry of schema) {
    if (entry.filterKind === 'range') {
      const minRaw = spString(sp, `${entry.key}_min`);
      const maxRaw = spString(sp, `${entry.key}_max`);
      const min = minRaw !== undefined ? Number(minRaw) : undefined;
      const max = maxRaw !== undefined ? Number(maxRaw) : undefined;
      const hasMin = typeof min === 'number' && Number.isFinite(min);
      const hasMax = typeof max === 'number' && Number.isFinite(max);
      if (!hasMin && !hasMax) continue;
      out.push({
        kind: 'range',
        key: entry.key,
        ...(hasMin ? { min } : {}),
        ...(hasMax ? { max } : {}),
      });
    } else if (entry.filterKind === 'select') {
      const raw = sp[entry.key];
      let values: string[] = [];
      if (typeof raw === 'string') values = raw.split(',').filter(Boolean);
      else if (Array.isArray(raw)) values = raw.flatMap((v) => v.split(',')).filter(Boolean);
      if (values.length === 0) continue;
      out.push({ kind: 'select', key: entry.key, values });
    } else if (entry.filterKind === 'toggle') {
      const v = spString(sp, entry.key);
      if (v === undefined) continue;
      const bool = v === 'true' ? true : v === 'false' ? false : undefined;
      if (typeof bool !== 'boolean') continue;
      out.push({ kind: 'toggle', key: entry.key, bool });
    }
  }
  return out;
}

async function loadFacetDataForSchema(
  schema: CategoryFilterSchemaEntry[],
  categoryId: string,
): Promise<FacetData> {
  const out: FacetData = {};
  await Promise.all(
    schema.map(async (entry) => {
      if (entry.filterKind === 'range') {
        out[entry.key] = (await getNumericFacetRange(entry.key, categoryId)) ?? undefined;
      } else if (entry.filterKind === 'select') {
        out[entry.key] = await getEnumFacetCounts(entry.key, categoryId);
      } else if (entry.filterKind === 'toggle') {
        out[entry.key] = await getBoolFacetCount(entry.key, categoryId);
      }
    }),
  );
  return out;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const slugStr = slug.join('/');
  const category = await getCategoryBySlug(locale as Locale, slugStr);
  if (!category) return {};
  const name =
    category.nameByLocale[locale as Locale] ??
    category.nameByLocale.uz ??
    slugStr;
  return {
    title: name,
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/categories',
      slugByLocale: category.slugByLocale,
    }),
  };
}

export default function CategoryDetailPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      }
    >
      <CategoryDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CategoryDetailContent({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const slugStr = slug.join('/');

  const category = await getCategoryBySlug(locale as Locale, slugStr);
  if (!category) notFound();

  const filterSchema = await getCategoryFilterSchema(
    category.id,
    locale as Locale,
  );

  // Parse searchParams OUTSIDE any 'use cache' boundary (Pitfall #2).
  const sp = await searchParams;
  const pageRaw = spString(sp, 'page');
  const sizeRaw = spString(sp, 'pageSize');
  const page = Math.max(1, pageRaw ? Number(pageRaw) : 1);
  const pageSize = Math.min(100, Math.max(1, sizeRaw ? Number(sizeRaw) : 24));
  const dynamicFilters = parseDynamicFilters(filterSchema, sp);

  const [{ rows, total }, facetData, t] = await Promise.all([
    getCategoryProducts(
      category.id,
      locale as Locale,
      dynamicFilters,
      page,
      pageSize,
    ),
    loadFacetDataForSchema(filterSchema, category.id),
    getTranslations({ locale, namespace: 'public.catalog' }),
  ]);

  const localeName =
    category.nameByLocale[locale as Locale] ??
    category.nameByLocale.uz ??
    slugStr;

  const breadcrumbs = [
    { name: 'Manometr', url: `${SITE_HOST}/${locale}` },
    { name: t('categories'), url: `${SITE_HOST}/${locale}/categories` },
    {
      name: localeName,
      url: `${SITE_HOST}/${locale}/categories/${slugStr}`,
    },
  ];

  const collectionLd = collectionPageJsonLd(
    localeName,
    rows.map((r) => `${SITE_HOST}/${locale}/products/${r.slug}`),
  );
  const breadcrumbLd = breadcrumbJsonLd(breadcrumbs);

  // T-03-03-02 XSS hardening — close the </script> termination vector.
  const collectionHtml = JSON.stringify(collectionLd).replace(/</g, '\\u003c');
  const breadcrumbHtml = JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: collectionHtml }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: breadcrumbHtml }}
      />
      <div className="max-w-screen-2xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <FilterSidebar filterSchema={filterSchema} facetData={facetData} />
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">
            {localeName}
          </h1>
          <ActiveFilterPills filterSchema={filterSchema} />
          <div
            className="text-sm text-slate-500 mb-3"
            data-testid="results-count"
          >
            {t('resultsCount', { count: total })}
          </div>
          {rows.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {t('noResults')}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {rows.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  locale={locale as Locale}
                />
              ))}
            </div>
          )}
          {totalPages > 1 ? (
            <nav
              className="mt-8 flex items-center justify-center gap-3 text-sm"
              data-testid="pagination"
            >
              <span className="text-slate-500 tabular-nums">
                {page} / {totalPages}
              </span>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
