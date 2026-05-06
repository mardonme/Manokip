# Phase 6: Design System Foundation + Refactor — Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the v1.1 design system (tokens + Inter Tight/JetBrains Mono fonts + reusable `<Gauge>`, `<ProductCard>`, `<KeyFactsRibbon>` components) and apply the stashed v1.1-wip refactor (`stash@{0}`) so phases 7–11 build on a stable foundation.

**In scope:** DESIGN-01..04, REUSE-01..03, REFACTOR-01..03 (10 requirements, per ROADMAP.md).
**Out of scope:** Site chrome (Phase 7), page templates (Phases 8–10), VRT (Phase 11), backend changes (locked guardrail), admin redesign, mobile pixel-perfect, dark mode toggle.

</domain>

<decisions>
## Implementation Decisions

### Token Integration

- **D-01 (Token scope):** Design canvas tokens are scoped via the `.mk` class wrapping `src/app/[locale]/layout.tsx` (public root). Admin layout (`src/app/[locale]/admin/`) keeps shadcn/ui's existing oklch theme untouched. DESIGN-03 satisfied via this global `mk` class.
- **D-02 (Tailwind surface):** Design canvas tokens are registered as Tailwind v4 `@theme inline` entries in `src/app/globals.css` so utilities are generated: `bg-bg`, `bg-bg-2`, `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `border-line`, `border-line-2`, `border-line-soft`, `bg-accent`, `bg-accent-soft`, `text-accent-ink`, `text-warn`, `text-ok`. Phases 7–11 author components with these utilities.
- **D-03 (Design canvas helper classes):** The `.mk-*` helper classes from `idea/styles.css` (`.mk`, `.mk-mono`, `.mk-eyebrow`, `.mk-btn`, `.mk-btn-primary`, `.mk-btn-ghost`, `.mk-btn-light`, `.mk-btn-sm`, `.mk-tag`, `.mk-tag-solid`, `.mk-tag-accent`, `.mk-ph`, `.mk-ph-corners`) port **verbatim** into `src/app/globals.css`. Lossless fidelity to design canvas; phases 7–11 use them directly for design-canvas idioms (eyebrows, tag chips, placeholders).
- **D-04 (Font CSS variables):** `next/font` outputs are aliased to `--font` and `--mono` inside the `.mk` scope. Inter Tight is loaded with `variable: '--font-inter-tight'`; JetBrains Mono with `variable: '--font-jetbrains-mono'`. Globals.css sets `.mk { --font: var(--font-inter-tight); --mono: var(--font-jetbrains-mono); ... }` so the verbatim-ported `.mk-mono` and `.mk-eyebrow` helpers work without rewrite.

### Claude's Discretion

The following gray areas were not selected for discussion and may be resolved by the researcher/planner using the existing patterns in the codebase:

- **Component migration boundary (REUSE-03):** New `src/components/public/v1-1/` folder vs in-place replacement of existing `src/components/public/{product-card,key-facts-ribbon}.tsx`. Planner should weigh blast radius on Phase 3/4 consumers (catalog grid, used-in widget, manufacturer pages) — pages will visually drift mid-milestone if reskinned in-place before phases 8/9 rebuild containers. Reasonable default: keep the existing file path (single SoT, no duplicates) but freeze Phase 3 sketch-003 styling decisions can be removed cleanly because tokens are class-scoped.
- **Gauge component implementation (DESIGN-04):** Hand-written SVG matching `idea/gauge.jsx` is the expected default (no library dep, full control over technical-callout annotations). Configurable props: `size`, `value`, `max`, `unit`, `label`, `dangerThreshold`.
- **Font loading variant vs static:** Either acceptable provided FOIT is eliminated and Cyrillic + Latin-ext subsets render Uzbek-Latin `oʻ`/`gʻ` (U+02BB) and Cyrillic glyphs correctly. Variable fonts via `next/font/google` is the lower-friction default; switch to self-hosted `next/font/local` only if a Cyrillic glyph regression appears on Vercel preview.
- **Refactor stash sequencing (REFACTOR-01..03):** Apply `stash@{0}` early in Phase 6 (before token + component work) to clear structural changes (proxy.ts move, env.ts hardening) and avoid merge friction with later token edits to `layout.tsx`. The stash already touches `layout.tsx` and `contact-form.tsx` — applying it first prevents conflicts when adding `className="mk"` to layout.tsx during D-01 implementation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Canvas (source of truth for tokens + helpers + component shapes)
- `idea/styles.css` — Source of every CSS variable in D-01..D-04 and every helper class in D-03. Port verbatim where called out.
- `idea/design-canvas.jsx` — Reference component composition + usage patterns
- `idea/gauge.jsx` — Visual target for the `<Gauge>` SVG component (DESIGN-04 / REUSE)
- `idea/home.jsx`, `idea/product.jsx`, `idea/catalog.jsx`, `idea/chrome.jsx`, `idea/service.jsx`, `idea/misc.jsx` — Surfaces that consume the Phase 6 components in phases 7–11

### Project planning
- `.planning/REQUIREMENTS.md` — DESIGN-01..04, REUSE-01..03, REFACTOR-01..03 (Phase 6's 10 requirements with full acceptance criteria)
- `.planning/ROADMAP.md` §Phase 6 — Goal, depends-on, requirements list, 4 success criteria
- `.planning/PROJECT.md` — Vision, locked guardrails (no commerce affordances, trilingual untouched), tech stack
- `.planning/STATE.md` — Pending decisions (brand wordmark, contact metadata, industry taxonomy) that do NOT block Phase 6 component shape

### Codebase touchpoints
- `src/app/globals.css` — Existing shadcn/ui `@theme inline` block + `:root` oklch tokens; D-01..D-04 extend this file
- `src/app/[locale]/layout.tsx` — Public root layout; D-01 mounts `className="mk"` here. Stash@{0} also tweaks this file (apply stash first per D-claude-discretion).
- `src/components/public/product-card.tsx` — Existing v1.0 ProductCard (already commerce-free, sketch-003 slate/blue palette)
- `src/components/public/key-facts-ribbon.tsx` — Existing v1.0 KeyFactsRibbon (already array-driven `[{label, value}]`)
- `src/components/public/recipe-card.tsx`, `src/components/public/industry-card.tsx`, `src/components/public/manufacturer-card.tsx` — Adjacent cards consumed by the same surfaces; visual cohesion expected
- `src/env.ts` — REFACTOR-02 target (hardening from stash)
- `proxy.ts` (top-level) — REFACTOR-01 target; moves to `src/proxy.ts` per stash
- `src/components/public/contact-form.tsx` — REFACTOR-03 target (stashed tweaks)
- `stash@{0}: v1.1-wip: proxy.ts move into src/ + env/layout/contact-form tweaks` — 4 files / 19 insertions / 138 deletions; the canonical source of REFACTOR-01..03 changes

### Locked guardrails (carry from v1.0)
- Commerce affordances (price / stock / qty / "Add to order") **stripped** on every component — REUSE-01 enforces for ProductCard
- Trilingual content model untouched (sibling `*_translations` tables; no JSONB bags; no `_ru`/`_en`/`_uz` columns)
- Single contact-form CTA wired to existing Phase 5 `<ContactButton>` dialog

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/public/product-card.tsx`** — Already commerce-free (no price / cart / qty); needs visual reskin only. Props interface (`product: { id, name, slug, shortDesc, heroPublicId, manufacturerName, sku }`, `locale`) is stable and matches REUSE-01.
- **`src/components/public/key-facts-ribbon.tsx`** — Already driven by `[{label, value}]` array (REUSE-02 interface satisfied). Current implementation: 6-tile grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`), slate-50 surfaces. v1.1 needs to support 4-stat (home), 4-fact (product detail), 3-fact (service) variants — array length already drives this; only styling changes.
- **`src/app/globals.css`** — Existing `@theme inline` block is the canonical pattern; extend it with the design canvas color tokens (D-02). Existing `:root` oklch palette stays for admin scope.
- **shadcn/ui Button + Badge** — Phase 6 helpers (`.mk-btn`, `.mk-tag`) coexist with these; phases 7–11 may either use `.mk-btn` directly or wrap as a Button variant if they want shadcn consistency (deferred decision).

### Established Patterns
- **Tailwind v4 `@theme inline` + `:root` CSS variables** — Existing pattern in `src/app/globals.css`; D-02 extends it.
- **Public-vs-admin layout split** — `src/app/[locale]/layout.tsx` is public-public root; admin lives at `src/app/[locale]/admin/` with its own layout. D-01 mounts `.mk` on the former only, naturally preserving admin styling.
- **`next/font` with `subsets: ['latin', 'latin-ext', 'cyrillic']`** — Required by DESIGN-02 for Uzbek-Latin `oʻ`/`gʻ` (U+02BB) and Cyrillic glyph rendering.
- **Sketch-003 (Phase 3 product detail)** locked the slate/blue palette for v1.0; v1.1 design canvas is a deliberate visual direction change. Class-scoping via `.mk` (D-01) lets phases 6–11 ship without breaking Phase 3 admin/legacy paths.

### Integration Points
- **`src/app/[locale]/layout.tsx`** — Single mount point for the `.mk` className (D-01) and the next/font CSS variable injection (D-04). Already in stash@{0}'s diff, so apply stash first.
- **`src/app/globals.css`** — Extension point for tokens (D-02), helper classes (D-03), and font alias variables (D-04).
- **`src/components/public/`** — Existing folder where v1.1 reskinned components land (subject to migration-boundary discretion item).

</code_context>

<specifics>
## Specific Ideas

- The `.mk-eyebrow` class (mono / 11px / uppercase / 0.14em letter-spacing / `var(--ink-3)` color) is the design canvas's signature label treatment — every page template in `idea/` (home.jsx, product.jsx, catalog.jsx, etc.) opens with an eyebrow. Porting this verbatim (D-03) means phases 7–11 can use `<span className="mk-eyebrow">` directly without re-deriving the typography.
- The `.mk-ph` placeholder class (cross-hatched 135deg pattern + corner brackets via `.mk-ph-corners`) is the design canvas's "no image" affordance — useful as fallback for products without `heroPublicId`. Existing `product-card.tsx` already has a placeholder branch (renders a `◯`); the reskin should swap to `<div className="mk-ph mk-ph-corners">` for design fidelity.
- Font CSS variable aliasing (D-04) means `idea/styles.css`'s entire `.mk-*` block ports without a single string edit — design canvas updates re-port cleanly.

</specifics>

<deferred>
## Deferred Ideas

- **Animated micro-interactions for `<Gauge>`** (V2-VIS-03) — Phase 6 ships a static gauge. CSS-variable-driven inline SVG could enable later animation but D-claude-discretion notes hand-written static SVG as the default.
- **Mobile-pixel-perfect responsive treatment** (V2-VIS-01) — Phase 6 components ship desktop-first 1440px primary; mobile is best-effort.
- **Dark mode toggle** (V2-VIS-02) — Solutions band's dark `#14161b` surface is a one-off (Phase 8 HOME-05); full dark mode is v2.
- **shadcn Button/Badge variant authoring** of `.mk-btn` / `.mk-tag` — Deferred. D-03 ports the helper classes verbatim; rewrapping as shadcn variants is a possible cleanup task in a future polish phase.
- **Brand wordmark (Manokip vs Manometr) + real contact metadata + industry taxonomy reconciliation** — Tracked in `STATE.md ## Next Steps`. Do NOT block Phase 6 component shape; surface in component copy via locale messages where applicable (handled in phases 7–10 as those pages ship).

</deferred>

---

*Phase: 06-design-system-foundation*
*Context gathered: 2026-05-06*
