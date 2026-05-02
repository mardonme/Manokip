# Requirements: Manometr

**Defined:** 2026-04-21
**Core Value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundations (FOUND)

- [x] **FOUND-01**: Database schema supports sibling `*_translations` tables for every translatable entity (category, product, manufacturer, spec_field, recipe, industry) keyed `(entity_id, locale)` — no per-locale columns, no JSONB translation bags
- [x] **FOUND-02**: Database schema supports typed spec fields (`spec_field` catalog with type `number`/`range`/`enum`/`bool`/`text` + unit metadata) and a long `product_spec_values` table with typed value columns (`num_value`, `text_value`, `enum_value`, `bool_value`)
- [x] **FOUND-03**: Locale-prefixed routing (`/uz/...`, `/ru/...`, `/en/...`) via next-intl middleware; root `/` redirects to detected/default locale
- [x] **FOUND-04**: Managed Postgres (Neon) with pooled runtime connection for app and direct connection for migrations; Vercel region co-located with database region
- [x] **FOUND-05**: Auth.js v5 with email magic-link provider, Drizzle adapter, and Resend transactional email; admin session cookie gated by middleware for `/[locale]/admin/*` routes
- [x] **FOUND-06**: Cloudinary SDK wired up with server-side signing endpoint; credentials in environment variables only
- [x] **FOUND-07**: Production deployment on Vercel Pro with Sentry error tracking and Vercel Web Analytics + Speed Insights enabled

### Admin Panel (ADMIN)

- [x] **ADMIN-01**: Invited admin can log in via email magic-link; session expires on idle (24h) and absolute limit (7d)
- [x] **ADMIN-02**: Existing admin can invite a new admin by email; invite token is single-use and expires in 48 hours
- [x] **ADMIN-03**: Admin can CRUD categories in a tree (parent/child), with translations for name and description across all three locales on one page
- [x] **ADMIN-04**: Admin can CRUD manufacturers with translations and logo upload to Cloudinary
- [x] **ADMIN-05**: Admin can define the spec-field schema for each category: add/rename/delete fields with type, unit, required flag, and filter behavior; rename treats stable internal key as unchanged
- [x] **ADMIN-06**: Admin can CRUD products with: three-locale tabs (name, short description, long description, slug per locale), manufacturer assignment, category assignment, typed spec values (driven by the category schema), free-form display-only extras, draft/published state
- [x] **ADMIN-07**: Admin can upload product images and datasheets/certificates directly to Cloudinary via signed-upload flow; DB stores `public_id` only
- [x] **ADMIN-08**: Admin can duplicate an existing product as a starting point for a new one
- [x] **ADMIN-09**: Admin can mark a translation as machine-generated (`machine_translated: true`); such fields are flagged in the UI
- [x] **ADMIN-10**: Admin can see a per-product translation-completeness indicator (which locales/fields are missing)
- [x] **ADMIN-11**: Every admin write operation is recorded in an audit log (who, what, when, entity)
- [x] **ADMIN-12**: Admin can view, search, and export contact-form submissions

### Public Catalog (CAT)

- [ ] **CAT-01**: Visitor can switch between Uzbek (Latin), Russian, and English site-wide; current locale reflected in URL
- [ ] **CAT-02**: Visitor can browse the category tree via a persistent navigation (left nav or mega-menu)
- [ ] **CAT-03**: Visitor sees a category listing page with products, filters, and result count
- [ ] **CAT-04**: Visitor can filter products on a category page using faceted filters driven by the category's typed spec fields (number ranges, enum selections, boolean toggles)
- [ ] **CAT-05**: Filter state is reflected in the URL (shareable/bookmarkable) via nuqs
- [ ] **CAT-06**: Visitor sees a product detail page with: hero image, gallery, full fiztech-density spec tables grouped by category-defined spec groups, free-form extras section, manufacturer attribution, downloadable PDFs/datasheets/certificates, "Used in" applications section
- [ ] **CAT-07**: All public pages are server-rendered (SSR or ISR) — HTML is populated on first byte, not client-fetched
- [ ] **CAT-08**: Product detail pages emit Product JSON-LD; organization pages emit Organization JSON-LD; category pages emit CollectionPage + BreadcrumbList JSON-LD

