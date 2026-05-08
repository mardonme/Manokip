---
phase: 06-design-system-foundation
plan: 05
subsystem: design-system
tags: [smoke-route, design-route, rsc, suspense, cache-components, phase-verification, design-canvas, gauge, product-card, key-facts-ribbon, robots-noindex]

requires:
  - phase: 06-04
    provides: All 3 v1.1 components (<Gauge>, <ProductCard>, <KeyFactsRibbon>) at canonical src/components/public/ paths with frozen prop interfaces; .mk cascade tokens + helpers + font aliases (D-01..D-04) live in src/app/globals.css and on src/app/[locale]/layout.tsx <body>.
provides:
  - src/app/design/page.tsx — Disposable visual smoke route (RSC, robots noindex+nofollow). Renders <Gauge> + 3× <ProductCard> + 3× <KeyFactsRibbon> (3/4/6-fact variants) + .mk-btn/.mk-tag helper rows inside <main className="mk">. Production-discoverable but unlinked. Wraps the ProductCard grid in <Suspense> for Next.js 16 Cache Components compatibility (next-intl <Link> reads request-scoped locale data; needs streaming boundary outside [locale]/). Phase 11 VRT closure deletes it.
affects: [phase-7-storefront-chrome, phase-8-catalog-surfaces, phase-9-product-detail, phase-10-recipes-industries-contact, phase-11-launch-polish]

tech-stack:
  added: []
  patterns:
    - "Smoke route outside [locale]/: app routes that need to render public components but live OUTSIDE the [locale] tree must (a) wrap content in <main className=\"mk\"> manually since the [locale]/layout.tsx body class is bypassed and (b) wrap any component that imports from `@/i18n/navigation` (next-intl <Link> et al.) in a <Suspense> boundary because Cache Components prerender treats request-scoped locale reads as 'uncached data outside <Suspense>'."
    - "Next.js 16 Cache Components incompatibility: `export const dynamic = 'force-dynamic'` is not compatible with `nextConfig.cacheComponents`. To opt a route out of static prerender for sections that read request-scoped data, the idiom is <Suspense fallback=…> around those subtrees — they then render as PPR (◐) with the static shell + dynamic streamed island."
    - "Phase verification gate: typecheck (`pnpm tsc --noEmit`) → unit tests (`pnpm test` = `vitest run`) → production build (`pnpm build`) → CSS bundle token presence (`grep --bg/--ink/--accent/.mk-* in .next/static/chunks/*.css`) → server env not in client chunks (`grep AUTH_SECRET/CLOUDINARY_API_SECRET/RATE_LIMIT_IP_SALT in .next/static/chunks/*.js` MUST be empty) → REUSE-03 in-place check (`test ! -d src/components/public/v1-1`). All 6 gates GREEN end-to-end before phase close."

key-files:
  created:
    - src/app/design/page.tsx
  modified: []

key-decisions:
  - "Suspense boundary chosen over force-dynamic for /design ProductCard grid. Next.js 16 with cacheComponents config rejects `export const dynamic = 'force-dynamic'` at build time ('Route segment config dynamic is not compatible with nextConfig.cacheComponents'). Wrapping the ProductCard grid in <Suspense> resolves the 'uncached data accessed outside <Suspense>' static-prerender error that was triggered by next-intl <Link> reading request-scoped locale state on a non-[locale] route. Result: /design renders as PPR (◐) — a static shell + a streamed island for the cards. Visually equivalent for the smoke purpose; aligns with Cache Components idiom that's now standard for Phase 7+."
  - "/design lives at src/app/design/page.tsx, not under [locale]/, per plan instruction. Trade-off: no automatic .mk wrapper from [locale]/layout.tsx, no automatic next-intl request scope. Mitigated by mounting <main className=\"mk\"> manually + passing static literal locale to ProductCard ('uz', 'ru', 'en' for the 3 cards). The smoke purpose is visual confirmation against idea/design-canvas.jsx, not user-facing routing — so the locale-prefix layout is intentionally bypassed."
  - "Mock product uses Manometr-style names (WIKA 232.50 Bourdon-Tube Gauge, WK-232-50 SKU, 'Stainless 100mm dial, 1/2\" NPT, 0–10 MPa') — realistic enough that visual review against the design canvas is meaningful, with zero commerce affordances (no price, sum, qty, cart, order, in stock — CLAUDE.md guardrail #3). Three card variants exposed: heroPublicId=null (placeholder branch with .mk-ph), heroPublicId='demo/manometer' (Cloudinary fallback), and manufacturerName=null (eyebrow-omitted branch)."
  - "REFACTOR-01 fallback path NOT needed: Phase 6 plan 06-02 confirmed `src/proxy.ts` was auto-discovered by Next.js 16 on first build (build report shows `ƒ Proxy (Middleware)`). The 'fallback to root proxy.ts if Next.js fails to auto-discover src/proxy.ts' contingency from STATE.md/06-02-SUMMARY is therefore moot. No deferred fallback to track."
  - "Orphan `vi.mock('@/env')` from contact-form.test.tsx: NOT touched in this plan (out of scope — Plan 06-05's surface is the smoke route + verification gates, not test refactors). The test file was updated in Plan 06-02 (commit 760d1d7) when env access patterns flipped to `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Whether a vi.mock('@/env') stub remains harmless or is dead code is a Phase-7 cleanup concern, not a Phase 6 close blocker. The full vitest suite GREEN end-to-end (53 files, 316 tests) confirms either way."

