# Phase 06: Design System Foundation + Refactor — Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 14 (5 create-test + 1 create-component + 1 create-refactor-move + 1 optional-route + 6 modify)
**Analogs found:** 13 / 14 (1 partial — no existing RSC `renderToString` test; closest analog is jsdom mocked-mounting pattern + file-as-text grep pattern)

---

## CRITICAL PATH-CONVENTION FINDING

The CONTEXT/VALIDATION docs specify Wave 0 test paths under `src/app/__tests__/` and `src/components/public/__tests__/`. **The repo's actual test convention is `tests/` at project root**, configured in `vitest.config.ts` (Vitest projects: `node` covers `tests/**/*.test.ts`; `dom` covers `tests/components/**/*.test.tsx`). All 8 existing component tests live in `tests/components/`; all unit tests live in `tests/unit/` and `tests/lib/`. There is NO `__tests__` directory anywhere in `src/`.

**Planner action required:** decide whether to (a) honor the documented `src/...__tests__/` paths and update `vitest.config.ts` to add those globs, OR (b) re-locate the Wave 0 tests under the existing `tests/` convention (recommended — zero config change, matches every existing analog). All pattern excerpts below assume option (b) by default; substitute paths if (a) is chosen.

| CONTEXT-stated path | Recommended actual path |
|---------------------|--------------------------|
| `src/app/__tests__/globals-tokens.test.ts` | `tests/unit/globals-tokens.test.ts` |
| `src/app/[locale]/__tests__/layout.test.tsx` | `tests/components/locale-layout.test.tsx` |
| `src/components/public/__tests__/gauge.test.tsx` | `tests/components/gauge.test.tsx` |
| `src/components/public/__tests__/key-facts-ribbon.test.tsx` | `tests/components/key-facts-ribbon.test.tsx` |
| `src/components/public/__tests__/product-card.test.tsx` | `tests/components/product-card.test.tsx` |

The "REPLACE existing slate-themed test" phrasing in VALIDATION 06-W0-04 is misleading — there is no existing `product-card.test.tsx` in the repo at all (only `tests/components/{contact-form,contact-button,login-form,media-uploader,recipe-form,linked-products-picker,industry-form,data-table}.test.tsx`). This is a CREATE, not a REPLACE.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tests/unit/globals-tokens.test.ts` (was `src/app/__tests__/...`) | test (file-as-text grep) | batch | `tests/unit/env-validation.test.ts` | exact (same file-as-text + readFileSync pattern) |
| `tests/components/locale-layout.test.tsx` (was `src/app/[locale]/__tests__/layout.test.tsx`) | test (RSC snapshot via RTL) | request-response | `tests/components/contact-form.test.tsx` | role-match (same mocked-deps + jsdom render shape; no existing renderToString) |
| `tests/components/gauge.test.tsx` (was `src/components/public/__tests__/...`) | test (RTL render) | request-response | `tests/components/login-form.test.tsx` | exact (RTL + describe + getByTestId pattern) |
| `tests/components/key-facts-ribbon.test.tsx` (was `src/components/public/__tests__/...`) | test (RTL render) | request-response | `tests/components/login-form.test.tsx` | exact |
| `tests/components/product-card.test.tsx` (was `src/components/public/__tests__/...`) | test (RTL render + commerce-strip grep) | request-response | `tests/components/contact-form.test.tsx` | exact (next-intl mock + RTL render + DOM assertion patterns) |
| `src/components/public/gauge.tsx` | component (RSC, pure SVG) | request-response | `src/components/public/key-facts-ribbon.tsx` | role-match (pure RSC, no `'use client'`, props-driven SVG/grid) |
| `src/proxy.ts` (NEW location, copy from root) | edge proxy | request-response | `proxy.ts` (root, current location pre-stash) | exact (same file, only relocated) |
| `src/app/design/page.tsx` (optional smoke route) | page (RSC) | request-response | `src/app/[locale]/layout.tsx` (RSC patterns) + `src/components/public/key-facts-ribbon.tsx` | role-match |
| `src/app/globals.css` (MODIFY) | tokens (Tailwind v4 `@theme inline`) | config | the existing `@theme inline` + `:root` block in `src/app/globals.css` itself | exact (in-file analog) |
| `src/app/[locale]/layout.tsx` (MODIFY) | layout (RSC) | request-response | the existing `Inter` + `next/font/google` block in this same file | exact (in-file analog) |
| `src/components/public/product-card.tsx` (MODIFY: reskin) | component (RSC) | request-response | `idea/design-canvas.jsx` (visual target) + current `product-card.tsx` (props/structure invariant) | exact |
| `src/components/public/key-facts-ribbon.tsx` (MODIFY: reskin) | component (RSC) | request-response | `idea/design-canvas.jsx` (visual target) + current `key-facts-ribbon.tsx` (interface invariant) | exact |
| `tests/e2e/contact-glyph-render.spec.ts` (EXTEND) | e2e (Playwright) | request-response | `tests/e2e/glyph-render.spec.ts` (current shape) | exact (the file IS the analog — extend in place) |
| `src/env.ts` (MODIFY: stash apply) | config (t3-env) | config | `src/env.ts` (current) + stash@{0} diff | exact (mechanical apply) |
| `src/components/public/contact-form.tsx` (MODIFY: stash apply) | component (client) | request-response | `src/components/public/contact-form.tsx` (current) + stash@{0} diff | exact |

---

## Pattern Assignments

### `tests/unit/globals-tokens.test.ts` (test, file-as-text grep)

- **Role:** unit test (presence + uniqueness of CSS tokens & helper-class selectors in `src/app/globals.css`)
- **Closest analog:** `tests/unit/env-validation.test.ts` (lines 1-37)
- **Why this analog:** Only existing test in the repo that loads a source file via `readFileSync` and asserts string presence using regex — exactly the pattern the validation gate requires.
- **Code excerpt to mirror** (lines 1-9, 27-36):
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { readFileSync } from 'node:fs';
  import { resolve } from 'node:path';

  describe('env-validation — FOUND-04 + T-SEC-ENV', () => {
    it('src/env.ts defines CLOUDINARY_API_SECRET only in server: block', () => {
      const envFile = readFileSync(resolve(process.cwd(), 'src/env.ts'), 'utf8');
      const serverBlock = envFile.match(/server:\s*{[\s\S]*?},\s*client:/)?.[0] ?? '';
      const clientBlock = envFile.match(/client:\s*{[\s\S]*?},\s*runtimeEnv:/)?.[0] ?? '';
      expect(serverBlock).toMatch(/CLOUDINARY_API_SECRET/);
      expect(clientBlock).not.toMatch(/CLOUDINARY_API_SECRET/);
    });
  });
  ```
