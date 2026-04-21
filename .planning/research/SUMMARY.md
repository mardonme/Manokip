# Project Research Summary

**Project:** Manometr
**Domain:** B2B multilingual industrial-equipment catalog (pressure-measurement devices; informational, not transactional)
**Researched:** 2026-04-21
**Confidence:** HIGH on stack + pitfalls; MEDIUM-HIGH on architecture; MEDIUM on feature inventory

## Executive Summary

Manometr is a trilingual (uz-Latn / ru / en) B2B catalog for industrial pressure-measurement equipment, inspired by fiztech.ru's density-first information architecture and reaching toward the premium manufacturer tier (WIKA, Endress, VEGA) on SEO correctness and spec depth — deliberately not on e-commerce, configurators, CAD, or customer accounts. The winning shape is a single Next.js 16 App Router application on Vercel, backed by managed Postgres (Neon preferred), with per-field translations in sibling `*_translations` tables, a typed per-category spec catalog (`spec_field` + `product_spec_values` long table), and a per-locale `product_search` GIN `tsvector` for full-text search. Admin writes flow through Server Actions with `revalidateTag` invalidation; media lives in Cloudinary via signed direct uploads; admin auth is Auth.js v5 magic-link for a 2–5 person team.

The four research streams converge on one canonical build order: **foundations (schema + auth + locale routing) → admin panel (spec schema, products, translations, media) → public rendering + search + SEO → content features (recipes, industries, manufacturers) → contact + launch polish**. Headline decisions are locked: Drizzle over Prisma (JSONB + serverless cold starts), next-intl over next-i18next (App Router native), subpath `/[locale]/...` routing over cookies (SEO-mandatory), typed specs over JSONB bags (filtering survives growth), shadcn/ui assembled by hand over Refine (admin diverges from CRUD defaults), signed direct Cloudinary upload over API round-trip (Vercel body-size limits).

Risks are content-schema-shaped, not infrastructure-shaped: a "Russian-first" schema with translations bolted on, spec values stored as opaque strings like `"0-600 bar"`, and missing hreflang on locale-scoped URLs are each capable of forcing a migration or months of lost SEO ranking once content exists. Mitigation is entirely front-loaded into Phase 1. Secondary risks — admin UX abandonment, Next.js caching staleness, serverless Postgres connection meltdown, Cloudinary bandwidth, Cyrillic/Uzbek-Latin font subsets — each have a phase where they must be prevented; mapping is explicit below.

## Key Findings

### Recommended Stack (HIGH; exact minor versions MEDIUM — pin at install)

- **Next.js 16.2 + App Router + React 19 + TypeScript strict** — only shape that satisfies SEO-indexable pages + admin edits without deploy.
- **Postgres 16 on Neon** (HTTP serverless driver, pooled) — picked over Supabase because we pair Auth.js + Cloudinary; branch-per-preview + scale-to-zero fit low-traffic B2B.
- **Drizzle ORM + drizzle-kit + drizzle-zod** — first-class JSONB, faster serverless cold starts than Prisma, plain-SQL migrations.
- **next-intl v4** — Server-Component-friendly, locale-prefixed routing, hreflang helpers.
- **Auth.js v5 + `@auth/drizzle-adapter` + Email magic-link via Resend** — right-sized for 2–5 invited admins; Lucia archived, Clerk overkill.
- **shadcn/ui + Tailwind v4 + Radix + TanStack Table + React Hook Form + Zod + nuqs + sonner + lucide-react** — hand-assembled admin; Refine/React-Admin fight custom editors.
- **Cloudinary + `next-cloudinary`** — signed direct browser uploads; PDF first-page thumbnails free.
- **Tiptap v2** — rich text for recipes/industries.
- **Resend + React Email** — contact notifications, admin invites, magic-link emails.
- **Postgres FTS (`tsvector` + `unaccent` + `pg_trgm`)** — sufficient at 100–500 products; Meilisearch only when relevance forces the move.
- **Vercel Pro + Sentry + Vercel Web Analytics + Speed Insights** — deploy + observability.

### Expected Features (MEDIUM — reference sites unverified this pass)