requirements-completed: [DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, REUSE-01, REUSE-02]

duration: ~28min
completed: 2026-05-08
---

# Phase 6 Plan 05: Wave 4 — /design Smoke Route + Phase Verification Summary

**Shipped the disposable `/design` smoke route at `src/app/design/page.tsx` (RSC, robots noindex+nofollow, renders `<Gauge>` + 3× `<ProductCard>` + `<KeyFactsRibbon>` in 3/4/6-fact variants + `.mk-btn`/`.mk-tag` helper rows inside `<main className="mk">`) and ran the full Phase 6 verification gate end-to-end: `pnpm tsc --noEmit` exits 0; `pnpm test` GREEN with 53 files / 316 tests; `pnpm build` exits 0 with `/design` listed as PPR (◐); design canvas tokens (`--bg:#f5f3ee`, `--ink:#14161b`, `--accent:#1240e5`, `--ink-2..4`, `--line` family) and `.mk-eyebrow`/`.mk-ph`/`.mk-btn`/`.mk-tag` helper classes verified compiled into the production CSS bundle; server env keys verified NOT present in client chunks (REFACTOR-02 / T-VAR-LEAK gate); REUSE-03 in-place migration verified (no `src/components/public/v1-1/`). One deviation Rule-3 auto-fixed: Next.js 16 Cache Components static-prerender flagged the ProductCard grid as 'uncached data accessed outside <Suspense>' on first build attempt — `force-dynamic` is incompatible with `cacheComponents`, so wrapped the grid in `<Suspense fallback=…>` instead. /design ships as PPR. Visual approval gate (1440px viewport against `idea/design-canvas.jsx`) is the only outstanding item — `pending: human` (cannot be auto-resolved; requires user eyes on Vercel preview).**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-05-08T07:12:50Z
- **Completed:** 2026-05-08T07:40:38Z
- **Tasks:** 2 auto + 1 human-verify checkpoint (open)
- **Files modified:** 0
- **Files created:** 1 (src/app/design/page.tsx)

## Accomplishments

