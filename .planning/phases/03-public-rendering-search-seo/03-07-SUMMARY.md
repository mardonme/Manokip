---
phase: 03-public-rendering-search-seo
plan: 07
subsystem: manufacturer-public-pages
tags: [manufacturers, mfg-01, mfg-02, d-10, d-11, jsonld, hreflang, partial-prerender, cache-components, official-rep, relationship-note]

# Dependency graph
requires:
  - phase: 03-public-rendering-search-seo
    provides: Wave-0 (Plan 01) — RED stub at tests/e2e/manufacturers.spec.ts (MFG-01 + MFG-02), seedPublicFixture deterministic IDs, schema-dts dep, cacheComponents flag
  - phase: 03-public-rendering-search-seo
    provides: Wave-1 (Plan 02) — manufacturer.is_official_rep + manufacturer_translations.relationship_note migration LIVE on Neon dev; seed-public extended to populate WIKA is_official_rep=true with per-locale relationship_note
  - phase: 03-public-rendering-search-seo
    provides: Wave-2 (Plan 03) — buildAlternates() + SITE_HOST + Locale type + breadcrumbJsonLd, NuqsAdapter + Suspense-wrapped SiteHeader in root layout, public namespace foundation in messages/{uz,ru,en}.json
  - phase: 03-public-rendering-search-seo
    provides: Wave-3 (Plan 04) — ProductCard RSC primitive (reused for the manufacturer-scoped product grid), proven seedPublicFixture end-to-end, Suspense-wrapped page-shell pattern under cacheComponents
  - phase: 02-admin-panel
    provides: ManufacturerForm + saveManufacturer (withAdminAction-wrapped per CLAUDE.md), revalidateManufacturer fan-out (3 tags: manufacturer:<id> + manufacturers-list + sitemap), MediaUploader + LocaleTabs + Switch + Textarea primitives
provides:
  - src/lib/manufacturer-public.ts — getManufacturers(locale) + getManufacturerBySlug(locale, slug) + getManufacturerProducts(manufacturerId, locale, page, pageSize); each wrapped in 'use cache' + cacheTag (manufacturers-list / manufacturer:<id> / products-list)
  - src/app/[locale]/manufacturers/page.tsx — Suspense-wrapped MFG-01 index renders all manufacturers as cards (logo + name + product count + Authorized pill when isOfficialRep) + BreadcrumbList JSON-LD + generateMetadata via buildAlternates (no slug map — same path under each locale)
  - src/app/[locale]/manufacturers/[slug]/page.tsx — Suspense-wrapped MFG-02 detail renders priority-loaded logo + Verified Badge (D-11) + per-locale relationship-note + description + paginated product grid scoped to manufacturer + BreadcrumbList JSON-LD + per-locale canonical/hreflang via buildAlternates({slugByLocale})
  - Extended saveManufacturer (preserves withAdminAction wrap) — persists isOfficialRep on base row + relationshipNote per-locale on each manufacturer_translations row; revalidateManufacturer fan-out unchanged
  - ManufacturerForm UX — Switch for isOfficialRep (top-level) + per-locale Textarea for relationshipNote inside LocaleTabs; edit page projects both fields into form defaults
  - public.manufacturer i18n namespace in messages/{uz,ru,en}.json (all/verified/authorized/productCount/products/noProducts/noResults)
  - 4 active Playwright e2e specs in tests/e2e/manufacturers.spec.ts (flipped from RED stubs) — MFG-01 cards, MFG-01 WIKA Authorized badge, MFG-02 verified+relationship+products, MFG-02 BreadcrumbList JSON-LD
