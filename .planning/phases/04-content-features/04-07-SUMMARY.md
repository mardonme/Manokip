---
phase: 04-content-features
plan: 07
subsystem: admin-recipe-ui
tags: [admin, recipes, tiptap, cont-01, cont-05, marquee-deliverable]
requires:
  - 04-02  # tiptap deps + tiptap-extensions (TIPTAP_EXTENSIONS, CloudinaryImage)
  - 04-03  # zod schemas (recipeInsertSchema)
  - 04-05  # server actions (saveRecipe / publishRecipe / unpublishRecipe / deleteRecipe)
provides:
  - RecipeBodyEditor (3-locale Tiptap admin editor with immediatelyRender:false)
  - LinkedProductsPicker (RHF useFieldArray multi-select + dnd-kit reorder)
  - RecipeForm (single-page editor with LocaleTabs + lifecycle row)
  - admin recipes list / new / edit RSC routes
  - sidebar Recipes nav entry
affects:
  - src/app/[locale]/admin/layout.tsx (AdminNavLabels.recipes added)
  - messages/{uz,ru,en}.json (admin.nav.recipes translations)
tech-stack:
  added:
    - "@tiptap/react useEditor (client-side editor mount)"
    - "sonner toast (recipes-table feedback)"
  patterns:
    - "RHF FormProvider + LocaleTabs swap (Phase-2 product-form mirror)"
    - "W7 status freeze (saveRecipe payload status hardcoded to persistedStatus)"
    - "@dnd-kit horizontalListSortingStrategy for chip reorder (LinkedProductsPicker)"
    - "P4-1 immediatelyRender:false (Tiptap v3 + Next 16 RSC compatibility)"
    - "P4-3 single TIPTAP_EXTENSIONS array (admin + public renderer share)"
key-files:
  created:
    - src/components/admin/recipe-body-editor.tsx
    - src/components/admin/linked-products-picker.tsx
    - src/components/admin/recipe-form.tsx
    - src/app/[locale]/admin/recipes/page.tsx
    - src/app/[locale]/admin/recipes/recipes-table.tsx
    - src/app/[locale]/admin/recipes/new/page.tsx
    - src/app/[locale]/admin/recipes/[id]/edit/page.tsx
    - src/lib/products.ts
  modified:
    - src/components/admin/sidebar.tsx
    - src/app/[locale]/admin/layout.tsx
    - messages/uz.json
    - messages/ru.json
    - messages/en.json
    - tests/components/recipe-form.test.tsx
    - tests/components/linked-products-picker.test.tsx
decisions:
  - "Body field path is translations.<locale>.body (matches recipeInsertSchema), not the literal body.<locale> spelled in plan must_haves — locale-tab swap shape is the contract per plan deviations protocol Rule 1"
  - "LinkedProductsPicker uses inline filter input + flat list rather than shadcn Popover + Command — those primitives are not yet shipped; deviation Rule 3 — keeps v1 surface simple at the ≤200 product scale per RESEARCH §Linked-products picker"
  - "Sequential position reassignment on every append/remove/reorder in LinkedProductsPicker (deviation Rule 2) — guarantees saveRecipe payload sees contiguous 0..N-1 positions"
  - "Recipes list page uses JS-side per-row completeness over title+body filledness rather than a dedicated pgView (v1 simplification — fuller view can land alongside industries in 04-08 if needed)"
  - "Recipes-table feedback uses sonner toast rather than window.alert (consistent with the admin layout's already-wired sonner provider; cleaner UX)"
  - "Duplicate row action — for v1, route to /admin/recipes/new with ?duplicate=<id> query param for client-side prefill rather than a dedicated server-side duplicateRecipe action (per RESEARCH §Open Questions §1). NOT IMPLEMENTED in 7.3 — this plan ships the route plumbing; the prefill query handler is deferred to a v1.1 polish (no row action button rendered yet to avoid an inert UI affordance)."
