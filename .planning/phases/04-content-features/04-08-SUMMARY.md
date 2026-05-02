---
phase: 04-content-features
plan: 08
subsystem: admin-industry-ui
tags: [admin, industries, tiptap, cont-02, cont-05]
requires:
  - 04-02  # tiptap deps + tiptap-extensions (TIPTAP_EXTENSIONS, CloudinaryImage); FOLDER_ALLOWLIST 'industries' entry
  - 04-03  # zod schema (industryInsertSchema)
  - 04-06  # server actions (saveIndustry / publishIndustry / unpublishIndustry / deleteIndustry)
  - 04-07  # LinkedProductsPicker + RecipeBodyEditor + RecipeForm structural template (reused / mirrored)
provides:
  - IndustryBodyEditor (3-locale Tiptap admin editor with immediatelyRender:false; folder='industries')
  - IndustryForm (single-page editor with LocaleTabs + lifecycle row; reuses LinkedProductsPicker)
  - admin industries list / new / edit RSC routes
  - sidebar Industries nav entry
affects:
  - src/app/[locale]/admin/layout.tsx (AdminNavLabels.industries added)
  - messages/{uz,ru,en}.json (admin.nav.industries translations)
tech-stack:
  added: []
  patterns:
    - "RHF FormProvider + LocaleTabs swap (Phase-2 product-form mirror; identical to RecipeForm shape)"
    - "W7 status freeze (saveIndustry payload status hardcoded to persistedStatus)"
    - "P4-1 immediatelyRender:false (Tiptap v3 + Next 16 RSC compatibility)"
    - "P4-3 single TIPTAP_EXTENSIONS array (admin + public renderer share)"
    - "LinkedProductsPicker reused verbatim — no industry-specific picker"
key-files:
  created:
    - src/components/admin/industry-body-editor.tsx
    - src/components/admin/industry-form.tsx
    - src/app/[locale]/admin/industries/page.tsx
    - src/app/[locale]/admin/industries/industries-table.tsx
    - src/app/[locale]/admin/industries/new/page.tsx
    - src/app/[locale]/admin/industries/[id]/edit/page.tsx
  modified:
    - src/components/admin/sidebar.tsx
    - src/app/[locale]/admin/layout.tsx
    - messages/uz.json
    - messages/ru.json
    - messages/en.json
    - tests/components/industry-form.test.tsx
decisions:
  - "Body field path is translations.<locale>.body (matches industryInsertSchema), inheriting plan 04-07 deviation Rule 1 — locale-tab swap shape is the contract, not the literal `body.<locale>` path"
  - "IndustryBodyEditor authored as a verbatim near-twin of RecipeBodyEditor (single literal change: options.folder='industries') rather than extracting a shared <BodyEditor folder=...> component — defers the extraction per plan deviation Rule 2 to keep v1 scope tight; future polish plan can collapse the duplication"
  - "LinkedProductsPicker reused literally from 04-07 (no industry-specific picker file) — picker is generic by options-prop design; saves a duplicate file and ensures a single point of regression coverage for the picker behaviour"
  - "Industries-table feedback uses sonner toast (parity with recipes-table from 04-07)"
  - "Duplicate row action — same v1 deferral as recipes-table (route plumbing supports ?duplicate=<id> but no inert button rendered yet)"
  - "Sidebar order: Categories → Manufacturers → Specs → Products → Recipes → Industries → Submissions → Audit → Admins (matches plan order)"
metrics:
  duration: "~12 minutes"
  tasks: 3
  files: 12
  completed: 2026-05-01T10:25Z
---

# Phase 04 Plan 08: Industry admin UI surface — Summary

**One-liner:** Wave 2 closure for CONT-02 — the industry admin surface lands as a structural mirror of plan 04-07's recipe surface (Tiptap editor with `immediatelyRender:false` and `options.folder='industries'`, RHF + LocaleTabs swap with body path `translations.<locale>.body`, lifecycle row wired to `saveIndustry`/`publishIndustry`/`unpublishIndustry`/`deleteIndustry`). The four admin route files (list / new / edit / table client island) + Industries sidebar entry come online; LinkedProductsPicker is reused verbatim from 04-07 (no industry-specific picker file). Two jsdom RED stubs from 04-04 flip to GREEN (Tiptap mount + LocaleTabs swap).

## What shipped

- **IndustryBodyEditor** (`src/components/admin/industry-body-editor.tsx`) — Tiptap admin client component, `useEditor({ extensions: TIPTAP_EXTENSIONS, immediatelyRender: false, onUpdate })` (P4-1 mitigation locked). Toolbar parity with RecipeBodyEditor: Bold, Italic, Link, H2/H3/H4, bullet/ordered list, blockquote, table-insert, image-via-CldUploadWidget with `signatureEndpoint="/api/cloudinary/sign"` `options.folder='industries'`. Image insertion writes a CloudinaryImage node `{ type: 'image', attrs: { publicId, alt: '' } }` (T-04-XSS-04 mitigation — public renderer reads `attrs.publicId` only, never `src`).

- **IndustryForm** (`src/components/admin/industry-form.tsx`) — single-page editor mirroring `src/components/admin/recipe-form.tsx` from 04-07 verbatim with the entity swap. RHF `useForm<IndustryInput>` + `FormProvider`, `LocaleTabs` swap of the 4 translatable fields (title, slug via `SlugInput`, excerpt, body via `IndustryBodyEditor`), shared non-translatable fields below (`MediaUploader` mode='single' folder='industries' for featured image, `LinkedProductsPicker` reused verbatim), W7 two-layer status freeze, lifecycle row with Save / Publish | Unpublish / Delete buttons wired through `React.useTransition` + `ConfirmDialog` gates on destructive actions. Submit calls `saveIndustry`; lifecycle calls `publishIndustry` / `unpublishIndustry` / `deleteIndustry`.

