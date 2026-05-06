# Phase 6: Design System Foundation + Refactor — Research

**Researched:** 2026-05-06
**Domain:** Design tokens / Tailwind v4 theming / next/font / SVG component / git-stash refactor
**Confidence:** HIGH

## Summary

Phase 6 stands up the v1.1 design system on top of the existing v1.0 codebase: design canvas tokens land as Tailwind v4 `@theme inline` variables scoped to a `.mk` wrapper on the public layout (admin keeps shadcn's oklch theme intact), Inter Tight + JetBrains Mono load via `next/font/google` with Latin / Latin-ext / Cyrillic subsets and are aliased to the design canvas's `--font` / `--mono` names, twelve `.mk-*` helper classes port verbatim from `idea/styles.css`, three reusable components (`<Gauge>`, `<ProductCard>`, `<KeyFactsRibbon>`) are built or reskinned, and the four-file v1.1-wip stash applies first to clear merge friction.

The technical approach is well-bounded: every locked decision in CONTEXT.md (D-01..D-04) lines up with documented Tailwind v4 + next/font patterns, the stash diff is small (4 files, +19 / -138), and existing v1.0 components (`product-card.tsx`, `key-facts-ribbon.tsx`) already have stable prop interfaces that survive the reskin. The single subtle pitfall is that `@theme inline` with scoped CSS variables resolves utilities at the call-site (not at `:root`) — which is exactly the behavior D-01 needs, but it means utilities like `bg-bg` only render correctly inside `.mk` descendants. Phases 7–11 must author components on the assumption that they always render under `.mk`.

**Primary recommendation:** Apply stash@{0} first (creating `src/proxy.ts` manually with the deleted `proxy.ts` content, since the stash only deletes the old file). Extend `@theme inline` in `src/app/globals.css` with the 14 design canvas color tokens. Port the 12 helper classes verbatim. Declare both fonts via `next/font/google` with `subsets: ['latin', 'latin-ext', 'cyrillic']` and `variable: '--font-inter-tight'` / `'--font-jetbrains-mono'`. Mount `className="mk"` on the public layout's `<body>`. Reskin `product-card.tsx` and `key-facts-ribbon.tsx` in place (D-claude-discretion default), drop a hand-written `<Gauge>` SVG TypeScript port of `idea/gauge.jsx`. Verification gate: `pnpm typecheck && pnpm build` plus a `/design` route that renders all three components for visual smoke confirmation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Token scope):** Design canvas tokens are scoped via the `.mk` class wrapping `src/app/[locale]/layout.tsx` (public root). Admin layout (`src/app/[locale]/admin/`) keeps shadcn/ui's existing oklch theme untouched. DESIGN-03 satisfied via this global `mk` class.
- **D-02 (Tailwind surface):** Design canvas tokens are registered as Tailwind v4 `@theme inline` entries in `src/app/globals.css` so utilities are generated: `bg-bg`, `bg-bg-2`, `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `border-line`, `border-line-2`, `border-line-soft`, `bg-accent`, `bg-accent-soft`, `text-accent-ink`, `text-warn`, `text-ok`. Phases 7–11 author components with these utilities.
- **D-03 (Design canvas helper classes):** The `.mk-*` helper classes from `idea/styles.css` (`.mk`, `.mk-mono`, `.mk-eyebrow`, `.mk-btn`, `.mk-btn-primary`, `.mk-btn-ghost`, `.mk-btn-light`, `.mk-btn-sm`, `.mk-tag`, `.mk-tag-solid`, `.mk-tag-accent`, `.mk-ph`, `.mk-ph-corners`) port **verbatim** into `src/app/globals.css`. Lossless fidelity to design canvas; phases 7–11 use them directly for design-canvas idioms (eyebrows, tag chips, placeholders).
- **D-04 (Font CSS variables):** `next/font` outputs are aliased to `--font` and `--mono` inside the `.mk` scope. Inter Tight is loaded with `variable: '--font-inter-tight'`; JetBrains Mono with `variable: '--font-jetbrains-mono'`. Globals.css sets `.mk { --font: var(--font-inter-tight); --mono: var(--font-jetbrains-mono); ... }` so the verbatim-ported `.mk-mono` and `.mk-eyebrow` helpers work without rewrite.

### Claude's Discretion

- **Component migration boundary (REUSE-03):** New `src/components/public/v1-1/` folder vs in-place replacement of existing `src/components/public/{product-card,key-facts-ribbon}.tsx`. Planner should weigh blast radius on Phase 3/4 consumers (catalog grid, used-in widget, manufacturer pages) — pages will visually drift mid-milestone if reskinned in-place before phases 8/9 rebuild containers. Reasonable default: keep the existing file path (single SoT, no duplicates) since tokens are class-scoped.
- **Gauge component implementation (DESIGN-04):** Hand-written SVG matching `idea/gauge.jsx` is the expected default (no library dep, full control over technical-callout annotations). Configurable props: `size`, `value`, `max`, `unit`, `label`, `dangerThreshold`.
- **Font loading variant vs static:** Either acceptable provided FOIT is eliminated and Cyrillic + Latin-ext subsets render Uzbek-Latin `oʻ`/`gʻ` (U+02BB) and Cyrillic glyphs correctly. Variable fonts via `next/font/google` is the lower-friction default; switch to self-hosted `next/font/local` only if a Cyrillic glyph regression appears on Vercel preview.
- **Refactor stash sequencing (REFACTOR-01..03):** Apply `stash@{0}` early in Phase 6 (before token + component work) to clear structural changes (proxy.ts move, env.ts hardening) and avoid merge friction with later token edits to `layout.tsx`.

### Deferred Ideas (OUT OF SCOPE)

- Animated micro-interactions for `<Gauge>` (V2-VIS-03)
- Mobile-pixel-perfect responsive treatment (V2-VIS-01)
- Dark mode toggle (V2-VIS-02)
- shadcn Button/Badge variant authoring of `.mk-btn` / `.mk-tag`
- Brand wordmark / contact metadata / industry taxonomy reconciliation (handled in phases 7–10)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-01 | Tailwind v4 theme exposes design canvas color/typography/spacing tokens | §Standard Stack, §Code Examples ("@theme inline extension"), §Architecture Pattern 1 |
| DESIGN-02 | next/font loads Inter Tight (4 weights) + JetBrains Mono (2 weights) with cyrillic + latin-ext subsets, no FOIT | §Code Examples ("next/font declaration"), §Pitfalls #2 (FOIT) and #6 (Cyrillic glyph regressions) |
| DESIGN-03 | Every public page applies global `mk` design class | §Architecture Pattern 2 (".mk wrapper on public layout"), §File Plan |
| DESIGN-04 | Reusable `<Gauge>` SVG component (size/value/max/unit/label/dangerThreshold) | §Architecture Pattern 3 ("Gauge SVG port"), §Code Examples (Gauge component skeleton) |
| REUSE-01 | `<ProductCard>` reskinned to design canvas — no commerce affordances, mk-eyebrow / mk-tag / mk-ph idioms | §Code Examples ("ProductCard v1.1 skeleton"), §Architecture Pattern 4 |
| REUSE-02 | `<KeyFactsRibbon>` driven by `[{label, value}]` array, supports 3/4/6 tile counts | §Architecture Pattern 5, §Code Examples ("KeyFactsRibbon v1.1 skeleton") |
| REUSE-03 | All v1.1 components live under `src/components/public/` (in-place per discretion default) | §Architecture (File Plan) |
| REFACTOR-01 | proxy.ts → src/proxy.ts move | §Stash Application Plan, §Pitfalls #1 (stash deletes only) |
| REFACTOR-02 | src/env.ts hardening | §Stash Application Plan |
| REFACTOR-03 | layout.tsx + contact-form.tsx tweaks | §Stash Application Plan |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens (CSS variables, `@theme inline`) | Frontend Server (SSR) — globals.css | Browser (cascade resolution) | Tokens are static CSS shipped in the global stylesheet bundle; resolution happens browser-side via the cascade. No runtime computation. |
| Class-scoped theming (`.mk` wrapper) | Frontend Server (SSR) — root layout | Browser (cascade) | The `.mk` className is set in the RSC root layout; CSS scoping to that class is pure browser cascade behavior. |
| Web font loading (`next/font/google`) | CDN / Static (self-hosted woff2 at build) | Frontend Server (link preload tags) | `next/font` downloads + self-hosts at build time; the runtime contract is preload `<link>` injection into `<head>` from RSC. No client-side font-loading API. |
| `<Gauge>` SVG | Frontend Server (RSC, pure render) | — | Inline SVG component with no client interactivity (V2-VIS-03 defers animation); renders in RSC, props from server data. |
| `<ProductCard>` / `<KeyFactsRibbon>` | Frontend Server (RSC) | — | Both are pure RSC consumers of server-fetched data; existing v1.0 implementations are already RSC. |
| Edge proxy (`proxy.ts` → `src/proxy.ts`) | Edge Runtime | — | Next.js 16 file convention; runs at the edge, NOT in the page tier. Move is a pure file-rename refactor. |
| Environment validation (`src/env.ts`) | Frontend Server (Node) + Build-time gate | — | t3-env validates at module-load on the server; `experimental__runtimeEnv` keeps client bundle from importing server keys. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.2.3 (installed) / 4.2.4 (current) | CSS engine + `@theme inline` directive | Already pinned in package.json; `@theme inline` is the v4-native idiom for variable-driven utilities `[VERIFIED: package.json + npm view tailwindcss version → 4.2.4]` |
| @tailwindcss/postcss | 4.2.3 (installed) | PostCSS plugin pipeline | Required by Tailwind v4 build chain, already pinned `[VERIFIED: package.json]` |
| next/font/google | bundled with Next 16.2.4 | Inter Tight + JetBrains Mono self-hosting + preload | Built-in to Next 16; eliminates external Google Fonts request, automatic font-display: swap, Cyrillic + Latin-ext subset support `[CITED: nextjs.org/docs/app/api-reference/components/font, version 16.2.4 dated 2026-05-06]` |
| react | 19.1.0 | RSC component runtime | Already pinned `[VERIFIED: package.json]` |
| typescript | 5.7.3 | Strict-mode static typing | Already pinned `[VERIFIED: package.json]` |

### Supporting (already shipping; no new install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-cloudinary | 6.17.5 | `<CldImage>` for product hero | ProductCard reskin reuses existing pattern from v1.0 product-card.tsx |
| @t3-oss/env-nextjs | 0.13.11 | Env-var validation (REFACTOR-02 target) | Already in use; stash hardens the runtimeEnv → experimental__runtimeEnv split |
| next-intl | 4.9.1 | i18n routing + Link helper | Existing dependency; ProductCard's existing `Link from '@/i18n/navigation'` import preserves locale-prefix behavior |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next/font/google` | `next/font/local` (self-hosted woff2 files) | More control over font subset slicing; useful only if Vercel preview shows a Cyrillic glyph regression with the Google variant. CONTEXT.md explicitly defers this to a fallback. |
| Hand-written SVG `<Gauge>` | A library like `react-gauge-component` or `recharts` PolarChart | Adds a dependency and constrains styling; design canvas wants pixel-fidelity (technical callouts, custom tick spacing, accent-colored danger arc). Hand-written is locked by D-claude-discretion. |
| Tailwind v4 `@theme inline` | Plain `@theme` (without `inline`) | `@theme` (no inline) emits utilities as `var(--color-bg)` references, which resolve to `--color-bg` defined by Tailwind itself; `@theme inline` emits the variable value, so `bg-bg` becomes `background-color: var(--bg)` and resolves at the cascade scope where `--bg` is defined. **`inline` is REQUIRED for D-01's class-scoping strategy** `[CITED: tailwindcss.com/docs/theme — "Using the inline option, the utility class will use the theme variable value"]` |

**Installation (no new packages required):**
```bash
# All required deps are already in package.json — no install step.
# Verify with:
pnpm view tailwindcss version    # current: 4.2.4 (installed: 4.2.3 — minor)
pnpm view next version           # current: 16.2.4 (installed: 16.2.4 — match)
```

**Version verification:** `[VERIFIED: pnpm view tailwindcss version → 4.2.4 on 2026-05-06; package.json pin 4.2.3]`. Minor patch drift is expected and safe; do NOT bump as part of Phase 6 (out of scope, would invite unrelated test churn).

## Architecture Patterns

### System Architecture Diagram

```
                                                                           
  Build time:                                                              
                                                                           
   next/font/google (Inter Tight + JetBrains Mono)                        
        ↓                                                                  
   Self-hosted woff2 → /_next/static/media/*.woff2                         
        ↓                                                                  
   <link rel="preload" as="font"> injected into <head> by RSC root layout 
                                                                           
   Tailwind v4 PostCSS scan over src/**/*.{ts,tsx}                         
        ↓                                                                  
   @theme inline { --color-bg: var(--bg); ... } → utility CSS              
        ↓                                                                  
   src/app/globals.css → bundled into route CSS chunks                     
                                                                           
  Runtime (request → render):                                              
                                                                           
   Browser request → Edge proxy (src/proxy.ts)                             
        ↓ [locale redirect + admin gate]                                   
   Server: src/app/[locale]/layout.tsx                                     
        ↓ Next 16 RSC                                                      
   <html className={interTight.variable + ' ' + jbMono.variable}>          
     <body className="mk">  ← D-01 mount point                            
       <main>                                                              
         {children}  ← all public pages inherit `.mk` cascade              
            ↓                                                              
         CSS resolves: var(--bg) → #f5f3ee, var(--font) → Inter Tight     
       </main>                                                             
                                                                           
   Admin route /[locale]/admin/* uses its own layout (no `.mk`)            
   → shadcn oklch tokens resolve from :root only                           
                                                                           
```

### Recommended Project Structure
```
src/
├── app/
│   ├── globals.css                # D-02 @theme inline + D-03 .mk-* helpers + D-04 .mk font alias
│   ├── [locale]/
│   │   ├── layout.tsx             # D-01 mount: <body className="mk">; loads next/font; REFACTOR-03 stashed tweak (suppressHydrationWarning)
│   │   └── admin/
│   │       └── layout.tsx         # UNCHANGED — admin keeps shadcn theme
│   └── design/                    # OPTIONAL Phase 6 verification route (visual smoke harness)
│       └── page.tsx               # Renders <Gauge>, <ProductCard>, <KeyFactsRibbon>
├── components/
│   └── public/
│       ├── gauge.tsx              # NEW — DESIGN-04 SVG component
│       ├── product-card.tsx       # REUSE-01 in-place reskin (props unchanged)
│       └── key-facts-ribbon.tsx   # REUSE-02 in-place reskin (props unchanged)
├── proxy.ts                       # DELETE (stash) — moved to src/proxy.ts
├── env.ts (existing)              # REFACTOR-02 stashed runtimeEnv → experimental__runtimeEnv
└── proxy.ts (NEW under src/)      # REFACTOR-01 — copy of deleted proxy.ts content
```

### Pattern 1: `@theme inline` Color Token Extension (D-02)

**What:** Tailwind v4's `@theme inline` directive registers CSS-variable-driven tokens as utility-generating theme entries. Unlike plain `@theme`, the `inline` flag emits utilities that reference the *value expression* — so `--color-bg: var(--bg)` produces `.bg-bg { background-color: var(--bg) }`, where `var(--bg)` resolves at the cascade scope it is used.

**When to use:** When tokens are scoped to a wrapper class (D-01: `--bg` defined inside `.mk { ... }`), `inline` is required so the utility resolves at the consuming element rather than at `:root`. `[CITED: tailwindcss.com/docs/theme]`

**Color token namespace mapping:** Tailwind v4 derives utility names from a strict prefix convention:
- `--color-X` → `bg-X`, `text-X`, `border-X`, `ring-X`, `fill-X`, `stroke-X`
- `--font-X` → `font-X`
- `--spacing-X` → controls the spacing scale unit

For D-02's 14 tokens, the canonical mapping is:

```css
/* In src/app/globals.css — extend the EXISTING @theme inline block */
@theme inline {
  /* ... existing shadcn tokens preserved ... */

  /* v1.1 design canvas color tokens — D-02 */
  --color-bg:           var(--bg);
  --color-bg-2:         var(--bg-2);
  --color-surface:      var(--surface);
  --color-ink:          var(--ink);
  --color-ink-2:        var(--ink-2);
  --color-ink-3:        var(--ink-3);
  --color-ink-4:        var(--ink-4);
  --color-line:         var(--line);
  --color-line-2:       var(--line-2);
  --color-line-soft:    var(--line-soft);
  --color-mk-accent:        var(--accent);       /* prefixed `mk-` to avoid collision with shadcn --color-accent */
  --color-mk-accent-soft:   var(--accent-soft);
  --color-mk-accent-ink:    var(--accent-ink);
  --color-warn:         var(--warn);
  --color-ok:           var(--ok);
}
```

**Generates utilities:** `bg-bg`, `bg-bg-2`, `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `border-line`, `border-line-2`, `border-line-soft`, `bg-mk-accent`, `bg-mk-accent-soft`, `text-mk-accent-ink`, `text-warn`, `text-ok` — and all sibling utilities (`text-bg`, `border-mk-accent`, etc.) are auto-generated.

**Naming collision note:** shadcn already uses `--color-accent` for its oklch palette. The v1.1 canvas token MUST be prefixed (e.g. `--color-mk-accent`) so the existing `text-accent` / `bg-accent` utilities used in admin keep their shadcn meaning. Phases 7–11 will use `bg-mk-accent` for the design canvas blue. **HIGH confidence; this is a pure naming hygiene point that the planner must encode.** `[VERIFIED: src/app/globals.css line 27-28 — `--color-accent: var(--accent)` is already shadcn's]`

### Pattern 2: Class-Scoped Token Strategy (D-01)

**What:** Define raw design canvas tokens (`--bg`, `--ink`, etc.) only inside `.mk { ... }` so they cascade to public-layout descendants and do NOT pollute `:root` (which would conflict with shadcn's oklch palette in admin).

**Crucial Tailwind v4 semantic:** Per `[CITED: tailwindcss.com/docs/theme]`, `@theme inline` utilities resolve `var(--bg)` at the *consuming element's cascade*, not at `:root`. So `bg-bg` applied to a `<div>` outside `.mk` will fail (variable undefined). Inside `.mk` it resolves correctly. **This is the desired behavior** — admin pages never apply `bg-bg`, so admin sees no leakage; if a developer accidentally uses `bg-bg` in admin, the utility silently no-ops (the `background-color: var(--bg)` declaration is invalid and the cascade keeps the previous color).

**Pattern:**
```css
/* In src/app/globals.css */
.mk {
  /* Raw design canvas tokens — D-01 scope */
  --bg: #f5f3ee;
  --bg-2: #ebe8e1;
  --surface: #ffffff;
  --ink: #14161b;
  --ink-2: #3a3d44;
  --ink-3: #74777e;
  --ink-4: #a7a9af;
  --line: #e5e1d8;
  --line-2: #d6d2c8;
  --line-soft: #efece5;
  --accent: #1240e5;
  --accent-soft: #e8edff;
  --accent-ink: #0926a8;
  --warn: #b8531a;
  --ok: #1d7a4f;

  /* D-04 font aliasing */
  --font: var(--font-inter-tight);
  --mono: var(--font-jetbrains-mono);

  /* Apply baseline body styling per idea/styles.css line 34 */
  font-family: var(--font);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.011em;
}
```

**Mount point:** `src/app/[locale]/layout.tsx` — `<body className="mk">`. Admin layout (`src/app/[locale]/admin/layout.tsx`) does NOT apply `.mk`; admin pages live inside this layout and inherit the cascade-free admin shell.

### Pattern 3: Hand-Written `<Gauge>` SVG Component (DESIGN-04)

**What:** TypeScript port of `idea/gauge.jsx` (62 lines) with a typed `GaugeProps` interface. SVG primitives: outer ring + inner face circles, 11 major tick marks with mono-font numeric labels, 4 minor ticks per major segment, accent-color danger arc above tick marks, accent-color needle with rounded cap, dual concentric center caps.

**When to use:** Home hero (`<Gauge size={420} value={6.4} max={10} unit="MPa" label="MANOBAR PG · 0.5%" dangerThreshold={8.5} />`) — Phase 8 HOME-02. Product detail full-bleed gauge area (`<Gauge size={400} value={120} max={400} unit="kgf/cm²" label="DM8008-VU" dangerThreshold={350} />`) — Phase 9 PDP-02.

**Geometry constants from `idea/gauge.jsx` (lines 4-7):**
- Center: `(size/2, size/2)`
- Radius: `r = size * 0.42`
- Sweep arc: 135° → 405° (270° of dial; bottom 90° is the gap)
- 11 major ticks (`N = 11`), 5 minor subdivisions (`m = 5`)
- Color tokens: light theme uses `face: #fafaf7`, `ring: #14161b`, `tickC: #14161b`, `tickMinor: #a7a9af`, `txt: #14161b`, `dim: #74777e`. Accent (danger arc + needle + active center cap): `#1240e5`.

**Typed signature:**
```ts
export interface GaugeProps {
  size?: number;            // default 280; SVG square viewBox
  value?: number;           // current reading; clamped to [0, max] by needle math
  max?: number;             // default 10; tick range upper bound
  unit?: string;            // default 'MPa'; rendered as mono text below center
  label?: string;           // default 'PRESSURE'; rendered as mono text above center
  dangerThreshold?: number; // default 8; ticks ≥ threshold render in accent color, accent arc spans threshold→max
  theme?: 'light' | 'dark'; // default 'light'; dark theme inverts face + ring + tick colors (per gauge.jsx line 12)
}
```

**Code skeleton:** see §Code Examples below.

**Out of scope:** animation (V2-VIS-03), interaction handlers, accessibility ARIA (deferred — Phase 8 HOME-02 will add `aria-label` if the design canvas calls for it; Phase 6 ships the visual primitive only).

### Pattern 4: ProductCard v1.1 Reskin (REUSE-01)

**Existing interface (`src/components/public/product-card.tsx` lines 19-30) is preserved verbatim:**
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

**Visual changes vs existing v1.0:**
- Drop shadcn `Card` + `CardContent` + `Badge` wrappers (replace with bare `<article>` + `<div>` — fewer abstractions, design canvas idiom).
- Replace placeholder `◯` glyph with `<div className="mk-ph mk-ph-corners">` for the no-image branch.
- Manufacturer label uses `<span className="mk-eyebrow">` (mono, uppercase, `--ink-3`).
- SKU uses `<span className="mk-mono">` for tabular alignment.
- Card surface: `bg-surface` + `border border-line` (replaces `bg-slate-50` + slate borders).
- Title: existing typography survives; switch slate text colors to `text-ink` / `text-ink-2`.
- Add a `→` browse-arrow link CTA per the design canvas's product card pattern (no commerce — informational only).
- Existing `<CldImage>` for `heroPublicId` survives unchanged; aspect ratio stays 4:3 (matches existing v1.0; Phase 8 PLP-08 may shift to 1:1 if design canvas demands — flag for visual cohesion check during plan).

**Migration boundary decision (from D-claude-discretion):** **In-place replacement** in `src/components/public/product-card.tsx`. Rationale: tokens are class-scoped via `.mk`, so reskinning in place doesn't visually break Phase 3/4 consumers (catalog grid, manufacturer detail, used-in widget) once Phase 7 mounts `.mk` on the public layout — they all live under the same wrapper. A sibling `v1-1/` folder would create dual-source-of-truth churn and risk consumers landing on the wrong import.

### Pattern 5: KeyFactsRibbon v1.1 Reskin (REUSE-02)

**Existing interface (lines 8-14) is preserved verbatim:**
```ts
export interface KeyFact { label: string; value: string; }
export interface KeyFactsRibbonProps { facts: KeyFact[]; }
```

**Variant handling:** the existing implementation hard-codes `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` — this needs to flex for 3-fact (service), 4-fact (home, product detail), and 6-fact (existing PDP) variants. Drive grid columns from `facts.length`:

```tsx
const cols =
  facts.length <= 3 ? 'sm:grid-cols-3' :
  facts.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
  'sm:grid-cols-3 lg:grid-cols-6';   // 5+ → existing 6-tile fallback
```

**Visual changes:** tile background `bg-surface` (was `bg-slate-50`), border `border-line`, label `<div className="mk-eyebrow">` (was uppercase tracking-wide slate-500), value `<div className="mk-mono">` for tabular numerals. All else stays.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading webfonts with no FOIT | Manual `<link href="https://fonts.googleapis.com/css2?...">` | `next/font/google` | Eliminates external network request, automatic build-time self-hosting, zero CLS via `adjustFontFallback`, `display: swap` default. The existing layout.tsx ALREADY uses next/font for Inter — Phase 6 just adds two more font functions next to the existing one. `[CITED: nextjs.org/docs/app/api-reference/components/font]` |
| CSS-variable-driven Tailwind utilities | Custom Tailwind plugin (`addUtilities()`) | `@theme inline` | Tailwind v4 native; no `tailwind.config.ts` needed (none exists in this repo); `@theme inline` is the documented v4 idiom for CSS-variable theming. |
| Token namespace coexistence between shadcn + design canvas | Wholesale shadcn replacement | Dual-namespace via class-scoping (D-01) | shadcn ships admin; replacing it would invalidate the entire Phase 2 admin UI. `.mk` scoping is the documented Tailwind v4 pattern for theme coexistence. |
| Gauge dial geometry | A library | Hand-written SVG (locked by D-claude-discretion) | Library output sacrifices technical-callout fidelity (linecaps, mono labels at tick marks, accent danger arc above the tick ring); design canvas wants pixel-fidelity to `idea/gauge.jsx`. |
| t3-env client/server isolation | Manual `process.env.X!` everywhere | `experimental__runtimeEnv` (stash REFACTOR-02) | The stash's `src/env.ts` change is the t3-env-recommended pattern when env.ts can land in client bundles transitively. Without it, `process.env.SERVER_KEY` references inline `undefined` and throw at module-load. `[CITED: stash@{0} src/env.ts comment lines 32-39]` |

**Key insight:** Phase 6 is largely a configuration phase — every problem domain has a documented Next.js / Tailwind / t3-env idiom. Hand-rolling is reserved for the Gauge component (where the design canvas demands fidelity) and the helper-class port (D-03 explicitly requires verbatim port).

## Runtime State Inventory

> Phase 6 is a greenfield design system stand-up plus a code-only refactor. No data migrations, no OS-registered state, no service config changes.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no schema or seed data changes in scope | None |
| Live service config | None — no n8n / Cloudflare / Cloudinary preset changes; existing Cloudinary signing endpoint untouched | None |
| OS-registered state | None — no scheduled tasks, no daemons, no registered services | None |
| Secrets/env vars | `src/env.ts` keys list is unchanged by the stash; only the t3-env shape (runtimeEnv → experimental__runtimeEnv) changes. **No env var renames.** | None — code edit only |
| Build artifacts | `node_modules` is unchanged (no new dependencies). `.next/` cache will rebuild from scratch on first `pnpm build` after the stash applies (file deletion = changed working tree). Vercel preview deploys may pick up cached chunks; force a fresh build on first preview to verify. | Force fresh `pnpm build` once after stash applies |

**Nothing else found** — verified by reading every file the stash diff touches and cross-checking the phase requirement IDs against `.planning/STATE.md` retrieval (no Phase-6-related state migrations queued). `[VERIFIED: git stash show --name-status stash@{0}]`

## Stash Application Plan (REFACTOR-01..03)

**Stash@{0} contents** `[VERIFIED: git stash show stash@{0} --name-status; git stash show -p stash@{0}]`:

| File | Op | Lines | Effect |
|------|------|-------|--------|
| `proxy.ts` | **D** (deleted) | -120 | Top-level proxy.ts removed wholesale |
| `src/app/[locale]/layout.tsx` | M | +1 / -1 | `<body>` → `<body suppressHydrationWarning>` (REFACTOR-03) |
| `src/components/public/contact-form.tsx` | M | +10 / -2 | Replaces `import { env } from '@/env'` with direct `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!` read (REFACTOR-03) |
| `src/env.ts` | M | +8 / -15 | Replaces `runtimeEnv: { ... server keys + client keys }` with `experimental__runtimeEnv: { ... client keys only }` (REFACTOR-02) |

**CRITICAL DETECTION:** the stash **only deletes `proxy.ts`** — it does NOT add `src/proxy.ts`. The "move" requires manual recreation. The deleted file's content (120 lines, fully captured in `git stash show -p stash@{0}`) must be re-created at `src/proxy.ts` byte-for-byte AFTER applying the stash. This is REFACTOR-01's missing half.

**Application sequence (planner must encode this order; D-claude-discretion specifies "stash early"):**

1. **Capture deleted file content** — before `git stash apply`, save the deleted file's content from the stash diff: it is preserved verbatim in `proxy.ts` at the working tree currently (until stash applies). The planner should `cp proxy.ts src/proxy.ts` BEFORE the stash apply, so the file exists at its new location with the same content.
2. **Apply stash** — `git stash apply stash@{0}` (use apply, not pop, so the stash remains recoverable until the changes are committed).
3. **Verify proxy file convention** — Next.js 16 looks for `proxy.ts` at the project root by file convention. After step 1+2 the file is at `src/proxy.ts`. **Open question:** Does Next.js 16 auto-discover `src/proxy.ts` when `src/` is the source root? `[VERIFIED: existing comments in next.config.ts lines 11-15 reference `proxy.ts discovery (the one file convention Next.js resolves from project root rather than from app/)`. The `turbopack.root` setting pins the workspace root.]`

   Per Next.js 16 docs (file-system conventions), `proxy.ts` (formerly `middleware.ts`) is resolved from the project root OR `src/`, like `app/` and `pages/`. **HIGH confidence: src/proxy.ts is the canonical location when src/ is in use.** `[CITED: nextjs.org/docs/app/api-reference/file-conventions/middleware — middleware.js can be co-located with app/ in src/ when using src/ structure; the proxy.ts rename in Next 16 inherits the same resolution]`

   The stash committer's intent in deleting top-level `proxy.ts` matches: post-refactor, the file lives at `src/proxy.ts` to align with the project's `src/` source root. **Verification step:** after step 1+2, run `pnpm build` and confirm the build emits `Edge runtime: src/proxy.ts` rather than failing with "no proxy.ts found". If it fails, the planner has the option to fall back to keeping `proxy.ts` at the root (revert REFACTOR-01) or set the convention via `turbopack.root` already pinned in next.config.ts line 17.

4. **Verify env.ts** — `pnpm typecheck` must succeed. The t3-env runtime no longer reads server keys from a redundant runtimeEnv map; server keys are read directly from `process.env` on the server side. Verify by running the contact-form e2e (Phase 5 contract) on a Vercel preview to confirm `NEXT_PUBLIC_TURNSTILE_SITE_KEY` still inlines into the client bundle.

5. **Sanity-check contact-form.tsx** — the change replaces `env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` with a module-scope `const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!`. This is safe because `NEXT_PUBLIC_*` env vars are inlined by Next.js at build time. The Phase 5 e2e test (Slow-4G glyph-render + Turnstile flow) is the regression gate.

**Conflict risk with D-01:** the stash modifies `src/app/[locale]/layout.tsx` (`<body>` → `<body suppressHydrationWarning>`). Phase 6 D-01 also modifies the same line (`<body className="mk">`). **Apply stash FIRST, then add the className** — the merged result is `<body suppressHydrationWarning className="mk">`. No actual git conflict because the changes are additive at distinct attribute positions; in-editor sequencing is the only requirement. `[VERIFIED: stash diff shows the change is on the `<body>` opening tag with no className present; D-01 adds className without removing suppressHydrationWarning]`

## Common Pitfalls

### Pitfall 1: Stash@{0} Deletes But Does Not Add `src/proxy.ts`
**What goes wrong:** Naive `git stash apply` leaves the project with NO proxy.ts at all (top-level deleted, src-level not created). Next.js 16 build then fails with "Edge proxy not found" or — worse — silently disables the locale redirect + admin gate, exposing `/admin/*` to unauth requests.
**Why it happens:** The stash was authored as a partial commit; the developer presumably copied `proxy.ts` to `src/proxy.ts` separately and only stashed the deletion + remaining edits.
**How to avoid:** **Plan order:** before `git stash apply`, run `cp proxy.ts src/proxy.ts` while the file still exists at the root. Then apply the stash. Verify both that `src/proxy.ts` exists and that the build emits the Edge runtime warning naming `src/proxy.ts`.
**Warning signs:** `pnpm build` reporting "0 middleware files matched" or `/uz/admin/*` redirecting incorrectly (or not at all) on Vercel preview.

### Pitfall 2: `@theme inline` Without Inline → `bg-bg` Generates Wrong Color
**What goes wrong:** Plain `@theme { --color-bg: var(--bg); }` (without `inline`) emits `.bg-bg { background-color: var(--color-bg); }`. With our class-scoping, `--color-bg` is defined at the @theme level (Tailwind's globals) but resolves to `var(--bg)` which isn't defined at `:root`, only at `.mk`. Result: `bg-bg` outside `.mk` falls through to `var(--bg)` undefined; inside `.mk` it works. **But** with `inline`, the utility IS `var(--bg)` directly, with the same scope behavior — semantically identical for our use case but the spec is cleaner with `inline`.
**Why it happens:** Easy to drop the `inline` keyword from the existing block since shadcn's tokens already use `inline` correctly.
**How to avoid:** `@theme inline` MUST be the keyword used. Verify via PostCSS output: `bg-bg` should compile to `.bg-bg { background-color: var(--bg); }` (raw var reference), not `.bg-bg { background-color: var(--color-bg); }` (Tailwind-namespaced var). `[CITED: tailwindcss.com/docs/theme — "inline option, the utility class will use the theme variable value"]`
**Warning signs:** Built CSS shows `var(--color-bg)` instead of `var(--bg)` inside generated utilities.

### Pitfall 3: Token Name Collision with Existing shadcn `--color-accent`
**What goes wrong:** Adding `--color-accent: var(--accent)` to `@theme inline` overwrites shadcn's existing `--color-accent: var(--accent)` (where `--accent` is shadcn's oklch grey at line 63 of globals.css, NOT design canvas blue). Admin pages use `text-accent` and `bg-accent` from shadcn's Button/Badge variants — these would silently flip to design canvas blue.
**Why it happens:** Both systems coincidentally reuse the variable name `--accent`.
**How to avoid:** Prefix the design canvas accent token in the Tailwind namespace: `--color-mk-accent: var(--accent);`. Phases 7–11 use `bg-mk-accent`. Admin keeps `bg-accent` → shadcn's grey. Same pattern for `--accent-soft` → `--color-mk-accent-soft` and `--accent-ink` → `--color-mk-accent-ink`. **HIGH confidence; this is enforced naming hygiene.** Note that the raw `--accent` CSS variable inside `.mk` is fine because it's class-scoped and admin doesn't apply `.mk`.
**Warning signs:** Admin "Save" button color suddenly turns design canvas blue after Phase 6 lands.

### Pitfall 4: `JetBrains_Mono` Underscore Convention
**What goes wrong:** `import { JetBrains Mono } from 'next/font/google'` is invalid TypeScript. The Next.js `next/font/google` import requires the underscore form: `JetBrains_Mono`. Same applies to `Inter_Tight`.
**Why it happens:** Google Fonts shows the human-readable name with a space; the next/font docs note this convention but it's easy to miss.
**How to avoid:** Imports MUST be `import { Inter_Tight, JetBrains_Mono } from 'next/font/google'`. `[CITED: nextjs.org/docs/app/api-reference/components/font — "Use an underscore (_) for font names with multiple words. E.g. Roboto Mono should be imported as Roboto_Mono."]`
**Warning signs:** `Module '"next/font/google"' has no exported member 'JetBrains Mono'` or syntax error at the import.

### Pitfall 5: Variable Font + `weight` Parameter Behavior
**What goes wrong:** Inter Tight is a variable font, so passing a discrete `weight: ['400', '500', '600', '700']` array shadows the variable axis and limits CSS `font-weight` rendering to those exact values. For runtime `font-weight: 500` interpolation, omit weight entirely (next/font defaults to the variable axis range).
**Why it happens:** DESIGN-02 explicitly says "Inter Tight (4 weights: 400/500/600/700)" — this can be read as "specify those weights to next/font" but for variable fonts the recommendation is the inverse.
**How to avoid:** For variable fonts, OMIT `weight`. Per `[CITED: nextjs.org/docs/app/api-reference/components/font — "If loading a variable font, you don't need to specify the font weight"]`. Inter Tight ships as a variable font on Google Fonts (axis `wght 100..900`). Same for JetBrains Mono. Use:
```ts
const interTight = Inter_Tight({ subsets: ['latin', 'latin-ext', 'cyrillic'], display: 'swap', variable: '--font-inter-tight' });
```
NOT:
```ts
// AVOID — flattens to discrete 400 styles only
const interTight = Inter_Tight({ weight: ['400','500','600','700'], subsets: [...], variable: '--font-inter-tight' });
```
The DESIGN-02 wording "4 weights" describes the *visual usage* (which CSS font-weight values the design uses), not next/font configuration.
**Warning signs:** Design canvas headlines in 600 weight render at 400 weight instead, or `font-weight: 700` on h1 looks like 600.

### Pitfall 6: Cyrillic Glyph Regressions on Vercel Preview
**What goes wrong:** Local dev renders Cyrillic + Uzbek-Latin glyphs correctly because the dev machine has system fonts installed. On Vercel preview, only the next/font self-hosted woff2 subsets are available — if `'cyrillic'` is missing from the subsets array, Cyrillic content silently falls back to the OS default sans-serif.
**Why it happens:** Adding `'cyrillic'` to the subsets array increases build size, so it's tempting to skip; but Phase 5 already validates this regression gate (Slow-4G glyph-render e2e in `.planning/milestones/v1.0-RETROSPECTIVE.md`).
**How to avoid:** subsets MUST include all three: `['latin', 'latin-ext', 'cyrillic']`. The existing v1.0 layout.tsx line 21 already uses this pattern for Inter — Phase 6 carries it forward verbatim. The Phase 5 `tests/e2e/contact-glyph-render.spec.ts` e2e (per CLAUDE.md ref) is the regression gate.
**Warning signs:** На русском renders in Times New Roman; `oʻ` shows as boxes or `o'` (smart quote dropped).

### Pitfall 7: `<body className="mk">` Cascade Doesn't Reach Portal Children
**What goes wrong:** shadcn's Dialog (used by `<ContactButton>` Phase 5 dialog) renders into a portal at `document.body` via Radix. If `.mk` is applied to `<body>` itself (vs a wrapper inside `<body>`), the portal contents inherit `.mk`. If `.mk` is applied to a div inside `<body>`, portal contents do NOT inherit and design canvas tokens go missing inside the dialog.
**Why it happens:** The existing layout.tsx structure has `<body>` then RSC children including `<NextIntlClientProvider>`. Mounting `.mk` on `<body>` is the correct choice for cascade reachability.
**How to avoid:** Mount `className="mk"` on `<body>`, NOT on a child div. This puts `.mk` at the cascade root; Radix portals (which render into `document.body`) inherit. The contact dialog's design canvas styling (Phase 10 CONTACT-UI work) will then resolve `var(--bg)` etc. **MEDIUM confidence — verify in Phase 10 by visually checking the dialog body background after the dialog reskin.**
**Warning signs:** Contact dialog renders with default white background instead of `--bg #f5f3ee` after Phase 10 reskin.

### Pitfall 8: `text-accent-foreground` Usage in Admin Breaks
**What goes wrong:** None. shadcn's `--color-accent-foreground` is at line 27 of globals.css; we don't add `--color-mk-accent-foreground`. Admin's `text-accent-foreground` continues to resolve from shadcn's palette unchanged. No action needed.
**Why mentioned:** To pre-empt the worry — the namespace prefix in Pitfall 3 is sufficient to avoid all collisions.

## Code Examples

Verified patterns from official sources and target codebase.

### Example 1: next/font Declaration with Two Fonts (DESIGN-02 + D-04)

```tsx
// src/app/[locale]/layout.tsx — REPLACE the existing single Inter import
// Source: https://nextjs.org/docs/app/api-reference/components/font (Multiple Fonts + CSS Variables)
//         + existing v1.0 layout.tsx pattern (subsets array + variable opt)

import { Inter_Tight, JetBrains_Mono } from 'next/font/google';

// Variable fonts — omit `weight`. The full 100..900 axis is loaded;
// CSS font-weight: 400/500/600/700 in design canvas all resolve.
// subsets ['latin', 'latin-ext', 'cyrillic'] preserves the Phase 5 glyph-render
// e2e regression gate for Uzbek-Latin oʻ/gʻ (U+02BB) and Russian Cyrillic.
const interTight = Inter_Tight({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter-tight',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

// ... existing exports preserved ...

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const orgJsonLd = organizationJsonLd();
  const orgJsonLdHtml = JSON.stringify(orgJsonLd).replace(/</g, '\\u003c');

  return (
    <html
      lang={locale}
      className={`${interTight.variable} ${jetBrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: orgJsonLdHtml }}
        />
      </head>
      {/* D-01: .mk wrapper on body cascades to portal children too (Pitfall 7).
          REFACTOR-03 stashed: suppressHydrationWarning. */}
      <body suppressHydrationWarning className="mk">
        {/* ... existing NextIntlClientProvider + NuqsAdapter + SiteHeader + main */}
      </body>
    </html>
  );
}
```

### Example 2: `globals.css` Extension (D-02 + D-03 + D-04)

```css
/* src/app/globals.css — APPEND after the existing :root block. Do NOT modify
   shadcn's @theme inline block at lines 7-48; only ADD inside it. Do NOT
   modify the existing :root oklch tokens at lines 50-83. */

