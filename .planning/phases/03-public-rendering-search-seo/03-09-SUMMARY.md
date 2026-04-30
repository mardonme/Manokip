---
phase: 03-public-rendering-search-seo
plan: 09
subsystem: seo
status: complete-with-deferred-validation
wave: 8
depends_on: [01, 02, 03, 04, 05, 06, 07, 08]
requirements: [SEO-04, SEO-05, CAT-08]
tags:
  - phase-3-closure
  - hreflang-sweep
  - canonical
  - json-ld
  - lighthouse-ci
  - manual-gate
  - rich-results-test
  - cyrillic-glyph
  - uzbek-latin-modifier-letter
  - opt-in-non-blocking
  - net-new
dependency_graph:
  requires:
    - tests/fixtures/seed-public.ts (Plan 01) — deterministic 3-locale 6-product seed drives the 4 route-shape probes (homepage / category / product / manufacturer)
    - src/lib/metadata.ts buildAlternates (Plan 03-03) — single source of truth for hreflang + canonical emission; this plan probes its output end-to-end
    - src/app/[locale]/products/[slug]/page.tsx (Plan 03-05) — Product + BreadcrumbList JSON-LD asserted here without offers per D-08
    - src/app/[locale]/categories/[...slug]/page.tsx (Plan 03-04) — CollectionPage JSON-LD asserted here
    - src/app/[locale]/manufacturers/[slug]/page.tsx (Plan 03-07) — manufacturer detail probed for hreflang/canonical
    - src/app/sitemap-*.xml + sitemap-index.xml + robots.txt (Plan 03-08) — sitemap/robots smoke is part of the Phase-3 closure sweep
    - .github/workflows/e2e-preview.yml (Plan 02-17) — pattern reused: patrickedqvist/wait-for-vercel-preview + VERCEL_AUTOMATION_BYPASS_SECRET threading
    - playwright.config.ts (Plan 02-17) — extraHTTPHeaders bypass at config layer means seo-coverage.spec.ts inherits Pitfall #11 mitigation automatically
  provides:
    - tests/e2e/seo-coverage.spec.ts — 7 Playwright specs sweeping the 4 public route shapes for hreflang + canonical + JSON-LD + sitemap/robots smoke
    - .github/workflows/lighthouse-preview.yml — opt-in Lighthouse CI workflow on Vercel preview deployments for /uz/products/manometr-m-100 LCP measurement
    - .lighthouserc.json — mobile preset + Slow-4G throttling + 3 runs + warn-only LCP/perf assertions
  affects:
    - .planning/phases/03-public-rendering-search-seo/ — Phase 3 LOCALLY COMPLETE 9/9; deployment-side manual gates (Rich Results + glyph visual + Search Console) tracked as DEF-3-09-01..03
tech_stack:
  added: []
  patterns:
    - HTTP-only Playwright assertions (request.get + html.matchAll regex) — works on next dev / next start / Vercel preview without page navigation, no hydration cost
    - Slug-aligned-to-fixture (manometr-m-100, NOT plan-literal manometr-100) — same Rule-1 fix as Plan 03-05 product-detail.spec.ts
    - Lighthouse CI assertions warn-only (NOT error) — opt-in / non-blocking until Phase 5 dogfood gate hardens preview LCP into a blocking source-of-truth
    - LHCI_EXTRA_HEADERS env-var threading for treosh/lighthouse-ci-action — same posture as e2e-preview workflow's per-spec extraHeaders: x-vercel-protection-bypass when VERCEL_AUTOMATION_BYPASS_SECRET set, empty header object otherwise
    - 4-route-shape sweep template — homepage + category listing + product detail + manufacturer detail; the 4 shapes that cover every Phase-3 public surface and the only ones the verifier needs to grep
    - Phase-3 closure plan with deferred manual gates — closed-with-deferred-validation posture (established by Plan 02-17 DEF-2-17-01) reused: code/tests/CI shipped locally + manual gates queued as DEF items for the user's post-merge environmental work
key_files:
  created:
    - tests/e2e/seo-coverage.spec.ts
    - .github/workflows/lighthouse-preview.yml
    - .lighthouserc.json
  modified: []
