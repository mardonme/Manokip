---
phase: 03-public-rendering-search-seo
audited_at: 2026-04-30
auditor: gsd-ui-review (code-only audit; Playwright-MCP unavailable; no dev server screenshots)
overall_score: 17
verdict: YELLOW
pillar_scores:
  copywriting: 3
  visuals: 3
  color: 3
  typography: 3
  spacing: 3
  experience_design: 2
top_fixes:
  - id: FIX-1
    title: "Replace stub homepage with category-tree + featured-categories landing"
    impact: high
    effort: medium
  - id: FIX-2
    title: "Mount CategoryTreeServer left rail on listing/detail pages (built but never rendered)"
    impact: high
    effort: low
  - id: FIX-3
    title: "Render visible breadcrumb trail on product / category / manufacturer pages (currently JSON-LD only)"
    impact: high
    effort: low
---

# Phase 3 — UI Review

**Audited:** 2026-04-30
**Baseline:** Abstract 6-pillar standards informed by sketch 003 (premium-SaaS product detail), sketch 002 variant A (catalog), and the fiztech-density target. No `UI-SPEC.md` exists for Phase 3 — audit is grounded in `03-CONTEXT.md` decisions D-01..D-11.
**Screenshots:** Not captured (no dev server detected; Playwright-MCP unavailable). This is a code-only audit.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Trilingual messages are tight and engineering-correct, but several user-facing strings (sticky CTA bullets, dark help-card) are hardcoded as `"uz / ru"` slashed bilingual literals instead of locale-routed |
| 2. Visuals | 3/4 | Sketch-003 surfaces (gallery, key-facts, sticky rail, manufacturer card) shipped cleanly; CategoryTree built but never mounted = the "deeply-structured taxonomy" promise is invisible |
| 3. Color | 3/4 | Slate/blue palette is consistent and AA-contrast on dense tables; Tailwind utility classes (`bg-blue-700`, `bg-emerald-600`, `bg-amber-50`) bypass the shadcn token system entirely — the dark-theme `:root` vars in `globals.css` won't drive these |
| 4. Typography | 3/4 | Inter with `latin/latin-ext/cyrillic` subsets correctly wired; tabular-nums applied to spec values, SKUs, and pagination — but no `font-feature-settings: 'cv11', 'ss01'` from sketch 003, no fluid type scale, only one heading size in use |
| 5. Spacing | 3/4 | Sketch 003's two-column 1fr/380px grid + 44/56 spec table column split lands faithfully; spec rows at `py-2` + key-facts at `py-2.5` are slightly looser than fiztech's reference, but reasonable; padding scale is reasonably restrained |
| 6. Experience Design | 2/4 | The homepage is a literal `<h1>` stub; CategoryTree built but unmounted; pagination renders `1 / 5` text only with NO prev/next links; reset-all does a hard `location.assign` reload; visible breadcrumbs missing on every page (only JSON-LD) |

**Overall: 17/24 — YELLOW**

> **Verdict rationale:** Every individual component shipped at sketch-003 fidelity, all 20 Phase-3 requirements close in code + e2e, and the trilingual surface is real. But three load-bearing UX gaps (homepage stub, missing category nav, missing visible breadcrumbs) and one broken interaction (pagination is a label, not navigation) mean a procurement engineer landing on `/` from Google would see a product card but no taxonomy to verify breadth. Ship Phase 3 to launch but track FIX-1..3 as Phase-5 polish blockers BEFORE the dogfood gate.

---

## Top 3 Priority Fixes

### FIX-1 — Homepage is a stub `<h1>` instead of a catalog landing surface
**Impact:** Critical — direct hits to `/` (locale root) see only the site title. No category tree, no featured manufacturers, no recent products, no value-prop copy, no link into the catalog. A procurement engineer arriving via "manometr Tashkent" Google query bounces immediately.
**Effort:** Medium — reuse `getRootCategories` (already built for `/categories`), `getManufacturers` (already built for `/manufacturers`), and the existing `<ProductCard>` to render featured rows. ~150–200 LOC, no new lib helpers.
**File:** `src/app/[locale]/page.tsx:24-30`