- **Adaptation notes:**
  - `readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')` once per `describe`.
  - Iterate over the 14 D-02 token names (`--bg`, `--bg-2`, `--surface`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--line`, `--line-2`, `--line-soft`, `--accent`, `--accent-soft`, `--accent-ink`, `--warn`, `--ok`) — assert `globalsCss.includes('--bg:')` etc. and uniqueness via split-and-count.
  - Iterate over the 12 D-03 helper class selectors (`.mk`, `.mk-mono`, `.mk-eyebrow`, `.mk-btn`, `.mk-btn-primary`, `.mk-btn-ghost`, `.mk-btn-light`, `.mk-btn-sm`, `.mk-tag`, `.mk-tag-solid`, `.mk-tag-accent`, `.mk-ph`, `.mk-ph-corners`).
  - Also assert `--color-mk-accent` present in `@theme inline` block (Pitfall #3 from RESEARCH — namespace prefix to avoid shadcn collision).
  - `node` vitest project (env-validation.test.ts is already in this project), so no jsdom needed.

---

### `tests/components/locale-layout.test.tsx` (test, RSC snapshot via RTL)

- **Role:** unit test (assert `<html className="...font-inter-tight...font-jetbrains-mono...">` and `<body className="mk">`)
- **Closest analog:** `tests/components/contact-form.test.tsx` (lines 26-74) — the canonical mocked-deps pattern in this repo.
- **Why this analog:** No existing test uses `renderToString` for an RSC layout, but `contact-form.test.tsx` is the only test that mocks the same dependency surface (`next-intl`, `next/navigation`, `@/env`) the layout test will need. The Phase-3/5 mocking shape is identical.
- **Code excerpt to mirror** (lines 26-58):
  ```typescript
  import * as React from 'react';
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { render, cleanup } from '@testing-library/react';

  // --- Module mocks (must come BEFORE module imports) ----------------------
  vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
    hasLocale: () => true,
  }));
  vi.mock('next-intl/server', () => ({
    setRequestLocale: vi.fn(),
  }));
  vi.mock('next/navigation', () => ({
    notFound: vi.fn(),
  }));

  // --- Imports (after mocks) -----------------------------------------------
  import LocaleLayout from '@/app/[locale]/layout';
  ```
- **Adaptation notes:**
  - Layout is an `async` Server Component — call `await LocaleLayout({ children: <div data-testid="kid" />, params: Promise.resolve({ locale: 'uz' }) })` to obtain the React element synchronously, then pass to `render(...)` from RTL. (Avoids `renderToString` import; RTL's `render` is sufficient because all client-y wrappers are mocked above.)
  - Mock `@vercel/analytics/next` and `@vercel/speed-insights/next` to no-op components — they hit `window` APIs and pollute jsdom output.
  - Mock `@/components/public/site-header` to return `null` so the test doesn't transitively pull in DB/Auth.js code.
  - Mock `@/lib/jsonld` `organizationJsonLd` to return `{}`; mock `@/lib/metadata` `buildAlternates` to return `{}`.
  - Mock `next/font/google` `Inter`, `Inter_Tight`, `JetBrains_Mono` → return `{ variable: '__test_${name}__', className: '' }` so the assertion can match the variable strings on `<html>`.
  - `dom` vitest project (jsdom). Set `name: 'dom'` matches existing `tests/components/**/*.test.tsx` glob.

---

### `tests/components/gauge.test.tsx` (test, RTL render of pure SVG)

- **Role:** unit test (assert SVG viewBox, ≥11 major-tick `<line>` elements, `<path>` danger arc, needle line)
- **Closest analog:** `tests/components/login-form.test.tsx` (lines 17-72)
- **Why this analog:** Cleanest RTL render in the repo for a component without external mocks beyond a single shadcn/Auth dependency — Gauge is even simpler (zero external deps; pure SVG props).
- **Code excerpt to mirror** (lines 20-50):
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { LoginForm } from '@/app/[locale]/login/login-form';

  describe('LoginForm useActionState states', () => {
    it('renders email input + submit button in the idle state', () => {
      render(<LoginForm locale="uz" labels={labels} />);
      expect(screen.getByTestId('login-email')).toBeDefined();
      expect(screen.getByText('Send magic link')).toBeDefined();
    });
  });
  ```
