---
phase: quick-260509-oha
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/[locale]/page.tsx
  - src/app/[locale]/_components/home-stat-ticker.tsx
  - messages/uz.json
  - messages/ru.json
  - messages/en.json
autonomous: true
requirements:
  - HOME-01
  - HOME-02
  - HOME-03
  - HOME-04
  - HOME-05
  - HOME-06
tags:
  - homepage
  - mock
  - showcase

must_haves:
  truths:
    - "A visitor at /[locale] (uz, ru, en) sees a hero with eyebrow tag, h1 lockup, lede, two CTAs, a 4-stat ticker strip, and the existing <Gauge> SVG"
    - "Hero primary CTA opens the existing Phase-5 contact dialog (ContactButton); hero secondary CTA links to /[locale]/categories"
    - "Below the hero, the visitor sees a 4-column category grid populated with seeded categories from the database, each card linking to /[locale]/categories/<slug>"
    - "Below the category grid, the visitor sees a featured-products band with 4 real <ProductCard> instances pulled from seeded products"
    - "Below featured products, the visitor sees a dark-background Solutions band rendering real seeded industries, each tile linking to /[locale]/industries/<slug>"
    - "Below Solutions, the visitor sees a service strip with exactly 3 trust-fact tiles (calibration / warranty / certification), copy localized per locale"
    - "All copy on the page (eyebrow, h1, lede, CTAs, section titles, trust-fact labels) renders from messages/{uz,ru,en}.json under a new home namespace — no hardcoded English in the markup"
    - "Nowhere on the homepage does the visitor see a price, stock indicator, currency symbol, 'Add to cart', 'Add to order', quantity stepper, or any commerce affordance"
  artifacts:
    - path: "src/app/[locale]/page.tsx"
      provides: "RSC homepage composing hero, category grid, featured products, solutions, service strip"
      min_lines: 200
    - path: "src/app/[locale]/_components/home-stat-ticker.tsx"
      provides: "Client component for the 4-stat strip with mounted-on-load number ticker"
      contains: "'use client'"
    - path: "messages/uz.json"
      provides: "uz translations under new home.* namespace"
      contains: "\"home\""
    - path: "messages/ru.json"
      provides: "ru translations under new home.* namespace"
      contains: "\"home\""
    - path: "messages/en.json"
      provides: "en translations under new home.* namespace"
      contains: "\"home\""
  key_links:
    - from: "src/app/[locale]/page.tsx"
      to: "src/lib/catalog.ts"
      via: "getRootCategories(locale) for category grid"
      pattern: "getRootCategories"
    - from: "src/app/[locale]/page.tsx"
      to: "src/lib/catalog.ts"
      via: "getCategoryProducts(...) for the featured-products band (top 4)"
      pattern: "getCategoryProducts"
    - from: "src/app/[locale]/page.tsx"
      to: "src/lib/industries.ts"
      via: "findPublishedIndustries(locale) for solutions band"
      pattern: "findPublishedIndustries"
    - from: "src/app/[locale]/page.tsx"
      to: "src/components/public/contact-button.tsx"
      via: "Hero primary CTA renders <ContactButton />"
      pattern: "ContactButton"
    - from: "src/app/[locale]/page.tsx"
      to: "src/components/public/gauge.tsx"
      via: "Hero renders <Gauge value={7.4} />"
      pattern: "<Gauge"
    - from: "src/app/[locale]/page.tsx"
      to: "src/components/public/product-card.tsx"
      via: "Featured band maps over top 4 products into <ProductCard />"
      pattern: "<ProductCard"
---

<objective>
Build a single-shot, throwaway, three-locale homepage mock for the upcoming
client showcase. The page assembles the Phase 8 HOME-01..06 visual contract
(hero with Gauge + stats + CTAs, 4-column category grid, featured products band,
dark Solutions band, service strip) using REAL seeded data and the existing
Phase 6 design tokens / reusable components — no new abstractions, no tests,
no Phase 7 chrome touch-ups, no commerce surface anywhere.

Purpose: Give the client a high-fidelity demo of what the homepage will feel
like. Phase 8 will replace this code wholesale; over-engineering is wasted.

