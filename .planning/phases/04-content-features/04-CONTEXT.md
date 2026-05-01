# Phase 4: Content Features - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers the long-tail SEO content moat: trilingual rich-text recipes (how-to / application / selection guides) and industry-scenario landing pages (oil & gas, food processing, pharma, etc.), authored in Tiptap by admins, with M:N relationships to products. The product detail page gains a "Used in" section listing the recipes and industry pages that reference it. Recipes and industry pages emit TechArticle JSON-LD validating in the Rich Results Test.

Phase 4 does **not** build:
- New product / category / manufacturer / spec-field admin surfaces (shipped in Phase 2)
- Public catalog / search / SEO infrastructure (shipped in Phase 3)
- The contact form (Phase 5)
- Observability hardening (Phase 5)

Covers requirements: **CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06**.

</domain>

<decisions>
## Implementation Decisions

### Storage & schema (carry-forward + Phase-4 additive migration)

- **D-01:** **Recipe + Industry are separate base tables, both already shipped in Phase 1.** `src/db/schema/recipes.ts` (recipe + recipe_translations) and `src/db/schema/industries.ts` (industry + industry_translations) follow the project-wide sibling-translation pattern (`*_translations` keyed `(entity_id, locale)` with per-locale slug uniqueness + locale check constraint + FK cascade). Body is `jsonb` (Tiptap ProseMirror doc). Featured image is `featured_image_public_id` text column (Cloudinary public_id). Industries page mirrors recipe shape verbatim. **No table merge into a unified `article` table** — separate tables make TechArticle JSON-LD differentiation cleaner (recipe = HowTo / Article subtype, industry = Article landing page) and keep TanStack-Table admin lists trivially scoped.

- **D-02:** **Phase-4 additive migration adds 4 columns + 2 junction tables + the "used in" reverse-query pgView.** Migration:
  - `recipe.status` (publication_status enum: 'draft' | 'published') NOT NULL DEFAULT 'draft' + backfill existing rows; mirrors `product.status` from Phase 2 D-11.
  - `industry.status` same shape.
  - `product_recipes` junction table: `(product_id uuid, recipe_id uuid, position int)` with both FK cascades + composite PK + index on `recipe_id` for forward query + index on `product_id` for reverse "Used in" query.
  - `product_industries` junction table: same shape with `industry_id`.
  - Optional pgView `product_used_in_v` joining both junctions (Phase-3 plan-02-style derived view) for the "Used in" reverse query (single round-trip, single tag for revalidation).
  - Reuses `publication_status` enum if it already exists for products; otherwise defines a new `content_status` enum with the same values.

### Lifecycle & admin Server Actions

