---
phase: 3
slug: public-rendering-search-seo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (node + dom projects) + Playwright (e2e, preview deployment) |
| **Config file** | `vitest.config.ts` (root), `playwright.config.ts` (root) |
| **Quick run command** | `pnpm vitest run` |
| **Full suite command** | `pnpm vitest run && pnpm playwright test` |
| **Estimated runtime** | ~90 seconds (vitest) + ~120 seconds (playwright local) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run`
- **After every plan wave:** Run `pnpm vitest run && pnpm playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds (vitest only — pre-task feedback)

---

## Per-Task Verification Map

> Concrete task IDs are filled in by the planner during PLAN.md authoring. The rows below pre-allocate one entry per requirement so coverage gaps are visible up front. Planner adds plan/wave assignments and task IDs.

| Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | CAT-01 | — | Locale switcher reachable site-wide; URL changes locale segment | e2e | `pnpm playwright test tests/e2e/locale-switcher.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | CAT-02 | — | Category tree renders, links navigate to listing pages | e2e | `pnpm playwright test tests/e2e/category-nav.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | CAT-03 | — | Category listing returns correct product count for category | integration | `pnpm vitest run tests/db/catalog.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | CAT-04 | T-V5-01 | Faceted filters parameterized; numeric range + enum + bool return correct subset | integration | `pnpm vitest run tests/db/catalog.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | CAT-05 | — | Filter state survives page reload; shareable URL returns same results | e2e | `pnpm playwright test tests/e2e/catalog-filters.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | CAT-06 | — | Product detail spec tables rendered grouped by spec_field_group | e2e | `pnpm playwright test tests/e2e/product-detail.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | CAT-07 | — | First-byte HTML contains product name (true SSR, not client-rendered) | e2e (fetch) | within `product-detail.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | CAT-08 | — | `<script type="application/ld+json">` Product type validates structurally | unit | `pnpm vitest run tests/lib/jsonld.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SRCH-01 | T-V5-01 | Query against current locale tsvector returns ranked products | integration | `pnpm vitest run tests/db/search.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SRCH-02 | — | Zero-hit current locale falls back uz→ru→en with banner | integration | `pnpm vitest run tests/db/search.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SRCH-03 | T-V5-01 | Autocomplete prefix returns matching products + SKU exact match top | integration | `pnpm vitest run tests/api/autocomplete.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SRCH-04 | T-V7-01 | Exact SKU search 302-redirects to product detail in current locale | e2e | within `product-detail.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SRCH-05 | — | `saveProduct` transaction rebuilds 3 `product_search` tsvector rows | integration | `pnpm vitest run tests/actions/products.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | MFG-01 | — | Manufacturers index renders all manufacturers with logos + counts | e2e | `pnpm playwright test tests/e2e/manufacturers.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | MFG-02 | — | Manufacturer detail renders bio, official-rep badge if true, paginated product list | e2e | within `manufacturers.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SEO-01 | — | Every public page has hreflang for uz/ru/en + x-default | unit | `pnpm vitest run tests/lib/metadata.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SEO-02 | — | Product detail canonical matches current locale URL | unit | within `metadata.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SEO-03 | — | Sitemap XML includes products in all 3 locales; referenced from robots.txt | integration | `pnpm vitest run tests/api/sitemap.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | SEO-04 | — | `next/font` Inter loads with cyrillic + latin-ext subsets | manual | Lighthouse on preview deployment | — | ⬜ pending |
| TBD | TBD | SEO-05 | — | LCP on product detail < 2.5s on Slow 4G | manual/e2e | Lighthouse on preview deployment | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is the test-stub-and-fixture wave that runs FIRST. Every plan that depends on these stubs MUST list Wave 0 as a `depends_on`.

- [ ] `tests/e2e/locale-switcher.spec.ts` — stubs for CAT-01
- [ ] `tests/e2e/category-nav.spec.ts` — stubs for CAT-02
- [ ] `tests/db/catalog.test.ts` — stubs for CAT-03, CAT-04
- [ ] `tests/e2e/catalog-filters.spec.ts` — stubs for CAT-05
- [ ] `tests/e2e/product-detail.spec.ts` — stubs for CAT-06, CAT-07, SRCH-04
- [ ] `tests/lib/jsonld.test.ts` — stubs for CAT-08
- [ ] `tests/db/search.test.ts` — stubs for SRCH-01, SRCH-02
- [ ] `tests/api/autocomplete.test.ts` — stubs for SRCH-03
- [ ] `tests/actions/products.test.ts` — extend with SRCH-05 tsvector rebuild assertion (file exists from Phase 2)
- [ ] `tests/e2e/manufacturers.spec.ts` — stubs for MFG-01, MFG-02
- [ ] `tests/lib/metadata.test.ts` — stubs for SEO-01, SEO-02
- [ ] `tests/api/sitemap.test.ts` — stubs for SEO-03
- [ ] `tests/e2e/admin-edit-revalidates.spec.ts` — update goto target from `/uz/admin/products` to `/uz/products/<slug>` (Phase-3 migration item from Phase-2 02-17 deferred)
- [ ] Shared fixtures: `tests/fixtures/seed-public.ts` — minimum seed data for catalog/search/manufacturer tests (3 manufacturers, 6 products in 2 categories, 3 locales each)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slow-4G LCP within Core Web Vitals budget | SEO-05 | Requires real device throttling; Lighthouse CI on preview is the closest automated proxy but not reliable in CI | Open Vercel preview deployment in Chrome DevTools → Network panel → throttle to "Slow 4G" → Lighthouse audit → confirm LCP < 2.5s on a representative product detail page |
| Cyrillic + Uzbek Latin (oʻ/gʻ U+02BB) renders correctly | SEO-04 | `next/font` subset loading is verifiable by code inspection but visual fidelity requires human eyes | Visit `/uz/products/<slug-with-oʻ>` and `/ru/products/<slug-with-cyrillic>` on preview; confirm glyphs render without fallback/tofu |
| Rich Results Test passes for Product/Organization/CollectionPage/BreadcrumbList | CAT-08, SEO-04 | Requires Google's hosted validator which cannot run in CI | Paste preview deployment URL into [Rich Results Test](https://search.google.com/test/rich-results); confirm 0 errors, 4 detected types on product detail and category pages |
| Yandex Webmaster validates sitemap + JSON-LD | SEO-03, SEO-04 | External service; manual submission required | Submit `sitemap-index.xml` URL via Yandex Webmaster; confirm parsed without errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (13 stubs + 2 extensions above)
- [ ] No watch-mode flags in any test command
- [ ] Feedback latency < 90s for vitest quick run
- [ ] `nyquist_compliant: true` set in frontmatter once planner has populated all task IDs

**Approval:** pending