Output:
  - Rebuilt src/app/[locale]/page.tsx (RSC, server-side data fetching)
  - One small client island (HomeStatTicker) for the count-up animation
  - 3 updated messages/*.json files with a new `home` namespace
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/ROADMAP.md
@./src/app/[locale]/page.tsx
@./src/app/[locale]/layout.tsx
@./src/lib/catalog.ts
@./src/lib/industries.ts
@./src/components/public/gauge.tsx
@./src/components/public/product-card.tsx
@./src/components/public/key-facts-ribbon.tsx
@./src/components/public/industry-card.tsx
@./src/components/public/contact-button.tsx
@./messages/uz.json
@./messages/ru.json
@./messages/en.json
@./scripts/seed-demo.ts

<interfaces>
<!-- Pre-extracted contracts so the executor does not need to re-read files. -->

src/components/public/gauge.tsx — Gauge (RSC):
```ts
export interface GaugeProps {
  size?: number;        // default 280
  value: number;
  max?: number;         // default 10
  unit?: string;        // default 'MPa'
  label?: string;       // default 'PRESSURE'
  danger?: number;      // default 8
  theme?: 'light' | 'dark';
}
```

src/components/public/product-card.tsx — ProductCard (RSC):
```ts
export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDesc: string | null;
    heroPublicId: string | null;
    manufacturerName: string | null;
    sku: string | null;
  };
  locale: Locale;
}
```
NOTE: ProductCardProps.product matches CategoryRowResult from src/lib/catalog.ts
verbatim — pass rows from getCategoryProducts() directly.

src/components/public/key-facts-ribbon.tsx — KeyFactsRibbon (RSC):
```ts
export interface KeyFact { label: string; value: string; }
// 3 facts -> grid-cols-3, 4 facts -> grid-cols-4
```

src/components/public/industry-card.tsx — IndustryCard (RSC):
```ts
export interface IndustryCardProps {
  industry: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImagePublicId: string | null;
  };
  locale: Locale;
}
```
NOTE: IndustryListItem from src/lib/industries.ts has all required fields plus
publishedAt/updatedAt — destructure or pass directly (excess props are fine).

src/components/public/contact-button.tsx — ContactButton ('use client'):
```ts
export interface ContactButtonProps {
  locale: 'uz' | 'ru' | 'en';
  productContext?: string;
  className?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
}
```
The button label comes from `useTranslations('public.contact').t('cta')` —
override is NOT supported by the current API; for the hero "Request quote"
CTA, use <ContactButton variant="default" size="default" />.
For the secondary "Browse catalog" CTA, render a plain
`<Link href="/categories" locale={locale}>` styled as Button variant="outline".

src/lib/catalog.ts — data helpers (RSC, 'use cache'):
```ts
export type Locale = 'uz' | 'ru' | 'en';
export interface CategoryRowResult { /* matches ProductCardProps.product */ }
export interface CategoryProductsResult { rows: CategoryRowResult[]; total: number; }

export async function getRootCategories(locale: Locale): Promise<
  Array<{ id: string; name: string; slug: string; sortOrder: number }>
>;

export async function getCategoryProducts(
  categoryId: string,
  locale: Locale,
  filters: CategoryFilterValue[],   // pass [] for unfiltered
  page: number,                     // 1-indexed
  pageSize: number,
): Promise<CategoryProductsResult>;
```

src/lib/industries.ts:
```ts
export interface IndustryListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImagePublicId: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}
export async function findPublishedIndustries(locale: Locale): Promise<IndustryListItem[]>;
```

src/i18n/navigation — locale-aware Link:
```ts
import { Link } from '@/i18n/navigation';
// <Link href="/categories" locale={locale}>...</Link>
```

src/lib/metadata:
```ts
export type Locale = 'uz' | 'ru' | 'en';
```

Phase 6 design tokens (already in src/app/globals.css):
  - bg `#f5f3ee` (Tailwind alias: bg-surface)
  - ink `#14161b` (alias: text-ink)
  - ink-2 / ink-3 dimmer text aliases
  - line — hairline border alias (1px ink-fade)
  - accent `#1240e5`
  - .mk-eyebrow — mono / 11px / uppercase / 0.14em letter-spacing
  - .mk-mono — JetBrains Mono helper
  - .mk-ph .mk-ph-corners — placeholder cross-hatch

