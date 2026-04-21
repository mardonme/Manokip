# Feature Research

**Domain:** B2B industrial product-catalog platforms (pressure-measurement equipment / instrumentation)
**Researched:** 2026-04-21
**Confidence:** MEDIUM

> **Research note.** External web access (WebSearch, WebFetch, SDK tools) was unavailable during this research pass, so reference-site patterns below are grounded in prior knowledge of the named reference sites (WIKA, Endress+Hauser, Emerson/Rosemount, VEGA, ifm, Krohne, Siemens Process Instrumentation, SMC, Baumer, fiztech.ru) rather than live fetches. Patterns described are well-established across the segment and stable year-over-year, so MEDIUM confidence is appropriate; they should still be sanity-checked against live sites before locking UX specs.

---

## Reference-Site Survey

Nine real-world reference sites cluster into three archetypes. Understanding which archetype Manometr should emulate drives every feature decision below.

| # | Site | Archetype | Country / Language count | Products | E-commerce? | Key characteristic |
|---|------|-----------|--------------------------|----------|-------------|--------------------|
| 1 | **fiztech.ru** | Distributor / informational catalog | RU (1) | ~hundreds | No | Dense category tree, compact spec tables, PDF-first, contact-form-only — this is the **closest architectural match to Manometr** |
| 2 | **wika.com** | Manufacturer / enterprise | 40+ locales | 10k+ SKUs | No (quote-based) | Product finder, per-product datasheet, "approvals and certificates" tab, CAD downloads, configurator for some families |
| 3 | **endress.com** | Manufacturer / enterprise | 30+ locales | 10k+ SKUs | Limited e-commerce (logged-in) | "Applicator" sizing tool, deep "Technology" content, strong application/industry hub |
| 4 | **emerson.com / Rosemount** | Manufacturer-brand / enterprise | 40+ locales | 10k+ SKUs | No (channel partners) | Solution-led IA (industry → application → product), extensive whitepapers |
| 5 | **vega.com** | Manufacturer / enterprise | 30+ locales | Focused portfolio | No | Best-in-class product-finder wizard, excellent 3D/CAD, clean IA |
| 6 | **ifm.com** | Manufacturer / enterprise | 30+ locales | 10k+ SKUs | Yes (direct e-commerce in some locales) | "Product family" pattern + variant matrix, compare-table feature |
| 7 | **krohne.com** | Manufacturer / enterprise | 25+ locales | Focused portfolio | No | Heavy "application" content, tech explainers, handbook PDFs |
| 8 | **siemens.com/process-instrumentation** | Manufacturer / enterprise | 40+ locales | 10k+ SKUs | Yes (Industry Mall) | Configure-to-order with part-number builder |
| 9 | **baumer.com** | Manufacturer / enterprise | 20+ locales | Focused portfolio | Quote-based | Clean spec-density, good filter UX |

**Universal features shared by all nine:**
1. Tree-style product taxonomy (family → series → variant)
2. Per-product PDF datasheet download
3. Spec table on every product page
4. Multilingual (minimum 2 locales, usually 10+)
5. Industry / application section separate from catalog
6. Contact mechanism (form at minimum)
7. "Approvals / certificates" or compliance section per product
8. Manufacturer/brand credibility block (about, quality, locations)

**What separates the premium tier (WIKA, Endress, VEGA) from the baseline:**
- **Product-finder wizards** — multi-step selectors that narrow on measurement range, medium, process connection
- **Configurator / part-number builder** — assemble a valid order code from options
- **CAD downloads** — STEP / DWG / 3D models per variant
- **Rich application hubs** — industry pages that read like sales enablement (not a product dump)
- **Hreflang-perfect i18n** — locale picker honors country + language, URLs reflect both
- **Approvals-first filtering** — filter products by ATEX, SIL, IECEx, 3-A, EHEDG
- **Search with spec-predicate parsing** — typing "0-10 bar G1/2" filters correctly