**Must have (table stakes):** trilingual per-field content; category tree with left-nav; hybrid typed spec schema; fiztech-density spec tables; per-product PDF + certificates subsection; multilingual FTS + autocomplete + part-number exact-match; locale-scoped URLs + hreflang + per-locale canonical + sitemap + Product/Organization/BreadcrumbList JSON-LD; single site-wide contact form with `source_page`; manufacturer attribution + showcase pages; 5–8 industry landing pages + 5–10 selection-guide articles at launch; admin (email invite, flat role, per-field translations, Cloudinary media, preview, draft/published, duplicate, bulk-reassign); mobile-responsive spec-table pattern.

**Should have (v1.x differentiators):** side-by-side product comparison; approvals-based filter (ATEX/IECEx/EAC); URL-shareable filter state via nuqs; "Request datasheet pack" multi-select contact; recently viewed (localStorage); category catalog PDFs; admin translation-assist (flagged `machine_translated`, not auto-publish).

**Defer (v2+):** product-finder wizard; configurator / part-number builder; 3D/CAD viewer; customer accounts; structured RFQ; Editor/Admin RBAC split; manufacturer self-service portal; Uzbek Cyrillic; native apps; external API feeds.

**Anti-features (enforce in roadmap — do not re-add):** cart/pricing/stock/checkout; per-product inquiry buttons; live chat widgets; AI chatbot on specs; machine-translation auto-publish; Editor/Admin role split; manufacturer self-service.

### Architecture Approach (MEDIUM-HIGH)

Single Next.js deploy on Vercel. Edge middleware does locale rewrite (`/` → `/<detected>/`) and admin auth-cookie gate for `/[locale]/admin/*`. Postgres holds three table families: **core** (`category` self-ref tree, `product`, `spec_field`, `manufacturer`, `recipe`, `industry`, `contact_submission`, `admin_user`), **translation siblings** (`*_translations` keyed `(entity_id, locale)` with per-locale unique `slug`), **derived/search** (`product_spec_values` long-table + `product_search` per-locale `tsvector` GIN). Public pages are RSC with ISR + tag-based invalidation; admin writes are Server Actions that upsert translations, replace spec values, rebuild all three `product_search` locale rows in the same transaction, then `revalidateTag('product:<id>', 'category:<id>', 'sitemap')`. Media never touches Next.js — admin uploads directly to Cloudinary via a short-lived signature minted by `/api/cloudinary/sign`; DB stores only `public_id`.

**Major components:** Edge middleware; public RSC routes under `app/[locale]/`; admin RSC routes under `app/[locale]/admin/` with Server Actions; repo layer (`src/repo/*`) wrapping DB access in `unstable_cache`; DB schema (`src/db/schema/*`); Auth.js v5 + Resend + Cloudinary integrations.

### Critical Pitfalls (HIGH)

1. **Russian-first schema with translations bolted on later** — no `name_ru`/`_en`/`_uz` columns, no `default_locale` field; sibling `*_translations` from day one with BCP-47 locales (`uz-Latn`, `ru`, `en`). Prevent Phase 1.
2. **Spec values stored as opaque strings (`"0-600 bar"`)** — break range filtering forever. Typed fields at catalog time (`number`/`range`/`enum`/`bool`/`text`), units first-class, numeric → `num_value`, enum keys (not labels) → `enum_value`, extras display-only. Prevent Phase 1 schema + Phase 2 admin editor.
3. **Missing / wrong hreflang** — SEO cannibalization; CIS traffic evaporates. Every page emits `hreflang` for each locale + `x-default` → `ru`; per-locale canonicals (not master); per-locale sitemaps. Prevent Phase 3; verify with Rich Results Test + Search Console before launch.
4. **Admin UX afterthought → content team abandons platform** — dogfood 10 real trilingual products, timed; >10 min per entry = fix before shipping. Three-locale tabs on one page; typed spec entry (never paste JSON); duplicate, bulk-reassign, "mark untranslated", draft/published from day one. Prevent Phase 2; content team sign-off blocks launch.
5. **Next.js App Router caching staleness** — admin edits never appear in prod without `revalidateTag`. Tag every fetch, revalidate on every mutation, short ISR (60s) as safety net, e2e test the edit-then-refresh loop on Vercel preview (not `next dev`). Prevent Phase 2 + Phase 3.

