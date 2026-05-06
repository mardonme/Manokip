---
phase: 06
slug: design-system-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 06-RESEARCH.md ## Validation Architecture (lines 906-948).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (unit + RSC snapshot via RTL) + Playwright 1.59.1 (e2e) |
| **Config file** | `vitest.config.ts` (existing) + `playwright.config.ts` (existing) |
| **Quick run command** | `pnpm typecheck && pnpm test` |
| **Full suite command** | `pnpm test:all` |
| **Estimated runtime** | ~5 minutes full / ~30s typecheck / ~2 min vitest |

---

## Sampling Rate

- **After every task commit:** `pnpm typecheck` (≤ 30s; gates Success Criterion #4 directly).
- **After every plan wave:** `pnpm typecheck && pnpm test && pnpm build` (≤ 5 min; gates token compilation + RSC snapshot + component unit tests).
- **Before `/gsd-verify-work`:** `pnpm test:all` green — must include contact-form e2e (REFACTOR-03 regression), glyph-render e2e (DESIGN-02 Cyrillic + Uzbek-Latin gate), home page layout snapshot (DESIGN-03 `.mk` mount).
- **Max feedback latency:** 30 seconds (typecheck per task) / 5 minutes (per wave).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-W0-01 | wave-0 | 0 | DESIGN-01 | — | N/A | unit (file-as-text grep) | `pnpm vitest run tests/unit/globals-tokens.test.ts` | ❌ W0 | ⬜ pending |
| 06-W0-02 | wave-0 | 0 | DESIGN-02 / DESIGN-03 | — | next/font self-hosted (no Google CDN egress) | unit (RSC snapshot) | `pnpm vitest run tests/components/locale-layout.test.tsx` | ❌ W0 | ⬜ pending |
| 06-W0-03 | wave-0 | 0 | DESIGN-04 | — | N/A | unit (RTL render) | `pnpm vitest run tests/components/gauge.test.tsx` | ❌ W0 | ⬜ pending |
| 06-W0-04 | wave-0 | 0 | REUSE-01 | — | no commerce tokens in rendered HTML (CLAUDE.md guardrail) | unit (RTL + grep) | `pnpm vitest run tests/components/product-card.test.tsx` | ❌ W0 (replace existing slate-themed test) | ⬜ pending |
| 06-W0-05 | wave-0 | 0 | REUSE-02 | — | N/A | unit (RTL) | `pnpm vitest run tests/components/key-facts-ribbon.test.tsx` | ❌ W0 | ⬜ pending |
| 06-W0-06 | wave-0 | 0 | DESIGN-02 (regression) | — | Cyrillic + Uzbek-Latin glyph rendering after font swap | e2e extension (no new file) | `pnpm playwright test contact-glyph-render` | ✓ exists (Phase 5); extend to also visit `/{locale}` home | ⬜ pending |
| 06-W1-01 | refactor | 1 | REFACTOR-01 | — | proxy.ts move preserves middleware contract | smoke (file existence + build) | `test -f src/proxy.ts && test ! -f proxy.ts && pnpm build` | inline | ⬜ pending |
| 06-W1-02 | refactor | 1 | REFACTOR-02 | T-VAR-LEAK | server env vars NOT inlined into client bundle | unit + smoke | `pnpm typecheck && pnpm build && grep -L AUTH_SECRET .next/static/chunks/*.js` | inline | ⬜ pending |
| 06-W1-03 | refactor | 1 | REFACTOR-03 | — | contact-form roundtrip preserved post-stash | e2e (Phase 5 contract) | `pnpm playwright test contact` | ✓ exists | ⬜ pending |
| 06-W2-01 | tokens-fonts | 2 | DESIGN-01 (utility compilation) | — | tokens compile into production CSS | smoke build | `pnpm build && grep -E "(bg-bg\|text-ink-2\|border-line\|bg-mk-accent)" .next/static/css/*.css` | inline | ⬜ pending |
| 06-W2-02 | tokens-fonts | 2 | DESIGN-01 (presence + uniqueness) | — | every required CSS var + helper class present once | unit | `pnpm vitest run tests/unit/globals-tokens.test.ts` | from W0 — flips GREEN | ⬜ pending |
| 06-W2-03 | tokens-fonts | 2 | DESIGN-02 / DESIGN-03 | — | `.mk` mounted on body; both font CSS vars on html | unit | `pnpm vitest run tests/components/locale-layout.test.tsx` | from W0 — flips GREEN | ⬜ pending |
| 06-W3-01 | components | 3 | DESIGN-04 | — | `<Gauge>` SVG renders with viewBox + 11 ticks + needle path | unit | `pnpm vitest run tests/components/gauge.test.tsx` | from W0 — flips GREEN | ⬜ pending |
| 06-W3-02 | components | 3 | REUSE-01 | — | ProductCard reskin: props unchanged, `mk-eyebrow`/`mk-ph` present, no commerce tokens | unit | `pnpm vitest run tests/components/product-card.test.tsx` | from W0 — flips GREEN | ⬜ pending |
| 06-W3-03 | components | 3 | REUSE-02 | — | KeyFactsRibbon variants: 3/4/6 fact arrays produce correct grid columns | unit | `pnpm vitest run tests/components/key-facts-ribbon.test.tsx` | from W0 — flips GREEN | ⬜ pending |
| 06-W3-04 | components | 3 | REUSE-03 | — | no `src/components/public/v1-1/` folder created (in-place migration default) | smoke | `test ! -d src/components/public/v1-1` | inline | ⬜ pending |
| 06-W4-01 | smoke | 4 | DESIGN-04 / REUSE-01 / REUSE-02 (visual smoke) | — | `/design` route renders all 3 components inside `.mk` cascade | e2e (optional) | `pnpm playwright test design-smoke` | ❌ optional | ⬜ pending |
| 06-W4-02 | smoke | 4 | Success Criterion #4 | — | repo type-checks clean | smoke | `pnpm tsc --noEmit` (alias `pnpm typecheck`) | ✓ exists | ⬜ pending |
| 06-W4-03 | smoke | 4 | DESIGN-02 home page | — | extended Phase 5 glyph-render spec covers `/{locale}` | e2e | `pnpm playwright test contact-glyph-render` | ✓ exists (extended in W0-06) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/globals-tokens.test.ts` — verifies presence + uniqueness of all 14 D-02 design canvas color tokens AND all 12 D-03 helper class selectors in `src/app/globals.css`. Reads file as text, asserts string presence, asserts no duplicate definitions.
- [ ] `tests/components/locale-layout.test.tsx` — RSC unit test (Vitest + RTL `renderToString`) verifying (a) `<html>` carries both font CSS variable classes (`--font-inter-tight`, `--font-jetbrains-mono`), (b) `<body>` carries `className="mk"`. Mock next-intl + Auth.js + Cloudinary as in existing Phase 3/5 unit tests.
- [ ] `tests/components/gauge.test.tsx` — RTL render of `<Gauge size={280} value={5} max={10} />` asserting (1) `<svg viewBox="0 0 280 280">`, (2) ≥ 11 `<line>` elements with `stroke="#14161b"` or `stroke="#1240e5"` (major ticks), (3) one `<path>` element (danger arc), (4) needle line is present.
- [ ] `tests/components/product-card.test.tsx` — REPLACE existing slate-themed test. Asserts (1) props interface unchanged (`{ id, name, slug, shortDesc, heroPublicId, manufacturerName, sku }`), (2) renders `mk-eyebrow` class for manufacturer label, (3) renders `mk-ph mk-ph-corners` for missing `heroPublicId`, (4) NO occurrences of `price`/`sum`/`qty`/`добавить`/`add to`/`₽`/`$` in rendered HTML (commerce-strip guard from CLAUDE.md guardrail).
- [ ] `tests/components/key-facts-ribbon.test.tsx` — RTL render of 3 / 4 / 6 fact arrays asserting correct `grid-cols-*` class on the wrapper.
- [ ] **REGRESSION GATE — no new file:** extend existing `tests/e2e/glyph-render.spec.ts` (Phase 5) to also visit `/{locale}` and assert Cyrillic + `oʻ` (U+02BB) glyph rendering. Ensures Phase 6 next/font swap doesn't regress the Phase 5 glyph-render gate.

**Optional (recommended):**
- [ ] `src/app/[locale]/design/page.tsx` — disposable `/design` smoke route rendering `<Gauge>`, `<ProductCard>` (mock product), `<KeyFactsRibbon>` (3/4/6 arrays) inside `.mk`. Production-discoverable, unlinked, `noindex`. Delete in Phase 11 VRT closure or earlier.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity to `idea/design-canvas.jsx` | DESIGN-01..04 | No VRT until Phase 11 — Phase 6 ships before pixel-baseline tooling | Open Vercel preview `/design` route on a 1440px viewport. Compare `<Gauge>`, `<ProductCard>`, `<KeyFactsRibbon>` side-by-side with `idea/design-canvas.jsx` rendered locally. Verify: off-white `#f5f3ee` background, ink `#14161b` text, accent `#1240e5` active states, `.mk-eyebrow` mono uppercase 11px treatment, `.mk-ph` cross-hatched placeholder. |
| FOIT (no font flash) | DESIGN-02 | Subjective load-time observation; can be flaky in automated capture | Open Vercel preview in fresh incognito window; throttle to Slow 3G; reload `/{locale}` home; confirm Inter Tight visible from first paint (no fallback flash). |

---

## Validation Sign-Off

- [ ] All Phase 6 tasks have `<automated>` verify command OR explicit Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test references (5 unit files + 1 e2e extension)
- [ ] No watch-mode flags (`vitest run`, not `vitest`; `playwright test`, not `playwright test --ui`)
- [ ] Feedback latency < 30s per-task / < 5 min per-wave
- [ ] `nyquist_compliant: true` set in frontmatter once W0 stubs land in plan

**Approval:** pending