### Search (SRCH)

- [ ] **SRCH-01**: Visitor can perform a full-text search across product name, description, and spec text in the current locale
- [ ] **SRCH-02**: Search results page returns products ranked by relevance; empty current-locale results fall back to another locale with a "shown in [other locale]" hint
- [ ] **SRCH-03**: Search bar offers autocomplete suggestions as the user types (products matched by name/part-number)
- [ ] **SRCH-04**: Exact part-number matches short-circuit to the product detail page
- [ ] **SRCH-05**: Search index is rebuilt transactionally when a product (or its translations or spec values) is updated in admin

### Recipes and Industries (CONT)

- [ ] **CONT-01**: Admin can CRUD rich-text articles ("recipes" / selection guides) with Tiptap editor — links, images (Cloudinary), tables, headings; translated across all three locales
- [ ] **CONT-02**: Admin can CRUD industry-scenario pages (e.g., oil & gas, food processing, pharma) with translated content and linked recommended products
- [ ] **CONT-03**: Visitor can browse and read recipes and industry pages in their current locale
- [ ] **CONT-04**: Product detail pages show a "Used in" section listing the recipes and industry pages that reference the product
- [ ] **CONT-05**: Admin can assign M:N relationships between products ↔ recipes and products ↔ industries
- [ ] **CONT-06**: Recipes and industry pages emit TechArticle JSON-LD

### Manufacturers (MFG)

- [ ] **MFG-01**: Visitor can view a manufacturers/partners index page listing all partner brands with logos
- [ ] **MFG-02**: Visitor can view a manufacturer detail page showing brand description and products from that manufacturer

### Contact (CONT-ACT)

- [ ] **CTA-01**: Visitor can submit a site-wide contact form with name, company, email, message; form is gated by honeypot and Cloudflare Turnstile against spam
- [ ] **CTA-02**: Submission is persisted to the database and an email notification is sent to the admin team via Resend
- [ ] **CTA-03**: Form records the source page the submission came from (hidden field)
- [ ] **CTA-04**: Submission endpoint is rate-limited per IP to prevent abuse

### SEO and Internationalization (SEO)

- [ ] **SEO-01**: Every page emits `<link rel="alternate" hreflang>` tags for all three locales plus `x-default`
- [ ] **SEO-02**: Every page has a per-locale canonical URL (not a master canonical)
- [ ] **SEO-03**: Site emits per-locale XML sitemaps referenced from `robots.txt`
- [ ] **SEO-04**: Fonts load via `next/font` with subsets `['latin', 'latin-ext', 'cyrillic']`; Uzbek Latin `oʻ`/`gʻ` (U+02BB) renders correctly across locales
- [ ] **SEO-05**: Product images render through `<CldImage>` with responsive `sizes` attribute; LCP on product detail page passes Core Web Vitals on Slow 4G (emerging-market budget)
- [ ] **SEO-06**: Site is registered with Google Search Console and Yandex Webmaster; International Targeting panel is clean (no hreflang errors) before launch

### Content Operations (OPS)

