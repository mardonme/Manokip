---
phase: 02-admin-panel
plan: 11
type: execute
wave: 2
depends_on: [01, 04, 05, 06, 09]
files_modified:
  - src/actions/spec-fields.ts
  - src/actions/spec-field-groups.ts
  - src/lib/zod/spec-field.ts
  - src/lib/zod/spec-field-group.ts
  - src/lib/repositories/spec-field.ts
  - src/app/[locale]/admin/spec-fields/page.tsx
  - src/app/[locale]/admin/spec-fields/spec-fields-table.tsx
  - src/app/[locale]/admin/spec-fields/[id]/edit/page.tsx
  - src/app/[locale]/admin/spec-fields/spec-field-form.tsx
  - src/app/[locale]/admin/spec-fields/groups/page.tsx
  - src/app/[locale]/admin/spec-fields/groups/group-form.tsx
  - src/components/admin/confirm-dialog.tsx
  - tests/actions/spec-fields.test.ts
  - tests/actions/spec-field-groups.test.ts
autonomous: true
requirements: [ADMIN-05, ADMIN-11, OPS-01]
must_haves:
  truths:
    - "Admin can rename spec_field.key with impact-preview confirm dialog (D-06): the action transactionally updates spec_field.key + product_spec_values.extra_key for matching rows + writes audit"
    - "Admin can soft-delete a spec_field (D-07): sets deleted_at; rows in product_spec_values remain rendered until cleaned up"
    - "Admin can hard-delete a spec_field with confirmation (D-07): cascades via FK; audit row written"
    - "Admin can CRUD spec_field_group (D-09): create/update/reorder groups with 3-locale labels; assign spec fields to groups"
    - "Type changes are blocked once data_type is saved (D-08): UI disables the type select; Server Action throws if attempted"
    - "Soft-deleted fields are filtered out of public reads via repository wrapper (Open Q §4)"
    - "Spec-fields list is client-paginated (~80 rows expected — Open Q §3)"
  artifacts:
    - path: "src/actions/spec-fields.ts"
      provides: "saveSpecField + renameSpecField + softDeleteSpecField + deleteSpecField"
      contains: "rename_spec_field"
    - path: "src/actions/spec-field-groups.ts"
      provides: "saveSpecFieldGroup + deleteSpecFieldGroup + reorderGroups"
      contains: "withAdminAction"
    - path: "src/lib/repositories/spec-field.ts"
      provides: "Repository wrapper enforcing where(isNull(deletedAt)) on public reads"
      contains: "isNull(specFields.deletedAt)"
    - path: "src/components/admin/confirm-dialog.tsx"
      provides: "AlertDialog wrapper with type-the-key-to-confirm input (used by rename)"
      contains: "AlertDialog"
  key_links:
    - from: "src/actions/spec-fields.ts (renameSpecField)"
      to: "product_spec_values.extra_key column"
      via: "tx.update(productSpecValues).set({ extraKey: newKey }).where(eq(extraKey, oldKey))"
      pattern: "extraKey"
---

<objective>
Land the design-spike concern from Phase 1: the spec-schema editor with rename / soft-delete / hard-delete / type-immutability / spec_field_group CRUD. Implements D-06, D-07, D-08, D-09 verbatim. Also lands the soft-delete repository wrapper (Open Q §4) so public reads (Phase 3) silently filter `deleted_at IS NULL`.

Purpose: ADMIN-05 — the marquee spec-schema operation set; without these mechanics, the schema becomes brittle once products reference it.
Output: 2 Server Action modules + 2 Zod schemas + repository wrapper + 5 admin pages + ConfirmDialog primitive + 2 integration test files.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@CLAUDE.md
@src/db/schema/spec-fields.ts
@src/db/schema/spec-field-groups.ts
@src/db/schema/spec-values.ts
@src/lib/audit.ts
@src/lib/revalidation.ts
@src/lib/server-action.ts
@src/components/admin/data-table.tsx
@src/components/admin/locale-tabs.tsx
@src/actions/categories.ts

