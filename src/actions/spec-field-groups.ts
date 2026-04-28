"use server";

// Plan 02-11 Task 11.3 — spec_field_group Server Actions (D-09 / ADMIN-05).
//
// Three actions, all wrapped by withAdminAction:
//
//   saveSpecFieldGroup(input):
//     - Insert OR update with 3-locale labels.
//     - Pre-tx snapshot for audit before_json.
//     - dbTx.transaction: base upsert + 3 translation upserts + logAudit.
//     - AFTER tx.commit: revalidateSpecFieldGroup(id, categoryId).
//
//   reorderGroups({ categoryId, ordering }):
//     - For each { id, sortOrder } in ordering, run tx.update inside one
//       transaction. Atomicity guarantees the new ordering is observable
//       all-or-nothing.
//     - logAudit(action='update', entityType='spec_field_group',
//       entityId=categoryId) — the reorder is a category-scoped operation,
//       not per-row, so attributing the audit row to the categoryId keeps
//       the audit log readable in the viewer (one entry per reorder
//       operation, not N).
//     - AFTER tx.commit: revalidateSpecFieldGroup for each affected id is
//       cheap but verbose; the simpler fan-out is to revalidate by
//       categoryId once. The current revalidateSpecFieldGroup helper
//       requires (id, categoryId) — we call it once with one of the affected
//       ids to invalidate the category tag at minimum. Phase 3 product
//       detail rendering keys on the category tag for group ordering.
//
//   deleteSpecFieldGroup({ id }):
//     - Soft-delete (D-09): set deleted_at. spec_field rows with this
//       group_id keep their FK; Phase 3 renders them as ungrouped.
//     - Pre-tx snapshot for audit before_json.
//     - dbTx.transaction: UPDATE deleted_at + logAudit(action='delete').
//     - AFTER tx.commit: revalidateSpecFieldGroup(id, categoryId).
//
// Closest analog: src/actions/spec-fields.ts (this plan, Task 11.2) for
// the soft-delete posture; src/actions/categories.ts (plan 02-09) for the
// universal upsert + 3-translation shape.

import { eq, sql } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import {
  specFieldGroups,
  specFieldGroupTranslations,
} from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { revalidateSpecFieldGroup } from "@/lib/revalidation";
import {
  specFieldGroupSaveSchema,
  specFieldGroupReorderSchema,
  specFieldGroupDeleteSchema,
} from "@/lib/zod/spec-field-group";

const LOCALES = ["uz", "ru", "en"] as const;

export const saveSpecFieldGroup = withAdminAction(
  specFieldGroupSaveSchema,
  async (input, ctx) => {
    const before = input.id
      ? (
          await dbTx
            .select()
            .from(specFieldGroups)
            .where(eq(specFieldGroups.id, input.id))
            .limit(1)
        )[0] ?? null
      : null;

    const result = await dbTx.transaction(async (tx) => {
      const [row] = input.id
        ? await tx
            .update(specFieldGroups)
            .set({
              categoryId: input.categoryId,
              key: input.key,
              sortOrder: input.sortOrder,
            })
            .where(eq(specFieldGroups.id, input.id))
            .returning()
        : await tx
            .insert(specFieldGroups)
            .values({
              categoryId: input.categoryId,
              key: input.key,
              sortOrder: input.sortOrder,
            })
            .returning();

      if (!row) {
        throw new Error("spec_field_group row not found after upsert");
      }

      for (const locale of LOCALES) {
        const t = input.translations[locale];
        await tx
          .insert(specFieldGroupTranslations)
          .values({
            groupId: row.id,
            locale,
            label: t.label,
          })
          .onConflictDoUpdate({
            target: [
              specFieldGroupTranslations.groupId,
              specFieldGroupTranslations.locale,
            ],
            set: { label: t.label },
          });
      }

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: input.id ? "update" : "create",
        entityType: "spec_field_group",
        entityId: row.id,
        before,
        after: row,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return row;
    });

    await revalidateSpecFieldGroup(result.id, result.categoryId);

    return result;
  },
);

export const reorderGroups = withAdminAction(
  specFieldGroupReorderSchema,
  async ({ categoryId, ordering }, ctx) => {
    await dbTx.transaction(async (tx) => {
      // Per-row UPDATE inside one transaction. For the ~10-group magnitude
      // expected per category, the round-trip count is acceptable; if this
      // ever scales we'd switch to a single UPDATE ... FROM (VALUES ...)
      // statement.
      for (const { id, sortOrder } of ordering) {
        await tx
          .update(specFieldGroups)
          .set({ sortOrder })
          .where(eq(specFieldGroups.id, id));
      }

      // Audit attributed to the category — one row per reorder operation,
      // not N. The before/after snapshots carry the ordering payload so
      // the audit-log viewer can show the swap.
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "update",
        entityType: "spec_field_group",
        entityId: categoryId,
        before: null,
        after: { ordering },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    });

    // Cache fan-out — the category tag covers Phase 3 group rendering.
    // Use the first id as a stand-in for the spec-field-group:<id> tag.
    if (ordering[0]) {
      await revalidateSpecFieldGroup(ordering[0].id, categoryId);
    }

    return { reordered: ordering.length };
  },
);

export const deleteSpecFieldGroup = withAdminAction(
  specFieldGroupDeleteSchema,
  async ({ id }, ctx) => {
    const before =
      (
        await dbTx
          .select()
          .from(specFieldGroups)
          .where(eq(specFieldGroups.id, id))
          .limit(1)
      )[0] ?? null;

    if (!before) {
      throw new Error("NOT_FOUND");
    }

    const result = await dbTx.transaction(async (tx) => {
      const [updated] = await tx
        .update(specFieldGroups)
        .set({ deletedAt: sql`now()` })
        .where(eq(specFieldGroups.id, id))
        .returning();

      if (!updated) {
        throw new Error("spec_field_group row not found during soft-delete");
      }

      // Phase-2 contract: soft-delete uses action='delete' (not a separate
      // 'soft_delete_spec_field_group') because the row is recoverable —
      // the closed AUDIT_ACTIONS tuple in src/lib/audit.ts already has
      // 'delete' which we reuse to keep the closed set tight. Re-use is
      // intentional; the entityType + after.deletedAt distinguish it from
      // a hard-delete in the viewer.
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "delete",
        entityType: "spec_field_group",
        entityId: id,
        before,
        after: updated,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return updated;
    });

    await revalidateSpecFieldGroup(result.id, result.categoryId);

    return { id, deletedAt: result.deletedAt };
  },
);