affects: [03-08-sitemap-robots-seo, 03-09-smoke-cwv]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-locale slugByLocale fan-out for manufacturer hreflang — Pitfall #6 (never advertise a 404): all 3 manufacturer_translations rows fetched in the same parallel batch, missing locales OMITTED from buildAlternates languages map"
    - "Per-locale relationship_note WITHOUT cross-locale fallback — name + description fall back to uz when current-locale missing (Phase-1 D-05 cascade root); relationship_note is intentionally locale-strict because it is rendered as in-locale copy meant to read natively. A WIKA Russian visitor seeing the Russian relationship note is the explicit requirement; falling back to uz copy on the ru page would defeat the purpose."
    - "JSON-LD XSS hardening — JSON.stringify(breadcrumbLd).replace(/</g, '\\\\u003c') applied before script-tag injection (T-03-03-02 mitigation; closes the </script> termination vector when manufacturer.name contains '<')"
    - "Manufacturer-scoped product grid mirrors getCategoryProducts but parent scope is manufacturer_id instead of category_id — single ProductCard primitive serves both surfaces (Plan 04 catalog + Plan 07 manufacturer)"
    - "saveManufacturer extension preserves withAdminAction wrap (W3 acceptance criterion / CLAUDE.md guardrail) — every Server Action mutation goes through requireAdmin; the new isOfficialRep + relationshipNote writes simply slot into the existing wrapped function body's set/values blocks and the per-locale onConflictDoUpdate"
    - "Suspense-wrapped page-shell under cacheComponents — both new pages report Partial Prerender (◐) in the build output, matching the Wave-2/Wave-3 pattern (admin layout, login, invite, categories, products)"

key-files:
  created:
    - "src/lib/manufacturer-public.ts (≈260 LOC) — 3 'use cache'-tagged helpers"
    - "src/app/[locale]/manufacturers/page.tsx (≈115 LOC) — MFG-01 Suspense-wrapped index with BreadcrumbList JSON-LD + Authorized pills"
    - "src/app/[locale]/manufacturers/[slug]/page.tsx (≈210 LOC) — MFG-02 Suspense-wrapped detail with Verified badge + relationship-note + scoped product grid + BreadcrumbList JSON-LD + 3-locale hreflang"
  modified:
    - "src/lib/zod/manufacturer.ts — added isOfficialRep boolean default false (top-level) + relationshipNote string max 500 chars nullable (per-locale)"
    - "src/actions/manufacturers.ts — saveManufacturer persists isOfficialRep on base row + relationshipNote per-locale; withAdminAction wrap + revalidateManufacturer fan-out preserved unchanged"
    - "src/app/[locale]/admin/manufacturers/manufacturer-form.tsx — added Switch for isOfficialRep (top-level shared field) + per-locale Textarea for relationshipNote inside LocaleTabs"
    - "src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx — projects isOfficialRep + per-locale relationshipNote into the form's initial values"
    - "messages/uz.json — added public.manufacturer namespace (uz)"
    - "messages/ru.json — added public.manufacturer namespace (ru — Производители / Проверено / Авторизованный)"
    - "messages/en.json — added public.manufacturer namespace (en)"
    - "tests/e2e/manufacturers.spec.ts — flipped 4 test.skip → 4 active specs in a single describe block; Vercel-bypass-header passthrough; XSS-hardening reversal in the JSON-LD parse"