<assumptions>
- **Open Q §3 (spec-fields list pagination):** Locked — client-side. Phase 2 expects ~80 rows; client-side keeps the editor snappy and avoids the manualPagination wiring overhead.
- **Open Q §4 (soft-delete enforcement):** Locked — repository wrapper `src/lib/repositories/spec-field.ts` exposes `findActiveSpecFields()` and `findActiveSpecField(id)` that auto-apply `where(isNull(specFields.deletedAt))`. Phase 3 public reads import from this wrapper. ESLint rule (added in Phase 5) blocks direct `db.select(...).from(specFields)` outside of `src/lib/repositories/spec-field.ts` and admin Server Actions.
- **Open Q §1 (product.status):** Locked Option A in plan 02-01 — no `status` column.
</assumptions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 11.1: Repository wrapper + ConfirmDialog primitive</name>
  <files>src/lib/repositories/spec-field.ts, src/components/admin/confirm-dialog.tsx</files>
  <read_first>
    - src/db/schema/spec-fields.ts (current shape after plan 02-01 — has deletedAt + groupId)
    - src/db/client.ts (HTTP client for reads)
    - src/components/ui/alert-dialog.tsx (shadcn AlertDialog primitive)
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-06 ("Type the new key to confirm" UX)
  </read_first>
  <behavior>
    - Repository: `findActiveSpecFields(categoryId)` → returns rows where `deleted_at IS NULL`. `findActiveSpecField(id)` → single row or null.
    - ConfirmDialog: takes `title`, `description`, `confirmInput?: { expected: string; placeholder: string }`, `onConfirm` callback. If `confirmInput` is provided, the Confirm button is disabled until the user types `expected`.
  </behavior>
  <action>
    Create `src/lib/repositories/spec-field.ts`:
    ```typescript
    import { eq, and, isNull } from "drizzle-orm";
    import { db } from "@/db/client";
    import { specFields } from "@/db/schema";

    export async function findActiveSpecFields(categoryId: string) {
      return db.select().from(specFields)
        .where(and(eq(specFields.categoryId, categoryId), isNull(specFields.deletedAt)));
    }

    export async function findActiveSpecField(id: string) {
      const rows = await db.select().from(specFields)
        .where(and(eq(specFields.id, id), isNull(specFields.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    }
    ```

    Create `src/components/admin/confirm-dialog.tsx`:
    ```tsx
    "use client";
    import * as React from "react";
    import {
      AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
      AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";
    import { Input } from "@/components/ui/input";
    import { Button } from "@/components/ui/button";

    export interface ConfirmDialogProps {
      trigger: React.ReactNode;
      title: string;
      description: React.ReactNode;
      confirmLabel?: string;
      cancelLabel?: string;
      confirmInput?: { expected: string; placeholder: string };
      onConfirm: () => Promise<void> | void;
      destructive?: boolean;
    }

    export function ConfirmDialog({ trigger, title, description, confirmInput, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, destructive }: ConfirmDialogProps) {
      const [typed, setTyped] = React.useState("");
      const matches = !confirmInput || typed === confirmInput.expected;
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            {confirmInput && (
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmInput.placeholder} data-testid="confirm-input" />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button onClick={() => matches && onConfirm()} disabled={!matches} variant={destructive ? "destructive" : "default"} data-testid="confirm-action">
                  {confirmLabel}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'isNull(specFields.deletedAt)' src/lib/repositories/spec-field.ts` returns `>=2`
    - `grep -c 'findActiveSpecFields' src/lib/repositories/spec-field.ts` returns `>=1`
    - `grep -c 'data-testid="confirm-input"' src/components/admin/confirm-dialog.tsx` returns `1`
    - `grep -c 'data-testid="confirm-action"' src/components/admin/confirm-dialog.tsx` returns `1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Repository wrapper + ConfirmDialog ready.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 11.2: Spec-field Server Actions (save / rename / soft-delete / hard-delete) + tests</name>
  <files>src/actions/spec-fields.ts, src/lib/zod/spec-field.ts, tests/actions/spec-fields.test.ts</files>
  <read_first>
    - src/db/schema/spec-fields.ts (after plan 02-01 — deletedAt + groupId columns)
    - src/db/schema/spec-values.ts (productSpecValues.extraKey column for the rename impact)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/actions/categories.ts / manufacturers.ts / spec-fields.ts / ...` — spec-fields extras: rename = `tx.update(specFields).set({ key }).where(eq(id, ...))` + `tx.update(productSpecValues).set({ extraKey: newKey }).where(eq(extraKey, oldKey))`
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-06, D-07, D-08
  </read_first>
  <behavior>
    - saveSpecField (insert or update): if updating, BLOCK changes to `data_type` (D-08); allow rename only via `renameSpecField` action; allow other fields freely.
    - renameSpecField({ id, oldKey, newKey }): impact-preview is a separate read-only Server Action (returns `{ count, productCount }` from a SELECT); the actual rename runs in tx — UPDATE spec_field.key + UPDATE product_spec_values.extra_key WHERE extra_key = oldKey AND product_id IN (... rows referencing this spec_field via spec_field_id) + audit row with action='rename_spec_field' + before={key:oldKey} + after={key:newKey}.
    - softDeleteSpecField({ id }): UPDATE spec_field SET deleted_at = now(); audit action='soft_delete_spec_field'.
    - deleteSpecField({ id }): tx delete (cascades product_spec_values via FK ON DELETE CASCADE); audit action='delete_spec_field'; audit before contains the row + count of cascaded values.
  </behavior>
  <action>
    Create `src/lib/zod/spec-field.ts`:
    ```typescript
    import { z } from "zod";
    export const SPEC_FIELD_TYPES = ["number", "range", "enum", "bool", "text"] as const;
    export const specFieldSaveSchema = z.object({
      id: z.string().uuid().optional(),
      categoryId: z.string().uuid(),
      key: z.string().min(1).regex(/^[a-z0-9_]+$/),
      dataType: z.enum(SPEC_FIELD_TYPES),
      unit: z.string().optional().nullable(),
      isRequired: z.boolean().default(false),
      filterBehavior: z.enum(["range", "select", "toggle", "none"]).default("none"),
      groupId: z.string().uuid().nullable().optional(),
      sortOrder: z.number().int().nonnegative().default(0),
      translations: z.object({
        uz: z.object({ label: z.string().min(1), helpText: z.string().optional().nullable() }),
        ru: z.object({ label: z.string().min(1), helpText: z.string().optional().nullable() }),
        en: z.object({ label: z.string().min(1), helpText: z.string().optional().nullable() }),
      }),
    });
    export const renameSchema = z.object({
      id: z.string().uuid(),
      oldKey: z.string().min(1),
      newKey: z.string().min(1).regex(/^[a-z0-9_]+$/),
    });
    export const softDeleteSchema = z.object({ id: z.string().uuid() });
    export const hardDeleteSchema = z.object({ id: z.string().uuid() });
    ```

    Create `src/actions/spec-fields.ts` with the four Server Actions. The rename body:
    ```typescript
    export const renameSpecField = withAdminAction(renameSchema, async ({ id, oldKey, newKey }, ctx) => {
      const before = (await dbTx.select().from(specFields).where(eq(specFields.id, id)).limit(1))[0];
      if (!before) throw new Error("NOT_FOUND");
      if (before.key !== oldKey) throw new Error("KEY_MISMATCH");

      const result = await dbTx.transaction(async (tx) => {
        const [updated] = await tx.update(specFields).set({ key: newKey })
          .where(eq(specFields.id, id)).returning();
        // Cascade: rename extra_key in product_spec_values referencing this spec_field
        await tx.update(productSpecValues)
          .set({ extraKey: newKey })
          .where(and(eq(productSpecValues.specFieldId, id), eq(productSpecValues.extraKey, oldKey)));
        await logAudit(tx, {
          actorEmail: ctx.actorEmail,
          action: "rename_spec_field",
          entityType: "spec_field",
          entityId: id,
          before: { key: oldKey },
          after: { key: newKey },
          ip: ctx.ip, userAgent: ctx.userAgent,
        });
        return updated;
      });
      await revalidateSpecField(result.id, result.categoryId);
      return result;
    });
    ```
    Implement saveSpecField (with D-08 type-block on update), softDeleteSpecField (sets deleted_at, audit with action='soft_delete_spec_field'), and deleteSpecField (tx.delete + audit with action='delete_spec_field') by mirroring this pattern.

    Create `tests/actions/spec-fields.test.ts` with at least 5 integration tests:
    1. saveSpecField creates row + 3 translations + audit row.
    2. saveSpecField update with dataType change throws (D-08).
    3. renameSpecField updates spec_field.key + product_spec_values.extra_key for affected rows + audit action='rename_spec_field'.
    4. softDeleteSpecField sets deleted_at + audit action='soft_delete_spec_field'.
    5. deleteSpecField cascades product_spec_values + audit action='delete_spec_field' + after_json IS NULL.
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/spec-fields.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const saveSpecField = withAdminAction' src/actions/spec-fields.ts` returns `1`
    - `grep -c 'export const renameSpecField = withAdminAction' src/actions/spec-fields.ts` returns `1`
    - `grep -c 'export const softDeleteSpecField = withAdminAction' src/actions/spec-fields.ts` returns `1`
    - `grep -c 'export const deleteSpecField = withAdminAction' src/actions/spec-fields.ts` returns `1`
    - `grep -c '"rename_spec_field"' src/actions/spec-fields.ts` returns `>=1`
    - `grep -c '"soft_delete_spec_field"' src/actions/spec-fields.ts` returns `>=1`
    - `grep -c '"delete_spec_field"' src/actions/spec-fields.ts` returns `>=1`
    - `grep -c 'extraKey' src/actions/spec-fields.ts` returns `>=1`
    - `pnpm vitest run tests/actions/spec-fields.test.ts` exits 0; 5/5 tests pass
  </acceptance_criteria>
  <done>4 Server Actions ship with correct audit action enum values + cascade for rename.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 11.3: spec_field_group Server Actions + integration tests</name>
  <files>src/actions/spec-field-groups.ts, src/lib/zod/spec-field-group.ts, tests/actions/spec-field-groups.test.ts</files>
  <read_first>
    - src/db/schema/spec-field-groups.ts (from plan 02-01)
    - src/actions/spec-fields.ts (Task 11.2 — closest analog within this plan)
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-09 (group CRUD: create, drag fields between groups, reorder groups, reorder fields within a group)
  </read_first>
  <behavior>
    - saveSpecFieldGroup: insert + 3 translations (label per locale) + audit; revalidateSpecFieldGroup(id, categoryId).
    - reorderGroups({ categoryId, ordering: [{id, sortOrder}] }): tx.batch update sortOrder; audit action='update', entityType='spec_field_group', entityId=categoryId.
    - deleteSpecFieldGroup({ id }): set deleted_at (soft); fields with this group_id remain (their group_id stays, rendering as ungrouped in Phase 3).
  </behavior>
  <action>
    Create `src/lib/zod/spec-field-group.ts`:
    ```typescript
    import { z } from "zod";
    export const groupSaveSchema = z.object({
      id: z.string().uuid().optional(),
      categoryId: z.string().uuid(),
      key: z.string().min(1).regex(/^[a-z0-9_]+$/),
      sortOrder: z.number().int().nonnegative().default(0),
      translations: z.object({
        uz: z.object({ label: z.string().min(1) }),
        ru: z.object({ label: z.string().min(1) }),
        en: z.object({ label: z.string().min(1) }),
      }),
    });
    export const reorderSchema = z.object({
      categoryId: z.string().uuid(),
      ordering: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
    });
    export const groupDeleteSchema = z.object({ id: z.string().uuid() });
    ```

    Create `src/actions/spec-field-groups.ts` mirroring `src/actions/categories.ts` shape (insert/update + 3 translations) plus `reorderGroups` (a `for` loop of tx.update inside a single transaction) and `deleteSpecFieldGroup` (sets deleted_at).

    Create `tests/actions/spec-field-groups.test.ts` with 3 integration tests (create, reorder, soft-delete).
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/spec-field-groups.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const saveSpecFieldGroup' src/actions/spec-field-groups.ts` returns `1`
    - `grep -c 'export const reorderGroups' src/actions/spec-field-groups.ts` returns `1`
    - `grep -c 'export const deleteSpecFieldGroup' src/actions/spec-field-groups.ts` returns `1`
    - `pnpm vitest run tests/actions/spec-field-groups.test.ts` exits 0; 3/3 pass
  </acceptance_criteria>
  <done>Group CRUD ready; rendering is plan 02-13 + Phase 3.</done>