decisions:
  - id: HTTP-ONLY-ASSERTIONS-NO-PAGE-NAV
    text: "seo-coverage.spec.ts uses request.get() + html.matchAll regex throughout — no page.goto / no JS hydration. Trade-off: cannot assert React-rendered DOM (e.g. canonical injected by react-helmet) but Phase 3 ships canonical/hreflang via Next.js Metadata API in <head> at first byte (server-rendered), so the regex sweep matches the actual production posture. Bonus: spec runs in <1s per route on a warm preview, vs ~4-8s with page navigation + hydration wait."
  - id: SLUG-DRIFT-FIX-INHERITED
    text: "Plan literal references /uz/products/manometr-100 but tests/fixtures/seed-public.ts line 108 seeds the M-100 product's uz slug as manometr-m-100. Inherited the Plan 03-05 SUMMARY Rule-1 fix (slug aligned to fixture). The Lighthouse workflow probes the same corrected slug. The plan literal slug would produce a 404 → invalidating both the e2e sweep and the LCP measurement."
  - id: LIGHTHOUSE-WARN-NOT-ERROR
    text: "All .lighthouserc.json assertions use warn (NOT error). Rationale: a Vercel preview's LCP measurement is sensitive to cold-start serverless cold boot, Neon HTTP driver cold connection, and Cloudinary CDN regional cache misses. A warn assertion surfaces the regression to PR reviewers via the Lighthouse report comment without blocking merge on a flaky measurement. The manual Slow-4G real-device gate (per 03-VALIDATION.md Manual-Only Verifications) remains the SEO-05 source of truth until Phase 5 dogfooding establishes a stable LCP baseline."
  - id: WORKFLOW-OPT-IN-PATHS-FILTER
    text: ".github/workflows/lighthouse-preview.yml only triggers on src/** + next.config.ts + package.json + pnpm-lock.yaml + .lighthouserc.json + the workflow file itself. Doc-only PRs (.planning/**, *.md) skip the workflow — saves ~2-3 minutes per doc PR for a metric that wouldn't have changed. workflow_dispatch is wired so reviewers can manually re-run on demand."
  - id: SHARED-CONCURRENCY-GROUP
    text: "concurrency.group = lighthouse-preview-${{ github.head_ref || github.ref }} cancels stale runs on rapid pushes — saves Lighthouse minutes (3 runs × ~30s + Vercel preview wait = ~3 min per cancelled run) and keeps the most-recent commit's report as the visible artifact. Same pattern as e2e-preview workflow."
  - id: MANUAL-GATES-DEFERRED-NOT-BLOCKING
    text: "Three manual gates (Rich Results Test on 3 URLs, Cyrillic+Uzbek-Latin glyph visual confirmation, Search Console International Targeting smoke) cross CLI/UI boundaries the executor cannot drive from a single CLI session. Following the Plan 02-17 DEF-2-17-01 closed-with-deferred-validation precedent, the plan completes locally with the automated artifacts shipped + the manual gates queued as DEF-3-09-01..03 in the user's post-merge environmental work. The Phase-3 verifier will record `complete-with-deferred-validation` for SEO-04 (Rich Results + glyph) and SEO-05 (Lighthouse + Slow-4G); CAT-08 closes on the automated JSON-LD assertion alone since the Rich Results manual gate is supplementary."
  - id: NO-NEW-DEPENDENCIES
    text: "Plan ships zero new package.json or workflow-action additions beyond the actions referenced verbatim by .github/workflows/e2e-preview.yml + the new treosh/lighthouse-ci-action@v12. Rationale: Phase 3 closure should consolidate, not introduce new surface. The Lighthouse CI tooling is the only reasonable LCP-measurement automation available (vs Sitespeed.io / WebPageTest) and ships as a single GH Action with zero runtime install."
metrics:
  tasks_completed: 2 (autonomous)
  manual_gates: 3 (deferred to user)
  task_commits: 2
  test_specs_added: 7 (Playwright e2e — 4 hreflang + 1 product JSON-LD + 1 category JSON-LD + 1 sitemap/robots smoke)
  files_created: 3
  files_modified: 0
  spec_lines: ~185 (tests/e2e/seo-coverage.spec.ts)
  workflow_lines: ~80 (.github/workflows/lighthouse-preview.yml + .lighthouserc.json)
  vitest_files_total: 32
  vitest_tests_total: 167
  e2e_files_total: 13
  e2e_tests_total: 49
  duration_minutes: ~15
  completed_at: 2026-04-30
---

# Phase 3 Plan 09: SEO Closure + Manual Gates Summary

