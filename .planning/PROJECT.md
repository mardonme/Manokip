# Manometr

## What This Is

A modern B2B digital platform for industrial pressure-measurement equipment and related sensors — manometers, pressure transmitters, gauges, and measurement instrumentation. The platform presents deeply-structured product information (full specifications, downloadable datasheets, real-world use cases) to engineers, industrial companies, and technical specialists so they can evaluate and select equipment. It is explicitly **not** an e-commerce store — users do not purchase directly; they inform their decisions and reach out through a contact form.

Inspirational reference: **fiztech.ru** — dense spec tables, clean minimal aesthetic, strong category taxonomy, downloadable PDFs.

## Core Value

**Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.**

If every other feature fails but this one works, the platform still wins.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

**Foundations (validated in Phase 1: 2026-04-23)**
- [x] Database schema with sibling `*_translations` tables, typed spec long-table, Auth.js tables (24 tables on Neon dev)
- [x] Locale-prefixed routing `/uz/...` `/ru/...` `/en/...` with root-redirect via next-intl middleware
- [x] Managed Postgres on Neon (pooled runtime + direct migration); Vercel region co-located (fra1)
- [x] Auth.js v5 magic-link with Drizzle adapter + Resend; `/[locale]/admin/*` gated by edge proxy
- [x] Cloudinary signing endpoint; credentials in environment only
- [x] Production deployment scaffold with Sentry + Vercel Analytics + Speed Insights

