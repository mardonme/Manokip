---
phase: 03-public-rendering-search-seo
plan: 08
subsystem: seo
status: complete
wave: 7
depends_on: [01, 02, 03, 04, 05, 06, 07]
requirements: [SEO-03]
tags:
  - sitemap
  - robots
  - hreflang
  - xml
  - tdd
  - cache-tag-sitemap
  - per-locale
  - net-new
dependency_graph:
  requires:
    - tests/fixtures/seed-public.ts (Plan 01) — deterministic 6-product / 2-category / 3-manufacturer seed across 3 locales drives the entry-count assertions
    - src/lib/revalidation.ts (Plan 02-05) — Phase-2 fan-out helpers already include `revalidateTag('sitemap', 'max')` on every product/category/manufacturer mutation; this plan only adds the consumer (cacheTag('sitemap'))
    - src/db/schema/products.ts + categories.ts + manufacturers.ts (Phase 1) — locale-translation tables with per-locale slugs
  provides:
    - src/lib/sitemap.ts — buildLocaleSitemapEntries(locale) + renderUrlsetXml(entries) + escapeXml(s) + SitemapEntry type
    - src/app/sitemap-uz.xml/route.ts + sitemap-ru.xml/route.ts + sitemap-en.xml/route.ts — per-locale <urlset> handlers
    - src/app/sitemap-index.xml/route.ts — <sitemapindex> referencing the 3 children
    - src/app/robots.txt/route.ts — Allow / + Sitemap directive
  affects:
    - tests/api/sitemap.test.ts — flipped from describe.skip stub to 9 live specs
tech_stack:
  added: []
  patterns:
    - per-locale XML sitemaps with <xhtml:link rel="alternate" hreflang="..."> alternates inside each <url> entry (Search Console hreflang signal)
    - GROUP BY entity + MAX(CASE WHEN locale='X' THEN slug END) to pull all 3 locale slugs in a single round-trip
    - 'use cache' + cacheTag('sitemap') so existing Phase-2 revalidation helpers invalidate the cache automatically (zero new wiring)
    - x-default alternate points to uz variant (project default per proxy.ts) — locked at the renderer layer, not per call-site
    - escapeXml applied to every dynamic value (T-03-08-01 — defense-in-depth on top of slug.ts normalization)
    - inline literal URL in robots.txt for plan acceptance grep parity (same posture as 02-13a -copy / 02-13b register('status') / 02-15 toCsv())
key_files:
  created:
    - src/lib/sitemap.ts
    - src/app/sitemap-uz.xml/route.ts
    - src/app/sitemap-ru.xml/route.ts
    - src/app/sitemap-en.xml/route.ts
    - src/app/sitemap-index.xml/route.ts
    - src/app/robots.txt/route.ts
  modified:
    - tests/api/sitemap.test.ts
decisions:
  - id: SHARED-HELPER-MODULE
    text: "src/lib/sitemap.ts is the single source of truth for sitemap entries + XML rendering. All 3 per-locale routes are 4-line wrappers that import buildLocaleSitemapEntries + renderUrlsetXml. Promotes consistency (every locale emits the same envelope) and makes future fan-out (recipes, industries when those land) a one-place edit."
  - id: ENTRY-COUNT-PER-LOCALE-FROM-SEED
    text: "Each locale sitemap (uz/ru/en) emits 14 entries from seedPublicFixture: 3 static paths (/<l>, /<l>/categories, /<l>/manufacturers) + 6 published products + 2 categories + 3 manufacturers. Production will scale linearly with admin-published entities."
  - id: GROUP-BY-MAX-CASE-FOR-ALTERNATES
    text: "Single SQL per entity table grouped by id, projecting per-locale slugs via MAX(CASE WHEN locale='X' THEN slug END) AS slug_X. One round-trip per entity table (3 total — products + categories + manufacturers) regardless of locale count, vs N×3 with naive per-locale queries. Skips entries whose current-locale translation row is missing (Pitfall #6 — never advertise a 404)."
  - id: STATIC-INDEX-AND-ROBOTS-NO-DB
    text: "sitemap-index.xml + robots.txt are static (Next.js compile output marks them ○ Static). Children carry the dynamic data + cache tag — index is just a pointer. Avoids a needless cache miss on every robots/index request."
  - id: SITEMAP-CACHE-LIFE-INHERITED
    text: "Per-locale sitemap routes inherit the 15m/1y cache life shown in `pnpm build` output (Next 16's default for routes calling 'use cache' without an explicit cacheLife). revalidateTag('sitemap', 'max') from Phase-2 mutation helpers reduces stale-while-revalidate to immediate eviction on the next request after admin save."
  - id: X-DEFAULT-LOCKED-AT-RENDERER
    text: "x-default → uz alternate emission lives inside renderUrlsetXml, not per call-site. Switching the project's default locale (currently uz per proxy.ts) is a one-line edit in the renderer rather than a 3-route change."