key-decisions:
  - "saveManufacturer extension done INSIDE the existing withAdminAction wrap (CLAUDE.md guardrail W3 acceptance criterion). The existing function body already had the right structure: pre-tx snapshot, dbTx.transaction with row upsert + LOCALES loop + audit, post-tx revalidateManufacturer call. The new fields (isOfficialRep on base row, relationshipNote per locale) slot directly into the existing set/values blocks + the per-locale onConflictDoUpdate. No structural change."
  - "Per-locale relationship_note has NO cross-locale fallback. Name + description fall back to uz when the current-locale translation row is missing (Phase-1 D-05 cascade root — defensive against partial seeds, not a behavioral feature). relationship_note is per-locale ONLY because it's rendered as in-locale copy meant to read natively (e.g. a Russian visitor seeing 'Официальный представитель WIKA в Узбекистане с 2019 г.'). Falling back to the uz copy on the ru page would render Latin script next to a Cyrillic UI and defeat the purpose. The detail helper explicitly returns `displayRow?.relationship_note ?? null` and never reaches into the fallback row for this field."
  - "JSON-LD emission uses the same XSS-hardening pattern established in Wave 2 (replace `<` with `<` after JSON.stringify). manufacturer.name + relationship_note are admin-controlled strings but they cross into a `<script type=\"application/ld+json\">` block where React's auto-escape doesn't apply. Without the replace, a manufacturer name like `</script><script>alert(1)` would terminate the script element early and inject arbitrary JS. T-03-03-02 mitigation."
  - "Page shells are Suspense-wrapped per the Wave-0 cacheComponents contract. Both routes report `◐ (Partial Prerender)` in the build output, matching Plan 04 catalog pages and Plan 05 product detail. Without Suspense the build fails with 'Uncached data accessed outside <Suspense>' (Wave-0 Pitfall A6)."
  - "Detail page accepts ?page= and ?pageSize= search params for pagination but parses them OUTSIDE the cache boundary (Pitfall #2). Resolved primitives flow into getManufacturerProducts which alone is the cache boundary. The pagination UI is minimal (current/total indicator) — Plan 04 established the same posture and a follow-up plan can extend if v1 manufacturers grow large product counts (unlikely at v1 scale of 100–500 total products distributed across 3+ manufacturers)."
  - "Manufacturer-scoped product grid reuses ProductCard from Plan 04 unchanged. Same shape (id + slug + name + shortDesc + heroPublicId + manufacturerName + sku) — the only difference is the parent scope WHERE clause (manufacturer_id vs category_id). This keeps the visual contract single-sourced and means Plan 09 CWV smoke gates measure the same component on both routes."

# Metrics
duration: ~16min
completed: 2026-04-30
tasks: 3
files_created: 3
files_modified: 8
requirements: [MFG-01, MFG-02]
---

# Phase 3 Plan 07: Manufacturer Public Pages Summary

**Manufacturer SEO surface lands: /[locale]/manufacturers index with logo+name+count+Authorized pills, /[locale]/manufacturers/<slug> detail with Verified badge + per-locale relationship_note + scoped product grid, BreadcrumbList JSON-LD on both routes, 3-locale hreflang via buildAlternates({slugByLocale}), and admin-side extension to ManufacturerForm so the content team can flip is_official_rep + write per-locale relationship notes through the existing withAdminAction-wrapped saveManufacturer (CLAUDE.md guardrail preserved).**

## Performance

- **Duration:** ~16 min (11:18:21Z → 11:34:06Z UTC)
- **Tasks:** 3
- **Files created:** 3 (1 lib helper + 2 page files)
- **Files modified:** 8 (1 zod + 1 action + 1 form + 1 edit page + 3 message bundles + 1 e2e spec)

## Accomplishments

- **MFG-01 closed end-to-end.** `/[locale]/manufacturers` lists all 3 seeded manufacturers (WIKA / BD Sensors / Метран) as cards rendering Cloudinary logo via `<CldImage>` + display name + per-locale slug + published-product count + an `[data-testid=authorized-badge]` Badge (`bg-emerald-600 text-white`) when `is_official_rep === true`. WIKA shows the Authorized pill; BD Sensors and Метран do not. Verified live: `curl /uz/manufacturers` returns `manufacturer-card-wika` + `manufacturer-card-bd-sensors` + `manufacturer-card-metran` testids and `authorized-badge` only on WIKA.
- **MFG-02 closed end-to-end.** `/[locale]/manufacturers/wika` renders priority-loaded logo (LCP-friendly via CldImage `priority`) + manufacturer name `<h1>` + Verified badge (D-11 driven by `is_official_rep=true`) + per-locale italic relationship note (uz: "WIKA ning Oʻzbekistondagi rasmiy vakili 2019-yildan beri") + description paragraph + website link + paginated product grid scoped to WIKA's `manufacturer_id` rendered via the Plan-04 `<ProductCard />` primitive. Verified live: `curl /uz/manufacturers/wika` returns `verified-badge` + `relationship-note` + `products-heading` + `manufacturer-products` testids; canonical + 3-locale hreflang + x-default → uz emitted in `<head>`.
- **D-11 admin-side extension shipped.** ManufacturerForm grew an `isOfficialRep` Switch (top-level, shared across locales) + a per-locale `relationshipNote` Textarea inside the LocaleTabs. The edit page projects both fields into the form's initial values; the new page inherits the EMPTY_INITIAL defaults (`isOfficialRep: false` + `relationshipNote: ''`). saveManufacturer preserves the withAdminAction wrap (W3 acceptance criterion / CLAUDE.md guardrail) — every Server Action mutation continues to pass through requireAdmin before any DB write.
- **revalidateManufacturer fan-out unchanged.** The existing 3-tag fan-out (`manufacturer:<id>` + `manufacturers-list` + `sitemap` per `src/lib/revalidation.ts`) still fires after every save. Editing the new fields invalidates the public manufacturer index (manufacturers-list tag) + the specific detail page (manufacturer:<id> tag) within revalidation latency. Pitfall #2: revalidate call lives OUTSIDE `dbTx.transaction` block, post-commit only — preserved unchanged.
- **3/3 manufacturers action vitest specs still GREEN** after the field additions (live Neon). 146/146 specs across the whole project pass; 11 unrelated skips remain.
- **`pnpm tsc --noEmit` exits 0** through both task verifications.
- **`pnpm build` exits 0** with `cacheComponents: true`. Both new routes report `◐ (Partial Prerender)` in the build output:
  - `/[locale]/manufacturers` (15m / 1y cache lifetime)
  - `/[locale]/manufacturers/[slug]` (parameterized, dynamic prerender)
