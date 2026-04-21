# Requirements: Manometr

**Defined:** 2026-04-21
**Core Value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundations (FOUND)

- [ ] **FOUND-01**: Database schema supports sibling `*_translations` tables for every translatable entity (category, product, manufacturer, spec_field, recipe, industry) keyed `(entity_id, locale)` — no per-locale columns, no JSONB translation bags
- [ ] **FOUND-02**: Database schema supports typed spec fields (`spec_field` catalog with type `number`/`range`/`enum`/`bool`/`text` + unit metadata) and a long `product_spec_values` table with typed value columns (`num_value`, `text_value`, `enum_value`, `bool_value`)
- [ ] **FOUND-03**: Locale-prefixed routing (`/uz/...`, `/ru/...`, `/en/...`) via next-intl middleware; root `/` redirects to detected/default locale
- [ ] **FOUND-04**: Managed Postgres (Neon) with pooled runtime connection for app and direct connection for migrations; Vercel region co-located with database region
- [ ] **FOUND-05**: Auth.js v5 with email magic-link provider, Drizzle adapter, and Resend transactional email; admin session cookie gated by middleware for `/[locale]/admin/*` routes
- [ ] **FOUND-06**: Cloudinary SDK wired up with server-side signing endpoint; credentials in environment variables only
- [ ] **FOUND-07**: Production deployment on Vercel Pro with Sentry error tracking and Vercel Web Analytics + Speed Insights enabled

### Admin Panel (ADMIN)

- [ ] **ADMIN-01**: Invited admin can log in via email magic-link; session expires on idle (24h) and absolute limit (7d)
- [ ] **ADMIN-02**: Existing admin can invite a new admin by email; invite token is single-use and expires in 48 hours
- [ ] **ADMIN-03**: Admin can CRUD categories in a tree (parent/child), with translations for name and description across all three locales on one page
- [ ] **ADMIN-04**: Admin can CRUD manufacturers with translations and logo upload to Cloudinary
- [ ] **ADMIN-05**: Admin can define the spec-field schema for each category: add/rename/delete fields with type, unit, required flag, and filter behavior; rename treats stable internal key as unchanged
- [ ] **ADMIN-06**: Admin can CRUD products with: three-locale tabs (name, short description, long description, slug per locale), manufacturer assignment, category assignment, typed spec values (driven by the category schema), free-form display-only extras, draft/published state
- [ ] **ADMIN-07**: Admin can upload product images and datasheets/certificates directly to Cloudinary via signed-upload flow; DB stores `public_id` only
- [ ] **ADMIN-08**: Admin can duplicate an existing product as a starting point for a new one
- [ ] **ADMIN-09**: Admin can mark a translation as machine-generated (`machine_translated: true`); such fields are flagged in the UI
- [ ] **ADMIN-10**: Admin can see a per-product translation-completeness indicator (which locales/fields are missing)
- [ ] **ADMIN-11**: Every admin write operation is recorded in an audit log (who, what, when, entity)
- [ ] **ADMIN-12**: Admin can view, search, and export contact-form submissions

### Public Catalog (CAT)

- [ ] **CAT-01**: Visitor can switch between Uzbek (Latin), Russian, and English site-wide; current locale reflected in URL
- [ ] **CAT-02**: Visitor can browse the category tree via a persistent navigation (left nav or mega-menu)
- [ ] **CAT-03**: Visitor sees a category listing page with products, filters, and result count
- [ ] **CAT-04**: Visitor can filter products on a category page using faceted filters driven by the category's typed spec fields (number ranges, enum selections, boolean toggles)
- [ ] **CAT-05**: Filter state is reflected in the URL (shareable/bookmarkable) via nuqs
- [ ] **CAT-06**: Visitor sees a product detail page with: hero image, gallery, full fiztech-density spec tables grouped by category-defined spec groups, free-form extras section, manufacturer attribution, downloadable PDFs/datasheets/certificates, "Used in" applications section
- [ ] **CAT-07**: All public pages are server-rendered (SSR or ISR) — HTML is populated on first byte, not client-fetched
- [ ] **CAT-08**: Product detail pages emit Product JSON-LD; organization pages emit Organization JSON-LD; category pages emit CollectionPage + BreadcrumbList JSON-LD

### Search (SRCH)

- [ ] **SRCH-01**: Visitor can perform a full-text search across product name, description, and spec text in the current locale
- [ ] **SRCH-02**: Search results page returns products ranked by relevance; empty current-locale results fall back to another locale with a "shown in [other locale]" hint
- [ ] **SRCH-03**: Search bar offers autocomplete suggestions as the user types (products matched by name/part-number)
- [ ] **SRCH-04**: Exact part-number matches short-circuit to the product detail page
- [ ] **SRCH-05**: Search index is rebuilt transactionally when a product (or its translations or spec values) is updated in admin

### Recipes and Industries (CONT)