**Admin panel (validated in Phase 2: 2026-04-29)**
- [x] Email-invite flow for a small admin team — 48-hour single-use token, atomic consumption (Pitfall #4 mitigated)
- [x] Magic-link login with 24h idle / 7d absolute session caps + access-denied banner + harvesting mitigation
- [x] CRUD for categories (tree + 3-locale translations), manufacturers (with Cloudinary logo), spec fields (rename/soft-delete/groups), products (single long-page editor with 3-locale tabs), submissions inbox with CSV export, audit log viewer
- [x] All editable content supports UZ / RU / EN in parallel via sibling translation tables
- [x] Media upload to Cloudinary via signed direct upload; DB stores `public_id` only (Pitfall #5 widget paramsToSign protocol verified end-to-end)
- [x] Per-product translation completeness indicator + per-field machine-translated visual flag (D-04 + D-05)
- [x] Every mutation invokes typed `revalidateTag` helpers; OPS-01 e2e gate authored (deployment-side validation queued for first preview PR)
- [x] Clean admin UX — single-page product editor (D-01), reusable DataTable / LocaleTabs / SlugInput / ConfirmDialog / MediaUploader primitives

**Public rendering, search, SEO (validated in Phase 3: 2026-05-01)**
- [x] Locale-prefixed routing (`/uz/`, `/ru/`, `/en/`) with site-wide language switcher
- [x] Category tree navigation + category listing pages with typed faceted filters (number ranges / enums / booleans) and nuqs URL state
- [x] Fiztech-density product detail pages — grouped spec tables, gallery, manufacturer attribution, downloadable datasheets/certificates, server-rendered first byte
- [x] Per-locale `tsvector` + GIN full-text search with cascade fallback (current → uz → ru → en), SKU exact-match short-circuit redirect, autocomplete
- [x] Per-locale canonical + hreflang for uz/ru/en + `x-default`; per-locale XML sitemaps referenced from `robots.txt`
- [x] Product / Organization / Category / BreadcrumbList JSON-LD; manufacturer index + detail pages

**Content features (validated in Phase 4: 2026-05-01)**
- [x] Tiptap v3 rich-text recipe + industry authoring with Cloudinary image embeds, M:N admin-managed product cross-links, locale-fallback banner on detail pages
- [x] "Used in" widget on product detail (capped at 6 cross-references) + revalidate fan-out on M:N changes
- [x] TechArticle JSON-LD on recipe + industry detail pages

**Contact + launch polish (validated in Phase 5: 2026-05-05)**
- [x] Site-wide contact form gated by honeypot + Cloudflare Turnstile + per-IP HMAC-keyed rate limit (5/hour AND 20/day)
- [x] Source-page capture + product-context auto-prepend + fire-and-forget Resend dispatcher with 2 React Email templates
- [x] Canonical `/[locale]/contact` page mounted in sitemap; Lighthouse CI 5-URL fan-out + `ab` load-test workflow + Slow-4G glyph-render e2e

### Active

<!-- Current scope. Building toward these. -->

v1.0 shipped 2026-05-06. Next milestone is v1.1, defined via `/gsd-new-milestone v1.1`. Working scope is the public-site visual refresh against the design canvas in `idea/` (committed 2026-05-06 as v1.1 reference). Brand-name confirmation pending; commerce-element strip required (no price/qty/stock/Add-to-order; single Request-quote CTA).

7 known deferred items (DEF-2-17-01, DEF-03, 5× DEF-5-06-*) are tracked in `STATE.md ## Deferred Items` — all are user-driven environmental work that crosses CLI/UI boundaries. None block v1.1 development.

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **E-commerce / cart / payments** — Platform is informational, not transactional; no purchasing decisions run through it
- **Request-for-quote (RFQ) system beyond the contact form** — Deferred to v2 once we see what users actually ask for
- **Per-product "Request info" inquiry buttons** — Deferred; single contact form is enough signal for v1
- **Manufacturer self-service portals** — Too complex for v1; partners onboarded manually through admin team
- **Editor-vs-admin role split (full RBAC)** — v1 uses a flat "admin" role for 2–5 trusted invitees; proper roles come when team grows
- **External API integrations** — Planned for future; all product data entered by humans through admin in v1
- **Uzbek Cyrillic (uz-Cyrl)** — Primary Uzbek audience reads Latin; add only if user research demands it
- **Mobile app (iOS / Android)** — Responsive web is the deliverable; native apps are not on the roadmap

## Context

**Audience.** B2B — engineers, industrial purchasing specialists, technical decision-makers at Uzbek and CIS industrial companies (oil & gas, chemical, utilities, manufacturing). They will arrive via Google searches for specific product parameters, landing directly on category or product pages. They need to **trust** what they see — amateur styling, machine-translated copy, or thin spec tables kill the sale.

**Content reality.** 100–500 products within year one. Content is the product — the admin panel must be pleasant enough that a small team keeps it populated and translated. Translation is manual in v1 (no machine-translation pipeline).

**Brand inspiration (fiztech.ru).** Dense spec tables, clean minimal aesthetic, strong category-driven navigation, downloadable PDFs per product. Emulate the information architecture, not the visual style verbatim.

**SEO matters.** B2B buyers discover products through search. SSR + structured data are non-negotiable. Multilingual SEO requires correct hreflang tags and locale-scoped URLs.

**Prior work.** No prior Manometr code. The greater `$HOME` directory contains an unrelated `STARP/starp_front` React/Vite SPA — that is a sibling project, not this one, and shares no code.

## Constraints

- **Tech stack**: Next.js (App Router, SSR) + TypeScript — SEO requires server rendering; Next.js is the industry-standard Vercel-first option
- **Database**: PostgreSQL (managed — Neon or Supabase) — native multilingual full-text search, strong relational modeling for hybrid spec schema
- **Media**: Cloudinary for all images and PDFs — removes image-optimization work and serves files from a global CDN
- **Hosting**: Vercel for the Next.js app + managed Postgres — zero-ops deployment, fast iteration
- **i18n**: Three parallel content locales from day one — schema must not treat Russian as "the main one"; all three are first-class
- **Scale target**: 100–500 products year one — schema should tolerate growth, but do not pre-optimize for 10k products
- **Team**: Small (solo/small team) — prefer boring, well-documented choices over novelty
- **Budget-conscious**: Managed services OK when they remove ops burden; avoid enterprise-priced tools

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js SSR over SPA or SSG | B2B discovery is Google-driven; server rendering is non-negotiable for SEO. SSG ruled out because admin-driven content changes must appear without a deploy. | ✓ Good (v1.0) — RSC + ISR + tag-based invalidation works as designed; admin edits visible on public refresh within 5s via OPS-01 e2e gate |
| Postgres (managed) over headless CMS | Hybrid spec schema + multilingual filtering is awkward in off-the-shelf CMS. Postgres JSONB + native full-text gives control without ops. | ✓ Good (v1.0) — Neon HTTP serverless driver + WS pool for migrations; 24-table schema with sibling translations + typed long-table + per-locale tsvector all on managed Postgres |
| Hybrid spec schema (category-defined + per-product extras) | Per-category schema is too rigid (real products break it); free-form key-value is too loose (filtering breaks). Hybrid gives structured queries for the common 80% and flexibility for the rest. | ✓ Good (v1.0) — `spec_field` catalog + typed `product_spec_values` long-table (`num_value`/`text_value`/`enum_value`/`bool_value`) drives both admin entry and PLP faceted filters |
| Cloudinary for media | PDFs and high-res product images benefit from automatic optimization and CDN delivery. Cost is justified by removing image-pipeline work. | ✓ Good (v1.0) — Signed direct upload bypasses Vercel; DB stores `public_id` only; widget paramsToSign protocol parity verified end-to-end (Pitfall #5 closed in plan 02-14) |
| Three languages from day one, not "Russian first, translate later" | Adding a third language to a bilingual schema is painful; designing for 3 from the start is the same cost as designing for 2. | ✓ Good (v1.0) — Sibling `*_translations` tables keyed `(entity_id, locale)`; locale-fallback cascade in reads; per-locale tsvector + canonical + hreflang; Russian schema bias avoided |
| Simple flat "admin" role in v1 | 2–5 trusted invitees don't need RBAC overhead; role splits come when team grows to where it hurts. | ✓ Good (v1.0) — Single `requireAdmin()` wrapper covers all Server Actions; audit log records actor email per mutation; revisit if team grows past 5 |
| Contact form only (no per-product inquiry forms) in v1 | Need to learn what users actually ask for before building structured RFQ. Contact form captures signal cheaply. | ✓ Good (v1.0) — Single site-wide form gated by Turnstile + honeypot + rate limit; source-page capture lets us learn which pages drive contacts; revisit RFQ in v2 with real submission data |
| Uzbek Latin only (no Cyrillic) in v1 | Primary audience reads Latin; Cyrillic doubles translation work and clutters UI until validated by real demand. | ✓ Good (v1.0) — Inter Tight subsets cover U+02BB `oʻ`/`gʻ`; glyph-render e2e locks rendering across uz/ru/en; v2-FEAT-11 tracks `uz-Cyrl` if user research demands it |
| Phase-by-phase execution with hard verification gates (v1.0 retrospective) | Closed-with-deferred-validation posture (locally complete vs externally validated) lets a phase ship code-complete while explicitly tracking environmental work the executor cannot drive (CLI/UI boundaries, manual QA, third-party registrations). 5/5 v1.0 phases used this posture. | ✓ Good (v1.0) — D-15 two-state model in RETROSPECTIVE.md; 7 deferred items at close all classified as user environmental work, not codebase gaps |
| Wave 0 RED-stub convention (v1.0 retrospective) | Authoring failing test stubs at the start of each phase, then flipping RED→GREEN as plans land, made wave dependencies explicit and prevented the "what tests should I write" decision from blocking each plan. | ✓ Good (v1.0) — Used in Phases 2/3/4/5; flipped via grep-target enforcement (`FLIP-IN: NN-NN` comments in stubs paired with closure plans) |
| Visual refresh deferred to v1.1 (v1.0 retrospective) | v1.0 prioritized correctness (schema, SEO, security, dogfood readiness) over visual polish. The pragmatic shipped aesthetic is fiztech-density without bespoke styling. v1.1 rebuilds the public surface against the `idea/` design canvas. | ✓ Good (v1.0) — Avoided design churn during foundation work; design canvas now committed as v1.1 reference; commerce-element strip required (the design contains pricing/qty/stock affordances that violate the no-commerce guardrail) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-06 after v1.0 milestone close. 5 phases / 34 plans / 71 tasks shipped. 52/52 v1 requirements moved to Validated. 7 deferred items carried to v1.1 (all user-driven environmental work — see STATE.md). Next: `/gsd-new-milestone v1.1` for the public-site visual refresh against `idea/`.*