Additional high-severity, mapped later: serverless Postgres connection meltdown (Phase 1 — pooler); weak admin auth (Phase 2 — token TTL, session timeout, `requireAdmin()`, audit log); Cloudinary bandwidth blow-out (Phase 2 — transformation helper + `<CldImage>`, quota alerts); Cyrillic + Uzbek-Latin `oʻ`/`gʻ` font subsets (Phase 3 — `next/font` with `['latin','latin-ext','cyrillic']`, U+02BB validator); machine-translation trust damage (Phase 2 — `machine_translated` flag, hide from public until reviewed); spec-schema evolution orphaning data (Phase 2 — stable internal key, rename-as-migration, delete-with-impact-count).

## Implications for Roadmap

### Phase 1: Foundations — schema + auth + locale routing + deployment
**Rationale:** Three critical pitfalls (#1 translations shape, #2 typed specs, #10 JSONB indexing) cannot be retrofitted cheaply once 100+ products exist. Locale routing + Auth block every admin route. Pooled Postgres (#7) must be right in the first deploy.
**Delivers:** Neon DB with pooled runtime connection + direct migration connection; Drizzle schema for `admin_user`, `category`, `manufacturer`, `spec_field`, `product`, all `*_translations`, `product_spec_values`, `product_search`, `contact_submission`; drizzle-kit migration runner; Next.js 16 scaffold with `src/` + `@/*` alias; `[locale]` root segment + next-intl; middleware for locale rewrite + admin gate; Auth.js v5 email magic-link + Drizzle adapter; Cloudinary + Resend SDK config; Vercel EU region co-located with Neon; Sentry; sitemap/robots stubs; documented locale-fallback policy.
**Avoids pitfalls:** #1, #2, #7, #10, #12.

### Phase 2: Admin panel — content CRUD + media + spec-schema editor
**Rationale:** Nothing is populatable without admin; admin UX is the biggest operational risk. Spec-schema editor precedes product CRUD. Cloudinary signing precedes media linkage. Every Server Action write needs `revalidateTag` from day one.
**Delivers:** shadcn/ui admin shell (session-gated); category tree editor; manufacturer CRUD with translations; `spec_field` catalog editor per category with typed fields + units + filter_kind + migration-aware rename/delete; product CRUD with three-locale tabs, typed spec values, free-form extras, draft/published, duplicate, bulk-reassign; Cloudinary signed-upload endpoint + `MediaUploader` + `product_media`; admin inbox for submissions; invite flow with single-use expiring tokens + email-ownership verification; session idle + absolute timeout; `requireAdmin()` wrapper on every Server Action; `audit_log` table + writes on every mutation; `machine_translated` flag; translation-completeness view; dogfood 10-product entry exercise signs off phase.
**Avoids pitfalls:** #4, #5, #6, #8, #11, #14.

### Phase 3: Public rendering, search, SEO
**Rationale:** Once admin can populate data, public rendering is the unlock. Search + SEO must land together — hreflang, JSON-LD, per-locale FTS dictionaries interlock. Performance budget is set here.
**Delivers:** Product detail (fiztech-density spec tables, grouped, mobile stack); category listing with faceted filter sidebar (nuqs URL-backed); home; `/search` (force-dynamic) against per-locale `product_search` with cross-locale fallback; part-number exact-match short-circuit; three-zone autocomplete; per-locale sitemaps; hreflang + per-locale canonical everywhere; Product/Organization/BreadcrumbList/CollectionPage JSON-LD; `next/font` with `['latin','latin-ext','cyrillic']`; U+02BB handling in slugs + FTS normalization; `<CldImage>` with `sizes`; mobile pattern validated on real device at Slow 4G; Rich Results Test + Search Console International Targeting clean.
**Avoids pitfalls:** #3, #9, #10, #11, #12, #13.

### Phase 4: Content features — recipes, industries, cross-links
**Rationale:** Enhance but do not gate catalog; deferring keeps Phase 3 focused on SEO-critical path.
**Delivers:** `recipe` + `industry` + translations + Tiptap editor (with link/image/table extensions); public recipe and industry pages; M:N `product_recipes` + `product_industries`; "Used in" section on product pages; TechArticle JSON-LD; 5–10 selection-guide articles + 5–8 industry landing pages localized at launch.

### Phase 5: Contact, launch polish, observability
**Rationale:** Contact form is the sole CTA and a launch blocker. Observability must be live before public traffic.
**Delivers:** Public contact form with honeypot + Turnstile + per-IP rate limit + `source_page` hidden field; Resend admin notification; admin inbox filtering/export; Sentry across Node/Edge/client; Vercel Analytics + Speed Insights; Cloudinary quota alerts 50/75/90%; sitemap polish; Google Search Console + Yandex Webmaster registration + International Targeting verification; load test (`ab -n 500 -c 50`) on preview; real-device mobile QA on Slow 4G across three locales; content team sign-off.

### Phase Ordering Rationale

- Schema + locale routing cannot slip past Phase 1 — the three highest-cost pitfalls are schema-shaped and force post-launch migrations if missed.
- Admin precedes public rendering because content precedes display; public pages against mock data hide real filter-performance and fallback issues.
- Search and SEO are one phase, not two — hreflang, canonical, sitemaps, JSON-LD, per-locale tsvectors interlock.
- Recipes + industries are additive; deferring them keeps Phase 3 focused.
- Contact + observability last in ordering only — small but launch-blocking; best validated end-to-end once everything else is stable.

### Research Flags

Phases needing deeper research during planning (`/gsd-research-phase`):
- **Phase 1:** Next.js 16 caching API names (`unstable_cache`, `revalidateTag`, `"use cache"`) shifted between versions — verify at scaffold. Neon transaction-mode pooling posture with Auth.js session writes.
- **Phase 2:** Spec-schema editor UX (rename-as-migration, type-change preview, delete-with-impact-count) is the hardest design problem — budget a design spike. Translation-completeness view design.
- **Phase 3:** Uzbek FTS morphology — `simple` is adequate but primitive; decide whether custom dictionary/synonyms needed at launch. Mobile spec-table pattern design spike. Default-locale decision for `.uz` visitors (Russian vs Uzbek-Latin).
- **Phase 4:** Tiptap content model for embedded product cards (custom node schema).
- **Phase 5:** PDF localization policy — per-locale datasheet vs single-source with locale indicator.

Phases with standard patterns (skip research-phase):
- Phase 1 deployment/Vercel/Neon wiring.
- Phase 4 recipe/industry CRUD (extensions of Phase 2 patterns).
- Phase 5 contact form + honeypot + Turnstile + Resend.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Library selection verified; exact minor versions MEDIUM — pin at install. |
| Features | MEDIUM | Reference-site patterns from prior knowledge, not live-verified this pass; spot-check before locking UX specs. |
| Architecture | MEDIUM-HIGH | Patterns long-stable; Next.js 15/16 caching API names LOW — verify at scaffold. |
| Pitfalls | HIGH | Domain-specific issues verified against official docs; phase mapping explicit. |

**Overall confidence:** HIGH for roadmapping. Canonical build order, critical schema shape, and pitfall-to-phase mapping are firm; feature nuances and exact version pins are the MEDIUM items and are deliberately deferred to phase-level validation.

### Gaps to Address

- Uzbek FTS morphology (`simple` fallback adequacy) — evaluate Phase 3.
- Default-locale detection policy (Russian vs Uzbek-Latin) — decide Phase 1, verify Phase 3.
- Neon vs Supabase final pick — lock Phase 1 scaffold.
- PDF localization policy (per-locale vs single-source with indicator) — decide Phase 2.
- Reference-site live verification (fiztech density, ifm comparison UX, WIKA approvals filter) — spot-check before locking Phase 3 UX.
- Approvals as typed enum (`spec_field` with `enum` type) — lock schema in Phase 1 to unlock v1.x approvals filter without rework.

## Sources

**Primary (HIGH):** Next.js App Router docs; Vercel platform docs; PostgreSQL FTS + JSONB docs; Neon connection pooling; Google hreflang + Product structured-data; Cloudinary signed upload + transformation URLs; Auth.js v5 Email provider; Drizzle + Neon HTTP driver; Yandex Webmaster; PROJECT.md.

**Secondary (MEDIUM):** Training-data knowledge of Drizzle, next-intl, Auth.js, Tiptap, shadcn/ui, Tailwind v4, Neon, Cloudinary, Resend, Sentry; reference-site patterns (WIKA, Endress, Emerson/Rosemount, VEGA, ifm, Krohne, Siemens, Baumer, fiztech.ru); Russian industrial terminology + Uzbek Latin orthography (U+02BB) + CIS B2B SEO conventions.

**Tertiary (LOW — validate at scaffold):** Next.js 15/16 caching API names; exact current minor versions of Drizzle/next-intl/Auth.js v5/Tiptap/`next-cloudinary`/Tailwind v4/shadcn CLI/TanStack Table/React Hook Form/Zod; Lucia archived status.