- **D-03:** **Status + publishedAt dual-column lifecycle, mirroring Phase-2 D-11 / 02-13b.** `saveRecipe` / `saveIndustry` write `status` verbatim from input + never derive from `publishedAt`. Dedicated `publishRecipe` / `unpublishRecipe` (and industry equivalents) atomic dual-column writes (status + publishedAt in ONE SET clause). `deleteRecipe` / `deleteIndustry` audit before-delete inside tx; FK cascade drops translations + junction rows. All wrap `withAdminAction` from Phase 2 plan 02-04 (audit_log row per mutation, distinct AUDIT_ACTIONS verbs: `publish_recipe` / `unpublish_recipe` / `delete_recipe` etc.). All call typed `revalidateRecipe(id)` / `revalidateIndustry(id)` helpers (extends Phase 2 plan 02-05 helper set) AFTER tx.commit (Pitfall #2).

- **D-04:** **M:N junction direction is author-side only.** The recipe form / industry form has a "Linked products" multi-select picker (TanStack DataTable-driven async-search in a Popover, similar to Phase-2 spec-values-editor pattern). The product form does **not** show a reverse "appears in" multi-select — the reverse direction renders **read-only** on the public product detail page as the "Used in" section (CONT-04). Author thinks "this article is about products X, Y, Z"; reader sees "products → here are the contexts they're used in". One direction of authoring + one direction of read = no sync surface, no cross-form coupling.

### Rich-text editor scope (Tiptap v2)

- **D-05:** **Tiptap v2 extension set is the floor specified in Phase 1 STACK.md plus image-pasting wired to Cloudinary.** Locked extensions: `@tiptap/starter-kit` (paragraph, headings 1–4, bold, italic, lists, blockquote, code, hard break) + `@tiptap/extension-link` (with target=\_blank rel=nofollow on external) + `@tiptap/extension-image` + `@tiptap/extension-table` (+ table-row + table-cell + table-header). Headings cap at H4 (H1 reserved for the page title outside the editor). No code-block syntax highlighting in v1 (low value for industrial pressure articles; defer).

- **D-06:** **Tiptap image upload uses the existing Cloudinary signed direct upload flow** wired into the editor's drop / paste / toolbar handlers. The signed upload returns a public_id; the Tiptap image node stores the public_id (not the full URL) so that public rendering goes through `<CldImage>` with the same responsive `sizes` strategy as Phase 3. Reuse `/api/cloudinary/sign` from Phase 1 plan 01-06 + the widget-paramsToSign protocol from Phase 2 plan 02-14 — no new server endpoint.

### Public rendering & locale fallback

- **D-07:** **Locale fallback chain matches Phase 3 D-05 — current → uz → ru → en, stop at first non-empty.** If `/ru/recipes/<slug>` requests a recipe whose `recipe_translations` row for `ru` is missing OR has empty `body`, fall back to uz translation with a banner: `"Показано на узбекском — переводу на русский ещё нет"` (and equivalents). uz is the fallback root because uz is the project's default locale + primary content audience. Same cascade applies to industry pages.

- **D-08:** **Tiptap JSON → HTML on the server via `@tiptap/static-renderer` (RSC, no hydration cost).** The renderer is the official Tiptap static export — runs synchronously in the RSC, emits HTML, no client-side ProseMirror bundle on public pages. Defense-in-depth XSS hardening: the renderer is configured to allow only the locked extension set (no arbitrary HTML attributes); any unrecognised mark/node falls back to plain text. Public bodies render inside a `prose prose-slate` Tailwind-typography wrapper for readable defaults.

### "Used in" reverse section on product detail (CONT-04)

- **D-09:** **"Used in" renders as two sections — Recipes (top) + Industries (below) — each a card grid.** Each card: featured image (`<CldImage>` 16:9), title, 1-line excerpt, type badge in current locale. Up to 6 items per type; if more exist, render a "Все примеры применения" link to a future per-product cross-link page (deferred to v1.1, **not** scoped here). When a product has 0 cross-links, the entire "Used in" section is hidden (no empty-state stub). Section placement: below the spec table, above the manufacturer card on sketch 003 left column.

### TechArticle JSON-LD (CONT-06)

- **D-10:** **Both recipes and industries emit TechArticle JSON-LD** (recipe is the canonical TechArticle subtype; industry treated identically because Google's Rich Results Test accepts both as TechArticle and the field set is the same: `headline`, `image`, `datePublished`, `dateModified`, `author` = manometr Organization, `publisher` = same Organization, `inLanguage` = current locale, `mainEntityOfPage`). Implementation: extend `src/lib/jsonld.ts` from Phase 3 with `techArticleJsonLd(article, locale)` helper. Optionally add `mentions` array referencing the linked products' canonical URLs — gives Google a knowledge-graph signal connecting article → product.

### Claude's Discretion

The planner and researcher may decide these without re-asking the user:

- **Cache + revalidation strategy** — extend the typed-tag helper set from Phase 2 plan 02-05 with `revalidateRecipe(id)` + `revalidateIndustry(id)` + `revalidateUsedIn(productId)` (the last triggered by junction-row mutations on either side). Recipe / industry list pages tag with `recipes:list:<locale>` / `industries:list:<locale>`.

- **Slug auto-generation** — slugify-and-collision-check pattern from Phase 2 categories/manufacturers/products. Per-locale slugs (existing schema). Collision check against `recipe_translations`/`industry_translations` per-locale unique index.

- **Translation completeness UI** — reuse the `<TranslationCompleteness>` + `<TranslationDots>` primitives from Phase 2 plan 02-12. Body field counts toward completeness.

- **Empty-locale list filter** — recipes / industries list page in current locale shows entries with at least one published translation in any locale, with a per-row dot indicator showing which locales are present (matches Phase 2 D-04 thresholds).

- **Spike-/sketch-driven decisions** — none open for this phase; sketch winner from Phase 3 (sketch 003 premium-SaaS finish) carries forward as the visual baseline.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements

- `.planning/ROADMAP.md` §"Phase 4: Content Features" — phase goal, success criteria, requirement IDs (CONT-01..06)
- `.planning/REQUIREMENTS.md` — full requirement text for CONT-01..06
- `.planning/PROJECT.md` — project vision + audience (engineers in UZ/CIS) + non-negotiables

### Existing schema (extend, don't redefine)

- `src/db/schema/recipes.ts` — `recipe` + `recipe_translations` tables already shipped Phase 1
- `src/db/schema/industries.ts` — `industry` + `industry_translations` tables already shipped Phase 1
- `src/db/schema/products.ts` — products table for FK target on junction tables
- `src/db/schema/index.ts` — schema barrel export

### Stack research (Tiptap rationale + extension list)

- `.planning/research/STACK.md` — Tiptap v2 selection + locked extensions list (`@tiptap/starter-kit`, `extension-link`, `extension-image`, `extension-table` + table-row/cell/header)
- `.planning/research/ARCHITECTURE.md` — full ERD with junction-table conventions
- `.planning/research/PITFALLS.md` — Pitfall #2 (revalidate after tx.commit), Pitfall #5 (Cloudinary signature parity for widget paramsToSign protocol)
- `.planning/research/FEATURES.md` — recipe / industry feature scope from initial research

### Prior phase decisions (carry forward)

- `.planning/phases/01-foundations/01-CONTEXT.md` — locked translation-sibling-table pattern, jsonb body, locale check constraint
- `.planning/phases/02-admin-panel/02-CONTEXT.md` §D-11 — `product.status` verbatim writes + dedicated publish action; D-09 audit log discriminator pattern; D-10 typed revalidateTag helpers
- `.planning/phases/02-admin-panel/02-13b-SUMMARY.md` — products lifecycle Server Actions reference implementation (publishProduct/unpublishProduct/deleteProduct atomic dual-column writes)
- `.planning/phases/02-admin-panel/02-12-SUMMARY.md` — `<TranslationCompleteness>` + `<TranslationDots>` primitives reused here for recipe/industry rows
- `.planning/phases/02-admin-panel/02-14-SUMMARY.md` — Cloudinary signed-upload widget protocol (paramsToSign branch); the Tiptap image extension reuses this exact path
- `.planning/phases/03-public-rendering-search-seo/03-CONTEXT.md` §D-05 — locale-fallback cascade (current → uz → ru → en, banner on fallback) — Phase 4 D-07 mirrors this
- `.planning/phases/03-public-rendering-search-seo/03-CONTEXT.md` §D-09 — `src/lib/jsonld.ts` typed JSON-LD helper set; Phase 4 D-10 extends with `techArticleJsonLd`
- `.planning/phases/03-public-rendering-search-seo/03-SECURITY.md` — XSS-via-JSON-LD escape pattern (`\\u003c`); applies to article body rendering too
- `.planning/phases/03-public-rendering-search-seo/03-VALIDATION.md` — test-file conventions (live-Neon db tests, RSC route tests, Playwright e2e)

### UI baseline

- Sketch 003 premium-SaaS finish locked in Phase 3 D-01..04 — recipe/industry detail pages reuse the slate/charcoal palette, Inter typography with cv11+ss01, frosted-glass header. Article-body rendering inside `prose prose-slate`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- **Phase 2 admin shell** (`src/app/[locale]/admin/layout.tsx`, sidebar, breadcrumbs, NuqsAdapter, shadcn primitives) — recipe/industry admin routes mount under it.
- **`<MediaUploader>`** (`src/components/admin/media-uploader.tsx`) — featured image + Tiptap inline images both go through this signed-upload flow.
- **`<LocaleTabs>` + `<SlugInput>`** (`src/components/admin/locale-tabs.tsx`, `slug-input.tsx`) — recipe/industry forms reuse the 3-locale tab swap pattern from product/category/manufacturer forms.
- **`<TranslationCompleteness>` + `<TranslationDots>`** (`src/components/admin/translation-completeness.tsx`) — per-locale dot indicator on recipe/industry list rows.
- **`<ConfirmDialog>`** (`src/components/admin/confirm-dialog.tsx`) — gates delete + unpublish flows.
- **`withAdminAction`** (`src/lib/audit.ts`) — wraps every saveRecipe / saveIndustry / publish / unpublish / delete Server Action with audit_log writes.
- **`logAudit`** + AUDIT_ACTIONS enum — extend with recipe-/industry-specific verbs (`save_recipe`, `publish_recipe`, etc.).
- **Typed `revalidate*` helpers** (`src/lib/revalidation.ts`) — extend with `revalidateRecipe(id)`, `revalidateIndustry(id)`, `revalidateUsedIn(productId)`.
- **`src/lib/jsonld.ts`** (Phase 3) — extend with `techArticleJsonLd(article, locale)`.
- **`<CldImage>` wrapper conventions** — Phase 3 product detail / category / manufacturer pages establish the responsive `sizes` strategy reused for recipe / industry featured images and Tiptap inline images.
- **Public layout shell + SiteHeader + locale switcher** (Phase 3) — recipe / industry pages live under the same shell.
- **`@tiptap/static-renderer`** (NOT YET INSTALLED — Phase 4 adds) — server-side JSON → HTML renderer for public pages.

### Established patterns

- **Sibling translation table writes**: 5-step transaction pattern from Phase 2 plan 02-13a (saveProduct) — base row upsert → translations replace-on-save → optional dependent rows (junction inserts here) → audit_log → revalidateTag. Reuse the structural pattern verbatim.
- **Refusal-to-elevate**: status writes verbatim, dedicated publish action — locked by Phase 2 D-11 (W7).
- **TDD RED → GREEN cycle**: Wave 0 ships test stubs (live-Neon db tests + RSC route tests + Playwright e2e); Wave 1+ flips them to GREEN as features land. Every Phase-2 + Phase-3 plan followed this.
- **Closed-with-deferred-validation posture**: For verification surfaces that cross CLI/UI boundaries (manual rich-text editor smoke, Rich Results Test of TechArticle JSON-LD), accept deferred-validation per Phase 2 plan 02-17 / Phase 3 plan 03-09 pattern.

### Integration points

- Recipe / industry admin routes nest under `/[locale]/admin/recipes/*` and `/[locale]/admin/industries/*` — sidebar gets two new entries.
- Public routes: `/[locale]/recipes` (list), `/[locale]/recipes/[slug]` (detail), `/[locale]/industries` (list), `/[locale]/industries/[slug]` (detail) — sitemap helpers in `src/lib/sitemap.ts` (Phase 3) extend with two new entry types in `buildLocaleSitemapEntries`.
- Product detail page (Phase 3 plan 03-05) gets a new "Used in" component slot below the spec table — single read against `product_used_in_v` (or two reads against junctions if no view) — page-level revalidation already wired by D-04 / D-09.
- Search index (Phase 3 plan 03-02 `product_search`) does **not** index recipes/industries in v1 (recipes are out-of-scope for the catalog FTS); a separate `content_search` per-locale tsvector deferred to v1.1 backlog.

</code_context>

<specifics>
## Specific Ideas

- "Recipes" in this project are **how-to / application / selection guides**, not cooking recipes. Examples expected: "How to choose a manometer for steam systems", "Calibration intervals for pressure transmitters in food processing", "Wetted-parts compatibility chart for chemical service".
- "Industry" pages are **vertical landing pages** with cross-links — examples: oil & gas, chemical processing, HVAC, food & beverage, pharmaceutical, water treatment.
- TechArticle JSON-LD is the right schema.org type for both — Google's Rich Results Test accepts it without an `offers` field (unlike Product), avoiding the same explicit-honesty tradeoff Phase 3 D-08 documented.
- Performance budget: same Slow-4G LCP target as Phase 3 SEO-05 — recipe / industry detail pages must inherit the budget. Tiptap-static-renderer's RSC output should land server-side; no client JS for body rendering.

</specifics>

<deferred>
## Deferred Ideas

- **Recipe / industry content search** — separate `content_search` per-locale tsvector → v1.1 backlog. v1 search box scopes to products only (Phase 3 SRCH-01..05).
- **Per-product "all examples" page** — when a product has more than 6 cross-linked recipes/industries, the "see all" link ⇒ a dedicated `/[locale]/products/[slug]/used-in` route — v1.1 backlog.
- **Code-block syntax highlighting** in Tiptap (low value for industrial pressure articles) — defer.
- **Collaborative editing** (Yjs + Hocuspocus) — STACK.md notes this would require a non-Vercel worker; out of scope for v1.
- **Reverse "appears in" multi-select on product form** — D-04 explicitly rejects this for v1; the read-only "Used in" public surface is the only reverse direction.
- **Rich-text validation tooling** (e.g. broken-link detector, missing-alt-image lint) — admin-side polish, defer.
- **Phase-3 UI-REVIEW.md FIX-1/FIX-2/FIX-3** (stub homepage, mount CategoryTreeServer, visible Breadcrumbs) — tracked as Phase-5 dogfood-gate prerequisites; surface on /gsd-add-backlog.

</deferred>

---

*Phase: 04-content-features*
*Context gathered: 2026-05-01*
