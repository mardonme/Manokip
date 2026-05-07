---
phase: 06-design-system-foundation
plan: 01
subsystem: tests
tags: [tdd, wave-0, vitest, playwright, design-tokens, mk-class, gauge, product-card, key-facts-ribbon, glyph-render]

requires:
  - phase: 05
    provides: shadcn ProductCard + KeyFactsRibbon (current commerce-flavored impl), tests/e2e/glyph-render.spec.ts (Phase 5 protectionBypass + per-locale blocks)
provides:
  - tests/unit/globals-tokens.test.ts — 14 D-02 tokens + 12 D-03 helper class selectors + --color-mk-accent namespace, file-as-text grep (RED)
  - tests/components/locale-layout.test.tsx — RSC layout test asserting next/font CSS variables on <html> + className="mk" on <body> (RED)
  - tests/components/gauge.test.tsx — RTL test asserting svg viewBox, ≥11 major-tick lines, danger-arc <path>, accent needle (RED — module does not exist)
  - tests/components/product-card.test.tsx — RTL + commerce-strip grep test with frozen ProductCardProps shape (RED — current impl uses shadcn Badge + bg-slate-*)
  - tests/components/key-facts-ribbon.test.tsx — RTL test asserting lg:grid-cols-3/4/6 by facts.length (RED — current impl hardcodes 6)
  - tests/e2e/glyph-render.spec.ts — EXTENDED in place with per-locale home-page blocks asserting Inter Tight + JetBrains Mono + .mk on body (RED)
affects: [phase-6-plan-02, phase-6-plan-03, phase-6-plan-04, phase-6-plan-05]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED gate discipline — every assertion fails today; plans 03/04 must flip them GREEN"
    - "File-as-text grep for CSS tokens — same pattern as tests/unit/env-validation.test.ts (no PostCSS round-trip needed)"
    - "RSC layout test — RTL render of `await LocaleLayout({ children, params })` with mocked next-intl/next/font/vercel/site-header/site-footer/jsonld/metadata/env/nuqs/i18n surface"
    - "Component test placement — *.test.tsx in tests/components/** lands in Vitest dom (jsdom) project; *.test.ts in tests/unit/** lands in node project"
    - "Commerce-strip parity grep — explicit denylist (price|sum|qty|cart|order|stock|add to) ensures CLAUDE.md guardrail #3 (no e-commerce) cannot regress"
    - "Glyph spec extension in place — preserves Phase 5 protectionBypass + test.skip + existing per-route blocks; appends Phase 6 describe block (no new file)"

key-files:
  created:
    - tests/unit/globals-tokens.test.ts
    - tests/components/locale-layout.test.tsx
    - tests/components/gauge.test.tsx
    - tests/components/product-card.test.tsx
    - tests/components/key-facts-ribbon.test.tsx
  modified:
    - tests/e2e/glyph-render.spec.ts

key-decisions:
  - "RSC layout test mocks the full transitive surface (next-intl, next/font, vercel analytics, site header/footer, jsonld, metadata, env, nuqs, i18n routing) so the test can `await LocaleLayout(...)` without booting DB/Auth — pattern is reusable for future RSC layout tests."
  - "U+0060 backtick + U+02BB modifier letter both required in glyph-render assertions so reskinned typography preserves Uzbek-Latin oʻ rendering across Inter Tight subsets [latin, latin-ext, cyrillic]."
  - "tests/components/* uses the dom (jsdom) Vitest project; placing layout-test.tsx there honors the existing project boundary established in Phase 5."

patterns-established:
  - "Pattern A — Wave 0 RED gate: every test in plan-01 frontmatter `must_haves.artifacts` MUST fail today. Verifier in plan 05 will re-run all five and require GREEN."
  - "Pattern B — File-as-text grep for CSS contracts: readFileSync('src/app/globals.css', 'utf-8') + regex assertions. Avoids PostCSS dependency and runs in node project."
  - "Pattern C — RSC layout test: full surface mock + `await Layout({children, params})` + RTL render."

requirements-completed: []  # tests assert future surface — actual completion lands in plans 03/04

duration: ~25min
completed: 2026-05-06
---

# Phase 6 Plan 01: Wave 0 RED Tests Summary

**Six RED test artifacts (5 created + 1 extended) that lock the design-token, font-loading, .mk-class, gauge SVG, ProductCard reskin, and KeyFactsRibbon variant contracts before any source changes land. Every assertion fails today.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-06T18:38Z (approx)
- **Completed:** 2026-05-06T18:44Z
- **Tasks:** 3 commits across 6 artifacts
- **Files created:** 5
- **Files modified:** 1

## Accomplishments

