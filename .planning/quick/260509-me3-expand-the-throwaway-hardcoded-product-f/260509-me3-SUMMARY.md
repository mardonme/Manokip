---
quick_id: 260509-me3
type: execute
wave: 1
status: complete
completed: 2026-05-09T11:13:52Z
duration_seconds: 184
files_modified:
  - src/app/design/page.tsx
files_created: []
commits:
  - 01997dc: feat(quick-260509-me3) expand /design ProductCard fixtures to 6 distinct manometers
requirements:
  - DESIGN-SMOKE-VARIETY
key-files:
  modified:
    - path: src/app/design/page.tsx
      change: replace single mockProduct + 2 spreads with mockProducts[6]; replace facts3/4/6 to cover temperature/accuracy/IP rating; replace 3-card grid body with .map() over mockProducts; add productLocales[6] rotation
decisions:
  - "Fixtures stay INLINE (no extraction to lib/ or __fixtures__) so Phase 11 VRT closure remains a single-file deletion (CLAUDE.md guardrail)."
  - "Branch coverage tally chosen as 2 placeholder + 4 CldImage + 1 manufacturer-null to exercise both ProductCard rendering branches and the eyebrow-omitted edge case in the same grid."
  - "Locale prop is rotated via a sibling productLocales literal array (not via next-intl) because /design lives outside the [locale]/ request scope."
metrics:
  task_count: 1
  file_count: 1
  duration: 184s
---

# Quick Task 260509-me3: Expand /design Fixture Variety — Summary

One-liner: Replaced 3 near-identical WIKA clones with 6 distinct manometer-type fixtures (Bourdon, diaphragm, digital, differential, capsule, electronic switch) and expanded KeyFactsRibbon labels to cover temperature/accuracy/IP-rating variety, all inline in `src/app/design/page.tsx` to keep Phase 11 deletion single-file.

## What Was Built

The `/design` smoke route's ProductCard grid now renders 6 visually distinct cards instead of 3 spread-cloned cards. The facts arrays now exercise label variety beyond the original Range/Dial/Class triplet repetition.

### Final 6-card mix (id → type / manufacturer)

| ID     | Type                              | Manufacturer    | heroPublicId           | Locale |
| ------ | --------------------------------- | --------------- | ---------------------- | ------ |
| demo-1 | Bourdon-tube gauge                | WIKA            | demo/wika-232-bourdon  | uz     |
| demo-2 | Diaphragm gauge                   | AFRISO          | null (placeholder)     | ru     |
| demo-3 | Digital pressure transmitter      | Endress+Hauser  | demo/eh-cerabar-pmp23  | en     |
| demo-4 | Differential pressure transmitter | Rosemount       | demo/rosemount-3051cd  | uz     |
| demo-5 | Capsule low-pressure gauge        | null (omitted)  | null (placeholder)     | ru     |
| demo-6 | Electronic pressure switch        | Honeywell       | demo/honeywell-px2     | en     |

### Branch coverage tally

- `heroPublicId === null` → **2 cards** (demo-2, demo-5) exercise the `.mk-ph .mk-ph-corners` cross-hatched placeholder branch.
- `heroPublicId === string` → **4 cards** (demo-1, 3, 4, 6) exercise the `<CldImage>` branch. Cloudinary may 404 the synthetic `demo/*` `public_id`s — that is the expected smoke behavior; the rendering code path is what is being exercised.
- `manufacturerName === null` → **1 card** (demo-5) exercises the eyebrow-omitted edge case.
- `sku === null` → **0 cards** (out of constraint scope; original fixture set had 0 sku-null cards too).

### KeyFactsRibbon label variety

| Variant | Labels                                                            |
| ------- | ----------------------------------------------------------------- |
| facts3  | Range, Accuracy, **IP Rating**                                    |
| facts4  | Range, **Temperature**, Accuracy, Connection                      |
| facts6  | Range, **Temperature**, Accuracy, **IP Rating**, Output, Material |