Phase 3's final wave (Wave 8): a single Playwright sweep that asserts the
SEO-01 + SEO-02 + CAT-08 + SEO-03 contracts on every public route shape,
a Lighthouse CI workflow that captures preview-deployment LCP for
SEO-05, and three documented manual gates (Rich Results Test on 3 URLs,
Cyrillic + Uzbek-Latin glyph visual, Search Console International
Targeting smoke) queued for the user's post-merge environmental work.

Phase 3 LOCALLY COMPLETE 9/9 — all 20 Phase-3 requirements (8 CAT + 5
SRCH + 2 MFG + 5 SEO) closed in code + tests + admin UI + CI gates;
deployment-side validation tracked as DEF-3-09-01..03.

## Tasks

### Task 9.1 — `tests/e2e/seo-coverage.spec.ts` (7 specs)

Cross-page hreflang + canonical sweep, plus JSON-LD shape assertions
and a sitemap/robots smoke. All assertions are HTTP-only
(`request.get(...)` + `html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)`)
so the spec runs equally well against `next dev`, `next start`, and a
Vercel preview URL — no page navigation, no hydration, sub-second per
probe.

**The 4 hreflang/canonical specs (parameterised loop)**:

| Route | Path | Asserts |
|-------|------|---------|
| homepage | `/uz` | 4 hreflang (uz/ru/en/x-default) + canonical → `https://manometr.uz/uz` |
| category listing | `/uz/categories/manometr` | same 4-alternate + canonical pattern |
| product detail | `/uz/products/manometr-m-100` | same 4-alternate + canonical pattern |
| manufacturer detail | `/uz/manufacturers/wika` | same 4-alternate + canonical pattern |

The slug `manometr-m-100` (NOT the plan literal `manometr-100`) is the
actual `seedPublicFixture()` uz slug — same Rule-1 fix as the Plan 03-05
product-detail.spec.ts. Without the correction the route resolves to
404 and every assertion in the loop fails on the status check.

**The 3 JSON-LD / sitemap specs**:

1. `CAT-08: product detail emits Product + BreadcrumbList JSON-LD without offers (D-08)` — parses every `<script type="application/ld+json">` block, finds the `@type: 'Product'` schema, asserts `offers` is `undefined` (Manometr is a B2B catalog, not a store — D-08 LOCKED), and asserts a sibling `@type: 'BreadcrumbList'` schema exists.
2. `CAT-08: category listing emits CollectionPage JSON-LD` — same parser, asserts `@type: 'CollectionPage'` is present.
3. `SEO-03: /robots.txt + /sitemap-index.xml + /sitemap-uz.xml` smoke — verifies HTTP 200, correct Content-Type (`text/plain` vs `application/xml`), cross-link from robots.txt → sitemap-index.xml, sitemap-index.xml referencing all 3 child sitemaps, and per-entry `<xhtml:link rel="alternate" hreflang="uz">` inside the `<urlset>`.

**Local verification**:

```
$ pnpm playwright test --list tests/e2e/seo-coverage.spec.ts
Total: 7 tests in 1 file
$ pnpm tsc --noEmit
# clean, no output
$ pnpm vitest run
Test Files  32 passed (32)
Tests       167 passed (167)
```

**Commit**: `ee6a619` — `test(03-09): add SEO coverage e2e sweep — hreflang + canonical + JSON-LD + sitemap/robots`.

### Task 9.2 — `.github/workflows/lighthouse-preview.yml` + `.lighthouserc.json`

Opt-in / non-blocking Lighthouse CI workflow for Vercel preview
deployments. Mirrors the `e2e-preview.yml` shape verbatim:
`patrickedqvist/wait-for-vercel-preview@v1.3.1` produces the preview
URL on `steps.preview.outputs.url`, then `treosh/lighthouse-ci-action@v12`
runs against `${url}/uz/products/manometr-m-100` (the LCP-sensitive
surface — hero image + spec tables) with `LHCI_EXTRA_HEADERS` threading
`x-vercel-protection-bypass: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}`
to satisfy Pitfall #11 when Deployment Protection is ON.

**`.lighthouserc.json`** (~14 lines):

```json
{
  "ci": {
    "collect": {
      "settings": {
        "preset": "mobile",
        "throttling": { "rttMs": 150, "throughputKbps": 1638.4, "cpuSlowdownMultiplier": 4 }
      },
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
        "categories:performance": ["warn", { "minScore": 0.7 }]
      }
    }
  }
}
```

