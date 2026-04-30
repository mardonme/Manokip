// Plan 03-07 Task 7.2 — /[locale]/manufacturers/<slug> detail (MFG-02 / D-10
// + D-11 Verified pill + per-locale relationship_note).
//
// Renders:
//   - Cloudinary logo (CldImage with priority on the hero — manufacturer
//     pages are LCP-sensitive in their own right since branded queries land
//     directly on this URL)
//   - Display name + Verified Badge when isOfficialRep === true (D-11)
//   - Per-locale relationship_note italic paragraph below the badge (D-11) —
//     ONLY for the current locale; cross-locale fallback is intentionally
//     skipped because the note is per-locale copy meant to read natively.
//   - Description paragraph (cross-locale fallback to uz when missing)
//   - Paginated product grid scoped to this manufacturer (reuses ProductCard)
//
// generateMetadata returns per-locale canonical + hreflang via buildAlternates
// using the slug map fetched in the helper.
//
// BreadcrumbList JSON-LD: Manometr → Manufacturers → this manufacturer.
//
// cacheComponents (Wave 0): page shell statically prerenders; the runtime
// fetch + i18n lookups stream in via <Suspense>. Mirrors the catalog detail
// pattern (Plan 04).

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CldImage } from 'next-cloudinary';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import {
  getManufacturerBySlug,
  getManufacturerProducts,
} from '@/lib/manufacturer-public';
import { ProductCard } from '@/components/public/product-card';
import { Badge } from '@/components/ui/badge';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { buildAlternates, SITE_HOST, type Locale } from '@/lib/metadata';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function spString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const mfg = await getManufacturerBySlug(locale as Locale, slug);
  if (!mfg) return {};
  return {
    title: mfg.name,
    description: mfg.description ?? undefined,
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/manufacturers',
      slugByLocale: mfg.slugByLocale,
    }),
  };
}

export default function ManufacturerDetailPage({
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
      <ManufacturerDetailContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function ManufacturerDetailContent({
  params,
  searchParams,
}: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const mfg = await getManufacturerBySlug(locale as Locale, slug);
  if (!mfg) notFound();

  const sp = await searchParams;
  const pageRaw = spString(sp, 'page');
  const sizeRaw = spString(sp, 'pageSize');
  const page = Math.max(1, pageRaw ? Number(pageRaw) : 1);
  const pageSize = Math.min(100, Math.max(1, sizeRaw ? Number(sizeRaw) : 24));

  const [t, { rows, total }] = await Promise.all([
    getTranslations({ locale, namespace: 'public.manufacturer' }),
    getManufacturerProducts(mfg.id, locale as Locale, page, pageSize),
  ]);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Manometr', url: `${SITE_HOST}/${locale}` },
    { name: t('all'), url: `${SITE_HOST}/${locale}/manufacturers` },
    {
      name: mfg.name,
      url: `${SITE_HOST}/${locale}/manufacturers/${slug}`,
    },
  ]);
  // T-03-03-02 XSS hardening (manufacturer.name + relationship_note are
  // admin-controlled but still pass through React's auto-escape on render;
  // the JSON-LD blob also gets the </script> termination guard).
  const breadcrumbHtml = JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: breadcrumbHtml }}
      />
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <header
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start"
          data-testid="manufacturer-header"
        >
          {mfg.logoPublicId ? (
            <div className="flex h-20 w-40 shrink-0 items-center rounded-md bg-slate-50 p-2">
              <CldImage
                src={mfg.logoPublicId}
                alt={mfg.name}
                width={200}
                height={80}
                priority
                className="max-h-16 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="flex h-20 w-40 shrink-0 items-center justify-center rounded-md bg-slate-100 text-3xl text-slate-400">
              {mfg.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {mfg.name}
              </h1>
              {mfg.isOfficialRep ? (
                <Badge
                  variant="default"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  data-testid="verified-badge"
                >
                  {t('verified')}
                </Badge>
              ) : null}
            </div>
            {mfg.relationshipNote ? (
              <p
                className="mt-2 text-sm italic text-slate-600"
                data-testid="relationship-note"
              >
                {mfg.relationshipNote}
              </p>
            ) : null}
            {mfg.description ? (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
                {mfg.description}
              </p>
            ) : null}
            {mfg.websiteUrl ? (
              <p className="mt-3 text-sm">
                <a
                  href={mfg.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                  data-testid="manufacturer-website"
                >
                  {mfg.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              </p>
            ) : null}
          </div>
        </header>

        <h2
          className="mb-4 text-xl font-semibold text-slate-900"
          data-testid="products-heading"
        >
          {t('products', { count: total })}
        </h2>

        {rows.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {t('noProducts')}
          </p>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            data-testid="manufacturer-products"
          >
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
            data-testid="manufacturer-pagination"
          >
            <span className="text-slate-500 tabular-nums">
              {page} / {totalPages}
            </span>
          </nav>
        ) : null}
      </div>
    </>
  );
}
