"use server";

// Plan 02-09 Task 9.2 — categories Server Actions (ADMIN-03 / OPS-01).
//
// Two actions, both wrapped by withAdminAction (D-15..D-17 admin gate +
// Zod allowlist + discriminated AdminActionResult return):
//
//   saveCategory(input):
//     1. Read `before` snapshot (outside tx; small inefficiency but
//        avoids cross-tx state). Used by audit_log + the move detector.
//     2. dbTx.transaction:
//          - INSERT or UPDATE the categories row (returning the canonical
//            row for the audit `after` snapshot).
//          - Loop uz/ru/en — INSERT each categoryTranslations row, with
//            ON CONFLICT (category_id, locale) DO UPDATE so re-saves of an
//            existing row replace name/slug/description in place.
//          - logAudit(tx, …) inside the same tx so the audit row commits/
//            rolls back atomically with the mutation (D-16).
//     3. AFTER tx.commit (PITFALL #2 — never inside the tx):
//          - if a parent change is detected -> revalidateCategoryMove (D-12)
//          - else                            -> revalidateCategory (D-10)
//
//   deleteCategory({id}):
//     - dbTx.transaction: DELETE the row (FK cascades translations) +
//       logAudit(tx, action='delete', after=null).
//     - AFTER tx.commit: if the row had a parent, revalidateCategoryMove
//       (the old parent's breadcrumb needs invalidation); else
//       revalidateCategory.
//
// Closest analog: 02-PATTERNS.md §`src/actions/categories.ts / …` (the
// universal Server Action shape) + src/actions/admins.ts (live precedent).

import { eq } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import { categories, categoryTranslations } from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import {
  revalidateCategory,
  revalidateCategoryMove,
} from "@/lib/revalidation";
import {
  categoryInsertSchema,
  categoryDeleteSchema,
} from "@/lib/zod/category";

const LOCALES = ["uz", "ru", "en"] as const;

export const saveCategory = withAdminAction(
  categoryInsertSchema,
  async (input, ctx) => {
    // 1. Pre-tx snapshot — required for the audit before_json AND for the
    //    move detector (revalidateCategoryMove vs. revalidateCategory).
    const before = input.id
      ? (
          await dbTx
            .select()
            .from(categories)
            .where(eq(categories.id, input.id))
            .limit(1)
        )[0] ?? null
      : null;

    // 2. Mutation — base row + 3 translation rows + audit row, atomic.
    const result = await dbTx.transaction(async (tx) => {
      const [row] = input.id
        ? await tx
            .update(categories)
            .set({
              parentId: input.parentId ?? null,
              sortOrder: input.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(categories.id, input.id))
            .returning()
        : await tx
            .insert(categories)
            .values({
              parentId: input.parentId ?? null,
              sortOrder: input.sortOrder,
            })
            .returning();

      if (!row) {
        // Defensive: if input.id pointed at a row that does not exist the
        // UPDATE returns no rows. Surface as an error so withAdminAction
        // maps to { ok:false, error:'unknown' }.
        throw new Error("category row not found after upsert");
      }

      for (const locale of LOCALES) {
        const t = input.translations[locale];
        await tx
          .insert(categoryTranslations)
          .values({
            categoryId: row.id,
            locale,
            name: t.name,
            slug: t.slug,
            description: t.description ?? null,
          })
          .onConflictDoUpdate({
            target: [
              categoryTranslations.categoryId,
              categoryTranslations.locale,
            ],
            set: {
              name: t.name,
              slug: t.slug,
              description: t.description ?? null,
            },
          });
      }

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: input.id ? "update" : "create",
        entityType: "category",
        entityId: row.id,
        before,
        after: row,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return row;
    });

    // 3. Cache invalidation AFTER tx.commit (PITFALL #2). The move detector
    //    only fires when both: (a) we have a `before` snapshot (i.e. update)
    //    AND (b) the parentId actually changed.
    const newParent = input.parentId ?? null;
    const parentChanged =
      before !== null && (before.parentId ?? null) !== newParent;

    if (parentChanged) {
      await revalidateCategoryMove(
        before.parentId ?? null,
        newParent,
        result.id,
      );
    } else {
      await revalidateCategory(result.id);
    }

    return result;
  },
);

export const deleteCategory = withAdminAction(
  categoryDeleteSchema,
  async ({ id }, ctx) => {
    const before =
      (
        await dbTx
          .select()
          .from(categories)
          .where(eq(categories.id, id))
          .limit(1)
      )[0] ?? null;

    if (!before) {
      // Same posture as plan 02-07 acceptInvite: throw a typed sentinel so
      // withAdminAction maps to { ok:false, error:'unknown' } without the
      // caller learning whether the id was unknown vs. forbidden.
      throw new Error("NOT_FOUND");
    }

    await dbTx.transaction(async (tx) => {
      await tx.delete(categories).where(eq(categories.id, id));

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "delete",
        entityType: "category",
        entityId: id,
        before,
        after: null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    });

    // Fan-out: if the deleted node had a parent, the parent breadcrumb
    // needs invalidation (D-12); otherwise the lighter revalidateCategory
    // is sufficient.
    if (before.parentId) {
      await revalidateCategoryMove(before.parentId, null, id);
    } else {
      await revalidateCategory(id);
    }

    return { deleted: id };
  },
);
