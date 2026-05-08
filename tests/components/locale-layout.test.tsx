// Plan 06-01 task 2 — Wave 0 RED gate for DESIGN-02 + DESIGN-03 layout mounts.
//
// Asserts that the locale root layout renders:
//   - <html className="..."> carrying BOTH next/font CSS variables for
//     Inter Tight and JetBrains Mono (D-04, replacing the single Inter font).
//   - <body className="mk"> so D-03 helper classes scope correctly (D-01).
//
// RSC layout test pattern: layout.tsx is `async`, so we await-call it with
// the props it expects, then pass the returned React element to RTL render.
// Every transitive DB/Auth/i18n/Cloudinary surface is mocked at module
// boundary — see tests/components/contact-form.test.tsx (canonical mock
// shape) for the analog.
//
// Today this MUST be RED:
//   - <body> has no `className="mk"` yet (Wave 1 D-01 task adds it).
//   - <html> only carries `--font-sans` from Inter (Wave 1 D-04 swaps to
//     Inter_Tight + JetBrains_Mono variables).

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// --- Module mocks (must come BEFORE module imports) ----------------------

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  hasLocale: () => true,
}));

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getMessages: async () => ({}),
  getTranslations: async () => (k: string) => k,
}));

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

vi.mock('next/font/google', () => ({
  Inter_Tight: () => ({ variable: '__test_inter_tight__', className: '' }),
  JetBrains_Mono: () => ({ variable: '__test_jetbrains_mono__', className: '' }),
  Inter: () => ({ variable: '__test_inter__', className: '' }),
}));

vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }));

vi.mock('@/components/public/site-header', () => ({
  SiteHeader: () => null,
  default: () => null,
}));

vi.mock('@/components/public/site-footer', () => ({
  SiteFooter: () => null,
  default: () => null,
}));

vi.mock('@/lib/jsonld', () => ({ organizationJsonLd: () => ({}) }));
vi.mock('@/lib/metadata', () => ({ buildAlternates: () => ({}) }));
vi.mock('@/env', () => ({ env: {} }));

vi.mock('nuqs/adapters/next/app', () => ({
  NuqsAdapter: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['uz', 'ru', 'en'], defaultLocale: 'uz' },
}));

// --- Imports (after mocks) -----------------------------------------------

import LocaleLayout from '@/app/[locale]/layout';

describe('app/[locale]/layout — DESIGN-02 / DESIGN-03 mounts', () => {
  it('emits <html> with both font CSS variables and <body className="mk">', async () => {
    const element = await LocaleLayout({
      children: React.createElement('div', { 'data-testid': 'kid' }, 'child'),
      params: Promise.resolve({ locale: 'uz' }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { container } = render(element as React.ReactElement);

    // React 19 hoists <html>/<body> to document.documentElement / document.body
    // (RSC document-element behavior). Their className SSRs onto the live
    // jsdom html/body elements rather than into the container tree. Grep
    // BOTH document.documentElement and the rendered container so the test
    // remains tolerant of either render path (current React 19 vs hypothetical
    // future RTL versions that re-introduce the wrapper into container).
    const haystack =
      document.documentElement.outerHTML +
      container.outerHTML +
      container.innerHTML;

    expect(haystack).toContain('__test_inter_tight__');
    expect(haystack).toContain('__test_jetbrains_mono__');

    // <body className="mk"> — D-01. Match either <body class="..mk..">
    // (real body) OR a stripped wrapper that carries className="mk" on the
    // first descendant.
    const hasMkClass = /class(Name)?=["'][^"']*\bmk\b[^"']*["']/.test(haystack);
    expect(hasMkClass).toBe(true);
  });

  it('renders the children prop inside the layout tree', async () => {
    const element = await LocaleLayout({
      children: React.createElement('div', { 'data-testid': 'kid' }, 'child-content'),
      params: Promise.resolve({ locale: 'uz' }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { container } = render(element as React.ReactElement);
    expect(container.innerHTML).toContain('child-content');
  });
});