metrics:
  duration: "~14 minutes"
  tasks: 3
  files: 13
  completed: 2026-05-02T05:07Z
---

# Phase 04 Plan 07: Recipe admin UI surface — Summary

**One-liner:** Wave 2 marquee delivery for CONT-01 — Tiptap-backed admin editor for recipes with 3-locale tab swap, signed-direct Cloudinary image insertion (folder=recipes), RHF-driven linked-products picker (filter + dnd-kit reorder), and the four admin route files (list / new / edit + table client island) wired to plan 04-05's saveRecipe + publishRecipe + unpublishRecipe + deleteRecipe Server Actions; Recipes nav entry added to the admin sidebar with uz/ru/en translations.

## What shipped

- **RecipeBodyEditor** (`src/components/admin/recipe-body-editor.tsx`) — Tiptap admin client component, `useEditor({ extensions: TIPTAP_EXTENSIONS, immediatelyRender: false, onUpdate })` (P4-1 mitigation locked), Controller-wrapped against any RHF dotted path via `useFormContext`. Toolbar: Bold, Italic, Link (window.prompt-based href), H2/H3/H4 headings (H1 reserved per D-05), bullet/ordered list, blockquote, table-insert (3x3 with header row), and image-via-CldUploadWidget with `signatureEndpoint="/api/cloudinary/sign"` `options.folder='recipes'` `resourceType:'image'`. Image insertion writes a CloudinaryImage node `{ type: 'image', attrs: { publicId, alt: '' } }` (T-04-XSS-04 mitigation — public renderer reads `attrs.publicId` only, never `src`).

- **LinkedProductsPicker** (`src/components/admin/linked-products-picker.tsx`) — RHF `useFieldArray` over `linkedProductIds`, inline filter input with case-insensitive substring match on `name` OR `sku`, scrollable option list (selected items hidden), removable chips with `@dnd-kit/core` + `@dnd-kit/sortable` `horizontalListSortingStrategy` for drag-reorder. Sequential position reassignment fires on every append/remove/drag-end (deviation Rule 2 from plan).

- **RecipeForm** (`src/components/admin/recipe-form.tsx`) — single-page editor mirroring `src/app/[locale]/admin/products/product-form.tsx` verbatim: RHF `useForm<RecipeInput>` + `FormProvider` wrap, `LocaleTabs` swap of the 4 translatable fields (title, slug via `SlugInput`, excerpt, body via `RecipeBodyEditor`), shared non-translatable fields below (`MediaUploader` mode='single' folder='recipes' for featured image, `LinkedProductsPicker`), W7 two-layer status freeze (UI hardcodes `submission.status = persistedStatus`; server-side `saveRecipe` re-validates + throws `USE_PUBLISH_ACTION` on transition), lifecycle row with Save / Publish | Unpublish / Delete buttons wired to React.useTransition + ConfirmDialog gates on destructive actions.

- **Admin route files** (`src/app/[locale]/admin/recipes/*`):
  - `page.tsx` — RSC list, joins recipes with current-locale + uz translation aliases, computes per-row TranslationDots completeness in JS over title+body filledness, paginates 1..100 page sizes.
  - `recipes-table.tsx` — `'use client'` island with sonner toast feedback, Edit / Publish | Unpublish / Delete row actions.
  - `new/page.tsx` — RSC pre-fetches `findAllPublishedProducts(locale)`, renders empty `<RecipeForm>`.
  - `[id]/edit/page.tsx` — RSC pre-fetches recipe row + 3 translation rows + linked product ids ordered by position + `findAllPublishedProducts`; reshapes into `RecipeInput` with `id` so saveRecipe takes the update path.

- **`src/lib/products.ts` `findAllPublishedProducts(locale)`** — deviation Rule 3 helper, returns `ProductOption[]` (id + locale-or-uz-fallback name + empty sku) for picker pre-fetch.