- **Task 1: src/app/design/page.tsx CREATED.** RSC, no `'use client'`, no client interactivity. `metadata` exports `robots: { index: false, follow: false }` so production-discoverable but never indexed (RESEARCH Open Question #3 resolution). Top-level `<main className="mk">` mounts the design canvas cascade since `/design` lives outside `[locale]/` and bypasses the body-level `.mk` class on the locale layout. Page renders 4 sections inside the `.mk` wrapper:
  1. Header with `.mk-eyebrow` label, `text-3xl font-semibold text-ink` h1, `text-ink-2` paragraph copy.
  2. `<Gauge size={280} value={6.4} max={10} unit="MPa" label="PRESSURE" danger={8} />` (DESIGN-04).
  3. 3-card grid of `<ProductCard>` exposing the placeholder branch (heroPublicId=null), the CldImage branch (heroPublicId='demo/manometer'), and the manufacturer-omitted branch (manufacturerName=null) — wrapped in `<Suspense>` for Cache Components compat (REUSE-01).
  4. Three `<KeyFactsRibbon>` instances at `facts.length` 3 / 4 / 6 to exercise all three variant grid columns (REUSE-02).
  5. Helper showcase: 5 `.mk-btn` variants (default/primary/ghost/light/sm) + 3 `.mk-tag` variants (default/solid/accent) — all from D-03.

- **Task 2: full phase verification gate GREEN end-to-end.**
  - `pnpm tsc --noEmit` exits 0 across the whole repo (Phase Success Criterion #4 — measured for the first time after Phase 6 RED→GREEN cycle closed).
  - `pnpm test` (vitest run, all projects): **53 files, 316 tests, all GREEN** in 727s. Includes every Wave 0 unit test (gauge, product-card, key-facts-ribbon, globals-tokens, locale-layout, env-validation, contact-form, …).
  - `pnpm build` exits 0; build report lists `/design` as `◐` (PPR — partial prerender with streamed dynamic island for the ProductCard grid).
  - **CSS bundle token gate:** `.next/static/chunks/0pox.wf3lykb~.css` contains literal `--bg:#f5f3ee`, `--bg-2:#ebe8e1`, `--ink:#14161b`, `--ink-2:#3a3d44`, `--ink-3:#74777e`, `--ink-4:#a7a9af`, plus `.mk-eyebrow`, `.mk-ph`, `.mk-ph-corners`, `.mk-btn`, `.mk-btn-primary`, `.mk-btn-ghost`, `.mk-btn-light`, `.mk-btn-sm`, `.mk-tag`, `.mk-tag-accent` selectors and `.bg-mk-accent`/`.bg-mk-accent-soft`/`.text-mk-accent`/`.text-mk-accent-ink` Tailwind utilities. Tokens cascade into the production CSS bundle exactly as authored in `src/app/globals.css`.
  - **Server-env-leak gate:** `grep -l "AUTH_SECRET\|CLOUDINARY_API_SECRET\|RATE_LIMIT_IP_SALT" .next/static/chunks/*.js` returns nothing. REFACTOR-02 / T-VAR-LEAK boundary intact.
  - **REUSE-03 in-place gate:** `test ! -d src/components/public/v1-1` true. No duplicate component folder.

- **All Phase 6 unit-test contracts GREEN end-to-end.** From the 53-file vitest run: gauge.test.tsx 5/5 + product-card.test.tsx 4/4 + key-facts-ribbon.test.tsx 4/4 + globals-tokens.test.ts 35/35 + locale-layout.test.tsx 2/2 + env-validation.test.ts 4/4 + contact-form.test.tsx 8/8 plus every other unit-test surface in the repo. Phase 6 Wave 0 RED → Wave 4 GREEN cycle is closed.

- **/design route reachable on next deploy.** The route compiles and prerenders as PPR; the static shell will paint immediately, the ProductCard grid will stream in via the Suspense boundary, and the `.mk` cascade will style the entire tree from the body-level inheritance plus the top-level `<main className="mk">` wrap.

## Files Created/Modified

- `src/app/design/page.tsx` (created, 110 lines) — Disposable visual smoke route. RSC, `metadata: { robots: { index: false, follow: false } }`, `<main className="mk">` wrapper, ProductCard grid wrapped in `<Suspense>`. Imports {Gauge, ProductCard, KeyFactsRibbon} from `@/components/public/{gauge,product-card,key-facts-ribbon}`. No commerce tokens (verified with grep against rendered HTML pattern); CLAUDE.md guardrail #3 honored.

## Decisions Made

- **Suspense over force-dynamic for /design's data-reading subtree.** Next.js 16 with `cacheComponents` config explicitly rejects `export const dynamic = 'force-dynamic'` at build time. The proper idiom for opt-out from static prerender of a request-scoped subtree is `<Suspense fallback=…>` around it — the route then renders as PPR (◐) with a static shell + streamed island. Cleaner, less side-effecty, and matches what Phase 7+ chrome will use.
- **Mount `<main className="mk">` manually on /design.** Because /design lives outside `[locale]/`, it does NOT inherit the body-level `.mk` class from `src/app/[locale]/layout.tsx`. The page MUST mount its own `.mk` wrapper so D-02 tokens, D-03 helpers, and D-04 font aliases cascade. This is the canonical pattern for any future non-locale public-facing route that needs the design canvas surface (none anticipated, but documented here).
- **Static literal locale on ProductCard for /design.** ProductCard's `locale` prop expects a `Locale` literal type. /design is outside the next-intl request scope, so `setRequestLocale(locale)` is not in play. Each of the 3 cards passes a different static literal (`'uz'`, `'ru'`, `'en'`) — visual variant exposure, not behavioral correctness.
- **REFACTOR-01 fallback NOT needed.** From 06-02-SUMMARY: Next.js 16 auto-discovered `src/proxy.ts` on first build; the 'fallback to root proxy.ts' contingency is moot. Phase 6 closes with that question resolved.
- **Orphan vi.mock('@/env') in contact-form.test.tsx left in place.** Phase 6 plan 06-02 already updated the test file's env-access patterns; whether a leftover vi.mock stub is harmless or dead code is a Phase-7 cleanup decision. All 8 contact-form tests pass — not blocking phase close.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Next.js 16 Cache Components rejects static prerender of /design**

- **Found during:** Task 2's first `pnpm build` invocation.
- **Issue:** Build failed during the static prerender phase with `Error: Route "/design": Uncached data was accessed outside of <Suspense>` — the error stack pointed inside the ProductCard wrapper section. Root cause: ProductCard imports `<Link>` from `@/i18n/navigation` (next-intl), which reads the per-request locale at render time. /design lives outside the `[locale]/` tree, so there is no `setRequestLocale()` call wrapping the page; with Cache Components enabled (`nextConfig.cacheComponents = true`), Next.js 16 flags this request-scoped read as "uncached data accessed outside <Suspense>" and aborts the static prerender.
- **First fix attempt (reverted):** Added `export const dynamic = 'force-dynamic'`. Next.js 16 rejected this with `Route segment config "dynamic" is not compatible with nextConfig.cacheComponents`. force-dynamic and cacheComponents are mutually exclusive.
- **Final fix:** Wrapped the ProductCard grid in `<Suspense fallback={<div className="text-ink-3">Loading product cards…</div>}>`. The route now renders as PPR (`◐` in build report) — a static shell (header + Gauge + KeyFactsRibbon + helpers) + a streamed dynamic island for the ProductCard cards. Visually equivalent for smoke purposes (the cards still appear); aligns with Cache Components idiom for Phase 7+.
- **Files modified:** src/app/design/page.tsx (added `Suspense` import and one `<Suspense>` boundary).
- **Verification:** `pnpm build` exits 0; `/design` shown as `◐` in route table; full vitest suite still 316/316 GREEN.
- **Committed in:** `3b5bc4d` (separate fix commit, atomic with the rule-3 deviation).

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — Cache Components static-prerender vs request-scoped data access).
**Impact on plan:** No scope creep. The fix preserves the plan's intent (visual smoke route reachable on Vercel preview) while routing around an inherent Next.js 16 incompatibility between force-dynamic and cacheComponents that the plan author couldn't have anticipated. /design still ships at the canonical path with the same visual content; the only difference is a streaming boundary on the cards.

## Issues Encountered

- **Pre-existing hydration warning in tests/components/locale-layout.test.tsx ('In HTML, <html> cannot be a child of <div>') noted in 06-04-SUMMARY remains unresolved.** Out of scope for this plan; the test still passes 2/2 GREEN. Logged here for transparency.
- **Playwright e2e (`pnpm playwright test contact`, `pnpm playwright test glyph-render`) deferred.** Plan instructs running these against `BASE_URL=<vercel-preview-url>`. The executor runs locally (no Vercel preview deployed at this moment); Phase 5 contact e2e + Phase 6 glyph-render e2e are documented in the original plan as preview-side gates and the local Playwright config explicitly skips them when no protectionBypass / preview URL is set (per Phase 5 06-02-SUMMARY pattern: "preview-side run is the documented idiom"). Both will be exercised when this commit lands on Vercel. Not blocking phase close — consistent with Phase 5's behavior.

## User Setup Required

**Visual approval on Vercel preview at 1440px viewport.** This is a `human-verify` checkpoint that cannot be auto-resolved by the executor; it requires user eyes on a live deployment compared against `idea/design-canvas.jsx`. See **Self-Check** below — this item is marked `pending: human`.

Steps the user will perform:
1. Push the Wave 4 commit and open the Vercel preview URL.
2. Visit `<preview-url>/design` on a 1440px-wide viewport.
3. Open `idea/design-canvas.jsx` (or any rendered version of it) for visual reference.
4. Confirm visual fidelity per the plan's `<how-to-verify>` checklist (background `#f5f3ee`, ink `#14161b`, accent `#1240e5`, Inter Tight + JetBrains Mono rendering, gauge geometry, ProductCard placeholder, KeyFactsRibbon variant grids, eyebrow typography, no console errors).
5. Visit `/uz` home and confirm `<body class="mk">` is mounted.
6. Visit `/uz/admin` and confirm admin layout does NOT have `class="mk"` (admin keeps shadcn theme; CLAUDE.md guardrail #5).
7. Reply with `approved` (or describe specific divergences).

## Next Plan Readiness

**Phase 6 is ready for verifier sign-off** once the visual approval lands. All four phase success criteria are measurable and 3 of 4 are confirmed GREEN by automation:

1. **Phase Success Criterion #1 (visual)** — off-white `#f5f3ee` + ink `#14161b` + accent `#1240e5`; Inter Tight + JetBrains Mono with Cyrillic + Uzbek-Latin oʻ. **Pending: human visual approval on /design + /uz home.**
2. **Phase Success Criterion #2 (components)** — `<Gauge>`, `<ProductCard>`, `<KeyFactsRibbon>` consumable from `src/components/public/` with frozen prop interfaces. **GREEN** — confirmed by Wave 3 plan 06-04 + Wave 4 /design smoke import.
3. **Phase Success Criterion #3 (refactor)** — `src/proxy.ts` exists with middleware contract intact; `src/env.ts` passes type-safe validation on cold boot; `pnpm build` succeeds. **GREEN** — confirmed by Task 2's `pnpm build` exit 0; `ƒ Proxy (Middleware)` line in build report.
4. **Phase Success Criterion #4 (typecheck)** — `pnpm tsc --noEmit` exits 0. **GREEN** — confirmed by Task 2's typecheck run.

**Phase 7 (storefront-chrome) consumers can begin importing:**
- `import { Gauge } from '@/components/public/gauge'` — home hero (HOME-02).
- `import { ProductCard } from '@/components/public/product-card'` — catalog grids (CAT-03).
- `import { KeyFactsRibbon } from '@/components/public/key-facts-ribbon'` — home stats / PDP key facts / service trust strip.

The /design route stays reachable through Phase 11 (VRT closure deletes it).

## TDD Gate Compliance

This plan's tasks are NOT marked `tdd="true"` (the plan is `type: execute` and Wave 4 is the smoke + verification wave — no new RED tests authored, no GREEN flips needed; Wave 0 already authored every contract, Waves 1–3 already flipped them GREEN). The Phase 6 RED→GREEN cycle was completed in plan 06-04 (commits cb9c967 + 47277af + edbbaf7); plan 06-05 simply runs the verification gate against the already-GREEN suite and adds the visual smoke surface.

Plan-level TDD gate sequence in git log (Phase 6):
- RED commits (plan 06-01): `71e4614`, `fae113c`, `97086c6` — all `test(...)` commits authoring Wave 0 contracts.
- GREEN commits (plan 06-03): `031044e`, `3b8dc56` — globals.css + locale-layout flips.
- GREEN commits (plan 06-04): `cb9c967`, `47277af`, `edbbaf7` — Gauge + ProductCard + KeyFactsRibbon flips.
- Wave 4 commits (this plan): `ead2c9c` (feat — /design route), `3b5bc4d` (fix — Suspense boundary).

REFACTOR not needed in this plan — the smoke route arrived at minimal-correct form on first GREEN; the Cache Components fix folded into a single atomic fix() commit (no separate refactor needed).

## Self-Check

Verifying every `must_haves.truths` from plan frontmatter:

- [x] **PASSED** — "A disposable /design route exists and renders <Gauge>, <ProductCard> (mock product), and <KeyFactsRibbon> (3/4/6 fact arrays) inside the .mk cascade — production-discoverable but unlinked + noindex." Verified by file existence (`test -f src/app/design/page.tsx` true) + `grep -c "robots: { index: false, follow: false }" src/app/design/page.tsx` == 1 + `grep -c 'className="mk' src/app/design/page.tsx` == 16 (eyebrow/mono/btn/tag/ph variants) + 3 KeyFactsRibbon instances (facts3, facts4, facts6) confirmed in source + 3 ProductCard variant prop shapes confirmed in source + Gauge with realistic value/max/danger props confirmed in source.
- [x] **PASSED** — "pnpm tsc --noEmit exits 0 across the full repo (Phase Success Criterion #4)." Verified by Task 1's typecheck run (no output = exit 0) and Task 2's verification gate.
- [pending: human] **PARTIAL** — "pnpm test:all (vitest + playwright) is GREEN end-to-end on Vercel preview." Verified GREEN locally for the vitest half (53 files / 316 tests / 0 failures, includes every Wave 0 unit test). The Playwright half (`pnpm playwright test contact` + `pnpm playwright test glyph-render`) is configured to run preview-side with `BASE_URL=<vercel-preview-url>` per Phase 5's documented idiom — locally the configuration skips with no preview URL set. **Will run on the next Vercel preview deploy (CI-side).** `pnpm build` exits 0 confirmed locally.
- [pending: human] **PENDING** — "User has visually approved the /design route on a 1440px viewport against idea/design-canvas.jsx." Cannot be auto-resolved by the executor. Requires user visual review on the Vercel preview URL after this commit lands. See **User Setup Required** above for the exact verification steps.

Verifying `must_haves.artifacts`:

- [x] **PASSED** — `src/app/design/page.tsx` exists. Lines: 110 (≥ min 30). Contains literal `robots: { index: false, follow: false }` (≥ 1).

Verifying `must_haves.key_links`:

- [x] **PASSED** — Page imports {Gauge, ProductCard, KeyFactsRibbon} from `@/components/public/{gauge,product-card,key-facts-ribbon}` and uses each in JSX inside `<main className="mk">`. All three named imports + JSX usages confirmed in source.

CLAUDE.md guardrail check:

- [x] **PASSED** — No commerce affordances in /design page source: no `price`, no `sum`, no `qty`, no `cart`, no `Add to order`, no `In stock`, no `₽`/`$` (verified with grep against page source). Mock product is technical-spec only (Range, Dial, Class, Connection, Material, Output).

Commit hashes verified exist:

- [x] `ead2c9c` — `git log --oneline -5` FOUND (feat — /design smoke route).
- [x] `3b5bc4d` — `git log --oneline -5` FOUND (fix — Suspense boundary).

Build artifact gates verified:

- [x] **PASSED** — `pnpm build` exits 0; `/design` listed as `◐` (PPR) in route table.
- [x] **PASSED** — `.next/static/chunks/0pox.wf3lykb~.css` contains literal `--bg:#f5f3ee`, `--ink:#14161b`, `--accent`, `.mk-eyebrow`, `.mk-ph`, `.mk-ph-corners`, `.mk-btn` family, `.mk-tag` family.
- [x] **PASSED** — `grep -l "AUTH_SECRET\|CLOUDINARY_API_SECRET\|RATE_LIMIT_IP_SALT" .next/static/chunks/*.js` returns nothing. REFACTOR-02 / T-VAR-LEAK gate intact.
- [x] **PASSED** — `test ! -d src/components/public/v1-1` true. REUSE-03 final gate.

**Self-Check: PARTIAL — automated portion PASSED (4/4 truths automatable, 1/1 artifact, 1/1 key_link, 4/4 build gates, 2/2 commits present, 1/1 CLAUDE.md guardrail). Outstanding: 1 truth `pending: human` (Vercel preview Playwright e2e + visual approval at 1440px against idea/design-canvas.jsx).**

The orchestrator should surface a `human-verify` checkpoint to the user containing:
- **URL to visit:** `<vercel-preview-url>/design` after pushing this commit's branch (master).
- **Viewport:** 1440px wide.
- **Compare against:** `idea/design-canvas.jsx` (rendered locally or visually inspected).
- **Verify:** background `#f5f3ee`, ink `#14161b`, accent `#1240e5`, Inter Tight body + JetBrains Mono eyebrows/tick numbers, gauge geometry (11 major + 40 minor ticks + needle at 6.4 + danger arc 8→10), ProductCard placeholder branch (cross-hatched .mk-ph + corner brackets), KeyFactsRibbon 3/4/6-column variants, no console errors, `/uz` home `<body class="mk">`, `/uz/admin` NOT mk-themed (still shadcn).

---
*Phase: 06-design-system-foundation*
*Completed: 2026-05-08*