Union of labels now contains temperature range (2x), accuracy class (3x), and IP rating (2x) — matches plan's must-have label variety.

## Inline-Only Confirmation

No new files were created. No new directories. No `scripts/` touched. No DB or migrations. `git status` shows exactly one modified path: `src/app/design/page.tsx`. Diff is `+88 / -24` lines.

The throwaway-route invariant holds: Phase 11 VRT closure can still delete `/design` by removing one file (`src/app/design/page.tsx`), no orphan fixture modules left behind.

## Untouched (preserved exactly)

- `Suspense` import + `<Suspense fallback=…>` boundary (Cache Components compat — see 06-05-SUMMARY § "Suspense over force-dynamic").
- `metadata` export with `robots: { index: false, follow: false }`.
- `<main className="mk">` wrapper (D-03 cascade).
- Header, Gauge section, KeyFactsRibbon JSX invocations, Helpers section, all rationale comments.
- ProductCardProps and KeyFact interfaces — fixtures conform to the frozen prop shapes exactly; no new fields, no extras.

## Verification Gate Outcomes

| Gate                                  | Result | Notes                                                                                                                                                                                                |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit -p tsconfig.json`       | exit 0 | Ran via main-repo `node_modules/.bin/tsc` against worktree tsconfig (worktree has no node_modules; `pnpm typecheck` reports `'tsc' is not recognized` — same binary, different invocation path). |
| `pnpm build`                          | not run | Per plan constraint: "`pnpm build` is desired but if it's slow/heavy, `pnpm tsc --noEmit` is the minimum bar." Worktree has no node_modules; running build would require a full install. The change is data-shape-identical fixture content inside an already-shipping route pattern, no build-surface risk.        |
| `pnpm test`                           | not run | Plan explicitly forbids: "Do NOT run `pnpm test` — this is fixture data on a noindex/nofollow internal smoke route, no test surface exists for it." |
| `grep -c "manufacturerName: null"`    | 1      | matches plan must-have                                                                                                                                                                               |
| `grep -c "heroPublicId: null"`        | 2      | matches plan must-have                                                                                                                                                                               |
| `grep -cE "heroPublicId: 'demo/"`     | 4      | matches plan must-have                                                                                                                                                                               |
| `grep -c "Temperature"`               | 2      | matches plan must-have (≥1)                                                                                                                                                                          |
| `grep -c "IP Rating"`                 | 2      | matches plan must-have (≥1)                                                                                                                                                                          |
| `grep -c "Accuracy"`                  | 3      | matches plan must-have (≥1)                                                                                                                                                                          |
| `grep -c "<Suspense"`                 | 1      | matches plan must-have (≥1)                                                                                                                                                                          |
| `grep -c "robots: { index: false, follow: false }"` | 1 | matches plan must-have                                                                                                                                                                       |
| `git status --short` paths            | 1      | Only `src/app/design/page.tsx`                                                                                                                                                                       |

## Deviations from Plan

None - plan executed exactly as written. The fixture array, locale rotation, fact arrays, and grid `.map()` body were copied verbatim from the plan.

## Authentication Gates

None.

## Threat Flags

None — fixture-only data on a noindex/nofollow internal smoke route. No new endpoints, no auth path changes, no schema changes, no trust-boundary modifications.

## Known Stubs

None — these are intentional throwaway fixtures by design (the entire `/design` route is the documented stub, scheduled for deletion in Phase 11 VRT closure per `06-05-SUMMARY`). No production data wiring required.

## Self-Check: PASSED

- Modified file exists: `src/app/design/page.tsx` ✓
- Commit `01997dc` exists in `git log` ✓
- All grep verification counts match must-haves ✓
- No accidental file deletions in commit (git diff --diff-filter=D HEAD~1 HEAD returned empty) ✓
- No untracked files left behind ✓