### FIX-2 — `<CategoryTreeServer>` is built but mounted nowhere
**Impact:** High — the persistent left-rail category tree is the entire "fiztech taxonomy" pillar. CAT-02 says "persistent category-tree navigation"; the listing page renders only the `FilterSidebar` (spec facets), and the product detail / manufacturer / search pages render no tree at all. Engineers cannot drill from "I'm reading about M-100" to "show me sibling category".
**Effort:** Low — render `<CategoryTreeServer locale={locale} />` in a left rail on `categories/[...slug]/page.tsx` (replace 1-col grid with `[240px_280px_1fr]`) and on `products/[slug]/page.tsx` (collapse to a top breadcrumb dropdown on mobile). The component is already cache-tag-bound to `categories-tree` so revalidation is correct. ~20 LOC of layout edit per page.
**Files:** `src/components/public/category-nav.tsx:96-102` (defined, exported), grep result: zero callers in `src/app/`.

### FIX-3 — Visible breadcrumbs missing on every detail page
**Impact:** High — `BreadcrumbList` JSON-LD is correctly emitted (`src/app/[locale]/products/[slug]/page.tsx:104` etc.) for SEO, but no `<nav aria-label="Breadcrumb">` renders for users. On a 5-level deep category like `/[locale]/categories/manometriya/davlenie/elektronnye/diff/m100`, users have nothing on screen telling them where they are or how to back out one level. fiztech.ru renders a breadcrumb on every row of the search results page; Phase 3 does not.
**Effort:** Low — `product.breadcrumbs` already exists on the data shape (used to feed `breadcrumbJsonLd(product.breadcrumbs)`), and category pages already build the breadcrumb array (`categories/[...slug]/page.tsx:198-205`). A small `<Breadcrumbs>` RSC reading the same array and rendering as `‹` separator + `Link` chain takes ~30 LOC + import in 3 pages.
**Files:** `src/app/[locale]/products/[slug]/page.tsx:104`, `src/app/[locale]/categories/[...slug]/page.tsx:198`, `src/app/[locale]/manufacturers/[slug]/page.tsx:110`.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths.** Trilingual coverage is real and the engineering register is correct. `messages/ru.json:60` reads `"requestPrice": "Запросить цену"` (the locked sketch-003 copy), `"applications": "Где применяется"`, `"downloads": "Документация"` — these are precisely the engineering-CIS-Russian tone PROJECT.md asks for. The Uzbek Latin equivalents at `messages/uz.json:62` (`"Narxni so'rash"`, `"Qo'llanilishi"`, `"Hujjatlar"`) are linguistically correct (with the standard ASCII apostrophe variant — see Findings below). The `"showMore"` key uses ICU placeholder `"+ ещё {n}"` correctly across all three locales. Empty/no-results copy is locale-correct (`"Tanlangan filtrlarga mos mahsulotlar yo'q"` / `"Нет товаров по выбранным фильтрам — попробуйте сбросить какой-нибудь фильтр"` / `"No products match the selected filters — try clearing one"`).

**Findings:**

