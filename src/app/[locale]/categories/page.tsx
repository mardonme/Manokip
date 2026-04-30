// Plan 03-04 Task 4.3 — /[locale]/categories index page (CAT-02 partial).
//
// Lists every top-level category as a card linking to its detail page. The
// data fetch (getRootCategories) is wrapped in 'use cache' + cacheTag so
// Phase-2 revalidateCategory(...) invalidates the index whenever a root
// category mutates.
//
// generateMetadata returns per-locale canonical + hreflang via buildAlternates
// (no slug map — same path under each locale).
//
// cacheComponents (Wave 0): the page shell statically prerenders; the
// runtime data fetch + i18n lookups stream in via <Suspense>.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getRootCategories } from '@/lib/catalog';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { Card, CardContent } from '@/components/ui/card';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'public.catalog',
  });
  return {
    title: t('categories'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/categories',
    }),
  };
}

export default function CategoriesIndexPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      }
    >
      <CategoriesIndexContent params={params} />
    </Suspense>
  );
}

async function CategoriesIndexContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'public.catalog',
  });

  const cats = await getRootCategories(locale as Locale);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <h1 className="mb-6 text-3xl font-semibold text-slate-900">
        {t('categories')}
      </h1>
      {cats.length === 0 ? (
        <p className="text-sm text-slate-500">{t('noResults')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {cats.map((c) => (
            <Card
              key={c.id}
              size="sm"
              data-testid={`category-card-${c.slug}`}
            >
              <Link
                href={`/categories/${c.slug}`}
                locale={locale as Locale}
                className="block"
              >
                <CardContent className="py-4">
                  <h2 className="font-medium text-slate-900">{c.name}</h2>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