- **4 Playwright e2e specs flipped from skip to active** — `pnpm playwright test --list tests/e2e/manufacturers.spec.ts` reports 4 tests, 0 skip. The specs are ready to run on a Vercel preview deployment with the seed populated (or locally with a fresh build + seed).

## Task Commits

Each task committed atomically with `--no-verify` per the parallel-executor contract:

1. **Task 7.1: Zod schema + saveManufacturer + admin form D-11 fields** — `3c8acd0` (feat) — 4 files; preserves the withAdminAction wrap; 3/3 manufacturer action specs still pass.
2. **Task 7.2: src/lib/manufacturer-public.ts + 2 public pages + 3 message bundles** — `659dd8c` (feat) — 6 files; pnpm build exits 0; both new routes Partial Prerender (◐).
3. **Task 7.3: Flip MFG-01 + MFG-02 e2e specs** — `eb3d370` (test) — 1 file; 4 active specs, 0 skip.

## Files Created/Modified

### Created (3)

- `src/lib/manufacturer-public.ts` (~260 LOC) — exports `getManufacturers`, `getManufacturerBySlug`, `getManufacturerProducts`, plus the `ManufacturerCardData` / `ManufacturerDetailData` / `ManufacturerProductsResult` type surface. All three helpers wrapped in `'use cache'` with appropriate cacheTag emission (manufacturers-list / manufacturer:<id> / products-list). The slug → id resolver short-circuits with null when the slug doesn't exist for the locale (page → notFound). Per-locale fallback to uz on name+description; per-locale-only on relationship_note (locale-strict by design).
- `src/app/[locale]/manufacturers/page.tsx` (~115 LOC) — Suspense-wrapped MFG-01 index. Default export is a non-async wrapper returning `<Suspense fallback={...}><ManufacturersIndexContent /></Suspense>`. Content fetches via getManufacturers(locale), renders cards with CldImage logos + Authorized badge + product count, emits BreadcrumbList JSON-LD with XSS-hardening, generateMetadata returns title + canonical + hreflang via buildAlternates (no slug map).
- `src/app/[locale]/manufacturers/[slug]/page.tsx` (~210 LOC) — Suspense-wrapped MFG-02 detail. Resolves manufacturer via getManufacturerBySlug; calls notFound() on null; fetches scoped products + i18n in parallel; renders header with priority CldImage + name h1 + Verified badge + relationship-note + description + website link; renders paginated ProductCard grid; emits BreadcrumbList JSON-LD; generateMetadata returns title + description + slugByLocale-driven hreflang map (uz + ru + en + x-default → uz, missing locales OMITTED).

### Modified (8)