1. **Hardcoded `"uz / ru"` bilingual slashed copy in the sticky CTA rail.** `src/components/public/sticky-cta-rail.tsx:53` reads `"Texnik mutaxassis bilan maslahat / Технические консультации"` — that's a single string concatenating Uzbek + Russian. The same shape appears at lines 56, 59, 63, 105–107. This bypasses next-intl entirely; an English-locale user sees a Russian-Uzbek chimera. The 4 trust bullets, the "Texnik mutaxassis" eyebrow, and the dark help-card paragraph all need to move into `messages/{uz,ru,en}.json` under `public.product.cta.*`. Component should accept a `labels` object for these strings the same way it already does for `requestPrice` / `downloads`.
2. **Phone number and email are hardcoded placeholders.** `src/components/public/sticky-cta-rail.tsx:78-87` — `+998 (00) 000-00-00` and `info@manometr.uz`. The placeholder phone is fine for v1 dev but ships visually as "we don't have a real phone yet". Suggest moving to env (`NEXT_PUBLIC_SITE_PHONE`) so the staging/prod swap is one line.
3. **Apostrophe variant inconsistency in uz strings.** All `messages/uz.json` strings use the ASCII apostrophe `'` (`"Yuklanmoqda..."`, `"yo'q"`, `"so'rash"`) but the manual gate DEF-3-09-02 explicitly requires the Uzbek-Latin modifier letter `ʻ` (U+02BB) in seed fixture data. The message bundle predates Phase-3's apostrophe-variant lock and should be normalized to U+02BB in a follow-up to match `seedPublicFixture()`. Otherwise font-rendering tests for one tier of strings won't catch regressions in the other.
4. **`SiteHeader` "Manometr" wordmark is plain text, not a localized site title.** `src/components/public/site-header.tsx:38` — hardcoded `Manometr`. Brand names typically don't get translated, so this is acceptable, but the `aria-label` is missing on the home link entirely (the link has visible "Manometr" text but no aria-label / title; for a logomark-quality element this is a small accessibility gap).
5. **`title: 'Search'` is hardcoded in `search/page.tsx:178`** — not localized. Title-tag is a low-impact issue but visible in the tab bar.

### Pillar 2: Visuals (3/4)

**Strengths.** Most sketch-003 surfaces shipped at fidelity:
- Frosted-glass header (`src/components/public/site-header.tsx:30` — `backdrop-blur-[14px] bg-slate-50/80 border-b border-slate-200`) matches sketch 003 exactly.
- 4:3 product gallery with thumb strip and active-thumb blue-700 ring (`src/components/public/product-gallery.tsx:67-73`).
- 6-tile key-facts ribbon with label-above-value layout (`src/components/public/key-facts-ribbon.tsx:24-34`).
- Sticky 380px CTA rail with white card + dark help-card (`src/components/public/sticky-cta-rail.tsx:36-110`).
- Authorized/Verified emerald-600 badge consistently applied across three locations (manufacturer card, manufacturer index, manufacturer detail header).
- `<CldImage>` used everywhere a Cloudinary asset is rendered; no leaked admin upload widgets on the public side.
- lucide-react icons used sparingly and correctly (`FilterIcon` in mobile drawer, `XIcon` in pill chips).

**Findings:**

1. **`CategoryTreeServer` orphaned.** `src/components/public/category-nav.tsx:96-102` is a complete RSC + client island pair, cache-tag-bound, sketch-002-aligned. Zero callers in `src/app/` — see FIX-2.
2. **No image fallback design beyond a `◯` glyph.** `src/components/public/product-card.tsx:58` shows a centered `◯` Unicode character when `heroPublicId` is null. For a B2B engineering catalog where the photo IS the trust signal, a missing-photo card looks broken. Consider a low-effort SVG manometer-face placeholder (the same hand-drawn SVG sketch 003 uses for its mockup) as a default that actually communicates "this is a manometer" rather than "we forgot to upload an image".
3. **No homepage hero / no above-the-fold visual identity.** `src/app/[locale]/page.tsx:24-30` is six lines including the wrapper div. There's no logomark, no hero image, no "Manometr — informational catalog of pressure measurement equipment" tagline, no featured-category cards. See FIX-1.
4. **Sticky CTA rail's eyebrow says `"Manometr"` (sketch literal), not the manufacturer name.** `src/components/public/sticky-cta-rail.tsx:42` — sketch 003's mockup uses "WIKA" as the eyebrow per its example product. Production code hardcodes `"Manometr"` which makes every CTA card look identical regardless of which product page you're on. Pull `manufacturer.name` from props and fall back to "Manometr" only when manufacturer is null.
5. **Homepage `style` prop (`fontFamily: 'var(--font-sans), system-ui, sans-serif'`) is inline JSX style instead of Tailwind.** `src/app/[locale]/page.tsx:26` — minor; remove when FIX-1 lands.
6. **Search results title prepends the literal user query without truncation.** `src/app/[locale]/search/page.tsx:101-103` — a 200-char query becomes a 200-char `<h1>` (and then a 200-char title tag via `t('title', { q })`). Truncate to ~80 chars or use `text-balance` + `line-clamp-2`.