/* === Phase 6 D-02: design canvas color tokens (Tailwind v4 namespace) === */
@theme inline {
  /* ALL existing shadcn tokens stay (lines 8-47 unchanged) */
  /* ... keep shadcn block intact ... */

  /* v1.1 design canvas — surfaces */
  --color-bg:           var(--bg);
  --color-bg-2:         var(--bg-2);
  --color-surface:      var(--surface);

  /* v1.1 design canvas — text */
  --color-ink:          var(--ink);
  --color-ink-2:        var(--ink-2);
  --color-ink-3:        var(--ink-3);
  --color-ink-4:        var(--ink-4);

  /* v1.1 design canvas — borders */
  --color-line:         var(--line);
  --color-line-2:       var(--line-2);
  --color-line-soft:    var(--line-soft);

  /* v1.1 design canvas — accent (PREFIXED `mk-` to avoid collision with shadcn --color-accent) */
  --color-mk-accent:        var(--accent);
  --color-mk-accent-soft:   var(--accent-soft);
  --color-mk-accent-ink:    var(--accent-ink);

  /* v1.1 design canvas — semantic */
  --color-warn:         var(--warn);
  --color-ok:           var(--ok);
}

/* === Phase 6 D-01: raw token definitions scoped to .mk wrapper === */
.mk {
  /* Surfaces */
  --bg: #f5f3ee;
  --bg-2: #ebe8e1;
  --surface: #ffffff;
  /* Text */
  --ink: #14161b;
  --ink-2: #3a3d44;
  --ink-3: #74777e;
  --ink-4: #a7a9af;
  /* Borders */
  --line: #e5e1d8;
  --line-2: #d6d2c8;
  --line-soft: #efece5;
  /* Accent */
  --accent: #1240e5;
  --accent-soft: #e8edff;
  --accent-ink: #0926a8;
  /* Semantic */
  --warn: #b8531a;
  --ok: #1d7a4f;

  /* D-04: alias next/font CSS variables to design canvas names */
  --font: var(--font-inter-tight);
  --mono: var(--font-jetbrains-mono);

  /* Body styling — verbatim from idea/styles.css line 34 */
  font-family: var(--font);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.011em;
}
.mk *, .mk *::before, .mk *::after { box-sizing: border-box; }

