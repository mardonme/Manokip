"use server";

// Plan 04-06 Tasks 6.1 + 6.2 — Industry Server Action layer (CONT-02 / CONT-04 /
// CONT-05). Mirror of src/actions/recipes.ts (Plan 04-05) verbatim — same
// 5-step transaction template, same W7 refusal-to-elevate guard, same atomic
// dual-column lifecycle writes, same audit-before-delete posture, same
// revalidateUsedIn fan-out for product_industries junction-row mutations.
//
//   saveIndustry(input):
//     5-step atomic transaction. Pre-tx snapshot read (audit before_json + W7
//     refusal-to-elevate guard + oldLinkedProductIds for revalidate fan-out)
//     → dbTx.transaction:
//        1. INSERT or UPDATE the industry base row (status verbatim from input,
//           NEVER derived from publishedAt).
//        2. Loop uz/ru/en — INSERT industry_translations with ON CONFLICT
//           (industry_id, locale) DO UPDATE so re-saves replace
//           title/slug/excerpt/body in place.
//        3. DELETE all product_industries for this industry, then INSERT new
//           array (replace-on-save D-04). position drives DataTable display order.
//        4. logAudit(action='create' | 'update', entityType='industry') inside
//           the tx (D-16 atomicity).
//     AFTER tx.commit:
//        - revalidateIndustry(id)
//        - revalidateUsedIn(productId) for every productId in
//          OLD ∪ NEW linkedProductIds (P4-5 fan-out covers BOTH sides of the
//          replace).
//
//     **Refusal-to-elevate (W7 / RESEARCH §saveIndustry):** if persisted
//     status differs from input.status, throw USE_PUBLISH_ACTION pre-tx.
//     saveIndustry may write the SAME status back to the row (status="draft"
//     on draft, etc.) but CANNOT transition. Lifecycle transitions go through
//     publishIndustry / unpublishIndustry.
//
//   publishIndustry(id):
//     Atomic dual-column write — `UPDATE industry SET status='published',
//     publishedAt=now() WHERE id=$1` in ONE SET clause so no observer ever
//     sees a half-transitioned row (D-09 / W7 / Phase 2 02-13b pattern).
//     Audit action='publish', entityType='industry'. Post-commit:
//     revalidateIndustry + revalidateUsedIn for currently-linked productIds.
//
//   unpublishIndustry(id):
//     Inverse atomic dual-column write — status='draft', publishedAt=null in
//     ONE SET clause. Audit action='unpublish'. Same revalidate fan-out.
//
//   deleteIndustry(id):
//     Hard delete. Pre-tx snapshot of industry + linked productIds. Inside the
//     tx: logAudit(action='delete', after=null) BEFORE tx.delete(industries).
//     FK cascade drops industry_translations + product_industries
//     (junctions.ts ON DELETE CASCADE on both sides). after_json=null per
//     audit.ts contract for hard delete. Post-commit: revalidateIndustry +
//     revalidateUsedIn for the captured-pre-tx linked productIds.
//
// Universal shape (Pitfall #2 mitigated structurally — every revalidate call
// lives OUTSIDE the dbTx.transaction lambda).
//
// Closest analog: src/actions/recipes.ts (Plan 04-05).

import { eq } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import { industries, industryTranslations, productIndustries } from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { revalidateIndustry, revalidateUsedIn } from "@/lib/revalidation";
import {
  industryInsertSchema,
  industryPublishSchema,
  industryDeleteSchema,
} from "@/lib/zod/industry";
import type { JSONContent } from "@tiptap/core";

const LOCALES = ["uz", "ru", "en"] as const;

/**
 * Read currently-linked product ids for an industry. Used:
 *   - saveIndustry: pre-tx capture of OLD set for the post-commit revalidate
 *     fan-out (union with NEW set per P4-5).
 *   - deleteIndustry: pre-tx capture so the post-commit revalidate fan-out
 *     covers each product whose Used-in widget was referencing the industry.
 *   - publishIndustry / unpublishIndustry: read on the way in for the
 *     post-commit revalidate fan-out (the lifecycle actions don't mutate
 *     junctions).
 */