### Pillar 3: Color (3/4)

**Strengths.** Palette is consistent across components: `slate-50/100/200/300/500/600/700/800/900` for surface/text, `blue-700` for the primary CTA + active thumb ring + manufacturer-link hover, `emerald-600` for "Authorized" / "Verified" / trust-bullet markers, `amber-50/200/900` for the search-fallback banner. Slate-on-slate-50 is AA at 14px+ for the spec table. The `text-blue-700 hover:underline` on the manufacturer external website link is the right read-in-the-flow signal for an engineer.

**Findings:**

1. **Tailwind utility colors bypass the `:root` token system entirely.** `src/app/globals.css:50-83` defines `--primary`, `--secondary`, `--accent`, `--destructive` as oklch values, but EVERY public component uses raw `bg-blue-700`, `bg-emerald-600`, `bg-amber-50` etc. (e.g. `src/components/public/sticky-cta-rail.tsx:72`, `src/components/public/manufacturer-card.tsx:63`). When a Phase-5 design tweak says "deepen the blue 1 step", it requires editing N call sites instead of one CSS var. Phase 5 should add a 60/30/10 token contract: `--brand-primary: blue-700`, `--brand-success: emerald-600`, `--brand-warning: amber-200`, etc. then collapse the per-component utilities to `bg-[var(--brand-primary)]`.
2. **Dark mode is defined in globals.css but never reachable.** `src/app/globals.css:85-117` defines a full dark-theme variable set under `.dark { ... }`. No theme switcher, no system-preference reader, no `class="dark"` toggle anywhere in `src/components/public/*`. Either ship a dark mode toggle or remove the `.dark` block to reduce confusion. Engineers reading dense spec tables under a desk lamp would benefit from dark mode; this is low-effort to wire via `next-themes`.
3. **The `bg-blue-100 text-blue-700` SKU-match chip in autocomplete dropdown** (`src/components/public/search-box.tsx:124-126`) is the only place blue-100 appears. The rest of the surface uses slate / blue-700 / emerald-600. The chip color works but reads as a fourth accent — consider using `bg-slate-200 text-slate-900` so the dropdown stays in the slate family with one accent (blue-700) instead of two.
4. **`text-amber-900` on `bg-amber-50` for the fallback banner** (`src/components/public/search-fallback-banner.tsx:20`) — passes WCAG AA but the visual weight is low. For a banner whose message is "your search didn't return results in your language", consider `text-amber-950` or adding a `lucide:Languages` icon to lift the visual rank.
5. **No semantic color for product status** — admin-side product status (`draft` / `published`) is filtered server-side, so no public surface needs to render status. Confirmed correct.

### Pillar 4: Typography (3/4)

**Strengths.** Inter is loaded with `subsets: ['latin', 'latin-ext', 'cyrillic']` (`src/app/[locale]/layout.tsx:21`), `display: 'swap'`, exposed as `--font-sans` CSS variable, and `html { @apply font-sans }` in globals.css forces Inter on the entire surface. `tabular-nums` is correctly applied to: spec table value column (`spec-table.tsx:45`), product card SKUs (`product-card.tsx:73`), key-facts values (`key-facts-ribbon.tsx:31`), pagination counters (`categories/[...slug]/page.tsx:265`, `manufacturers/[slug]/page.tsx:228`), product count strings (`manufacturers/page.tsx:133`), facet counts (`filter-sidebar.tsx:186`), filter range hints (`filter-sidebar.tsx:121`). That's near-comprehensive numeric alignment for a B2B catalog.

**Findings:**

