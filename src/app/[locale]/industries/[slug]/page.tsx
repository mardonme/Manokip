// Plan 04-10 Task 10.2 — /[locale]/industries/[slug] detail page (CONT-03 + CONT-06).
//
// Mirror of src/app/[locale]/recipes/[slug]/page.tsx (Plan 04-09 Task 9.3).
// Pure RSC. Composes the industry public surface:
//   - <LocaleFallbackBanner> at top when usedFallbackLocale != null (Phase 4 D-07)
//     REUSES src/components/public/locale-fallback-banner.tsx — entityType="industry"
//   - <CldImage> hero (priority — industry detail page LCP)
//   - <h1> page title (kept OUTSIDE the prose wrapper per Deviation Rule 2)
//   - excerpt as a <p> lede
//   - <article> with the Tiptap body rendered via renderTiptapToHtml (server-side
//     static-renderer, zero client JS for body rendering — D-08 + SEO-05)
//   - TechArticle JSON-LD (Phase 4 D-10 LOCKED — even though Article would be the
//     strict semantic fit per RESEARCH P4-4, ship as TechArticle for v1; the manual
//     Yandex gate in plan 04-12 validates Webmaster acceptance and downgrades
//     to Article in v1.1 if flagged)
//   - JSON-LD emitted via <script type="application/ld+json"> with the < termination
//     guard (Phase 3 D-09 carry-forward, T-04-XSS-02 mitigation)
//
// Caching: getIndustryBySlug + getLinkedProductsForIndustry both wrap with
// 'use cache' + cacheTag(`industry:${id}`). The page itself is the standard
// Suspense-wrapped pattern from products/manufacturers/recipes detail.
//
// Metadata: generateMetadata fetches the industry to build per-locale canonical
// + hreflang via buildAlternates({ slugByLocale: industry.slugByLocale }) where
// the slug map omits locales without a translation row (Pitfall #6 — never
// advertise a 404).
//
// Draft gate: getIndustryBySlug filters status='published' inside SQL (T-04-INFO-01
// mitigation). When the slug doesn't resolve, notFound() returns the 404 page.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { CldImage } from 'next-cloudinary';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { JSONContent } from '@tiptap/core';

import {
  getIndustryBySlug,
  getLinkedProductsForIndustry,
} from '@/lib/industries';
import { renderTiptapToHtml } from '@/lib/tiptap-render';
import { techArticleJsonLd } from '@/lib/jsonld';
import { buildAlternates, SITE_HOST, type Locale } from '@/lib/metadata';
import { LocaleFallbackBanner } from '@/components/public/locale-fallback-banner';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const industry = await getIndustryBySlug(slug, locale as Locale);
  if (!industry) return {};
  return {
    title: industry.translation.title,
    description: industry.translation.excerpt ?? undefined,
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/industries',
      slugByLocale: industry.slugByLocale,
    }),
  };
}

export default function IndustryDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      }
    >
      <IndustryDetailContent params={params} />
    </Suspense>
  );
}

async function IndustryDetailContent({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const industry = await getIndustryBySlug(slug, locale as Locale);
  if (!industry) notFound();

  // Linked products power the TechArticle `mentions` array (D-10). The helper
  // already applies the same uz fallback for missing-locale product
  // translations.
  const mentions = await getLinkedProductsForIndustry(
    industry.id,
    locale as Locale,
  );

  const t = await getTranslations({
    locale,
    namespace: 'public.localeFallback.industry',
  });

  // Body HTML — server-side rendered. The static-renderer returns escaped HTML
  // (T-04-XSS-01 mitigation; the locked TIPTAP_EXTENSIONS array IS the allow-
  // list). Empty-body case: getIndustryBySlug already cascade-falls to a non-empty
  // locale OR returns null entirely; if we reached this point, body is filled.
  const bodyHtml = industry.translation.body
    ? renderTiptapToHtml(industry.translation.body as JSONContent)
    : '';

  // Per-locale canonical URL using the resolved-translation slug for the
  // current locale (or the fallback locale's slug if the requested locale's
  // translation was missing).
  const currentLocaleSlug =
    industry.slugByLocale[locale as Locale] ?? industry.translation.slug;
  const canonicalPath = `/${locale}/industries/${currentLocaleSlug}`;

  // TechArticle JSON-LD (Phase 4 D-10 LOCKED).
  // datePublished falls back to updatedAt if publishedAt is null (a published
  // industry with no publishedAt would be a data-integrity bug, but we don't
  // crash the page for it — TechArticle requires datePublished).
  const datePublishedIso = (
    industry.publishedAt ?? industry.updatedAt
  ).toISOString();
  const dateModifiedIso = industry.updatedAt.toISOString();

  const articleLd = techArticleJsonLd({
    headline: industry.translation.title,
    excerpt: industry.translation.excerpt,
    featuredImagePublicId: industry.featuredImagePublicId,
    datePublished: datePublishedIso,
    dateModified: dateModifiedIso,
    inLanguage: locale as Locale,
    canonicalUrl: `${SITE_HOST}${canonicalPath}`,
    mentions: mentions.map((m) => ({
      name: m.name,
      url: `${SITE_HOST}/${m.locale}/products/${m.slug}`,
    })),
  });

  // T-04-XSS-02 — close the </script> termination vector. JSON.stringify alone
  // does NOT escape `<` in string values, so a headline containing the literal
  // substring "</script>" would break out of the script element.
  const articleLdHtml = JSON.stringify(articleLd).replace(/</g, '\\u003c');

  // Locale-fallback banner copy: when the resolver fell back to a non-requested
  // locale, look up the message keyed by the FALLBACK locale (e.g. if user
  // requested ru but uz translation was used, render the ru-language message
  // explaining the fallback was uz).
  const fallbackMessage = industry.usedFallbackLocale
    ? t(industry.usedFallbackLocale)
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: articleLdHtml }}
      />
      <article className="max-w-3xl mx-auto px-6 py-8">
        {industry.usedFallbackLocale && fallbackMessage ? (
          <div className="mb-6">
            <LocaleFallbackBanner
              message={fallbackMessage}
              fallbackLocale={industry.usedFallbackLocale}
              requestedLocale={locale as Locale}
              entityType="industry"
            />
          </div>
        ) : null}

        {industry.featuredImagePublicId ? (
          <div className="mb-8 overflow-hidden rounded-lg bg-slate-50">
            <CldImage
              src={industry.featuredImagePublicId}
              alt={industry.translation.title}
              width={1200}
              height={675}
              priority
              sizes="(max-width: 900px) 100vw, 768px"
              className="w-full object-cover"
            />
          </div>
        ) : null}

        <header className="mb-8">
          <h1
            className="text-4xl font-semibold tracking-tight text-slate-900"
            data-testid="industry-title"
          >
            {industry.translation.title}
          </h1>
          {industry.translation.excerpt ? (
            <p
              className="mt-3 text-lg text-slate-700"
              data-testid="industry-excerpt"
            >
              {industry.translation.excerpt}
            </p>
          ) : null}
        </header>

        {/*
         * Deviation Rule 2 from PLAN 04-09: scope prose to a child div so the
         * <h1> + lede above keep their non-prose typography. The article
         * body inside this wrapper inherits prose-slate defaults (headings,
         * lists, blockquote, etc).
         */}
        <div
          className="article-body prose prose-slate max-w-none"
          data-testid="industry-body"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </article>
    </>
  );
}