- **Design-token RED gate locked.** `tests/unit/globals-tokens.test.ts` (108 lines) grep-asserts 14 D-02 raw tokens, 12 D-03 `.mk-*` helper selectors, and the `--color-mk-accent` Tailwind namespace (Pitfall #3 — avoids shadcn collision). 46/47 assertions FAIL today.
- **Font + .mk-class layout RED gate locked.** `tests/components/locale-layout.test.tsx` (112 lines) renders `await LocaleLayout({...})` and asserts `<html>` carries Inter Tight + JetBrains Mono CSS variables and `<body className="mk">`. Full mock surface lets the RSC test run without DB/Auth boot.
- **Gauge component RED gate locked.** `tests/components/gauge.test.tsx` (53 lines) asserts root `<svg data-testid="gauge-svg">`, viewBox honors size prop, ≥11 major-tick lines, ≥1 danger-arc path, accent-stroke (#1240e5) needle. Module does not exist today.
- **ProductCard reskin RED gate locked.** `tests/components/product-card.test.tsx` (88 lines) asserts `.mk-eyebrow` manufacturer label, `.mk-ph.mk-ph-corners` placeholder branch, frozen ProductCardProps shape, and zero commerce tokens (`/price|sum|qty|cart|order|stock|add to/`) in rendered HTML.
- **KeyFactsRibbon variant RED gate locked.** `tests/components/key-facts-ribbon.test.tsx` (74 lines) asserts `lg:grid-cols-3` for 3 facts, `lg:grid-cols-4` for 4, `lg:grid-cols-6` for default — current impl hardcodes 6.
- **Glyph e2e extended in place.** `tests/e2e/glyph-render.spec.ts` (149 lines, +new describe block) appends a Phase 6 per-locale block (`/uz`, `/ru`, `/en`) asserting Inter Tight + JetBrains Mono load + `.mk` on body. Phase 5 protectionBypass + `test.skip` + existing per-route blocks preserved verbatim.

## Task Commits

1. **Task 06-01.1** — globals.css design tokens RED gate — `71e4614` (test)
2. **Task 06-01.2** — locale layout + Gauge RED gates — `fae113c` (test)
3. **Task 06-01.3** — ProductCard + KeyFactsRibbon + glyph extension RED gates — `97086c6` (test)

## Files Created

- `tests/unit/globals-tokens.test.ts` — 14 D-02 + 12 D-03 + 1 D-04 + 1 token namespace (108 lines)
- `tests/components/locale-layout.test.tsx` — RSC layout font + .mk class assertions (112 lines)
- `tests/components/gauge.test.tsx` — Gauge SVG contract (53 lines)
- `tests/components/product-card.test.tsx` — ProductCard reskin + commerce-strip parity (88 lines)
- `tests/components/key-facts-ribbon.test.tsx` — Variant grid columns by facts.length (74 lines)

## Files Modified

- `tests/e2e/glyph-render.spec.ts` — extended with Phase 6 per-locale describe block (149 lines total)

## RED Gate Verification

Every artifact asserts surface that does not yet exist:

| Test | What's missing today |
|------|---------------------|
| globals-tokens.test.ts | --bg/--ink/--line/--accent families + .mk-* helpers + --color-mk-accent |
| locale-layout.test.tsx | next/font Inter_Tight + JetBrains_Mono on <html>; className="mk" on <body> |
| gauge.test.tsx | src/components/public/gauge.tsx module entirely |
| product-card.test.tsx | .mk-eyebrow + .mk-ph markup; current uses shadcn Badge + bg-slate-* |
| key-facts-ribbon.test.tsx | facts.length-driven grid; current hardcodes lg:grid-cols-6 |
| glyph-render.spec.ts | Inter Tight + JetBrains Mono + .mk class on body |

## Decisions Made

- **Full mock surface in locale-layout.test.tsx.** Layout imports next-intl, next/font, Vercel Analytics + Speed Insights, site header/footer (which transitively require auth/db), JSON-LD, metadata builders, env, nuqs adapter, and i18n routing. Mocking each at the top of the test file lets `await LocaleLayout({children, params})` resolve to a render-able element without booting database or auth, keeping the test fast and deterministic.
- **Commerce-token denylist in product-card.test.tsx.** Explicit regex `/price|sum|qty|cart|order|stock|add to/i` against rendered HTML. Belt-and-suspenders against CLAUDE.md guardrail #3 (Manometr is not e-commerce) — even if the reskin accidentally re-introduces commerce affordances, this gate fails first.
- **Glyph spec extended in place (no new file).** Phase 5 already shipped `tests/e2e/glyph-render.spec.ts` with `protectionBypass` + `test.skip` patterns. Adding a sibling file would split coverage; appending a Phase 6 `describe('Phase 6 — typography + .mk class', ...)` block keeps all glyph assertions in one location.

## Deviations from Plan

None. Each task implemented its `must_haves` artifact list verbatim. All 6 file paths in `frontmatter.files_modified` are accounted for. Six grep-style `contains:` assertions from the plan all hold:

- `tests/unit/globals-tokens.test.ts` contains `readFileSync.*globals\\.css` ✓
- `tests/components/locale-layout.test.tsx` contains `await LocaleLayout` ✓
- `tests/components/gauge.test.tsx` contains `data-testid="gauge-svg"` ✓
- `tests/components/product-card.test.tsx` contains commerce-strip denylist ✓
- `tests/components/key-facts-ribbon.test.tsx` contains `lg:grid-cols-` ✓
- `tests/e2e/glyph-render.spec.ts` contains `Inter Tight` (5 occurrences) ✓

## Next Plan Readiness

**Plan 06-02 (proxy.ts → src/, env.ts experimental__runtimeEnv, contact-form.tsx) is unblocked:**
- Wave 0 RED gates do not touch src/ — Plan 02 can land its source moves cleanly.
- `tests/unit/env-validation.test.ts` regex update (`/,\\s*runtimeEnv:/` → `/,\\s*experimental__runtimeEnv:/`) is a Plan 02 task, not Plan 01.

**Plan 06-03 (globals.css + layout.tsx) is gated by:**
- `tests/unit/globals-tokens.test.ts` flips GREEN when D-02/D-03/D-04 land in globals.css.
- `tests/components/locale-layout.test.tsx` flips GREEN when next/font + .mk class land in layout.tsx.

**Plan 06-04 (gauge + reskinned product-card + key-facts-ribbon) is gated by:**
- `tests/components/gauge.test.tsx` flips GREEN when src/components/public/gauge.tsx is written.
- `tests/components/product-card.test.tsx` flips GREEN when ProductCard reskin lands.
- `tests/components/key-facts-ribbon.test.tsx` flips GREEN when KeyFactsRibbon variant grid lands.

**Plan 06-05 (/design smoke route + final tsc/test:all green) is gated by:**
- All five Wave 0 unit tests + extended glyph e2e flip GREEN before phase verification accepts plan 05.

## TDD Gate Compliance

This plan IS the RED phase for the entire phase. Every assertion fails today. The GREEN phase lands across plans 02 (env), 03 (tokens + layout), 04 (components). Plan 05's `pnpm test:all` command verifies the GREEN-after-REFACTOR state across the full suite.

Gate commits:
- `71e4614` test(06-01) — globals.css design tokens RED gate
- `fae113c` test(06-01) — locale layout + Gauge RED gates
- `97086c6` test(06-01) — ProductCard + KeyFactsRibbon + glyph extension RED gates

## Self-Check

Verifying every `must_haves.truths` from plan frontmatter:

- [x] **PASSED** — "Each Wave 0 test file exists in tests/ tree and is reachable by configured Vitest project (node or dom) or Playwright" — all 6 files exist; *.test.ts in tests/unit goes to node, *.test.tsx in tests/components goes to dom, .spec.ts in tests/e2e goes to Playwright.
- [x] **PASSED** — "Every new unit test runs RED today" — target source for each assertion does not exist (gauge module, .mk class, .mk-eyebrow markup, .mk-ph markup, lg:grid-cols-3/4 variants, Inter Tight font load).
- [x] **PASSED** — "tests/e2e/glyph-render.spec.ts is extended in place (no new file) with a per-locale home-page block" — file modified (149 lines, was 80 in Phase 5); 'Inter Tight' appears 5 times.

Verifying `must_haves.artifacts`:

- [x] **PASSED** — `tests/unit/globals-tokens.test.ts` (108 lines ≥ 60) provides 14 D-02 + 12 D-03 + namespace.
- [x] **PASSED** — `tests/components/locale-layout.test.tsx` (112 lines ≥ 60) provides RSC layout font + .mk assertions.
- [x] **PASSED** — `tests/components/gauge.test.tsx` (53 lines ≥ 30) provides SVG contract.
- [x] **PASSED** — `tests/components/product-card.test.tsx` (88 lines ≥ 60) provides reskin + commerce-strip parity.
- [x] **PASSED** — `tests/components/key-facts-ribbon.test.tsx` (74 lines ≥ 30) provides variant grid.
- [x] **PASSED** — `tests/e2e/glyph-render.spec.ts` (149 lines, modified) contains `Inter Tight`.

Verifying `must_haves.key_links`:

- [x] **PASSED** — globals-tokens.test.ts → src/app/globals.css via readFileSync grep — pattern `readFileSync.*globals\\.css` present.
- [x] **PASSED** — locale-layout.test.tsx → src/app/[locale]/layout.tsx via `await LocaleLayout(...)` — pattern present.

Commit hashes verified exist:

- [x] `71e4614` — `git log --oneline` FOUND
- [x] `fae113c` — `git log --oneline` FOUND
- [x] `97086c6` — `git log --oneline` FOUND

**Self-Check: PASSED (3/3 truths green, 6/6 artifacts green, 2/2 key_links green, 3/3 commits present).**

---
*Phase: 06-design-system-foundation*
*Completed: 2026-05-06*