</task>

<task type="auto">
  <name>Task 11.4: Spec-fields list + edit + groups admin pages</name>
  <files>src/app/[locale]/admin/spec-fields/page.tsx, src/app/[locale]/admin/spec-fields/spec-fields-table.tsx, src/app/[locale]/admin/spec-fields/[id]/edit/page.tsx, src/app/[locale]/admin/spec-fields/spec-field-form.tsx, src/app/[locale]/admin/spec-fields/groups/page.tsx, src/app/[locale]/admin/spec-fields/groups/group-form.tsx</files>
  <read_first>
    - src/app/[locale]/admin/categories/* (closest analog)
    - src/components/admin/confirm-dialog.tsx (Task 11.1)
    - src/components/admin/data-table.tsx (Open Q §3 — for spec-fields list, set `manualPagination={false}` since client-side is locked)
  </read_first>
  <action>
    Create the 6 files. Highlights:
    - `page.tsx`: list page — fetches all spec_fields (active only via repository wrapper if needed; admin sees soft-deleted ones with a "deleted" filter chip), groups them visually by category. Client-side pagination (DataTable with manualPagination={false}).
    - `spec-fields-table.tsx`: columns = key, label (locale), category, dataType, unit, isRequired, group, deletedAt, actions: Edit / Rename (opens ConfirmDialog with type-the-new-key) / Soft-delete / Hard-delete (each with ConfirmDialog).
    - `[id]/edit/page.tsx`: RSC fetches the spec_field + 3 translations + an impact summary (`COUNT(*) FROM product_spec_values WHERE spec_field_id = id`).
    - `spec-field-form.tsx`: client form — dataType select is DISABLED when `id` exists (D-08); call saveSpecField on submit.
    - `groups/page.tsx`: list of spec_field_groups (per category) with reorder UX (dnd-kit) + delete + create buttons.
    - `groups/group-form.tsx`: 3-locale label form via LocaleTabs.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - 6 files exist
    - `grep -c 'ConfirmDialog' src/app/[locale]/admin/spec-fields/spec-fields-table.tsx` returns `>=2` (rename + delete)
    - `grep -c 'disabled' src/app/[locale]/admin/spec-fields/spec-field-form.tsx` returns `>=1` (D-08 dataType lock)
    - `grep -c 'manualPagination={false}' src/app/[locale]/admin/spec-fields/spec-fields-table.tsx` returns `>=1` (Open Q §3)
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Spec-fields editor UI ships; rename/delete/group CRUD reachable from the table.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| client → renameSpecField | newKey input → DB UPDATE + cascading UPDATE on product_spec_values |
| client → deleteSpecField | irreversible cascade |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-11-01 | Tampering | type change silent corruption (Pitfall #14) | mitigate | D-08 hard-block on update — Server Action throws + UI disables select |
| T-02-11-02 | Tampering | rename without impact-preview | mitigate | UI requires ConfirmDialog with type-the-new-key; Server Action rejects on key mismatch |
| T-02-11-03 | EoP | mass assignment via spec-field form | mitigate | Zod specFieldSaveSchema enumerates fields; SPEC_FIELD_TYPES is a closed enum |
| T-02-11-04 | Spoofing | hard-delete without confirmation (Pitfall #14) | mitigate | UI requires ConfirmDialog destructive variant; Server Action does no extra check (admin's responsibility) — audit row before tx commits |
| T-02-11-05 | Information Disclosure | soft-deleted rows leak to public | mitigate | Repository wrapper findActiveSpecFields auto-applies `where(isNull(deletedAt))`; Phase-5 adds ESLint rule |
| T-02-11-06 | Repudiation | admin denies rename | mitigate | Audit action='rename_spec_field' with before={key:old} + after={key:new} |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/actions/spec-fields.test.ts tests/actions/spec-field-groups.test.ts` exits 0 (8 tests total)
- `pnpm build` exits 0
</verification>

<success_criteria>
1. saveSpecField + renameSpecField + softDeleteSpecField + deleteSpecField ship with correct audit action enum.
2. spec_field_group CRUD ships (create, reorder, soft-delete).
3. ConfirmDialog primitive reusable; rename UX uses type-the-new-key.
4. dataType is locked post-save (D-08).
5. Repository wrapper enforces `isNull(deletedAt)`.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-11-SUMMARY.md` with: 4 spec_field actions + 3 group actions, audit action enum coverage, ConfirmDialog API, repository wrapper API, deferred ESLint rule for Phase 5.
</output>