- **Adaptation notes:**
  - No mocks needed — Gauge is RSC-safe pure SVG.
  - Render `<Gauge size={280} value={5} max={10} unit="MPa" label="PRESSURE" />`.
  - Use `container.querySelector('svg')` and `container.querySelectorAll('line')` for assertions — RTL's `screen.getByTestId` works only if the impl adds `data-testid="gauge-svg"` on the root `<svg>`; planner should require this attribute on the new component.
  - Assert: `svg.getAttribute('viewBox') === '0 0 280 280'`; `lines.length >= 11` major ticks (the `idea/gauge.jsx` impl emits 11 major + 40 minor); ≥1 `<path>` (danger arc); a needle `<line>` distinguishable by `stroke="#1240e5"` + `stroke-width` proportional to `size`.
  - Place under `tests/components/` so the `dom` (jsdom) Vitest project picks it up.

---

### `tests/components/key-facts-ribbon.test.tsx` (test, RTL render of grid variants)

- **Role:** unit test (3/4/6-fact arrays produce correct `grid-cols-*` class)
- **Closest analog:** `tests/components/login-form.test.tsx` + the existing `KeyFactsRibbon` impl in `src/components/public/key-facts-ribbon.tsx`
- **Why this analog:** Same RTL no-mock posture; component already shipped with `data-testid="key-facts-ribbon"` (line 22) so a `getByTestId` lookup works out of the box.
- **Code excerpt to mirror** (existing `key-facts-ribbon.tsx` lines 16-22 — the testid hook):
  ```typescript
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      data-testid="key-facts-ribbon"
    >
  ```
  RTL pattern from `login-form.test.tsx`:
  ```typescript
  it('renders 6-tile grid for 6 facts', () => {
    render(<KeyFactsRibbon facts={[/* 6 entries */]} />);
    const wrapper = screen.getByTestId('key-facts-ribbon');
    expect(wrapper.className).toContain('lg:grid-cols-6');
  });
  ```
- **Adaptation notes:**
  - Three `it` blocks: facts.length 3 → `lg:grid-cols-3`; 4 → `lg:grid-cols-4`; 6 → `lg:grid-cols-6`. The reskinned component (Phase 6 W3-03) must drive grid columns from `facts.length`, not hardcode `lg:grid-cols-6`.
  - Also assert `mk-eyebrow` class on the label slot (D-03 ported helper).
  - No mocks — pure RSC component.

---

### `tests/components/product-card.test.tsx` (test, RTL render + commerce-strip grep)

- **Role:** unit test (props interface, mk-eyebrow + mk-ph rendering, NO commerce tokens in HTML)
- **Closest analog:** `tests/components/contact-form.test.tsx` (lines 26-58) for next-intl mock; `tests/components/media-uploader.test.tsx` (lines 32-53) for the `next-cloudinary` mock.
- **Why this analog:** ProductCard imports both `next-cloudinary` (CldImage) and `@/i18n/navigation` (Link). Both must be mocked. media-uploader is the canonical CldImage mock; contact-form is the canonical next-intl mock; both already pass in CI.
- **Code excerpt to mirror** (`media-uploader.test.tsx` lines 32-53):
  ```typescript
  vi.mock('next-cloudinary', () => {
    return {
      CldImage: ({ src, alt }: { src: string; alt: string }) =>
        React.createElement('img', { 'data-testid': 'cld-image', src, alt }),
    };
  });
  ```
  Plus from `contact-form.test.tsx` (lines 60-74):
  ```typescript
  vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
  }));
  ```
