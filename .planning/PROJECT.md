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

### Active

<!-- Current scope. Building toward these. -->

**Multi-language (public-facing UI — Phase 3)**
- [ ] Full UI in Uzbek (Latin), Russian, and English
- [ ] Language switcher visible site-wide on the public catalog (admin already has it)

**Product catalog (Phase 3)**
- [ ] Category tree with subcategories, accessible via faceted navigation
- [ ] Product list pages with filters driven by category spec fields (typed numeric ranges / enums / booleans)
- [ ] Product detail pages with deep structured spec tables (fiztech-style density)
- [ ] Downloadable PDFs / datasheets / certificates per product (rendering side — write side is in Phase 2)

**Search (Phase 3)**
- [ ] Multilingual full-text search across product name, description, and specs (per-locale `tsvector` + GIN index)
- [ ] Results respect current locale; fall back gracefully when a field is untranslated

**Recipes / use-cases (Phase 4)**
- [ ] Rich-text articles (e.g., "Selecting a manometer for high-pressure gas pipelines")
- [ ] Industry-scenario pages (oil & gas, food processing, pharma, etc.) linking relevant products
- [ ] "Used in" section on each product page surfacing linked case studies

**Partners / manufacturers (Phase 3)**
- [ ] Manufacturer showcase page(s) presenting each partner brand (write-side complete in Phase 2)
- [ ] Products linked to their manufacturer (display side)

**Contact (Phase 5)**
- [ ] Site-wide simple contact form — captures name, company, email, message; stores in DB and emails admins (admin inbox already shipped in Phase 2)

**SEO / presentation**
- [ ] Server-rendered pages (Next.js SSR) — indexable product and category pages
- [ ] Structured data (Product / Organization JSON-LD) for search engines
- [ ] Professional, trustworthy B2B aesthetic — dense information, restrained color palette

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
| Next.js SSR over SPA or SSG | B2B discovery is Google-driven; server rendering is non-negotiable for SEO. SSG ruled out because admin-driven content changes must appear without a deploy. | — Pending |
| Postgres (managed) over headless CMS | Hybrid spec schema + multilingual filtering is awkward in off-the-shelf CMS. Postgres JSONB + native full-text gives control without ops. | — Pending |
| Hybrid spec schema (category-defined + per-product extras) | Per-category schema is too rigid (real products break it); free-form key-value is too loose (filtering breaks). Hybrid gives structured queries for the common 80% and flexibility for the rest. | — Pending |
| Cloudinary for media | PDFs and high-res product images benefit from automatic optimization and CDN delivery. Cost is justified by removing image-pipeline work. | — Pending |
| Three languages from day one, not "Russian first, translate later" | Adding a third language to a bilingual schema is painful; designing for 3 from the start is the same cost as designing for 2. | — Pending |
| Simple flat "admin" role in v1 | 2–5 trusted invitees don't need RBAC overhead; role splits come when team grows to where it hurts. | — Pending |
| Contact form only (no per-product inquiry forms) in v1 | Need to learn what users actually ask for before building structured RFQ. Contact form captures signal cheaply. | — Pending |
| Uzbek Latin only (no Cyrillic) in v1 | Primary audience reads Latin; Cyrillic doubles translation work and clutters UI until validated by real demand. | — Pending |

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
*Last updated: 2026-04-29 — Phase 2 (Admin Panel) complete + verified. 13/13 ADMIN/OPS requirements satisfied; only DEF-2-17-01 (OPS-01 deployment-side validation) queued for first preview PR. Next: Phase 3 (Public Rendering, Search, SEO).*