1. **Sketch 003 D-01 specifies `font-feature-settings: 'cv11', 'ss01'` for Inter — never set.** `src/app/globals.css:1-128` does not enable Inter's `cv11` (rounded `i j l`) or `ss01` (open-aperture `4 6 9`) OpenType features. These are the variants that make Inter's tabular numerals look more like Akzidenz than Helvetica — exactly what gives a spec table its engineering character. Add `body { font-feature-settings: 'cv11', 'ss01' }` (or set on the `--font-sans` declaration). 1-line change.
2. **No fluid type scale.** Heading sizes are fixed: `text-3xl` for product/category/manufacturer h1 (e.g. `categories/[...slug]/page.tsx:234`, `products/[slug]/page.tsx:128`), `text-xl` and `text-lg` for h2/h3 in detail pages. On a 1440px viewport this is fine; on a 768px tablet (the primary procurement-engineer device after desktop) the `text-3xl` (≈30px) competes with the spec-table title hierarchy. Consider `text-2xl md:text-3xl` for product h1, or move to a `clamp()` based fluid scale.
3. **Heading hierarchy on the product detail page is shallow.** `<h1>` for product name (`text-3xl font-semibold`), `<h2>` for "Applications" (`text-lg font-semibold`), `<h3>` for spec-group labels (`text-base font-semibold`). The dense product page has 3 levels but the visual rank (`3xl > lg > base`) jumps abruptly between h1 and h2. Pull h2 up to `text-xl` or h3 down to `text-sm uppercase tracking-wide` to widen the rank.
4. **Manufacturer-card name is `<a class="text-base font-semibold">` not `<h2>`** (`src/components/public/manufacturer-card.tsx:54-58`) — minor a11y/SEO issue, but on a product detail page the manufacturer card is conceptually a sub-section and reading-order tools should see it as one.
5. **No `text-balance` on h1s.** Long product names like "Манометр электронный дифференциальный M-100" (~50 chars) wrap awkwardly on a 380px column. `text-balance` is a one-class fix Phase 5 should add.
6. **Spec-table key column is `text-slate-600` and value column is `text-slate-900 font-medium`** (`src/components/public/spec-table.tsx:42-46`) — correct contrast hierarchy. Verified.

### Pillar 5: Spacing (3/4)

**Strengths.** The sketch 003 two-column grid (`grid-cols-1 lg:grid-cols-[1fr_380px] gap-10`) lands correctly on the product detail page (`products/[slug]/page.tsx:125`). The catalog `[280px_1fr] gap-8` (`categories/[...slug]/page.tsx:231`) matches sketch 002. Spec table 44/56 split is implemented via `<colgroup>` (`spec-table.tsx:32-35`) — a nice progressive-enhancement choice that works without CSS. Product card stack (`pt-3 space-y-1.5`) is restrained. Card padding (`p-5`) for the manufacturer / CTA / help cards is consistent.

**Findings:**

