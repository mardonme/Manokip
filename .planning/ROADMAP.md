# Roadmap: Manometr

## Overview

Manometr is a trilingual (uz-Latn / ru / en) B2B catalog for industrial pressure-measurement equipment, reaching toward premium-manufacturer SEO correctness while deliberately staying informational (no e-commerce, no configurator, no customer accounts). The build runs in five phases on a goal-backward schedule: lock the schema and locale-routing shape that would be expensive to migrate later (Phase 1); make the platform populatable by a small content team with an admin that survives dogfooding (Phase 2); land public rendering, search, and SEO together because hreflang, per-locale canonicals, per-locale tsvectors, and JSON-LD interlock (Phase 3); add the content moat of recipes and industry pages once the catalog renders (Phase 4); wire up the sole CTA, observability, and the launch-readiness bar including real-device Slow-4G QA and content-team sign-off (Phase 5). All 52 v1 requirements map to exactly one phase. The three highest-cost pitfalls (Russian-first schema, opaque spec-value strings, JSONB filter cliff) are prevented in Phase 1; the remaining high-severity pitfalls each have an explicit phase assignment.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundations** - Schema, locale routing, auth, pooled Postgres, deployment scaffold
- [x] **Phase 2: Admin Panel** - Spec-schema editor, product CRUD, media, invites, audit, cache invalidation
- [x] **Phase 3: Public Rendering, Search, SEO** - Catalog pages, filters, FTS, hreflang, JSON-LD, manufacturer pages
- [ ] **Phase 4: Content Features** - Recipes, industry pages, product cross-links
- [ ] **Phase 5: Contact and Launch Polish** - Contact form, observability, SEO verification, dogfood, launch bar

## Phase Details

### Phase 1: Foundations
**Goal**: Schema, locale routing, auth, and deployment shape are locked so the three highest-cost pitfalls (Russian-first schema, opaque spec-value strings, JSONB filter cliff) cannot be introduced later.
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07
**Success Criteria** (what must be TRUE):
  1. Every translatable entity (category, product, manufacturer, spec_field, recipe, industry) reads and writes through a sibling `*_translations` table keyed `(entity_id, locale)` — no `_ru`/`_en`/`_uz` columns exist anywhere in the schema
  2. Spec values are stored in a typed long-table (`product_spec_values` with `num_value` / `text_value` / `enum_value` / `bool_value` + unit) driven by a `spec_field` catalog — no opaque "0-600 bar" strings, no JSONB spec bag on `product`
  3. Visiting `/` 307-redirects to `/{detected-locale}/`; every page lives under `/uz/`, `/ru/`, or `/en/`; middleware blocks unauthenticated access to `/[locale]/admin/*`
  4. An invited admin can complete a magic-link login round-trip against Neon's pooled connection string, with a direct connection string reserved for migrations, against a Vercel deployment co-located with the database region
  5. Sentry, Vercel Web Analytics, and Speed Insights are receiving events from production; Cloudinary credentials load from environment variables only (never committed)
**Plans**: 7 plans
- [x] 01-01-PLAN.md — Project scaffold, env boundary (@t3-oss/env-nextjs), Vitest + Playwright Wave 0 harness
- [x] 01-02-PLAN.md — Drizzle schema (24 tables: translations siblings, typed spec long-table, Auth.js tables) + HTTP/WS clients + drizzle.config.ts
- [x] 01-03-PLAN.md — [BLOCKING] drizzle-kit generate/migrate against DATABASE_URL_DIRECT + live-DB Nyquist tests + vercel.json (fra1)
- [x] 01-04-PLAN.md — next-intl v4 routing + [locale] layout (setRequestLocale, next/font, Analytics, SpeedInsights) + 3-locale messages + locale-redirect/observability e2e stubs
- [x] 01-05-PLAN.md — Auth.js v5 edge-split (auth.config / auth.ts) + Resend magic-link + signIn callback + bootstrapAdmin + login/admin pages + T-AUTH-02 test
- [x] 01-06-PLAN.md — proxy.ts (Next.js 16 locale + admin gate) + Cloudinary sign endpoint + admin-gate e2e + magic-link round-trip scaffold (manual checkpoint deferred to plan 07)
- [x] 01-07-PLAN.md — Sentry 3-runtime + instrumentation.ts (bootstrap boot hook) + next.config.ts withSentryConfig + deploy + 3-dashboard smoke checkpoint

