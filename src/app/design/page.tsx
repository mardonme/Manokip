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

const mockProduct = {
  id: 'demo-1',
  name: 'WIKA 232.50 Bourdon-Tube Gauge',
  slug: 'wika-232-50',
  shortDesc: 'Stainless 100mm dial, 1/2" NPT, 0–10 MPa',
  heroPublicId: null,
  manufacturerName: 'WIKA',
  sku: 'WK-232-50',
};

const facts3 = [
  { label: 'Range', value: '0–10 MPa' },
  { label: 'Dial', value: 'Ø100 mm' },
  { label: 'Class', value: '1.0' },
];

const facts4 = [
  { label: 'Range', value: '0–10 MPa' },
  { label: 'Dial', value: 'Ø100 mm' },
  { label: 'Class', value: '1.0' },
  { label: 'Connection', value: '1/2" NPT' },
];

const facts6 = [
  { label: 'Range', value: '0–10 MPa' },
  { label: 'Dial', value: 'Ø100 mm' },
  { label: 'Class', value: '1.0' },
  { label: 'Connection', value: '1/2" NPT' },
  { label: 'Material', value: 'Stainless' },
  { label: 'Output', value: '4–20 mA' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          <ProductCard product={mockProduct} locale="uz" />
          <ProductCard product={{ ...mockProduct, id: 'demo-2', heroPublicId: 'demo/manometer' }} locale="ru" />
          <ProductCard product={{ ...mockProduct, id: 'demo-3', manufacturerName: null }} locale="en" />
        </div>
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
