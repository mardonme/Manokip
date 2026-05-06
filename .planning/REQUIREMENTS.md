# Requirements: Manometr — v1.1 Visual Refresh

**Defined:** 2026-05-06
**Core Value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.

## Milestone Overview

v1.1 rebuilds the **public surface** to match the design canvas in `idea/` while preserving every v1.0 backend contract. Backend code (Server Actions, schema, auth, audit, contact form pipeline, search index) is **out of scope for this milestone** unless explicitly named.

**Scope shape (visual refresh only):**
- Public site chrome (`SiteHeader`, `SiteFooter`, navigation primitives)
- 7 page templates: home, catalog (PLP), product detail (PDP), recipe detail, industry detail, contact, about — plus 3 NEW pages (solutions/industries landing, service & calibration, manufacturer index visual upgrade)
- Reusable visual components: `Gauge` SVG, `ProductCard`, `KeyFactsRibbon`
- Design tokens (Tailwind v4 theme) mapped from `idea/styles.css`
- Visual regression tests (Playwright snapshots)
- Carry-forward source refactor (proxy.ts move + env/layout/contact-form polish stashed at v1.0 close)

**Locked guardrails carried from v1.0:**
- Trilingual content model untouched (sibling `*_translations` tables)
- Single contact-form CTA (no per-product inquiry forms, no e-commerce affordances)
- All design canvas commerce affordances (price / stock / quantity stepper / "Add to order") **stripped** and replaced with Request-quote CTA wired to existing Phase 5 contact dialog
- Admin panel out of scope (Phase 2 surface stays as-is)
- Search backend out of scope (Phase 3 search stays as-is; only PLP visual treatment of search results changes)

**Pending decisions before phase planning freezes** (see `STATE.md ## Next Steps`):
- Brand wordmark (Manokip vs Manometr — design canvas vs project context)
- Real contact metadata (address, phone, email)
- Industry taxonomy reconciliation against Phase 4 admin data

## v1.1 Requirements

### Design System (DESIGN)

- [ ] **DESIGN-01**: Tailwind v4 theme exposes the design canvas tokens — colors (`--bg #f5f3ee`, `--ink #14161b`, `--accent #1240e5`, plus the 4 line/surface variants), typography (Inter Tight + JetBrains Mono with Russian Cyrillic + Uzbek-Latin subsets), and spacing scale matching `idea/styles.css`
- [ ] **DESIGN-02**: Visitor sees `next/font` loading Inter Tight (4 weights: 400/500/600/700) and JetBrains Mono (2 weights: 400/500) with `subsets: ['latin', 'latin-ext', 'cyrillic']` — no FOIT, no fallback rendering of Uzbek-Latin `oʻ`/`gʻ` (U+02BB) or Cyrillic glyphs
- [ ] **DESIGN-03**: Every public page applies the global `mk` design class (or its Tailwind equivalent) so design tokens cascade consistently across all 7 page templates
- [ ] **DESIGN-04**: Reusable `<Gauge>` SVG component renders the design canvas gauge (configurable size, value, max, unit, label, danger threshold) and is consumed by home hero + product detail pages

### Site Chrome (CHROME)