- [ ] **CONT-01**: Admin can CRUD rich-text articles ("recipes" / selection guides) with Tiptap editor — links, images (Cloudinary), tables, headings; translated across all three locales
- [ ] **CONT-02**: Admin can CRUD industry-scenario pages (e.g., oil & gas, food processing, pharma) with translated content and linked recommended products
- [ ] **CONT-03**: Visitor can browse and read recipes and industry pages in their current locale
- [ ] **CONT-04**: Product detail pages show a "Used in" section listing the recipes and industry pages that reference the product
- [ ] **CONT-05**: Admin can assign M:N relationships between products ↔ recipes and products ↔ industries
- [ ] **CONT-06**: Recipes and industry pages emit TechArticle JSON-LD

### Manufacturers (MFG)

- [ ] **MFG-01**: Visitor can view a manufacturers/partners index page listing all partner brands with logos
- [ ] **MFG-02**: Visitor can view a manufacturer detail page showing brand description and products from that manufacturer

### Contact (CONT-ACT)

- [ ] **CTA-01**: Visitor can submit a site-wide contact form with name, company, email, message; form is gated by honeypot and Cloudflare Turnstile against spam
- [ ] **CTA-02**: Submission is persisted to the database and an email notification is sent to the admin team via Resend
- [ ] **CTA-03**: Form records the source page the submission came from (hidden field)
- [ ] **CTA-04**: Submission endpoint is rate-limited per IP to prevent abuse

### SEO and Internationalization (SEO)

- [ ] **SEO-01**: Every page emits `<link rel="alternate" hreflang>` tags for all three locales plus `x-default`
- [ ] **SEO-02**: Every page has a per-locale canonical URL (not a master canonical)
- [ ] **SEO-03**: Site emits per-locale XML sitemaps referenced from `robots.txt`
- [ ] **SEO-04**: Fonts load via `next/font` with subsets `['latin', 'latin-ext', 'cyrillic']`; Uzbek Latin `oʻ`/`gʻ` (U+02BB) renders correctly across locales
- [ ] **SEO-05**: Product images render through `<CldImage>` with responsive `sizes` attribute; LCP on product detail page passes Core Web Vitals on Slow 4G (emerging-market budget)
- [ ] **SEO-06**: Site is registered with Google Search Console and Yandex Webmaster; International Targeting panel is clean (no hreflang errors) before launch

### Content Operations (OPS)

- [ ] **OPS-01**: Admin edits to any product, category, recipe, or industry invalidate the relevant public pages via `revalidateTag` (no stale public pages after publish)
- [ ] **OPS-02**: Content team dogfoods entry of at least 10 real trilingual products, with each product taking 10 minutes or less from start to published — measured before launch

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future Admin

- **V2-ADMIN-01**: Role split (Admin vs Editor) with proper RBAC
- **V2-ADMIN-02**: Manufacturer self-service portal — manufacturers manage their own products
- **V2-ADMIN-03**: Translation-memory / TMS integration for repeated technical terms
- **V2-ADMIN-04**: Bulk import/export of products via CSV or manufacturer API feeds

### Future Visitor Features

- **V2-FEAT-01**: Side-by-side product comparison (2–4 products)
- **V2-FEAT-02**: Approvals-based filter (ATEX / IECEx / EAC) surfaced as top-level faceted filter
- **V2-FEAT-03**: "Request datasheet pack" multi-select contact flow preserving the single-form model
- **V2-FEAT-04**: Recently-viewed products (localStorage)
- **V2-FEAT-05**: Per-category PDF catalog download
- **V2-FEAT-06**: Product-finder wizard (guided selection Q&A)
- **V2-FEAT-07**: Configurator / part-number builder
- **V2-FEAT-08**: 3D model / CAD viewer on product pages
- **V2-FEAT-09**: Customer accounts with saved shortlists
- **V2-FEAT-10**: Structured RFQ form per product
- **V2-FEAT-11**: Uzbek Cyrillic locale (`uz-Cyrl`)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| E-commerce cart / checkout / pricing / stock display | Platform is informational — users decide via specs, contact when ready. Pricing varies by distributor and is commercially sensitive. |
| Per-product "Request info" inquiry buttons | Single site-wide contact form is enough signal for v1; per-product forms spread the request surface before we learn what users actually ask. Revisit once contact-form analytics exist. |
| Live chat widget | B2B buyers on industrial sites don't engage with chat — contact form + email is the right channel. Adds ops burden. |
| AI chatbot / LLM-driven Q&A over specs | High risk of hallucinated technical specs destroying credibility. Revisit only with a validation layer and post-launch. |
| Machine-translation auto-publish | Bad translations on technical content destroy trust permanently. Manual translation in v1; machine translation only as a flagged draft that a human reviews. |
| Customer accounts / logins for visitors | Platform is informational — no personalization value in v1 justifies the surface area. |
| Editor/Admin RBAC split | 2–5 trusted invitees don't need role splits; introduce when team grows to where it hurts. |
| Manufacturer self-service portal | Too complex for v1. Partners onboarded manually by admin team. |
| Mobile apps (iOS/Android native) | Responsive web is the deliverable; native apps not on roadmap. |
| Uzbek Cyrillic (`uz-Cyrl`) | Primary Uzbek audience reads Latin. Doubles translation work. Add only if user research demands it. |
| External API integrations for product data | All data entered by humans through admin in v1 to ensure quality. |
| Payment processing / invoicing | Not an e-commerce platform. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (to be populated by gsd-roadmapper) | | |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 48 ⚠️

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-21 after initial definition*
