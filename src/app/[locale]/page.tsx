// Quick task 260509-oha — full Phase-8 homepage MOCK for client showcase.
//
// THROWAWAY. Phase 8 plan 08-HOME-* will replace this entire file. Goal of
// this code is one thing only: render a high-fidelity demo of the future
// homepage at /[locale] for uz/ru/en using REAL seeded data and the
// existing Phase-6 reusable components (Gauge, ProductCard, ContactButton).
// No new abstractions, no tests, no commerce affordances.

import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { Link } from '@/i18n/navigation';
import { Gauge } from '@/components/public/gauge';
import { ProductCard } from '@/components/public/product-card';
import { ContactButton } from '@/components/public/contact-button';
import { Button } from '@/components/ui/button';
import {
  getRootCategories,
  getCategoryProducts,
  type CategoryRowResult,
} from '@/lib/catalog';
import { findPublishedIndustries } from '@/lib/industries';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { HomeStatTicker } from './_components/home-stat-ticker';

type Props = { params: Promise<{ locale: string }> };

// NOTE: this project's next.config has `cacheComponents` enabled, which
// is incompatible with the route-segment-level `export const revalidate`.
// The data helpers in src/lib/catalog.ts and src/lib/industries.ts already
// use `'use cache'` + cacheTag() so revalidation flows through Phase-2's
// revalidateCategory / revalidateIndustry actions — no per-page knob needed.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    title: t('siteTitle'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '',
    }),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'home' });
  const rootCategories = await getRootCategories(locale as Locale);
  const industries = await findPublishedIndustries(locale as Locale);

  // Featured: top 4 from the FIRST root category. Empty if no categories.
  let featured: CategoryRowResult[] = [];
  if (rootCategories.length > 0) {
    const first = rootCategories[0]!;
    const result = await getCategoryProducts(
      first.id,
      locale as Locale,
      [],
      1,
      4,
    );
    featured = result.rows;
  }

  // Stats: parsed from the home.hero.stats.* keys; the ticker takes numbers
  // and renders the suffix as a string.
  const stats = [
    {
      label: t('hero.stats.label1'),
      value: Number(t('hero.stats.value1')) || 0,
      suffix: t('hero.stats.suffix1'),
    },
    {
      label: t('hero.stats.label2'),
      value: Number(t('hero.stats.value2')) || 0,
      suffix: t('hero.stats.suffix2'),
    },
    {
      label: t('hero.stats.label3'),
      value: Number(t('hero.stats.value3')) || 0,
      suffix: t('hero.stats.suffix3'),
    },
    {
      label: t('hero.stats.label4'),
      value: Number(t('hero.stats.value4')) || 0,
      suffix: t('hero.stats.suffix4'),
    },
  ];

  // Solutions placeholder titles (used when industries are empty). Stored as
  // a single pipe-separated string per locale to keep the messages tree flat.
  const placeholderSolutionTitles = t('solutions.placeholderTitles')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  // Filter pills row (visual only — throwaway). "All" + first 4 root cats.
  const filterPills = [
    t('featured.pillAll'),
    ...rootCategories.slice(0, 4).map((c) => c.name),
  ];

  return (
    <div className="bg-surface text-ink">
      {/* ============================================================
          SECTION 1 — HERO (HOME-01)
          12-col grid; 2/3 text + 1/3 gauge on lg+.
         ============================================================ */}
      <section className="container mx-auto max-w-7xl px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8">
            <span className="mk-eyebrow">{t('hero.eyebrow')}</span>
            <h1 className="mt-5 font-semibold text-ink tracking-tight text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
              <span className="block">{t('hero.titleLine1')}</span>
              <span className="block">{t('hero.titleLine2')}</span>
            </h1>
            <p className="mt-6 max-w-prose text-ink-2 text-base md:text-lg leading-relaxed">
              {t('hero.lede')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ContactButton
                locale={locale as Locale}
                variant="default"
                size="default"
              />
              <Link href="/categories" locale={locale as Locale}>
                <Button variant="outline" size="default">
                  {t('hero.ctaBrowse')}
                </Button>
              </Link>
            </div>
            <div className="mt-10">
              <HomeStatTicker stats={stats} />
            </div>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <div className="relative">
              <Gauge
                value={7.4}
                max={10}
                unit="MPa"
                label={t('hero.gaugeLabel')}
              />
              <span className="mk-mono absolute -top-1 right-0 ring-1 ring-line bg-surface px-2 py-1 text-[11px] text-ink-2 rounded-sm">
                {t('hero.callout1')}
              </span>
              <span className="mk-mono absolute top-1/2 -left-2 -translate-y-1/2 ring-1 ring-line bg-surface px-2 py-1 text-[11px] text-ink-2 rounded-sm">
                {t('hero.callout2')}
              </span>
              <span className="mk-mono absolute -bottom-2 right-2 ring-1 ring-line bg-surface px-2 py-1 text-[11px] text-ink-2 rounded-sm">
                {t('hero.callout3')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — CATEGORY GRID (HOME-02)
          Hairline grid; real cards + placeholder fill to a 4×3.
         ============================================================ */}
      <section className="container mx-auto max-w-7xl px-6 mb-24">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <span className="mk-eyebrow">{t('categories.eyebrow')}</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink">
              {t('categories.title')}
            </h2>
          </div>
          <Link
            href="/categories"
            locale={locale as Locale}
            className="mk-mono text-xs text-accent hover:underline whitespace-nowrap"
          >
            {t('categories.viewAll')}
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-l border-t border-line">
          {rootCategories.map((cat, idx) => (
            <div
              key={cat.id}
              className="group relative aspect-4/3 border-r border-b border-line p-5 flex flex-col justify-between bg-surface hover:bg-white transition-colors"
            >
              <div className="flex items-start justify-between text-xs">
                <span className="mk-mono text-ink-3">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                {/* throwaway: Phase 8 will use a real per-category product count */}
                <span className="mk-mono text-ink-3">12+</span>
              </div>
              <div>
                <h3 className="font-medium text-ink text-base md:text-lg leading-snug">
                  {cat.name}
                </h3>
                <span className="mk-eyebrow mt-2 block text-ink-3">
                  {t('categories.cardCaption')}
                </span>
              </div>
              <Link
                href={`/categories/${cat.slug}`}
                locale={locale as Locale}
                className="absolute inset-0"
                aria-label={cat.name}
              />
            </div>
          ))}
          {/* Placeholder fill — pad up to 12 cells so the grid completes a 4×3. */}
          {Array.from({
            length: Math.max(0, 12 - rootCategories.length),
          }).map((_, i) => (
            <div
              key={`ph-${i}`}
              className="relative aspect-4/3 border-r border-b border-line p-5 flex flex-col justify-between mk-ph mk-ph-corners"
            >
              <div className="flex items-start justify-between text-xs">
                <span className="mk-mono text-ink-3">
                  {String(rootCategories.length + i + 1).padStart(2, '0')}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-ink-3 text-sm">
                  {t('categories.placeholder')}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — FEATURED PRODUCTS (HOME-03)
         ============================================================ */}
      <section className="container mx-auto max-w-7xl px-6 mb-24">
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <span className="mk-eyebrow">{t('featured.eyebrow')}</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink">
              {t('featured.title')}
            </h2>
          </div>
          <Link
            href="/categories"
            locale={locale as Locale}
            className="mk-mono text-xs text-accent hover:underline whitespace-nowrap"
          >
            {t('featured.viewAll')}
          </Link>
        </div>

        <div className="flex gap-2 flex-wrap mt-4 mb-6">
          {filterPills.map((pill, i) => (
            <span
              key={pill}
              className={
                i === 0
                  ? 'mk-mono text-xs px-3 py-1.5 rounded-full bg-ink text-surface'
                  : 'mk-mono text-xs px-3 py-1.5 rounded-full ring-1 ring-line text-ink-2 bg-surface'
              }
            >
              {pill}
            </span>
          ))}
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                locale={locale as Locale}
              />
            ))}
          </div>
        ) : (
          <div className="mk-ph mk-ph-corners h-64 w-full flex items-center justify-center text-ink-3 text-sm rounded-lg">
            {t('featured.empty')}
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 4 — SOLUTIONS BAND (HOME-04, dark)
         ============================================================ */}
      <section className="bg-ink text-surface py-20 lg:py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <span className="mk-eyebrow text-surface/60">
              {t('solutions.eyebrow')}
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-surface">
              {t('solutions.title')}
            </h2>
            <p className="mt-4 text-surface/70 text-base md:text-lg leading-relaxed">
              {t('solutions.lede')}
            </p>
          </div>

          {industries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {industries.slice(0, 6).map((ind, i) => (
                <Link
                  key={ind.id}
                  href={`/industries/${ind.slug}`}
                  locale={locale as Locale}
                  className="group block rounded-lg ring-1 ring-surface/20 p-6 hover:ring-surface/40 transition"
                >
                  <span className="mk-mono text-surface/40 text-xs">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-surface text-lg md:text-xl font-medium mt-3">
                    {ind.title}
                  </h3>
                  {ind.excerpt ? (
                    <p className="text-surface/60 text-sm mt-2 line-clamp-2">
                      {ind.excerpt}
                    </p>
                  ) : null}
                  <span className="mk-mono text-xs text-accent mt-6 inline-block">
                    {t('solutions.cta')} →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
              {placeholderSolutionTitles.map((title, i) => (
                <div
                  key={title}
                  className="rounded-lg ring-1 ring-surface/20 p-6"
                >
                  <span className="mk-mono text-surface/40 text-xs">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-surface text-lg font-medium mt-3">
                    {title}
                  </h3>
                  <span className="mk-mono text-xs text-accent mt-6 inline-block">
                    {t('solutions.cta')} →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — SERVICE STRIP (HOME-05)
         ============================================================ */}
      <section className="container mx-auto max-w-7xl px-6 mt-24 mb-32">
        <div className="max-w-2xl">
          <span className="mk-eyebrow">{t('service.eyebrow')}</span>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink">
            {t('service.title')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line mt-8">
          {(
            [
              {
                n: '01',
                title: t('service.fact1.title'),
                body: t('service.fact1.body'),
              },
              {
                n: '02',
                title: t('service.fact2.title'),
                body: t('service.fact2.body'),
              },
              {
                n: '03',
                title: t('service.fact3.title'),
                body: t('service.fact3.body'),
              },
            ] as const
          ).map((f) => (
            <div key={f.n} className="bg-surface p-8">
              <span className="mk-mono text-accent text-xs">{f.n}</span>
              <h3 className="mt-3 text-ink text-lg font-medium">{f.title}</h3>
              <p className="mt-3 text-ink-2 text-sm leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