- **Admin route files** (`src/app/[locale]/admin/industries/*`):
  - `page.tsx` — RSC list, joins `industries` with current-locale + uz translation aliases via `industryTranslations`, computes per-row `TranslationDots` completeness in JS over title+body filledness, paginates 1..100 page sizes.
  - `industries-table.tsx` — `'use client'` island with sonner toast feedback, Edit / Publish | Unpublish / Delete row actions.
  - `new/page.tsx` — RSC pre-fetches `findAllPublishedProducts(locale)` (helper landed in 04-07), renders empty `<IndustryForm>`.
  - `[id]/edit/page.tsx` — RSC pre-fetches industry row + 3 translation rows + linked product ids ordered by position + `findAllPublishedProducts`; reshapes into `IndustryInput` with `id` so saveIndustry takes the update path.

- **Sidebar** (`src/components/admin/sidebar.tsx`) — `AdminNavLabels.industries` field added, `/admin/industries` link rendered between Recipes and Submissions per plan ordering. `messages/{uz,ru,en}.json` extended with `admin.nav.industries` translations: "Sohalar" / "Отрасли" / "Industries".

## Tests flipped from RED → GREEN

- `tests/components/industry-form.test.tsx` — 2 specs (IndustryBodyEditor mount-without-hydration-error, IndustryForm LocaleTabs swap uz→ru re-binds title/slug/excerpt input names). Originally an `it.skip` RED stub from 04-04.

Both specs green under `pnpm vitest run tests/components/industry-form.test.tsx` (2/2 passing, ~11.9s).

## Verification

```bash
pnpm tsc --noEmit                                                       # exit 0
pnpm vitest run tests/components/industry-form.test.tsx                 # 2/2 specs green
```

## Deviations from Plan

None — plan executed exactly as written. The optional refactor opportunity (extract a shared `<BodyEditor folder=...>` component) was deferred per plan §Task 8.1 deviation Rule 2; documented as a Decision above. The plan's deviation Rule 3 (LinkedProductsPicker import resolves at the time 04-08 lands) is satisfied because 04-07 landed before 04-08 (sequential mode).

### Auto-fixed Issues

None.

### Auto-added Functionality

None.

### Deferred (Out-of-scope or v1.1)

**1. Shared `<BodyEditor folder=...>` extraction**
- **Plan said:** "Optional refactor: extract a shared `BodyEditor` component taking `folder` as a prop ... Defer this refactor IF context cost forces it; for v1 simplicity, keep two near-identical files (single point of duplication, well-tested)."
- **Why deferred:** v1 scope discipline. The 240-line near-twin between RecipeBodyEditor and IndustryBodyEditor is well-tested (4 jsdom specs across the two flips) and stable. A future polish plan can collapse the duplication when a third Tiptap surface lands (e.g., a future product-description rich-text editor) — three call-sites is the canonical extraction trigger.

**2. Duplicate row action — not implemented in 8.2**
- Same v1 deferral as recipes-table (carry-forward decision from 04-07).

## Threat Flags

None — every new surface routes through the existing trust boundaries (admin Server Actions wrapped by `withAdminAction` from Phase 2 plan 02-04 + plan 04-06; Cloudinary signed-direct upload via the already-allowlisted `industries` folder from plan 04-02; CloudinaryImage node attribute `publicId` reads via `attrs.publicId` only, structurally bypassing the `src` channel per T-04-XSS-04 mitigation).

## TDD Gate Compliance

This plan has 1 TDD task (8.3). The pattern is identical to plan 04-07: existing `it.skip` RED stubs (committed by plan 04-04 with `test(...)` shape) are flipped to live `it()` calls in the same commit as the production component (which landed in Tasks 8.1 + 8.2). The RED → GREEN gate sequence is therefore completed across plans 04-04 (RED) → 04-08 (GREEN). The test commit (`6027fb6`) is `feat(04-08): flip industry-form jsdom RED specs to GREEN` rather than `test(...)` because the production code shipped in earlier task commits within this plan; the test flip alone is the GREEN gate proof.

## Self-Check: PASSED

All 6 created files exist on disk:
- src/components/admin/industry-body-editor.tsx
- src/components/admin/industry-form.tsx
- src/app/[locale]/admin/industries/page.tsx
- src/app/[locale]/admin/industries/industries-table.tsx
- src/app/[locale]/admin/industries/new/page.tsx
- src/app/[locale]/admin/industries/[id]/edit/page.tsx

All 3 task commits present in git log:
- `c817692` feat(04-08): IndustryBodyEditor + IndustryForm (Task 8.1)
- `5595f8e` feat(04-08): admin industry routes + sidebar entry (Task 8.2)
- `6027fb6` feat(04-08): flip industry-form jsdom RED specs to GREEN (Task 8.3)

Exit gates:
- `pnpm tsc --noEmit` exit 0
- `pnpm vitest run tests/components/industry-form.test.tsx` 2/2 specs green
- Sidebar shows both `/admin/recipes` and `/admin/industries` entries (Task 8.2 sidebar diff verified)
- LinkedProductsPicker reused (no `linked-products-picker` file in industries-specific paths — confirmed via `Grep`)
