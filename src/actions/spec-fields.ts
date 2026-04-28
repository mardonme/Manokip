"use server";

// Plan 02-11 Task 11.2 — spec-field Server Actions (ADMIN-05 / OPS-01).
//
// Four actions, all wrapped by withAdminAction (D-15..D-17 admin gate +
// Zod allowlist + discriminated AdminActionResult return):
//
//   saveSpecField(input):
//     - Insert OR update. On update, BLOCK changes to dataType (D-08
//       type-lock) — throw an error so withAdminAction maps to
//       { ok:false, error:'unknown' }. The UI also disables the type
//       select (defense-in-depth).
//     - Pre-tx snapshot read for audit before_json + the type-lock check.
//     - dbTx.transaction: base upsert + 3 translations upsert + logAudit.
//     - AFTER tx.commit: revalidateSpecField(id, categoryId).
//
//   renameSpecField(input) — D-06:
//     - Pre-tx snapshot to read the current key + categoryId.
//     - Guard: thrown error if before.key !== oldKey (stale-form race).
//     - dbTx.transaction: UPDATE spec_field.key + UPDATE
//       product_spec_values.extra_key WHERE spec_field_id = id AND
//       extra_key = oldKey + logAudit(action='rename_spec_field') with
//       before.key = old, after.key = new.
//     - AFTER tx.commit: revalidateSpecField.
//     - The "impact preview" (count of affected rows) is a separate
//       read-only Server Action consumed by the UI; this action does NOT
//       require the count to be passed in (it just runs).
//
//   softDeleteSpecField(input) — D-07:
//     - Pre-tx snapshot for audit before_json.
//     - dbTx.transaction: UPDATE spec_field SET deleted_at = now() +
//       logAudit(action='soft_delete_spec_field').
//     - AFTER tx.commit: revalidateSpecField.
//
//   deleteSpecField(input) — D-07:
//     - Pre-tx snapshot for audit before_json.
//     - dbTx.transaction: DELETE spec_field row + logAudit(
//       action='delete_spec_field', after=null).
//     - FK behaviour: product_spec_values.spec_field_id is ON DELETE
//       SET NULL (Phase-1 spec-values.ts:30-32) — value rows survive with
//       a NULL FK. The plan describes this as "cascade" but the v1
//       schema's actual posture is "orphan with NULL spec_field_id".
//       Either way the spec_field row goes away.
//     - AFTER tx.commit: revalidateSpecField.
//
// Closest analog: src/actions/manufacturers.ts (plan 02-10) + the
// universal Server Action shape in 02-PATTERNS.md.

import { eq, and, sql } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import { specFields, specFieldTranslations, productSpecValues } from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { revalidateSpecField } from "@/lib/revalidation";
import {
  specFieldSaveSchema,
  specFieldRenameSchema,
  specFieldSoftDeleteSchema,
  specFieldHardDeleteSchema,
} from "@/lib/zod/spec-field";

const LOCALES = ["uz", "ru", "en"] as const;

export const saveSpecField = withAdminAction(
  specFieldSaveSchema,
  async (input, ctx) => {
    // 1. Pre-tx snapshot — required for audit before_json AND the D-08
    //    type-lock check. Read OUTSIDE the transaction (small inefficiency,
    //    acceptable; matches the categories/manufacturers posture).
    const before = input.id
      ? (
          await dbTx
            .select()
            .from(specFields)
            .where(eq(specFields.id, input.id))
            .limit(1)
        )[0] ?? null
      : null;

    // D-08 (defense-in-depth): once a spec_field is saved with a dataType,
    // the type cannot be changed. Throw so withAdminAction returns
    // { ok:false, error:'unknown' }; the UI's disabled select is the
    // user-visible mitigation.
    if (before && before.dataType !== input.dataType) {
      throw new Error("DATA_TYPE_LOCKED");
    }

    // 2. Mutation — base row + 3 translation rows + audit row, atomic.
    const result = await dbTx.transaction(async (tx) => {
      const [row] = input.id
        ? await tx
            .update(specFields)
            .set({
              categoryId: input.categoryId,
              key: input.key,
              // dataType deliberately excluded from the SET — the pre-tx
              // guard above already rejected any change. Mirroring it here
              // would be redundant but harmless; we omit to keep the
              // SET payload tight.
              unit: input.unit ?? null,
              required: input.required,
              filterKind: input.filterKind ?? null,
              filterGroupKey: input.filterGroupKey ?? null,
              groupId: input.groupId ?? null,
              sortOrder: input.sortOrder,
            })
            .where(eq(specFields.id, input.id))
            .returning()
        : await tx
            .insert(specFields)
            .values({
              categoryId: input.categoryId,
              key: input.key,
              dataType: input.dataType,
              unit: input.unit ?? null,
              required: input.required,
              filterKind: input.filterKind ?? null,
              filterGroupKey: input.filterGroupKey ?? null,
              groupId: input.groupId ?? null,
              sortOrder: input.sortOrder,
            })
            .returning();

      if (!row) {
        throw new Error("spec_field row not found after upsert");
      }

      for (const locale of LOCALES) {
        const t = input.translations[locale];
        await tx
          .insert(specFieldTranslations)
          .values({
            specFieldId: row.id,
            locale,
            label: t.label,
          })
          .onConflictDoUpdate({
            target: [
              specFieldTranslations.specFieldId,
              specFieldTranslations.locale,
            ],
            set: {
              label: t.label,
            },
          });
      }

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: input.id ? "update" : "create",
        entityType: "spec_field",
        entityId: row.id,
        before,
        after: row,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return row;
    });

    // 3. Cache invalidation AFTER tx.commit (PITFALL #2).
    await revalidateSpecField(result.id, result.categoryId);

    return result;
  },
);

