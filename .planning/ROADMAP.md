# Roadmap: Manometr

## Overview

Manometr is a trilingual (uz-Latn / ru / en) B2B catalog for industrial pressure-measurement equipment, reaching toward premium-manufacturer SEO correctness while deliberately staying informational (no e-commerce, no configurator, no customer accounts). The build runs in five phases on a goal-backward schedule: lock the schema and locale-routing shape that would be expensive to migrate later (Phase 1); make the platform populatable by a small content team with an admin that survives dogfooding (Phase 2); land public rendering, search, and SEO together because hreflang, per-locale canonicals, per-locale tsvectors, and JSON-LD interlock (Phase 3); add the content moat of recipes and industry pages once the catalog renders (Phase 4); wire up the sole CTA, observability, and the launch-readiness bar including real-device Slow-4G QA and content-team sign-off (Phase 5). All 52 v1 requirements map to exactly one phase. The three highest-cost pitfalls (Russian-first schema, opaque spec-value strings, JSONB filter cliff) are prevented in Phase 1; the remaining high-severity pitfalls each have an explicit phase assignment.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundations** - Schema, locale routing, auth, pooled Postgres, deployment scaffold
- [ ] **Phase 2: Admin Panel** - Spec-schema editor, product CRUD, media, invites, audit, cache invalidation
- [ ] **Phase 3: Public Rendering, Search, SEO** - Catalog pages, filters, FTS, hreflang, JSON-LD, manufacturer pages
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
- [ ] 02-05-LIB-REVALIDATION.md — typed revalidateTag helpers (Next 16 2-arg form) + unit tests
- [ ] 02-06-LIB-DATATABLE.md — generic DataTable<TData> + pagination + toolbar (TanStack v8 + nuqs)
- [ ] 02-07-ADMINS-INVITE.md — inviteAdmin + acceptInvite Server Actions + AdminInviteEmail + admins list + accept-invite landing
- [ ] 02-08-LOGIN-POLISH.md — useActionState login form + check-email + access-denied banner + magic-link harvesting mitigation
- [ ] 02-09-CATEGORIES-CRUD.md — category tree CRUD + 3 translations + LocaleTabs + SlugInput primitives
- [ ] 02-10-MANUFACTURERS-CRUD.md — manufacturer CRUD + logo upload + reusable MediaUploader (single + multi)
- [ ] 02-11-SPEC-FIELDS-EDITOR.md — spec_field rename/soft-delete/hard-delete + spec_field_group CRUD + ConfirmDialog + soft-delete repository wrapper
- [ ] 02-12-TRANSLATION-COMPLETENESS-VIEW.md — pgView helpers + TranslationCompleteness + TranslationDots
- [ ] 02-13a-PRODUCTS-CRUD-CORE.md — Zod schemas + saveProduct (5-step tx with refusal-to-elevate) + duplicateProduct + integration tests + seed-products fixture
- [ ] 02-13b-PRODUCTS-CRUD-LIFECYCLE-UI.md — publishProduct/unpublishProduct/deleteProduct (distinct audit rows) + products list + product editor pages with locale tabs + spec values editor + MT toggle + lifecycle buttons
- [ ] 02-14-PRODUCTS-MEDIA.md — confirm CldUploadWidget signing parity + MediaUploader unit test
- [ ] 02-15-SUBMISSIONS-INBOX.md — submissions inbox + mark-read + CSV export with UTF-8 BOM
- [ ] 02-16-AUDIT-LOG-VIEWER.md — read-only audit log viewer with URL-driven filters
- [ ] 02-17-REVALIDATION-E2E-GATE.md — Playwright OPS-01 spec on Vercel preview + GH Actions gate

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
**Plans**: TBD
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
**Plans**: TBD
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
| 2. Admin Panel | 4/18 | In Progress | - |
| 3. Public Rendering, Search, SEO | 0/TBD | Not started | - |
| 4. Content Features | 0/TBD | Not started | - |
| 5. Contact and Launch Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-04-21*
*Granularity: standard (5 phases)*
*Coverage: 52 / 52 v1 requirements mapped*