- **Adaptation notes:**
  - Also `vi.mock('@/i18n/navigation', () => ({ Link: ({ children, href }) => React.createElement('a', { href }, children) }))`.
  - Assertion 1 (props interface): TypeScript at `tsc --noEmit` time — no runtime assertion needed. Type the test fixture `const product: ProductCardProps['product'] = { id, name, slug, shortDesc, heroPublicId, manufacturerName, sku }`.
  - Assertion 2 (`mk-eyebrow`): `expect(container.querySelector('.mk-eyebrow')).not.toBeNull()`.
  - Assertion 3 (`mk-ph mk-ph-corners`): render with `heroPublicId: null`; assert `container.querySelector('.mk-ph.mk-ph-corners')` exists.
  - Assertion 4 (commerce-strip — CLAUDE.md guardrail #3): grep the rendered HTML.
    ```typescript
    const html = container.innerHTML.toLowerCase();
    for (const token of ['price', 'sum', 'qty', 'добавить', 'add to', '₽', '$', 'cart', 'order']) {
      expect(html).not.toContain(token);
    }
    ```
  - VALIDATION's "REPLACE existing slate-themed test" is a misnomer — there is no existing product-card test. CREATE only.

---

### `src/components/public/gauge.tsx` (component, RSC, pure SVG port from `idea/gauge.jsx`)

- **Role:** component (RSC, pure SVG, no `'use client'`)
- **Closest analog:** `src/components/public/key-facts-ribbon.tsx` (lines 1-38) for the file scaffolding shape + `idea/gauge.jsx` (lines 1-65) for the visual/structural source.
- **Why this analog:** `key-facts-ribbon.tsx` is the only existing public RSC component that is purely props-driven, has a typed `interface XProps`, and exports a `data-testid`-bearing root — exactly the contract Gauge needs. `idea/gauge.jsx` provides the SVG geometry to port verbatim.
- **Code excerpt to mirror — file scaffolding from `key-facts-ribbon.tsx`:**
  ```typescript
  // Plan 06 — <Gauge> RSC SVG component (DESIGN-04). Ported from idea/gauge.jsx.
  // Pure RSC — no 'use client'. Geometry: 11 major ticks + 5 minor per major,
  // danger arc on values >= danger threshold, polar-coord needle.

  export interface GaugeProps {
    size?: number;        // default 280
    value: number;
    max?: number;         // default 10
    unit?: string;        // default 'MPa'
    label?: string;       // default 'PRESSURE'
    danger?: number;      // default max * 0.8
    theme?: 'light' | 'dark';
  }

  export function Gauge({ size = 280, value, max = 10, /* ... */ }: GaugeProps) {
    // ... port idea/gauge.jsx geometry verbatim, swapping JSX-in-JS for TSX
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        data-testid="gauge-svg"
        style={{ display: 'block' }}
      >
        {/* circle/face/ticks/needle/text — verbatim from idea/gauge.jsx lines 50-60 */}
      </svg>
    );
  }
  ```
- **Adaptation notes:**
  - Add `data-testid="gauge-svg"` on the root `<svg>` so the unit test can locate it.
  - Type all polar-coord helpers explicitly (`const polar = (a: number, rad: number): [number, number] => …`) to satisfy strict TS (CLAUDE.md guardrail #1).
  - Replace inline `fontFamily="JetBrains Mono"` literals with `var(--mono)` in a `style` prop so it picks up the D-04 font alias inside `.mk` scope.
  - Keep prop defaults identical to `idea/gauge.jsx` (size=280, value=6.4, max=10, unit='MPa', label='PRESSURE', danger=8) to match the test fixture.

---

### `src/proxy.ts` (refactor: relocation from root)

- **Role:** edge proxy (next-intl + Auth.js v5 composition)
- **Closest analog:** `proxy.ts` at repo root (the file being moved)
- **Why this analog:** stash@{0} deletes root `proxy.ts` entirely (138-line deletion confirmed via `git stash show -p`); the new `src/proxy.ts` is a content-identical copy. The stash does NOT include the additive copy at `src/proxy.ts` — it only deletes the root. The phase task must stage the deletion AND create `src/proxy.ts` with verbatim contents pre-stash.
- **Code excerpt to mirror** (root `proxy.ts` lines 1-40, plus full file is 120 lines — copy verbatim):
  ```typescript
  // Composed Edge proxy (Next.js 16 renames `middleware.ts` -> `proxy.ts`).
  // ... full doc comment retained ...

  import createMiddleware from 'next-intl/middleware';
  import NextAuth from 'next-auth';
  import { neon } from '@neondatabase/serverless';
  import authConfig from '@/lib/auth.config';
  import { routing } from '@/i18n/routing';

  const handleI18nRouting = createMiddleware(routing);
  const { auth } = NextAuth(authConfig);

  export const proxy = auth(async function middleware(req) {
    // ...
  });

  export const config = {
    matcher: [
      '/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
    ],
  };
  ```
- **Adaptation notes:**
  - Zero content changes. The path alias `@/lib/auth.config` already resolves correctly from `src/proxy.ts` (tsconfig baseUrl is `src/`).
  - Verify Next.js 16 auto-discovery at `src/proxy.ts` via `pnpm build` (RESEARCH.md Open Question #1). If build fails, fallback is keeping `proxy.ts` at root and skipping REFACTOR-01.
  - If `next.config.ts` lines 11-15 reference root `proxy.ts` explicitly, update those references too.

---

### `src/app/design/page.tsx` (optional, smoke route)

- **Role:** page (RSC) — disposable visual smoke
- **Closest analog:** `src/app/[locale]/layout.tsx` (RSC patterns, Metadata export) + `src/components/public/key-facts-ribbon.tsx` (component composition shape)
- **Why this analog:** Existing `[locale]/page.tsx` files in the codebase establish RSC + `Metadata` + `<main>` wrapping conventions; KeyFactsRibbon shows how to inline mock data for a stateless render.
- **Code excerpt to mirror** — composed from `[locale]/layout.tsx` Metadata pattern + KeyFactsRibbon static-array pattern:
  ```typescript
  import type { Metadata } from 'next';
  import { Gauge } from '@/components/public/gauge';
  import { ProductCard } from '@/components/public/product-card';
  import { KeyFactsRibbon } from '@/components/public/key-facts-ribbon';

  export const metadata: Metadata = {
    title: 'Design Smoke — Manometr v1.1',
    robots: { index: false, follow: false },
  };

  export default function DesignSmokePage() {
    return (
      <main className="mk p-12 space-y-8">
        <Gauge size={280} value={6.4} max={10} />
        <ProductCard product={{ id: '1', name: 'Demo', slug: 'demo', shortDesc: 'desc', heroPublicId: null, manufacturerName: 'WIKA', sku: 'WK-100' }} locale="uz" />
        <KeyFactsRibbon facts={[{ label: 'A', value: '1' }, { label: 'B', value: '2' }, { label: 'C', value: '3' }]} />
      </main>
    );
  }
  ```
- **Adaptation notes:**
  - Outside `[locale]/`, so does NOT receive next-intl `setRequestLocale`. Pass `locale="uz"` literally for the ProductCard prop (or skip ProductCard and use a div fallback).
  - `robots: { index: false, follow: false }` mirrors RESEARCH.md Open Question #3 recommendation (production-discoverable but unlinked + noindex).
  - Phase 11 VRT closes the loop — delete this file then.

---

### `src/app/globals.css` (MODIFY: extend `@theme inline` + add `.mk-*` block)

- **Role:** tokens (Tailwind v4 `@theme inline` + raw CSS helper classes)
- **Closest analog:** the existing `@theme inline` block in `src/app/globals.css` itself (lines 7-48) and `idea/styles.css` (lines 1-93) for the verbatim D-03 helpers
- **Why this analog:** D-02 says "extend the existing `@theme inline`"; D-03 says "port `.mk-*` verbatim from `idea/styles.css`". Both analogs are in-tree.
- **Code excerpt to mirror — `globals.css` lines 7-48 (extend in place):**
  ```css
  @theme inline {
      --font-heading: var(--font-sans);
      --font-sans: var(--font-sans);
      --color-sidebar-ring: var(--sidebar-ring);
      /* ... existing shadcn tokens ... */
      --radius-3xl: calc(var(--radius) * 2.2);
      --radius-4xl: calc(var(--radius) * 2.6);

      /* Phase 6 D-02 — design canvas color tokens (mk scope) */
      --color-bg: var(--bg);
      --color-bg-2: var(--bg-2);
      --color-surface: var(--surface);
      --color-ink: var(--ink);
      --color-ink-2: var(--ink-2);
      --color-ink-3: var(--ink-3);
      --color-ink-4: var(--ink-4);
      --color-line: var(--line);
      --color-line-2: var(--line-2);
      --color-line-soft: var(--line-soft);
      --color-mk-accent: var(--accent);          /* Pitfall #3 — namespace prefix */
      --color-mk-accent-soft: var(--accent-soft);
      --color-mk-accent-ink: var(--accent-ink);
      --color-warn: var(--warn);
      --color-ok: var(--ok);
  }
  ```
  And **verbatim port from `idea/styles.css` lines 4-93** (the `:root` declarations, `.mk`, `.mk-mono`, `.mk-eyebrow`, `.mk-ph*`, `.mk-btn*`, `.mk-tag*`, `.mk-rule`, `.mk-dotgrid`):
  ```css
  :root {
    --bg: #f5f3ee;
    --bg-2: #ebe8e1;
    /* ... port verbatim, ALL 28 vars from idea/styles.css ... */
  }

  .mk { font-family: var(--font); color: var(--ink); background: var(--bg); -webkit-font-smoothing: antialiased; letter-spacing: -0.011em; }
  .mk-eyebrow { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--ink-3); }
  /* ... etc, verbatim ... */
  ```
- **Adaptation notes:**
  - Pitfall #3 (RESEARCH 989): use `--color-mk-accent` NOT `--color-accent` — the latter would override shadcn's existing `--color-accent` token and break admin theming.
  - The `--font` and `--mono` CSS vars referenced inside `.mk` resolve to `next/font` outputs injected on `<html>` per D-04 — globals.css adds the alias inside `.mk { --font: var(--font-inter-tight); --mono: var(--font-jetbrains-mono); }`.
  - Existing `:root` shadcn oklch block (lines 50-83) MUST stay — D-01 boundary. Append the new `:root` design-canvas vars or fold them into the same `:root` block; do not delete the oklch ones.
  - Existing `.dark { … }` block (lines 85-117) untouched.

---

### `src/app/[locale]/layout.tsx` (MODIFY: D-01 mk class + D-04 multi-font)

- **Role:** layout (RSC root)
- **Closest analog:** lines 9-24 of THIS SAME FILE (existing `Inter` `next/font/google` declaration) — the canonical pattern to extend.
- **Why this analog:** D-04 says "Inter Tight + JetBrains Mono using the same `next/font/google` pattern already proven for Inter." The existing block IS the analog.
- **Code excerpt to mirror — current `layout.tsx` lines 9-24:**
  ```typescript
  import { Inter } from 'next/font/google';
  // ...

  // next/font subsets per SEO-04 — cyrillic + latin-ext required for ru/uz
  // glyph rendering. Phase-1 plan 01-04 baseline preserved.
  const inter = Inter({
    subsets: ['latin', 'latin-ext', 'cyrillic'],
    display: 'swap',
    variable: '--font-sans',
  });
  ```
  And the `<html>` mount at line 64 + body at 73:
  ```typescript
  return (
    <html lang={locale} className={inter.variable}>
      {/* ... */}
      <body>
  ```
- **Adaptation notes:**
  - Replace single `Inter` import with `import { Inter_Tight, JetBrains_Mono } from 'next/font/google';`.
  - Two parallel declarations:
    ```typescript
    const interTight = Inter_Tight({
      subsets: ['latin', 'latin-ext', 'cyrillic'],
      display: 'swap',
      variable: '--font-inter-tight',
    });
    const jetbrainsMono = JetBrains_Mono({
      subsets: ['latin', 'latin-ext', 'cyrillic'],
      display: 'swap',
      variable: '--font-jetbrains-mono',
    });
    ```
  - `<html>` className composes both: `className={`${interTight.variable} ${jetbrainsMono.variable}`}`.
  - `<body>` adds `className="mk"` (D-01) — also the stash applies `suppressHydrationWarning` to the body, so the final form is `<body className="mk" suppressHydrationWarning>`. **Apply the stash FIRST** per D-claude-discretion to avoid merge conflict, then layer D-01/D-04 edits on top.
  - Drop the old `--font-sans` variable (or alias it: `style={{ fontFamily: 'var(--font-inter-tight)' }}` already implicit through `.mk`).
  - Pitfall #11 from RESEARCH (line 988): variable fonts — DO NOT specify `weight`.

---

### `src/components/public/product-card.tsx` (MODIFY: REUSE-01 reskin in place)

- **Role:** component (RSC) — visual reskin only; props interface frozen.
- **Closest analog:** the existing file `src/components/public/product-card.tsx` (lines 1-89) — props interface invariant; only Tailwind class changes.
- **Why this analog:** REUSE-01 explicitly says "props interface unchanged" — only the JSX className strings change. The current shape IS the analog.
- **Code excerpt to mirror — current lines 19-30 (FREEZE this interface):**
  ```typescript
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
  Diff sites (lines 44, 56, 63-67, 76-82):
  ```typescript
  // BEFORE:
  <div className="relative aspect-[4/3] w-full bg-slate-50">
  // AFTER (REUSE-01 + research §1001 Pitfall: pin 1:1):
  <div className="relative aspect-square w-full bg-surface">

  // BEFORE: text-xs text-slate-500 + Badge variant="outline" + h3 text-slate-900 + p text-slate-600
  // AFTER:  text-xs text-ink-3 + <span className="mk-eyebrow"> + h3 text-ink + p text-ink-2

  // BEFORE: <div className="...text-slate-400">◯</div>
  // AFTER:  <div className="mk-ph mk-ph-corners h-full">no image</div>
  ```
- **Adaptation notes:**
  - Drop the shadcn `Badge` for the manufacturer label; replace with `<span className="mk-eyebrow">{product.manufacturerName}</span>` (CONTEXT specifics line 97).
  - Replace the `◯` placeholder branch with `<div className="mk-ph mk-ph-corners h-full">no image</div>` (CONTEXT specifics line 98).
  - Aspect ratio 4/3 → square per RESEARCH Open Question #2 recommendation (visual drift acknowledged).
  - Keep `data-testid="product-card"` on the root `Card` (existing, line 37) so consumers' integration tests don't break.
  - Tailwind utilities `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line` are auto-generated from the D-02 `@theme inline` extension above.

---

### `src/components/public/key-facts-ribbon.tsx` (MODIFY: REUSE-02 reskin)

- **Role:** component (RSC)
- **Closest analog:** the existing file (lines 1-38) — interface invariant.
- **Why this analog:** REUSE-02: "Already driven by `[{label, value}]` array — only styling changes."
- **Code excerpt to mirror — current lines 7-22 (FREEZE this interface):**
  ```typescript
  export interface KeyFact {
    label: string;
    value: string;
  }
  export interface KeyFactsRibbonProps {
    facts: KeyFact[];
  }

  export function KeyFactsRibbon({ facts }: KeyFactsRibbonProps) {
    if (facts.length === 0) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="key-facts-ribbon">
  ```
  Diff sites (lines 20-34):
  ```typescript
  // BEFORE: hardcoded "lg:grid-cols-6"
  // AFTER:  drive from facts.length:
  const gridCols = facts.length === 3 ? 'lg:grid-cols-3'
                 : facts.length === 4 ? 'lg:grid-cols-4'
                 : 'lg:grid-cols-6';

  // BEFORE: bg-slate-50 border-slate-200 + text-slate-500/900 inner
  // AFTER:  bg-surface border-line + .mk-eyebrow on label + .mk-mono tabular-nums on value
  ```
- **Adaptation notes:**
  - Wrapper: `<div className={`grid grid-cols-2 sm:grid-cols-3 ${gridCols} gap-3`}>` so the Wave 0 test can assert the variant class.
  - Inner tile: `<div className="rounded-lg border border-line bg-surface px-3 py-2.5">`.
  - Label slot: `<div className="mk-eyebrow">{fact.label}</div>` (D-03 helper).
  - Value slot: `<div className="mt-0.5 text-sm font-semibold tabular-nums text-ink mk-mono">{fact.value}</div>` (mono numerals per CONTEXT specifics).
  - Keep `data-testid="key-facts-ribbon"` on wrapper.

---

### `tests/e2e/contact-glyph-render.spec.ts` (EXTEND existing Phase 5 spec)

- **Role:** e2e (Playwright glyph-render regression)
- **Closest analog:** `tests/e2e/glyph-render.spec.ts` (the file IS the spec; CONTEXT names it `contact-glyph-render` but the actual repo file is `glyph-render.spec.ts`).
- **Why this analog:** The validation map says "extend existing Phase 5 spec to also visit `/{locale}` home." File is 90 lines — straightforward extension.
- **Code excerpt to mirror — existing lines 33-54 (the per-route test pattern):**
  ```typescript
  test('Uzbek Latin oʻ + gʻ (U+02BB) render in Inter font on /uz/categories', async ({ page }) => {
    if (Object.keys(extraHeaders).length > 0) {
      await page.context().setExtraHTTPHeaders(extraHeaders);
    }
    await page.goto(`${baseURL}/uz/categories`);

    const html = await page.content();
    expect(html).toMatch(/[oʻgʻ]/u);

    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(fontFamily).toMatch(/__Inter|Inter/);
  });
  ```
- **Adaptation notes:**
  - **PATH DISCREPANCY:** CONTEXT/VALIDATION reference `tests/e2e/contact-glyph-render.spec.ts`. The actual file in the repo is `tests/e2e/glyph-render.spec.ts`. Planner: extend in place at the real path; do NOT create a new file.
  - Add new `test('Inter Tight + JetBrains Mono load on /{locale} home', …)` block per locale (uz, ru, en).
  - The font-family regex must change from `/__Inter|Inter/` to `/__Inter_Tight|Inter Tight|__JetBrains_Mono|JetBrains Mono/` so the assertion accepts either body font (the home page may apply mono to numerics inside `.mk-mono`).
  - Continue using `getComputedStyle(document.body).fontFamily` — it should pick up `var(--font)` resolved to `var(--font-inter-tight)` inside `.mk`.
  - Preserve the `protectionBypass` Vercel-preview header guard (lines 19-23) verbatim.
  - Preserve `test.skip(process.env.CI !== 'true' && baseURL === 'http://localhost:3000', …)` so local dev doesn't hit Vercel rate limits.

---

### `src/env.ts` (MODIFY: REFACTOR-02 hardening — apply stash)

- **Role:** config (t3-env)
- **Closest analog:** current `src/env.ts` lines 28-46 + the stash@{0} diff (verified via `git stash show -p`).
- **Why this analog:** REFACTOR-02 is a mechanical apply of the stash diff — no design freedom.
- **Code excerpt to mirror — stash apply (lines 32-46 deleted, replaced with):**
  ```typescript
  // experimental__runtimeEnv lists ONLY client values — t3-env reads server
  // values directly from process.env on the server side. This is the
  // recommended pattern when env.ts can transitively land in a client bundle:
  // the previous `runtimeEnv` (with every process.env.SERVER_KEY reference)
  // would inline `undefined` into the client chunk and throw at module-load
  // ("Attempted to access a server-side environment variable on the client")
  // whenever the chunk was evaluated during SSR.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  ```
- **Adaptation notes:**
  - Apply via `git stash pop stash@{0}` early in Phase 6 (per CONTEXT D-claude-discretion "Refactor stash sequencing"). If conflicts arise on `layout.tsx` because of D-01/D-04 edits, resolve manually.
  - Existing `tests/unit/env-validation.test.ts` (lines 27-36) already grep-asserts the server/client block boundary — that test stays GREEN after this stash apply because the structure is preserved (CLOUDINARY_API_SECRET still in `server:`, NEXT_PUBLIC_* in `client:`).
  - The `tests/unit/env-validation.test.ts` regex `/server:\s*{[\s\S]*?},\s*client:/` still matches; the regex `/client:\s*{[\s\S]*?},\s*runtimeEnv:/` will FAIL because the key is now `experimental__runtimeEnv`. Planner: update that regex to `/client:\s*{[\s\S]*?},\s*experimental__runtimeEnv:/` as part of the REFACTOR-02 task.

---

### `src/components/public/contact-form.tsx` (MODIFY: REFACTOR-03 — apply stash)

- **Role:** component (client)
- **Closest analog:** current `src/components/public/contact-form.tsx` lines 37-40, 264-272 + stash@{0} diff
- **Why this analog:** REFACTOR-03 is a mechanical apply.
- **Code excerpt to mirror — stash apply at line 40:**
  ```typescript
  // BEFORE:
  import { env } from '@/env';

  // AFTER (per stash):
  // NEXT_PUBLIC_* is inlined by Next.js at build time, so we read it from
  // process.env directly. We deliberately do NOT import `@/env` here: that
  // module's t3-env Proxy throws on access of any non-NEXT_PUBLIC key, and any
  // stray reference (e.g. via tooling, Sentry instrumentation, or future edits)
  // would crash the client bundle with "Attempted to access a server-side
  // environment variable on the client". Server-only validation of these keys
  // still happens at server boot via src/env.ts.
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
  ```
  And at line 272:
  ```typescript
  // BEFORE:  siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
  // AFTER:   siteKey={TURNSTILE_SITE_KEY}
  ```
- **Adaptation notes:**
  - Existing test `tests/components/contact-form.test.tsx` mocks `@/env` (lines 54-58). After the stash apply this mock becomes a no-op (unused), but it doesn't break the test. Planner: optionally drop the now-orphan `vi.mock('@/env', …)` block as part of REFACTOR-03 cleanup, but it's safe to leave.
  - Phase 5 e2e `contact-roundtrip` is the regression gate — must still pass post-apply (REFACTOR-03 acceptance).

---

## Shared Patterns

### Vitest project routing (DOM vs node)

**Source:** `vitest.config.ts` lines 21-51
**Apply to:** all 5 new Wave 0 tests
- `tests/components/**/*.test.tsx` → jsdom (`dom` project) — use for layout/Gauge/KeyFactsRibbon/ProductCard tests.
- `tests/unit/**/*.test.ts` (and `tests/lib/**`, `tests/db/**`, etc.) → node (`node` project) — use for `globals-tokens.test.ts`.
- Mismatch = silent skip (the test file is matched by neither glob and never runs).

```typescript
projects: [
  { extends: true, test: { name: 'node', environment: 'node', include: ['tests/**/*.test.ts'], exclude: ['tests/components/**', /* ... */], setupFiles: ['./tests/_fixtures/load-env.ts'] } },
  { extends: true, test: { name: 'dom', environment: 'jsdom', include: ['tests/components/**/*.test.tsx'], exclude: ['tests/e2e/**', /* ... */], setupFiles: [] } },
]
```

### Mocked next-intl in component tests

**Source:** `tests/components/contact-form.test.tsx` lines 60-74; `tests/components/contact-button.test.tsx` lines 39-41
**Apply to:** `locale-layout.test.tsx`, `product-card.test.tsx`, any future component test that imports `next-intl`
```typescript
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));
```

### Mocked next-cloudinary CldImage

**Source:** `tests/components/media-uploader.test.tsx` lines 32-53
**Apply to:** `product-card.test.tsx` (and `design/page.tsx` smoke if its E2E gate ever runs in jsdom)
```typescript
vi.mock('next-cloudinary', () => ({
  CldImage: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { 'data-testid': 'cld-image', src, alt }),
}));
```

### File-as-text grep with `readFileSync`

**Source:** `tests/unit/env-validation.test.ts` lines 1-9, 27-36
**Apply to:** `globals-tokens.test.ts`
```typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
expect(css).toMatch(/--bg:\s*#f5f3ee/);
```

### Playwright `protectionBypass` + `test.skip` for local dev

**Source:** `tests/e2e/glyph-render.spec.ts` lines 19-32
**Apply to:** the Wave 0 W0-06 extension to glyph-render spec
```typescript
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass } : {};
test.describe.configure({ mode: 'serial' });
test.skip(process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
  'Glyph render gate requires a Vercel preview URL (set BASE_URL)');
```

### `data-testid` on RSC root for component tests

**Source:** `src/components/public/key-facts-ribbon.tsx` line 22; `src/components/public/product-card.tsx` line 37
**Apply to:** new `<Gauge>` component (add `data-testid="gauge-svg"` on the root `<svg>`)

### Tailwind v4 `@theme inline` extension pattern

**Source:** `src/app/globals.css` lines 7-48
**Apply to:** D-02 token additions
- Each token shape: `--color-{name}: var(--{raw-name});` — the `--color-` prefix is what makes Tailwind generate `bg-{name}` / `text-{name}` / `border-{name}` utilities.
- Use the `--color-mk-accent` namespace to avoid collision with shadcn's `--color-accent` (Pitfall #3 from RESEARCH).

### `next/font/google` multi-font + variable

**Source:** `src/app/[locale]/layout.tsx` lines 9-24
**Apply to:** D-04 Inter Tight + JetBrains Mono declarations
```typescript
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
const interTight = Inter_Tight({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter-tight',
});
// ... and JetBrains_Mono mirror ...
return <html className={`${interTight.variable} ${jetbrainsMono.variable}`}>;
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (partial) `tests/components/locale-layout.test.tsx` | RSC `renderToString` test | request-response | No existing repo test renders an `async` Server Component layout. The pattern uses `await Component({ params })` to extract the React element, then RTL `render()` — synthesized from `tests/components/contact-form.test.tsx` (mock shape) + RSC mechanics. Planner: validate the await-then-render approach in a spike before writing all assertions. |

Note: this is a "no exact analog" rather than "no analog at all" — the mock surface and assertion shape are well-covered; only the RSC boot is new.

---

## Metadata

**Analog search scope:** `src/`, `tests/`, `idea/`, repo root
**Files scanned:** 11 source files (Read), 4 directory globs, 6 grep passes
**Stash inspection:** `git stash show -p stash@{0}` — confirmed 4-file diff (root proxy.ts deletion, layout.tsx body suppressHydrationWarning, env.ts experimental__runtimeEnv, contact-form.tsx env-import drop)
**Pattern extraction date:** 2026-05-06
