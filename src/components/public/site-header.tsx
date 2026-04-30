// Plan 03-03 Task 3.2 — Public site header (sketch 003 frosted-glass) RSC.
// Plan 03-06 Task 6.2 — Disabled placeholder input swapped for the live
// <SearchBox /> client island. The header layout dimensions (w-72 input
// width, position in the flex row) are preserved so the swap doesn't
// visually shift; the placeholder testid is retired and SearchBox uses
// its own data-testid="search-input" for downstream e2e specs.
//
// Sticky frosted-glass header rendered site-wide via the public root layout
// (src/app/[locale]/layout.tsx). Visual contract from sketch 003:
//   backdrop-filter: blur(14px), bg-slate-50/80, border-b.
//
// CategoryNav lives in a sibling left rail (rendered by listing/detail
// pages, not in the header) — this header carries top-level nav links only:
// Catalog / Manufacturers / Search.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';
import { SearchBox } from './search-box';
import type { Locale } from '@/lib/metadata';

export interface SiteHeaderProps {
  locale: Locale;
}

export async function SiteHeader({ locale }: SiteHeaderProps) {
  const t = await getTranslations({ locale, namespace: 'public.header' });
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-[14px] bg-slate-50/80 border-b border-slate-200"
      data-testid="site-header"
    >
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-6 px-6 py-3">
        <Link
          href={`/${locale}`}
          className="text-lg font-semibold text-slate-900 tracking-tight"
        >
          Manometr
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-700">
          <Link href={`/${locale}/categories`}>{t('catalog')}</Link>
          <Link href={`/${locale}/manufacturers`}>{t('manufacturers')}</Link>
          <Link href={`/${locale}/search`}>{t('search')}</Link>
        </nav>
        <SearchBox locale={locale} placeholder={t('searchPlaceholder')} />
        <LocaleSwitcher currentLocale={locale} />
      </div>
    </header>
  );
}