- [x] **OPS-01**: Admin edits to any product, category, recipe, or industry invalidate the relevant public pages via `revalidateTag` (no stale public pages after publish) — complete-with-deferred-validation (see DEF-2-17-01: workflow green on real PR + RED on regression PR + branch-protection rule as required status check are queued for the user's post-merge environmental work)
- [ ] **OPS-02**: Content team dogfoods entry of at least 10 real trilingual products, with each product taking 10 minutes or less from start to published — measured before launch

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future Admin

- **V2-ADMIN-01**: Role split (Admin vs Editor) with proper RBAC
- **V2-ADMIN-02**: Manufacturer self-service portal — manufacturers manage their own products
- **V2-ADMIN-03**: Translation-memory / TMS integration for repeated technical terms
- **V2-ADMIN-04**: Bulk import/export of products via CSV or manufacturer API feeds

### Future Visitor Features

- **V2-FEAT-01**: Side-by-side product comparison (2–4 products)
- **V2-FEAT-02**: Approvals-based filter (ATEX / IECEx / EAC) surfaced as top-level faceted filter
- **V2-FEAT-03**: "Request datasheet pack" multi-select contact flow preserving the single-form model
- **V2-FEAT-04**: Recently-viewed products (localStorage)
- **V2-FEAT-05**: Per-category PDF catalog download
- **V2-FEAT-06**: Product-finder wizard (guided selection Q&A)
- **V2-FEAT-07**: Configurator / part-number builder
- **V2-FEAT-08**: 3D model / CAD viewer on product pages
- **V2-FEAT-09**: Customer accounts with saved shortlists
- **V2-FEAT-10**: Structured RFQ form per product
- **V2-FEAT-11**: Uzbek Cyrillic locale (`uz-Cyrl`)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| E-commerce cart / checkout / pricing / stock display | Platform is informational — users decide via specs, contact when ready. Pricing varies by distributor and is commercially sensitive. |
| Per-product "Request info" inquiry buttons | Single site-wide contact form is enough signal for v1; per-product forms spread the request surface before we learn what users actually ask. Revisit once contact-form analytics exist. |
| Live chat widget | B2B buyers on industrial sites don't engage with chat — contact form + email is the right channel. Adds ops burden. |
| AI chatbot / LLM-driven Q&A over specs | High risk of hallucinated technical specs destroying credibility. Revisit only with a validation layer and post-launch. |
| Machine-translation auto-publish | Bad translations on technical content destroy trust permanently. Manual translation in v1; machine translation only as a flagged draft that a human reviews. |
| Customer accounts / logins for visitors | Platform is informational — no personalization value in v1 justifies the surface area. |
| Editor/Admin RBAC split | 2–5 trusted invitees don't need role splits; introduce when team grows to where it hurts. |
| Manufacturer self-service portal | Too complex for v1. Partners onboarded manually by admin team. |
| Mobile apps (iOS/Android native) | Responsive web is the deliverable; native apps not on roadmap. |
| Uzbek Cyrillic (`uz-Cyrl`) | Primary Uzbek audience reads Latin. Doubles translation work. Add only if user research demands it. |
| External API integrations for product data | All data entered by humans through admin in v1 to ensure quality. |
| Payment processing / invoicing | Not an e-commerce platform. |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete (01-02) |
| FOUND-02 | Phase 1 | Complete (01-02) |
| FOUND-03 | Phase 1 | Partial (01-04 — routing SSOT + [locale] layout + 3-locale dicts landed; middleware `/` → `/uz/` redirect lands in 01-06) |
| FOUND-04 | Phase 1 | Complete (01-02) |
| FOUND-05 | Phase 1 | Partial (01-05 — Auth.js v5 edge-split, Resend magic-link, signIn admin-gate, DrizzleAdapter with D-09 dual session caps, bootstrapAdmin, login/admin pages, T-AUTH-02 test all landed; middleware admin cookie gate for `/[locale]/admin/*` lands in 01-06) |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Partial (01-04 — `<Analytics />` + `<SpeedInsights />` mount point added to [locale] layout; Sentry wiring + production deploy land in 01-07) |
| ADMIN-01 | Phase 2 | Complete (01-05 — Auth.js v5 magic-link signIn callback authorising admin_user.active=true; 01-06 — proxy.ts admin gate; 02-03 — proxy.ts D-15 idle/absolute cap via sessions.absoluteExpires; 02-08 — useActionState login form with check-email + access-denied banner + magic-link harvesting mitigation in sendVerificationRequest via isActiveAdminEmail helper; T-02-08-01 + T-02-08-02 anti-enumeration both layers; 02-17 — admin-session-cap.spec.ts flipped from 3 fixme cases to 3 live tests using createActiveAdminSession from 02-04 fixture, lifting "session expires on idle (24h) and absolute limit (7d)" guarantee from unit-level proxy.ts contract to live e2e probe — expired absolute_expires + expired sessions.expires both 307 to /uz/login with Max-Age=0 cookie clear; both windows valid → no /login redirect.) |
| ADMIN-02 | Phase 2 | Complete (02-01 — admin_invite schema; 02-07 — inviteAdmin + acceptInvite Server Actions with Pitfall #4 atomic single-use UPDATE, AdminInviteEmail React Email template via Resend, admins list with InviteAdminDialog, accept-invite landing page with constant-message rejection per T-02-07-06) |
| ADMIN-03 | Phase 2 | Complete (02-09 — saveCategory + deleteCategory Server Actions with atomic 1+3+1 row write per dbTx.transaction + logAudit + revalidateCategoryMove fan-out for D-12 re-parent; reusable LocaleTabs + SlugInput primitives; categories list/new/edit pages consume DataTable<TData> from 02-06; Phase-1 drizzle runtime client casing fix as Rule-1 deviation; 3 live-Neon specs cover create/update-with-parent-change/delete) |
| ADMIN-04 | Phase 2 | Complete (02-10 — saveManufacturer + deleteManufacturer Server Actions with universal pre-tx-snapshot + dbTx.transaction(base upsert + 3 translation upserts ON CONFLICT DO UPDATE on (manufacturer_id, locale) + logAudit) + post-commit revalidateManufacturer fan-out; reusable MediaUploader (single + multi modes, signed via Phase-1 /api/cloudinary/sign, DB stores public_id only per D-07 SSOT — regression-locker test asserts persisted column does not match `^https?://`); manufacturer list/new/edit pages reuse LocaleTabs + SlugInput verbatim from 02-09; 3 live-Neon specs lock create/update-with-logo-change/delete-cascade contracts) |
| ADMIN-05 | Phase 2 | Complete (02-11 — saveSpecField with D-08 runtime type-lock + renameSpecField with KEY_MISMATCH stale-form guard and limited cascade UPDATE on product_spec_values.extra_key (D-06) + softDeleteSpecField (D-07 setting deleted_at, audit `soft_delete_spec_field`) + deleteSpecField (D-07 hard-delete, audit `delete_spec_field` with after_json IS NULL — product_spec_values.spec_field_id is ON DELETE SET NULL per LIVE Phase-1 schema, value rows survive with NULL FK). saveSpecFieldGroup + reorderGroups + deleteSpecFieldGroup (D-09 group CRUD with 3-locale labels) + ConfirmDialog primitive (AlertDialog with optional type-the-key-to-confirm gate, reused by 02-13b) + repository wrapper src/lib/repositories/spec-field.ts (Open Q §4, findActiveSpecFields/findActiveSpecField auto-applying isNull(deletedAt) for Phase 3 public reads) + 18 admin route files reusing LocaleTabs verbatim + DataTable extended with manualPagination?: boolean opt-in (Open Q §3 — spec-fields list ~80 rows is client-paginated). 8 live-Neon specs lock the contracts; 21/21 vitest files / 95/95 tests green) |
| ADMIN-06 | Phase 2 | Complete (02-13a data tier — productInsertSchema + saveProduct 5-step atomic transaction with W7 refusal-to-elevate USE_PUBLISH_ACTION + 7 specs covering create/update/spec-replace-on-save/mtFlags-replace-on-save/refusal/rollback/duplicate; 02-13b lifecycle + UI — publishProduct + unpublishProduct + deleteProduct distinct-audit lifecycle Server Actions (atomic dual-column status + publishedAt writes; audit-before-delete inside tx) + the marquee single-page editor (D-01 LOCKED, NOT a wizard) with 3-locale tabs swapping ONLY the four translatable fields + non-translatable fields below tabs (categoryId, manufacturerId, SpecValuesEditor, MediaUploader×2) + per-locale completeness bars driven by useWatch + lifecycle row Save / Publish | Unpublish / Duplicate / Delete with Unpublish + Delete gated by ConfirmDialog + W7 two-layer status freeze (UI hardcodes status: persistedStatus on submit + saveProduct USE_PUBLISH_ACTION); 4 new specs lock lifecycle contracts; combined products test file 11/11 green) |
| ADMIN-07 | Phase 2 | Complete (02-10 ships MediaUploader (CldUploadWidget wrapper with single + multi modes, dnd-kit reorder via useFieldArray.move(), DB invariant: persists ONLY public_id strings — D-07 SSOT regression-locker spec asserts persisted column doesn't match `^https?://`); 02-13b wires two MediaUploader instances into the product editor (images mode='multi' folder='products' maxFiles=10; datasheets mode='multi' folder='products' accept='pdf' maxFiles=5) with a UI shape adapter flattening `{ publicId }[]` → `string[]` on submit; 02-14 closes the loop — Pitfall #5 parity smoke (Task 14.0) returned PARITY-MISMATCH via static source analysis of pinned next-cloudinary 6.17.5 / @cloudinary-util/url-loader@5.10.4 dist/index.js:67-89: widget POSTs `{ paramsToSign }` and reads `result.signature` while Phase-1 endpoint expected top-level `{ folder }` and signed server-generated `{ folder, timestamp }` — incompatible on BOTH the request shape AND the signature scope. Fix: bodySchema widened to z.union([{ folder } legacy, { paramsToSign } widget]); widget branch validates paramsToSign.folder against FOLDER_ALLOWLIST (T-CLD-02 preserved) then signs paramsToSign verbatim — every param Cloudinary will receive is in the HMAC input (the literal Pitfall #5 mitigation from 02-RESEARCH.md). Returns `{ signature, apiKey, cloudName }` for the widget branch (no server timestamp/folder leak — the widget already has those). 9 baseline tests preserved + 3 new tests for widget branch (paramsToSign-signs-verbatim with independent-recompute byte-parity assertion via cloudinary.utils.api_sign_request, folder-allowlist-on-widget-shape, missing-folder-on-widget-shape) + 1 new jsdom test file tests/components/media-uploader.test.tsx with 3 specs locking the handler contract via vi.mock('next-cloudinary'); media-dirty Save-button suffix prevents the "dragged thumbnails but didn't hit Save" footgun via formState.dirtyFields-driven label) |
| ADMIN-08 | Phase 2 | Complete (02-13a duplicateProduct Server Action — full clone with status forced 'draft', publishedAt forced null, sku NOT cloned (unique column), per-locale slug suffixed `-copy`, spec values + per-locale text translations + MT flags cloned 1-for-1, audit action='duplicate_product'; 02-13b — Duplicate row action wired into the products list table AND a Duplicate button in the editor lifecycle row; both call duplicateProduct via React.useTransition and route the admin to the clone's edit page on success) |
| ADMIN-09 | Phase 2 | Complete (02-01 productTranslationFieldFlags sibling table; 02-13a write path — productInsertSchema accepts mtFlags as per-locale Record<fieldName, boolean>; saveProduct does replace-on-save inside the atomic tx; 02-13b — MachineTranslatedToggle client component (Controller + Checkbox bound to mtFlags.${locale}.${fieldName}) renders inline alongside every translatable field in the editor; D-05 visual cue (amber left-border + 'MT' badge on the Label) applies via useWatch on the same RHF path so the cue updates as the toggle flips) |
| ADMIN-10 | Phase 2 | Complete (02-01 schema substrate — product_translation_completeness pgView computing per-locale percent over name+slug+short_desc+long_desc plus required-text spec values; 02-12 — findProductCompleteness + findCompletenessForProducts server helpers wrapping the pgView with locale-narrowing type-guard and missing-row-defaults-to-0 contract; <TranslationCompleteness percent={N} /> progress bar + <TranslationDots completeness={...} /> 3-locale dot indicator client components with D-04 thresholds (green ≥95 / amber ≥50 / red <50) hard-coded; 3 live-Neon specs lock view math 25/50/100 base + 100/80/80 W10 spec; consumed by 02-13b product editor + products list) |
| ADMIN-11 | Phase 2 | Complete (02-04 — logAudit(tx, ...) + closed AUDIT_ACTIONS const tuple of 13 actions + withAdminAction wrapper + auth.ts events.signIn/signOut/session_revoked emit; 02-07 — first end-to-end production callsites: action='invite' on inviteAdmin tx + action='update' on acceptInvite tx; 02-09..02-15 — every Wave-2/3/4 mutation flows through withAdminAction → logAudit emitting one row per mutation tx with distinct AUDIT_ACTIONS values; 02-16 — read-only audit log viewer at /[locale]/admin/audit ships as 3 files (page.tsx RSC + audit-table.tsx client island + audit-row-detail.tsx pure presentational), zero mutation Server Actions, server-paginated 50/page ordered by `at DESC`, URL-driven filters via patchQuery (actor ILIKE, action eq from AUDIT_ACTIONS, entityType eq from local ENTITY_TYPES tuple, from/to date range — all Drizzle-parameterised per T-02-16-01), row expansion via local React.useState rendering before/after JSON side-by-side; writer + viewer both complete end-to-end) |
| ADMIN-12 | Phase 2 | Complete (02-15) |
| CAT-01 | Phase 3 | Pending |
| CAT-02 | Phase 3 | Pending |
| CAT-03 | Phase 3 | Pending |
| CAT-04 | Phase 3 | Pending |
| CAT-05 | Phase 3 | Pending |
| CAT-06 | Phase 3 | Pending |
| CAT-07 | Phase 3 | Pending |
| CAT-08 | Phase 3 | Pending |
| SRCH-01 | Phase 3 | Pending |
| SRCH-02 | Phase 3 | Pending |
| SRCH-03 | Phase 3 | Pending |
| SRCH-04 | Phase 3 | Pending |
| SRCH-05 | Phase 3 | Pending |
| CONT-01 | Phase 4 | Partial (04-02 Tiptap v3.22.5 + TIPTAP_EXTENSIONS shared + CloudinaryImage extension; 04-04 RED specs locking action + form contracts; 04-05 recipe Server Actions GREEN with W7 + replace-on-save + audit + OLD ∪ NEW revalidate fan-out; 04-07 — recipe admin UI surface complete: RecipeBodyEditor (Tiptap with immediatelyRender:false locked + Controller-wrapped + toolbar Bold/Italic/Link/H2-H4/lists/blockquote/table/image-via-CldUploadWidget folder=recipes) + LinkedProductsPicker (RHF useFieldArray + filter on name/sku + dnd-kit horizontalListSortingStrategy reorder + sequential position reassignment) + RecipeForm (LocaleTabs swap of title/slug/excerpt/body + featured image MediaUploader folder=recipes + LinkedProductsPicker + W7 status freeze) + 4 admin route files (list/new/edit + table client island with sonner toast feedback) + sidebar nav entry; 4/4 jsdom specs GREEN; industry equivalent lands in 04-08; public reading + JSON-LD lands in 04-09 to fully close CONT-01) |
| CONT-02 | Phase 4 | Partial (04-02 — same Tiptap foundation; 04-04 — 7 it.skip RED specs in tests/actions/industries.test.ts + 2 jsdom RED specs in tests/components/industry-form.test.tsx + 2 Playwright fixme specs in tests/e2e/industry-detail.spec.ts + 1 admin-industry-form smoke spec; 04-06 — industry Server Actions GREEN-flipped 7/7 live-Neon specs (saveIndustry + publishIndustry + unpublishIndustry + deleteIndustry as exact textual mirror of saveRecipe ↔ deleteRecipe — 5-step transaction + W7 refusal + atomic dual-column lifecycle + audit-before-delete + OLD ∪ NEW revalidate fan-out); 04-08 — industry admin UI complete: IndustryBodyEditor (verbatim mirror of RecipeBodyEditor with options.folder='industries' + immediatelyRender:false P4-1) + IndustryForm (mirror of RecipeForm wired to industryInsertSchema + saveIndustry/publishIndustry/unpublishIndustry/deleteIndustry; LinkedProductsPicker reused literally from 04-07; LocaleTabs swap of title/slug/excerpt/body across uz/ru/en; W7 two-layer status freeze; lifecycle row Save/Publish|Unpublish/Delete with ConfirmDialog gates) + 4 admin route files (list with TranslationDots completeness, client island with sonner toast, new + edit RSC routes); sidebar gains Industries entry with uz/ru/en translations Sohalar/Отрасли/Industries; 2 jsdom specs flipped from RED to GREEN regression-locking Tiptap mount + LocaleTabs swap; full closure when public industry pages ship in 04-10 and admin-industry-form Playwright spec lights up in 04-12) |
| CONT-03 | Phase 4 | Partial (04-02 + 04-03 — server-side renderTiptapToHtml + nodeMapping.image override + getRecipeBySlug/getIndustryBySlug with Phase-3 D-05 fallback cascade + usedFallbackLocale flag + findPublishedRecipes/Industries list helpers; 04-04 — 4 Playwright fixme specs (visitor reads /[locale]/recipes/<slug> and /[locale]/industries/<slug> with prose body + JSON-LD; locale-fallback banner D-05 mirrors); public RSC pages 04-09 + 04-10 wire it together GREEN-flipping the e2e stubs) |
| CONT-04 | Phase 4 | Partial (04-01 schema + 04-03 lib — getUsedInForProduct reading productUsedInView with cap-at-6 per D-09 + revalidateUsedIn cache-tag fan-out shipped; 04-04 — 2 Playwright fixme specs in tests/e2e/used-in-section.spec.ts (visible with cross-links + hidden when 0 cross-links); 04-05 + 04-06 — Used-in revalidate fan-out OLD ∪ NEW linkedProductIds union GREEN-locked in saveRecipe + saveIndustry live-Neon specs (revalidateTag spy asserts used-in:<pid> + product:<pid> for every productId in the union); UsedInSection RSC mounted on product detail page lands in 04-11 GREEN-flipping the e2e stubs) |
| CONT-05 | Phase 4 | Partial (04-04 RED stubs — replace-on-save semantics for linkedProductIds + LinkedProductsPicker jsdom RED stubs + seed-content fixture orchestrator with seedProductRecipes + seedProductIndustries auto-incrementing junction inserts; 04-05 + 04-06 — M:N junction Server Action implementation GREEN-flipped: replace-on-save semantics for product_recipes + product_industries (DELETE all + INSERT new with position field set, junction rows match input array, never UPDATE); 04-07 — recipe-side admin UI picker complete: LinkedProductsPicker client component RHF useFieldArray + inline filter on name/sku + dnd-kit horizontalListSortingStrategy chip reorder + sequential position reassignment 0..N-1 on every append/remove/reorder (deviation Rule 2 from plan), src/lib/products.ts findAllPublishedProducts(locale) helper for option pre-fetch in parent RSC, 2/2 jsdom specs GREEN; 04-08 — industry-side picker reuse complete: IndustryForm imports the SAME LinkedProductsPicker from @/components/admin/linked-products-picker (no industry-specific picker file shipped; picker is generic by options-prop design); both RecipeForm and IndustryForm now write into their respective `linkedProductIds` field arrays via the same shared component; full closure when 04-12 lights up the admin-recipe-form + admin-industry-form Playwright round-trip specs validating the M:N picker → save → public surface pipeline end-to-end) |
| CONT-06 | Phase 4 | Partial (04-03 — techArticleJsonLd helper extending Phase-3 set with WithContext<TechArticle> shape + author=publisher=Manometr Org + optional description/image/mentions conditional-spread + mentions as Product sub-objects with no offers per Phase 3 D-08; consumed by 04-09 + 04-10 RSC pages with XSS escape via Phase-3 D-09 \\u003c pattern) |
| MFG-01 | Phase 3 | Pending |
| MFG-02 | Phase 3 | Pending |
| CTA-01 | Phase 5 | Pending |
| CTA-02 | Phase 5 | Pending |
| CTA-03 | Phase 5 | Pending |
| CTA-04 | Phase 5 | Pending |
| SEO-01 | Phase 3 | Pending |
| SEO-02 | Phase 3 | Pending |
| SEO-03 | Phase 3 | Pending |
| SEO-04 | Phase 3 | Pending |
| SEO-05 | Phase 3 | Pending |
| SEO-06 | Phase 5 | Pending |
| OPS-01 | Phase 2 | Complete-with-deferred-validation (02-17 — admin-edit-revalidates Playwright spec at tests/e2e/admin-edit-revalidates.spec.ts authored as the OPS-01 merge-blocking gate: drives admin login via DB-direct verification_tokens consumption per Pitfall #12 + edits a seed product's uz name through the real editor + asserts new name visible on reloaded admin list within 5s — admin list reads through SAME cache layer revalidateProduct() invalidates so a missing revalidateTag call per Pitfall #3 fails the spec identically; .github/workflows/e2e-preview.yml waits for Vercel preview via patrickedqvist/wait-for-vercel-preview@v1.3.1 then runs the spec with BASE_URL=$PREVIEW_URL; playwright.config.ts threads BASE_URL + x-vercel-protection-bypass at the config layer so every spec honors preview Deployment Protection automatically; spec asserts via /uz/admin/products until Phase 3 ships /uz/products/<slug> at which point a one-line goto target swap migrates the assertion. Local artifacts shipped + locally verified. DEF-2-17-01 tracks deployment-side validation: workflow green on real PR + RED on regression PR with revalidateProduct removed + branch-protection rule requiring `e2e-preview / OPS-01` status check on main/master. Transitions to fully validated when the user replies with PR URLs + branch protection confirmation.) |
| OPS-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 52 total (7 FOUND + 12 ADMIN + 8 CAT + 5 SRCH + 6 CONT + 2 MFG + 4 CTA + 6 SEO + 2 OPS)
- Mapped to phases: 52
- Unmapped: 0

**By phase:**
- Phase 1 (Foundations): 7 requirements
- Phase 2 (Admin Panel): 13 requirements (12 ADMIN + OPS-01)
- Phase 3 (Public Rendering + Search + SEO): 20 requirements (8 CAT + 5 SRCH + 2 MFG + 5 SEO)
- Phase 4 (Content Features): 6 requirements (6 CONT)
- Phase 5 (Contact + Launch): 6 requirements (4 CTA + SEO-06 + OPS-02)

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-29 — Phase 2 plan 02-17 REVALIDATION-E2E-GATE complete-with-deferred-validation; OPS-01 closes (admin-edit-revalidates Playwright spec authored as the OPS-01 merge-blocking gate + GitHub Actions workflow + playwright.config.ts BASE_URL/bypass threading; admin-session-cap spec flipped from fixme to live, validating ADMIN-01 session-cap guarantee at e2e level). Phase 2 (Admin Panel) is now LOCALLY COMPLETE 18/18 — all 13 Phase-2 requirements (12 ADMIN + OPS-01) are closed in code + tests + admin UI. DEF-2-17-01 tracks the deferred deployment-side OPS-01 validation (workflow green on real PR + RED on regression PR + branch-protection rule requiring `e2e-preview / OPS-01` status check on main/master) as the user's post-merge environmental work. Phase 3 (Public Rendering, Search, SEO) opens next.*
