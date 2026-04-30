// Plan 03-07 Task 7.2 — /[locale]/manufacturers index (MFG-01 / D-10).
//
// Lists every manufacturer as a card carrying:
//   - Cloudinary logo (CldImage, lazy)
//   - Display name
//   - Authorized pill when isOfficialRep === true (D-11)
//   - Count of published products
//
// generateMetadata returns per-locale canonical + hreflang via buildAlternates
// (no slug map — same path under each locale).
//
// cacheComponents (Wave 0): the page shell statically prerenders; the runtime
// data fetch + i18n lookups stream in via <Suspense>. Mirrors the catalog
// index pattern (Plan 04).

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CldImage } from 'next-cloudinary';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getManufacturers } from '@/lib/manufacturer-public';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { Badge } from '@/components/ui/badge';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'public.manufacturer',
  });
  return {
    title: t('all'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/manufacturers',
    }),
  };
}

export default function ManufacturersIndexPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="h-10 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      }
    >
      <ManufacturersIndexContent params={params} />
    </Suspense>
  );
}

async function ManufacturersIndexContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'public.manufacturer',
  });
  const list = await getManufacturers(locale as Locale);

  // BreadcrumbList JSON-LD (Manometr → Manufacturers index).
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Manometr', url: `https://manometr.uz/${locale}` },
    {
      name: t('all'),
      url: `https://manometr.uz/${locale}/manufacturers`,
    },
  ]);
  // T-03-03-02 XSS hardening — close the </script> termination vector.
  const breadcrumbHtml = JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c');

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: breadcrumbHtml }}
      />
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <h1 className="mb-6 text-3xl font-semibold text-slate-900">
          {t('all')}
        </h1>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">{t('noResults')}</p>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            data-testid="manufacturers-list"
          >
            {list.map((m) => (
              <Link
                key={m.id}
                href={`/manufacturers/${m.slug}`}
                locale={locale as Locale}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                data-testid={`manufacturer-card-${m.slug || m.id}`}
              >
                {m.logoPublicId ? (
                  <div className="flex h-16 items-center">
                    <CldImage
                      src={m.logoPublicId}
                      alt={m.name}
                      width={200}
                      height={64}
                      loading="lazy"
                      className="max-h-16 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-32 items-center justify-center rounded-md bg-slate-100 text-2xl text-slate-400">
                    {m.name.charAt(0)}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-medium text-slate-900">
                    {m.name}
                  </h2>
                  {m.isOfficialRep ? (
                    <Badge
                      variant="default"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      data-testid="authorized-badge"
                    >
                      {t('authorized')}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-500 tabular-nums">
                  {t('productCount', { count: m.productCount })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
