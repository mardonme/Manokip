"use server";

// Plan 02-10 Task 10.2 — manufacturers Server Actions (ADMIN-04 / OPS-01).
//
// Mirrors src/actions/categories.ts (the universal Server Action shape from
// 02-PATTERNS, verified by plan 02-09's 3 live-Neon specs). Differences vs.
// categories:
//
//   - logoPublicId set on the BASE row (D-07 Cloudinary public_id SSOT).
//     Persists ONLY the short public_id (e.g. "manufacturers/acme-logo"),
//     never the full https URL. Render-time <CldImage> resolves the URL.
//
//   - No tree (manufacturers are flat). Cache fan-out is the simpler
//     revalidateManufacturer (3 tags: manufacturer:<id>, manufacturers-list,
//     sitemap) — no equivalent of revalidateCategoryMove needed.
//
// Universal shape (PITFALL #2 mitigated structurally — every revalidate
// call lives OUTSIDE the dbTx.transaction lambda):
//
//   saveManufacturer(input):
//     1. Pre-tx snapshot — needed for the audit before_json (logoPublicId
//        before/after surfaced for the audit-viewer in plan 02-15).
//     2. dbTx.transaction:
//          - INSERT or UPDATE the manufacturers row.
//          - Loop uz/ru/en — INSERT each manufacturerTranslations row
//            with ON CONFLICT (manufacturer_id, locale) DO UPDATE so
//            re-saves replace name/slug/description in place.
//          - logAudit(tx, …) inside the same tx (D-16 atomicity).
//     3. AFTER tx.commit: revalidateManufacturer(id).
//
//   deleteManufacturer({id}):
//     - dbTx.transaction: DELETE manufacturer row (FK ON DELETE CASCADE
//       drops translations) + logAudit(action='delete', after=null).
//     - AFTER tx.commit: revalidateManufacturer(id).
//
// Closest analog: src/actions/categories.ts (plan 02-09).

import { eq } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import { manufacturers, manufacturerTranslations } from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { revalidateManufacturer } from "@/lib/revalidation";
import {
  manufacturerInsertSchema,
  manufacturerDeleteSchema,
} from "@/lib/zod/manufacturer";

const LOCALES = ["uz", "ru", "en"] as const;

export const saveManufacturer = withAdminAction(
  manufacturerInsertSchema,
  async (input, ctx) => {
    // 1. Pre-tx snapshot — required for audit before_json. Read OUTSIDE the
    //    transaction (small inefficiency, acceptable; matches the categories
    //    posture from plan 02-09).
    const before = input.id
      ? (
          await dbTx
            .select()
            .from(manufacturers)
            .where(eq(manufacturers.id, input.id))
            .limit(1)
        )[0] ?? null
      : null;

    // 2. Mutation — base row + 3 translation rows + audit row, atomic.
    //    Plan 03-07 (D-11): is_official_rep persists on the base row;
    //    relationship_note persists per-locale on each translation row.
    const result = await dbTx.transaction(async (tx) => {
      const [row] = input.id
        ? await tx
            .update(manufacturers)
            .set({
              logoPublicId: input.logoPublicId ?? null,
              isOfficialRep: input.isOfficialRep,
              updatedAt: new Date(),
            })
            .where(eq(manufacturers.id, input.id))
            .returning()
        : await tx
            .insert(manufacturers)
            .values({
              logoPublicId: input.logoPublicId ?? null,
              isOfficialRep: input.isOfficialRep,
            })
            .returning();

      if (!row) {
        // Defensive: input.id pointed at a non-existent row → no UPDATE
        // returned. Surface as `unknown` via withAdminAction.
        throw new Error("manufacturer row not found after upsert");
      }

      for (const locale of LOCALES) {
        const t = input.translations[locale];
        // Plan 03-07 (D-11): relationship_note persists per-locale alongside
        // the existing description column.
        const relationshipNote = t.relationshipNote ?? null;
        await tx
          .insert(manufacturerTranslations)
          .values({
            manufacturerId: row.id,
            locale,
            name: t.name,
            slug: t.slug,
            description: t.description ?? null,
            relationshipNote,
          })
          .onConflictDoUpdate({
            target: [
              manufacturerTranslations.manufacturerId,
              manufacturerTranslations.locale,
            ],
            set: {
              name: t.name,
              slug: t.slug,
              description: t.description ?? null,
              relationshipNote,
            },
          });
      }

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: input.id ? "update" : "create",
        entityType: "manufacturer",
        entityId: row.id,
        before,
        after: row,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return row;
    });

    // 3. Cache invalidation AFTER tx.commit (PITFALL #2 / D-10).
    await revalidateManufacturer(result.id);

    return result;
  },
);

export const deleteManufacturer = withAdminAction(
  manufacturerDeleteSchema,
  async ({ id }, ctx) => {
    const before =
      (
        await dbTx
          .select()
          .from(manufacturers)
          .where(eq(manufacturers.id, id))
          .limit(1)
      )[0] ?? null;

    if (!before) {
      // Same NOT_FOUND sentinel posture as deleteCategory (plan 02-09) —
      // withAdminAction maps to { ok:false, error:'unknown' } without
      // leaking unknown vs. forbidden.
      throw new Error("NOT_FOUND");
    }

    await dbTx.transaction(async (tx) => {
      await tx.delete(manufacturers).where(eq(manufacturers.id, id));

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "delete",
        entityType: "manufacturer",
        entityId: id,
        before,
        after: null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    });

    await revalidateManufacturer(id);

    return { deleted: id };
  },
);