- [ ] **CHROME-01**: Visitor sees a redesigned `SiteHeader` with a top utility ribbon (locations, country count, phone, locale switcher labels) and a main bar (brand mark + 5-item nav + search button + Sign-in link + Request-quote primary CTA)
- [ ] **CHROME-02**: Active nav item is visually distinguished from inactive items (per design — bold weight + 2px accent underline)
- [ ] **CHROME-03**: Sign-in header link routes to `/[locale]/login` (admin sign-in already shipped Phase 1) and is unobtrusive (per design — body text size, no button styling)
- [ ] **CHROME-04**: Request-quote primary CTA opens the existing Phase 5 `<ContactButton>` dialog with the current page captured as `sourcePage`
- [ ] **CHROME-05**: Search button in header is a placeholder routing to `/[locale]/search` (visual upgrade only — search backend Phase 3 untouched); display includes the `⌘K` shortcut hint
- [ ] **CHROME-06**: Locale switcher uses the visual treatment from design (text-only RU · EN · UZ list in utility ribbon) while preserving the Phase 3 LocaleSwitcher behavior (per-locale slug-aware navigation)
- [ ] **CHROME-07**: Visitor sees a redesigned `SiteFooter` with 4 navigation columns (Catalog / Solutions / Service / Company), brand block (logo + tagline paragraph + cert tags ISO 9001 / GOST R / EAC / O'zStandart), and a mono-font meta line (copyright + city + last-updated date)
- [ ] **CHROME-08**: Footer is visible on every public page (home, catalog, product, recipe, industry, contact, about, manufacturer pages)

### Home Page (HOME)

- [ ] **HOME-01**: Visitor lands on `/[locale]` and sees the redesigned home with: hero (eyebrow tag + h1 lockup + lede paragraph + 2 CTAs + 4-stat strip + ticker)
- [ ] **HOME-02**: Hero gauge renders via the reusable `<Gauge>` component with technical-callout annotations (per design: "STAINLESS Ø100mm", "4–20 mA · HART")
- [ ] **HOME-03**: Categories strip presents 12 product families in a 4-column grid with hairline borders, count badges, and per-row Browse arrow
- [ ] **HOME-04**: Featured-products band renders 4 products via the redesigned `<ProductCard>` and a row of category-filter pills (All / Gauges / Transducers / Level / Relays)
- [ ] **HOME-05**: Solutions band uses the dark `#14161b` background, 2-col grid of 4 industry tiles with anchor-client labels (e.g., "↳ JPETROL · UZBEKNEFTEGAZ"), and an "All solutions" CTA
- [ ] **HOME-06**: Service strip presents calibration / service positioning with 3 trust facts (turnaround, uncertainty, units verified per year) and a Request-quote CTA — **no e-commerce framing**

### Catalog (PLP)

- [ ] **PLP-01**: Visitor lands on `/[locale]/categories/<slug>` and sees the redesigned catalog with: breadcrumb + h1 + lede + product/subcategory counts (right-aligned, mono)
- [ ] **PLP-02**: Top filter bar shows the 5 most-used filter chips (Diameter / Accuracy class / Connection / Protection / Material) with summary values inline, plus an "All filters · N" overflow button
- [ ] **PLP-03**: 260px subcategory sidebar lists subcategory names + counts; active subcategory has dark fill + white text per design
- [ ] **PLP-04**: Sidebar pressure-range slider visualizes a 2-handle range with mono labels and live blue-fill between handles (per design)
- [ ] **PLP-05**: Sidebar certifications checkboxes render the 5 standards (GOST R / EAC / ATEX / O'zStandart / CE) with custom checkbox styling (filled blue when active)
- [ ] **PLP-06**: Active filter chips render above the product grid as solid-dark removable pills + a "Clear all" link
- [ ] **PLP-07**: Sort + view-mode toolbar shows "Sort: Most popular ▾" + grid/list view toggle (grid active by default per design)
- [ ] **PLP-08**: Product grid renders 3 columns of redesigned `<ProductCard>` with consistent gap (no commerce affordances on cards — see PDP-08)
- [ ] **PLP-09**: Pagination row shows "Showing 1—N of M" mono label + numbered page chips matching design
- [ ] **PLP-10**: Faceted filter URL state from Phase 3 (nuqs) is preserved untouched — the visual upgrade re-skins existing controls only

### Product Detail (PDP) — non-commerce reframing

- [ ] **PDP-01**: Visitor on `/[locale]/products/<slug>` sees redesigned 2-column layout (gallery 1fr / details 1fr, 56px gap)
- [ ] **PDP-02**: Gallery shows the design's full-bleed gauge area with corner SKU + status tag overlay; product images via `<CldImage>` with priority hint and responsive `sizes` (Phase 3 Cloudinary integration preserved)
- [ ] **PDP-03**: Below-gallery thumbnail row (4 thumbs at 80px height, active outlined with 1.5px accent border)
- [ ] **PDP-04**: Details column shows category eyebrow + GOST reference + h1 model + lede description
- [ ] **PDP-05**: **Stripped:** no price card, no volume-discount line, no stock count, no quantity stepper. Replaced by a single "Request quote" primary CTA that opens the existing Phase 5 `<ContactButton>` dialog with `productContext = '<name> (<sku>)'` pre-fill
- [ ] **PDP-06**: Spec-selector rows (Range / Connection / Mount) render as the design's pill-tag groups but are **display-only** — they reflect what's available in the spec catalog for this product, not configurator state. Active value visually distinguished from siblings
- [ ] **PDP-07**: Trust line below the CTA shows "✓ 24-month warranty / ✓ Calibration certificate included" — no "Free shipping" or other commerce trust copy
- [ ] **PDP-08**: Tabs row (Specifications / Documentation / Calibration / Compatibility / Reviews · N) replaces Phase 3's flat spec table; first tab default-active showing the existing fiztech-density grouped spec table
- [ ] **PDP-09**: Related products row presents 4 cross-linked products via redesigned `<ProductCard>` (Phase 4 "Often paired with" relationship preserved); v1.1 takes care of visual treatment only
- [ ] **PDP-10**: Phase 4 "Used in" widget renders below related products with the existing cross-link cap (≤ 6 references per type)
- [ ] **PDP-11**: All Phase 3 JSON-LD (Product / BreadcrumbList) preserved verbatim; visual changes do not affect emitted structured data

### Reusable Components (REUSE)

- [ ] **REUSE-01**: `<ProductCard>` matches the design canvas: image area (1:1 aspect, hairline border, mono SKU overlay), title, category eyebrow, key spec metadata, single Request-info / Browse arrow link — **no price, no add-to-cart, no quantity stepper**
- [ ] **REUSE-02**: `<KeyFactsRibbon>` reusable across home (4 stats) + product detail (4 facts) + service page (3 trust facts), driven by a `[label, value]` array prop
- [ ] **REUSE-03**: All redesigned components live under `src/components/public/v1-1/` (or replace existing `src/components/public/*` after a clear migration boundary chosen during phase planning)

### New Static Pages (PAGE)

- [ ] **PAGE-01**: Visitor lands on `/[locale]/solutions` (NEW) and sees the 6-industry grid landing with eyebrow + h1 + lede + 2-col tile grid (each tile: number + tags + title + description + Recommended-instruments link)
- [ ] **PAGE-02**: Solutions landing tiles deep-link into the existing per-industry pages from Phase 4 (taxonomy reconciliation handled in phase planning)
- [ ] **PAGE-03**: Visitor lands on `/[locale]/service` (NEW) and sees calibration / verification / repair positioning with the design's service-page layout
- [ ] **PAGE-04**: Visitor lands on `/[locale]/about` (NEW) and sees redesigned About with: 1.4fr/1fr 2-col hero (h1 lockup + 2 paragraphs), full-width facility placeholder, 4-stat key-facts ribbon, timeline (5 milestones in 5-column row with dot markers + accent text)
- [ ] **PAGE-05**: All 3 new pages emit per-locale canonical + hreflang for uz/ru/en + `x-default` and are registered in the per-locale sitemaps (Phase 3 SEO infra reused)

### Recipe + Industry Visual Alignment (CONTENT-UI)

- [ ] **CONTENT-UI-01**: Recipe index `/[locale]/recipes` re-skinned to design system (typography + spacing + RecipeCard treatment) without changing data fetching or sitemap entries
- [ ] **CONTENT-UI-02**: Recipe detail `/[locale]/recipes/<slug>` retains Tiptap-rendered body + LocaleFallbackBanner + TechArticle JSON-LD; only typography + prose styling + hero image treatment change
- [ ] **CONTENT-UI-03**: Industry index `/[locale]/industries` mirrors recipe index treatment
- [ ] **CONTENT-UI-04**: Industry detail mirrors recipe detail treatment

### Contact Page Visual Redesign (CONTACT-UI)

- [ ] **CONTACT-UI-01**: Visitor on `/[locale]/contact` sees the redesigned 2-col layout (1fr lede + sales/service/HQ/hours cards | 1fr quote-request form)
- [ ] **CONTACT-UI-02**: Form fields adopt the design's underline-only styling (no boxed inputs except the textarea); industry pill-toggle row + "Specifications / parts list" textarea; submit button + "We respond within 1 business hour" trust line
- [ ] **CONTACT-UI-03**: Backend (`submitContactForm` Server Action + Turnstile + per-IP rate limit + audit + Resend dispatcher) is preserved verbatim from Phase 5. Only the form's visual layer changes
- [ ] **CONTACT-UI-04**: Below the form, a full-width map placeholder (per design) with location text overlay; static for v1.1 (no live map embed)

### Manufacturer Pages Visual Alignment (MFG-UI)

- [ ] **MFG-UI-01**: Manufacturer index `/[locale]/manufacturers` re-skinned to design system
- [ ] **MFG-UI-02**: Manufacturer detail re-skinned to design system; product grid uses redesigned `<ProductCard>`

### Visual Regression Tests (VRT)

- [ ] **VRT-01**: Playwright visual snapshot test for each public page template (home, catalog, product, recipe, industry, contact, about, service, solutions, manufacturer index, manufacturer detail) at 1440px desktop, captured per locale (uz / ru / en) — 11 templates × 3 locales = 33 baseline snapshots
- [ ] **VRT-02**: VRT runs in `e2e-preview.yml` workflow; snapshot diffs surface in PR review (Playwright HTML report uploaded on diff)

### Carry-forward Refactor (REFACTOR)

- [ ] **REFACTOR-01**: `proxy.ts` (top level) moves to `src/proxy.ts` (stashed v1.1-wip change applied) with all imports updated and Next.js middleware contract preserved
- [ ] **REFACTOR-02**: `src/env.ts` hardening (stashed change) applied without breaking `@t3-oss/env-nextjs` validation
- [ ] **REFACTOR-03**: `src/app/[locale]/layout.tsx` + `src/components/public/contact-form.tsx` stashed tweaks applied and verified against Phase 5 contact-roundtrip e2e

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future Visual

- **V2-VIS-01**: Mobile-first responsive treatment of all redesigned templates (v1.1 ships desktop 1440px primary; mobile is "best effort, not pixel-perfect")
- **V2-VIS-02**: Dark mode toggle (design canvas defines a dark `#14161b` palette for the Solutions band only — full dark mode is v2 work)
- **V2-VIS-03**: Animated micro-interactions (gauge value transitions, hover-state polish)
- **V2-VIS-04**: Print stylesheet for product detail (clean PDF capture)

### Future Content Pages

- **V2-PAGE-01**: Press / Newsroom page
- **V2-PAGE-02**: Careers page
- **V2-PAGE-03**: Certificates page (per cert)
- **V2-PAGE-04**: Partners page

### Pre-existing v2 (carried from v1.0 — see milestones/v1.0-REQUIREMENTS.md)

- V2-ADMIN-01..04 (RBAC, manufacturer self-service, TMS, bulk import)
- V2-FEAT-01..11 (compare, ATEX filter, datasheet pack, recently viewed, PDF catalog, product finder, configurator, 3D viewer, accounts, RFQ form, uz-Cyrl)

## Out of Scope

Explicitly excluded for v1.1.

| Feature | Reason |
|---------|--------|
| E-commerce affordances on PDP (price, qty, stock, "Add to order") | Project guardrail — platform is informational, not transactional. Design canvas's commerce elements are stripped and replaced with single Request-quote CTA. |
| Mobile-pixel-perfect responsive | v1.1 ships desktop primary (1440px); mobile is best-effort. Pixel-perfect mobile is V2-VIS-01. |
| Backend / schema changes | v1.1 is visual refresh only. Server Actions, Drizzle schema, auth, search, Cloudinary signing all locked. |
| Admin panel redesign | Out of v1.1 scope. Phase 2 admin UX stays as-is. |
| New search features | Phase 3 search backend untouched. Only PLP visual treatment of results changes. |
| Logo redesign | Design canvas's gauge mark is reusable as-is. Wordmark text swap (Manokip ↔ Manometr) is the only brand-mark change. |
| Map embed (Google Maps / Yandex Maps) | Static placeholder per design canvas in v1.1. Live embed deferred to v2 (vendor + GDPR posture decision needed). |

## Traceability

Roadmap created 2026-05-06. All 62 v1.1 requirements mapped to phases 6–11.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DESIGN-01 | Phase 6 | Pending |
| DESIGN-02 | Phase 6 | Pending |
| DESIGN-03 | Phase 6 | Pending |
| DESIGN-04 | Phase 6 | Pending |
| REFACTOR-01 | Phase 6 | Pending |
| REFACTOR-02 | Phase 6 | Pending |
| REFACTOR-03 | Phase 6 | Pending |
| REUSE-01 | Phase 6 | Pending |
| REUSE-02 | Phase 6 | Pending |
| REUSE-03 | Phase 6 | Pending |
| CHROME-01 | Phase 7 | Pending |
| CHROME-02 | Phase 7 | Pending |
| CHROME-03 | Phase 7 | Pending |
| CHROME-04 | Phase 7 | Pending |
| CHROME-05 | Phase 7 | Pending |
| CHROME-06 | Phase 7 | Pending |
| CHROME-07 | Phase 7 | Pending |
| CHROME-08 | Phase 7 | Pending |
| HOME-01 | Phase 8 | Pending |
| HOME-02 | Phase 8 | Pending |
| HOME-03 | Phase 8 | Pending |
| HOME-04 | Phase 8 | Pending |
| HOME-05 | Phase 8 | Pending |
| HOME-06 | Phase 8 | Pending |
| PLP-01 | Phase 8 | Pending |
| PLP-02 | Phase 8 | Pending |
| PLP-03 | Phase 8 | Pending |
| PLP-04 | Phase 8 | Pending |
| PLP-05 | Phase 8 | Pending |
| PLP-06 | Phase 8 | Pending |
| PLP-07 | Phase 8 | Pending |
| PLP-08 | Phase 8 | Pending |
| PLP-09 | Phase 8 | Pending |
| PLP-10 | Phase 8 | Pending |
| PDP-01 | Phase 9 | Pending |
| PDP-02 | Phase 9 | Pending |
| PDP-03 | Phase 9 | Pending |
| PDP-04 | Phase 9 | Pending |
| PDP-05 | Phase 9 | Pending |
| PDP-06 | Phase 9 | Pending |
| PDP-07 | Phase 9 | Pending |
| PDP-08 | Phase 9 | Pending |
| PDP-09 | Phase 9 | Pending |
| PDP-10 | Phase 9 | Pending |
| PDP-11 | Phase 9 | Pending |
| CONTENT-UI-01 | Phase 9 | Pending |
| CONTENT-UI-02 | Phase 9 | Pending |
| CONTENT-UI-03 | Phase 9 | Pending |
| CONTENT-UI-04 | Phase 9 | Pending |
| MFG-UI-01 | Phase 9 | Pending |
| MFG-UI-02 | Phase 9 | Pending |
| PAGE-01 | Phase 10 | Pending |
| PAGE-02 | Phase 10 | Pending |
| PAGE-03 | Phase 10 | Pending |
| PAGE-04 | Phase 10 | Pending |
| PAGE-05 | Phase 10 | Pending |
| CONTACT-UI-01 | Phase 10 | Pending |
| CONTACT-UI-02 | Phase 10 | Pending |
| CONTACT-UI-03 | Phase 10 | Pending |
| CONTACT-UI-04 | Phase 10 | Pending |
| VRT-01 | Phase 11 | Pending |
| VRT-02 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 62 total (4 DESIGN + 8 CHROME + 6 HOME + 10 PLP + 11 PDP + 3 REUSE + 5 PAGE + 4 CONTENT-UI + 4 CONTACT-UI + 2 MFG-UI + 2 VRT + 3 REFACTOR)
- Mapped to phases: 62 ✓
- Unmapped: 0

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 6: Design System Foundation + Refactor | DESIGN-01..04, REFACTOR-01..03, REUSE-01..03 | 10 |
| Phase 7: Storefront Chrome | CHROME-01..08 | 8 |
| Phase 8: Catalog Surfaces | HOME-01..06, PLP-01..10 | 16 |
| Phase 9: Product Detail + Content Surfaces | PDP-01..11, CONTENT-UI-01..04, MFG-UI-01..02 | 17 |
| Phase 10: New Pages + Contact Refresh | PAGE-01..05, CONTACT-UI-01..04 | 9 |
| Phase 11: VRT + Closure | VRT-01..02 | 2 |

---
*Requirements defined: 2026-05-06*
*Last updated: 2026-05-06 — roadmap created, all 62 requirements mapped to phases 6–11*
*Pending decisions: brand wordmark + final commerce-strip table + industry-taxonomy reconciliation (see STATE.md ## Next Steps)*