1. **Spec-table row padding is `py-2` (~8px).** `src/components/public/spec-table.tsx:42-46` — sketch 003's reference (and fiztech's) is closer to `py-1.5` (~6px) for engineering density. With 5 spec groups × 8 rows = 40 rows, the cumulative loose padding adds ~80px of unused vertical space. Tighten to `py-1.5` (and key-facts to `py-2`) to hit fiztech-density target.
2. **Container width `max-w-screen-2xl` (1536px) on every page.** Used at `layout.tsx`, `products/[slug]/page.tsx:125`, `categories/[...slug]/page.tsx:231`, `manufacturers/page.tsx:84`, `search/page.tsx:159`. On a 4K monitor the spec table stretches 1500px wide — readable but unusually wide for a 56% value column. Consider capping the spec section at `max-w-3xl` (~768px) inside its 1fr column the way sketch 003 does, or `max-w-screen-xl` (1280px) for the whole grid.
3. **Sticky CTA rail spacing** — `space-y-4` between the white card / downloads card / dark help card (`sticky-cta-rail.tsx:37`) is fine; but the 4 trust-bullet `space-y-2` is tight given the bullet uses a 1×1px dot. Engineers scanning quickly miss a bullet they don't see. Either `space-y-3` or change the dot to a `lucide:Check` size-3 emerald-600 stroke.
4. **`px-6 py-8` is the universal page chrome.** Every detail page wraps content in `max-w-screen-2xl mx-auto px-6 py-8`. Mobile (<640px) probably wants `px-4 py-6` to claw back 16px of horizontal real estate — common Tailwind responsive pattern (`px-4 sm:px-6`).
5. **Gap between header and main content is 0.** `<main>{children}</main>` in `layout.tsx:79` has no top padding; pages handle their own `py-8`. This is consistent but means the sticky frosted header sits directly against the page H1 when scrolling. A single `pt-2` on the header outer wrapper or `pt-4` on the main would create the breathing room sketch 003 implies.
6. **Filter sidebar 280px column is correct, but its inner padding is non-standard.** `filter-sidebar.tsx:80,86,88` uses `px-2 py-1.5` for filter group summaries and `px-2 pt-2 pb-3` for filter group bodies. These don't match the `p-5` rhythm of the cards on the detail page. Not visually broken, but adds a third spacing rhythm to learn. Consider standardizing to a 4/8/12/16/24 (1/2/3/4/6) Tailwind scale across all interior padding.

### Pillar 6: Experience Design (2/4)

**Strengths.** Locale switcher is the locked 3-button group (`locale-switcher.tsx:33-45`) with `aria-pressed` + `data-testid` + locale-preserving `router.replace(pathname, { locale })` — works. Search → autocomplete → SKU short-circuit flow is real (`search-box.tsx:55-69` for autocomplete, `search/page.tsx:79-84` for SKU 302). Filter URL state via nuqs is the right primitive (`filter-sidebar.tsx:70-73` etc.). Mobile filter drawer via `<Sheet>` works. Filter empty state copy is locale-correct. JSON-LD (Product / Organization / Breadcrumb / CollectionPage) shipped per D-08/D-09. hreflang + canonical sweep covered by `tests/e2e/seo-coverage.spec.ts`.

**This pillar drops to 2 because of an accumulation of UX gaps that compound:**

1. **Homepage is non-functional as a landing page.** `src/app/[locale]/page.tsx:24-30` — single `<h1>{t('siteTitle')}</h1>` inside a div with inline-style padding. No CTA, no nav-into-catalog, no featured items, no manufacturers. See FIX-1.
2. **`CategoryTreeServer` is orphaned.** Zero callers in `src/app/`. The "fiztech taxonomy" pillar is invisible to users. See FIX-2.
3. **Visible breadcrumbs missing.** Only JSON-LD breadcrumbs are emitted. See FIX-3.
4. **Pagination is a label, not navigation.** `src/app/[locale]/categories/[...slug]/page.tsx:259-268` and `manufacturers/[slug]/page.tsx:223-232` render `{page} / {totalPages}` as plain text, with NO prev/next links, NO page-jump, NO "load more". A user on `/uz/categories/manometriya?page=2` cannot get to page 3 without manually editing the URL. This is the most visible UX failure in the audit — a B2B catalog with broken pagination is operationally unusable above the first 24 results per category.
5. **Reset-all does a hard `window.location.assign` reload** (`active-filter-pills.tsx:148-150`). Every other filter interaction uses nuqs (soft RSC re-render with seamless URL update). The reset-all causes a full page flicker and loses scroll position. Should use `useQueryStates` + `setState` for each filter group OR a single `nuqs.useQueryStates` with a known keyset.
6. **Autocomplete dropdown is keyboard-inaccessible.** `src/components/public/search-box.tsx:114-138` — suggestions are `<button onMouseDown>` with no arrow-key navigation, no Enter-on-focused-suggestion, no aria-activedescendant, no `role="combobox" aria-controls=...`. Engineers heavy-on-keyboard cannot navigate the dropdown without mouse.
7. **No "no autocomplete results" empty state in dropdown.** When the API returns 0 suggestions, the dropdown closes (`if (open && suggestions.length > 0)` at line 109). Better to show "No matches — press Enter to search anyway" so the user knows the system received their input.
8. **Sticky CTA rail uses a placeholder `#contact` href.** `src/components/public/sticky-cta-rail.tsx:71` — clicking "Запросить цену" jumps to a `#contact` anchor that doesn't exist on any Phase-3 page. The button is functionally dead in v1. Phase 5 ships the contact form, but in the meantime consider linking to `mailto:info@manometr.uz?subject=...` so the button does SOMETHING.
9. **Mobile sticky-rail collapse strategy means the rail renders BELOW the spec table on mobile** (the `lg:sticky lg:w-[380px]` becomes a stacked block at `<lg`). The CTA buried 1500px below the fold on a 5-spec-group product page is poor mobile UX. Consider a sticky-bottom mobile CTA bar (single "Запросить цену" button fixed `bottom-0 inset-x-0` with `pb-safe` for iOS) — common e-commerce pattern that fits even though we're not e-commerce.
10. **No "selected filter" visible state on the FilterSidebar checkboxes.** `filter-sidebar.tsx:178-183` — the Checkbox is `checked={checked}` but the label text doesn't gain a font-weight or color shift. Engineers comparing two filter combinations need to see at a glance which checkboxes they ticked without scanning the active-pill row.
11. **Search results don't show breadcrumb chips on each card.** `search/page.tsx:122-138` re-uses `<ProductCard>` which only renders `manufacturerName` as an outline badge. Sketch 003 / D-06 specifies "manufacturer name + category name" breadcrumb chips on every search result row to disambiguate. Category name is fetched (`SearchResultRow` shape per the file's comment) but not rendered on the card. Add it as a second badge next to the manufacturer.

