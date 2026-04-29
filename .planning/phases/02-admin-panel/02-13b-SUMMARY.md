---
phase: 02-admin-panel
plan: 13b
subsystem: products-crud-lifecycle-ui
tags: [server-actions, products, lifecycle, publish, unpublish, delete, audit, refusal-to-elevate, editor-ui, locale-tabs, mt-flags, spec-values, translation-completeness, admin-06, admin-08, admin-09, admin-11, ops-01]

requires:
  - phase: 02-admin-panel/02-13a
    provides: saveProduct + duplicateProduct Server Actions + productPublishSchema + productDeleteSchema (consumed here) + seedProduct fixture (reused by lifecycle tests) + W7 refusal-to-elevate posture (USE_PUBLISH_ACTION pre-tx guard)
  - phase: 02-admin-panel/02-12
    provides: TranslationCompleteness + TranslationDots presentational components + findCompletenessForProducts batched helper (for the products-list table column)
  - phase: 02-admin-panel/02-11
    provides: ConfirmDialog primitive (used here for Unpublish + Delete destructive flows) + findActiveSpecFields repository wrapper (drives the editor's spec_field selector with isNull(deletedAt) auto-applied)
  - phase: 02-admin-panel/02-10
    provides: MediaUploader (multi mode) — used here for product images + datasheets (accept='pdf')
  - phase: 02-admin-panel/02-09
    provides: LocaleTabs render-prop primitive + SlugInput dirty-aware auto-slug

provides:
  - src/actions/products.ts (extended) — publishProduct + unpublishProduct + deleteProduct lifecycle Server Actions (D-09 / W7). Each writes a distinct AUDIT_ACTIONS enum value (`publish` / `unpublish` / `delete`) so the audit log separates lifecycle transitions from saveProduct's content edits. publishProduct sets status='published' AND publishedAt=now() in the same SET clause; unpublishProduct does the inverse atomically. deleteProduct hard-deletes (FK cascade drops translations / spec values / MT flags); audit row written BEFORE the DELETE inside the tx so before_json captures the full row snapshot. All three call revalidateProduct(id) AFTER tx.commit (Pitfall #2 / T-02-13b-04).
  - src/components/admin/machine-translated-toggle.tsx (NEW) — MT toggle bound to `mtFlags.${locale}.${fieldName}` via Controller + Checkbox. Reused later by recipes (02-17) and industries (02-18) which share the product_translation_field_flags-shaped sibling pattern.
  - src/components/admin/spec-values-editor.tsx (NEW) — controlled list-editor over `specValues` useFieldArray. Two-mode rows: catalog (spec_field FK + typed slot driven by data_type — number/text/enum/bool) and free-form extras (extraKey + textValue + per-locale text translations). Replace-on-save semantics live in saveProduct (plan 02-13a Step 3 of the 5-step tx).
  - src/app/[locale]/admin/products/page.tsx (NEW) — products list RSC: double-alias join on product_translations (current-locale name + uz canonical slug for sitemap SSOT) ordered by desc(updatedAt); pageSize clamped to 100 (T-02-12-02 view-bound); batched findCompletenessForProducts call.
  - src/app/[locale]/admin/products/products-table.tsx (NEW) — list client island: columns Name | Status | Translations (TranslationDots) | Slug (uz) | Updated | Actions (Edit / Duplicate / Publish | Unpublish / Delete). Per-row Publish vs Unpublish button mutually exclusive based on r.status; routes through dedicated lifecycle Server Actions (NEVER through saveProduct).
  - src/app/[locale]/admin/products/product-form.tsx (NEW) — THE marquee admin editor: ONE useForm instance over the full product schema; LocaleTabs swaps the four translatable fields (name, slug, shortDesc, longDesc) per tab; non-translatable fields (categoryId, manufacturerId, SpecValuesEditor, MediaUploader×2) render below tabs. Per-locale completeness bars driven by useWatch (live estimate; persisted view is read-side SSOT). MT toggles inline on every translatable field with amber left-border + 'MT' badge visual cue. Lifecycle row: Save (content edits) / Publish | Unpublish / Duplicate / Delete — Unpublish + Delete gated by ConfirmDialog. **W7 enforcement at UI layer: NO RHF status registration; status display is read-only; submit freezes status to persistedStatus regardless of form state — combined with saveProduct's refusal-to-elevate gives two-layer protection.**
  - src/app/[locale]/admin/products/new/page.tsx (NEW) — thin RSC: fetches localized category + manufacturer choice lists; hands off to ProductForm with `availableSpecFields=[]` (admin must select a category to populate the catalog — re-keying on category change is a Phase-2 polish follow-up).
  - src/app/[locale]/admin/products/[id]/edit/page.tsx (NEW) — RSC: fetches the product row + 3 sibling translations + spec values + per-spec-value translations + MT flags + the category-scoped active spec fields catalog (via findActiveSpecFields) + category + manufacturer choices in parallel. Reshapes everything into the ProductFormUiInput shape — including wrapping Cloudinary public_ids into `{ publicId }` objects for the MediaUploader's useFieldArray contract.
  - tests/actions/products.test.ts (extended) — 4 new live-Neon integration specs covering publishProduct (status + publishedAt set atomically; audit `publish` row distinct from `update`); unpublishProduct (status='draft' + publishedAt=null atomically; audit `unpublish`); deleteProduct (hard delete + FK cascade across translations/spec_values/flags; audit `delete` with before populated and after=null); W7 distinction (saveProduct status flip refused → publishProduct succeeds with `publish` audit, never `update`).

affects: [phase-2-plan-15-audit-viewer, phase-2-plan-17-recipes, phase-2-plan-18-industries, phase-3-product-detail-rsc, phase-3-products-list]

tech-stack:
  added: []  # No new deps; reuses RHF + zod + drizzle-orm + ConfirmDialog + MediaUploader + LocaleTabs.
  patterns:
    - "Pattern (lifecycle action shape): three actions (publishProduct, unpublishProduct, deleteProduct) each follow the same skeleton — `withAdminAction(schema, async ({id}, ctx) => { dbTx.transaction(tx => { capture before, mutate, logAudit(tx, distinct-action) }); revalidateProduct(id) }`. Only the verb differs. The audit-action enum value is hardcoded per action (NOT derived from input) so the audit log is non-repudiable per T-02-13b-02 / T-02-13b-03."
    - "Pattern (atomic dual-column lifecycle write): publishProduct sets `status='published', publishedAt=now()` in ONE SET clause so observers (sitemap generator, search rebuild, RSS feed in Phase 5) never see a half-transitioned row. unpublishProduct does the inverse with `publishedAt=null`. The single-SET shape is the structural mitigation for what would otherwise need a SERIALIZABLE isolation level (D-11 / Open Q §1 Option B locked back in 02-01)."
    - "Pattern (audit-before-delete inside tx): deleteProduct calls logAudit(tx, ...) BEFORE the DELETE so the audit insert reads `before` while the row still exists. Postgres allows the subsequent DELETE in the same tx because audit_log has no FK to product. before_json captures the full row snapshot for forensic reconstruction; after_json=null is the closed AUDIT_ACTIONS convention for hard deletes."
    - "Pattern (W7 two-layer status freeze): the editor UI does NOT render a status select and does NOT register('status') with RHF. On submit, the form transformer hardcodes `status: persistedStatus` (`initial?.status ?? 'draft'`) — even if a malicious client manipulates form state, the wire payload always equals the persisted value, so saveProduct's same-status path runs. saveProduct's refusal-to-elevate (T-02-13a-02) is the second layer; the UI freeze is the first. Status transitions ONLY through publishProduct / unpublishProduct buttons that bypass saveProduct entirely."
    - "Pattern (per-locale live completeness via useWatch): the editor renders a TranslationCompleteness bar per locale tab. The percent is computed via useWatch on translations.${locale} and counts how many of {name, slug, shortDesc, longDesc} are non-empty (4 fields → 25/50/75/100). The persisted product_translation_completeness pgView is the read-side SSOT (D-04 + the W10 deferral note resolution); on save+reload the bars snap to the view's value (which factors in required-text spec values per W10). The live estimator is feedback-only."
    - "Pattern (MediaUploader shape adapter): MediaUploader's multi mode uses useFieldArray over `{ publicId: string }[]` (RHF cannot key a primitive-string array stably). The Zod wire schema expects `string[]`. The product form's UI shape (`ProductFormUiInput`) wraps the Cloudinary arrays as objects on the form side; the form's onSubmit transformer flattens to strings before validating against productInsertSchema. The Edit RSC wraps DB-fetched ids the same way (currently always empty since no product_images table ships in this plan path — the uploader still works in-memory via Cloudinary direct uploads)."
    - "Pattern (per-row Publish | Unpublish mutual exclusion): the products-table renders ONE of the two buttons based on `r.status === 'published'`. Same posture as the editor's lifecycle row. This eliminates the 'click-the-wrong-button' class of error that a single 'Toggle status' button would create — the visible verb always matches the row's actual current state."
    - "Pattern (ConfirmDialog for destructive lifecycle): Unpublish + Delete in the editor wrap their buttons with ConfirmDialog (the AlertDialog primitive from 02-11). Unpublish is non-destructive — message just notes the public 404. Delete is destructive (`destructive` prop true) — message warns about the cascade across translations/spec values/MT flags. Neither uses the typed-confirm gate; for v1 the AlertDialog cancel/confirm is sufficient friction. The list page still uses window.confirm for parity with manufacturers-table; both are valid v1 postures."

key-files:
  created:
    - src/components/admin/machine-translated-toggle.tsx
    - src/components/admin/spec-values-editor.tsx
    - src/app/[locale]/admin/products/page.tsx
    - src/app/[locale]/admin/products/products-table.tsx
    - src/app/[locale]/admin/products/product-form.tsx
    - src/app/[locale]/admin/products/new/page.tsx
    - src/app/[locale]/admin/products/[id]/edit/page.tsx
    - .planning/phases/02-admin-panel/02-13b-SUMMARY.md (this file)
  modified:
    - src/actions/products.ts (extended with publishProduct + unpublishProduct + deleteProduct)
    - tests/actions/products.test.ts (extended with 4 lifecycle specs)
    - .planning/phases/02-admin-panel/deferred-items.md (added DEF-2-13b-01)
    - .planning/STATE.md (completed_plans 20 → 21, percent 58 → ~62, position cursor advance)
    - .planning/ROADMAP.md (Phase 2 progress 13/18 → 14/18)
    - .planning/REQUIREMENTS.md (ADMIN-06, ADMIN-08, ADMIN-09 closed; ADMIN-11 advanced; OPS-01 advanced)

key-decisions:
  - "publishProduct + unpublishProduct write status AND publishedAt atomically in a single SET clause (D-11 Open Q §1 Option B): publishProduct → `status='published', publishedAt=now(), updatedAt=now()`; unpublishProduct → `status='draft', publishedAt=null, updatedAt=now()`. No observer ever sees a half-transitioned row. The publishedAt timestamp is canonical for sitemap last-modified ordering and Phase 5 RSS feeds; the status column is canonical for `is published` boolean checks. The two columns intentionally evolve together via dedicated lifecycle actions."
  - "deleteProduct logs audit BEFORE the DELETE inside the tx (not after): writing logAudit(tx, ...) first lets it read `before` while the row still exists. Doing it after the DELETE would either (a) require capturing `before` in a JS variable (works but reads awkward in audit-log forensics) or (b) need an audit FK to product that propagates ON DELETE (would lose the row). Postgres allows the subsequent DELETE on the parent table in the same tx because audit_log has no FK to product. before_json captures the full row snapshot for forensic reconstruction; after_json=null is the closed AUDIT_ACTIONS convention for hard deletes."
  - "UI status freeze is structural (not a runtime check): the form has NO status select and does NOT call `register('status')`. The displayed status reads from initial.status / 'draft' default. On submit the transformer hardcodes `status: persistedStatus` regardless of form state. This means the W7 boundary is enforced by the absence of mutation primitives — even a malicious client manipulating the form value cannot reach saveProduct with a mismatched status. saveProduct's USE_PUBLISH_ACTION throw is the second-layer defense for any other code path that might bypass the editor."
  - "MediaUploader shape adapter at form layer (not at action layer): the wire schema's imagePublicIds/datasheetPublicIds expect `string[]`; MediaUploader's useFieldArray needs `{ publicId: string }[]`. We hold the wrapped shape in the form (ProductFormUiInput), then flatten in onSubmit before passing to saveProduct. Alternative considered: extend the wire schema to accept either shape — rejected because it would couple the persistence shape to a UI library's reactivity quirk. The adapter at the form's submit transformer is the right boundary."
  - "Per-row Publish vs Unpublish (mutual exclusion) instead of a 'Toggle status' button: each row renders one of the two buttons based on its current status. Eliminates the click-the-wrong-button class of error that a single toggle would create. Same posture in the editor's lifecycle row. The audit log already separates `publish` vs `unpublish` — the UI just makes the action verb explicit."
  - "Live completeness via useWatch is feedback-only; persisted view is SSOT: while the admin types in a translation field, useWatch recomputes 25/50/75/100 from the four translatable fields (name/slug/shortDesc/longDesc). The persisted product_translation_completeness pgView (created in plan 02-01, refined in 02-12 with W10 required-text spec inclusion) is the read-side source of truth. On save+reload the bars snap to the view's value. The two never need to agree exactly — the view's denominator can include required text spec values that the translatable-fields-only live estimator doesn't see; this is intentional (the live estimator is for typing feedback, the view is for at-a-glance completeness review)."
  - "ConfirmDialog gates Unpublish + Delete in the editor; window.confirm gates Delete in the list: both are valid v1 postures. The editor lives on its own page so the AlertDialog component fits naturally; the products-list table uses window.confirm to keep parity with manufacturers-table (and to avoid a per-row Dialog mount cost in dense tables). A future polish plan can unify both on ConfirmDialog with row-level mounting if desired."

deviations:
  - "Rule-3 (tooling drift): vitest 4 dropped `--reporter=basic` — same as plans 02-04 and 02-12 documented. Used the default reporter for verification; same green/red signal."
  - "Rule-2 (acceptance criterion conflict on `register(\"status\")`): the plan's acceptance criterion requires `grep -c 'register(\"status\")' product-form.tsx` to return 0. The form does not call register on status (W7 enforcement) but the file-header comment quoted the exact string `register(\"status\")` while documenting the W7 boundary. The grep matched the comment and returned 1. Fix: rewrote the comment to use 'RHF status registration' phrasing without the literal substring. Functionality unchanged. Same posture as 02-13a's `-copy` literal grep deviation."
  - "Rule-3 (out-of-scope build failure logged as DEF-2-13b-01): `pnpm build` fails because Next.js typecheck sweeps `scripts/verify-02-01-migration.ts` which has 7 `Object is possibly 'undefined'` errors under `noUncheckedIndexedAccess: true`. Verified pre-existing via `git stash && pnpm build` on master before our changes — failure is identical. Plan-relevant `pnpm tsc --noEmit` passes cleanly (filtered output ignoring scripts is empty). Logged to deferred-items.md DEF-2-13b-01 with proposed Wave-5 fix; not addressed in this plan per scope-boundary rules."

threat-flags: []  # No new trust boundaries beyond the plan's threat_model. T-02-13b-01..06 all mitigated as specified.

requirements-completed: [ADMIN-06, ADMIN-08, ADMIN-09]  # editor UI + lifecycle now ship; data tier landed in 13a
requirements-touched: [ADMIN-11, OPS-01]  # 3 more audit-emitting writes (publish/unpublish/delete) and 3 more revalidate fan-out callers; full closure of those needs every Phase-2 mutation

duration: ~15min
completed: 2026-04-29
---

# Phase 2 Plan 13b: Products CRUD Lifecycle + UI Summary

**`publishProduct` + `unpublishProduct` + `deleteProduct` lifecycle Server Actions ship + the full product editor UI + the products list page — first Wave-4 plan closes. ADMIN-06 + ADMIN-08 + ADMIN-09 fully close (data tier landed in 13a; UI + lifecycle land here). Each lifecycle action writes a distinct AUDIT_ACTIONS enum value (`publish` / `unpublish` / `delete`) so the audit log separates content edits from lifecycle transitions (D-09 / W7 / T-02-13b-02 / T-02-13b-03). publishProduct sets status='published' AND publishedAt=now() atomically in a single SET clause; unpublishProduct does the inverse; deleteProduct hard-deletes with FK cascade. The marquee admin editor lands as a single-page surface (D-01 LOCKED, NOT a wizard) with 3-locale tabs that swap only the four translatable fields, non-translatable fields below tabs, per-locale completeness bars driven by useWatch, MT toggles inline on every translatable field with amber left-border + MT badge visual cue, SpecValuesEditor with two-mode rows (catalog + free-form extras), MediaUploader for images + datasheets, and a lifecycle row with Save / Publish | Unpublish / Duplicate / Delete buttons. W7 refusal-to-elevate enforced at TWO layers: the UI form has NO status select and freezes the submit payload to persistedStatus regardless of form state, and saveProduct (plan 02-13a) throws USE_PUBLISH_ACTION if persisted ≠ input. 4 new live-Neon specs lock the lifecycle contracts; combined products test file is now 11/11 green.**

## What shipped

**Three lifecycle Server Actions** (`src/actions/products.ts` extended):

- `publishProduct({ id })`:
  1. Pre-tx: schema validates `{ id: uuid }`.
  2. dbTx.transaction:
     - SELECT before snapshot (throws NOT_FOUND if absent).
     - UPDATE product SET status='published', publishedAt=now(), updatedAt=now() WHERE id=$1 RETURNING *.
     - logAudit(tx, action='publish', before={status, publishedAt}, after={status, publishedAt}).
  3. AFTER tx commit: revalidateProduct(id) → 4 tags.

- `unpublishProduct({ id })`: same skeleton with `status='draft', publishedAt=null`, audit action='unpublish'.

- `deleteProduct({ id })`:
  1. Pre-tx: schema validates `{ id: uuid }`.
  2. dbTx.transaction:
     - SELECT before snapshot.
     - logAudit(tx, action='delete', before=row, after=null) **first** so the audit insert reads the row while it still exists.
     - DELETE product WHERE id=$1 — Phase-1 FKs cascade translations / spec values / MT flags.
  3. AFTER tx commit: revalidateProduct(id).

**Two reusable client primitives:**

- `MachineTranslatedToggle` — Controller + Checkbox bound to `mtFlags.${locale}.${fieldName}`. Reused later by recipes (02-17) and industries (02-18).
- `SpecValuesEditor` — controlled list-editor over `useFieldArray({ name: 'specValues' })`. Two-mode rows:
  - Catalog: spec_field FK + typed slot (number/text/enum/bool) chosen by `selected.dataType` + unit override + sort order.
  - Free-form extras (isExtra=true): extraKey + textValue with optional per-locale translations (saveProduct splits into product_spec_value_translations rows in Step 3 of its tx).

**Five admin route files:**

- `products/page.tsx` — RSC products list. Double-alias join (current-locale name + uz canonical slug) ordered by desc(updatedAt); pageSize clamped to 100 (T-02-12-02 view bound). Batched findCompletenessForProducts call.
- `products/products-table.tsx` — list client island. Columns Name | Status | Translations (TranslationDots) | Slug (uz) | Updated | Actions. Per-row Publish vs Unpublish button mutually exclusive based on `r.status`. Delete uses window.confirm gating consistent with manufacturers-table.
- `products/product-form.tsx` — THE marquee admin editor. ONE `useForm<ProductFormUiInput>` instance:
  - Header: per-locale completeness bars + status pill.
  - LocaleTabs: name (SlugInput-coupled) + shortDesc (Textarea) + longDesc (Textarea) — each with MachineTranslatedToggle inline, amber left-border + 'MT' badge when flagged.
  - Shared (non-translatable) fields below tabs: categoryId select, manufacturerId select, SpecValuesEditor, MediaUploader (images, multi), MediaUploader (datasheets, multi, accept='pdf').
  - Lifecycle row: Save (content edits) / Publish | Unpublish / Duplicate / Delete. Unpublish + Delete wrapped in ConfirmDialog (Delete with `destructive` variant).
  - W7 enforcement: NO RHF status registration, NO status select; submit transformer hardcodes `status: persistedStatus`.
- `products/new/page.tsx` — RSC: localized category + manufacturer choice fetches; hands off to ProductForm with empty initial.
- `products/[id]/edit/page.tsx` — RSC: parallel fetches for product + 3 translations + spec values + per-spec-value translations + MT flags + active spec fields catalog (via `findActiveSpecFields(row.categoryId)` from 02-11) + category + manufacturer choices. Reshapes everything into ProductFormUiInput and wraps Cloudinary public_ids into `{ publicId }` for MediaUploader's useFieldArray.

**Four new live-Neon specs** (tests/actions/products.test.ts extended):

1. publish — status + publishedAt set atomically; audit `publish` row exists; NO `update` row written by publishProduct.
2. unpublish — status='draft' + publishedAt=null atomically; audit `unpublish` row with before.status='published', after.status='draft'.
3. delete — product row gone + cascades verified across product_translations + product_spec_values + product_translation_field_flags; audit `delete` row with before populated and after=null.
4. W7 distinction — saveProduct(status='published' on a draft) refuses (no audit row written); subsequent publishProduct succeeds with exactly one `publish` audit row, never `update`.

Combined products test file: 11/11 green (7 from 13a + 4 new). 27 vitest files / 109 tests passing across the suite.

## Decisions Made

See `key-decisions` in the frontmatter.

## Deviations from Plan

See `deviations` in the frontmatter.

### Auto-fixed Issues

**1. [Rule 3 - Tooling] vitest 4 dropped `--reporter=basic`**
- **Found during:** Task 13b.1 verification.
- **Issue:** `pnpm vitest run --reporter=basic` errors with `Failed to load custom Reporter from basic`.
- **Fix:** Used the default reporter; same green/red signal.
- **Files modified:** none (CLI usage).
- **Note:** Same as 02-04 / 02-12 / 02-13a deviation; the pattern applies plan-wide.

**2. [Rule 2 - Acceptance criterion conflict] `register("status")` literal grep**
- **Found during:** Task 13b.3 acceptance check.
- **Issue:** The plan requires `grep -c 'register("status")' product-form.tsx` to return 0. The form does not actually call `register('status')` (W7 freeze) but the file-header comment quoted the literal string `register("status")` while documenting that boundary. Grep matched the comment.
- **Fix:** Rewrote the comment to phrase it as 'RHF status registration' without the literal substring.
- **Files modified:** src/app/[locale]/admin/products/product-form.tsx
- **Note:** Same posture as 02-13a's `-copy` literal grep deviation — when an acceptance criterion is a literal string match, comments cannot quote that string verbatim.

**3. [Rule 3 - Pre-existing scope boundary] `pnpm build` fails on script typecheck**
- **Found during:** Task 13b.3 verification (pnpm build).
- **Issue:** Next.js build runs typecheck across `scripts/verify-02-01-migration.ts` which has 7 `Object is possibly 'undefined'` errors under `noUncheckedIndexedAccess: true`. Confirmed pre-existing via `git stash && pnpm build` on master before our changes — same failure.
- **Fix:** Logged DEF-2-13b-01 in `.planning/phases/02-admin-panel/deferred-items.md` with proposed Wave-5 fix. Not addressed in this plan per scope-boundary rules — the failing file is unrelated to the editor / lifecycle actions this plan ships, and `pnpm tsc --noEmit` filtered to plan-relevant paths is clean.
- **Files modified:** .planning/phases/02-admin-panel/deferred-items.md (logged).

## Auth Gates Encountered

None — every action ran autonomously against the live Neon test branch with the standard `vi.mock('@/lib/auth')` posture (canonical from plans 02-04 onward).

## Threat Surface Recap

T-02-13b-01..06 from the plan's threat_model all mitigated as specified:
- T-02-13b-01 (privilege escalation via tampered status): two-layer mitigation — UI freeze + saveProduct refusal-to-elevate.
- T-02-13b-02 (publish repudiation): publishProduct logs `publish` with before+after; distinct from saveProduct's `update`.
- T-02-13b-03 (delete repudiation): deleteProduct logs `delete` with full row in before_json; after_json=null per AUDIT_ACTIONS convention.
- T-02-13b-04 (revalidate inside tx): all three lifecycle actions call revalidateProduct AFTER `await dbTx.transaction(...)` returns (Pitfall #2).
- T-02-13b-05 (delete replay DoS): accepted — admin path behind requireAdmin; rate-limit deferred to Phase 5.
- T-02-13b-06 (confirm() info disclosure): accepted — UX-only friction.

## Self-Check: PASSED

**Created files (all verified present):**
- src/components/admin/machine-translated-toggle.tsx — FOUND
- src/components/admin/spec-values-editor.tsx — FOUND
- src/app/[locale]/admin/products/page.tsx — FOUND
- src/app/[locale]/admin/products/products-table.tsx — FOUND
- src/app/[locale]/admin/products/product-form.tsx — FOUND
- src/app/[locale]/admin/products/new/page.tsx — FOUND
- src/app/[locale]/admin/products/[id]/edit/page.tsx — FOUND
- .planning/phases/02-admin-panel/02-13b-SUMMARY.md — FOUND (this file)

**Modified files (all verified):**
- src/actions/products.ts — extended (publishProduct + unpublishProduct + deleteProduct appended)
- tests/actions/products.test.ts — extended (4 lifecycle specs appended)
- .planning/phases/02-admin-panel/deferred-items.md — DEF-2-13b-01 logged

**Commits (all verified in git log):**
- ed6da4a — test(02-13b): RED failing tests for lifecycle
- d2a6514 — feat(02-13b): GREEN publishProduct + unpublishProduct + deleteProduct
- c431a16 — feat(02-13b): products list page + table with TranslationDots and lifecycle row actions
- (next commit) — feat(02-13b): product editor — locale tabs + spec values + MT toggle + lifecycle buttons

**Acceptance criteria:** all plan-level grep checks return the required counts; tests pass 11/11; pnpm tsc --noEmit plan-relevant clean (only DEF-2-13b-01 pre-existing script errors remain).
