// Plan 03-06 Task 6.3 — Search results page (SRCH-01 + SRCH-02 + SRCH-04 page-layer).
//
// Effectively force-dynamic: search results are unique per (locale, q, page)
// — caching would either explode the cache key space or return wrong results
// to the next user. Per RESEARCH.md Open Q 3, the right call for v1 is
// fully dynamic + a 30s s-maxage on the autocomplete API to absorb the
// dropdown's hot path; the results page itself re-runs on every request.
//
// Phase 3 Plan 01 / Pitfall A6: under `cacheComponents: true` the
// `export const dynamic = 'force-dynamic'` route segment config is
// incompatible (Next 16 throws at build). The migration path is to move
// the searchParams-reading + DB-fetching block into a child server
// component wrapped in <Suspense>. The page shell then statically
// prerenders, while the dynamic-data branch streams in on every request —
// equivalent runtime behavior to force-dynamic, satisfying cacheComponents.
//
// SRCH-04 / D-07 short-circuit: when `q` exactly matches a published
// product's `sku` (case-insensitive, trimmed), 302-redirect to that
// product's detail page in the current locale. The redirect target is the
// DB-resolved slug — never echoed from user input — so an attacker can't
// craft a SKU-shaped query that redirects elsewhere (T-V7-01 mitigation).
//
// SRCH-02 / D-05 cascade: searchProducts returns fallbackLocale=non-null
// when the current-locale tsvector returned 0 hits and a fallback locale
// (uz → ru → en) had matches. The amber SearchFallbackBanner explains the
// fallback in the user's current locale.
//
// D-06 compliance: every ProductCard receives heroPublicId +
// manufacturerName + categoryName from the SearchResultRow shape — NO
// hardcoded nulls at this call site. The chip data flows from the search
// lib's manufacturer_translations + category_translations + image_public_ids[1]
// JOINs (see src/lib/search.ts runFtsQuery).
//
// generateMetadata: search results are intentionally noindex (robots:
// index: false) so Google/Yandex don't crawl an unbounded query-string
// surface and dilute crawl budget. hreflang alternates still emit for the
// canonical /search path so locale-switching from a results page works.

import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import {
  skuExactMatch,
  searchProducts,
  type SearchResult,
} from '@/lib/search';
import { ProductCard } from '@/components/public/product-card';
import { SearchFallbackBanner } from '@/components/public/search-fallback-banner';
import { buildAlternates, type Locale } from '@/lib/metadata';

interface SearchPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

interface SearchLabels {
  title: (q: string) => string;
  noResults: string;
  fallbackBanner: (fb: string, current: string) => string;
}

// Effectively force-dynamic — searchParams + DB query in a Suspense child
// keep the segment fully dynamic per request (cacheComponents-compatible).
async function SearchResultsBlock({
  locale,
  searchParams,
  labels,
}: {
  locale: Locale;
  searchParams: Promise<{ q?: string; page?: string }>;
  labels: SearchLabels;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // SRCH-04 / D-07 — exact SKU match short-circuits to product detail
  // BEFORE the FTS query runs. redirect() throws and unwinds the render.
  if (q) {
    const skuHit = await skuExactMatch(q, locale);
    if (skuHit) {
      redirect({ href: `/products/${skuHit.slug}`, locale });
    }
  }

  const result: SearchResult = q
    ? await searchProducts(q, locale, page, 20)
    : { rows: [], total: 0, fallbackLocale: null, query: '' };

  const fallbackMessage = result.fallbackLocale
    ? labels.fallbackBanner(
        result.fallbackLocale.toUpperCase(),
        locale.toUpperCase(),
      )
    : null;

  return (
    <>
      <h1
        className="text-2xl font-semibold text-slate-900 mb-6"
        data-testid="search-title"
      >
        {labels.title(q)}
      </h1>
      {fallbackMessage && result.fallbackLocale ? (
        <div className="mb-4">
          <SearchFallbackBanner
            fallbackLocale={result.fallbackLocale}
            currentLocale={locale}
            message={fallbackMessage}
          />
        </div>
      ) : null}
      {result.rows.length === 0 ? (
        <p data-testid="search-no-results" className="text-slate-600">
          {labels.noResults}
        </p>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          data-testid="search-results"
        >
          {result.rows.map((r) => (
            <ProductCard
              key={r.id}
              product={{
                id: r.id,
                name: r.name,
                slug: r.slug,
                shortDesc: r.shortDesc,
                heroPublicId: r.heroPublicId,
                manufacturerName: r.manufacturerName,
                sku: r.sku,
              }}
              locale={locale}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'public.search' });

  const labels: SearchLabels = {
    title: (q) => t('title', { q }),
    noResults: t('noResults'),
    fallbackBanner: (fb, current) => t('fallbackBanner', { locale: fb, current }),
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <Suspense fallback={<p className="text-slate-500">…</p>}>
        <SearchResultsBlock
          locale={locale}
          searchParams={searchParams}
          labels={labels}
        />
      </Suspense>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return {
    title: 'Search',
    robots: { index: false, follow: true },
    alternates: buildAlternates({ locale, pathPrefix: '/search' }),
  };
}
