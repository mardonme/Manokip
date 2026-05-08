# Roadmap: Manometr

## Milestones

- ✅ **v1.0 MVP — Trilingual B2B Catalog** — Phases 1–5 (shipped 2026-05-06; locally complete, v1 launch awaits 5 user-driven environmental tasks per `STATE.md ## Deferred Items`)
- 🚧 **v1.1 Visual Refresh** — Phases 6–11 (in progress)

Full v1.0 detail archived to `.planning/milestones/v1.0-ROADMAP.md`.

## Phases

<details>
<summary>✅ v1.0 MVP — Trilingual B2B Catalog (Phases 1–5) — SHIPPED 2026-05-06</summary>

- [x] **Phase 1: Foundations** (7/7 plans) — completed 2026-04-23 — Schema, locale routing, auth, pooled Postgres, deployment scaffold
- [x] **Phase 2: Admin Panel** (18/18 plans) — completed 2026-04-29 — Spec-schema editor, product CRUD, media, invites, audit, cache invalidation
- [x] **Phase 3: Public Rendering, Search, SEO** (9/9 plans) — completed 2026-05-01 — Catalog pages, filters, FTS, hreflang, JSON-LD, manufacturer pages
- [x] **Phase 4: Content Features** (12/12 plans) — completed 2026-05-01 — Recipes, industry pages, product cross-links
- [x] **Phase 5: Contact and Launch Polish** (6/6 plans) — completed 2026-05-05 — Contact form, observability, SEO verification, dogfood protocol, launch bar

See `.planning/milestones/v1.0-ROADMAP.md` for full phase goals, success criteria, and per-plan summaries.

</details>

### 🚧 v1.1 — Visual Refresh

- [ ] **Phase 6: Design System Foundation + Refactor** - Design tokens, reusable components (Gauge, ProductCard, KeyFactsRibbon), and stashed source refactor
- [ ] **Phase 7: Storefront Chrome** - Redesigned SiteHeader (utility ribbon + nav + CTA) and SiteFooter (4-col nav + brand block + cert tags)
- [ ] **Phase 8: Catalog Surfaces** - Home page and Product Listing Page rebuilt on top of design system and chrome
- [ ] **Phase 9: Product Detail + Content Surfaces** - PDP non-commerce reframe + recipe/industry/manufacturer visual alignment
- [ ] **Phase 10: New Pages + Contact Refresh** - Three new pages (Solutions, Service, About) and Contact page visual redesign
- [ ] **Phase 11: VRT + Closure** - Visual regression test baselines and cross-page polish

## Phase Details

### Phase 6: Design System Foundation + Refactor
**Goal**: The design canvas tokens are live in the codebase and the stashed refactor is applied, giving every downstream phase a stable design system and clean source foundation to build on
**Depends on**: Nothing (first v1.1 phase, builds on v1.0 codebase)
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, REFACTOR-01, REFACTOR-02, REFACTOR-03, REUSE-01, REUSE-02, REUSE-03
**Success Criteria** (what must be TRUE):
  1. A visitor loading any public page sees Inter Tight and JetBrains Mono render correctly — including Uzbek-Latin `oʻ`/`gʻ` and Cyrillic glyphs — with the off-white `#f5f3ee` background, ink `#14161b` text, and accent `#1240e5` active states matching the design canvas, with no FOIT flash
  2. A developer referencing `src/components/public/` finds `<Gauge>`, `<ProductCard>`, and `<KeyFactsRibbon>` as ready-to-consume components with the correct props interface (configurable size/value/label for Gauge; no price/add-to-cart/quantity on ProductCard; label-value array for KeyFactsRibbon)
  3. A developer opening `src/proxy.ts` (moved from top-level `proxy.ts`) finds the middleware contract intact, and `src/env.ts` passes type-safe validation on cold boot
  4. A developer running `pnpm tsc --noEmit` sees exit 0 after the stashed layout.tsx and contact-form.tsx tweaks are applied alongside the refactor
**Plans**: 5 plans (5/5 complete; visual sign-off pending human on Vercel preview)
- [x] 06-01-PLAN.md — Wave 0: RED test scaffolding (5 unit tests + glyph-render extension) — completed 2026-05-06
- [x] 06-02-PLAN.md — Wave 1: Apply stash@{0} (proxy.ts move, env.ts hardening, contact-form direct env read) — completed 2026-05-07
- [x] 06-03-PLAN.md — Wave 2: Tokens + fonts (globals.css @theme + .mk helpers + next/font Inter Tight + JetBrains Mono + body className=mk) — completed 2026-05-08
- [x] 06-04-PLAN.md — Wave 3: Components (Gauge SVG port + ProductCard reskin in place + KeyFactsRibbon variant grid) — completed 2026-05-08
- [x] 06-05-PLAN.md — Wave 4: /design smoke route + full phase verification gate — completed 2026-05-08 (typecheck/vitest/build all GREEN; CSS tokens + .mk helpers compiled; server env not in client chunks; REUSE-03 in-place; visual approval at 1440px against idea/design-canvas.jsx pending human review on Vercel preview)
**UI hint**: yes