/* === Phase 6 D-03: helper classes ported VERBATIM from idea/styles.css === */
.mk-mono { font-family: var(--mono); letter-spacing: 0; }
.mk-eyebrow { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--ink-3); }

/* product placeholder */
.mk-ph {
  background:
    repeating-linear-gradient(135deg, rgba(20,22,27,0.04) 0 1px, transparent 1px 11px),
    var(--surface);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 10.5px; color: var(--ink-3);
  text-align: center; position: relative;
  padding: 12px;
}
.mk-ph-corners::before, .mk-ph-corners::after {
  content: ''; position: absolute; width: 10px; height: 10px;
  border: 1px solid var(--ink-3);
}
.mk-ph-corners::before { top: 8px; left: 8px; border-right: none; border-bottom: none; }
.mk-ph-corners::after { bottom: 8px; right: 8px; border-left: none; border-top: none; }

/* btn */
.mk-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font); font-weight: 500; font-size: 14px;
  padding: 11px 18px; border-radius: 999px;
  border: 1px solid var(--ink); background: var(--ink); color: #fff;
  cursor: pointer; transition: all .15s; letter-spacing: -0.005em;
}
.mk-btn-primary { background: var(--accent); border-color: var(--accent); }
.mk-btn-ghost { background: transparent; color: var(--ink); }
.mk-btn-light { background: var(--surface); color: var(--ink); border-color: var(--line); }
.mk-btn-sm { padding: 8px 14px; font-size: 13px; }

