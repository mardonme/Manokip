# Phase 3: Public Rendering, Search, SEO - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 03-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 03-public-rendering-search-seo
**Areas discussed:** Visual direction lock, Search UX & locale fallback, Product JSON-LD shape, Manufacturer page shape

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Visual direction lock | Sketches 001/002/003 winners + theme baseline + compare-feature scope | ✓ |
| Search UX & locale fallback | SRCH-01..05 details (cascade order, autocomplete content, part-number short-circuit) | ✓ |
| Product JSON-LD shape | CAT-08, SEO-04 — `offers` field for non-commercial catalog | ✓ |
| Manufacturer page shape | MFG-01, MFG-02 + the schema-missing "Verified" flag | ✓ |
| Cache + ISR strategy | (originally proposed; folded into Claude's Discretion before asking — Next 16 conventions + Phase-2 helpers cover most of it) | — |

**User selected all 4 areas.**

---

## Visual direction lock

### Q1: Product detail layout

| Option | Description | Selected |
|--------|-------------|----------|
| 003 premium-SaaS finish | Polished 2-column with sticky CTA rail, slate/blue palette, frosted-glass header, 6-tile key-facts strip, sticky CTA card with bullets + downloads + technical-specialist card | ✓ |
| 001-A dense single column | Maximum fiztech-grade density, gallery left, all spec groups flowing right, CTA below gallery | |
| 001-B two-col sticky CTA | Same shape as 003 but with the simpler default theme — less SaaS-polish, more conservative | |
| 001-C hero + tabbed spec groups | Hero with 6 key-fact tiles + CTAs above the fold; specs split across 6 tabs | |

**Notes:** The user explicitly asked for the premium-SaaS mockup earlier in the session ("Create a clean, modern HTML mockup ... premium SaaS-style UI"); sketch 003 was built specifically to that brief. Locking it as the implementation target. Sketch 001 variants A/B/C are preserved in the sketches directory as historical artifacts but not selected.

### Q2: Catalog/listing layout

| Option | Description | Selected |
|--------|-------------|----------|
| 002-A left sidebar filters, 3-col grid | Persistent left rail, collapsible filter groups, active-filter pills above grid, dense, mobile collapses to a drawer | ✓ |
| 002-B top filter bar with active pills, 4-col grid | Compressed top filter row with badge counts; full-width grid; less filter discoverability | |
| 002-C sidebar + sticky compare tray | Sidebar + 3-col grid + persistent dark bottom tray for compare (compare itself is NOT in v1 reqs) | |

### Q3: Compare-products scope

| Option | Description | Selected |
|--------|-------------|----------|
| Move to backlog | NOT in CAT-01..08; ~2–3 plans of scope expansion if added; clean as v1.1 backlog | ✓ |
| Add to Phase 3 scope (scope expansion) | Would propose CAT-09 + estimate additional plans | |
| Drop entirely | Don't ship and don't backlog; remove sketch-002-C from MANIFEST | |

---

## Search UX & locale fallback (SRCH-01..05)

### Q4: Locale fallback chain

| Option | Description | Selected |
|--------|-------------|----------|
| Cascade uz → ru → en, show only fallback (after current-locale 0 hits) | Single-locale display with banner "Показаны результаты на русском — нет совпадений на узбекском"; uz first as fallback root | ✓ |
| Always search all 3 locales, mix and label | Run tsvector against all 3 locales every query, merge + label per result | |
| Cascade current → ru → en → uz | Russian as fallback root because Russian content is most likely longest in CIS B2B | |

### Q5: Autocomplete content

| Option | Description | Selected |
|--------|-------------|----------|
| Products + part numbers only | Product-name prefix + exact part-number matches highlighted; manufacturer + category as breadcrumb chips on each suggestion | ✓ |
| Products + part numbers + manufacturers + categories | Sectioned dropdown across 4 entity types | |
| Products only, no part-number short-circuit in autocomplete | Just product-name prefix matches | |

### Q6: Exact part-number short-circuit

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-redirect to detail page | 302-redirect on case-insensitive trimmed sku match | ✓ |
| Pin as #1 result with 'Match' badge | Don't redirect; show as first result with Exact-match badge | |
| Both: redirect + 'See all results for X' back-link on detail page | 302 + injected back-link in detail page header | |

---

## Product JSON-LD shape (CAT-08, SEO-04)

### Q7: Product `offers` field

| Option | Description | Selected |
|--------|-------------|----------|
| Omit `offers` entirely | Lose Google rich-results product-snippet eligibility but stay factually accurate | ✓ |
| Offer with `availability: PreOrder` + no price | Marginal rich-results chance; risk of Google validator rejection | |
| Offer with `priceSpecification.priceType: 'Inquire'` | Most explicit "contact for price"; uneven acceptance | |
| Add aggregateRating | Explicitly NOT picked — fabricating ratings is grounds for manual penalty | |

### Q8: Phase-3 JSON-LD types

| Option | Description | Selected |
|--------|-------------|----------|
| Organization on every page | Single Organization in root layout; required for branded knowledge-panel | ✓ |
| BreadcrumbList on every nav-aware page | (Mandatory per CAT-08 wording; reflected back to user during the question) | (✓ mandatory) |
| CollectionPage on category listing pages | (Mandatory per CAT-08 wording; reflected back to user during the question) | (✓ mandatory) |
| ImageObject for the product hero | Optional, low-impact; deferred | |

**Notes:** User selected only Organization. CAT-08 in REQUIREMENTS.md explicitly lists "category JSON-LD" and "breadcrumb JSON-LD" as requirements, so BreadcrumbList + CollectionPage are not optional — reflected this back to the user inline and locked the full set as Product + Organization + BreadcrumbList + CollectionPage. ImageObject deferred to backlog.

---

## Manufacturer page shape (MFG-01, MFG-02)

### Q9: Manufacturer page shape

| Option | Description | Selected |
|--------|-------------|----------|
| Per-manufacturer SEO landing page (+ index) | `/[locale]/manufacturers/<slug>` with logo + bio + product list per manufacturer; index `/manufacturers` shows all as cards. Best for SEO branded queries. | ✓ |
| Single grid page + filter on listing | `/manufacturers` grid; clicking a manufacturer card filters the existing product listing page | |
| Both: index + landing pages, but no per-manufacturer products list | Compromise: per-manufacturer landing page is just logo + bio + link to filtered listing | |

### Q10: "Verified" badge — schema-missing column

| Option | Description | Selected |
|--------|-------------|----------|
| Add `manufacturer.is_official_rep` BOOLEAN + per-locale `relationship_note` TEXT | Phase-3 additive migration; admin UI extension in existing manufacturer-edit page from Phase 2; renders Verified badge + locale-specific representative-status paragraph | ✓ |
| Drop the visual entirely from sketch 003 | Don't add the field; remove Verified pill from public renders | |
| Add `is_official_rep` only, no per-locale relationship note | Boolean flag with hardcoded 3-locale labels | |

---

## Claude's Discretion

The following were discussed and intentionally left to the planner/researcher:

- Cache + ISR strategy (default Next 16 ISR with `cacheLife('max')` + Phase-2 revalidate helpers)
- Sitemap segmentation (per-locale + sitemapindex)
- 404 vs locale-fallback at the route handler level
- Filter-empty-state localized copy
- LCP image strategy (`<CldImage>` with responsive `sizes` + `priority` on hero)
- Typeface choice (Inter is the default; researcher may evaluate Golos Text or IBM Plex)
- Exact SQL shape for autocomplete

---

## Deferred Ideas

- Compare-products feature → v1.1 backlog
- `product.stock_status` column for the "В наличии" pill → planner decides; default drop visual if not surfaced
- `ImageObject` JSON-LD → backlog
- `AggregateRating` JSON-LD → permanently rejected (no ratings system)
- Pure-SSR vs ISR for search-results page → planner's call
- Cross-locale slug uniqueness behavior with hreflang → planner verifies