**What fiztech.ru specifically does well** (the IA reference):
- Compact left-hand category tree, always visible
- Product list page uses a compact row layout (image + name + top 3–5 specs + PDF link)
- Detail pages are long and dense: spec table, ordering info, downloads, related, contact
- No heavy marketing chrome; the information IS the marketing
- Single contact form; no per-product inquiry widget
- Russian-only — multilingual is an improvement over the reference

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these and a B2B engineer will mistrust the platform within 10 seconds.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Category / subcategory taxonomy with persistent left-nav** | Every instrumentation site is organized tree-first; engineers navigate by family, not by search | MEDIUM | 2–3 levels deep (family → series → variant). Must tolerate a product belonging to one primary category but being cross-listed via tags. |
| **Product detail page with dense spec table** | "Can I specify this without asking?" is the one question the site must answer. Sparse specs = not a real catalog. | MEDIUM | Fiztech-style: compact two-column rows, grouped into sections (measurement, process connection, electrical, materials, environmental, approvals). |
| **Per-product PDF datasheet download** | Engineers circulate PDFs internally for specification sign-off. No PDF = product doesn't exist to a procurement officer. | LOW | Single primary datasheet per product. Cloudinary-served. Track via filename convention `{sku}-datasheet-{locale}.pdf`. |
| **Per-product certificates / approvals section** | Industrial purchasing requires compliance proof (ATEX, IECEx, GOST, O'zDSt, EAC for CIS). Must be visible on the page, not buried. | LOW–MEDIUM | Can be a simple subsection listing approvals with PDF links. Deep version: filter catalog by approval. |
| **Category-level faceted filtering driven by spec fields** | Engineers filter by measurement range, accuracy, process connection. Without this, 200+ products is unusable. | HIGH | Hybrid spec schema (per PROJECT.md) maps directly — typed fields become facets, free-form extras don't. Range sliders for numeric specs, checkbox groups for enums. |
| **Full-text search with autocomplete** | Engineers arrive from Google searching for a part number or range. Site search must catch near-misses. | MEDIUM | Postgres `tsvector` + `trigram` covers v1. Multilingual configs per locale. Autocomplete returns products, categories, and application pages. |
| **Multilingual — UZ (Latin) / RU / EN** | CIS market reads Russian primarily; local engineers read Uzbek; technical decision-makers may read English datasheets. | HIGH | Per-field translation, not per-page clone. Graceful fallback when a field is untranslated (show source-language + subtle indicator). |
| **Locale-scoped URLs with hreflang** | Google surfaces the right language per region. Without this, SEO is broken. | MEDIUM | `/uz/...`, `/ru/...`, `/en/...` or subdomain. Hreflang on every page. `x-default` to Russian (primary CIS traffic). |
| **Server-rendered, indexable pages** | B2B discovery is Google-driven; no SSR = no organic traffic. | MEDIUM | Next.js App Router handles this; verify every product/category page returns 200 with full HTML. |
| **Product images (multiple views)** | Engineers need to see process connection, face, rear mount. 1 photo is not enough. | LOW | 3–6 images per product. Cloudinary auto-format/quality. |
| **Single site-wide contact form** | Non-transactional B2B; contact is the CTA. Per-PROJECT.md scope. | LOW | Name, company, email, phone (optional), message, source-page. Store in DB, email admins. Honeypot + rate limit. |
| **Manufacturer / brand attribution on every product** | Engineers trust brands (WIKA, Rosemount, Endress). Hiding the manufacturer looks shady. | LOW | Link to a manufacturer showcase page from each product. |
| **Structured data (Product, Organization JSON-LD)** | Rich results in Google = more clicks. Competitors all do this. | LOW | Next.js generates from product record; per-locale. |
| **Breadcrumb navigation** | Deep tree navigation requires "where am I" always visible | LOW | Category → subcategory → product, localized. |
| **Sitemap.xml + robots.txt** | Basic SEO hygiene | LOW | Auto-generated per locale. |
| **Mobile-responsive** | Engineers use phones on plant floors; procurement uses tablets | MEDIUM | Spec tables must remain readable on small screens — the hard problem. |
| **"Where used" / related applications on product page** | Engineers want to validate their use case matches intent | MEDIUM | Link to recipe / application articles that reference the product. |
| **Footer trust block** | Address, licenses, partner logos. Anonymous sites get ignored in B2B. | LOW | Static content, localized. |

### Differentiators (Competitive Advantage — What fiztech Does That Moves The Needle)

These are where Manometr can out-execute local competitors and approach the premium international tier.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Fiztech-density spec tables done better in 3 languages** | Most CIS competitors either have thin specs or only in Russian. Dense + trilingual = trust compounder. | HIGH | Per-category spec schema must carry field labels in 3 languages. Admin UX for this is the hard part — budget time for it. |
| **Side-by-side product comparison (2–4 products)** | Engineers compare variants when down-selecting. Ifm, Baumer, VEGA do this well. | MEDIUM | "Add to compare" on list + detail pages; compare page shows a transposed spec table with differences highlighted. Requires table stakes faceting first. |
| **Application / industry landing pages** | "Pressure measurement in oil & gas pipelines" is a high-intent Google query. Landing pages that link to catalog drive qualified traffic. | MEDIUM | Rich-text articles + a curated product grid. Oil & gas, chemical, water/wastewater, food, pharma, HVAC, energy. |
| **"Selection guide" / recipe articles** | Engineers researching "how to choose a manometer for high-temp steam" are exactly the buyer. Content = SEO moat + trust. | MEDIUM | Rich-text with inline product blocks. Bilingual minimum, trilingual ideal. |
| **Approvals / certification filter on catalog** | Filter-by-ATEX or filter-by-EAC is a power-user feature that signals "we understand industrial procurement." | MEDIUM | Requires approvals as typed taxonomy in the spec schema. |
| **Manufacturer showcase pages** | Brand credibility is transferred from partner to Manometr. Per PROJECT.md. | LOW–MEDIUM | Per-manufacturer page: logo, description, quality statement, catalog of their products carried, link to their website. |
| **Part-number / article-number search** | Engineers often arrive knowing the code ("PGS23.100"). Exact match short-circuits navigation. | LOW | Indexed field in full-text search with higher weight; exact-match redirect to detail page. |
| **"Request datasheet pack" multi-product contact** | A shortlisted engineer wants datasheets for 3 products at once with a single inquiry. More actionable than a generic form. | MEDIUM | Extension of the contact form: carry selected products as a list. **Note:** PROJECT.md defers per-product inquiry buttons — this is a lighter variant that preserves the single-form model. Consider for v1.x, not v1. |
| **Downloadable category catalog PDF** | Procurement teams circulate whole-category PDFs. Emerson, WIKA provide these. | LOW | Static uploads per category, per locale. |
| **URL-based filter state (shareable filtered views)** | "Send me the link to all 0–25 bar gauges with G1/2" is how engineers collaborate. | LOW | Query-param-backed filter state; works with SSR for SEO. |
| **Recently viewed products** | Engineers browsing 20+ products benefit from a session-level trail. Low cost, noticeable polish. | LOW | localStorage, no account needed. |
| **Product changelog / "new" badge** | Distributors adding new lines benefit from a "what's new" surface for repeat visitors. | LOW | Date field in admin; badge on list page for N days. |
| **Admin UX quality (pleasant enough to keep populated)** | Per PROJECT.md: content IS the product. Admin effort is the bottleneck. | HIGH | Inline translation editors, bulk ops, import via CSV, preview-before-publish, media picker. |

### Anti-Features (Deliberately NOT Built for v1 Informational Platform)

Features that are tempting but either contradict the informational-only scope or create complexity without v1 value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Shopping cart / checkout / payments** | "It's a catalog, why not sell?" | Contradicts project scope; requires pricing, stock, logistics, tax, payment integration, returns — none of which exist in v1. Changes the legal and operational posture of the business. | Contact form only. Per PROJECT.md. |
| **Per-product "Request a quote" buttons** | Premium sites have them; feels like a gap without | Each button is a separate structured RFQ flow; multiplies contact-form logic per product; without CRM on the other end, leads get lost | Single site-wide contact form carries `source_page` so admins see which product the user was on. Revisit v2 once contact-form signal tells us what users actually ask. |
| **Manufacturer self-service portal** | Partners want to manage their own products | Requires multi-tenant auth, RBAC, moderation queue, billing — massive scope. 100–500 products do not justify. | Manual onboarding via admin team. Per PROJECT.md. |
| **Live chat / WhatsApp widget everywhere** | "Conversion!" | B2B engineers do their research silently; chat widgets interrupt without adding signal; requires staffed responders | Static "Call us / Telegram" contact block in footer. No modal interruptions. |
| **User accounts / favorites / saved carts** | Seems standard | No e-commerce means nothing to save; accounts introduce auth, email verification, password reset, GDPR consent for no v1 payoff | localStorage-backed "recently viewed" + URL-backed filter state. Zero auth, same utility. |
| **Product reviews / ratings / UGC** | "Social proof" | B2B engineers do not review instrumentation publicly; risk of fake or competitor-posted content; moderation burden | Trust signals: manufacturer logos, certifications, case-study articles authored by the platform. |
| **AI chatbot / "ask a product question"** | Trendy, seems helpful | LLMs hallucinate specs; an incorrect answer on a safety-critical pressure gauge is a liability event. No training data on the specific catalog. | Excellent search + clear structured data. Engineers prefer deterministic answers. |
| **Configurator / part-number builder in v1** | Premium manufacturers have them | Requires valid-combination rules engine per product family, massive data entry, QA. Only valuable at 1000+ SKUs with true configurable options. | Ship a flat catalog v1; add configurator in v3 if the catalog grows into true configurable families. |
| **3D / CAD model viewer in v1** | VEGA, WIKA have it | STEP/DWG content usually comes from manufacturers on request; not readily available for all brands; requires licensing | Link to manufacturer's CAD library when available; host locally when uploaded. No in-browser 3D viewer in v1. |
| **Real-time stock / lead-time display** | "Customers want to know" | Data source does not exist (no ERP, no manufacturer feed). Static stock lies and erodes trust. | No stock shown. Contact form for availability. |
| **Pricing** | "Obviously" | Same as stock. Industrial pricing is negotiated, volume-dependent, and partner-specific. Public prices cause channel conflict with manufacturers. | No pricing shown. Standard B2B distributor convention. |
| **Manufacturer-MRP / internal tools** | Scope creep | Out of scope; Manometr is a public catalog, not an ERP | Use a separate tool; admin panel stays focused on public-facing content. |
| **Full RBAC / editor roles in v1** | "Proper architecture" | 2–5 trusted invitees don't benefit from it; introduces complexity that delays shipping | Flat admin role. Per PROJECT.md. Add when team outgrows it. |
| **Uzbek Cyrillic script** | "Complete language support" | Primary audience reads Latin; doubles translation work; clutters UI | Latin only. Revisit if user research demands. Per PROJECT.md. |
| **Mobile app** | "Modern companies need apps" | B2B catalog browsing is overwhelmingly desktop; app requires stores, reviews, update cadence | Responsive web. Per PROJECT.md. |
| **Real-time WebSocket anything** | Shine factor | Nothing in the domain changes in real time that a user needs to see | Standard request/response, HTTP cache. |
| **Machine-translation pipeline in v1** | "Save human translation cost" | Industrial terminology mis-translates; bad Russian-into-Uzbek kills trust in a multilingual CIS product | Manual translation per field in admin. Per PROJECT.md. Consider ML-assisted suggestions (not auto-publish) in v1.x. |
| **Multi-currency / multi-region pricing** | N/A — no pricing | N/A | N/A |
| **Subscription / SaaS login gating of content** | "Lead gen!" | Industrial engineers abandon gated sites; SEO penalty (gated = not indexable) | All content public; contact form is the only gate. |

---

## Feature Dependencies

```
Category taxonomy
    └──enables──> Product listing pages
                      └──enables──> Faceted filtering
                                        └──requires──> Per-category spec schema (hybrid)
                                                           └──enables──> Product comparison
                                                           └──enables──> Approvals-based filtering

Per-category spec schema
    └──enables──> Dense spec tables on product pages
    └──enables──> URL-shareable filter state
    └──enables──> Product comparison (differential view)

Multilingual content model (per-field)
    └──gates──> Every content-bearing feature (catalog, recipes, manufacturers)
    └──requires──> Admin translation UX
    └──enables──> hreflang SEO
    └──enables──> Locale-aware search

Full-text search
    └──requires──> Locale-specific Postgres tsvector configs
    └──enhances──> Autocomplete
    └──enhances──> Part-number exact-match redirect

Product detail page
    └──requires──> Image pipeline (Cloudinary)
    └──requires──> PDF/document pipeline (Cloudinary)
    └──enables──> Structured data (JSON-LD)
    └──enables──> "Where used" links to recipes
    └──enables──> Manufacturer attribution link

Recipes / application pages
    └──enhances──> Product detail ("used in")
    └──enhances──> SEO (long-tail content)
    └──requires──> Rich-text editor in admin

Manufacturer showcase
    └──requires──> Product-to-manufacturer relation
    └──enhances──> Trust signals site-wide

Contact form
    └──enhances──> Every page (source_page capture)
    └──required-for──> Launch (it's the only CTA)

Admin panel
    └──gates──> Every content feature (nothing can be populated without it)
    └──requires──> Email-invite flow, media upload, translation UI
```

### Dependency Notes

- **Faceted filtering requires the hybrid spec schema.** The per-category typed fields become facets; per-product free-form extras do not. The roadmap must land the schema and admin UX for it before filtering works meaningfully.
- **Product comparison requires faceted filtering first.** Users select products via list pages; comparison is a view on top of the same typed schema.
- **Multilingual is a cross-cutting gate.** Bolting a third language onto a bilingual schema is painful; every table-stakes content feature must be designed with three locales from day one (per PROJECT.md key decision).
- **hreflang requires locale-scoped URLs**, which requires the Next.js routing decision to be made early. This blocks SEO correctness.
- **Recipes enhance, do not gate, product pages.** Ship catalog without recipes is viable; ship recipes without catalog is not. Recipes belong in v1 but can be the last phase.
- **Manufacturer showcase conflicts with nothing** — it's an additive, isolated feature. Safe to land late in v1.
- **Approvals filtering enhances table stakes filtering**, but requires approvals to be typed into the schema (not free-text). A decision point for the schema design.
- **URL-shareable filter state and "recently viewed" conflict in implementation approach but not in spirit** — one is in the URL, the other in localStorage. They coexist.

---

## MVP Definition

### Launch With (v1)

Ruthless MVP. Everything below is "leave it out and the platform doesn't meet B2B expectations."

- [ ] **Multilingual content model** (UZ/RU/EN, per-field, graceful fallback) — cross-cutting gate
- [ ] **Category / subcategory taxonomy** — navigation backbone
- [ ] **Hybrid per-category spec schema** — unlocks dense tables + filtering
- [ ] **Product list pages with faceted filtering** — catalog is unusable without
- [ ] **Product detail pages with dense spec tables** — the core value proposition
- [ ] **Per-product PDF datasheet download** — procurement table stakes
- [ ] **Per-product certificates / approvals subsection** — compliance trust
- [ ] **Multilingual full-text search with autocomplete** — arrival from Google expects it
- [ ] **Part-number / article-number exact-match search** — low cost, high-value power-user feature
- [ ] **Manufacturer attribution on every product + manufacturer showcase pages** — brand trust transfer
- [ ] **Application / industry landing pages (5–8 industries)** — SEO differentiator, aligns with PROJECT.md recipes
- [ ] **Selection-guide / recipe articles (5–10 at launch)** — long-tail SEO, trust-building
- [ ] **"Where used / applications" cross-links on product pages** — ties recipes into catalog
- [ ] **Single site-wide contact form with source-page capture** — the sole CTA
- [ ] **Locale-scoped URLs + hreflang + sitemap + JSON-LD** — SEO non-negotiables
- [ ] **Mobile-responsive spec-table pattern** — plant-floor use
- [ ] **Admin panel** — email invite, flat admin role, CRUD for all entities, per-field translation UI, Cloudinary media upload, preview

### Add After Validation (v1.x)

Add once v1 contact-form analytics reveal what users actually ask for.

- [ ] **Side-by-side product comparison** — add once logs show users viewing 3+ products per session
- [ ] **"Request datasheet pack" multi-product contact** — add once single-product contact shows shortlisting behavior
- [ ] **Approvals / certification filter on catalog** — add once approvals data is consistently populated across products
- [ ] **URL-shareable filter state** — add once filter usage is proven
- [ ] **Recently viewed products** — lightweight, add any time
- [ ] **Downloadable category catalog PDF** — add once category content stabilizes
- [ ] **"New / updated" badges** — add once content cadence is regular
- [ ] **Machine-translation-assisted suggestions in admin (not auto-publish)** — add once translator workflow is understood
- [ ] **Search result ranking tuning** — requires analytics on what users click

### Future Consideration (v2+)

Defer until v1 validates the audience and content cadence.

- [ ] **Structured RFQ / quote request system** — only if contact-form traffic justifies it
- [ ] **Product configurator / part-number builder** — only if catalog grows to include true configurable families (500+ SKUs)
- [ ] **3D / CAD model viewer** — only if manufacturer partners supply CAD assets systematically
- [ ] **Customer accounts / favorites** — only if user research proves value in a non-transactional context
- [ ] **Editor / admin RBAC split** — only when the team grows past 5 people
- [ ] **External API integrations (manufacturer product feeds)** — only when manual entry is the bottleneck
- [ ] **Uzbek Cyrillic** — only if user research demands
- [ ] **Mobile native app** — unlikely; responsive web stays the deliverable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multilingual content model (UZ/RU/EN per-field) | HIGH | HIGH | P1 |
| Category taxonomy with left-nav | HIGH | MEDIUM | P1 |
| Hybrid per-category spec schema | HIGH | HIGH | P1 |
| Dense spec tables on product pages | HIGH | MEDIUM | P1 |
| Per-product PDF datasheet | HIGH | LOW | P1 |
| Certificates / approvals subsection | HIGH | LOW | P1 |
| Faceted filtering driven by spec schema | HIGH | HIGH | P1 |
| Full-text search + autocomplete | HIGH | MEDIUM | P1 |
| Part-number exact-match redirect | MEDIUM | LOW | P1 |
| Contact form (site-wide, source-page) | HIGH | LOW | P1 |
| Manufacturer attribution + showcase pages | MEDIUM | LOW | P1 |
| Application / industry landing pages | HIGH | MEDIUM | P1 |
| Selection-guide / recipe articles | HIGH | MEDIUM | P1 |
| "Where used" cross-links | MEDIUM | LOW | P1 |
| Locale-scoped URLs + hreflang | HIGH | MEDIUM | P1 |
| Structured data (JSON-LD) | MEDIUM | LOW | P1 |
| Admin panel (CRUD + translation + media) | HIGH (internal) | HIGH | P1 |
| Mobile-responsive spec tables | HIGH | MEDIUM | P1 |
| Side-by-side product comparison | MEDIUM | MEDIUM | P2 |
| Approvals-based catalog filter | MEDIUM | MEDIUM | P2 |
| "Request datasheet pack" multi-select contact | MEDIUM | MEDIUM | P2 |
| URL-shareable filter state | MEDIUM | LOW | P2 |
| Recently viewed products | LOW | LOW | P2 |
| Category catalog PDF downloads | LOW | LOW | P2 |
| Admin translation-assist suggestions | MEDIUM (internal) | MEDIUM | P2 |
| Configurator / part-number builder | HIGH | HIGH | P3 |
| 3D / CAD viewer | MEDIUM | HIGH | P3 |
| Customer accounts | LOW | MEDIUM | P3 |
| RBAC split | LOW (at current scale) | MEDIUM | P3 |
| External API integrations | MEDIUM | HIGH | P3 |
| Uzbek Cyrillic | LOW | MEDIUM | P3 |

**Priority key:**
- **P1**: Must have for launch — incomplete without
- **P2**: Should have, add when v1 signals demand
- **P3**: Nice to have, future consideration

---

## Competitor Feature Analysis

Matrix of key features across the reference-site survey. "✓" = present, "—" = absent, "◐" = partial.

| Feature | fiztech.ru | WIKA | Endress+Hauser | Emerson/Rosemount | VEGA | ifm | Our v1 Approach |
|---------|:---------:|:----:|:--------------:|:-----------------:|:----:|:---:|-----------------|
| Category tree navigation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ left-nav, 2–3 levels |
| Dense spec tables | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ fiztech density, trilingual |
| Per-product PDF | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ primary datasheet + certificates |
| Faceted filtering | ◐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ schema-driven |
| Full-text search + autocomplete | ◐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ Postgres tsvector per locale |
| Multilingual (10+ locales) | — (RU only) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 3 locales (UZ/RU/EN) |
| Hreflang / locale-scoped URLs | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ non-negotiable |
| Product-finder wizard | — | ✓ | ✓ | ✓ | ✓ | ◐ | — (v2+) |
| Configurator / part-number builder | — | ◐ (some families) | ◐ | — | — | ✓ | — (v3+) |
| CAD / 3D downloads | — | ✓ | ✓ | ✓ | ✓ | ✓ | — (v2+) |
| Product comparison | — | ◐ | ◐ | — | ◐ | ✓ | v1.x (P2) |
| Application / industry hub | ◐ | ✓ | ✓ | ✓ (exemplary) | ✓ | ✓ | ✓ (5–8 industries at launch) |
| Selection-guide articles | ◐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (5–10 at launch) |
| Approvals-based filtering | — | ✓ | ✓ | ✓ | ✓ | ✓ | v1.x (P2) |
| Manufacturer / brand attribution | ◐ (distributor) | N/A (single brand) | N/A | N/A | N/A | N/A | ✓ (distributor model) |
| Per-product inquiry / RFQ | — | ✓ | ✓ | ✓ | ✓ | ✓ | — (single form, v2+ for RFQ) |
| Shopping cart / e-commerce | — | — | ◐ (logged-in) | — | — | ✓ | — (anti-feature) |
| Live chat widget | — | ◐ | ◐ | ◐ | — | ◐ | — (anti-feature) |
| User accounts | — | ✓ (for tools) | ✓ (for tools) | ✓ | ✓ | ✓ | — (v2+) |
| Pricing visible | — | — | — | — | — | ✓ (some locales) | — (anti-feature) |
| Stock / lead-time visible | — | — | — | — | — | ✓ (some locales) | — (anti-feature) |

**Read:** Manometr's v1 target matches fiztech's architecture while adding the trilingual depth, hreflang correctness, structured application content, and approvals data that the premium tier does. It deliberately defers configurator, CAD, finder-wizard, and accounts — the four areas where the premium tier has capacity we don't.

---

## Implementation Notes Per Feature Cluster

### Spec Table Patterns (the core UX)

**Density reference:** fiztech.ru; baseline for Manometr.
- Two-column label/value layout
- Grouped into labeled sections (e.g., "Measuring range", "Process connection", "Housing", "Electrical", "Environmental", "Approvals")
- Units always rendered next to value, localized
- Numeric ranges as "0 … 10 bar" not "0-10 bar" (EU convention; Russian catalogs match)
- Tolerance/accuracy notation: "±0.5 %" (proper Unicode `±`)
- Links in values when applicable (e.g., "ATEX II 2G Ex ia" → approval detail modal or PDF)

**Mobile pattern:** Collapse to card stack per section; preserve label/value pairing; never horizontal-scroll the whole table.

**Admin authoring:** Per category, admin defines spec fields with type (text, number+unit, enum with options, range, boolean), translation-applies-to-label, ordering, and group. Per-product, fill typed fields + add free-form extras.

### Download-Center Patterns

Most reference sites use a **tabbed downloads block** on the product page:
- **Datasheet** (primary; PDF; per-locale)
- **Certificates** (ATEX, IECEx, 3-A, EAC, etc.; PDF)
- **Manuals / operating instructions** (PDF, per-locale)
- **Declarations of conformity** (PDF)
- **CAD / 3D models** (STEP, DWG) — premium tier
- **Software / drivers** (if applicable)

**v1 recommendation:** Three categories — Datasheets, Certificates, Manuals. Flat list with icon + filename + locale indicator + size. All Cloudinary-served. Track download counts for analytics in v1.x.

### Taxonomy Patterns For Industrial Instrumentation

Three common patterns across reference sites:

1. **By measurement type** (fiztech, VEGA): Pressure → Gauge, Transmitter, Switch, Diaphragm seal → variants
2. **By product family / series** (WIKA): PGS23 series → variants
3. **By application / industry** (Endress, Emerson): Industry → Application → Measurement → Product

**Recommendation for Manometr:** Hybrid of #1 and #2 for catalog IA (measurement type as primary tree, family/series as second level, variants as leaves), with #3 overlaid via application/industry hub pages that cross-link. This matches the hybrid spec schema philosophy.

### Search UX Patterns

**Best-in-class (VEGA, ifm):**
- Autocomplete shows three zones: products (with image + key spec), categories, content pages (recipes/applications)
- Part-number exact match short-circuits to product detail
- Spec-predicate parsing: typing "10 bar" scopes results to products with a range covering 10 bar — stretch goal
- Misspelling tolerance via trigram similarity
- Per-locale tokenization (Russian morphology is not trivial; Postgres `russian` config handles stemming)

**v1 target:** Postgres `tsvector` + `pg_trgm` with per-locale configs. Autocomplete with the three-zone pattern. Part-number exact-match. Spec-predicate parsing is v2+.

### Contact Patterns For Non-Transactional B2B

Three archetypes:
1. **Single site-wide form** (fiztech, many distributors) — lowest friction for operator, captures all inquiry types into one queue
2. **Per-product inquiry buttons** (premium manufacturers) — more structured, higher-intent signal, but requires structured RFQ backend
3. **Hybrid: global form + per-product "request datasheet" CTA** (some premium) — best of both, minimal structure

**v1:** Pattern 1 (per PROJECT.md). Include `source_page` hidden field so admins see which product/category/article the user was on.

**v1.x candidate:** Lightweight Pattern 3 — product list + detail pages carry "add to datasheet request" checkboxes, compose a single contact submission with list of selected products. No per-product flow, preserves single-form simplicity.

### Multilingual UX Patterns

**Premium-tier patterns:**
- Locale picker in header with language + country flag
- URL reflects locale (`/en-us/`, `/ru-ru/`, `/uz/`)
- Hreflang on every page (links to every translated variant + `x-default`)
- Language-aware search
- Gracefully fall back when content is untranslated — show source-language with subtle "Translation pending" badge (better than hiding)
- Per-locale sitemaps
- Locale sticky across session via cookie, not overriding explicit URL choice

**v1:** All of the above, simplified to 3 locales. `x-default` → Russian (primary CIS traffic).

---

## Risks and Gaps

**Content operations risk (HIGH):** Trilingual content discipline is the biggest operational risk, not a technical one. If the content team cannot keep UZ translations current, the UX decision to show source-language fallback matters more than the feature list. Invest in admin UX quality.

**Approvals data consistency (MEDIUM):** Approvals-based filtering only works if approvals are entered typed, not as free-text. This is a schema decision the roadmap must enforce at category-schema design time, or v1.x filter never materializes.

**Search relevance tuning (MEDIUM):** Postgres full-text is adequate at 100–500 products; by 2000+ products, relevance tuning (weighted `tsvector`, phrase boosts, synonym dictionaries per locale) may be needed. Not a v1 blocker, but a v1.x flag.

**Mobile spec-table UX (MEDIUM):** The hard design problem. Reference sites handle it inconsistently. Budget design iteration, not just dev time.

**PDF multilingual pipeline (MEDIUM):** Datasheet PDFs typically come from manufacturers in one language (usually English or German/Russian). Committing to per-locale PDFs may mean Manometr produces its own localized datasheets — big content-ops commitment. Alternative: show the source-language PDF with a clear "Available in: EN" indicator. Decide explicitly.

---

## Sources

Reference sites surveyed (from prior knowledge — confidence MEDIUM; verify against live sites before locking UX specs):

- fiztech.ru — the IA reference per PROJECT.md
- wika.com — premium manufacturer, product-finder, approvals emphasis
- endress.com — premium manufacturer, Applicator sizing tool, industry hubs
- emerson.com / rosemount.com — solution-led IA, whitepaper depth
- vega.com — best-in-class product-finder wizard, clean IA
- ifm.com — product-family + variant matrix, compare-table feature
- krohne.com — application content and handbook PDFs
- siemens.com/process-instrumentation — Industry Mall configurator
- baumer.com — clean spec-density, good filter UX

PROJECT.md (Manometr project context) — authoritative scope source for v1 boundaries (no cart, single contact form, UZ Latin only, 2–5 admin invitees, 100–500 products year one).

---

*Feature research for: B2B industrial pressure-measurement catalog platform*
*Researched: 2026-04-21*
*Confidence: MEDIUM (reference-site patterns grounded in prior knowledge; external verification blocked during research pass — live-site spot-checks recommended before locking UX specs)*
