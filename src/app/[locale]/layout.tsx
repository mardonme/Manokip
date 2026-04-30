import { Suspense } from 'react';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { Metadata } from 'next';

import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/public/site-header';
import { organizationJsonLd } from '@/lib/jsonld';
import { buildAlternates, type Locale } from '@/lib/metadata';

// next/font subsets per SEO-04 — cyrillic + latin-ext required for ru/uz
// glyph rendering. Phase-1 plan 01-04 baseline preserved.
const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-sans',
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Plan 03-03 Task 3.3 — root-level alternates so every public page that
// doesn't override generateMetadata still ships hreflang + per-locale
// canonical for SEO-01 + SEO-02.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL('https://manometr.uz'),
    alternates: buildAlternates({ locale: locale as Locale, pathPrefix: '' }),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Organization JSON-LD on every public page (D-09). XSS hardening per
  // T-03-03-02: escape `<` so a manufacturer name like "</script><script>..."
  // can't terminate the script element. JSON.stringify already escapes most
  // hostile inputs but does NOT touch `<`/`>` in string values; the explicit
  // < replacement closes that vector.
  const orgJsonLd = organizationJsonLd();
  const orgJsonLdHtml = JSON.stringify(orgJsonLd).replace(/</g, '\\u003c');

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: orgJsonLdHtml }}
        />
      </head>
      <body>
        <NextIntlClientProvider>
          <NuqsAdapter>
            <Suspense fallback={<div className="h-14 border-b border-slate-200 bg-slate-50/80" />}>
              <SiteHeader locale={locale as Locale} />
            </Suspense>
            <main>{children}</main>
          </NuqsAdapter>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
