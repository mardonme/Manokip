// Plan 03-03 Task 3.2 — Public site header (sketch 003 frosted-glass) RSC.
//
// Sticky frosted-glass header rendered site-wide via the public root layout
// (src/app/[locale]/layout.tsx). Visual contract from sketch 003:
//   backdrop-filter: blur(14px), bg-slate-50/80, border-b.
//
// IMPORTANT: the search Input is a DISABLED PLACEHOLDER. Plan 06 will swap
// this block for a live <SearchBox/> client island. The data-testid hook
// `search-placeholder` is the grep target for that future swap. Waves 2-5
// ship a header that visually anticipates search so layout doesn't shift
// when the live SearchBox lands.
//
// CategoryNav lives in a sibling left rail (rendered by listing/detail
// pages, not in the header) — this header carries top-level nav links only:
// Catalog / Manufacturers / Search.

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';
import { Input } from '@/components/ui/input';
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
        {/* PLACEHOLDER — Plan 06 swaps this disabled <Input> for the live
            <SearchBox/> client island. The placeholder anchors layout +
            reserves space so waves 2–5 ship a header that doesn't visually
            shift when SearchBox lands in wave 5. data-testid is the
            grep-replace anchor for Plan 06. */}
        <Input
          type="search"
          disabled
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          className="w-72"
          data-testid="search-placeholder"
        />
        <LocaleSwitcher currentLocale={locale} />
      </div>
    </header>
  );
}
