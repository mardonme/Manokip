# Sketch Manifest

## Design Direction

**Industrial-engineering-clean.** Restrained navy-and-neutral palette (deep navy primary `#0e3a6f`, charcoal `#131a23` text on near-white `#f6f7f8` surfaces, no accent color larger than a status pill). Inter at small sizes for fiztech-grade information density, JetBrains Mono for part numbers. Tight spacing scale (4 / 8 / 12 / 16 / 24px primary stops), conservative 6px radii, subtle 1px borders preferred over shadows. Tabular numerics throughout because every spec table has aligned values.

Two themes, identical structure: `default` (comfortable density) and `dense` (fiztech-grade — 11–12px body, tighter line-height) — toggleable in the sketch toolbar so the user can A/B feel the same layout at two densities.

## Reference Points

- **fiztech.ru** — explicit project inspiration; emulate information density and category-driven taxonomy, NOT the visual style verbatim (see CLAUDE.md).
- **WIKA / Endress+Hauser product pages** — German industrial-instrument catalogs that engineers already trust. Conservative typography, dense spec tables, manufacturer-first attribution.

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | public-product-detail | How should the spec-dense product page balance visual hierarchy with engineer-grade information density? | _pending_ | public, product-detail, phase-3 |
| 002 | public-catalog-filters | How should the typed-spec faceted filters interact with the product grid? | _pending_ | public, catalog, filters, phase-3 |
| 003 | product-detail-premium-saas | Premium-SaaS visual finish for the 2-column + sticky-CTA pattern (single mockup, no variants). | _baseline_ | public, product-detail, premium, mockup, phase-3 |

## Open Questions / Backlog Hints

- Does **variant C of sketch 002** (sticky compare tray) deserve a backlog entry? Compare-products is NOT in v1 requirements (CAT-01..CAT-08) but technical buyers expect it.
- The "В наличии в Ташкенте" pill/filter implies an availability/stock flag on `product` — not currently in the schema. Drop from UX or add as future migration; do NOT render filter UX before data model supports it.
- Locale switcher rendered as 3-button group (UZ/RU/EN) in all sketches — confirm this pattern survives the navigation pages too, or do we need a dropdown for vertical headers?
- Manufacturer card on product detail shows "официальный представитель в Узбекистане" line — needs a content-team-managed `manufacturer.relationship` field, not a hardcoded label.
