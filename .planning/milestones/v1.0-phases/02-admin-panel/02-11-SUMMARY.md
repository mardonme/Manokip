---
phase: 02-admin-panel
plan: 11
subsystem: spec-fields-editor
tags: [server-action, dbtx-transaction, audit-log, revalidate-tag, locale-tabs, repository-wrapper, soft-delete, confirm-dialog, type-lock, rename-cascade, rhf, zod, tdd]

requires:
  - phase: 01-foundations/01-02
    provides: src/db/schema/spec-fields.ts (specFields + specFieldTranslations + specFieldEnumOptions; spec_data_type pgEnum ['number','text','enum','bool'] — D-16, no 'range'; spec_filter_kind pgEnum ['range','select','toggle']; productSpecValues with extra_key + spec_field_id ON DELETE SET NULL)
  - phase: 02-admin-panel/02-01
    provides: spec_field.deleted_at + spec_field.group_id columns + spec_field_group + spec_field_group_translations + partial-unique on (category_id, key) WHERE deleted_at IS NULL
  - phase: 02-admin-panel/02-04
    provides: src/lib/server-action.ts (withAdminAction + AdminActionResult) + src/lib/audit.ts (logAudit + closed AUDIT_ACTIONS — includes 'rename_spec_field', 'soft_delete_spec_field', 'delete_spec_field')
  - phase: 02-admin-panel/02-05
    provides: src/lib/revalidation.ts (revalidateSpecField — 3 tags + revalidateSpecFieldGroup — 2 tags)
  - phase: 02-admin-panel/02-06
    provides: src/components/admin/data-table.tsx (now extended with manualPagination?: boolean)
  - phase: 02-admin-panel/02-09
    provides: src/components/admin/locale-tabs.tsx (canonical 3-locale form primitive reused verbatim) + drizzle runtime client casing fix