async function readLinkedProductIds(industryId: string): Promise<string[]> {
  const rows = await dbTx
    .select({ productId: productIndustries.productId })
    .from(productIndustries)
    .where(eq(productIndustries.industryId, industryId));
  return rows.map((r) => r.productId);
}

export const saveIndustry = withAdminAction(
  industryInsertSchema,
  async (input, ctx) => {
    // 1. Pre-tx snapshot reads — required for audit before_json AND the W7
    //    refusal-to-elevate guard AND the post-commit revalidate fan-out
    //    (OLD set of linkedProductIds for the union).
    const before = input.id
      ? (
          await dbTx
            .select()
            .from(industries)
            .where(eq(industries.id, input.id))
            .limit(1)
        )[0] ?? null
      : null;

    const oldLinkedProductIds = input.id
      ? await readLinkedProductIds(input.id)
      : [];

    // W7 / refusal-to-elevate — saveIndustry may write the SAME status the row
    // already has (no transition) but CANNOT transition. Lifecycle transitions
    // go through publishIndustry / unpublishIndustry.
    if (before && before.status !== input.status) {
      throw new Error("USE_PUBLISH_ACTION");
    }

    // 2. Mutation — 5-step atomic block.
    const result = await dbTx.transaction(async (tx) => {
      // Step 1: base industry row. status writes verbatim from input.
      // publishedAt is NOT touched by saveIndustry — only the lifecycle
      // actions set it. The Zod default already gave us null on create; on
      // update we preserve whatever was persisted by NOT including the column
      // in SET.
      const [row] = input.id
        ? await tx
            .update(industries)
            .set({
              featuredImagePublicId: input.featuredImagePublicId,
              status: input.status,
              updatedAt: new Date(),
            })
            .where(eq(industries.id, input.id))
            .returning()
        : await tx
            .insert(industries)
            .values({
              featuredImagePublicId: input.featuredImagePublicId,
              status: input.status,
            })
            .returning();

      if (!row) {
        throw new Error("industry row not found after upsert");
      }

      // Step 2: three translation rows (upsert).
      for (const locale of LOCALES) {
        const t = input.translations[locale];
        await tx
          .insert(industryTranslations)
          .values({
            industryId: row.id,
            locale,
            title: t.title,
            slug: t.slug,
            excerpt: t.excerpt ?? null,
            body: (t.body ?? null) as JSONContent | null,
          })
          .onConflictDoUpdate({
            target: [
              industryTranslations.industryId,
              industryTranslations.locale,
            ],
            set: {
              title: t.title,
              slug: t.slug,
              excerpt: t.excerpt ?? null,
              body: (t.body ?? null) as JSONContent | null,
            },
          });
      }

      // Step 3: linked products (product_industries junction) — replace-on-save.
      // DELETE all rows for this industryId, then INSERT new array with
      // explicit position (Zod schema enforces position is non-negative int).
      await tx
        .delete(productIndustries)
        .where(eq(productIndustries.industryId, row.id));

      if (input.linkedProductIds.length > 0) {
        await tx.insert(productIndustries).values(
          input.linkedProductIds.map((p) => ({
            productId: p.productId,
            industryId: row.id,
            position: p.position,
          })),
        );
      }

      // Step 4: audit (atomic with the rest). Generic AUDIT_ACTIONS verbs
      // (per CONTEXT D-03 + RESEARCH §Open Q §1) — 'create' | 'update' with
      // entityType='industry' discriminator (NOT 'create_industry' / etc.).
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: input.id ? "update" : "create",
        entityType: "industry",
        entityId: row.id,
        before,
        after: row,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return row;
    });

    // 3. Cache invalidation AFTER tx.commit (Pitfall #2 — never inside the tx
    //    lambda). Fan-out covers the industry detail tag + per-locale list +
    //    sitemap, plus the union of OLD ∪ NEW linkedProductIds for the
    //    Used-in widget on each affected product page (P4-5).
    await revalidateIndustry(result.id);
    const newLinkedProductIds = input.linkedProductIds.map((p) => p.productId);
    const affectedProductIds = new Set<string>([
      ...oldLinkedProductIds,
      ...newLinkedProductIds,
    ]);
    for (const pid of affectedProductIds) {
      await revalidateUsedIn(pid);
    }

    return result;
  },
);