metrics:
  tasks_completed: 1
  task_commits: 3
  test_specs_added: 9 (live-Neon + pure unit)
  files_created: 6
  files_modified: 1
  lib_lines: ~250 (src/lib/sitemap.ts)
  duration_minutes: ~10
  completed_at: 2026-04-30
---

# Phase 3 Plan 08: Sitemaps + robots.txt Summary

Per-locale XML sitemaps with hreflang alternates, sitemap-index that ties
them together, and robots.txt that points crawlers to the index — all
gated by a single shared helper module so future entity types
(recipes, industries when those land) extend buildLocaleSitemapEntries
in one place.

## Tasks

### Task 8.1 — Shared helper + 4 sitemap routes + robots.txt + flipped sitemap.test.ts

**`src/lib/sitemap.ts`** (~250 lines):

- **`buildLocaleSitemapEntries(locale)`** — returns every URL the
  per-locale sitemap should advertise:
  - 3 static paths: `/<locale>`, `/<locale>/categories`,
    `/<locale>/manufacturers`
  - every published product (`WHERE p.status = 'published'` —
    T-03-08-02 mitigation; drafts excluded by construction)
  - every category
  - every manufacturer

  Each row carries an `alternates: Partial<Record<Locale, string>>` map
  built from the GROUP BY + MAX(CASE) projection so a single SQL per
  entity table returns all 3 locale slugs at once. Wrapped in
  `'use cache'` + `cacheTag('sitemap')` — Phase-2 mutation helpers
  already fan out `revalidateTag('sitemap', 'max')` per
  `src/lib/revalidation.ts`, so the 4 routes inherit invalidation
  end-to-end with zero new wiring.

- **`renderUrlsetXml(entries)`** — pure renderer (no DB). Emits the
  `<urlset xmlns:xhtml=...>` envelope and one `<url>` per entry with
  `<loc>`, optional `<lastmod>`, one `<xhtml:link rel="alternate"
  hreflang="...">` per locale variant, and a final `x-default` alternate
  pointing to the uz variant (project default per `proxy.ts`).

- **`escapeXml(s)`** — defense-in-depth XML escaper. Applied to every
  dynamic value (`<loc>` URLs and `href` attributes). Slugs are also
  normalized via `src/lib/slug.ts` at write-time so `<` and `&` should
  not appear in practice — escapeXml closes the gap if the convention
  is ever broken (T-03-08-01 mitigation).

**`src/app/sitemap-uz.xml/route.ts`** + `sitemap-ru.xml/route.ts` +
`sitemap-en.xml/route.ts` (4 lines each):

```typescript
export async function GET(): Promise<Response> {
  const entries = await buildLocaleSitemapEntries('uz' /* | 'ru' | 'en' */);
  const xml = renderUrlsetXml(entries);
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
```

**`src/app/sitemap-index.xml/route.ts`** — static `<sitemapindex>` with
3 `<sitemap>` children pointing to the per-locale sitemaps. No DB
access, no cache tag — children carry the dynamic data.

**`src/app/robots.txt/route.ts`** — `User-agent: * / Allow: / / Sitemap:
https://manometr.uz/sitemap-index.xml`. Static body.

**`tests/api/sitemap.test.ts`** — flipped from `describe.skip` to 9
live specs:

| # | Spec | Layer |
| - | ---- | ----- |
| 1 | buildLocaleSitemapEntries(uz) emits ≥14 entries with M-100 product included | live-Neon |
| 2 | ru sitemap uses ru-locale slugs (manometr-m-100-ru, NOT manometr-m-100) | live-Neon |
| 3 | renderUrlsetXml emits xhtml:link alternates for all 3 locales | unit |
| 4 | x-default alternate points to uz variant | unit |
| 5 | escapeXml handles &, <, >, ", apostrophe | unit |
| 6 | /sitemap-uz.xml returns Content-Type application/xml + valid envelope | live-Neon (route GET) |
| 7 | /sitemap-ru.xml + /sitemap-en.xml return Content-Type application/xml | live-Neon (route GET) |
| 8 | /sitemap-index.xml lists 3 sitemap children (uz, ru, en) | unit (route GET) |
| 9 | /robots.txt allows all + references sitemap-index.xml | unit (route GET) |

Tests open with `vi.mock('next/cache')` to stub out `cacheTag` /
`revalidateTag` without spinning up Next 16's cache runtime — same
posture as `tests/api/autocomplete.test.ts`.

## Per-locale Entry Counts (from seedPublicFixture)

Each locale (uz / ru / en) emits **14 sitemap entries** from the seed:

| Section | Count | Source |
| ------- | ----- | ------ |
| Static paths | 3 | `/<locale>`, `/<locale>/categories`, `/<locale>/manufacturers` |
| Published products | 6 | M-100, M-200, M-300 (manometers) + T-100, T-200, T-300 (transmitters) |
| Categories | 2 | manometers, transmitters |
| Manufacturers | 3 | WIKA, BD Sensors, Метран |
| **Total** | **14** | per locale |

Production scales linearly with admin-published entities; expected to
grow into the low-thousands range as the catalog fills. No pagination
needed at v1 (the 50,000-URL / 50MB Sitemap protocol limit is not
near).

## Cache Tag

All 3 per-locale sitemap routes share a single `cacheTag('sitemap')`.
Phase-2's `revalidateProduct(id)`, `revalidateCategory(id)`,
`revalidateCategoryMove(...)`, and `revalidateManufacturer(id)` helpers
in `src/lib/revalidation.ts` already include `'sitemap'` in their
fan-out — every admin save (publish / unpublish / rename / slug change
/ category re-parent / manufacturer toggle) invalidates the per-locale
sitemaps automatically. **No new wiring was needed in this plan.**

`pnpm build` registers the routes with cache life **15m / 1y** (Next
16's default for routes calling `'use cache'` without an explicit
`cacheLife()`). `revalidateTag('sitemap', 'max')` from any Phase-2
mutation reduces stale-while-revalidate to immediate eviction on the
next request.

## Build Output

```
○ /robots.txt
○ /sitemap-en.xml                                      15m      1y
○ /sitemap-index.xml
○ /sitemap-ru.xml                                      15m      1y
○ /sitemap-uz.xml                                      15m      1y
```

`○` Static prerender for `robots.txt` + `sitemap-index.xml` (no DB).
The 3 per-locale sitemaps cache TTL of 15 minutes / 1 year revalidate
visible — same as the rest of the public catalog.

## Threat Model Compliance

| Threat ID | Disposition | Mitigation in code |
| --------- | ----------- | ------------------ |
| T-03-08-01 (XSS-via-XML) | mitigate | `escapeXml(s)` applied to every dynamic `<loc>` and `href` attribute in `renderUrlsetXml`. Defense-in-depth on top of slug.ts which normalizes XML special chars at write-time. |
| T-03-08-02 (Information Disclosure — draft slugs leaking) | mitigate | `WHERE p.status = 'published'` in the products query. Drafts are excluded structurally; even a category- or manufacturer-row that exists only in drafts emits no product entry. |
| T-03-08-03 (DoS via uncached sitemap rebuild) | mitigate | `'use cache'` + `cacheTag('sitemap')` means the cold rebuild only fires when `revalidateTag('sitemap', 'max')` does (admin write path). Steady state is served from edge cache. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Acceptance Criterion Conflict] Inlined sitemap-index URL literal in robots.txt**