export const renameSpecField = withAdminAction(
  specFieldRenameSchema,
  async ({ id, oldKey, newKey }, ctx) => {
    // Pre-tx snapshot — needed for the stale-form race guard, the audit
    // before_json, AND the categoryId for the cache fan-out.
    const before =
      (
        await dbTx
          .select()
          .from(specFields)
          .where(eq(specFields.id, id))
          .limit(1)
      )[0] ?? null;

    if (!before) {
      throw new Error("NOT_FOUND");
    }
    if (before.key !== oldKey) {
      // Pitfall #14 — the form's oldKey is stale (someone renamed it in a
      // parallel session). Reject so the admin reloads.
      throw new Error("KEY_MISMATCH");
    }

    const result = await dbTx.transaction(async (tx) => {
      const [updated] = await tx
        .update(specFields)
        .set({ key: newKey })
        .where(eq(specFields.id, id))
        .returning();

      if (!updated) {
        throw new Error("spec_field row not found during rename");
      }

      // D-06: cascade-rename the extra_key column on product_spec_values
      // rows that reference this field with the old key. Limited to rows
      // where extra_key matches oldKey to avoid clobbering legitimately-
      // diverged keys (extra_key is meant to mirror spec_field.key for
      // the typed slot, but free-form `is_extra=true` rows may set their
      // own extra_key independently).
      await tx
        .update(productSpecValues)
        .set({ extraKey: newKey })
        .where(
          and(
            eq(productSpecValues.specFieldId, id),
            eq(productSpecValues.extraKey, oldKey),
          ),
        );

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "rename_spec_field",
        entityType: "spec_field",
        entityId: id,
        before: { key: oldKey },
        after: { key: newKey },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return updated;
    });

    await revalidateSpecField(result.id, result.categoryId);

    return result;
  },
);

export const softDeleteSpecField = withAdminAction(
  specFieldSoftDeleteSchema,
  async ({ id }, ctx) => {
    const before =
      (
        await dbTx
          .select()
          .from(specFields)
          .where(eq(specFields.id, id))
          .limit(1)
      )[0] ?? null;

    if (!before) {
      throw new Error("NOT_FOUND");
    }

    const result = await dbTx.transaction(async (tx) => {
      const [updated] = await tx
        .update(specFields)
        .set({ deletedAt: sql`now()` })
        .where(eq(specFields.id, id))
        .returning();

      if (!updated) {
        throw new Error("spec_field row not found during soft-delete");
      }

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "soft_delete_spec_field",
        entityType: "spec_field",
        entityId: id,
        before,
        after: updated,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return updated;
    });

    await revalidateSpecField(result.id, result.categoryId);

    return { id, deletedAt: result.deletedAt };
  },
);

export const deleteSpecField = withAdminAction(
  specFieldHardDeleteSchema,
  async ({ id }, ctx) => {
    const before =
      (
        await dbTx
          .select()
          .from(specFields)
          .where(eq(specFields.id, id))
          .limit(1)
      )[0] ?? null;

    if (!before) {
      throw new Error("NOT_FOUND");
    }

    await dbTx.transaction(async (tx) => {
      // Phase-1 FK posture (src/db/schema/spec-values.ts:30-32):
      //   product_spec_values.spec_field_id REFERENCES spec_field(id)
      //   ON DELETE SET NULL
      // — value rows survive with a NULL FK. Translations cascade via
      //   ON DELETE CASCADE on spec_field_translations.spec_field_id.
      await tx.delete(specFields).where(eq(specFields.id, id));

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "delete_spec_field",
        entityType: "spec_field",
        entityId: id,
        before,
        after: null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    });

    await revalidateSpecField(id, before.categoryId);

    return { deleted: id };
  },
);