### Phase 7: Storefront Chrome
**Goal**: Every public page displays the redesigned SiteHeader and SiteFooter — the persistent chrome layer that all page templates share — with all navigation, locale switching, and CTA wiring correct
**Depends on**: Phase 6
**Requirements**: CHROME-01, CHROME-02, CHROME-03, CHROME-04, CHROME-05, CHROME-06, CHROME-07, CHROME-08
**Success Criteria** (what must be TRUE):
  1. A visitor on any public page sees the utility ribbon (locations, country count, phone, locale-switcher labels in RU · EN · UZ format) above the main bar with brand mark, 5-item nav, search button with `⌘K` hint, Sign-in link, and Request-quote primary CTA
  2. A visitor clicking the active nav item sees it distinguished by bold weight and a 2px accent underline; clicking an inactive item navigates correctly
  3. A visitor clicking Request-quote in the header sees the Phase 5 contact dialog open with the current page captured as `sourcePage` — no commerce framing appears
  4. A visitor at the bottom of any public page (home, catalog, product, recipe, industry, contact, about, manufacturer) sees the 4-column footer navigation (Catalog / Solutions / Service / Company) plus the brand block with cert tags (ISO 9001 / GOST R / EAC / O'zStandart) and a mono-font meta line with copyright
  5. A visitor switching locale from the header utility ribbon lands on the correct per-locale slug-aware URL (Phase 3 LocaleSwitcher behavior preserved)
**Plans**: TBD
**UI hint**: yes

### Phase 8: Catalog Surfaces
**Goal**: Visitors landing on the home page and category listing pages experience the fully redesigned templates — hero, category grid, product cards, filter controls, and pagination — all built on the Phase 6 design system with no commerce affordances
**Depends on**: Phase 6, Phase 7
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, PLP-01, PLP-02, PLP-03, PLP-04, PLP-05, PLP-06, PLP-07, PLP-08, PLP-09, PLP-10
**Success Criteria** (what must be TRUE):
  1. A visitor landing on `/[locale]` sees the redesigned hero with eyebrow tag, h1 lockup, lede paragraph, two CTAs, a 4-stat strip with ticker, and the `<Gauge>` SVG with technical-callout annotations
  2. A visitor on the home page scrolls through: a 4-column 12-category grid with hairline borders and count badges; a featured-products band with 4 `<ProductCard>` instances and category-filter pills; a dark Solutions band with industry tiles and anchor-client labels; and a service strip with 3 trust facts — none of these sections contain a price, stock count, or "Add to order"
  3. A visitor landing on `/[locale]/categories/<slug>` sees the redesigned catalog with breadcrumb, h1, product/subcategory counts, the top 5 filter chips with inline summary values, a 260px subcategory sidebar with active-fill styling, a pressure-range dual-handle slider with mono labels, and certification checkboxes with custom blue-fill active styling
  4. A visitor applying filters on the catalog page sees active filter chips rendered as solid-dark removable pills above the product grid, a 3-column grid of redesigned `<ProductCard>` (no commerce affordances), and a pagination row with "Showing 1—N of M" mono label — and the URL reflects the filter state via the Phase 3 nuqs integration unchanged
**Plans**: TBD
**UI hint**: yes

### Phase 9: Product Detail + Content Surfaces
**Goal**: Product detail pages present the full non-commerce redesign (gallery, display-only spec selectors, tabs, related products) while recipe, industry, and manufacturer pages are visually aligned to the design system — all without touching any Phase 3 or Phase 4 backend contracts
**Depends on**: Phase 6, Phase 7
**Requirements**: PDP-01, PDP-02, PDP-03, PDP-04, PDP-05, PDP-06, PDP-07, PDP-08, PDP-09, PDP-10, PDP-11, CONTENT-UI-01, CONTENT-UI-02, CONTENT-UI-03, CONTENT-UI-04, MFG-UI-01, MFG-UI-02
**Success Criteria** (what must be TRUE):
  1. A visitor on `/[locale]/products/<slug>` sees the 2-column layout (gallery 1fr / details 1fr, 56px gap) with: full-bleed gauge area showing SKU and status tag overlay, 4-thumbnail row with active accent-border indicator, and the details column showing category eyebrow, GOST reference, h1 model, and lede — with zero price card, stock count, quantity stepper, or volume-discount line anywhere on the page
  2. A visitor sees a single "Request quote" primary CTA that opens the Phase 5 contact dialog pre-filled with the product name and SKU; the trust line beneath it reads "24-month warranty / Calibration certificate included" with no "Free shipping" or commerce copy
  3. A visitor clicking the spec-selector pills (Range / Connection / Mount) sees display-only pill-tag groups reflecting the spec catalog values with the active value visually distinguished — clicking a pill does not trigger any cart or configurator action
  4. A visitor clicking the Specifications tab sees the existing fiztech-density grouped spec table; the Documentation / Calibration / Compatibility / Reviews tabs are present and navigable; the Related products row shows 4 cross-linked `<ProductCard>` instances and the "Used in" widget shows up to 6 cross-references — all Phase 4 data relationships preserved
  5. A developer running a JSON-LD validator against any PDP URL confirms Product and BreadcrumbList structured data are emitted verbatim from Phase 3 — no visual change has modified the structured data output
  6. A visitor on `/[locale]/recipes`, `/[locale]/recipes/<slug>`, `/[locale]/industries`, or `/[locale]/industries/<slug>` sees typography, spacing, and hero image treatment matching the design system; Tiptap-rendered body, LocaleFallbackBanner, and TechArticle JSON-LD are preserved unchanged
  7. A visitor on `/[locale]/manufacturers` and `/[locale]/manufacturers/<slug>` sees the index and detail pages re-skinned to the design system, with the product grid using the redesigned `<ProductCard>`
**Plans**: TBD
**UI hint**: yes

### Phase 10: New Pages + Contact Refresh
**Goal**: Three new public pages (Solutions landing, Service & Calibration, About) are live and discoverable via sitemap and hreflang, and the Contact page presents the redesigned visual layout while its Phase 5 backend pipeline remains untouched
**Depends on**: Phase 6, Phase 7
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, CONTACT-UI-01, CONTACT-UI-02, CONTACT-UI-03, CONTACT-UI-04
**Success Criteria** (what must be TRUE):
  1. A visitor landing on `/[locale]/solutions` sees the 6-industry grid with eyebrow, h1, lede, and 2-column tile grid (each tile showing a number, tags, title, description, and Recommended-instruments link) that deep-links into the existing per-industry detail pages
  2. A visitor landing on `/[locale]/service` sees the calibration/verification/repair positioning page with the design's service-page layout and 3 trust facts
  3. A visitor landing on `/[locale]/about` sees the 2-column hero (1.4fr/1fr, h1 lockup + 2 paragraphs), full-width facility placeholder, 4-stat key-facts ribbon, and a 5-milestone timeline rendered in a 5-column row with dot markers and accent text
  4. A visitor landing on `/[locale]/contact` sees the redesigned 2-column layout: on the left, a lede with sales/service/HQ/hours cards; on the right, the quote-request form with underline-only field styling, industry pill-toggle row, and the "We respond within 1 business hour" trust line; below the form, a full-width static map placeholder with location text overlay — and submitting the form goes through the Phase 5 `submitContactForm` Server Action with Turnstile + rate limit + audit + Resend unchanged
  5. A developer running the per-locale sitemap endpoint confirms all three new pages (`/solutions`, `/service`, `/about`) appear with per-locale canonical + hreflang for uz/ru/en + `x-default`
**Plans**: TBD
**UI hint**: yes

### Phase 11: VRT + Closure
**Goal**: Visual regression baselines are established for all 11 public page templates across 3 locales, giving the team a snapshot-diff gate that catches unintended visual regressions on future PRs
**Depends on**: Phase 6, Phase 7, Phase 8, Phase 9, Phase 10
**Requirements**: VRT-01, VRT-02
**Success Criteria** (what must be TRUE):
  1. A developer running `pnpm playwright test --project=vrt` generates 33 baseline snapshots (11 templates × 3 locales: uz / ru / en) at 1440px desktop width — home, catalog, product, recipe, industry, contact, about, service, solutions, manufacturer index, manufacturer detail
  2. A developer opening a pull request that changes any public component sees the `e2e-preview.yml` workflow run the VRT suite and upload a Playwright HTML report; if any snapshot differs from the baseline, the diff is visible in the PR review without manual local reproduction
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundations | v1.0 | 7/7 | Complete | 2026-04-23 |
| 2. Admin Panel | v1.0 | 18/18 | Complete | 2026-04-29 |
| 3. Public Rendering, Search, SEO | v1.0 | 9/9 | Complete | 2026-05-01 |
| 4. Content Features | v1.0 | 12/12 | Complete | 2026-05-01 |
| 5. Contact and Launch Polish | v1.0 | 6/6 | Complete | 2026-05-05 |
| 6. Design System Foundation + Refactor | v1.1 | 0/5 | Not started | - |
| 7. Storefront Chrome | v1.1 | 0/? | Not started | - |
| 8. Catalog Surfaces | v1.1 | 0/? | Not started | - |
| 9. Product Detail + Content Surfaces | v1.1 | 0/? | Not started | - |
| 10. New Pages + Contact Refresh | v1.1 | 0/? | Not started | - |
| 11. VRT + Closure | v1.1 | 0/? | Not started | - |

---
*Roadmap updated 2026-05-06: v1.1 Visual Refresh phases 6–11 added (6 phases, 62 requirements mapped, 62/62 coverage)*
