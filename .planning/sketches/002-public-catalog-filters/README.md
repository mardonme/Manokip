---
sketch: 002
name: public-catalog-filters
question: "How should the typed-spec faceted filters interact with the product grid?"
winner: "A"
tags: [public, catalog, filters, phase-3]
---

# Sketch 002: Public Catalog with Faceted Filters

## Design Question

Phase 3 requirements CAT-04 + CAT-05 demand that visitors filter products on a category page using the category's typed spec schema (number ranges, enums, booleans), with filter state mirrored to the URL via nuqs. fiztech-density is the bar.

How should the filter UI relate to the product grid — sidebar, top bar, or sidebar + comparison workflow — given that engineers often arrive looking for "a manometer in this exact range with this resolution"?

## How to View

```
open .planning/sketches/002-public-catalog-filters/index.html
```

Same toolbar as 001 — `default` vs `dense` theme toggle, viewport sizes.

## Variants

- **A: Left sidebar filters, 3-column product grid** — Persistent left rail with collapsible filter groups (numeric range with dual inputs + slider, checkbox enums with counts, bool toggles, manufacturer enum with "+ ещё 7" overflow). Active filters shown as removable pills above the grid. The standard e-commerce pattern, adapted for engineering specs.
- **B: Top filter bar with active pills, full-width 4-col grid** — Compressed top filter row with active filters showing inline values as badges (`Диапазон 0–600`). "+ Все фильтры (15)" trigger opens a dialog with the long tail. Active-pills row sits between the bar and the grid. More space for products but less filter discoverability.
- **C: Sidebar + sticky compare tray** — Left sidebar (slimmed) + 3-col grid + a persistent dark tray pinned to the bottom of the viewport showing 4 compare slots. Each card has a "Сравнить" toggle. The "Сравнить (2)" button leads to a compare page. Engineer-focused: this is how technical buyers actually shop.

## What to Look For

- **Filter discoverability:** Variant B's compressed bar shows fewer filter dimensions at once but feels more modern. Variant A's sidebar is denser but hides all filters on mobile (collapses to a button).
- **Numeric range UX:** All three use the same dual-input + slider — does it feel right at this density, or is it too small?
- **Active-state legibility:** Compare how active filters read in the sidebar (highlighted checkbox + pills above grid) vs the top bar (badge counts in the trigger button).
- **Grid density:** A's 3-col with sidebar shows 3 products per row at 1280px. B's 4-col full-width shows 4. Density vs filter discoverability tradeoff.
- **Compare workflow (C only):** Is the persistent bottom tray helpful or noisy? Does it solve a real engineer-buyer need (≤2 weeks ago, fiztech.ru added a similar feature)?
- **Mobile (use phone button):** Sidebar collapses, top bar wraps. Compare tray probably needs a separate mobile pattern.

## Notes for Phase 3 Planning

- Filter shape (numeric vs enum vs bool) must come from the `spec_field` catalog (Phase 1 schema). The UI here is the rendering of that catalog, not hand-coded.
- Filter counts (`142` next to `1.6`) come from a server-side aggregate — they update on every URL change. Cache strategy: tag-invalidated per category.
- "Сравнение" (variant C) is currently NOT a v1 requirement — it's not in CAT-01..CAT-08. If the user picks C, we add a backlog entry rather than scope-creep Phase 3.
- "+ Все фильтры (15)" overflow dialog implies the spec-field catalog can grow large per category. Spec-field group ordering (`spec_field_group.sort_order` from 02-01) would drive the dialog's visual hierarchy.
- The "В наличии" toggle implies an availability flag on `product` — not currently in the schema. Either drop it from the design or add it as a future migration. (Rendering it as a filter in UX before the data model supports it is a Pitfall #5 candidate.)