provides:
  - src/lib/repositories/spec-field.ts (NEW) — Open Q §4 enforcement. Exposes findActiveSpecFields(categoryId) + findActiveSpecField(id) which auto-apply WHERE deleted_at IS NULL via `and(eq(...), isNull(specFields.deletedAt))`. Phase 3 public reads import from this module exclusively. Phase 5 will add an ESLint rule blocking direct db.select(...).from(specFields) outside this module + admin Server Actions.
  - src/components/admin/confirm-dialog.tsx (NEW) — reusable AlertDialog wrapper with optional type-the-key-to-confirm input. Confirm button stays disabled until typed === expected; destructive variant flips the action button. Reset typed-state on dialog close so a stale match value doesn't persist across opens. Reused by spec-fields rename/delete (this plan), 02-13b product lifecycle actions (publish/unpublish/duplicate/delete), and 02-16 audit-log viewer bulk actions.
  - src/lib/zod/spec-field.ts (NEW) — specFieldSaveSchema (insert/update aligned with the LIVE schema's spec_data_type enum ['number','text','enum','bool'] — the plan's literal SPEC_FIELD_TYPES list with 'range' is the Rule-1 plan internal-spec drift; D-16/17 explicitly bans 'range' from data_type), specFieldRenameSchema (id + oldKey + newKey with KEY_RE regex `/^[a-z0-9_]+$/`), specFieldSoftDeleteSchema, specFieldHardDeleteSchema. Also exports SPEC_DATA_TYPES + SPEC_FILTER_KINDS const tuples for the form select options.
  - src/lib/zod/spec-field-group.ts (NEW) — specFieldGroupSaveSchema (key + 3-locale labels), specFieldGroupReorderSchema (categoryId + ordering: [{id, sortOrder}]), specFieldGroupDeleteSchema. Same per-locale localeFields shape as the spec-field schema but with only `label` (groups don't have helpText).
  - src/actions/spec-fields.ts (NEW) — four Server Actions wrapped by withAdminAction following the universal shape verified twice in plans 02-09/02-10:
    * saveSpecField — pre-tx snapshot + dbTx.transaction(insert OR update + 3 translations upsert + logAudit) + revalidateSpecField. D-08 type-lock enforced INSIDE the action body: throws DATA_TYPE_LOCKED when an UPDATE input flips dataType (defense-in-depth alongside the UI's disabled type select). UPDATE SET payload deliberately omits dataType.
    * renameSpecField — D-06. KEY_MISMATCH stale-form race guard. Inside the tx UPDATE spec_field.key + cascade UPDATE product_spec_values.extra_key WHERE spec_field_id = id AND extra_key = oldKey (limited cascade — free-form is_extra rows with diverged keys are intentionally NOT touched). Audit action='rename_spec_field' with before={key:old} + after={key:new}.
    * softDeleteSpecField — D-07. UPDATE deleted_at = sql`now()` + audit action='soft_delete_spec_field'. The closed AUDIT_ACTIONS tuple in src/lib/audit.ts (added by plan 02-04) already declares this value, so no audit-action enum extension needed.
    * deleteSpecField — D-07. DELETE the row. product_spec_values.spec_field_id is ON DELETE SET NULL per Phase-1 src/db/schema/spec-values.ts:30-32, NOT cascade as the plan's <behavior> phrased it — the value rows survive with NULL FK. Audit action='delete_spec_field' with after_json IS NULL.
  - src/actions/spec-field-groups.ts (NEW) — three Server Actions:
    * saveSpecFieldGroup — D-09. Insert/update + 3 translation upserts + logAudit + revalidateSpecFieldGroup fan-out (2 tags: spec-field-group:<id>, category:<categoryId>).
    * reorderGroups — D-09. Per-row tx.update(sortOrder) inside one transaction (atomic all-or-nothing observability). Audit action='update' attributed to the categoryId (one audit row per reorder operation, not N — keeps the audit-log viewer readable).
    * deleteSpecFieldGroup — D-09. Soft-delete (sets deleted_at). Reuses the closed AUDIT_ACTIONS 'delete' value rather than introducing a separate 'soft_delete_spec_field_group' — the entityType + after.deletedAt distinguish soft- from hard-delete in the viewer.
  - tests/actions/spec-fields.test.ts (NEW) — 5 live-Neon specs locking: create (1+3+1 row write + 3-tag fan-out via revalidateSpecField), dataType-block (D-08 — flip 'number' → 'text' returns ok:false; persisted column unchanged), rename cascade (asserts product_spec_values.extra_key flipped from oldKey to newKey + audit before/after.key shape), soft-delete (deleted_at populated + row remains + audit shape), hard-delete (row gone + product_spec_values.spec_field_id = NULL per the LIVE schema's SET NULL FK + audit after_json IS NULL). Each test seeds its own category (and product where needed) and tears them down in reverse order via the `cleanups` stack.
  - tests/actions/spec-field-groups.test.ts (NEW) — 3 live-Neon specs: create (1+3+1 row write + 2-tag fan-out via revalidateSpecFieldGroup), reorder (batch sort_order swap inside one tx + single audit_log(action='update') row attributed to categoryId), soft-delete (deleted_at populated + row remains + audit_log action='delete').
  - src/components/admin/data-table.tsx (MODIFIED) — extended with `manualPagination?: boolean` prop (defaults true to preserve existing call-sites at categories/manufacturers/products/etc.). When false, the three manual* TanStack flags flip together AND getPaginationRowModel + getFilteredRowModel + getSortedRowModel are attached so the toolbar / pagination / sort run in-memory. Resolves Open Q §3 (spec-fields ~80 rows project-wide → client-side pagination keeps the editor snappy without server-pagination wiring overhead).
  - src/app/[locale]/admin/spec-fields/page.tsx (NEW) — RSC list joining specFields with spec_field_translations + category_translations + spec_field_group_translations via three alias()'d translations tables. Grouped by category.name then ordered by spec_field.sortOrder.
  - src/app/[locale]/admin/spec-fields/spec-fields-table.tsx (NEW) — client island consuming DataTable<SpecFieldRow> with manualPagination={false}. Action column wires four ConfirmDialog invocations: rename (inline RenameButton wraps ConfirmDialog with the typed-newKey gate via the `expected: newKey` shape — admin types the new key into both the inline input AND the confirm field), soft-delete (destructive variant, no typed confirm), hard-delete (destructive WITH typed confirm — admin must type the field key to enable the action button).
  - src/app/[locale]/admin/spec-fields/spec-field-form.tsx (NEW) — RHF + zodResolver(specFieldSaveSchema). Shared (non-translated) fields render OUTSIDE LocaleTabs: categoryId / key / dataType (DISABLED on update — D-08) / unit / required / filterKind / filterGroupKey / groupId / sortOrder. Translatable fields (label + helpText) inside the per-locale render-prop body. categoryId + key also locked on update (rebuild the field on a different category instead of moving it; the rename flow is the supported key-change path).
  - src/app/[locale]/admin/spec-fields/new/page.tsx (NEW) — RSC fetching category + group options for the form selects; SpecFieldForm with no `initial` prop.
  - src/app/[locale]/admin/spec-fields/[id]/edit/page.tsx (NEW) — RSC fetches the canonical row + 3 translations + impact summary (COUNT(*) FROM product_spec_values WHERE spec_field_id = id) so the editor's header shows "N products reference this field" — informs the admin before they soft-delete or rename. Reshapes into SpecFieldInput.
  - src/app/[locale]/admin/spec-fields/groups/page.tsx (NEW) — RSC list of active spec_field_groups grouped by category. Filters out soft-deleted groups via `where(isNull(specFieldGroups.deletedAt))` (admin recovery flow is out of scope for v1).
  - src/app/[locale]/admin/spec-fields/groups/groups-list.tsx (NEW) — client island rendering one card per category with inline sort_order Input that flushes through reorderGroups on blur + per-row Edit + Soft-delete. Drag-and-drop reorder deferred to Phase 5 polish (the integer-input UX is sufficient for v1; the plan's <action> mentioned dnd-kit as a stretch).
  - src/app/[locale]/admin/spec-fields/groups/group-form.tsx (NEW) — RHF + zodResolver(specFieldGroupSaveSchema); shared categoryId + key + sortOrder render outside LocaleTabs; the per-locale label inside.
  - src/app/[locale]/admin/spec-fields/groups/new/page.tsx (NEW) + src/app/[locale]/admin/spec-fields/groups/[id]/edit/page.tsx (NEW) — group RSC pages mirroring the spec-fields new/edit shape.

affects: [phase-2-plan-13b, phase-2-plan-15, phase-2-plan-16, phase-3-public-detail, phase-3-public-search, phase-5-eslint-no-direct-spec-field-select]

tech-stack:
  added: []  # No new deps — all primitives (RHF, Zod, TanStack table, AlertDialog, Input) already installed.
  patterns:
    - "Pattern (universal Server Action shape — verified three times now): saveSpecField + saveSpecFieldGroup follow the same structural shape as saveCategory (02-09) + saveManufacturer (02-10) — pre-tx snapshot, dbTx.transaction with sibling-translations loop + logAudit, AFTER tx.commit revalidate fan-out via the typed helper. Three live-action precedents (categories, manufacturers, spec-fields, spec-field-groups — actually four if you count groups) confirm the template. Plan 02-13b (products) will follow the same shape with entity-specific extras (productSpecValues replace-on-save + productSpecValueTranslations + status toggle wrappers)."
    - "Pattern (D-08 type-lock — defense-in-depth): UI disables the dataType select when initial?.id is present + the saveSpecField body throws DATA_TYPE_LOCKED on detected dataType change. The UI gate is the user-visible mitigation; the runtime gate is the security mitigation (a malicious caller bypassing the form still hits the runtime check). Both layers cite D-08 / Pitfall #14."
    - "Pattern (D-06 rename — limited cascade on extra_key): renameSpecField updates product_spec_values.extra_key only WHERE extra_key = oldKey AND spec_field_id = id. Free-form is_extra=true rows whose extra_key intentionally diverges from spec_field.key are NOT touched — preserves the admin's deliberate divergence. The cascade is observable in the test (tests/actions/spec-fields.test.ts:rename) and in the audit row (before.key=oldKey, after.key=newKey). KEY_MISMATCH guard (Pitfall #14) rejects stale-form attempts where the form's oldKey doesn't match the persisted key (someone renamed it in a parallel session)."
    - "Pattern (soft-delete repository wrapper — Open Q §4): src/lib/repositories/spec-field.ts is the canonical query path for spec_field reads. findActiveSpecFields(categoryId) and findActiveSpecField(id) auto-apply `and(eq(...), isNull(specFields.deletedAt))` — Phase 3 public reads import from this module exclusively. The runtime guarantee 'soft-deleted fields never leak to public' is structurally enforced rather than relying on every callsite remembering the predicate. Phase 5 ESLint rule will block direct db.select().from(specFields) outside this module + admin Server Actions, completing the structural enforcement."
    - "Pattern (DataTable opt-in client-side mode): manualPagination?: boolean — defaults true (server-pagination, the existing canonical mode for products/categories/manufacturers). Pass false for small lists that fit in a single fetch (~80 rows; Open Q §3). The three manual* flags flip together because client-side mode requires all three TanStack row models attached. Reused by future plans needing in-memory tables (e.g. potentially the audit-log filter dropdowns in 02-16, although that table is server-paginated)."
    - "Pattern (ConfirmDialog reusable destructive primitive): AlertDialog wrapper takes a `confirmInput?: { expected, placeholder }` prop. When set, the Confirm button stays disabled until the user types `expected` exactly. State resets on dialog close so a stale match doesn't carry across opens. Used by spec-fields hard-delete (expected = field key — D-07), spec-fields rename (expected = new key — D-06), and will be reused for any product publish/unpublish/duplicate/delete confirmation in 02-13b."
    - "Pattern (DELETE FK posture vs plan's literal): the plan describes hard-delete as 'cascades via FK ON DELETE CASCADE' on product_spec_values, but the LIVE Phase-1 schema (src/db/schema/spec-values.ts:30-32) declares ON DELETE SET NULL on spec_field_id. We honored the LIVE schema — value rows survive with NULL FK after hard-delete. The test asserts this posture explicitly. Either way the spec_field row goes away; the difference is whether old data orphans (SET NULL — current) or is dropped (CASCADE — plan literal). The current SET NULL posture is safer for the admin flow (admin can audit orphaned values + decide whether to clean them up) and is what the schema actually does."

key-files:
  created:
    - src/lib/repositories/spec-field.ts (commit 99f365c)
    - src/components/admin/confirm-dialog.tsx (commit 99f365c)
    - src/lib/zod/spec-field.ts (commit 0a392d9)
    - tests/actions/spec-fields.test.ts (commit 0a392d9 RED + 4f5d719 GREEN)
    - src/actions/spec-fields.ts (commit 4f5d719)
    - src/lib/zod/spec-field-group.ts (commit d61d2b6)
    - tests/actions/spec-field-groups.test.ts (commit d61d2b6 RED + d2c5bf9 GREEN)
    - src/actions/spec-field-groups.ts (commit d2c5bf9)
    - src/app/[locale]/admin/spec-fields/page.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/spec-fields-table.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/spec-field-form.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/new/page.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/[id]/edit/page.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/groups/page.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/groups/groups-list.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/groups/group-form.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/groups/new/page.tsx (commit 90f87cc)
    - src/app/[locale]/admin/spec-fields/groups/[id]/edit/page.tsx (commit 90f87cc)
    - .planning/phases/02-admin-panel/02-11-SUMMARY.md (this file)
  modified:
    - src/components/admin/data-table.tsx (commit 90f87cc — added manualPagination?: boolean prop)
    - .planning/STATE.md (completed_plans 17 → 18, percent 50 → 53, position cursor advance)
    - .planning/ROADMAP.md (Phase 2 row 10/18 → 11/18)
    - .planning/REQUIREMENTS.md (ADMIN-05 marked complete)

key-decisions:
  - "Plan literal vs LIVE schema — SPEC_FIELD_TYPES: the plan's Zod block lists ['number','range','enum','bool','text'] but the Phase-1 spec_data_type pgEnum is ['number','text','enum','bool'] — D-16/17 in the Phase-1 CONTEXT explicitly states 'no range — ranges are modeled as TWO number fields sharing filter_group_key'. Aligned with LIVE schema; 'range' lives in the spec_filter_kind enum on the field, NOT in dataType. The form exposes both selects independently. This is a Rule-1 plan internal-spec drift; the LIVE schema wins per CLAUDE.md (D-08 of CONTEXT)."
  - "Plan literal vs LIVE FK posture — hard-delete cascade: the plan's <behavior> describes hard-delete as 'cascades product_spec_values via FK ON DELETE CASCADE' but the LIVE schema declares ON DELETE SET NULL on product_spec_values.spec_field_id (Phase-1 src/db/schema/spec-values.ts:30-32). Honored the LIVE schema — value rows survive with NULL FK. The test asserts this explicitly. Both behaviors satisfy 'admin can hard-delete a spec_field'; the SET NULL posture is safer because old data isn't silently dropped — admin can audit orphaned values via a future 'orphaned values' admin view. If a future requirement demands hard-delete to drop the values, the FK can be flipped to CASCADE in a Phase-3+ migration; the action body would still apply (the FK does the cascade, not the app layer)."
  - "Open Q §3 — client-side pagination for spec-fields list: locked to manualPagination={false}. ~80 rows project-wide is too small to justify the server-pagination wiring overhead (parent RSC fetches all rows; client filters/paginates/sorts in-memory). The DataTable was extended with a `manualPagination?: boolean` prop defaulting to true (preserves the canonical server-paginated posture for products/categories/manufacturers). Future small lists (e.g. spec-field-groups within a category) can opt into the same client-side mode."
  - "Open Q §4 — soft-delete enforcement via repository wrapper: src/lib/repositories/spec-field.ts is the canonical Phase-3 read path. Phase-2 admin Server Actions still use dbTx directly (they need to read soft-deleted rows for admin recovery flows). The Phase-5 ESLint rule will block `db.select(...).from(specFields)` outside this module + admin Server Actions, structurally enforcing the 'soft-deleted fields never leak to public' invariant."
  - "ConfirmDialog reset-on-close: the typed-confirm input state resets to '' when the dialog closes via a useEffect on `open`. Without this, opening the dialog a second time would auto-enable the Confirm button if the user previously typed the expected value — a silent UX bug. Reset is part of the locked contract."
  - "Soft-delete reuses 'delete' AUDIT_ACTIONS value for groups (vs. 'soft_delete_spec_field' for spec_fields): the closed AUDIT_ACTIONS tuple in src/lib/audit.ts already declares 'soft_delete_spec_field' as a separate action (legacy plan-04 inclusion driven by D-16). spec_field_groups soft-delete reuses 'delete' because (a) groups are recoverable so 'delete' isn't strictly correct for hard-delete vs. soft-delete distinction, (b) extending AUDIT_ACTIONS with 'soft_delete_spec_field_group' is over-fitting for v1 — the entityType + after.deletedAt fields fully distinguish in the viewer. If/when audit-log filter UX needs explicit soft-delete chips, the closed enum can be widened in a follow-up."
  - "DataTable opt-in over rewrite: extending DataTable with a `manualPagination?: boolean` prop (defaulting to true) is preferable to building a separate `<ClientDataTable>` component. The two tables share 95% of the rendering logic (toolbar, pagination footer, header, row map) — duplicating that just to flip three flags would be Pitfall #2-style anti-pattern. The opt-in prop reuses every existing call-site without changes."
  - "Group reorder uses per-row UPDATE inside one tx: the per-category group count is bounded (~10 max in practice), so per-row UPDATE inside a single transaction is acceptable. If group counts ever scale (unlikely for v1), this can be rewritten as `UPDATE spec_field_group SET sort_order = data.sort_order FROM (VALUES ...) data WHERE id = data.id` — single statement. The transaction guarantees atomicity either way."
  - "Group sort_order via inline integer input + dnd-kit deferred: the plan's <action> mentions dnd-kit reordering as a stretch goal; v1 ships the integer-input UX (admin types the new sort_order; flushes via reorderGroups on blur) which is good enough for the small group counts expected. Phase 5 polish can swap in dnd-kit if the admin team requests visual reordering — the reorderGroups Server Action's contract (`{ categoryId, ordering: [{id, sortOrder}] }`) is identical regardless of the UI."
  - "Helper text storage deferred: spec_field translations only persist `label` (Phase-1 schema spec_field_translations.label TEXT NOT NULL — there is no help_text column). The Zod schema accepts helpText optional/nullable so the form input can capture it but the action drops it on the floor today (the SET payload only includes label). Phase 3 / Phase 5 polish can add a help_text column + migrate the form's helpText field through if/when the public detail page wants to render it. The form preserves the field UX so the contract is forward-compatible."

deviations:
  - "Rule-1 (plan internal-spec drift): SPEC_FIELD_TYPES literal in the plan included 'range' which is not in the LIVE Phase-1 spec_data_type pgEnum (D-16/17 explicitly bans range from data_type). Aligned with the LIVE schema. The form exposes 'range' via the spec_filter_kind select (filterKind), NOT via dataType. Same posture every previous plan adopted (LIVE schema wins per CLAUDE.md scope-boundary)."
  - "Rule-1 (plan internal-spec drift): plan's <behavior> describes hard-delete as 'cascades via FK ON DELETE CASCADE'; LIVE schema declares ON DELETE SET NULL. Honored LIVE schema. The action's body works identically (DELETE the row; FK does the cascade). The test asserts the LIVE posture (value row survives with NULL spec_field_id) so future schema flips are caught."
  - "Rule-3 (testability / acceptance criterion enabler): plan acceptance criterion 'manualPagination={false} in spec-fields-table.tsx >=1' was unsatisfiable against the existing DataTable which hardcoded manualPagination: true. Extended DataTable with a `manualPagination?: boolean` prop (defaults true to preserve every existing call-site). The flag flips the three TanStack manual* options together AND attaches the client-side row models. This is the cleanest fix; the alternative (forking DataTable into a separate ClientDataTable) would have duplicated 95% of the rendering logic. Plan's Open Q §3 explicitly authorized client-side pagination for spec-fields, so the prop just makes that authorization mechanically possible."
  - "Rule-1 (plan UI refinement): the plan's <action> for spec-fields-table.tsx mentioned 'Edit / Rename / Soft-delete / Hard-delete' as four buttons in the action column. We render those four buttons but soft-delete is hidden when the row is already deleted (you can't soft-delete twice; the admin would either restore — out of scope for v1 — or hard-delete). Hard-delete remains visible always so admins can clean up soft-deleted rows. This is a UX clarification, not a functional change."
  - "Rule-1 (plan UI scope): the plan's <action> for groups/page.tsx mentioned dnd-kit drag reorder. Shipped the simpler integer-input UX (Phase 5 polish can swap in dnd-kit if requested). The reorderGroups Server Action contract is unchanged regardless of UI."

threat-flags: []  # No new trust boundaries introduced beyond the spec-fields plan-defined T-02-11-01..T-02-11-06 set.

requirements-completed: [ADMIN-05]
requirements-touched: [ADMIN-11, OPS-01]  # logAudit on every mutation (ADMIN-11) + revalidateTag fan-out (OPS-01) — both already complete; this plan exercises them on three new entities (spec_field create/update/rename/soft-delete/hard-delete + spec_field_group create/update/reorder/soft-delete).

duration: ~30min
completed: 2026-04-28
---

# Phase 2 Plan 11: Spec-Fields Editor Summary

Plan 02-11 lands the design-spike concern from Phase 1 — the spec-schema editor with rename / soft-delete / hard-delete / type-immutability / spec_field_group CRUD — directly implementing D-06, D-07, D-08, and D-09 verbatim. Soft-delete repository wrapper (Open Q §4) ships in the same plan so Phase 3 public reads are structurally protected from leaking soft-deleted rows.

## What shipped

**Two new primitives** (reused by future plans):
- `src/components/admin/confirm-dialog.tsx` — AlertDialog wrapper with optional type-the-key gate. Used here by rename (D-06) + hard-delete (D-07); reused by 02-13b lifecycle actions.
- `src/lib/repositories/spec-field.ts` — `findActiveSpecFields(categoryId)` / `findActiveSpecField(id)` auto-apply `WHERE deleted_at IS NULL`. Phase 3 public reads import from here exclusively; Phase 5 ESLint rule blocks direct queries against `specFields` outside the wrapper + admin actions.

**Seven Server Actions** (4 spec-field + 3 spec-field-group), all wrapped by `withAdminAction`:
- `saveSpecField` with D-08 runtime type-lock (throws `DATA_TYPE_LOCKED` on dataType change).
- `renameSpecField` with `KEY_MISMATCH` stale-form guard + cascade UPDATE on `product_spec_values.extra_key`. Audit `rename_spec_field` with `before.key=old, after.key=new`.
- `softDeleteSpecField` setting `deleted_at = now()`. Audit `soft_delete_spec_field`.
- `deleteSpecField` dropping the row; FK is `ON DELETE SET NULL` per the LIVE Phase-1 schema (NOT cascade as the plan's behavior block phrased it). Audit `delete_spec_field` with `after_json IS NULL`.
- `saveSpecFieldGroup` (insert/update + 3 translations + audit `create`/`update`).
- `reorderGroups` (batch sort_order swap inside one tx; single audit row attributed to the categoryId).
- `deleteSpecFieldGroup` (soft-delete; reuses `delete` audit value with `entityType='spec_field_group'`).

**Eight admin route files** + form & list helpers — all reusing `LocaleTabs` from 02-09 verbatim, plus the new `ConfirmDialog`.

**One DataTable extension**: `manualPagination?: boolean` prop (defaults true), enabling Open Q §3's client-side pagination posture for the spec-fields list (~80 rows project-wide). Resolves the plan's literal acceptance grep and unblocks future small in-memory lists.

## Test posture

**8 new live-Neon specs** (5 spec-field + 3 spec-field-group); whole vitest suite now 21 files / 95 tests green (was 19/87 at 02-10 close — `+2 files, +8 specs`). Tests assert the four spec-field-specific contracts (1+3+1 atomic create with 3-tag fan-out; D-08 type-lock; rename cascade on extra_key; soft- and hard-delete posture matching the LIVE schema's `ON DELETE SET NULL` FK) and the three group contracts (atomic create with 2-tag fan-out; transactional reorder swap; soft-delete with `delete` audit value).

`pnpm tsc --noEmit` plan-relevant clean (only the 7 pre-existing 02-01 script TS2532 errors remain — out-of-scope per CLAUDE.md scope-boundary, identical posture to plans 02-09/02-10). `pnpm build` Compiled successfully in 14.8s.

## Key decisions

- **Plan literal vs LIVE schema:** SPEC_FIELD_TYPES dropped 'range' (D-16/17 bans it from `data_type`); hard-delete honored `ON DELETE SET NULL` (LIVE schema) instead of plan's literal CASCADE. Both Rule-1 plan internal-spec drifts.
- **Open Q §3 (locked):** spec-fields list is client-paginated — DataTable extended with opt-in `manualPagination?: boolean`.
- **Open Q §4 (locked):** soft-delete enforcement via repository wrapper. Phase 5 ESLint rule will close the loop.
- **D-08 defense-in-depth:** dataType select disabled in UI + `saveSpecField` throws on flip.
- **D-06 limited cascade:** `renameSpecField` only touches `product_spec_values.extra_key` rows where `extra_key = oldKey AND spec_field_id = id` — preserves admin's deliberate divergence on `is_extra=true` rows.
- **Group soft-delete reuses 'delete' audit value:** entityType + after.deletedAt distinguish from hard-delete in the viewer.

## Deviations

Five auto-fixes (all Rule-1 plan internal-spec drifts or Rule-3 acceptance-criterion enablers); see frontmatter `deviations` section. No Rule-4 architectural changes; the plan executed close to as-written.

## Self-Check: PASSED

All 18 created files exist on disk. All 5 commits referenced (99f365c, 0a392d9, 4f5d719, d61d2b6, d2c5bf9, 90f87cc) exist in `git log --oneline`.
