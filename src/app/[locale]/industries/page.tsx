// Plan 04-10 Task 10.2 — /[locale]/industries index page (CONT-03 + SEO-01/SEO-02).
//
// Mirror of src/app/[locale]/recipes/page.tsx (Plan 04-09 Task 9.2). Pure RSC.
// Lists every published industry with its current-locale row as a card grid
// (IndustryCard primitive from Task 10.1). Industries lacking a translation in
// the current locale are filtered out by findPublishedIndustries' inner join
// (Phase 3 catalog list pattern carry-forward — no cascade fallback at the
// index level; D-07 cascade fallback only fires on the detail page).
//
// Caching: findPublishedIndustries already wraps with 'use cache' + cacheTag
// (`industries:list:${locale}`). The page itself is composed of static markup +
// the cached fetch — Next streams the inner data fetch via <Suspense> so the
// page shell prerenders (cacheComponents — Wave 0 plan 01).
//
// Metadata: per-locale canonical + hreflang for all 3 locales + x-default via
// buildAlternates (Phase 3 SEO-01 / SEO-02). No slug map — same path under
// each locale (every locale has /[locale]/industries).

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { findPublishedIndustries } from '@/lib/industries';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { IndustryCard } from '@/components/public/industry-card';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'public.industries.index',
  });
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/industries',
    }),
  };
}

export default function IndustriesIndexPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      }
    >
      <IndustriesIndexContent params={params} />
    </Suspense>
  );
}

async function IndustriesIndexContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: 'public.industries.index',
  });
  const list = await findPublishedIndustries(locale as Locale);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {t('title')}
        </h1>
        <p className="mt-2 text-base text-slate-600">{t('subtitle')}</p>
      </header>

      {list.length === 0 ? (
        <p
          className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
          data-testid="industries-empty"
        >
          {t('empty')}
        </p>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          data-testid="industries-list"
        >
          {list.map((i) => (
            <IndustryCard
              key={i.id}
              industry={{
                id: i.id,
                title: i.title,
                slug: i.slug,
                excerpt: i.excerpt,
                featuredImagePublicId: i.featuredImagePublicId,
              }}
              locale={locale as Locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
