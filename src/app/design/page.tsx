import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Gauge } from '@/components/public/gauge';
import { ProductCard } from '@/components/public/product-card';
import { KeyFactsRibbon } from '@/components/public/key-facts-ribbon';

// Phase 6 plan 06-05 — disposable visual smoke route.
// Production-discoverable but unlinked + noindex (RESEARCH Open Question #3).
// Delete in Phase 11 VRT closure.
//
// Lives outside [locale]/ so it does NOT inherit <body className="mk">.
// Wrap manually with <main className="mk"> so D-03 helpers cascade.

export const metadata: Metadata = {
  title: 'Design Smoke — Manometr v1.1 (internal)',
  robots: { index: false, follow: false },
};

// Phase 6 plan 06-05 — Rule-3 deviation auto-fix: wrap data-reading
// children in <Suspense>. /design lives OUTSIDE [locale]/ but renders
// <ProductCard>, whose `<Link>` from `@/i18n/navigation` reads
// request-scoped locale data via next-intl. With Next.js 16 Cache
// Components enabled (next.config), uncached data access during static
// prerender must be wrapped in <Suspense>. `force-dynamic` is not
// compatible with cacheComponents, so we use Suspense boundaries here.

const mockProducts: Array<{
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  heroPublicId: string | null;
  manufacturerName: string | null;
  sku: string | null;
}> = [
  {
    id: 'demo-1',
    name: 'WIKA 232.50 Bourdon-Tube Gauge',
    slug: 'wika-232-50-bourdon',
    shortDesc: 'Stainless 100mm dial, 1/2" NPT, 0–10 MPa',
    heroPublicId: 'demo/wika-232-bourdon',
    manufacturerName: 'WIKA',
    sku: 'WK-232-50',
  },
  {
    id: 'demo-2',
    name: 'AFRISO D4 Diaphragm Pressure Gauge',
    slug: 'afriso-d4-diaphragm',
    shortDesc: 'Korroziyaga chidamli diafragmali manometr, 0–25 bar',
    heroPublicId: null,
    manufacturerName: 'AFRISO',
    sku: 'AF-D4-160',
  },
  {
    id: 'demo-3',
    name: 'Endress+Hauser Cerabar PMP23 Digital Transmitter',
    slug: 'endress-hauser-cerabar-pmp23',
    shortDesc: 'Цифровой датчик давления 4–20 mA, 0–40 бар, IP67',
    heroPublicId: 'demo/eh-cerabar-pmp23',
    manufacturerName: 'Endress+Hauser',
    sku: 'EH-PMP23-A2',
  },
  {
    id: 'demo-4',
    name: 'Rosemount 3051CD Differential Pressure Transmitter',
    slug: 'rosemount-3051cd-differential',
    shortDesc: 'Coplanar DP transmitter, ±0.025% accuracy, HART output',
    heroPublicId: 'demo/rosemount-3051cd',
    manufacturerName: 'Rosemount',
    sku: 'RM-3051CD-1A',
  },
  {
    id: 'demo-5',
    name: 'BD Sensors DMK 331 Capsule Low-Pressure Gauge',
    slug: 'bd-sensors-dmk-331-capsule',
    shortDesc: 'Капсульный манометр для газов низкого давления, 0–600 mbar',
    heroPublicId: null,
    manufacturerName: null,
    sku: 'BD-DMK331-LP',
  },
  {
    id: 'demo-6',
    name: 'Honeywell PX2 Electronic Pressure Switch',
    slug: 'honeywell-px2-pressure-switch',
    shortDesc: 'Programmable electronic switch, 1–250 bar, M12 connector',
    heroPublicId: 'demo/honeywell-px2',
    manufacturerName: 'Honeywell',
    sku: 'HW-PX2-250',
  },
];

// Locale rotation across uz/ru/en for visual variety only — /design is outside
// the next-intl request scope, so these are static literals (matches the prior
// 3-card pattern's hardcoded uz/ru/en triple).
const productLocales: Array<'uz' | 'ru' | 'en'> = ['uz', 'ru', 'en', 'uz', 'ru', 'en'];

const facts3 = [
  { label: 'Range', value: '0–10 MPa' },
  { label: 'Accuracy', value: 'Class 1.0' },
  { label: 'IP Rating', value: 'IP65' },
];

const facts4 = [
  { label: 'Range', value: '0–25 bar' },
  { label: 'Temperature', value: '−40…+85 °C' },
  { label: 'Accuracy', value: 'Class 0.5' },
  { label: 'Connection', value: 'G 1/2"' },
];

const facts6 = [
  { label: 'Range', value: '0–40 bar' },
  { label: 'Temperature', value: '−25…+125 °C' },
  { label: 'Accuracy', value: '±0.025%' },
  { label: 'IP Rating', value: 'IP67' },
  { label: 'Output', value: '4–20 mA HART' },
  { label: 'Material', value: 'Stainless 316L' },
];

export default function DesignSmokePage() {
  return (
    <main className="mk min-h-screen p-12 space-y-12">
      <header className="space-y-2">
        <span className="mk-eyebrow">Internal · Visual smoke</span>
        <h1 className="text-3xl font-semibold text-ink">Phase 6 Design System Smoke</h1>
        <p className="text-ink-2 max-w-2xl">
          Disposable route — confirms .mk tokens, next/font (Inter Tight + JetBrains
          Mono), and the three Phase 6 components render correctly inside the
          design-canvas cascade. Delete in Phase 11.
        </p>
      </header>

      <section className="space-y-4">
        <span className="mk-eyebrow">Gauge — DESIGN-04</span>
        <Gauge size={280} value={6.4} max={10} unit="MPa" label="PRESSURE" danger={8} />
      </section>

      <section className="space-y-4">
        <span className="mk-eyebrow">ProductCard — REUSE-01</span>
        <Suspense fallback={<div className="text-ink-3">Loading product cards…</div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {mockProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={productLocales[idx] ?? 'uz'}
              />
            ))}
          </div>
        </Suspense>
      </section>

      <section className="space-y-4">
        <span className="mk-eyebrow">KeyFactsRibbon — REUSE-02 (3/4/6 variants)</span>
        <KeyFactsRibbon facts={facts3} />
        <KeyFactsRibbon facts={facts4} />
        <KeyFactsRibbon facts={facts6} />
      </section>

      <section className="space-y-4">
        <span className="mk-eyebrow">Helpers — D-03</span>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="mk-btn">Default</button>
          <button type="button" className="mk-btn mk-btn-primary">Primary</button>
          <button type="button" className="mk-btn mk-btn-ghost">Ghost</button>
          <button type="button" className="mk-btn mk-btn-light">Light</button>
          <button type="button" className="mk-btn mk-btn-sm">Small</button>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="mk-tag">Default</span>
          <span className="mk-tag mk-tag-solid">Solid</span>
          <span className="mk-tag mk-tag-accent">Accent</span>
        </div>
      </section>
    </main>
  );
}