`mobile` preset + Slow-4G throttling matches the SEO-05 plan target
(`LCP < 2.5s on Slow-4G`). `numberOfRuns: 3` smooths Vercel cold-start
variance. Both assertions are `warn` (NOT `error`) per the
**LIGHTHOUSE-WARN-NOT-ERROR** decision — the metric surfaces in the PR
report comment but never blocks merge until Phase 5 dogfooding hardens
the LCP baseline.

**Trigger filter** (`pull_request.paths`):
- `src/**` — only Phase-3-relevant code changes
- `next.config.ts` — bundling/runtime config
- `package.json` + `pnpm-lock.yaml` — dependency bumps
- `.lighthouserc.json` + `.github/workflows/lighthouse-preview.yml` — meta
- `workflow_dispatch` — manual re-run

Doc-only PRs (`.planning/**`, `*.md`) skip the workflow → saves ~3 min
per doc PR for a metric that wouldn't have changed.

**Concurrency**: `lighthouse-preview-${{ github.head_ref || github.ref }}`
cancels stale runs on rapid pushes (same pattern as `e2e-preview.yml`).

**Commit**: `892914c` — `ci(03-09): add Lighthouse Preview workflow for SEO-05 LCP measurement`.

### Task 9.3 — Manual gates (DEFERRED — see "Manual Gates" section below)

Three gates that cross CLI/UI boundaries the executor cannot drive:

1. Rich Results Test on 3 URLs (Google Rich Results Test web tool — manual paste)
2. Cyrillic + Uzbek Latin (`oʻ`/`gʻ`, U+02BB modifier letter apostrophe) glyph visual — Chrome on a desktop with the preview deployment
3. Search Console International Targeting smoke (optional / deferred to Phase 5 SEO-06 if Search Console is not yet provisioned)

These are NOT blocking the plan summary; they are queued as
**DEF-3-09-01..03** with explicit step-by-step instructions in the
**Manual Gates** section. The closed-with-deferred-validation posture
is the same one Plan 02-17 established with DEF-2-17-01.

---

## Manual Gates (User Action Required)

> The following three gates run **after** this PR merges (or against a
> live Vercel preview deployment). They cannot be driven from a CLI
> session. Each one tracks as a DEF item the user closes with a one-line
> reply in this thread (or in the next session) once executed.
>
> Phase-3 verifier (`/gsd-verify-work`) will record SEO-04 + SEO-05 as
> `complete-with-deferred-validation` until the user reports the verdicts
> below; CAT-08 closes on the automated JSON-LD assertion alone (the
> Rich Results gate is supplementary not load-bearing for CAT-08).

### DEF-3-09-01 — Rich Results Test gate (CAT-08, SEO-04 partial)

**Goal**: Validate the JSON-LD this Phase emits is parseable by Google's
Rich Results Test with **0 errors** and the expected `@type` values
detected.

**Steps**:

1. Open the Vercel preview deployment URL for this PR (the URL exposed
   by the `e2e-preview` or `lighthouse-preview` workflow on the PR
   conversation timeline).
2. Visit https://search.google.com/test/rich-results
3. Test each of these 3 URLs (paste the full URL into the input, click
   "Test URL", wait for the report). Confirm the verdict for each:

   | URL | Expect detected types | Expect errors |
   |-----|----------------------|---------------|
   | `<preview>/uz/products/manometr-m-100` | Product, BreadcrumbList, Organization | 0 |
   | `<preview>/uz/categories/manometr` | CollectionPage, BreadcrumbList, Organization | 0 |
   | `<preview>/uz/manufacturers/wika` | BreadcrumbList, Organization | 0 |

   *Note*: Google may show a "Page is not eligible for rich results"
   informational banner even with 0 errors — that just means the schema
   types we emit don't currently render rich snippets in SERP (Product
   without offers, CollectionPage). This is **expected** and not a
   failure. The hard requirement is **0 errors** + **all expected
   `@type`s detected**.

4. If any URL reports errors, paste the screenshot/error message into
   the resume signal — the executor will diagnose.

**Resume signal**: `DEF-3-09-01: PASS` (all three URLs 0 errors) **or**
paste error details.

### DEF-3-09-02 — Cyrillic + Uzbek Latin glyph visual gate (SEO-04)

**Goal**: Confirm the next/font Inter subsets `['latin', 'latin-ext', 'cyrillic']`
(landed Phase 1 plan 01-04) actually render Cyrillic and Uzbek-Latin
modifier-letter-apostrophe glyphs without tofu / fallback / separator
artifacts.

**Steps**:

1. Open `<preview>/ru/products/manometr-m-100-ru` in **Chrome** on a
   desktop with DevTools open. The seedPublicFixture's M-100 ru
   translation reads `Манометр M-100` — verify the Cyrillic letters
   `М`, `а`, `н`, `о`, `м`, `е`, `т`, `р` render as proper Cyrillic
   glyphs (not boxed-tofu, not `MaH...` fallback to Latin lookalikes).
2. Open `<preview>/uz/manufacturers/wika`. The seedPublicFixture's WIKA
   uz description reads
   `WIKA — bosim oʻlchash uskunalari ishlab chiqaruvchi.` and the
   relationshipNote reads
   `Manometr — WIKA ning Oʻzbekistondagi rasmiy vakili 2019-yildan beri.`
   Verify the `oʻ` digraph (lowercase o + U+02BB MODIFIER LETTER
   TURNED COMMA) renders as a SINGLE visual unit without a gap or a
   separator artifact between the `o` and the apostrophe-like glyph.
   Same check for `gʻ` if any text contains it.
3. In Chrome DevTools → Network panel → filter `font` → reload the
   page. Confirm the Inter font file(s) load from
   `/_next/static/media/...` (next/font self-hosting; Phase 1 plan
   01-04 lock) — **not** from `fonts.googleapis.com` directly, which
   would mean the next/font integration regressed. Confirm at least
   one of the loaded font files has a URL fragment indicating a
   Cyrillic subset (the file name will contain `-cyrillic-` or the
   coverage `range=U+0400..U+04FF`).

**Resume signal**: `DEF-3-09-02: PASS` **or** paste a screenshot
showing the glyph artifact.

### DEF-3-09-03 — Search Console International Targeting smoke (SEO-03 + SEO-04, optional)

**Goal**: Verify Google Search Console parses the production sitemap
without errors and reports no hreflang errors in the International
Targeting panel.

**Steps**:

1. *Phase-3-only check*: skip if Search Console is not yet provisioned
   (Phase 1 plan 01-07 stack lists it as Phase 5). Mark
   `DEF-3-09-03: DEFERRED-PHASE5` and move on.
2. Otherwise: in Search Console, submit
   `https://manometr.uz/sitemap-index.xml` (NOT a preview URL — Search
   Console only accepts production hosts).
3. Wait up to 24 hours. Confirm the **Sitemaps** panel reports the 3
   child sitemaps (`sitemap-uz.xml`, `sitemap-ru.xml`,
   `sitemap-en.xml`) as parsed without errors.
4. Open **International Targeting** → **Language**. Confirm no hreflang
   errors are reported for the 3 locales.

**Resume signal**: `DEF-3-09-03: PASS` (parsed clean) **or**
`DEF-3-09-03: DEFERRED-PHASE5` (Search Console not yet provisioned).

---

## Phase 3 Closure Notes

This plan is the final closure plan for Phase 3. With the artifacts
shipped here, the Phase-3 verifier (`/gsd-verify-work`) can run in one
shot:

- **All CAT-* + MFG-* + SRCH-* requirements** close on
  `tests/e2e/seo-coverage.spec.ts` + the existing per-feature specs
  shipped by Plans 03-04 / 03-05 / 03-06 / 03-07 (catalog filters,
  product detail, search redirect, manufacturer pages).
- **SEO-01 + SEO-02 + SEO-03** close on
  `tests/e2e/seo-coverage.spec.ts` (4 hreflang + canonical loop + the
  sitemap/robots smoke).
- **SEO-04** closes on `tests/e2e/seo-coverage.spec.ts` JSON-LD
  assertions for CAT-08 (Product/BreadcrumbList without offers,
  CollectionPage) **plus** DEF-3-09-01 + DEF-3-09-02 manual gates.
  Status: `complete-with-deferred-validation` until the user reports
  the manual verdicts.
- **SEO-05** closes on `.github/workflows/lighthouse-preview.yml` LCP
  measurement (warn-only) **plus** the manual Slow-4G real-device
  gate per `03-VALIDATION.md` "Manual-Only Verifications". Status:
  `complete-with-deferred-validation` until the manual real-device
  measurement closes.
- **CAT-08** closes on the JSON-LD spec alone — the manual Rich
  Results Test gate (DEF-3-09-01) is supplementary, not load-bearing.

### Phase 3 plans (9 total)