### Phase 2: Admin Panel
**Goal**: The content team can enter real trilingual products in under 10 minutes each, with every admin write invalidating the correct public caches — admin UX quality is the operational risk this phase closes.
**Depends on**: Phase 1
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09, ADMIN-10, ADMIN-11, ADMIN-12, OPS-01
**Success Criteria** (what must be TRUE):
  1. An invited admin can log in via magic link, invite another admin with a 48-hour single-use token, and be logged out after 24h idle or 7d absolute — and every write is attributed in `audit_log`
  2. An admin can define a category's spec-field schema (typed fields, units, filter behavior) and then CRUD a product against it on one page with three-locale tabs, typed spec values, free-form display-only extras, draft/published state, and a "duplicate this product" shortcut
  3. Admin-uploaded images and datasheets land in Cloudinary via signed direct upload (not through Vercel), with only the `public_id` persisted to the database
  4. Each product shows a translation-completeness indicator per locale, and any field marked `machine_translated: true` is visually flagged in the admin UI
  5. Every product / category / manufacturer / spec-field mutation calls `revalidateTag` for the affected public pages, and the contact-submissions inbox supports view, search, and export
**Plans**: 18 plans
- [x] 02-01-SCHEMA-MIGRATION.md — additive Drizzle schema (admin_invite, spec_field_group, translation_field_flags, spec_field.deleted_at + group_id, **product.status** + backfill, pgView with required-text spec values) + drizzle-kit generate/migrate [BLOCKING] — applied 2026-04-28 to Neon dev branch (drizzle.__drizzle_migrations row #2 hash 4cadf343...); 8/8 verification checks PASS
- [x] 02-02-ADMIN-SHELL.md — admin layout + sidebar + top bar + NuqsAdapter + shadcn primitives + Phase-2 dep install — completed 2026-04-28 (b786862 + 74080e1 DEF-2-01 fix + 4246e36)
- [x] 02-03-PROXY-SESSION-CAP.md — proxy.ts D-15 idle + 7d absolute cap via sessions.absoluteExpires — completed 2026-04-28 (c157d7c proxy.ts cap + 7e77a79 e2e fixme spec)
- [x] 02-04-LIB-AUDIT.md — logAudit + AuditAction enum + withAdminAction wrapper + auth.ts events hook + admin-session test fixture — completed 2026-04-28 (36078a5/c369b68 logAudit, 1a0a0e0/b562456 withAdminAction + events, c637cd8 fixture + enforceAbsoluteCap seam)
- [x] 02-05-LIB-REVALIDATION.md — typed revalidateTag helpers (Next 16 2-arg form) + unit tests — completed 2026-04-28 (6bc879e RED test + c70bf46 GREEN impl; 7 helpers, 9 vi.mock specs, 63/63 vitest green)
- [x] 02-06-LIB-DATATABLE.md — generic DataTable<TData> + pagination + toolbar (TanStack v8 + nuqs) — completed 2026-04-28 (bb3256e RED test + e71fafc GREEN impl; 14/14 vitest files / 69/69 tests; jsdom split; Wave 1 closed)
- [x] 02-07-ADMINS-INVITE.md — inviteAdmin + acceptInvite Server Actions + AdminInviteEmail + admins list + accept-invite landing — completed 2026-04-28 (3dbde57 email template + a5ba0c7 TDD RED + 06e2cd4 TDD GREEN inviteAdmin/acceptInvite; UI pages + metadata in continuation commit; 15/15 vitest files / 72/72 tests; ADMIN-02 + ADMIN-11 satisfied)
- [x] 02-08-LOGIN-POLISH.md — useActionState login form + check-email + access-denied banner + magic-link harvesting mitigation — completed 2026-04-28 (a9fa727 TDD RED LoginForm + 76bc5f1 TDD GREEN useActionState + i18n + dd40f85 TDD RED isActiveAdminEmail + 2474ca4 TDD GREEN sendVerificationRequest gate; 17/17 vitest files / 81/81 tests; ADMIN-01 satisfied; Phase-1 DEF closed)
- [x] 02-09-CATEGORIES-CRUD.md — category tree CRUD + 3 translations + LocaleTabs + SlugInput primitives — completed 2026-04-28 (12f7f05 LocaleTabs+SlugInput primitives + 5981b26 TDD RED + c55c5dd TDD GREEN saveCategory/deleteCategory + drizzle casing fix + bb4baa0 list/new/edit/form pages; 18/18 vitest files / 84/84 tests; ADMIN-03 satisfied)
- [x] 02-10-MANUFACTURERS-CRUD.md — manufacturer CRUD + logo upload + reusable MediaUploader (single + multi) — completed 2026-04-28 (667f44c MediaUploader single+multi modes + 8ca6833 TDD RED + b36df3c TDD GREEN saveManufacturer/deleteManufacturer + a5c0d8c list/new/edit/form pages; 19/19 vitest files / 87/87 tests; ADMIN-04 satisfied; D-07 SSOT regression-locker spec lands)
- [x] 02-11-SPEC-FIELDS-EDITOR.md — spec_field rename/soft-delete/hard-delete + spec_field_group CRUD + ConfirmDialog + soft-delete repository wrapper — completed 2026-04-28 (99f365c repository wrapper + ConfirmDialog + 0a392d9 TDD RED specs/zod + 4f5d719 TDD GREEN saveSpecField/renameSpecField/softDeleteSpecField/deleteSpecField + d61d2b6 group RED + d2c5bf9 group GREEN saveSpecFieldGroup/reorderGroups/deleteSpecFieldGroup + 90f87cc UI + DataTable manualPagination prop; 21/21 vitest files / 95/95 tests; ADMIN-05 satisfied; D-08 type-lock at runtime + UI; D-06 limited cascade on extra_key; Open Q §3 client-paginated DataTable opt-in; Open Q §4 repository wrapper for Phase-3 reads)
- [x] 02-12-TRANSLATION-COMPLETENESS-VIEW.md — pgView helpers + TranslationCompleteness + TranslationDots — completed 2026-04-28 (edd7c0d TDD RED stub helper + 3-spec live-Neon test + 2620a71 TDD GREEN findProductCompleteness/findCompletenessForProducts wrapping productTranslationCompleteness pgView + 9fef5e0 UI components TranslationCompleteness progress bar + TranslationDots 3-locale dot indicator with D-04 thresholds; 22/22 vitest files / 98/98 tests; ADMIN-10 satisfied; Wave 2 closes — 12/18 Phase-2 plans complete)
- [x] 02-13a-PRODUCTS-CRUD-CORE.md — Zod schemas + saveProduct (5-step tx with refusal-to-elevate) + duplicateProduct + integration tests + seed-products fixture — completed 2026-04-28 (457fbeb productInsertSchema + seedProduct fixture + cfb2d0a TDD RED 7 specs + ca31675 TDD GREEN saveProduct 5-step atomic tx + duplicateProduct full-clone with status='draft' + slug-copy + audit('duplicate_product'); W7 refusal-to-elevate USE_PUBLISH_ACTION; replace-on-save for spec values + MT flags; 23/23 vitest files / 105/105 tests; ADMIN-06 + ADMIN-08 + ADMIN-09 satisfied; Wave 3 opens)
- [x] 02-13b-PRODUCTS-CRUD-LIFECYCLE-UI.md — publishProduct/unpublishProduct/deleteProduct (distinct audit rows) + products list + product editor pages with locale tabs + spec values editor + MT toggle + lifecycle buttons — completed 2026-04-29 (ed6da4a TDD RED 4 lifecycle specs + d2a6514 TDD GREEN publishProduct/unpublishProduct/deleteProduct atomic dual-column writes + audit-before-delete + c431a16 products list page + table with TranslationDots and per-row Publish | Unpublish / Duplicate / Delete row actions + product editor with LocaleTabs + SpecValuesEditor + MachineTranslatedToggle + MediaUploader + ConfirmDialog for destructive flows + W7 two-layer status freeze (UI hardcodes status: persistedStatus on submit + saveProduct refusal-to-elevate); 11/11 products specs green; ADMIN-06 + ADMIN-08 + ADMIN-09 closed; ADMIN-11 + OPS-01 advanced; Wave 4 opens; DEF-2-13b-01 logged for pre-existing pnpm build script typecheck)
- [x] 02-14-PRODUCTS-MEDIA.md — Cloudinary signature-parity smoke (Pitfall #5) + sign-endpoint widening + MediaUploader unit test — completed 2026-04-29 (4dddac8 test MediaUploader handler with mocked CldUploadWidget + a89bca7 fix widen sign endpoint to widget paramsToSign protocol — Task 14.0 returned PARITY-MISMATCH via static source analysis of pinned next-cloudinary 6.17.5 / @cloudinary-util/url-loader@5.10.4 dist/index.js:67-89; widget POSTs `{ paramsToSign }` and reads `result.signature` while Phase-1 endpoint expected top-level `{ folder }` and signed server-generated `{ folder, timestamp }`; bodySchema widened to z.union([{ folder }, { paramsToSign }]) preserving 9 baseline tests + 3 new tests for widget branch with independent-recompute byte-parity assertion via cloudinary.utils.api_sign_request + 326d918 feat media-dirty Save indicator (formState.dirtyFields-driven Save-button-suffix preventing the "dragged thumbnails but didn't hit Save" footgun) + sign-route narrowing fixup + Rule-3 in-scope closure of DEF-2-13b-01 (scripts/verify-02-01-migration.ts null-checks); full suite 122/122 across 26 files; pnpm tsc --noEmit clean for first time since 02-01; pnpm build Compiled successfully in 12.0s + 55 static pages; ADMIN-07 closed)
- [x] 02-15-SUBMISSIONS-INBOX.md — submissions inbox + mark-read + CSV export with UTF-8 BOM — completed 2026-04-29 (c20c704 TDD RED csv tests + 4f6cb14 TDD GREEN toCsv writer with single-U+FEFF-source-literal BOM + RFC 4180 quoting + Excel formula injection guard + f02d8be TDD RED submissions tests + 9c58cc8 TDD GREEN markSubmissionRead + exportSubmissionsCsv with serialiseSubmission(row) BigInt projection at audit-jsonb boundary + entity_type='contact_submission_export' audit-on-export pattern + 43a19ef admin RSC + DataTable client island with date-range Inputs + Unread Switch + Export CSV button via Blob + URL.createObjectURL); Open Q §6 LOCKED buffered-in-memory CSV for Phase 2 / streaming deferred to Phase 5; LIMIT 10_000 hard cap T-02-15-04 DoS mitigation; 7 new tests (4 csv unit + 3 live-Neon submissions); full suite 116/116 across 25 files; ADMIN-12 closed; ADMIN-11 + OPS-01 advanced
- [x] 02-16-AUDIT-LOG-VIEWER.md — read-only audit log viewer with URL-driven filters — completed 2026-04-29 (b52f0a3 feat audit log viewer): /[locale]/admin/audit ships as 3 files (page.tsx RSC + audit-table.tsx client island + audit-row-detail.tsx pure presentational), zero new dependencies, zero mutation Server Actions — read-only invariant is structural (the absence of "use server" + absence of src/actions/audit.ts is the boundary). Server-paginated 50/page (clamped 1..100 per T-02-16-04), ordered by `at DESC`. URL filters via patchQuery: actor (ILIKE), action (eq from AUDIT_ACTIONS closed enum), entityType (eq from local ENTITY_TYPES tuple grepped from src/actions/**), from/to (gte/lte). All filters Drizzle-parameterised — T-02-16-01 SQL injection mitigated by construction. Row expansion via local React.useState<Record<id, boolean>>; expanded rows render sibling detail panel below the table with action/entityType/entityId header + before/after JSON side-by-side as <pre> blocks via grid-cols-1 md:grid-cols-2; multi-row simultaneous expansion allowed; null payloads render "(none)". NO new tests this plan; full suite stays 116/116. ADMIN-11 closed (audit log writer + viewer fully shipped end-to-end).
- [x] 02-17-REVALIDATION-E2E-GATE.md — Playwright OPS-01 spec on Vercel preview + GH Actions gate — completed 2026-04-29 (1aa3693 OPS-01 admin-edit-revalidates spec with DB-direct verification_tokens consumption per Pitfall #12 + Vercel Deployment Protection bypass header threading per Pitfall #11 + local-fallback skip on http://localhost:3000 + Phase-3 migration note for /uz/products/<slug> goto target swap; 00c2e2b admin-session-cap spec flipped from 3 fixme cases to 3 live tests using createActiveAdminSession from 02-04 fixture — lifts ADMIN-01 session-cap guarantee from unit-level proxy.ts contract to live e2e probe; 81da5b5 .github/workflows/e2e-preview.yml workflow with patrickedqvist/wait-for-vercel-preview@v1.3.1 + 15-minute step timeout + concurrency-group cancel-in-flight + HTML report upload on failure + playwright.config.ts BASE_URL + extraHTTPHeaders bypass threading at the config layer so every spec in tests/e2e/ honors preview Deployment Protection automatically; 24 e2e tests across 7 files via `pnpm playwright test --list`; pnpm tsc --noEmit clean; pnpm vitest run 122/122 across 26 files; OPS-01 closed with status complete-with-deferred-validation — DEF-2-17-01 logged for deployment-side workflow green on real PR + RED on regression PR + branch protection rule as required status check; ADMIN-01 fully validated)

### Phase 3: Public Rendering, Search, SEO
**Goal**: A trilingual visitor finds, filters, searches, and reads trustworthy product pages that Google and Yandex can index correctly — SSR + hreflang + per-locale canonical + per-locale tsvector + JSON-LD land together because they interlock.
**Depends on**: Phase 2
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, CAT-08, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, MFG-01, MFG-02, SEO-01, SEO-02, SEO-03, SEO-04, SEO-05
**Success Criteria** (what must be TRUE):
  1. A visitor can switch locales site-wide, browse the category tree, and open a product detail page with fiztech-density grouped spec tables, gallery, manufacturer attribution, and downloadable datasheets/certificates — served as real SSR HTML on first byte
  2. On any category listing page, the visitor can filter products by numeric ranges, enum selections, and boolean toggles driven by the category's typed spec schema, with filter state reflected in the URL via nuqs so the filtered view is shareable
  3. Searching in the current locale returns results ranked by per-locale `tsvector`; an untranslated locale falls back to another with a "shown in [other locale]" hint; an exact part-number match short-circuits to the product detail page; autocomplete suggests as the visitor types
  4. Every public page emits per-locale canonical + hreflang for `uz`/`ru`/`en` + `x-default`; per-locale XML sitemaps are referenced from `robots.txt`; product / organization / category / breadcrumb JSON-LD validates in the Rich Results Test
  5. A real device on Slow 4G renders the product detail page's LCP within the Core Web Vitals budget, with Uzbek Latin `oʻ`/`gʻ` (U+02BB) and Cyrillic rendering correctly through `next/font` with `['latin','latin-ext','cyrillic']` subsets and `<CldImage>` with responsive `sizes`
**Plans**: 9 plans
- [x] 03-01-PLAN.md — Wave 0: test stubs (12) + seed-public fixture + cacheComponents flag + schema-dts install
- [x] 03-02-PLAN.md — [BLOCKING] Schema migration (unaccent + pg_trgm + product media arrays + manufacturer D-11 fields) + saveProduct gap fixes (imagePublicIds persistence + tsvector rebuild for SRCH-05)
- [x] 03-03-PLAN.md — Locale-aware shared infra: jsonld helpers, buildAlternates, LocaleSwitcher, SiteHeader, CategoryNav, public layout with Organization JSON-LD
- [x] 03-04-PLAN.md — Catalog: /[locale]/categories listing with EAV faceted filters (nuqs URL state), facet aggregate counts, filter sidebar, product card grid
- [x] 03-05-PLAN.md — Product detail /[locale]/products/[slug] (sketch 003): grouped spec tables, gallery, key-facts ribbon, sticky CTA rail, manufacturer card, downloads list, Product+BreadcrumbList JSON-LD
- [x] 03-06-PLAN.md — Search: /[locale]/search force-dynamic, autocomplete API with cascade fallback (current→uz→ru→en), SKU exact-match 302 redirect, header SearchBox client island
- [x] 03-07-PLAN.md — Manufacturer pages /[locale]/manufacturers (index + detail) + admin extension for D-11 (is_official_rep + relationship_note)
- [x] 03-08-PLAN.md — SEO infra: per-locale sitemap-{uz,ru,en}.xml + sitemap-index.xml + robots.txt + Phase-2 02-17 admin-edit goto migration
- [x] 03-09-PLAN.md — Wave N closure: SEO coverage e2e sweep + Lighthouse CI workflow (LCP) + manual Rich Results / Cyrillic-Uzbek / Search Console gates
**UI hint**: yes

### Phase 4: Content Features
**Goal**: Recipes and industry pages add the long-tail SEO content moat and the "Used in" cross-link on products without gating or delaying the catalog shipment.
**Depends on**: Phase 3
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06
**Success Criteria** (what must be TRUE):
  1. An admin can author a rich-text recipe or industry page in Tiptap (links, images via Cloudinary, tables, headings) with translations for all three locales, and assign M:N relationships to products
  2. A visitor can browse and read recipe and industry pages in their current locale, with graceful fallback when a translation is missing
  3. Every product detail page shows a "Used in" section listing the recipes and industry pages that reference it
  4. Recipe and industry pages emit TechArticle JSON-LD that validates in the Rich Results Test
**Plans**: 12 plans
Plans:
- [x] 04-01-PLAN.md — [BLOCKING] Schema migration: status columns + 2 junction tables + product_used_in_v pgView + verifier + 7 specs — completed 2026-05-01 (c70524b status column + CHECK on recipe + industry; 3aca084 junctions.ts + product-used-in.ts pgView Drizzle defs + barrel re-exports; cb03285 0003_phase4_content_features.sql generated by drizzle-kit + hand-authored UPDATE backfill ordered BEFORE CHECK + applied to Neon dev branch with zero errors; 17db532 verifier 11/11 PASS + 7 live-Neon specs GREEN with errMessage helper walking err.cause chain to surface PG constraint name through Drizzle/Neon error wrapper opacity); pnpm tsc --noEmit clean; pnpm vitest run 174/174 across 33 files; Phase 4 plans 04-02..04-12 unblock
- [x] 04-02-PLAN.md — Tiptap v3.22.5 install (11 packages) + shared TIPTAP_EXTENSIONS + tiptap-render server helper + Cloudinary FOLDER_ALLOWLIST — completed 2026-05-01 (4f1eeb2 chore install Tiptap stack 11 packages pinned to exact 3.22.5; 6d0113b test RED MALICIOUS_TIPTAP_DOC fixture + T-04-XSS-01 spec; ebef2bb feat TIPTAP_EXTENSIONS array length 7 + CloudinaryImage extension with publicId attribute + StarterKit link:false to avoid v3 bundled-link duplicate-extension warning; 836e5d5 feat renderTiptapToHtml wrapping @tiptap/static-renderer/pm/html-string + nodeMapping.image override emitting Cloudinary URL via getCldImageUrl reading ONLY attrs.publicId T-04-XSS-04 mitigation + alt-text & + " escape defense-in-depth + body $type<JSONContent>() narrowing on recipe + industry translations DDL-unchanged; 62620da docs CLAUDE.md Tiptap v2 -> v3 correction); 3 deviations all auto-fixed inline (Rule-1 StarterKit v3 bundles link extension folded into TIPTAP_EXTENSIONS commit; Rule-1 FOLDER_ALLOWLIST already extended in Phase 2 02-14 — no diff needed; Rule-2 alt-text & escape ordering before " escape); pnpm tsc --noEmit clean; pnpm vitest run tests/lib/tiptap-render.test.ts 1/1 GREEN; full suite 175/175 across 34 files (was 174/174 across 33; +1 file +1 spec); Phase 4 plans 04-03..04-12 can now import TIPTAP_EXTENSIONS + renderTiptapToHtml from lib
- [x] 04-03-PLAN.md — Lib helpers: techArticleJsonLd + revalidateRecipe/Industry/UsedIn + getUsedInForProduct + recipe/industry public-read + Zod schemas — completed 2026-05-01 (c394fcf test RED techArticleJsonLd 3 specs not a function; 30a638d feat techArticleJsonLd GREEN with WithContext<TechArticle> shape + author=publisher=Manometr Org + optional description/image/mentions conditional-spread + mentions as Product sub-objects with NO offers per Phase 3 D-08 + hero image w_1200 vs w_800 product Cloudinary URL + mainEntityOfPage per-locale canonical URL; ca72e95 test RED revalidate{Recipe,Industry,UsedIn} 6 specs not a function; 002f8af feat revalidate helpers GREEN — recipe:<id> + recipes:list:<l> per locale + sitemap with default ['uz','ru','en'] locales array narrowable by callers + industry mirror + revalidateUsedIn used-in:<pid> + product:<pid> with used-in tag fired BEFORE product tag for defense-in-depth ordering; aded792 test RED getUsedInForProduct ERR_MODULE_NOT_FOUND 2 live-Neon specs cap-at-6 + empty-result; e97c438 feat getUsedInForProduct GREEN reading productUsedInView with cap-at-6 per type per D-09 + sort by position::integer ASC for deterministic cap selection + 'use cache' + cacheLife('max') + cacheTag(used-in:<pid>) + v1 trade-off NO in-JS locale cascade fallback because Used-In is a discoverability widget not primary read surface; 51215e8 feat recipes + industries + Zod schemas multi-file no separate RED per plan literal Task 3.4 — getRecipeBySlug + getIndustryBySlug with Phase-3 D-05 fallback cascade current → uz → ru → en stop at first non-empty body via isTiptapDocFilled heuristic + usedFallbackLocale: Locale | null discriminator for D-07 banner + slugByLocale for Pitfall #6 hreflang fan-out, findPublishedRecipes/Industries list view publishedAt DESC no cascade, getLinkedProductsForRecipe/Industry locale-fallback to uz for TechArticle mentions array D-10, recipeInsertSchema + industryInsertSchema with 3-locale translations + linkedProductIds [{productId, position}] + status enum + publishedAt nullable + featuredImagePublicId nullable + body z.unknown() with TIPTAP_EXTENSIONS allow-list enforcing shape at runtime + reserved-slug denylist refinement deny ['admin','api','_next','cdn','admin-action'] T-04-TAMP-03 mitigation per RESEARCH §Open Q §4); ZERO deviations — plan executed exactly as written, all three anticipated deviation rules in <deviations_protocol> did not need to fire (Rule 1 schema-dts TechArticle import worked directly; Rule 2 cap-at-6 ordering shipped proactively with position::integer ASC sort; Rule 3 'use cache' test conflict resolved by reusing the existing vi.mock('next/cache') Phase-3 catalog/search test pattern); pnpm tsc --noEmit clean; pnpm vitest run tests/lib/jsonld.test.ts tests/lib/revalidation.test.ts tests/lib/used-in.test.ts 25/25 GREEN across 3 files; full suite 186/186 across 35 files (was 175/175 across 34; +1 file tests/lib/used-in.test.ts; +11 specs jsonld+3 revalidation+6 used-in+2); Phase 4 plans 04-04..04-12 unblock — Wave 1 Server Actions can import recipeInsertSchema/industryInsertSchema + revalidateRecipe/Industry/UsedIn, Wave 3 public RSC pages can import getRecipeBySlug/getIndustryBySlug + findPublishedRecipes/Industries + getLinkedProductsForRecipe/Industry + techArticleJsonLd, Wave 3 product detail page extension can import getUsedInForProduct + UsedInItem
- [ ] 04-04-PLAN.md — Wave 0 RED test stubs: seed-content fixture + 14 fixme integration specs + 6 jsdom + 8 Playwright e2e
- [ ] 04-05-PLAN.md — Recipe Server Actions: saveRecipe + publishRecipe + unpublishRecipe + deleteRecipe + 7 GREEN specs (flips 04-04)
- [ ] 04-06-PLAN.md — Industry Server Actions: saveIndustry + publishIndustry + unpublishIndustry + deleteIndustry + 7 GREEN specs
- [ ] 04-07-PLAN.md — Recipe admin UI: RecipeBodyEditor (Tiptap immediatelyRender:false) + LinkedProductsPicker + form + list + new/edit pages + sidebar entry
- [ ] 04-08-PLAN.md — Industry admin UI: IndustryBodyEditor + IndustryForm + list + new/edit + sidebar (mirrors 04-07; reuses LinkedProductsPicker)
- [ ] 04-09-PLAN.md — Public recipes: /[locale]/recipes index + /[locale]/recipes/[slug] detail with Tiptap static-render + TechArticle JSON-LD + LocaleFallbackBanner + sitemap extension
- [ ] 04-10-PLAN.md — Public industries: index + detail (mirrors 04-09) + sitemap extension
- [ ] 04-11-PLAN.md — Used-in section: UsedInSection RSC mounted on product detail page between SpecTable and ManufacturerCard
- [ ] 04-12-PLAN.md — Verification + closure: flip 8 e2e specs to GREEN + Rich Results / Yandex / glyph manual gates (closed-with-deferred-validation) + 04-VERIFICATION.md + RETROSPECTIVE
**UI hint**: yes

### Phase 5: Contact and Launch Polish
**Goal**: The sole CTA works end-to-end, observability is live before public traffic, and the launch bar (content-team sign-off, Slow-4G real-device QA across three locales, Search Console International Targeting clean) is cleared.
**Depends on**: Phase 4
**Requirements**: CTA-01, CTA-02, CTA-03, CTA-04, SEO-06, OPS-02
**Success Criteria** (what must be TRUE):
  1. A visitor on any page can submit a contact form (name, company, email, message) that is honeypot + Turnstile + per-IP-rate-limit gated; the submission persists to the database with the source page recorded and an email reaches the admin team via Resend
  2. Google Search Console and Yandex Webmaster are registered, and the International Targeting panel shows no hreflang errors before launch
  3. A load test of `ab -n 500 -c 50` against a preview deployment completes with no connection errors and bounded latency, and real-device QA on Slow 4G has been signed off across all three locales
  4. The content team has dogfooded at least 10 real trilingual products with each product taking 10 minutes or less from start to published, and has signed off on the admin UX as the launch blocker resolution
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundations | 7/7 | Complete | 2026-04-23 |
| 2. Admin Panel | 18/18 | Complete | 2026-04-29 |
| 3. Public Rendering, Search, SEO | 9/9 | Complete | 2026-05-01 |
| 4. Content Features | 0/TBD | Not started | - |
| 5. Contact and Launch Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-04-21*
*Granularity: standard (5 phases)*
*Coverage: 52 / 52 v1 requirements mapped*
