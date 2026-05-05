// Plan 03-05 Task 5.3 — Product detail page (CAT-06 / CAT-07 / CAT-08
// + SEO-01 / SEO-02 / SEO-05 LCP).
//
// Composes the full sketch-003 surface:
//   - <h1> with data-testid="product-name" so CAT-07 can assert SSR HTML.
//   - <ProductGallery> hero (priority CldImage for LCP per SEO-05).
//   - <KeyFactsRibbon> with the top-N rows from the first spec group.
//   - <SpecTable> grouped by spec_field_group (44%/56% per sketch 003).
//   - <ManufacturerCard> with Verified pill when isOfficialRep (D-11).
//   - <StickyCtaRail> on the right (lg:sticky 380px) wrapping <DownloadsList>.
//   - Two <script type="application/ld+json"> blocks: Product (no offers per
//     D-08) + BreadcrumbList. T-03-05-03 XSS hardening: replace `<` with
//     `<` after JSON.stringify so a name like "</script>..." can't
//     break out of the script element.
//   - generateMetadata returns per-locale canonical + hreflang for all 3
//     locales + x-default via buildAlternates({slugByLocale}) — Pitfall #6
//     missing-locale slugs are OMITTED so we never advertise a 404.
//
// cacheComponents (Wave-0 plan 01): the page-shell default export is a thin
// non-async wrapper that returns <Suspense><Content /></Suspense>. The
// runtime work (setRequestLocale, params await, getProductBySlug DB call)
// lives inside the Content child server component so the static shell
// prerenders. Reports `◐ (Partial Prerender)` in the build output.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import {
  getProductBySlug,
  type ProductDetailData,
} from '@/lib/product-detail';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { ProductGallery } from '@/components/public/product-gallery';
import { SpecTable } from '@/components/public/spec-table';
import {
  KeyFactsRibbon,
  type KeyFact,
} from '@/components/public/key-facts-ribbon';
import { StickyCtaRail } from '@/components/public/sticky-cta-rail';
import { ManufacturerCard } from '@/components/public/manufacturer-card';
import { DownloadsList } from '@/components/public/downloads-list';
import { UsedInSection } from '@/components/public/used-in-section';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/** Top-6 rows of the first spec group → key-facts ribbon tiles. */
function extractKeyFacts(groups: ProductDetailData['specGroups']): KeyFact[] {
  if (groups.length === 0) return [];
  const first = groups[0]!;
  return first.rows.slice(0, 6).map((r) => ({
    label: r.fieldLabel,
    value: r.displayValue,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(locale as Locale, slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDesc ?? undefined,
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/products',
      slugByLocale: product.slugByLocale,
    }),
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      }
    >
      <ProductDetailContent params={params} />
    </Suspense>
  );
}

async function ProductDetailContent({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(locale as Locale, slug);
  if (!product) notFound();

  const t = await getTranslations({ locale, namespace: 'public.product' });

  // JSON-LD payloads (D-08: no offers on Product).
  const productLd = productJsonLd({
    name: product.name,
    sku: product.sku,
    shortDesc: product.shortDesc,
    heroPublicId: product.imagePublicIds[0] ?? null,
    manufacturerName: product.manufacturer?.name ?? null,
  });
  const breadcrumbLd = breadcrumbJsonLd(product.breadcrumbs);

  // T-03-05-03 XSS hardening — close the </script> termination vector.
  // JSON.stringify alone does NOT escape `<` in string values.
  const ldEsc = (obj: unknown) =>
    JSON.stringify(obj).replace(/</g, '\\u003c');

  const keyFacts = extractKeyFacts(product.specGroups);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: ldEsc(productLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: ldEsc(breadcrumbLd) }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 max-w-screen-2xl mx-auto px-6 py-8">
        <div className="min-w-0 space-y-8">
          <header>
            <h1
              className="text-3xl font-semibold tracking-tight text-slate-900"
              data-testid="product-name"
            >
              {product.name}
            </h1>
            {product.sku ? (
              <p className="mt-1 text-sm tabular-nums text-slate-500">
                SKU: {product.sku}
              </p>
            ) : null}
            {product.shortDesc ? (
              <p className="mt-3 text-base text-slate-700">{product.shortDesc}</p>
            ) : null}
          </header>

          <ProductGallery
            publicIds={product.imagePublicIds}
            alt={product.name}
          />

          {keyFacts.length > 0 ? <KeyFactsRibbon facts={keyFacts} /> : null}

          <SpecTable groups={product.specGroups} />

          {/* Plan 04-11 — Used-In section (CONT-04 / D-09): cross-linked
              recipes + industries that reference this product. Mounted in
              the locked slot below the spec table and above the manufacturer
              card per sketch-003 left column. The component returns null
              when there are no cross-links, so this slot is invisible for
              products without any. */}
          <UsedInSection productId={product.id} locale={locale as Locale} />

          {product.manufacturer ? (
            <ManufacturerCard
              manufacturer={product.manufacturer}
              locale={locale as Locale}
              officialRepLabel={t('officialRep')}
            />
          ) : null}

          {product.longDesc ? (
            <section data-testid="product-applications">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                {t('applications')}
              </h2>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {product.longDesc}
              </p>
            </section>
          ) : null}
        </div>

        <StickyCtaRail
          productName={product.name}
          sku={product.sku}
          locale={locale as Locale}
          labels={{
            requestPrice: t('requestPrice'),
            downloads: t('downloads'),
          }}
        >
          {product.datasheetPublicIds.length > 0 ? (
            <DownloadsList
              datasheetPublicIds={product.datasheetPublicIds}
              downloadLabel={t('download')}
            />
          ) : null}
        </StickyCtaRail>
      </div>
    </>
  );
}