Seed data note (per scripts/seed-demo.ts):
  - 4 categories present in uz only: manometrlar, diferensial-manometrlar,
    bosim-datchiklari, bosim-relayalari
  - 12 products tagged sku LIKE 'DEMO-%', uz translations only
  - Industries: NOT seeded by seed-demo.ts. findPublishedIndustries(locale)
    may legitimately return [] — the page MUST gracefully render the
    Solutions band even when the industries array is empty (see Task 1
    fallback rule).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace homepage with full Phase-8 mock layout</name>
  <files>
    src/app/[locale]/page.tsx,
    src/app/[locale]/_components/home-stat-ticker.tsx
  </files>
  <action>
    Rebuild `src/app/[locale]/page.tsx` as a pure RSC that fetches seeded
    data server-side and composes the 5 sections from HOME-01..06. Keep the
    existing `generateMetadata` export untouched (signature, alternates).
    Add `export const revalidate = 60;` at the top of the file — this is a
    throwaway mock; ISR with 60s window is fine and avoids `unstable_cache`
    plumbing.

    Imports the page must add (use exactly these paths):
      import { setRequestLocale, getTranslations } from 'next-intl/server';
      import type { Metadata } from 'next';
      import { Link } from '@/i18n/navigation';
      import { CldImage } from 'next-cloudinary';
      import { Gauge } from '@/components/public/gauge';
      import { ProductCard } from '@/components/public/product-card';
      import { IndustryCard } from '@/components/public/industry-card';
      import { ContactButton } from '@/components/public/contact-button';
      import {
        getRootCategories,
        getCategoryProducts,
      } from '@/lib/catalog';
      import { findPublishedIndustries } from '@/lib/industries';
      import { buildAlternates, type Locale } from '@/lib/metadata';
      import { Button } from '@/components/ui/button';
      import { HomeStatTicker } from './_components/home-stat-ticker';

    Server-side data flow (inside `HomePage`, after `setRequestLocale`):
      const t = await getTranslations({ locale, namespace: 'home' });
      const rootCategories = await getRootCategories(locale as Locale);
      const industries = await findPublishedIndustries(locale as Locale);

      // Featured products: pull top 4 from the FIRST root category.
      // If no categories seeded yet, fall back to [].
      let featured: CategoryRowResult[] = [];
      if (rootCategories.length > 0) {
        const first = rootCategories[0];
        const result = await getCategoryProducts(first.id, locale as Locale, [], 1, 4);
        featured = result.rows;
      }

    Section 1 — HERO (HOME-01). Layout: 12-col grid on lg+, 2/3 text + 1/3 gauge.
      - Background: bg-surface (Phase 6 token).
      - Eyebrow tag: <span className="mk-eyebrow">{t('hero.eyebrow')}</span>
      - h1: 2-line lockup, font-semibold, text-ink, tracking-tight, text-5xl on lg.
        Use t('hero.titleLine1') and t('hero.titleLine2') as two stacked spans.
      - Lede: max-w-prose, text-ink-2, text-base, mt-4. t('hero.lede').
      - CTAs row (mt-8, flex gap-3):
          <ContactButton locale={locale as Locale} variant="default" size="default" />
          <Link href="/categories" locale={locale as Locale} className="...">
            <Button variant="outline" size="default">{t('hero.ctaBrowse')}</Button>
          </Link>
      - Stat strip (mt-10): render <HomeStatTicker locale={locale as Locale} />.
        Pass an array of 4 stat tuples sourced from the home.stats.* keys
        (label1/value1, label2/value2, label3/value3, label4/value4). Pass
        `value` as a number (parse from translation as Number(...)) and
        `suffix`/`label` as strings — see Task 2 ticker contract.
      - Gauge column: <Gauge value={7.4} max={10} unit="MPa" label={t('hero.gaugeLabel')} />
        Wrap in a div with relative positioning; place 3 absolute-positioned
        callout pills (<span className="mk-mono ...">) around the gauge using
        t('hero.callout1'), callout2, callout3. Lines connecting callouts to
        the gauge can be omitted — too fiddly for throwaway. The pills should
        sit at top-right, mid-left, and bottom-right of the gauge with
        ring-1 ring-line bg-surface px-2 py-1 text-[11px].

    Section 2 — CATEGORY GRID (HOME-02). Wrapper: <section> with mt-24, mb-24,
    container mx-auto px-6 max-w-7xl.
      - Section header row: eyebrow ("CATALOG" via t('categories.eyebrow')),
        h2 t('categories.title'), and a "View all categories →" anchor on
        the right that links via Link to "/categories".
      - Grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0
        border-l border-t border-line` (hairline grid frame).
      - For each category in rootCategories, render a card cell with:
          className="group relative aspect-[4/3] border-r border-b border-line
                     p-5 flex flex-col justify-between bg-surface hover:bg-white
                     transition-colors"
        Inside:
          - top-left: number badge (mk-mono text-ink-3 text-xs)
            showing index padded `String(idx+1).padStart(2,'0')`
          - top-right: count badge "{count} pcs" — for THIS mock just
            hardcode "12+" since we don't have a per-category product count
            helper handy. (Note in code comment: throwaway; Phase 8 will use
            a real count.)
          - bottom: h3 with category.name, then a tiny mk-eyebrow caption
            t('categories.cardCaption').
          - Wrap the WHOLE cell with <Link href={`/categories/${category.slug}`}
            locale={locale as Locale} className="absolute inset-0" aria-label={category.name} />
            so the entire card is clickable.
      - To approximate "12 categories" when only 4 are seeded, render the
        cards we have. Phase 8 will fill the grid; for the showcase, 4 real
        + 8 placeholder cells. Add 8 placeholder cells AFTER the real ones
        with className="...mk-ph mk-ph-corners" and the t('categories.placeholder')
        label so the grid visually completes a 4×3.

    Section 3 — FEATURED PRODUCTS (HOME-03). Wrapper: container mx-auto px-6
    max-w-7xl mt-24 mb-24.
      - Section header same pattern: eyebrow + h2 + "View catalog" link.
      - Filter pills row (mt-6, flex gap-2 flex-wrap): render 5 pills
        derived from t('featured.pillAll') + the first 4 rootCategory names.
        These are <span> chips (NOT links — visually correct, throwaway
        interactivity is acceptable per constraints). Active pill = first
        ("All") with bg-ink text-surface; rest with ring-1 ring-line text-ink-2.
      - Product grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6`.
        Map `featured` to <ProductCard product={p} locale={locale as Locale} key={p.id} />.
        If `featured.length === 0`, render a single full-width placeholder div
        with className="mk-ph mk-ph-corners h-64 ..." showing
        t('featured.empty').

    Section 4 — SOLUTIONS BAND (HOME-04). Dark variant.
      - <section className="mt-24 bg-ink text-surface py-20"> (full bleed,
        no container on the section itself; inner container mx-auto max-w-7xl px-6).
      - Header row (eyebrow + h2 + lede) — eyebrow uses .mk-eyebrow but in
        the dark band it should be light: add className="mk-eyebrow text-surface/60".
        h2 text-surface, lede text-surface/70 max-w-2xl.
      - Industries grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10`.
        For each industry in `industries.slice(0, 6)`, render a tile with:
          - Wrapper: <Link href={`/industries/${ind.slug}`} locale={locale as Locale}
              className="group block rounded-lg ring-1 ring-surface/20 p-6
              hover:ring-surface/40 transition" />
          - Inside: index "01"/"02"/... in mk-mono text-surface/40 text-xs,
            then h3 industry.title text-surface mt-3, then excerpt
            (line-clamp-2) text-surface/60 mt-2, then an arrow row at the
            bottom: <span className="mk-mono text-xs text-accent mt-6 inline-block">
              {t('solutions.cta')} →</span>
          - DO NOT pass through to <IndustryCard /> — that component is
            light-themed (bg-slate-50). The dark band needs custom inline JSX.
        If `industries.length === 0`, render 4 placeholder tiles using
        t('solutions.placeholderTitles') — declare the placeholder titles
        in messages as a single concatenated string per locale and split by
        '|' in the page (keeps messages structure flat). Each placeholder
        tile uses the same dark styling minus the link (plain <div>).

    Section 5 — SERVICE STRIP (HOME-05). Container mx-auto max-w-7xl px-6 mt-24 mb-32.
      - Header: small eyebrow t('service.eyebrow'), h2 t('service.title').
      - 3-col grid: `grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line mt-8`
        (the gap-px + bg-line trick gives hairline dividers between cells
        without per-cell border math). Inner cells use bg-surface p-8.
      - Each cell: a number ("01"/"02"/"03") in mk-mono text-accent text-xs,
        then h3 t(`service.fact${n}.title`), then a short paragraph
        t(`service.fact${n}.body`). Three facts: calibration, warranty,
        certification (in that order).

    GUARDRAILS (CLAUDE.md):
      - NO price, currency symbol, "buy", "cart", "order", "stock", "qty"
        anywhere in markup or messages.
      - All user-facing text via t(...). The only literal strings allowed
        in JSX are placeholder padding numerals ("01", "02"), the gauge
        value, "12+" badge text, mk-mono visual numerals ("0", "10"), and
        ARIA labels derived from data.

    Then create `src/app/[locale]/_components/home-stat-ticker.tsx` as a
    minimal client component:

      'use client';
      import * as React from 'react';

      export interface HomeStatTickerProps {
        stats: Array<{ label: string; value: number; suffix?: string }>;
      }

      export function HomeStatTicker({ stats }: HomeStatTickerProps) {
        // Mounted-on-load count-up: each stat eases from 0 -> value over 1200ms.
        // Pure CSS would be cleaner but throwaway; rAF is fine.
        const [vals, setVals] = React.useState<number[]>(
          () => stats.map(() => 0),
        );
        React.useEffect(() => {
          const start = performance.now();
          const dur = 1200;
          let raf = 0;
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setVals(stats.map((s) => Math.round(s.value * eased)));
            if (t < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          return () => cancelAnimationFrame(raf);
        }, [stats]);

        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="home-stat-ticker">
            {stats.map((s, i) => (
              <div key={s.label} className="rounded-lg border border-line bg-surface px-4 py-3">
                <div className="mk-eyebrow">{s.label}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-ink mk-mono">
                  {vals[i]}{s.suffix ?? ''}
                </div>
              </div>
            ))}
          </div>
        );
      }

    The page (RSC) calls <HomeStatTicker stats={[...]} /> with values parsed
    from the home.stats translation keys. Translations expose value as a
    string (e.g. "12") and suffix separately ("+", "%", "/7"); page code
    does Number(t('stats.value1')) before passing in.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <done>
    `pnpm tsc --noEmit` exits 0. The page file imports compile clean against
    real exports of catalog.ts, industries.ts, gauge.tsx, product-card.tsx,
    industry-card.tsx (unused — see action), contact-button.tsx, and the new
    home-stat-ticker.tsx. No price/cart/order tokens appear in either file.
    `grep -nE "price|cart|qty|stock|currency|сум|sum|so'm|UZS|RUB|USD" src/app/[locale]/page.tsx src/app/[locale]/_components/home-stat-ticker.tsx | grep -v '^#'`
    returns no commerce hits.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add home.* translation namespace to all three locales</name>
  <files>messages/uz.json, messages/ru.json, messages/en.json</files>
  <action>
    Add a new top-level `home` key to each of the three message files. Insert
    it as a sibling to the existing top-level keys (`common`, `auth`, `admin`,
    `public`) — preserve all existing keys verbatim. Use the same JSON
    structure across all three locales (identical key tree, locale-translated
    values).

    The full home namespace (mirror keys exactly across uz/ru/en):

    {
      "home": {
        "hero": {
          "eyebrow": "<eyebrow tag, e.g. 'INDUSTRIAL PRESSURE INSTRUMENTATION'>",
          "titleLine1": "<half 1 of h1 lockup>",
          "titleLine2": "<half 2 of h1 lockup>",
          "lede": "<2-3 sentence positioning paragraph>",
          "ctaBrowse": "<button label for 'Browse catalog'>",
          "gaugeLabel": "PRESSURE",
          "callout1": "<short technical note, e.g. 'Class 1.0'>",
          "callout2": "<short technical note, e.g. '0–10 MPa'>",
          "callout3": "<short technical note, e.g. 'IP65'>",
          "stats": {
            "label1": "Products in catalog",
            "value1": "240",
            "suffix1": "+",
            "label2": "Industries served",
            "value2": "18",
            "suffix2": "",
            "label3": "Years on market",
            "value3": "12",
            "suffix3": "",
            "label4": "Support window",
            "value4": "24",
            "suffix4": "/7"
          }
        },
        "categories": {
          "eyebrow": "CATALOG",
          "title": "<section h2, e.g. 'Browse the catalog'>",
          "cardCaption": "<small label under each card title, e.g. 'View products →'>",
          "viewAll": "<right-aligned link, e.g. 'View all categories →'>",
          "placeholder": "<placeholder cell label, e.g. 'Coming soon'>"
        },
        "featured": {
          "eyebrow": "FEATURED",
          "title": "<section h2, e.g. 'Selected products'>",
          "viewAll": "<right-aligned link>",
          "pillAll": "All",
          "empty": "<empty-state copy>"
        },
        "solutions": {
          "eyebrow": "SOLUTIONS",
          "title": "<section h2 in dark band, e.g. 'Industries we serve'>",
          "lede": "<dark-band lede sentence>",
          "cta": "<tile cta label, e.g. 'Recommended instruments'>",
          "placeholderTitles": "Oil & gas|Chemical processing|Energy|Water treatment"
        },
        "service": {
          "eyebrow": "SERVICE",
          "title": "<section h2, e.g. 'Why specifying engineers choose us'>",
          "fact1": {
            "title": "<calibration trust fact title>",
            "body": "<1-2 sentences>"
          },
          "fact2": {
            "title": "<warranty trust fact title>",
            "body": "<1-2 sentences>"
          },
          "fact3": {
            "title": "<certification trust fact title>",
            "body": "<1-2 sentences>"
          }
        }
      }
    }

    Locale-specific content guidance:

    UZ (primary audience — invest the most time here, idiomatic Uzbek-Latin
    with proper oʻ/gʻ, professional B2B tone):
      - hero.eyebrow: "SANOAT BOSIM ASBOBLARI"
      - hero.titleLine1: "Muhandislar uchun"
      - hero.titleLine2: "to'liq texnik ma'lumot"
      - hero.lede: short paragraph, ~30 words: positions Manometr as the
        authoritative source for manometr/datchik/relayalar specs.
      - hero.ctaBrowse: "Katalogni ochish"
      - solutions.placeholderTitles: "Neft va gaz|Kimyo|Energetika|Suv tayyorlash"
      - service.fact1.title: "Kalibrlash" + "Akkreditlangan laboratoriya..." body
      - service.fact2.title: "Kafolat" + 24 oy warranty body
      - service.fact3.title: "Sertifikatlar" + "ISO 9001 / GOST R / EAC / O'zStandart"

    RU (professional industry tone, Cyrillic):
      - hero.eyebrow: "ПРОМЫШЛЕННЫЕ ПРИБОРЫ ДАВЛЕНИЯ"
      - hero.titleLine1: "Полный справочник"
      - hero.titleLine2: "для специалистов"
      - hero.ctaBrowse: "Открыть каталог"
      - solutions.placeholderTitles: "Нефть и газ|Химия|Энергетика|Водоподготовка"
      - service.fact1.title: "Калибровка"
      - service.fact2.title: "Гарантия"
      - service.fact3.title: "Сертификаты"

    EN (serviceable English, B2B engineering register):
      - hero.eyebrow: "INDUSTRIAL PRESSURE INSTRUMENTATION"
      - hero.titleLine1: "The technical reference"
      - hero.titleLine2: "for specifying engineers"
      - hero.ctaBrowse: "Browse catalog"
      - solutions.placeholderTitles: "Oil & gas|Chemical processing|Energy|Water treatment"
      - service.fact1.title: "Calibration"
      - service.fact2.title: "Warranty"
      - service.fact3.title: "Certification"

    The CTA rule from the task brief: hero.ctaBrowse is "Open catalog" /
    "Открыть каталог" / "Katalogni ochish". The "Request quote" primary CTA
    text comes from the EXISTING `public.contact.cta` key (already present
    in all three message files) because <ContactButton /> reads it
    internally — DO NOT add a duplicate "request quote" key under home.

    All three files must remain valid JSON (no trailing commas, double-quoted
    keys + values, identical structure). Do not reorder existing keys.
  </action>
  <verify>
    <automated>node -e "['uz','ru','en'].forEach(l => { const j = require('./messages/' + l + '.json'); if (!j.home || !j.home.hero || !j.home.categories || !j.home.featured || !j.home.solutions || !j.home.service) { console.error('missing home keys in', l); process.exit(1); } if (!j.home.hero.stats || !j.home.hero.stats.value1) { console.error('missing stats in', l); process.exit(1); } console.log(l, 'ok'); })"</automated>
  </verify>
  <done>
    All three messages/{uz,ru,en}.json files parse as valid JSON, have a
    top-level `home` key with the full subtree (hero, categories, featured,
    solutions, service), and the existing namespaces (`common`, `auth`,
    `admin`, `public`) are unchanged. The verify command exits 0 and prints
    "uz ok / ru ok / en ok".
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual sign-off on /[locale] homepage mock for all three locales</name>
  <what-built>
    A complete, throwaway homepage mock at /[locale] composing hero
    (with Gauge + count-up stat strip), category grid (real seeded data +
    placeholder fill to a 4×3), featured products band (4 real products),
    dark Solutions band (industries or placeholder titles), and a 3-tile
    service strip — across uz, ru, en. ContactButton wired in hero.
  </what-built>
  <how-to-verify>
    1. Run `pnpm dev` (or push to Vercel preview if mid-CI) and open:
       - http://localhost:3000/uz
       - http://localhost:3000/ru
       - http://localhost:3000/en
       at 1440px desktop width.
    2. For EACH locale, confirm:
       a. Hero shows eyebrow, two-line h1, lede, two CTAs side-by-side, the
          4-stat strip (numbers animate from 0 on load), and the Gauge SVG
          with 3 callout pills around it.
       b. Clicking the primary CTA opens the contact dialog (Phase 5 modal).
       c. Clicking "Browse catalog" navigates to /[locale]/categories.
       d. Category grid renders a 4-col × 3-row hairline grid; the first 4
          cells show real category names (in uz at least — ru/en will fall
          back); cells 5–12 show "Coming soon"-style placeholders with the
          mk-ph cross-hatch.
       e. Each real category card link navigates to /[locale]/categories/<slug>.
       f. Featured band shows 4 ProductCards with images (or placeholder
          chrome) + 5 filter pills (visual only, do not have to be clickable).
       g. Solutions band has a dark background; tiles show industry titles
          (or 4 placeholder titles if no industries seeded). Hovering a tile
          changes the ring opacity.
       h. Service strip shows 3 trust facts in a row with hairline dividers
          (calibration / warranty / certification).
       i. Nowhere on the page: price, currency symbol, stock count, "Add",
          "Buy", "Cart", "Order".
       j. Page background is `#f5f3ee`, body text is `#14161b`, CTAs and
          accent strokes use `#1240e5`.
    3. Resize the browser to 768px and 375px and confirm the layout
       gracefully collapses (category grid -> 2 cols, then 1; product
       grid -> 2 cols, then 1; service strip -> stack).
    4. Open browser DevTools console — confirm zero red errors.

    If any locale shows missing translation strings (e.g. "home.hero.title"
    rendered literally), that's a Task 2 bug — fail the checkpoint.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues per locale</resume-signal>