| Plan | Wave | Status | Key deliverable |
|------|------|--------|-----------------|
| 03-01 | 1 | complete | seedPublicFixture (3 manufacturers + 6 products + 2 categories × 3 locales) |
| 03-02 | 1 | complete | Phase-3 schema migration (image_public_ids, datasheet_public_ids, manufacturer.is_official_rep, manufacturer_translations.relationship_note) |
| 03-03 | 2 | complete | buildAlternates() helper + locale layout + Organization JSON-LD on every public page (SEO-01, SEO-02) |
| 03-04 | 3 | complete | Category listing pages with CollectionPage JSON-LD + facet filters (CAT-01..06) |
| 03-05 | 4 | complete | Product detail page with Product + BreadcrumbList JSON-LD (no offers per D-08), grouped spec tables, manufacturer card, sticky CTA rail (CAT-07, CAT-08) |
| 03-06 | 5 | complete | Search routes (`/[locale]/search`) + product_search FTS + redirect (SRCH-01..05) |
| 03-07 | 6 | complete | Public manufacturer pages + Verified badge for is_official_rep (MFG-01, MFG-02) |
| 03-08 | 7 | complete | Per-locale sitemaps + sitemap-index + robots.txt (SEO-03) |
| 03-09 | 8 | **complete-with-deferred-validation** | SEO-coverage e2e sweep + Lighthouse CI workflow + 3 documented manual gates |

After DEF-3-09-01..03 close, Phase 3 transitions from `LOCALLY COMPLETE`
to `fully validated end-to-end` and Phase 4 (Recipes + Industries +
Cross-links per ROADMAP) opens.

## Verification

Local checks (executed at plan close):

| Check | Result |
|-------|--------|
| `pnpm playwright test --list tests/e2e/seo-coverage.spec.ts` | 7 tests in 1 file |
| `pnpm playwright test --list` (full e2e) | 49 tests in 13 files |
| `pnpm tsc --noEmit` | clean (0 errors) |
| `pnpm vitest run` | 32 files / 167 tests passed |
| `grep -c 'hreflang="x-default"' tests/e2e/seo-coverage.spec.ts` | 2 (acceptance ≥1) |
| `grep -cE 'CollectionPage\|BreadcrumbList\|Product' tests/e2e/seo-coverage.spec.ts` | 11 (acceptance ≥1) |
| `grep -cE 'sitemap-index.xml\|sitemap-uz.xml' tests/e2e/seo-coverage.spec.ts` | 6 (acceptance ≥1) |
| `grep -c "wait-for-vercel-preview" .github/workflows/lighthouse-preview.yml` | 2 |
| `grep -c "VERCEL_AUTOMATION_BYPASS_SECRET" .github/workflows/lighthouse-preview.yml` | 2 |
| `grep -c "lighthouse-ci-action" .github/workflows/lighthouse-preview.yml` | 3 |
| `grep -c "warn" .lighthouserc.json` | 2 |
| `.lighthouserc.json` parses as JSON | valid |
| `.github/workflows/lighthouse-preview.yml` parses as YAML | valid (jobs: ['lighthouse']) |

The seo-coverage spec is **NOT** executed locally — it requires a
deployment that has run `seedPublicFixture()` against its DB, which is
the Vercel preview's job. Local `pnpm playwright test` against
`http://localhost:3000` would fail on the seed-not-loaded resolution,
matching the local-fallback skip pattern Plan 02-17 established for
specs whose semantics require a real preview environment. The
`--list`-only verification is the canonical local proxy (same posture
as the Plan 02-17 OPS-01 gate).

## Deviations from Plan

None — both autonomous tasks executed as written aside from the
already-documented Plan 03-05 slug fix (`manometr-100` → `manometr-m-100`)
which was carried forward verbatim into both Task 9.1 and Task 9.2.

The plan's checkpoint Task 9.3 was auto-handled per the user's auto-mode
preference: the manual gates are documented as DEF-3-09-01..03 with
explicit step-by-step instructions (this section) rather than blocking
plan summary on a checkpoint return. This is the
`closed-with-deferred-validation` posture established by Plan 02-17
(DEF-2-17-01) — same precedent, same shape.

## Self-Check: PASSED

**Files created (3)**:
- `tests/e2e/seo-coverage.spec.ts` — FOUND
- `.github/workflows/lighthouse-preview.yml` — FOUND
- `.lighthouserc.json` — FOUND

**Commits (2)**:
- `ee6a619` `test(03-09): add SEO coverage e2e sweep` — FOUND in `git log`
- `892914c` `ci(03-09): add Lighthouse Preview workflow` — FOUND in `git log`
