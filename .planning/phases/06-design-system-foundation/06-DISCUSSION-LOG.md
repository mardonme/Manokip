# Phase 6: Design System Foundation + Refactor — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 06-design-system-foundation
**Areas discussed:** Token integration strategy

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Token integration strategy | How design canvas tokens land in Tailwind v4 + globals.css alongside shadcn/ui theme | ✓ |
| Component migration boundary | New `src/components/public/v1-1/` folder vs in-place replacement | |
| Gauge component implementation | Hand-written SVG vs library vs CSS-driven inline SVG | |
| Font loading approach | Variable fonts vs static weights vs self-hosted .woff2 | |

**User's choice:** Token integration strategy (only)

---

## Token Integration Strategy

### Q1: How should design canvas tokens coexist with the existing shadcn/ui theme in globals.css?

| Option | Description | Selected |
|--------|-------------|----------|
| Scope via `.mk` class on public layout (Recommended) | Wrap `src/app/[locale]/layout.tsx` in `className='mk'`; admin layout keeps shadcn/ui's oklch theme untouched | ✓ |
| Replace shadcn vars globally | Overwrite `--background`, `--foreground`, `--primary` etc. in `:root` — affects admin too (high blast radius) | |
| Add canvas tokens alongside shadcn (no scoping) | Both palettes in `:root` with different names; opt-in by token name | |

**User's choice:** Scope via `.mk` class on public layout
**Notes:** D-01 in CONTEXT.md. Admin out-of-scope guardrail respected.

---

### Q2: How should phases 7-11 reference these tokens in component code?

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind v4 `@theme` tokens — `bg-bg`, `text-ink`, `bg-accent` (Recommended) | Register tokens in `@theme inline`; Tailwind generates utilities | ✓ |
| Map to existing shadcn aliases (`bg-background` = canvas bg) | Reassign `--background` = `--bg`, `--foreground` = `--ink`, `--primary` = `--accent` | |
| Raw CSS variables via inline style or arbitrary-value classes | `style={{background:'var(--bg)'}}` or `bg-[--bg]` per element | |

**User's choice:** Tailwind v4 `@theme` tokens
**Notes:** D-02 in CONTEXT.md. Lists every utility name to be generated.

---

### Q3: Should the design canvas's helper classes (.mk-btn, .mk-tag, .mk-eyebrow, .mk-mono, .mk-ph) port verbatim into globals.css?

| Option | Description | Selected |
|--------|-------------|----------|
| Port `.mk-*` helpers verbatim into globals.css (Recommended) | Lossless port from `idea/styles.css` | ✓ |
| Re-author as shadcn Button/Badge variants | Build `.mk-btn-primary` as a Button `variant='primary-mk'` | |
| Tailwind utilities only — no helpers | No helpers; every component reauthors chrome | |

**User's choice:** Port verbatim
**Notes:** D-03 in CONTEXT.md. Lists every helper class to port.

---

### Q4: How should next/font output wire to design canvas CSS variable names (--font, --mono)?

| Option | Description | Selected |
|--------|-------------|----------|
| Alias next/font CSS variables to `--font` / `--mono` (Recommended) | `.mk { --font: var(--font-inter-tight); --mono: var(--font-jetbrains-mono); }` | ✓ |
| Rewrite design canvas CSS to use next/font names directly | Replace `var(--font)` with `var(--font-inter-tight)` throughout | |
| Use Tailwind font-family utilities only | `font-sans` = Inter Tight, `font-mono` = JetBrains Mono via `@theme` | |

**User's choice:** Alias next/font to --font / --mono
**Notes:** D-04 in CONTEXT.md. Preserves `.mk-mono` and `.mk-eyebrow` verbatim port.

---

## Closing Question

**Q:** Token integration is captured. Want to discuss more gray areas, or write CONTEXT.md now?

**User's choice:** I'm ready for context

The remaining gray areas are recorded as Claude's Discretion in CONTEXT.md:
- Component migration boundary (REUSE-03)
- Gauge component implementation (DESIGN-04)
- Font loading variant vs static
- Refactor stash sequencing (REFACTOR-01..03)

---

## Claude's Discretion

See CONTEXT.md `<decisions> > Claude's Discretion` for the four areas the planner/researcher may resolve using existing codebase patterns and the canonical design canvas references.

## Deferred Ideas

See CONTEXT.md `<deferred>` for ideas captured but not in scope:
- Animated micro-interactions for `<Gauge>` (V2-VIS-03)
- Mobile-pixel-perfect responsive (V2-VIS-01)
- Dark mode toggle (V2-VIS-02)
- shadcn Button/Badge variant authoring of `.mk-btn` / `.mk-tag`
- Brand wordmark + contact metadata + industry taxonomy (`STATE.md ## Next Steps` — does not block Phase 6)