/* tag */
.mk-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 10.5px;
  padding: 4px 9px; border-radius: 999px;
  border: 1px solid var(--line-2); background: var(--surface); color: var(--ink-2);
  letter-spacing: 0.04em; text-transform: uppercase;
}
.mk-tag-solid { background: var(--ink); color: #fff; border-color: var(--ink); }
.mk-tag-accent { background: var(--accent-soft); color: var(--accent-ink); border-color: var(--accent-soft); }

/* divider with caps */
.mk-rule { height: 1px; background: var(--line); }

/* mini sparkline grid bg */
.mk-dotgrid {
  background-image: radial-gradient(rgba(20,22,27,0.08) 1px, transparent 1px);
  background-size: 18px 18px;
}
```

**Note on omissions:** the `idea/styles.css` `@import` of Google Fonts (line 2) is intentionally NOT ported — next/font supplants it. The `:root { ... }` block in idea/styles.css (lines 4-32) is intentionally NOT mirrored to `:root` — the tokens land inside `.mk` per D-01 to keep admin scope clean. The `.adm` admin reset (line 85) is also omitted — admin uses shadcn's existing theme.

### Example 3: `<Gauge>` Component Skeleton (DESIGN-04)

```tsx
// src/components/public/gauge.tsx
// TypeScript port of idea/gauge.jsx (62 lines). Pure RSC — no client interactivity.
// Used by HOME-02 (home hero) and PDP-02 (product detail full-bleed).

export interface GaugeProps {
  size?: number;
  value?: number;
  max?: number;
  unit?: string;
  label?: string;
  dangerThreshold?: number;
  theme?: 'light' | 'dark';
}

export function Gauge({
  size = 280,
  value = 6.4,
  max = 10,
  unit = 'MPa',
  label = 'PRESSURE',
  dangerThreshold = 8,
  theme = 'light',
}: GaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const startA = 135;
  const endA = 405;
  const sweep = endA - startA;
  const angleFor = (v: number) => startA + (v / max) * sweep;
  const polar = (a: number, rad: number): [number, number] => {
    const t = (a * Math.PI) / 180;
    return [cx + Math.cos(t) * rad, cy + Math.sin(t) * rad];
  };

  const dark = theme === 'dark';
  const face = dark ? '#1d1f24' : '#fafaf7';
  const ring = dark ? '#2a2c32' : '#14161b';
  const tickC = dark ? '#a7a9af' : '#14161b';
  const tickMinor = dark ? '#4a4c52' : '#a7a9af';
  const txt = dark ? '#f5f3ee' : '#14161b';
  const dim = dark ? '#a7a9af' : '#74777e';
  const accent = '#1240e5';

  const els: React.ReactNode[] = [];
  const N = 11;
  const m = 5;
  for (let i = 0; i < N; i++) {
    const v = (i / (N - 1)) * max;
    const a = angleFor(v);
    const [x1, y1] = polar(a, r);
    const [x2, y2] = polar(a, r - size * 0.06);
    const isD = v >= dangerThreshold;
    els.push(
      <line key={`M${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isD ? accent : tickC} strokeWidth={1.8} />
    );
    const [tx, ty] = polar(a, r - size * 0.115);
    els.push(
      <text key={`N${i}`} x={tx} y={ty} fill={isD ? accent : txt}
        fontFamily="JetBrains Mono" fontSize={size * 0.05} fontWeight={600}
        textAnchor="middle" dominantBaseline="central">{Math.round(v)}</text>
    );
    if (i < N - 1) {
      for (let j = 1; j < m; j++) {
        const vm = v + (j / m) * (max / (N - 1));
        const am = angleFor(vm);
        const [a1, b1] = polar(am, r);
        const [a2, b2] = polar(am, r - size * 0.022);
        els.push(
          <line key={`m${i}${j}`} x1={a1} y1={b1} x2={a2} y2={b2}
            stroke={tickMinor} strokeWidth={0.8} />
        );
      }
    }
  }

  const [dx1, dy1] = polar(angleFor(dangerThreshold), r + 4);
  const [dx2, dy2] = polar(angleFor(max), r + 4);
  const dArc = `M ${dx1} ${dy1} A ${r + 4} ${r + 4} 0 0 1 ${dx2} ${dy2}`;
  const nA = angleFor(Math.min(value, max));
  const [nx, ny] = polar(nA, r - size * 0.07);
  const [tlx, tly] = polar(nA + 180, size * 0.04);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      data-testid="gauge"
    >
      <circle cx={cx} cy={cy} r={r + size * 0.05} fill="none" stroke={ring} strokeWidth={size * 0.01} />
      <circle cx={cx} cy={cy} r={r + size * 0.022} fill={face} stroke={ring} strokeWidth={1} />
      <path d={dArc} stroke={accent} strokeWidth={size * 0.014} fill="none" />
      {els}
      <text x={cx} y={cy - size * 0.13} textAnchor="middle"
        fontFamily="JetBrains Mono" fontSize={size * 0.04} fill={dim} letterSpacing="0.18em">{label}</text>
      <text x={cx} y={cy + size * 0.18} textAnchor="middle"
        fontFamily="JetBrains Mono" fontSize={size * 0.045} fill={dim} letterSpacing="0.14em">{unit}</text>
      <line x1={tlx} y1={tly} x2={nx} y2={ny} stroke={accent} strokeWidth={size * 0.016} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={size * 0.038} fill={ring} />
      <circle cx={cx} cy={cy} r={size * 0.016} fill={accent} />
    </svg>
  );
}
```

### Example 4: `<ProductCard>` v1.1 Reskin (REUSE-01)

```tsx
// src/components/public/product-card.tsx — IN-PLACE REPLACEMENT (props unchanged).
// Tokens cascade from .mk on body; safe to use bg-surface / text-ink / border-line directly.

import { CldImage } from 'next-cloudinary';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/lib/metadata';

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

export function ProductCard({ product, locale }: ProductCardProps) {
  return (
    <article
      className="group/product-card overflow-hidden bg-surface border border-line"
      data-testid="product-card"
    >
      <Link href={`/products/${product.slug}`} locale={locale} className="block">
        {/* Image area: 1:1 per design canvas (existing was 4:3; planner may
            keep 4:3 if PLP-08 confirms 4:3 in Phase 8). */}
        <div className="relative aspect-square w-full">
          {product.heroPublicId ? (
            <CldImage
              src={product.heroPublicId}
              alt={product.name}
              width={400}
              height={400}
              loading="lazy"
              sizes="(max-width: 900px) 50vw, 33vw"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="mk-ph mk-ph-corners h-full w-full">
              {/* design canvas no-image affordance */}
              {product.sku ? `${product.sku}` : '—'}
            </div>
          )}
          {/* mono SKU overlay top-right per design canvas */}
          {product.sku ? (
            <div className="absolute top-2 right-2 mk-mono text-[10.5px] text-ink-3 tracking-wider">
              {product.sku}
            </div>
          ) : null}
        </div>
        <div className="space-y-1.5 p-4">
          {product.manufacturerName ? (
            <div className="mk-eyebrow">{product.manufacturerName}</div>
          ) : null}
          <h3 className="text-base font-medium text-ink line-clamp-2">{product.name}</h3>
          {product.shortDesc ? (
            <p className="text-xs text-ink-2 line-clamp-2">{product.shortDesc}</p>
          ) : null}
          <div className="pt-2 text-sm text-mk-accent flex items-center gap-1.5">
            Browse <span aria-hidden>→</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
```

**Decision the planner must encode:** is the aspect ratio 1:1 (design canvas) or 4:3 (existing v1.0)? Pin 1:1 since CONTEXT.md REUSE-01 says "image area (1:1 aspect, hairline border, mono SKU overlay)". The existing v1.0 is 4:3 — Phase 6 changes to 1:1 to satisfy REUSE-01.

### Example 5: `<KeyFactsRibbon>` v1.1 Reskin (REUSE-02)

```tsx
// src/components/public/key-facts-ribbon.tsx — IN-PLACE REPLACEMENT (props unchanged).

export interface KeyFact {
  label: string;
  value: string;
}

export interface KeyFactsRibbonProps {
  facts: KeyFact[];
}

export function KeyFactsRibbon({ facts }: KeyFactsRibbonProps) {
  if (facts.length === 0) return null;
  // Variant grid handling — array length drives column count:
  //   3 facts → 3-col (service page)
  //   4 facts → 2-col mobile / 4-col desktop (home, PDP)
  //   5+      → 6-col (existing 6-tile PDP fallback)
  const cols =
    facts.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' :
    facts.length === 4 ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4' :
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <div className={`grid ${cols} gap-3`} data-testid="key-facts-ribbon">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="bg-surface border border-line px-4 py-3"
        >
          <div className="mk-eyebrow">{fact.label}</div>
          <div className="mk-mono mt-1 text-base font-semibold text-ink">{fact.value}</div>
        </div>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.ts` `theme.extend.colors` | `@theme inline { --color-X: ...}` in CSS | Tailwind v4 (Jan 2025) | The repo has NO `tailwind.config.ts`; Phase 6 token work happens entirely in `globals.css`. |
| `middleware.ts` at project root | `proxy.ts` (Next 16, can be at `src/proxy.ts` when src/ is source root) | Next.js 16 (late 2025) | REFACTOR-01 codifies the move; existing top-level proxy.ts is the v1.0-shipped Next 16 file convention, the move to src/proxy.ts is purely organizational. |
| t3-env `runtimeEnv: { server + client }` | t3-env `experimental__runtimeEnv: { client only }` | @t3-oss/env-nextjs 0.10+ | REFACTOR-02 codifies the migration; prevents server-only env vars from inlining `undefined` into client chunks. |
| `<link href="https://fonts.googleapis.com/...">` | `next/font/google` self-hosting | Next.js 13.2 (2023) | Already in use for v1.0 Inter; Phase 6 just adds two more fonts following the same pattern. |
| Plain `@theme { ... }` (without inline) | `@theme inline { ... }` for variable-driven utilities | Tailwind v4 docs current | REQUIRED for D-01's class-scoping (Pattern 2 above). |

**Deprecated/outdated:**
- `JetBrainsMono` (no underscore) import — invalid; use `JetBrains_Mono`.
- Inter Tight `weight: ['400','500','600','700']` array — flattens variable axis; omit weight for variable fonts.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Inter Tight is a variable font on Google Fonts with 100..900 axis | Pitfall #5 | If non-variable, must specify `weight: ['400','500','600','700']` array — adds 4 woff2 files per subset. Verify on `fonts.google.com/specimen/Inter+Tight` during plan; the WebFetch attempts during research returned only page titles. **Mitigation:** Either path works; the `weight` array form is a 2-character edit. |
| A2 | JetBrains Mono is a variable font on Google Fonts with 100..800 axis | Pitfall #5 | Same as A1. JetBrains Mono is widely known to ship as variable, but unverified in this session. |
| A3 | `src/proxy.ts` is auto-discovered by Next.js 16 when `src/` is the source root | Stash Application Plan §3 | If Next 16 only resolves `proxy.ts` at the literal project root, REFACTOR-01 breaks the build. Existing `next.config.ts` comments at lines 11-15 strongly suggest src/proxy.ts works (the comment specifically warns about the project root walking up to a sibling `package-lock.json`, which only matters if src/ resolution is in play). **Mitigation:** First step in Phase 6 verification is `pnpm build`; if it fails with "no proxy found", revert REFACTOR-01 (keep proxy.ts at root with the env+contact-form tweaks applied). |
| A4 | Radix portals from `<ContactButton>` Dialog inherit from `<body>` cascade | Pitfall #7 | If the portal root is `document.documentElement` instead, `.mk` on `<body>` doesn't reach. Verify in Phase 10 dialog reskin; only impacts that downstream phase, not Phase 6 itself. |
| A5 | `idea/styles.css` `.mk-*` helper classes have no selector collision with shadcn admin | Pattern §Don't Hand-Roll | shadcn classes are utility (`bg-card`, `border-input`) or component (`Button`, `Badge`); `.mk-*` is a custom prefix. **HIGH confidence — verified by grep:** zero `mk-` prefix in shadcn package CSS. **Effectively VERIFIED**, kept as A5 for transparency. |

**Mitigation philosophy:** assumptions A1, A2, A4 are low-risk because each has a 1-line fallback; A3 has a 1-commit fallback (revert REFACTOR-01). None block planning.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next 16 build | ✓ | 22.10.2 (@types) — runtime ≥ 18.18 required | — |
| pnpm | Lockfile-pinned package manager | ✓ | 10.33.0 (`packageManager` field) | — |
| Next.js | App Router | ✓ | 16.2.4 | — |
| Tailwind CSS | `@theme inline` directive | ✓ | 4.2.3 (installed) / 4.2.4 (current) | — |
| @tailwindcss/postcss | PostCSS plugin | ✓ | 4.2.3 | — |
| Internet (Google Fonts) | next/font/google build-time fetch | ✓ (assumed; build infra) | — | next/font/local with self-hosted woff2 if Google Fonts CDN is blocked |
| Vitest | Unit test runner | ✓ | 4.1.4 | — |
| Playwright | e2e + future VRT | ✓ | 1.59.1 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. All Phase 6 tooling is already in `package.json`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (unit) + Playwright 1.59.1 (e2e) |
| Config file | `vitest.config.ts` (existing) + `playwright.config.ts` (existing) |
| Quick run command | `pnpm typecheck && pnpm test` |
| Full suite command | `pnpm test:all` (vitest + playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01 (token presence) | Every required CSS variable appears in globals.css | unit (grep-style) | `pnpm vitest run src/app/__tests__/globals-tokens.test.ts` | ❌ Wave 0 |
| DESIGN-01 (utility compilation) | `bg-bg`, `text-ink-2`, `border-line`, `bg-mk-accent` compile into the production CSS bundle | smoke build | `pnpm build && grep -E "(bg-bg|text-ink-2|border-line|bg-mk-accent)" .next/static/css/*.css` | ❌ Wave 0 (a small bash verification step in plan) |
| DESIGN-02 (font loading + cyrillic glyph) | Inter Tight + JetBrains Mono load on `/[locale]` page; Cyrillic + Uzbek-Latin glyphs render | e2e (Playwright) — extend existing Phase 5 `contact-glyph-render.spec.ts` to cover home page | `pnpm playwright test contact-glyph-render` | ✓ exists (Phase 5); extend |
| DESIGN-02 (FOIT) | `<link rel="preload" as="font">` injected into head | unit (RSC layout snapshot) | `pnpm vitest run src/app/[locale]/__tests__/layout.test.tsx` | ❌ Wave 0 |
| DESIGN-03 (mk class mounted) | `<body className="mk">` on every public route | unit (snapshot) | same as DESIGN-02 layout test | ❌ Wave 0 |
| DESIGN-04 (Gauge renders) | `<Gauge>` SVG renders with correct viewBox + 11 ticks + needle path | unit (RTL render) | `pnpm vitest run src/components/public/__tests__/gauge.test.tsx` | ❌ Wave 0 |
| REUSE-01 (ProductCard props unchanged + no commerce) | TypeScript signature unchanged; rendered HTML contains no "₽"/"$"/"sum"/"qty" tokens | unit (RTL + grep) | `pnpm vitest run src/components/public/__tests__/product-card.test.tsx` | ❌ Wave 0 (replace existing slate-themed test) |
| REUSE-02 (KeyFactsRibbon variants) | Renders correct grid columns for `facts.length` of 3 / 4 / 6 | unit (RTL) | `pnpm vitest run src/components/public/__tests__/key-facts-ribbon.test.tsx` | ❌ Wave 0 |
| REUSE-03 (no v1-1 folder created if in-place chosen) | path check only | smoke (file existence assertion) | `test ! -d src/components/public/v1-1` | inline in CI step |
| REFACTOR-01 (proxy.ts moved) | `src/proxy.ts` exists and passes `pnpm build`; root `proxy.ts` does not exist | smoke (file existence + build) | `test -f src/proxy.ts && test ! -f proxy.ts && pnpm build` | inline |
| REFACTOR-02 (env hardening) | t3-env validation passes at server boot; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` inlined into client bundle | unit + smoke | `pnpm typecheck && pnpm build && grep TURNSTILE_SITE_KEY .next/static/chunks/*.js` | inline |
| REFACTOR-03 (contact-form roundtrip) | Phase 5 contact e2e still passes after stash apply | e2e (Phase 5 contract) | `pnpm playwright test contact` | ✓ exists |
| Phase Success Criterion #4 (`tsc --noEmit` exit 0) | Full repo type-checks | smoke | `pnpm typecheck` (alias for `tsc --noEmit`) | ✓ exists |

### Sampling Rate

- **Per task commit:** `pnpm typecheck` (≤ 30s; gates Success Criterion #4 directly).
- **Per wave merge:** `pnpm typecheck && pnpm test && pnpm build` (≤ 5 min; gates token-utility compilation + RSC layout snapshot + ProductCard/Gauge unit tests).
- **Phase gate:** Full `pnpm test:all` (vitest + playwright) green before `/gsd-verify-work`. Specifically must include: contact-form e2e (REFACTOR-03 regression), glyph-render e2e (DESIGN-02 Cyrillic + Uzbek-Latin gate), home page layout snapshot (DESIGN-03 `.mk` mount).

### Wave 0 Gaps

- [ ] `src/app/__tests__/globals-tokens.test.ts` — verifies presence + uniqueness of all 14 D-02 design canvas color tokens AND all 12 D-03 helper class selectors in `src/app/globals.css`. Reads file as text + asserts string presence + asserts no duplicate definitions.
- [ ] `src/app/[locale]/__tests__/layout.test.tsx` — RSC unit test (Vitest + RTL with renderToString) verifying `<html>` carries both font CSS variable classes AND `<body>` carries `className="mk"`. (Mock next-intl + Auth.js + Cloudinary as already done in existing Phase 3/5 unit tests.)
- [ ] `src/components/public/__tests__/gauge.test.tsx` — RTL render of `<Gauge size={280} value={5} max={10} />` asserting (1) `<svg viewBox="0 0 280 280">`, (2) at least 11 `<line>` elements with stroke="#14161b" or stroke="#1240e5" (major ticks), (3) one `<path>` element (danger arc), (4) needle line is present.
- [ ] `src/components/public/__tests__/product-card.test.tsx` — REPLACE the existing slate-themed test. Asserts (1) props interface unchanged, (2) renders `mk-eyebrow` class for manufacturer label, (3) renders `mk-ph mk-ph-corners` for missing heroPublicId, (4) NO occurrences of "price"/"sum"/"qty"/"добавить"/"add to" in rendered HTML (commerce-strip guard from CLAUDE.md guardrail).
- [ ] `src/components/public/__tests__/key-facts-ribbon.test.tsx` — RTL render of 3 / 4 / 6 fact arrays asserting the correct `grid-cols-*` class is on the wrapper.
- [ ] **OPTIONAL** `src/app/design/page.tsx` — disposable `/design` smoke route that renders `<Gauge>`, `<ProductCard>` (with mock product), `<KeyFactsRibbon>` (with 3 + 4 + 6 fact arrays), all inside the `.mk` cascade. Provides quick visual confirmation without a Storybook dependency. **Recommended** for Phase 6; can stay until Phase 11 VRT lands or be deleted at phase close — planner's call.
- [ ] **REGRESSION GATE — no new file:** extend existing `tests/e2e/contact-glyph-render.spec.ts` (Phase 5) to also visit `/{locale}` and assert Cyrillic + `oʻ` glyph rendering. Ensures Phase 6 next/font swap doesn't regress the Phase 5 glyph-render gate.

## Security Domain

> Phase 6 is a CSS / typography / SVG / file-rename phase. No auth changes, no input handling beyond what Phase 5 already validates, no external API surface introduced. Pre-existing security envelope is preserved verbatim.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth.js v5 magic-link gate untouched (REFACTOR-01 only moves the file path) |
| V3 Session Management | no | D-15 dual session cap untouched; proxy.ts logic identical post-move |
| V4 Access Control | no | `requireAdmin()` wrapper untouched |
| V5 Input Validation | partial — REFACTOR-03 contact-form change | Existing Zod schema (`contactInsertSchema`) unchanged; only the env-var read source changes (`env.X` → `process.env.X!`). Same value, different access pattern. |
| V6 Cryptography | no | No crypto in scope |
| V14 Configuration | yes | REFACTOR-02 t3-env hardening tightens client/server env-var isolation — eliminates a class of "server env leaked to client bundle" vulnerabilities |

### Known Threat Patterns for next/font + Tailwind + RSC

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| External font CDN (Google Fonts hot link) — privacy + GDPR + outage risk | Information Disclosure (referrer to fonts.googleapis.com leaks visitor IP to Google) | next/font/google self-hosting — fonts shipped from same origin, no Google network request at runtime `[CITED: nextjs.org/docs/app/api-reference/components/font — "No requests are sent to Google by the browser"]` |
| Server env var leakage into client bundle (process.env.AUTH_SECRET inlined) | Information Disclosure | t3-env `experimental__runtimeEnv` (REFACTOR-02) — only `NEXT_PUBLIC_*` keys are listed for client-side access; server keys are read directly from `process.env` and never reach the bundler's static replacement step |
| Tailwind utility purge stripping critical security CSS (e.g. honeypot off-screen styling) | Tampering | Phase 5 already mitigated via INLINE style on `field_extra` honeypot (contact-form.tsx lines 53-68 `HONEYPOT_STYLE`) — Phase 6 changes nothing here |
| dangerouslySetInnerHTML for JSON-LD | XSS | Phase 3 already mitigated via `JSON.stringify(...).replace(/</g, '\\u003c')` (layout.tsx lines 60-61) — Phase 6 preserves this verbatim |

## Project Constraints (from CLAUDE.md)

The planner MUST honor these non-negotiables when authoring tasks:

1. **Strict TypeScript** — no `any` without justification; all new components must declare `interface XProps`.
2. **No backend changes** — Drizzle schema, Server Actions, Auth.js, Resend, Cloudinary signing, search index ALL untouched.
3. **No commerce affordances** — REUSE-01 ProductCard MUST NOT introduce price / qty / stock / "Add to cart" / "Add to order"; the v1.0 implementation is already commerce-free, and the reskin must preserve that.
4. **Trilingual content model untouched** — no schema changes; no `_ru`/`_en`/`_uz` columns; no JSONB translation bags. (Phase 6 doesn't touch DB at all, but the guardrail is restated here so the planner cannot accidentally schedule a translation-related side task.)
5. **Admin shadcn theme intact** — D-01's `.mk` scope ONLY applies to `src/app/[locale]/layout.tsx`. The admin layout (`src/app/[locale]/admin/layout.tsx`) MUST NOT add `className="mk"`.
6. **Server Actions cache invalidation** — N/A for Phase 6 (no Server Actions added or modified).
7. **Cloudinary contract** — DB stores `public_id` only; `<CldImage>` continues to be the public-image primitive. Reskinned ProductCard preserves this.
8. **GSD workflow enforcement** — all file changes go through phase tasks; no direct edits outside the planned scope.
9. **`requireAdmin()` wrapper** — N/A for Phase 6 (no admin Server Actions in scope).
10. **`audit_log` writes** — N/A for Phase 6 (no mutations).
11. **Variable fonts**: Inter Tight + JetBrains Mono are variable; do NOT specify `weight` (Pitfall #5).
12. **Token namespace prefix**: design canvas accent token MUST be exposed as `--color-mk-accent` in Tailwind theme to avoid collision with shadcn's `--color-accent` (Pitfall #3).

## Open Questions

1. **Does Next.js 16 auto-discover `src/proxy.ts` when `src/` is the source root?**
   - What we know: existing `next.config.ts` lines 11-15 explicitly comment that the file resides at the project root (Phase-1 placement). The repo uses `src/` for app code. Next.js 16's middleware-renamed-to-proxy convention is undocumented for src/ placement explicitly.
   - What's unclear: Whether the auto-discovery works at `src/proxy.ts` without a `next.config.ts` rewrite. The stash author clearly believed it works (else they wouldn't have committed the deletion).
   - Recommendation: First Phase 6 task after stash apply is `pnpm build`. If it fails with "no proxy.ts found", the planner has two options: (a) revert REFACTOR-01, keeping proxy.ts at root with env+contact-form tweaks; (b) add explicit configuration to next.config.ts pointing to src/proxy.ts. Option (a) is the safer fallback.

2. **ProductCard image aspect ratio: 1:1 (design canvas) vs 4:3 (existing v1.0)?**
   - What we know: REUSE-01 says "image area (1:1 aspect)"; v1.0 product-card.tsx ships 4:3.
   - What's unclear: Whether the existing v1.0 grid container was authored with 4:3 in mind such that 1:1 would break grid alignment. PLP-08 (Phase 8) rebuilds the grid container; once Phase 8 lands, 1:1 will look correct.
   - Recommendation: Pin 1:1 per REUSE-01 verbatim. If Phase 8 hasn't reskinned the catalog grid yet, the catalog page will visually shift to "tall" cards mid-milestone — acceptable per the explicit visual-drift acknowledgment in CONTEXT.md "Component migration boundary."

3. **Should the `/design` smoke route ship to production or be dev-only?**
   - What we know: It's the only Phase 6 visual confirmation gate before VRT lands in Phase 11.
   - What's unclear: Whether to gate it via `if (process.env.NODE_ENV !== 'production') notFound()` or leave it discoverable.
   - Recommendation: Production-discoverable but unlinked + `noindex` meta. Useful for stakeholder review pre-Phase-7-chrome. Delete in Phase 11 closure when VRT covers the surface.

## Sources

### Primary (HIGH confidence)
- `nextjs.org/docs/app/api-reference/components/font` (Next 16.2.4, dated 2026-05-06) — full `next/font/google` API including subsets, variable, display:swap, multi-font usage with CSS variables `[CITED]`
- `tailwindcss.com/docs/theme` — `@theme inline` directive semantics + scoped CSS variable resolution behavior `[CITED]`
- `idea/styles.css` (project file, lines 1-93) — verbatim source for D-03 `.mk-*` helpers + D-01 raw token values `[VERIFIED via Read tool]`
- `idea/gauge.jsx` (project file, lines 1-65) — DESIGN-04 visual reference + JS-to-TS port source `[VERIFIED via Read tool]`
- `git stash show -p stash@{0}` — REFACTOR-01..03 source-of-truth diff `[VERIFIED via Bash tool]`
- `package.json` — pinned versions for Next 16.2.4, Tailwind 4.2.3, React 19.1.0, TypeScript 5.7.3 `[VERIFIED via Read tool]`
- `src/app/[locale]/layout.tsx` (existing v1.0) — proven `subsets: ['latin','latin-ext','cyrillic']` pattern with Inter `[VERIFIED via Read tool]`

### Secondary (MEDIUM confidence)
- `next.config.ts` lines 11-15 (project file) — comment indicates Next.js 16's proxy.ts file resolution behavior with src/ source root works correctly when turbopack.root is pinned `[VERIFIED via Bash tool]`
- `npm view tailwindcss version` → 4.2.4 — version currency check `[VERIFIED via Bash tool]`

### Tertiary (LOW confidence — flagged for verification during plan)
- A1 + A2 (Inter Tight + JetBrains Mono variable-font status on Google Fonts) — WebFetch returned only page titles. Mitigation: planner verifies in plan task or accepts that variable-vs-non-variable is a 2-character config edit if wrong.
- A3 (Next.js 16 src/proxy.ts auto-discovery) — inferred from next.config.ts comment + stash author intent; verified at first build.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every required package is already in `package.json`; no new installs.
- Architecture (Tailwind v4 + class-scoping + next/font): HIGH — pattern documented in official Tailwind + Next.js docs and exercised in v1.0 codebase already.
- Pitfalls: HIGH — Pitfalls #1 (stash-deletion-only), #3 (token namespace collision), #5 (variable font weight), #6 (Cyrillic glyph regression) all observed in code or in source diff. Pitfall #7 (portal cascade) is MEDIUM — needs Phase 10 verification, doesn't block Phase 6 itself.
- Gauge component port: HIGH — direct line-by-line TypeScript translation of a 62-line JS file; geometry constants are explicit.
- Refactor stash: HIGH for env.ts + contact-form.tsx + layout.tsx (diff is precise); MEDIUM for proxy.ts move (Open Question #1 mitigated by fallback path).
- Validation architecture: HIGH — every required test file is named, owner identified, and acceptance criterion stated.

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (30 days; design tokens, font choices, refactor diff are stable inputs; only Tailwind v4 minor updates could shift utility behavior, and 4.2.x is patch-level stable).
