// Plan 06-01 task 3 — Wave 0 RED gate for REUSE-01 ProductCard reskin.
//
// Asserts the post-reskin contract:
//   - The frozen ProductCardProps interface (CONTEXT REUSE-01: props
//     unchanged, only Tailwind classNames change).
//   - The label slot uses .mk-eyebrow (D-03 helper class — replaces the
//     shadcn <Badge variant="outline">).
//   - The placeholder branch renders .mk-ph.mk-ph-corners (replaces the
//     "◯" Unicode glyph).
//   - The rendered HTML contains NO commerce tokens (CLAUDE.md guardrail
//     #3 — Manometr is explicitly not e-commerce; price/qty/cart/order
//     tokens must never reach the catalog grid).
//
// Today this MUST be RED — the existing src/components/public/product-card.tsx
// uses bg-slate-50, text-slate-* classes and a shadcn <Badge>, none of
// which carry .mk-eyebrow or .mk-ph markers. Wave 3 reskin flips it GREEN.

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// --- Module mocks (must come BEFORE module imports) ----------------------

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('next-cloudinary', () => ({
  CldImage: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { 'data-testid': 'cld-image', src, alt }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// --- Imports (after mocks) -----------------------------------------------

import { ProductCard, type ProductCardProps } from '@/components/public/product-card';

const baseProduct: ProductCardProps['product'] = {
  id: 'p1',
  name: 'WIKA 232.50',
  slug: 'wika-232-50',
  shortDesc: 'Bourdon-tube pressure gauge',
  heroPublicId: 'manometr/wika-232-50',
  manufacturerName: 'WIKA',
  sku: 'WK-232-50',
};

describe('ProductCard — REUSE-01 reskin contract', () => {
  it('renders mk-eyebrow class for manufacturer label', () => {
    const { container } = render(<ProductCard product={baseProduct} locale="uz" />);
    expect(container.querySelector('.mk-eyebrow')).not.toBeNull();
  });

  it('renders mk-ph mk-ph-corners placeholder when heroPublicId is null', () => {
    const { container } = render(
      <ProductCard product={{ ...baseProduct, heroPublicId: null }} locale="uz" />,
    );
    expect(container.querySelector('.mk-ph.mk-ph-corners')).not.toBeNull();
  });

  it('renders no commerce tokens in HTML (CLAUDE.md guardrail #3)', () => {
    const { container } = render(<ProductCard product={baseProduct} locale="ru" />);
    const html = container.innerHTML.toLowerCase();
    for (const token of [
      'price',
      ' sum ',
      ' qty',
      'добавить',
      'add to',
      '₽',
      '$',
      'cart',
      'order ',
      'in stock',
    ]) {
      expect(html).not.toContain(token);
    }
  });

  it('keeps the frozen ProductCardProps interface (TS compile-time)', () => {
    const _typed: ProductCardProps = { product: baseProduct, locale: 'en' };
    expect(_typed.product.id).toBe('p1');
  });
});