</task>

</tasks>

<verification>
- `pnpm tsc --noEmit` exits 0 after both auto tasks
- `node -e "..."` JSON shape verifier (Task 2 verify) exits 0 for all three locales
- Manual: human checkpoint passes for uz/ru/en at 1440px and at 375px
- No grep hit for commerce tokens in src/app/[locale]/page.tsx or _components/home-stat-ticker.tsx
- Visiting /uz, /ru, /en in dev shows zero console errors and no missing-translation literal strings
</verification>

<success_criteria>
- src/app/[locale]/page.tsx is rebuilt and renders the 5 sections (hero, category grid, featured products, solutions band, service strip) using getRootCategories / getCategoryProducts / findPublishedIndustries
- The Phase-6 reusable components Gauge, ProductCard, ContactButton are imported from src/components/public/* — no duplicates created
- HomeStatTicker is the only new component, lives in _components/, is a client island, and uses requestAnimationFrame to ease the 4 stats from 0 to their target values once on mount
- All user-facing strings come from messages/{uz,ru,en}.json under a new `home` namespace with identical key shape across the three files
- Hero primary CTA reuses the Phase-5 ContactButton (Phase-5 contact dialog, including server action wiring, Turnstile, audit, Resend — untouched)
- No commerce affordances (price, currency, cart, order, stock, qty) appear anywhere in the new code or new translations
- All three locales render without literal "missing key" strings; visual sign-off passes at 1440px desktop on Vercel preview
- Phase 6 design tokens (bg-surface / text-ink / text-ink-2 / border-line / accent #1240e5 / .mk-eyebrow / .mk-mono) are used directly — no new CSS variables introduced
</success_criteria>

<output>
After completion, create `.planning/quick/260509-oha-full-phase-8-homepage-mock-for-client-sh/260509-oha-SUMMARY.md`
documenting: (a) the new home.* namespace tree, (b) why HomeStatTicker is the
only new component, (c) the placeholder-fill rule (4 real + 8 placeholder
category cells, 6 industries or 4 placeholder solution titles), (d) the
explicit caveat that this entire page is throwaway and will be deleted by
Phase 8 plan 08-HOME-*.
</output>
