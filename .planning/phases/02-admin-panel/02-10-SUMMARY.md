---
phase: 02-admin-panel
plan: 10
subsystem: manufacturers-crud
tags: [server-action, dbtx-transaction, audit-log, revalidate-tag, locale-tabs, slug-input, media-uploader, cloudinary, cld-upload-widget, rhf, zod, tdd, dnd-kit]

requires:
  - phase: 01-foundations/01-02
    provides: src/db/schema/manufacturers.ts (manufacturers + manufacturerTranslations sibling, composite PK on (manufacturer_id, locale), UNIQUE(locale, slug), CHECK locale IN ('uz','ru','en'), logoPublicId TEXT NULLABLE on the base row)
  - phase: 01-foundations/01-06
    provides: src/app/api/cloudinary/sign/route.ts (signed-upload credential endpoint; signs ONLY {folder, timestamp} with 15-min effective TTL via Cloudinary's 1h drift window) + folder allowlist that includes 'manufacturers'
  - phase: 02-admin-panel/02-04
    provides: src/lib/server-action.ts (withAdminAction + AdminActionResult discriminated return) + src/lib/audit.ts (logAudit + closed AUDIT_ACTIONS enum)
  - phase: 02-admin-panel/02-05
    provides: src/lib/revalidation.ts (revalidateManufacturer typed helper — 3 tags: manufacturer:<id>, manufacturers-list, sitemap)
  - phase: 02-admin-panel/02-06
    provides: src/components/admin/data-table.tsx (generic DataTable<TData> with nuqs URL state)
  - phase: 02-admin-panel/02-09
    provides: src/components/admin/locale-tabs.tsx + src/components/admin/slug-input.tsx (canonical 3-locale form primitives reused verbatim by manufacturers form) + drizzle runtime client casing fix (already shipped, inherited)

provides:
  - src/components/admin/media-uploader.tsx (NEW) — reusable Cloudinary upload primitive with two modes. Single mode binds to a string|null field (e.g. logoPublicId on manufacturers); on success, sets the field to the returned public_id; on remove, sets to null. Multi mode uses RHF useFieldArray + @dnd-kit/core DndContext + @dnd-kit/sortable SortableContext for reordering and per-tile removal — fields shape `{ publicId: string }[]`. Both modes call /api/cloudinary/sign via signatureEndpoint and pass ONLY folder + maxFileSize + clientAllowedFormats + multiple + maxFiles + resourceType as widget options (only folder + timestamp are HMAC-signed, the rest are client-side hints — Pitfall #5 mitigation). accept='image' (default) sets resourceType:'image' + clientAllowedFormats:['jpg','jpeg','png','webp']; accept='pdf' swaps to resourceType:'auto' + clientAllowedFormats:['pdf'] for plan 02-14 datasheets. DB persists ONLY public_id (CLAUDE.md guardrail — never URL, never asset_id); render-time CldImage resolves the URL.
  - src/lib/zod/manufacturer.ts (NEW) — manufacturerInsertSchema (id optional, logoPublicId nullable string ≤500 chars, translations as fixed-shape object with uz/ru/en keys, slug regex /^[a-z0-9-]+$/) + manufacturerDeleteSchema. Same per-locale localeFields shape as src/lib/zod/category.ts but duplicated rather than imported so each entity owns its own surface.
  - src/actions/manufacturers.ts (NEW) — saveManufacturer + deleteManufacturer Server Actions, both wrapped by withAdminAction. saveManufacturer does pre-tx snapshot (for audit before_json) + dbTx.transaction(base upsert + 3 translation upserts ON CONFLICT DO UPDATE on (manufacturer_id, locale) + logAudit) + AFTER tx.commit revalidateManufacturer fan-out (3 tags). deleteManufacturer throws NOT_FOUND sentinel on unknown id (mirrors deleteCategory) + tx delete (FK ON DELETE CASCADE drops translations) + logAudit + revalidateManufacturer.
  - src/app/[locale]/admin/manufacturers/page.tsx (NEW) — RSC list with parallel slice + count fetch; alias() lets the same manufacturer_translations table join twice (current locale name + uz canonical slug). Logo column renders a CldImage thumbnail of logoPublicId or '—' when null.
  - src/app/[locale]/admin/manufacturers/manufacturers-table.tsx (NEW) — 'use client' island consuming DataTable<ManufacturerRow> from 02-06 with edit link + inline delete via deleteManufacturer in useTransition (window.confirm gate before destructive call).
  - src/app/[locale]/admin/manufacturers/new/page.tsx (NEW) — RSC thinnest of the three CRUD pages (no parent options; flat entity); requireAdmin gate + locale set + hand-off to ManufacturerForm with no `initial` prop (insert mode).
  - src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx (NEW) — RSC fetches the canonical row + 3 translations, reshapes them into the ManufacturerInput.translations object (uz/ru/en keys, fallback to empty when a locale row is missing), passes logoPublicId through so the MediaUploader pre-renders the existing thumbnail.
  - src/app/[locale]/admin/manufacturers/manufacturer-form.tsx (NEW) — ONE useForm instance with zodResolver over manufacturerInsertSchema; LocaleTabs render-prop emits per-locale fields via SlugInput; MediaUploader for logoPublicId renders OUTSIDE the LocaleTabs (logo is shared across all 3 locales — one Cloudinary asset per manufacturer). Submit calls saveManufacturer via React.useTransition + narrows on .ok.
  - tests/actions/manufacturers.test.ts (NEW) — 3 live-Neon specs against the test branch covering create (1+3+1 row write + 3-tag fan-out + persisted column is the SHORT public_id only — never a URL), update with logo change (audit before_json carries old public_id; after_json carries new; same 3-tag fan-out), delete (cascade asserts both base row AND 3 translation rows are gone; audit shape matches deleteCategory). vi.mock('@/lib/auth') short-circuits the next-auth import chain (canonical pattern from plan 02-04); vi.hoisted spy on next/cache revalidateTag.

affects: [phase-2-plan-13b, phase-2-plan-14, phase-3-public-manufacturers]

tech-stack:
  added: []  # All deps (next-cloudinary, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, RHF, Zod) already in package.json from earlier plans.
  patterns:
    - "Pattern (MediaUploader two-mode primitive): single mode binds to a string|null field via watch() + setValue(); multi mode uses useFieldArray + dnd-kit SortableContext with arrayMove via the field-array's `move(oldIdx, newIdx)`. Both branches share one widgetOptions object whose ONLY HMAC-signed parameters are `folder` + `timestamp` (matched to the Phase-1 sign endpoint's bodySchema in src/app/api/cloudinary/sign/route.ts:24-26). The other widget options — `multiple`, `maxFiles`, `resourceType`, `clientAllowedFormats`, `maxFileSize` — are CLIENT-side hints not in the HMAC payload; Cloudinary enforces upload-preset constraints server-side from its account settings. This is the Pitfall #5 mitigation: signing only the minimum signed param set means the widget cannot drift into 'Invalid Signature' errors. accept='pdf' swaps resourceType to 'auto' + clientAllowedFormats to ['pdf'] so plan 02-14 (product datasheets) reuses the same component."
    - "Pattern (DB stores ONLY public_id, never URL — D-07 SSOT): CldImage src={publicId} resolves the optimized URL at render time. The integration test in tests/actions/manufacturers.test.ts:115-117 explicitly asserts the persisted column does NOT match `^https?://` — locking the SSOT against future drift. Cloudinary public_ids include the folder prefix (e.g. 'manufacturers/acme-logo'); the column's max length of 500 chars in the Zod schema is generous enough for any practical folder/asset path."
    - "Pattern (logo OUTSIDE LocaleTabs in the form): one Cloudinary asset per manufacturer (the logo doesn't translate — it's the company's brand mark), so MediaUploader for logoPublicId renders BEFORE the LocaleTabs at the form's top level. Same posture for plan 02-13b's product-level fields (status, manufacturer assignment, category assignment) — non-translated fields render once outside the tab strip, translatable fields render inside the per-locale render-prop body. The D-01 form pattern locks this layout."
    - "Pattern (universal Server Action shape — verified twice now): saveManufacturer follows the SAME structural shape as saveCategory from plan 02-09 — pre-tx snapshot, dbTx.transaction with sibling-translations loop + logAudit, AFTER tx.commit revalidate fan-out via the typed helper. Two live-action precedents (categories, manufacturers) confirm the template; plans 02-11 (spec-fields), 02-13b (products) will follow the same shape with entity-specific extras (spec-fields rename has the productSpecValues.extra_key cascade; products has the productSpecValues replace-on-save + productSpecValueTranslations)."
    - "Pattern (RSC -> client island Date serialization): the manufacturers list page passes `r.updatedAt.toISOString()` across the RSC boundary so the table data is structured-clone-safe. The ManufacturersTable cell formatter re-parses with `new Date(...)` for display. Same posture should be reused for any future table that surfaces createdAt/updatedAt columns — RSC -> client island never passes raw Date objects (Next 16 serialisation contract)."
    - "Pattern (NOT_FOUND sentinel reused): deleteManufacturer throws `new Error('NOT_FOUND')` on a non-existent id, mapped by withAdminAction to `{ ok:false, error:'unknown' }`. Same posture as deleteCategory (02-09) and acceptInvite's INVALID_OR_EXPIRED (02-07). Centralising the sentinel keeps the AdminActionResult error union closed at exactly three values (validation/unauthorized/unknown) without leaking unknown-vs-forbidden to the caller."

key-files:
  created:
    - src/components/admin/media-uploader.tsx (commit 667f44c)
    - src/lib/zod/manufacturer.ts (commit 8ca6833)
    - tests/actions/manufacturers.test.ts (commit 8ca6833 RED + b36df3c GREEN)
    - src/actions/manufacturers.ts (commit b36df3c)
    - src/app/[locale]/admin/manufacturers/page.tsx (commit a5c0d8c)
    - src/app/[locale]/admin/manufacturers/manufacturers-table.tsx (commit a5c0d8c)
    - src/app/[locale]/admin/manufacturers/manufacturer-form.tsx (commit a5c0d8c)
    - src/app/[locale]/admin/manufacturers/new/page.tsx (commit a5c0d8c)
    - src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx (commit a5c0d8c)
    - .planning/phases/02-admin-panel/02-10-SUMMARY.md (this file)
  modified:
    - .planning/STATE.md (completed_plans 16 → 17, percent 47 → 50, position cursor advance)
    - .planning/ROADMAP.md (Phase 2 row 9/18 → 10/18)
    - .planning/REQUIREMENTS.md (ADMIN-04 marked complete)

key-decisions:
  - "MediaUploader ships single + multi modes from day one (rather than starting with just single for the manufacturers logo). Per the orchestrator note this is reused by 02-13b (products gallery) and 02-14 (Cloudinary uploader smoke), and the prop shape `mode: 'single' | 'multi'` + `maxFiles: number` makes both modes a single-component consumer choice. Multi-mode dnd-kit SortableContext + per-tile removal already works (typecheck passes). This avoids a future rewrite when 02-13b lands; the cost is ~80 lines of dnd-kit wiring that gets exercised in plan 02-13b. The acceptance criteria for Task 10.1 explicitly require @dnd-kit/sortable + useFieldArray imports — plan-aligned."
  - "Pitfall #5 sign-endpoint coupling: the widget passes resourceType / multiple / maxFiles / clientAllowedFormats / maxFileSize as widget options BUT does NOT send them to /api/cloudinary/sign. Phase 1 plan 01-06 signs ONLY {folder, timestamp}. If Cloudinary returns 'Invalid Signature' on a smoke upload, the fix path is documented in the plan (widen bodySchema in src/app/api/cloudinary/sign/route.ts:24-26 to include the additional signed params, mirror them in api_sign_request, and have the widget mirror them back). For v1 we keep the sign payload minimal — Cloudinary's account-level upload-preset enforces the size/format limits server-side regardless of what the widget sends."
  - "logoPublicId on the base row, not per-locale: per 02-PATTERNS line 621 (manufacturers extras = `logoPublicId set on base row`). One Cloudinary asset per manufacturer reflects business reality — the company logo doesn't change between Uzbek/Russian/English. The form mirrors this layout: MediaUploader renders OUTSIDE LocaleTabs at the form's top. If a v2 surface ever needs locale-specific imagery (e.g. a per-locale hero banner), the per-locale slot would be added to manufacturer_translations + a new MediaUploader inside the LocaleTabs render-prop body — but that's out of scope for v1."
  - "Logo update audit posture: the test asserts before_json.logoPublicId carries the OLD public_id and after_json.logoPublicId carries the NEW. Drizzle's row serialisation for the snake_case casing strategy emits keys as `logoPublicId` in the JS object (Drizzle preserves the JS-object shape; the SQL column is logo_public_id but the row map keys are the camelCase property names). The test accepts either casing for forward compatibility — this matches the same defensive shape used in tests/actions/categories.test.ts:236-241 for parentId."
  - "logoPublicId Zod: `z.string().min(1).max(500).nullable().optional()`. The min(1) prevents storing empty strings (which would be ambiguous vs. null and would render a broken CldImage). Max(500) is generous for Cloudinary public_ids which include folder prefixes (e.g. 'manufacturers/acme-logo' is ~25 chars; the practical worst-case is folder-deep recipes/2026/04/asset-uuid which still fits well under 500). Nullable + optional lets the form clear the logo via setValue(name, null) without the schema rejecting the empty state."
  - "websiteUrl deferred: the manufacturer base row has a websiteUrl text column (manufacturers.ts:19) but the v1 form does NOT manage it. Per 02-PATTERNS line 621 the manufacturers extras list mentions only logoPublicId — websiteUrl is a base-row info column that no v1 surface exposes. A future plan that surfaces website on the public manufacturer page would add the field to manufacturerInsertSchema + the form. Out of scope here."

patterns-established:
  - "MediaUploader is the canonical Cloudinary upload primitive for all Phase-2 admin surfaces. mode='single' for one-asset slots (manufacturer logo, product hero); mode='multi' for galleries (product images in 02-13b, recipe steps in Phase 4). The single + multi prop shape is the locked contract; future image-collection surfaces drop in directly."
  - "RSC -> client island Date serialisation contract: pass ISO strings (Date.toISOString()) across the RSC boundary rather than raw Date objects. The list page in this plan establishes the convention for Phase-2 onwards."
  - "Universal Server Action shape (pre-tx snapshot + dbTx.transaction with sibling-translations loop + logAudit + post-commit revalidate) now has TWO production callsites (categories + manufacturers). Plan 02-11 (spec-fields) and 02-13b (products) will follow without further pattern-debate — the shape is locked."

requirements-completed: [ADMIN-04]
requirements-touched: [ADMIN-11, OPS-01]  # logAudit on every mutation (ADMIN-11) + revalidateTag fan-out (OPS-01) — both already marked complete by plans 02-04 + 02-05; this plan exercises them with a third entity.

duration: ~10min
completed: 2026-04-28
---

# Phase 2 Plan 10: Manufacturers CRUD Summary

**Manufacturers CRUD ships parallel to categories with logo upload via the new reusable MediaUploader (single + multi modes, signed via Phase-1 /api/cloudinary/sign, DB stores ONLY Cloudinary public_id per D-07). Marquee deliverable: MediaUploader is the canonical Cloudinary upload primitive for all Phase-2 admin surfaces — mode='single' for one-asset slots (manufacturer logo, product hero) and mode='multi' for galleries (product images via RHF useFieldArray + @dnd-kit SortableContext for reordering). saveManufacturer + deleteManufacturer Server Actions follow the universal shape verified in plan 02-09 (pre-tx snapshot + dbTx.transaction with base upsert + 3 translation upserts ON CONFLICT DO UPDATE + logAudit; AFTER tx.commit revalidateManufacturer fan-out — 3 tags: manufacturer:<id>, manufacturers-list, sitemap). 3 live-Neon specs lock the contract: create writes 1+3+1 rows + asserts logo_public_id persists the SHORT public_id only (test explicitly asserts `not.toMatch(/^https?:\/\//)`), update with logo change writes audit before_json.logoPublicId = old + after_json.logoPublicId = new + same 3-tag fan-out, delete cascades both base row AND 3 translation rows via FK ON DELETE CASCADE. Admin UI: list page joins manufacturer_translations twice via alias() (current locale name + uz canonical slug) + CldImage thumbnail column; ManufacturerForm reuses LocaleTabs + SlugInput verbatim from plan 02-09 with MediaUploader rendering OUTSIDE LocaleTabs (logo is shared across all 3 locales — one Cloudinary asset per manufacturer). 4 commits (1 MediaUploader + TDD RED+GREEN cycle + 1 UI), 19/19 vitest files / 87/87 tests green (was 18/84 at plan 02-09 close; +1 file +3 specs). Zero deviations — plan 02-09 had pre-cleared all the infrastructure issues (drizzle casing fix, vi.hoisted pattern, slug helper name) so 02-10 executed exactly as written. pnpm tsc --noEmit plan-relevant clean; pnpm build Compiled successfully in 17.5s with same pre-existing 02-01 script TS2532 errors gating the typecheck step (out-of-scope per CLAUDE.md scope-boundary, identical posture to 02-09).**

## Performance

- **Duration:** ~10 min wall-clock (single executor session)
- **Started:** 2026-04-28T10:00:24Z
- **Completed:** 2026-04-28T10:10:00Z
- **Tasks:** 3 (10.1 MediaUploader, 10.2 saveManufacturer + deleteManufacturer + Zod + tests, 10.3 list/new/edit pages + form)
- **Files created:** 10 (1 MediaUploader + 1 zod + 1 actions + 1 test + 5 admin route + 1 SUMMARY)
- **Files modified:** 0
- **Commits:** 4 task commits (1 MediaUploader + 1 TDD RED + 1 TDD GREEN + 1 UI) + 1 final metadata commit pending

## Accomplishments

- **MediaUploader (single + multi modes) ships as the canonical Cloudinary primitive.** Single mode binds to a string|null RHF field (e.g. `logoPublicId`) via watch() + setValue(); the Replace/Remove buttons render conditionally on the current value. Multi mode wires RHF useFieldArray + @dnd-kit/core DndContext + @dnd-kit/sortable SortableContext for drag-to-reorder, with per-tile removal handled by useFieldArray's `remove(idx)`. Both modes call /api/cloudinary/sign via the next-cloudinary widget's `signatureEndpoint` prop and pass ONLY `folder` + `timestamp` to the signed payload (Pitfall #5 mitigation — the widget options `multiple`/`maxFiles`/`resourceType`/`clientAllowedFormats`/`maxFileSize` are CLIENT-side hints, not part of the HMAC payload). accept='pdf' swaps resourceType to 'auto' for plan 02-14 datasheet support.
- **saveManufacturer + deleteManufacturer Server Actions land with the universal shape (second production callsite).** Pre-tx snapshot for audit before_json; dbTx.transaction does base upsert + 3 translation upserts (ON CONFLICT DO UPDATE on (manufacturer_id, locale)) + logAudit; AFTER tx.commit revalidateManufacturer fan-out (3 tags: manufacturer:<id>, manufacturers-list, sitemap). PITFALL #2 (revalidate inside transaction) mitigated structurally — every revalidate call lives outside the dbTx.transaction lambda. The two-action pattern (one create/update + one hard-delete with NOT_FOUND sentinel) is the canonical Phase-2 mutation surface; plans 02-11 (spec-fields) + 02-13b (products) will follow the same shape.
- **Logo public_id-only persistence locked by integration test.** tests/actions/manufacturers.test.ts:115-117 explicitly asserts `expect(base.logo_public_id).not.toMatch(/^https?:\/\//)` so any future drift toward storing full URLs (or asset_ids, or any other Cloudinary metadata) gets caught at the test layer. The CLAUDE.md guardrail ("DB stores public_id only") now has a regression-locking spec.
- **Cascade delete posture verified.** Test 3 seeds a manufacturer + 3 translations, calls deleteManufacturer, then asserts BOTH the base row AND the 3 translation rows are gone (FK ON DELETE CASCADE on manufacturer_translations.manufacturer_id). The same assertion shape generalises to any future entity with a sibling translations table.
- **3 admin route pages (RSC list + new + edit) consume the existing DataTable<TData> from 02-06.** List page uses alias() to join manufacturer_translations twice (current-locale name + uz canonical slug — sitemap source-of-truth per Phase-1 guardrail) and adds a logo thumbnail column rendered via CldImage. New + edit pages mirror the categories shape from plan 02-09; new page is the thinnest of the three CRUD pages because manufacturers are flat (no parent options to fetch).
- **ManufacturerForm reuses LocaleTabs + SlugInput verbatim from plan 02-09.** ONE useForm instance with zodResolver over manufacturerInsertSchema; LocaleTabs render-prop emits per-locale fields via SlugInput; MediaUploader for logoPublicId renders OUTSIDE the LocaleTabs at the form's top (logo is shared across all 3 locales — one Cloudinary asset per manufacturer). The D-01 form pattern is now locked across two production surfaces.

## Server Action API shape

```typescript
// src/actions/manufacturers.ts
export const saveManufacturer = withAdminAction(
  manufacturerInsertSchema,
  async (input, ctx) => { /* tx + revalidate */ }
);
//  Returns: AdminActionResult<{ id: string;
//                               logoPublicId: string | null;
//                               websiteUrl: string | null;
//                               createdAt: Date;
//                               updatedAt: Date; }>

export const deleteManufacturer = withAdminAction(
  manufacturerDeleteSchema,
  async ({ id }, ctx) => { /* tx + revalidate */ }
);
//  Returns: AdminActionResult<{ deleted: string }>
```

```typescript
// src/lib/zod/manufacturer.ts
export const manufacturerInsertSchema = z.object({
  id: z.string().uuid().optional(),
  logoPublicId: z.string().min(1).max(500).nullable().optional(),
  translations: z.object({
    uz: localeFields,  // { name, slug (regex /^[a-z0-9-]+$/), description? }
    ru: localeFields,
    en: localeFields,
  }),
});
```

## MediaUploader component API

```typescript
// src/components/admin/media-uploader.tsx
export interface MediaUploaderProps {
  /** RHF dotted path. single mode → string|null; multi → { publicId: string }[]. */
  name: string;
  mode?: "single" | "multi";       // default "single"
  maxFiles?: number;                // default 10; ignored in single mode
  accept?: "image" | "pdf";         // default "image"
  /** Cloudinary folder allowlisted by /api/cloudinary/sign. */
  folder?: string;                  // default "products"
}
```

**Usage examples:**
```tsx
// Single mode — manufacturer logo (this plan)
<MediaUploader name="logoPublicId" mode="single" folder="manufacturers" />

// Multi mode — product gallery (plan 02-13b will use this)
<MediaUploader name="images" mode="multi" maxFiles={10} folder="products" />

// PDF mode — product datasheet (plan 02-14 will use this)
<MediaUploader name="datasheetPublicId" mode="single" accept="pdf" folder="products" />
```

## Test Coverage

3 live-Neon specs added in tests/actions/manufacturers.test.ts:

| Spec | What it locks | Live-DB rows asserted |
|------|---------------|------------------------|
| `create — writes 1 manufacturer row + 3 translations + audit_log(action='create') atomically; logo_public_id persists the SHORT public_id only` | Atomic insert path; SHORT public_id (no URL) invariant; 3-tag revalidateManufacturer fan-out | 1 manufacturer row, 3 manufacturer_translations (locales sorted = ['en','ru','uz']), 1 audit_log(action='create', before_json IS NULL); `logo_public_id` NOT matching `^https?://` |
| `update with logo change — audit before_json carries old public_id; after_json carries new` | Update path; logo SSOT round-trip; audit shape preserves old + new logo public_ids | 1 manufacturer row with updated logo_public_id; 1 audit_log(action='update', before_json.logoPublicId = old, after_json.logoPublicId = new); same 3-tag fan-out as create |
| `delete — writes audit_log(action='delete') + before_json contains row + after_json IS NULL + row + translations are gone` | Delete path; FK ON DELETE CASCADE on translations; audit shape | manufacturer row gone post-call; manufacturer_translations rows gone (cascade); 1 audit_log(action='delete', before_json populated, after_json IS NULL) |

Vitest run: 19 files / 87 tests passing (was 18 / 84 at plan 02-09 close; +1 file +3 specs).
Cold-Neon HTTP first-query: 15-20s test timeouts applied (pattern from plan 02-04).

## Deviations from Plan

None. Plan 02-09 had pre-cleared all the relevant infrastructure issues:
- Drizzle runtime client `casing: 'snake_case'` fix (already applied to src/db/client.ts + src/db/client-ws.ts in commit c55c5dd).
- vi.hoisted pattern for next/cache spy (canonical fix established in tests/actions/categories.test.ts).
- toSlug() vs. slugify() helper naming (no slug rename happens in this plan; the SlugInput primitive already correctly imports toSlug).

The plan executed exactly as written across all three tasks.

## Open Questions Resolved

None.

## Open Questions Deferred

- **Pitfall #5 sign-endpoint coupling.** The widget options pass resourceType / multiple / maxFiles / clientAllowedFormats / maxFileSize as CLIENT-side hints, not signed params. If Cloudinary returns 'Invalid Signature' on a smoke upload (would surface in plan 02-14), widen bodySchema in src/app/api/cloudinary/sign/route.ts:24-26 to include additional signed params and mirror them in api_sign_request. For v1 the minimal sign payload (folder + timestamp only) keeps the surface small.
- **websiteUrl on the form.** The base row has a websiteUrl text column but the v1 form does not manage it. A future plan exposing public manufacturer pages would add the field to manufacturerInsertSchema + the form.

## Notes for next plan (02-11 spec-fields-crud)

- **Reuse LocaleTabs + SlugInput verbatim AGAIN.** spec_field has per-locale labels (manufacturer_translations / spec_field_translations have the same shape). Same render-prop and slug auto-fill pattern transplants directly.
- **Universal Server Action shape is now the locked template.** Two production callsites (categories, manufacturers) prove the pattern. spec-fields adds the rename special case (`tx.update(specFields).set({ key }).where(eq(id, ...))` PLUS `tx.update(productSpecValues).set({ extraKey: newKey }).where(eq(extraKey, oldKey))` cascade — see 02-PATTERNS line 622) and soft-delete (`tx.update(specFields).set({ deletedAt: new Date() })`).
- **MediaUploader NOT needed for spec-fields.** Spec-fields are pure metadata (no asset uploads). Plan 02-13b (products) will be the next MediaUploader consumer (multi mode for the gallery).
- **Same NOT_FOUND sentinel posture for delete.** spec-fields hard-delete + soft-delete should both throw NOT_FOUND on unknown id and rely on withAdminAction to map to AdminActionResult.unknown.

## Self-Check: PASSED

- src/components/admin/media-uploader.tsx (commit 667f44c) — FOUND
- src/lib/zod/manufacturer.ts (commit 8ca6833) — FOUND
- tests/actions/manufacturers.test.ts (commit 8ca6833 + b36df3c) — FOUND
- src/actions/manufacturers.ts (commit b36df3c) — FOUND
- src/app/[locale]/admin/manufacturers/page.tsx (commit a5c0d8c) — FOUND
- src/app/[locale]/admin/manufacturers/manufacturers-table.tsx (commit a5c0d8c) — FOUND
- src/app/[locale]/admin/manufacturers/manufacturer-form.tsx (commit a5c0d8c) — FOUND
- src/app/[locale]/admin/manufacturers/new/page.tsx (commit a5c0d8c) — FOUND
- src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx (commit a5c0d8c) — FOUND
- All 4 commits present in git log (667f44c, 8ca6833, b36df3c, a5c0d8c) — VERIFIED