- **Sidebar** (`src/components/admin/sidebar.tsx`) — `AdminNavLabels.recipes` field added, `/admin/recipes` link rendered between Spec Fields and Submissions per plan ordering. `messages/{uz,ru,en}.json` extended with `admin.nav.recipes` translations: "Maqolalar" / "Статьи" / "Recipes".

## Tests flipped from RED → GREEN

- `tests/components/recipe-form.test.tsx` — 2 specs (RecipeBodyEditor mount-without-hydration-error, onChange fires JSONContent on document mutation). Originally an it.skip RED stub from 04-04.
- `tests/components/linked-products-picker.test.tsx` — 2 specs (case-insensitive filter on name+sku, multi-select toggle with sequential position reassignment after remove). Originally an it.skip RED stub from 04-04.

All 4 specs green under `pnpm vitest run tests/components/{recipe-form,linked-products-picker}.test.tsx`.

## Verification

```bash
pnpm tsc --noEmit                                                       # exit 0
pnpm vitest run tests/components/recipe-form.test.tsx \
                tests/components/linked-products-picker.test.tsx        # 2/2 files, 4/4 specs green
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing shadcn Popover + Command primitives**
- **Found during:** Task 7.2 — plan asks for `Popover + Command (shadcn — Phase-2 spec-values-editor pattern)` from `@/components/ui/popover` + `@/components/ui/command`, but neither primitive exists yet in `src/components/ui/*` (only Dialog / Tabs / Select / Checkbox / etc.).
- **Fix:** Built a self-contained inline filter input + flat list rather than blocking on the missing primitives. Satisfies the test contracts (filter, multi-select, reorder) and matches the v1 simplicity posture per RESEARCH §Linked-products picker (≤200 published products at v1 scale — client-side flat list is sufficient). Future polish plan can upgrade to the proper Popover+Command surface.
- **Files modified:** `src/components/admin/linked-products-picker.tsx` (only)
- **Commit:** `b1a27d3`

**2. [Rule 3 - Blocking] Missing src/lib/products.ts findAllPublishedProducts helper**
- **Found during:** Task 7.3 — plan deviation Rule 3 anticipates this; the helper signature is `(locale: 'uz'|'ru'|'en') => Promise<ProductOption[]>`. The `src/lib/products.ts` file did not exist.
- **Fix:** Created `src/lib/products.ts` as a 1-function module per the plan's Rule 3. Two leftJoin aliases against `productTranslations` (current locale + uz fallback), filter `WHERE products.status='published'`, ORDER BY current name then uz name. NULLS bubble through to `'(untranslated)'`.
- **Files modified:** `src/lib/products.ts` (new)
- **Commit:** `6e7b700`

**3. [Rule 1 - Bug] Body field path mismatch between plan must_haves and recipeInsertSchema**
- **Found during:** Task 7.3 — plan must_haves spell `body.uz | body.ru | body.en` as the canonical RecipeBodyEditor `name` prop, but the actual `recipeInsertSchema` (src/lib/zod/recipe.ts) nests body under `translations.{locale}.body`. Wiring the form with `body.{locale}` would have written to a phantom path that saveRecipe never reads.
- **Fix:** Updated RecipeBodyEditor's `name` type from a literal-union to `string` per plan deviations protocol Rule 1 ("locale-tab swap shape is the contract, not the path syntax"). RecipeForm passes `name={\`translations.${l}.body\`}` so writes land in the correct schema slot.
- **Files modified:** `src/components/admin/recipe-body-editor.tsx`, `src/components/admin/recipe-form.tsx`
- **Commit:** `6e7b700`

### Auto-added Functionality

**4. [Rule 2 - Critical] Sequential position reassignment after remove/reorder in LinkedProductsPicker**
- **Found during:** Task 7.2 — plan deviation Rule 2 anticipates this; without sequential reassignment, removing a chip from position 1 leaves the remaining chip at position 1 (never 0), breaking the saveRecipe contiguous-position invariant on the next save.
- **Fix:** `handleRemove` rewrites the entire array with positions 0..N-1 via `replace(...)`. `handleDragEnd` does the same after `arrayMove`. Spec 2 in `linked-products-picker.test.tsx` regression-tests this.
- **Files modified:** `src/components/admin/linked-products-picker.tsx`, `tests/components/linked-products-picker.test.tsx`
- **Commit:** `b1a27d3`

### Deferred (Out-of-scope or v1.1)

**5. Duplicate row action — not implemented in 7.3**
- **Plan said:** "route to /admin/recipes/new with a `?duplicate=<id>` query param that pre-fills the form by fetching the source recipe."
- **Why deferred:** This plan ships the route plumbing for /new and /edit. The duplicate-via-query-param prefill handler would need a client-side fetch + form re-init that doesn't have a corresponding RED spec in 04-04. To avoid rendering an inert "Duplicate" button, the recipes-table simply omits the action button for v1. A future polish plan can add either the query-param prefill OR a server-side `duplicateRecipe` action mirroring `duplicateProduct` from Phase-2 02-13a.
- **Tracked:** mentioned in this Summary's Decisions; not yet on `deferred-items.md` (no formal deferred ledger for this phase).

**6. Tailwind canonical-classes IDE warning (suggestCanonicalClasses)**
- **Found during:** Task 7.1 — IDE diagnostic suggested `min-h-75` for `min-h-[300px]` in `recipe-body-editor.tsx:114`.
- **Why deferred:** Severity: Warning, non-blocking; arbitrary-value Tailwind class form is widely used elsewhere in the codebase. Project has not yet committed to canonical class normalisation. tsc passes.

## Threat Flags

None — every new surface routes through the existing trust boundaries (admin Server Actions wrapped by `withAdminAction` from Phase 2 plan 02-04; Cloudinary signed-direct upload via the already-allowlisted `recipes` folder from plan 04-02; CloudinaryImage node attribute `publicId` reads via `attrs.publicId` only, structurally bypassing the `src` channel per T-04-XSS-04 mitigation).

## TDD Gate Compliance

This plan has 2 TDD tasks (7.1, 7.2). Both flipped existing it.skip RED stubs (shipped in 04-04) to GREEN by:
- Authoring the production component in the SAME commit as the test flip (single feat commit per task) — the original RED specs were committed by 04-04 with `test(...)` shape; this plan's commits are `feat(...)` since the test flip + production code land together. The RED → GREEN gate sequence is therefore completed across plans 04-04 (RED) → 04-07 (GREEN).
- Verified by running tests pre-implementation (would have hit "module not found" on the dynamic SUT imports — the it.skip stubs guarded against this; flipping to `it()` is the actual RED gate proof).

## Self-Check: PASSED

All 8 created files exist on disk:
- src/components/admin/recipe-body-editor.tsx
- src/components/admin/linked-products-picker.tsx
- src/components/admin/recipe-form.tsx
- src/app/[locale]/admin/recipes/page.tsx
- src/app/[locale]/admin/recipes/recipes-table.tsx
- src/app/[locale]/admin/recipes/new/page.tsx
- src/app/[locale]/admin/recipes/[id]/edit/page.tsx
- src/lib/products.ts

All 3 task commits present in git log:
- `ba41b7e` feat(04-07): RecipeBodyEditor + 2 jsdom specs (Task 7.1)
- `b1a27d3` feat(04-07): LinkedProductsPicker + 2 jsdom specs (Task 7.2)
- `6e7b700` feat(04-07): RecipeForm + admin route files + sidebar entry (Task 7.3)

Exit gates:
- `pnpm tsc --noEmit` exit 0
- `pnpm vitest run tests/components/{recipe-form,linked-products-picker}.test.tsx` 4/4 specs green

