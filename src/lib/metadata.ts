// Plan 03-03 Task 3.1 — Metadata helpers for hreflang + canonical (SEO-01, SEO-02).
//
// Single buildAlternates() factory that every public page calls from generateMetadata.
// Returns Next.js Metadata['alternates'] with:
//   - canonical: per-locale URL for the current request locale
//   - languages: { uz, ru, en, x-default } map for hreflang annotations
//
// Pitfall #6: never link to a 404 — when a translation is missing for a locale
// (slugByLocale[l] is null/undefined), that locale's key is OMITTED from the
// languages map. x-default per D-05 / Pitfall A6 always points to the uz variant
// because uz is the project default locale.
//
// Two call shapes supported:
//   - Static page (no per-locale slug): omit slugByLocale → same path under each locale.
//   - Dynamic entity (product/category/manufacturer): pass slugByLocale → URL is
//     `${HOST}/${l}${pathPrefix}/${slug}` per locale.

import type { Metadata } from 'next';

export const SITE_HOST = 'https://manometr.uz';

export type Locale = 'uz' | 'ru' | 'en';

const ALL_LOCALES: Locale[] = ['uz', 'ru', 'en'];
const DEFAULT_LOCALE: Locale = 'uz';

export interface AlternatesInput {
  /** Current request locale (used for `canonical`). */
  locale: Locale;
  /**
   * Path prefix excluding the locale segment, with no trailing slash.
   * Examples: '' (root), '/categories', '/products', '/manufacturers'.
   */
  pathPrefix: string;
  /**
   * Per-locale slug map for dynamic entity pages. Omit for static pages where
   * the URL shape is identical across locales (just the locale prefix swaps).
   * If a locale's slug is missing/undefined, that locale is OMITTED from the
   * hreflang `languages` map (Pitfall #6 — never advertise a 404).
   */
  slugByLocale?: Partial<Record<Locale, string>>;
}

export function buildAlternates(i: AlternatesInput): Metadata['alternates'] {
  const slugFor = (l: Locale): string | null => {
    if (!i.slugByLocale) return ''; // static path — same path for every locale
    const s = i.slugByLocale[l];
    return s ?? null;
  };

  const urlFor = (l: Locale): string | null => {
    const slug = slugFor(l);
    if (slug === null) return null;
    return slug
      ? `${SITE_HOST}/${l}${i.pathPrefix}/${slug}`
      : `${SITE_HOST}/${l}${i.pathPrefix}`;
  };

  const currentUrl = urlFor(i.locale);

  const languages: Record<string, string> = {};
  for (const l of ALL_LOCALES) {
    const u = urlFor(l);
    if (u) languages[l] = u;
  }
  const xDefault = urlFor(DEFAULT_LOCALE);
  if (xDefault) languages['x-default'] = xDefault;

  return {
    canonical: currentUrl ?? `${SITE_HOST}/${i.locale}${i.pathPrefix}`,
    languages,
  };
}