- **Found during:** Task 8.1 acceptance grep verification.
- **Issue:** Initial robots.txt body used a `${HOST}/sitemap-index.xml`
  template literal. The runtime body was correct (test 9 verified it),
  but `grep -q "Sitemap: https://manometr.uz/sitemap-index.xml"` at
  source level returned 0 because the literal substring lives in the
  template variable, not the source.
- **Fix:** Replaced `${HOST}` with the literal URL inline. Behavior
  identical; tests stay 9/9 green; acceptance grep now returns 2 (one
  literal + one mention in the comment header).
- **Files modified:** `src/app/robots.txt/route.ts`.
- **Commit:** `6a45932` (separate refactor commit so the GREEN feat
  commit `37a119d` stays focused on the actual feature).

Same posture as Phase-2 plans (02-13a `-copy` literal, 02-13b
`register('status')` literal, 02-15 `toCsv()` literal): when the plan's
acceptance grep targets a literal substring, the source MUST contain it
verbatim — even if the runtime resolution would have been correct.

## Test Counts

- vitest: **167/167 passing** across 32 files (was 158/158 across 31
  files at Plan 03-06 close + 167/167 across 32 at Plan 03-07 close;
  this plan adds +1 file +9 specs vs the 03-06 baseline; Plan 03-07
  added no new vitest specs so 167/167 is the unchanged count).
- TypeScript: `pnpm tsc --noEmit` exits 0.
- Build: `pnpm build` "Compiled successfully in 18.5s"; `/robots.txt`,
  `/sitemap-index.xml`, `/sitemap-{uz,ru,en}.xml` registered as Static
  routes; per-locale sitemaps show 15m/1y cache life.
- Playwright: no new e2e specs in this plan (sitemap content is
  validated at the Vitest layer; Search Console submission is the
  Phase-5 manual gate per Plan 09 / launch polish).

## Requirements Closed

- **SEO-03** — per-locale XML sitemaps from robots.txt. Closed at unit
  + build level. Manual Search Console submission + International
  Targeting validation deferred to Plan 09 / Phase 5 launch polish.

## Pointer to DEF-2-17-01 (Plan 05 Task 5.4)

Plan 03-08 originally carried the Phase-2 02-17 deferred admin-edit-
revalidates spec migration (the e2e gate that asserts a Phase-3 public
detail page invalidates after an admin save). That work was MOVED to
**Plan 03-05 Task 5.4 (Wave 4)** so the spec validates the public
detail URL from the moment the URL ships (rather than waiting for
Wave 7). Plan 03-08 no longer touches `tests/e2e/admin-edit-revalidates.spec.ts`.

## Self-Check: PASSED

- [x] `src/lib/sitemap.ts` exists and exports buildLocaleSitemapEntries + renderUrlsetXml + escapeXml + SitemapEntry
- [x] `src/app/sitemap-uz.xml/route.ts` exists with `from '@/lib/sitemap'` import + `application/xml` Content-Type
- [x] `src/app/sitemap-ru.xml/route.ts` exists with same shape
- [x] `src/app/sitemap-en.xml/route.ts` exists with same shape
- [x] `src/app/sitemap-index.xml/route.ts` exists with `<sitemapindex` content
- [x] `src/app/robots.txt/route.ts` exists with `Sitemap: https://manometr.uz/sitemap-index.xml` literal
- [x] `'use cache'` + `cacheTag('sitemap')` present in `src/lib/sitemap.ts`
- [x] `xhtml:link` emission present in `src/lib/sitemap.ts` (5 occurrences in renderer body)
- [x] commits 1779807 (RED) + 37a119d (GREEN) + 6a45932 (refactor) all present in `git log`
- [x] full vitest suite 167/167 passing
- [x] `pnpm tsc --noEmit` clean
- [x] `pnpm build` green; 5 new routes registered (4 static, 3 of them with 15m/1y cache life)

---

*Plan 03-08 — sitemap infrastructure complete; SEO-03 closed at unit +
build level; Search Console submission deferred to Plan 09 / Phase 5
launch polish.*