// ─── Plan 04-06 Task 6.2: lifecycle actions ────────────────────────────────

export const publishIndustry = withAdminAction(
  industryPublishSchema,
  async ({ id }, ctx) => {
    // Pre-tx capture of currently-linked productIds for the post-commit
    // revalidate fan-out (publish doesn't mutate the junction; we just need
    // to know which Used-in widgets need to recompose).
    const linkedProductIds = await readLinkedProductIds(id);

    const result = await dbTx.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(industries)
        .where(eq(industries.id, id))
        .limit(1);
      if (!before) {
        throw new Error("NOT_FOUND");
      }
      const now = new Date();
      // ATOMIC dual-column write — status + publishedAt in ONE SET clause
      // per Phase 2 02-13b invariant (no observer sees a half-transitioned
      // row). NEVER two consecutive .set() calls.
      const [row] = await tx
        .update(industries)
        .set({
          status: "published",
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(industries.id, id))
        .returning();
      if (!row) {
        throw new Error("NOT_FOUND");
      }
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "publish",
        entityType: "industry",
        entityId: id,
        before: { status: before.status, publishedAt: before.publishedAt },
        after: { status: row.status, publishedAt: row.publishedAt },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return row;
    });

    await revalidateIndustry(id);
    for (const pid of linkedProductIds) {
      await revalidateUsedIn(pid);
    }

    return result;
  },
);

export const unpublishIndustry = withAdminAction(
  industryPublishSchema,
  async ({ id }, ctx) => {
    const linkedProductIds = await readLinkedProductIds(id);

    const result = await dbTx.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(industries)
        .where(eq(industries.id, id))
        .limit(1);
      if (!before) {
        throw new Error("NOT_FOUND");
      }
      const now = new Date();
      const [row] = await tx
        .update(industries)
        .set({
          status: "draft",
          publishedAt: null,
          updatedAt: now,
        })
        .where(eq(industries.id, id))
        .returning();
      if (!row) {
        throw new Error("NOT_FOUND");
      }
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "unpublish",
        entityType: "industry",
        entityId: id,
        before: { status: before.status, publishedAt: before.publishedAt },
        after: { status: row.status, publishedAt: row.publishedAt },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return row;
    });

    await revalidateIndustry(id);
    for (const pid of linkedProductIds) {
      await revalidateUsedIn(pid);
    }

    return result;
  },
);

export const deleteIndustry = withAdminAction(
  industryDeleteSchema,
  async ({ id }, ctx) => {
    // Pre-tx snapshot of linked productIds — once the DELETE cascades, the
    // junction rows are gone and we can no longer enumerate them. Capture
    // OUTSIDE the tx so the post-commit revalidate fan-out has the full set.
    const linkedProductIds = await readLinkedProductIds(id);

    await dbTx.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(industries)
        .where(eq(industries.id, id))
        .limit(1);
      if (!before) {
        throw new Error("NOT_FOUND");
      }
      // Audit row first — written BEFORE the DELETE so the audit insert can
      // still observe `before` even after FK cascades have fired in the same
      // tx. (audit_log has no FK to industry so the INSERT is structurally
      // independent of the parent's existence.) after_json=null per audit.ts
      // contract for hard delete.
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "delete",
        entityType: "industry",
        entityId: id,
        before,
        after: null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      // Hard delete — FK cascades drop industry_translations
      // (industries.ts:46 ON DELETE CASCADE) + product_industries
      // (junctions.ts:55 ON DELETE CASCADE). Forensic snapshot survives in
      // audit_log.before_json.
      await tx.delete(industries).where(eq(industries.id, id));
    });

    await revalidateIndustry(id);
    for (const pid of linkedProductIds) {
      await revalidateUsedIn(pid);
    }

    return { id };
  },
);
