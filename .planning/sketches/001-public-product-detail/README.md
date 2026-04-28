---
sketch: 001
name: public-product-detail
question: "How should the spec-dense product page balance visual hierarchy with engineer-grade information density?"
winner: null
tags: [public, product-detail, phase-3]
---

# Sketch 001: Public Product Detail

## Design Question

The product page is the linchpin of the project — every product page must answer every technical question a specifying engineer would ask, in their language, so they trust Manometr enough to contact via the single CTA.

How should we balance visual hierarchy (so the page feels modern and trustworthy) with the high information density that engineers expect from category leaders like fiztech.ru?

## How to View

```
open .planning/sketches/001-public-product-detail/index.html
```

Use the toolbar (bottom-right) to swap between `default` and `dense` themes — the dense theme tightens spacing and shrinks body type to fiztech-grade compactness, applied to whichever variant you're viewing.

## Variants

- **A: Dense single column** — Hero gallery left, all spec groups flowing in a single column on the right (Общие → Присоединение → Условия → Дополнительно → Производитель → Документация → Где применяется). fiztech-style: minimal chrome, maximum scannability, mobile-friendly. CTA is below the gallery.
- **B: Two-column with sticky CTA + key-facts rail** — Image + key-facts strip top-left (диапазон / точность / корпус / защита as four numeric tiles), specs flowing below; the right column is a sticky CTA card with "Запросить цену", contact details, document downloads, and manufacturer attribution. Engineer can request a quote from any scroll position.
- **C: Hero + tabbed spec groups** — Larger hero with image + name + 6 key-fact tiles + CTAs visible above the fold. Specs are split across six tabs (Обзор / Давление и точность / Материалы и присоединение / Условия эксплуатации / Документация / Применения и рецепты). Cleaner first impression but adds a click before the engineer sees full materials data.

## What to Look For

- **Density vs. legibility:** Does variant A feel right or oppressive? Does variant C feel right or hide the meat?
- **CTA placement:** A puts "Запросить цену" below the gallery (engineer must commit to scrolling first). B keeps it sticky (always one click away). C puts it above the fold but compresses other info.
- **Trust signals:** Stock pill, certification badge, manufacturer card — where do they read most credibly?
- **SEO surface:** All variants emit the same content for crawlers. C hides 5/6 spec groups in non-default tab panels — that's still server-rendered HTML but visually less indexable above the fold.
- **Mobile (use phone button in toolbar):** A collapses gracefully, B's sticky rail becomes a stacked card, C's tabs scroll horizontally.

## Notes for Phase 3 Planning

- Locale switcher is shown in all variants — confirm 3-button design (UZ/RU/EN) survives the trip to the catalog/search pages.
- Manufacturer card's "официальный представитель" line is a content-team-managed manufacturer.description field, not a hardcoded badge.
- "Где применяется" cards (recipes + industries) are Phase 4 cross-link content; the section is a hard requirement for CAT-06 but the rendering can be a stub in Phase 3 if Phase 4 lands later.
- Spec group ordering ("Общие → Присоединение → Условия → Дополнительно") should be controlled by `spec_field_group.sort_order` (lands in 02-01), not hardcoded in the UI.