---

## Files Audited

### Pages
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/categories/page.tsx`
- `src/app/[locale]/categories/[...slug]/page.tsx`
- `src/app/[locale]/products/[slug]/page.tsx`
- `src/app/[locale]/manufacturers/page.tsx`
- `src/app/[locale]/manufacturers/[slug]/page.tsx`
- `src/app/[locale]/search/page.tsx`

### Public components
- `src/components/public/site-header.tsx`
- `src/components/public/locale-switcher.tsx`
- `src/components/public/search-box.tsx`
- `src/components/public/search-fallback-banner.tsx`
- `src/components/public/category-nav.tsx` (orphaned)
- `src/components/public/category-nav-client.tsx`
- `src/components/public/product-card.tsx`
- `src/components/public/filter-sidebar.tsx`
- `src/components/public/active-filter-pills.tsx`
- `src/components/public/spec-table.tsx`
- `src/components/public/key-facts-ribbon.tsx`
- `src/components/public/sticky-cta-rail.tsx`
- `src/components/public/manufacturer-card.tsx`
- `src/components/public/downloads-list.tsx`
- `src/components/public/product-gallery.tsx`
- `src/components/public/translation-dots-public.tsx` (referenced; not loaded into review)

### Styles + i18n
- `src/app/globals.css`
- `messages/uz.json`
- `messages/ru.json`
- `messages/en.json`

### Phase planning
- `.planning/phases/03-public-rendering-search-seo/03-CONTEXT.md`
- `.planning/phases/03-public-rendering-search-seo/03-09-SUMMARY.md`

---

## Final note

The architecture is sound. Every Phase-3 requirement closes in code + e2e + JSON-LD validation. The component library is consistent. The trilingual surface is real. The deficits are at the **integration layer**: components that exist but aren't wired up (CategoryTree), affordances that should exist but don't (visible breadcrumbs, pagination links, homepage), and copy/data that should be locale-routed but isn't (sticky-rail bilingual literals).

Phase 5 polish window is the right time to land FIX-1..3 — they're all <1 day each, none require new lib helpers, and they materially raise the "would a procurement engineer trust this enough to specify equipment from it?" answer from "tentatively yes after reading the spec table" to "yes immediately on landing".