- `src/lib/zod/manufacturer.ts` — `manufacturerInsertSchema` extended with `isOfficialRep: z.boolean().default(false)` (top-level) + per-locale `relationshipNote: z.string().max(500).optional().nullable()` inside the existing `localeFields` shape. Comments document D-11 + 500-char rationale (SEO-tight copy + React auto-escape T-03-07-04 mitigation).
- `src/actions/manufacturers.ts` — `saveManufacturer` (preserved wrapped in `withAdminAction`) now persists `isOfficialRep` in both the insert and update branches of the base-row upsert + persists `relationshipNote` per locale alongside the existing `description` write in both the insert values and the onConflictDoUpdate set blocks. revalidateManufacturer call unchanged. Audit log entry unchanged (writes the full row before/after, so the new column values are surfaced to the audit-viewer automatically).
- `src/app/[locale]/admin/manufacturers/manufacturer-form.tsx` — added `<Switch>` from `@/components/ui/switch` bound to `form.watch("isOfficialRep")` + form.setValue (the form already uses RHF's setValue elsewhere) + per-locale `<Textarea>` bound to `translations.${locale}.relationshipNote` inside the existing LocaleTabs render prop. EMPTY_LOCALE_FIELDS extended to include `relationshipNote: ''`. EMPTY_INITIAL extended with `isOfficialRep: false`.
- `src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx` — `emptyLocale` extended with `relationshipNote: ''`; the LOCALES.reduce loop now projects `t.relationshipNote ?? ''` into the form's per-locale defaults; the `initial: ManufacturerInput` literal now carries `isOfficialRep: row.isOfficialRep`.
- `messages/uz.json` — added `public.manufacturer` namespace: `all` (Ishlab chiqaruvchilar) / `verified` (Tasdiqlangan) / `authorized` (Vakolatli) / `productCount` ({count} mahsulot) / `products` (Mahsulotlar ({count})) / `noProducts` (Chop etilgan mahsulotlar yo'q) / `noResults` (Ishlab chiqaruvchilar topilmadi).
- `messages/ru.json` — same set in Russian: Производители / Проверено / Авторизованный / {count} товаров / Продукты ({count}) / Нет опубликованных продуктов / Производители не найдены.
- `messages/en.json` — same set in English: Manufacturers / Verified / Authorized / {count} products / Products ({count}) / No published products / No manufacturers found.
- `tests/e2e/manufacturers.spec.ts` — replaced 4 `test.skip` Wave-0 stubs with 4 active specs in a `MFG-01 + MFG-02: public manufacturer pages (Plan 03-07)` describe block. Each spec accepts the Vercel deployment-protection bypass header via `VERCEL_PROTECTION_BYPASS` env (passthrough idempotent in local mode). The JSON-LD spec parses every `<script type="application/ld+json">` block, reverses the XSS-hardening (`<` → `<`) before JSON.parse, then asserts `BreadcrumbList` is present with ≥3 itemListElement entries.

## Decisions Made

- **saveManufacturer extension stays inside the existing `withAdminAction` wrap** (CLAUDE.md guardrail W3 acceptance criterion). The wrapper is the auth+audit+revalidate boundary; unwrapping it would bypass `requireAdmin()` for the new field writes which would defeat the entire D-15 admin-gate posture. The new fields slot into the existing function body's set/values blocks + per-locale onConflictDoUpdate set.
- **Per-locale relationship_note has NO cross-locale fallback.** Name + description fall back to uz when current-locale missing (Phase-1 D-05 cascade root, defense against partial seeds). relationship_note is intentionally locale-strict — it's per-locale copy meant to read natively. A WIKA Russian visitor seeing "Официальный представитель WIKA в Узбекистане с 2019 г." is the requirement; falling back to uz on the ru page would render mixed-script content and defeat the purpose. Helper code: `relationshipNote: displayRow?.relationship_note ?? null` (never reaches into fallback row for this field).
- **JSON-LD XSS hardening uses `replace(/</g, '\\u003c')` after `JSON.stringify`.** manufacturer.name + relationship_note are admin-controlled strings but they cross into a script element where React's auto-escape doesn't apply. Without the replace, a name like `</script><script>alert(1)` terminates the script early and injects arbitrary JS. T-03-03-02 mitigation, established in Wave 2.
- **Page shells are Suspense-wrapped under cacheComponents.** Both routes report `◐ (Partial Prerender)` in the build output. Without Suspense, build fails with "Uncached data accessed outside <Suspense>" (Wave-0 Pitfall A6). Same posture as Plan 04 catalog and Plan 05 product detail.
- **Pagination supports ?page= and ?pageSize= search params** but parsing happens OUTSIDE the cache boundary (Pitfall #2). The current pagination UI is minimal (current/total indicator) — sufficient for v1 manufacturer scale (≤500 products distributed across ≤10 manufacturers). A follow-up plan can extend if needed.
- **Manufacturer product grid reuses ProductCard from Plan 04 unchanged.** Single visual contract for catalog and manufacturer-scoped grids; means Plan 09 CWV smoke gates measure the same component once.
- **i18n keys live under `public.manufacturer` namespace.** Mirrors the established `public.catalog` + `public.product` namespacing. Message bundles updated in all 3 locales; no fallback dance needed.

## 'use cache' tag set used by the helpers

`getManufacturers(locale)`:
- `manufacturers-list` — busts when any manufacturer row mutates (revalidateManufacturer fan-out)

`getManufacturerBySlug(locale, slug)`:
- `manufacturer:<id>` — set unconditionally after slug resolves; busts on revalidateManufacturer(id) (e.g. when admin toggles is_official_rep or edits relationship_note via the extended saveManufacturer)

`getManufacturerProducts(manufacturerId, locale, page, pageSize)`:
- `manufacturer:<id>` — busts when the manufacturer row mutates (catches the case where toggling is_official_rep or editing relationship_note should reflect on the products grid header context)
- `products-list` — busts when any product mutates (catches product moves between manufacturers)

The Phase-2 D-12 fan-out helpers (`revalidateManufacturer` writes 3 tags: `manufacturer:<id>` + `manufacturers-list` + `sitemap`) are sufficient — no new tags needed.

## Deviations from Plan

### Auto-fixed Issues

None of substance. The plan's interface contracts matched the codebase exactly. One small adjustment was made:

**1. [Adjustment - Test infrastructure] Vercel-bypass header passthrough added to e2e specs**
- **During:** Task 7.3 drafting.
- **Adjustment:** Each spec accepts `VERCEL_PROTECTION_BYPASS` env via `setExtraHTTPHeaders` (or pass via `request.get` headers option) so the specs can run on a Vercel preview deployment with deployment-protection on. Local execution (no env set) sends an empty header object. Pattern carried from `tests/e2e/admin-edit-revalidates.spec.ts` (Plan 02-17 / DEF-2-17-01).
- **Rationale:** The plan's success criteria reads "MFG-01 + MFG-02 e2e tests active and ready to run on preview deployment" — the bypass header is the only way to actually exercise the spec on Vercel preview. No behavior change; idempotent locally.
- **Files modified:** `tests/e2e/manufacturers.spec.ts` only.

### Out-of-scope discoveries

None. The plan's threat model + interface contracts + acceptance criteria all matched the codebase pattern set by Waves 2/3. The build was clean on first try after Tasks 7.1 + 7.2.

## Authentication Gates

None encountered. No CLI logins, no Cloudinary uploads, no Resend round-trips. The seed-public fixture run (used during local smoke verification) is DB-only via the `DATABASE_URL_DIRECT` env var already configured for the worktree's `.env.local`.

## Issues Encountered

- **Worktree had no `node_modules` and no `.env.local`** at start — copied `.env.local` from the parent (gitignored, never committed) and ran `pnpm install --frozen-lockfile`. Same shape as previous worktree summaries documented across Phase 3 (Plans 01–05).
- **`pnpm build` static prerender of `/uz/manufacturers` index captures empty data when run before seed.** This is consistent with the Plan-04 catalog index — `getRootCategories()` and `getManufacturers()` execute at build time and the resulting empty list gets baked into the static prerender. The detail page (`[slug]`) is parameterized so this doesn't affect MFG-02. Vercel preview deployments rebuild after the seed is populated, so this is not an issue in production. Documented for awareness — the plan's MFG-01 e2e spec runs against a server where the seed is populated before the build.
- **Dev mode (turbopack) shows a transient `useState only works in Client Components` error mid-render of the detail page** — same shape as the existing categories detail page in dev mode. This is a known Next 16 turbopack dev-mode flicker (the LinkComponent prefetch ESM resolution intermittently boots before its 'use client' boundary). Production build (`pnpm build` + `pnpm start`) renders correctly; e2e specs target production only.

## User Setup Required

None. The plan adds no new external dependencies and requires no service configuration. The migration that introduced is_official_rep + relationship_note already shipped in Plan 02 and is live on Neon dev. Downstream Phase-3 plans inherit the live shared infrastructure (manufacturer-public lib helper + 2 public pages + admin form extension + saveManufacturer extension).

## Next Phase Readiness

- **Plan 08 (Wave 4 / 5 — sitemap + robots)** is unblocked: manufacturer detail URLs are now part of the public surface, so `sitemap-{locale}.xml` can list `/[locale]/manufacturers/<slug>` per locale. The slugByLocale map produced by getManufacturerBySlug is the per-locale URL source.
- **Plan 09 (Wave 5 — smoke + CWV)** is unblocked: Lighthouse Slow-4G smoke can target `/[locale]/manufacturers/wika` as a bonus check alongside the product detail page. Hero CldImage carries `priority` for LCP.
- **OPS-01 cache fan-out gate now exercises the manufacturer surface** — toggling `is_official_rep` or editing `relationship_note` through the admin form invalidates `manufacturer:<id>` + `manufacturers-list` (existing Phase-2 fan-out) and the public detail/index pages reflect within revalidation latency. Pitfall #3 silent-revalidate failure is now surfaced on the manufacturer surface where it affects branded SEO queries.

## Self-Check: PASSED

Verified after summary write:

- `src/lib/manufacturer-public.ts` — FOUND
- `src/app/[locale]/manufacturers/page.tsx` — FOUND
- `src/app/[locale]/manufacturers/[slug]/page.tsx` — FOUND
- `src/lib/zod/manufacturer.ts` contains `isOfficialRep` + `relationshipNote` — VERIFIED via grep
- `src/actions/manufacturers.ts` contains `isOfficialRep` + `relationshipNote` (≥1 occurrence each) + `withAdminAction` + `revalidateManufacturer` — VERIFIED via grep
- `src/app/[locale]/admin/manufacturers/manufacturer-form.tsx` contains `isOfficialRep` (Switch) + `relationshipNote` (Textarea) — VERIFIED via grep
- `messages/{uz,ru,en}.json` each contain `public.manufacturer.{all,verified,authorized,productCount,products,noProducts,noResults}` — VERIFIED via inspection
- `tests/e2e/manufacturers.spec.ts` has 0 `test.skip` and lists 4 active tests — VERIFIED
- Commit `3c8acd0` (Task 7.1) — FOUND in `git log`
- Commit `659dd8c` (Task 7.2) — FOUND in `git log`
- Commit `eb3d370` (Task 7.3) — FOUND in `git log`
- `pnpm vitest run tests/actions/manufacturers.test.ts` → 3/3 passed — VERIFIED
- `pnpm vitest run` (full suite) → 146 passed + 11 skipped (no new skips introduced) — VERIFIED
- `pnpm tsc --noEmit` → exits 0 — VERIFIED
- `pnpm build` → exits 0; `/[locale]/manufacturers` and `/[locale]/manufacturers/[slug]` both report `◐ (Partial Prerender)` — VERIFIED
- `pnpm playwright test --list tests/e2e/manufacturers.spec.ts` → 4 active, 0 skip — VERIFIED
- Live HTTP smoke against `pnpm start` with seeded DB — `verified-badge` + `relationship-note` + `products-heading` + `manufacturer-products` testids on `/uz/manufacturers/wika`; `manufacturer-card-{wika,bd-sensors,metran}` + `authorized-badge` on `/uz/manufacturers` after fresh build — VERIFIED

---
*Phase: 03-public-rendering-search-seo*
*Completed: 2026-04-30*
