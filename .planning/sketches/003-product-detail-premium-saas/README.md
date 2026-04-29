---
sketch: 003
name: product-detail-premium-saas
question: "What does a polished, premium-SaaS rendering of the WIKA 213.53 product page look like with the 2-column + sticky-CTA layout?"
winner: "★ Phase-3 implementation target"
tags: [public, product-detail, premium, mockup, phase-3]
---

# Sketch 003: Product Detail — Premium SaaS Mockup

## Design Question

Visual fidelity round. Sketches 001 and 002 explored layout questions (single-col vs two-col vs tabbed; sidebar vs top-bar filters). This mockup answers a different question: at the visual-finish level Manometr aspires to (premium SaaS — Linear / Stripe / Vercel polish, but applied to industrial equipment), what does the 2-column + sticky-CTA pattern actually look like?

Single variant only — no A/B exploration. Visual design only, no functional behavior.

## How to View

```
open .planning/sketches/003-product-detail-premium-saas/index.html
```

Standalone HTML — does NOT link to `../themes/default.css`. Inter is loaded from Google Fonts. Best at desktop ≥1100px (sticky right rail collapses to a stacked card below 1100px).

## Visual Direction

**Palette.** Slate base (`#0f172a` text on `#f8fafc` bg) with a deep blue primary `#1e40af` and an indigo→sky gradient for the brand mark. Indigo and emerald reserved for status (in-stock, verified). No red except in danger states and the WIKA manufacturer logo.

**Typography.** Inter 400/500/600/700 with cv11+ss01 OpenType features and tabular numerics throughout. H1 at 32px / -0.02em, body at 15px, spec keys at 14px muted. JetBrains Mono for part numbers.

**Surfaces.** White cards on light bg, subtle 1px borders preferred over shadows. Soft layered shadows (`0 1px 3px / 0 4px 12px`) only on the CTA card and on hover lifts. Sticky header uses `backdrop-filter: blur` for the frosted-glass look common in modern SaaS.

**Microdetails.**
- `⌘K` keyboard hint in the search bar
- "Скопировать" pill on the part number
- Subtle gradient on the gallery background
- Hand-drawn SVG manometer face with WIKA branding rendered inline (not a placeholder)
- "Verified" pill on the manufacturer card with a shield icon
- Shadow on the primary CTA tinted with the primary color (not gray)
- Frosted-glass header

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Promo strip (auth distributor + GOST + phone)                   │
├─────────────────────────────────────────────────────────────────┤
│  [Logo]  [Nav]                          [⌘K Search] [UZ|RU|EN]   │  ← sticky
├─────────────────────────────────────────────────────────────────┤
│  Главная › Каталог › Манометры › 213.53                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐ ┌──────────────────────┐│
│  │  GALLERY      │  EYEBROW            │ │ Sticky CTA card       ││
│  │  (gauge SVG)  │  H1 product name    │ │ - "Получите КП за 1 д"││
│  │  [thumbs]     │  Part nos. + copy   │ │ - bullets (4)         ││
│  │               │  Summary            │ │ - Запросить цену [→]  ││
│  │               │  Pills              │ │ - Подобрать аналог    ││
│  │               │  Key facts (2×3)    │ │ - Тех. специалист     ││
│  └────────────────────────────────────┘ │ - Phone + Email       ││
│  ┌─ Spec ribbon (4 cols) ──────────────┐ │ - Trust strip         ││
│  └────────────────────────────────────┘ │                       ││
│  ── Общие характеристики ────────────────│ ┌─ Документация ─────┐││
│  ── Присоединение и материалы ───────────│ │ PDF · PDF · DWG    │││
│  ── Условия эксплуатации ────────────────│ └────────────────────┘││
│  ── Производитель (verified card) ───────│ ┌─ Help-card (dark) ─┐││
│  ── Где применяется (3 cards) ───────────│ │ Алишер Каримов     │││
│                                          │ │ [Чат]              │││
│                                          │ └────────────────────┘││
│                                          └──────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  Footer (5-col: brand, каталог, производители, применения, …)    │
└─────────────────────────────────────────────────────────────────┘
```

## Notes for Phase 3 Implementation

- Header `backdrop-filter: blur(14px)` is well-supported but degrades gracefully — Safari needs `-webkit-backdrop-filter` (already included).
- The gallery SVG is a hand-rendered placeholder; the real implementation uses `<CldImage>` (Cloudinary, signed direct uploads — D-12). Aspect ratio 4/3 is preserved.
- "В наличии в Ташкенте" pill is rendered visually but the data model has no stock flag yet. If we keep this pill in v1, a `product.stock_status` column needs to land — otherwise demote to a copy-only marketing line in the promo strip.
- "Верифицированный производитель" pill needs a `manufacturer.verified` flag — not in the schema today. Same call as above: drop it or add the field.
- The "Технический специалист" card (dark, with avatar + chat button) is NOT a v1 feature (CTA-01 is one global contact form). Either dim it to a static "связаться с нами" link or document it as a Phase-5 backlog idea.
- `⌘K` search expects a keyboard shortcut; Phase 3 SRCH-03 requires autocomplete-as-you-type — these align naturally.
- The footer's "Применения" / "Производители" / "Каталог" columns assume Phase-3 nav exists; the structure is a useful placeholder for Phase-3 sitemap discussions.
