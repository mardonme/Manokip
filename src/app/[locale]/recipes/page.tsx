// Plan 04-09 Task 9.2 — /[locale]/recipes index page (CONT-03 + SEO-01/SEO-02).
//
// Pure RSC. Lists every published recipe with its current-locale row as a card
// grid (RecipeCard primitive from Task 9.1). Recipes lacking a translation in
// the current locale are filtered out by findPublishedRecipes' inner join
// (Phase 3 catalog list pattern carry-forward — no cascade fallback at the
// index level; D-07 cascade fallback only fires on the detail page).
//
// Caching: findPublishedRecipes already wraps with 'use cache' + cacheTag
// (`recipes:list:${locale}`). The page itself is composed of static markup +
// the cached fetch — Next streams the inner data fetch via <Suspense> so the
// page shell prerenders (cacheComponents — Wave 0 plan 01).
//
// Metadata: per-locale canonical + hreflang for all 3 locales + x-default via
// buildAlternates (Phase 3 SEO-01 / SEO-02). No slug map — same path under
// each locale (every locale has /[locale]/recipes).
//
// Empty state: a single localized line — no JSON-LD CollectionPage emission
// in v1 (decided to defer per the plan: simple list page emits Article
// metadata via title/description only; v1.1 if Yandex Rich Results requests).

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { findPublishedRecipes } from '@/lib/recipes';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { RecipeCard } from '@/components/public/recipe-card';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'public.recipes.index',
  });
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/recipes',
    }),
  };
}

export default function RecipesIndexPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      }
    >
      <RecipesIndexContent params={params} />
    </Suspense>
  );
}

async function RecipesIndexContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: 'public.recipes.index',
  });
  const list = await findPublishedRecipes(locale as Locale);

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
          data-testid="recipes-empty"
        >
          {t('empty')}
        </p>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
          data-testid="recipes-list"
        >
          {list.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={{
                id: r.id,
                title: r.title,
                slug: r.slug,
                excerpt: r.excerpt,
                featuredImagePublicId: r.featuredImagePublicId,
              }}
              locale={locale as Locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
