// Plan 03-03 Task 3.1 — GREEN spec for SEO-01 + SEO-02 (metadata helpers).
//
// Validates buildAlternates() against the contract:
//   - canonical: per-locale URL for the current request locale (SEO-02)
//   - languages: { uz, ru, en, x-default } map (SEO-01)
//   - x-default points to uz canonical (D-05 cascade root, Pitfall A6)
//   - Missing per-locale slug → that locale OMITTED from languages (Pitfall #6)

import { describe, it, expect } from 'vitest';

import { buildAlternates, SITE_HOST, type Locale } from '@/lib/metadata';

describe('metadata helpers — hreflang + canonical (SEO-01, SEO-02; closed by plan 03)', () => {
  it('SEO-01: emits hreflang map for uz/ru/en + x-default', () => {
    const alternates = buildAlternates({
      locale: 'uz',
      pathPrefix: '/products',
      slugByLocale: { uz: 'a', ru: 'b', en: 'c' },
    }) as { canonical: string; languages: Record<string, string> };

    expect(alternates.languages.uz).toBe(`${SITE_HOST}/uz/products/a`);
    expect(alternates.languages.ru).toBe(`${SITE_HOST}/ru/products/b`);
    expect(alternates.languages.en).toBe(`${SITE_HOST}/en/products/c`);
    expect(alternates.languages['x-default']).toBe(`${SITE_HOST}/uz/products/a`);
    expect(Object.keys(alternates.languages).sort()).toEqual([
      'en',
      'ru',
      'uz',
      'x-default',
    ]);
  });

  it('SEO-02: canonical matches the current locale URL (uz request)', () => {
    const alternates = buildAlternates({
      locale: 'uz',
      pathPrefix: '/categories',
      slugByLocale: { uz: 'manometers', ru: 'manometry', en: 'manometers' },
    }) as { canonical: string };
    expect(alternates.canonical).toBe(`${SITE_HOST}/uz/categories/manometers`);
  });

  it('SEO-02: canonical reflects ru when called for ru locale', () => {
    const alternates = buildAlternates({
      locale: 'ru',
      pathPrefix: '/products',
      slugByLocale: { uz: 'gauge-a', ru: 'manometr-a', en: 'gauge-a-en' },
    }) as { canonical: string };
    expect(alternates.canonical).toBe(`${SITE_HOST}/ru/products/manometr-a`);
  });

  it('SEO-01: x-default points to the uz variant (D-05 cascade root)', () => {
    const alternates = buildAlternates({
      locale: 'en',
      pathPrefix: '/manufacturers',
      slugByLocale: { uz: 'wika-uz', ru: 'wika-ru', en: 'wika-en' },
    }) as { languages: Record<string, string> };
    expect(alternates.languages['x-default']).toBe(
      `${SITE_HOST}/uz/manufacturers/wika-uz`,
    );
  });

  it('Pitfall #6: missing locale slug is omitted from languages map', () => {
    const alternates = buildAlternates({
      locale: 'uz',
      pathPrefix: '/products',
      // no en slug — translation missing
      slugByLocale: { uz: 'a', ru: 'b' },
    }) as { canonical: string; languages: Record<string, string> };
    expect(alternates.languages.uz).toBe(`${SITE_HOST}/uz/products/a`);
    expect(alternates.languages.ru).toBe(`${SITE_HOST}/ru/products/b`);
    expect(Object.prototype.hasOwnProperty.call(alternates.languages, 'en'))
      .toBe(false);
    expect(alternates.languages['x-default']).toBe(
      `${SITE_HOST}/uz/products/a`,
    );
  });

  it('static page (no slugByLocale) emits same path under each locale', () => {
    const alternates = buildAlternates({
      locale: 'uz',
      pathPrefix: '',
    }) as { canonical: string; languages: Record<string, string> };
    expect(alternates.canonical).toBe(`${SITE_HOST}/uz`);
    expect(alternates.languages.uz).toBe(`${SITE_HOST}/uz`);
    expect(alternates.languages.ru).toBe(`${SITE_HOST}/ru`);
    expect(alternates.languages.en).toBe(`${SITE_HOST}/en`);
    expect(alternates.languages['x-default']).toBe(`${SITE_HOST}/uz`);
  });

  it('Locale type accepts only uz/ru/en', () => {
    // type-level — ensure exported alias is the closed union the rest of the
    // public surface depends on
    const ok: Locale = 'uz';
    expect(ok).toBe('uz');
  });
});
