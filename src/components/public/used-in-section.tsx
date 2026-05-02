// Plan 04-11 Task 11.1 — Used-In section RSC (CONT-04 / D-09).
//
// Pure RSC. Renders two card grids stacked vertically (Recipes on top,
// Industries below) for content that cross-links to the given product.
//
// Data source: getUsedInForProduct(productId, locale) from src/lib/used-in.ts
// (Plan 04-03). The helper is wrapped with 'use cache' + cacheTag(`used-in:${productId}`)
// and the underlying product_used_in_v pgView (Plan 04-01) explicitly filters
// to status='published' on both recipe + industry sides — defense-in-depth so
// this component cannot leak draft content (T-04-INFO-01 mitigation).
//
// Cap-at-6 per type is enforced inside getUsedInForProduct (D-09 v1 invariant);
// the deferred "all examples" link is reserved for v1.1 — for v1 we simply omit.
//
// Hidden-when-empty: per D-09 the entire <section> is omitted (not even an
// empty header) when both arrays are empty. Returning `null` from an RSC
// renders nothing in the React output.
//
// Card primitives reused from Plans 04-09 + 04-10 — no new card component.
// Both cards take `{ id, title, slug, excerpt, featuredImagePublicId }` so we
// pass UsedInItem fields straight through plus the helper's `id`.
//
// Translations: messages.UsedIn.{title, recipes, industries}. Cross-link copy
// is pre-shipped in messages/{uz,ru,en}.json under the UsedIn namespace.

import { getUsedInForProduct } from '@/lib/used-in';
import { getTranslations } from 'next-intl/server';
import { RecipeCard } from './recipe-card';
import { IndustryCard } from './industry-card';
import type { Locale } from '@/lib/metadata';

interface Props {
  productId: string;
  locale: Locale;
}

export async function UsedInSection({ productId, locale }: Props) {
  const { recipes, industries } = await getUsedInForProduct(productId, locale);
  if (recipes.length === 0 && industries.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'UsedIn' });

  return (
    <section
      aria-labelledby="used-in-heading"
      data-testid="used-in-section"
      className="space-y-6"
    >
      <h2
        id="used-in-heading"
        className="text-lg font-semibold text-slate-900"
      >
        {t('title')}
      </h2>

      {recipes.length > 0 ? (
        <div className="space-y-3" data-testid="used-in-recipes">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {t('recipes')}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0">
            {recipes.map((r) => (
              <li key={r.id}>
                <RecipeCard
                  recipe={{
                    id: r.id,
                    title: r.title,
                    slug: r.slug,
                    excerpt: r.excerpt,
                    featuredImagePublicId: r.featuredImagePublicId,
                  }}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {industries.length > 0 ? (
        <div className="space-y-3" data-testid="used-in-industries">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {t('industries')}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0">
            {industries.map((i) => (
              <li key={i.id}>
                <IndustryCard
                  industry={{
                    id: i.id,
                    title: i.title,
                    slug: i.slug,
                    excerpt: i.excerpt,
                    featuredImagePublicId: i.featuredImagePublicId,
                  }}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
