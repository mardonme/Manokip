"use server";

// Plan 02-13a Task 13a.2 + 13a.3 — product Server Actions (ADMIN-06 / ADMIN-08
// / ADMIN-09 / ADMIN-10 data tier / ADMIN-11 audit / OPS-01 cache fan-out).
//
// Two actions ship in this plan; lifecycle (publishProduct, unpublishProduct,
// deleteProduct) lands in plan 02-13b on top of these:
//
//   saveProduct(input):
//     The 5-step atomic transaction that drives the marquee product editor.
//     Pre-tx snapshot read (audit before_json + refusal-to-elevate guard) →
//     dbTx.transaction:
//        1. INSERT or UPDATE the product base row (status written verbatim
//           from input — NEVER derived from publishedAt).
//        2. Loop uz/ru/en — INSERT product_translations with ON CONFLICT
//           (product_id, locale) DO UPDATE so re-saves replace name/slug/
//           shortDesc/longDesc in place.
//        3. DELETE all product_spec_values for this product, then INSERT
//           the new array (replace-on-save D-19/20). Per-text-value locale
//           translations are inserted from the inline `translations` map on
//           each spec value.
//        4. DELETE all product_translation_field_flags for this product,
//           then INSERT only the truthy entries from input.mtFlags
//           (replace-on-save, T-02-13a-06).
//        5. logAudit(action='create' | 'update') inside the same tx (D-16
//           atomicity).
//     AFTER tx.commit: revalidateProduct(id) → 4 tags
//     (product:<id>, products-list, sitemap, search-index).
//
//     **Refusal-to-elevate (W7 / T-02-13a-02):** if persisted status differs
//     from input.status, throw USE_PUBLISH_ACTION. saveProduct may write the
//     SAME status back to the row (status="draft" on a draft row, etc.) but
//     CANNOT transition. Lifecycle transitions go through publishProduct /
//     unpublishProduct (plan 02-13b).
//
//   duplicateProduct({ sourceId }):
//     Full-clone path (D-03). Reads the source + its translations + spec
//     values (and their translations) + MT flags, then re-inserts each set
//     under a new product id with:
//       - status forced to 'draft' regardless of source (T-02-13a-03).
//       - publishedAt forced to null (clears the publish timestamp).
//       - per-locale slug suffixed `-copy` to avoid the unique-slug collision
//         (T-02-13a-04). Subsequent admin renames are allowed.
//     Audit action='duplicate_product' with before={sourceId}, after={id,
//     status:'draft'}. AFTER tx.commit: revalidateProduct(cloneId).
//
// Universal shape (PITFALL #2 mitigated structurally — every revalidate
// call lives OUTSIDE the dbTx.transaction lambda, T-02-13a-07).
//
// Closest analog: src/actions/spec-fields.ts (plan 02-11) + src/actions/
// manufacturers.ts (plan 02-10). The product write path adds two extras over
// the universal shape: the 5-table replace-on-save block + the W7 guard.

import { eq } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import {
  products,
  productTranslations,
  productSpecValues,
  productSpecValueTranslations,
  productTranslationFieldFlags,
} from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { revalidateProduct } from "@/lib/revalidation";
import {
  productInsertSchema,
  productDuplicateSchema,
  productPublishSchema,
  productDeleteSchema,
} from "@/lib/zod/product";

const LOCALES = ["uz", "ru", "en"] as const;

export const saveProduct = withAdminAction(
  productInsertSchema,
  async (input, ctx) => {
    // 1. Pre-tx snapshot — required for audit before_json AND the W7
    //    refusal-to-elevate guard. Read OUTSIDE the transaction; matches
    //    the categories / manufacturers / spec-fields posture.
    const before = input.id
      ? (
          await dbTx
            .select()
            .from(products)
            .where(eq(products.id, input.id))
            .limit(1)
        )[0] ?? null
      : null;

    // W7 / T-02-13a-02: refuse to elevate via saveProduct. Lifecycle
    //   transitions ('draft' ↔ 'published') go through publishProduct /
    //   unpublishProduct (plan 02-13b). saveProduct may write the SAME
    //   status the row already has (no transition) — same-status save is
    //   the common path during content edits.
    if (before && before.status !== input.status) {
      throw new Error("USE_PUBLISH_ACTION");
    }

    // 2. Mutation — 5-step atomic block.
    const result = await dbTx.transaction(async (tx) => {
      // Step 1: base product row. status writes verbatim from input.
      const [row] = input.id
        ? await tx
            .update(products)
            .set({
              categoryId: input.categoryId,
              manufacturerId: input.manufacturerId ?? null,
              status: input.status,
              updatedAt: new Date(),
            })
            .where(eq(products.id, input.id))
            .returning()
        : await tx
            .insert(products)
            .values({
              categoryId: input.categoryId,
              manufacturerId: input.manufacturerId ?? null,
              status: input.status,
            })
            .returning();

      if (!row) {
        // Defensive: input.id pointed at a non-existent row → no UPDATE
        // returned. Surfaces as `unknown` via withAdminAction.
        throw new Error("product row not found after upsert");
      }

      // Step 2: three translation rows (upsert).
      for (const locale of LOCALES) {
        const t = input.translations[locale];
        await tx
          .insert(productTranslations)
          .values({
            productId: row.id,
            locale,
            name: t.name,
            slug: t.slug,
            shortDesc: t.shortDesc ?? null,
            longDesc: t.longDesc ?? null,
          })
          .onConflictDoUpdate({
            target: [productTranslations.productId, productTranslations.locale],
            set: {
              name: t.name,
              slug: t.slug,
              shortDesc: t.shortDesc ?? null,
              longDesc: t.longDesc ?? null,
            },
          });
      }

      // Step 3: spec values — replace-on-save (DELETE then INSERT). The
      //   per-row product_spec_value_translations FK has ON DELETE CASCADE
      //   (spec-values.ts:60) so the DELETE drops translation rows too.
      await tx
        .delete(productSpecValues)
        .where(eq(productSpecValues.productId, row.id));

      if (input.specValues.length > 0) {
        const inserted = await tx
          .insert(productSpecValues)
          .values(
            input.specValues.map((v) => ({
              productId: row.id,
              specFieldId: v.specFieldId,
              isExtra: v.isExtra,
              extraKey: v.extraKey ?? null,
              numValue: v.numValue != null ? String(v.numValue) : null,
              textValue: v.textValue ?? null,
              enumValue: v.enumValue ?? null,
              boolValue: v.boolValue ?? null,
              unit: v.unit ?? null,
              sortOrder: v.sortOrder,
            })),
          )
          .returning();

        // Step 3b: per-spec-value text translations (only when populated).
        //   Locale order is fixed; we skip nullish text per locale so empty
        //   strings DO persist (only true null/undefined are skipped).
        for (let i = 0; i < input.specValues.length; i++) {
          const v = input.specValues[i]!;
          const newId = inserted[i]!.id;
          if (v.translations) {
            for (const locale of LOCALES) {
              const text = v.translations[locale];
              if (text != null) {
                await tx.insert(productSpecValueTranslations).values({
                  valueId: newId,
                  locale,
                  textValue: text,
                });
              }
            }
          }
        }
      }

      // Step 4: MT flags — replace-on-save. DELETE all rows for this
      //   product, then INSERT only the truthy entries.
      await tx
        .delete(productTranslationFieldFlags)
        .where(eq(productTranslationFieldFlags.productId, row.id));

      const flagRows: Array<{
        productId: string;
        locale: string;
        fieldName: string;
        machineTranslated: boolean;
      }> = [];
      for (const locale of LOCALES) {
        const f = input.mtFlags[locale];
        if (f) {
          for (const [fieldName, val] of Object.entries(f)) {
            if (val) {
              flagRows.push({
                productId: row.id,
                locale,
                fieldName,
                machineTranslated: true,
              });
            }
          }
        }
      }
      if (flagRows.length > 0) {
        await tx.insert(productTranslationFieldFlags).values(flagRows);
      }

      // Step 5: audit (atomic with the rest).
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: input.id ? "update" : "create",
        entityType: "product",
        entityId: row.id,
        before,
        after: row,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return row;
    });

    // 6. Cache invalidation AFTER tx.commit (PITFALL #2 / T-02-13a-07).
    await revalidateProduct(result.id);

    return result;
  },
);

export const duplicateProduct = withAdminAction(
  productDuplicateSchema,
  async ({ sourceId }, ctx) => {
    const result = await dbTx.transaction(async (tx) => {
      const [src] = await tx
        .select()
        .from(products)
        .where(eq(products.id, sourceId))
        .limit(1);
      if (!src) {
        throw new Error("NOT_FOUND");
      }

      // 1. Clone the base row. status forced to 'draft' (D-03 / T-02-13a-03);
      //    publishedAt cleared so the duplicate is unambiguously unpublished.
      //    sku is intentionally NOT cloned — it's a unique column and the
      //    admin must assign a new SKU before publishing the clone.
      const [clone] = await tx
        .insert(products)
        .values({
          categoryId: src.categoryId,
          manufacturerId: src.manufacturerId,
          status: "draft",
          publishedAt: null,
        })
        .returning();

      if (!clone) {
        throw new Error("clone insert returned no row");
      }

      // 2. Translations — clone with `-copy` slug suffix per locale
      //    (T-02-13a-04 collision mitigation). Subsequent renames allowed.
      const srcTrs = await tx
        .select()
        .from(productTranslations)
        .where(eq(productTranslations.productId, sourceId));
      if (srcTrs.length > 0) {
        await tx.insert(productTranslations).values(
          srcTrs.map((t) => ({
            productId: clone.id,
            locale: t.locale,
            name: t.name,
            slug: t.slug + "-copy",
            shortDesc: t.shortDesc,
            longDesc: t.longDesc,
          })),
        );
      }

      // 3. Spec values — clone the long-table rows; remap their old ids to
      //    the new ones so spec_value translations follow.
      const srcVals = await tx
        .select()
        .from(productSpecValues)
        .where(eq(productSpecValues.productId, sourceId));

      if (srcVals.length > 0) {
        const insertedVals = await tx
          .insert(productSpecValues)
          .values(
            srcVals.map((v) => ({
              productId: clone.id,
              specFieldId: v.specFieldId,
              isExtra: v.isExtra,
              extraKey: v.extraKey,
              numValue: v.numValue,
              textValue: v.textValue,
              enumValue: v.enumValue,
              boolValue: v.boolValue,
              unit: v.unit,
              sortOrder: v.sortOrder,
            })),
          )
          .returning();

        // 3b. Spec value translations — fetch each old row's translations,
        //   remap valueId → newId, re-insert. Loop is O(N spec values) but
        //   N is small in practice (≲ ~30 per product).
        for (let i = 0; i < srcVals.length; i++) {
          const oldId = srcVals[i]!.id;
          const newId = insertedVals[i]!.id;
          const tr = await tx
            .select()
            .from(productSpecValueTranslations)
            .where(eq(productSpecValueTranslations.valueId, oldId));
          if (tr.length > 0) {
            await tx.insert(productSpecValueTranslations).values(
              tr.map((t) => ({
                valueId: newId,
                locale: t.locale,
                textValue: t.textValue,
              })),
            );
          }
        }
      }

      // 4. MT flags — clone 1-for-1 onto the new product id.
      const srcFlags = await tx
        .select()
        .from(productTranslationFieldFlags)
        .where(eq(productTranslationFieldFlags.productId, sourceId));
      if (srcFlags.length > 0) {
        await tx.insert(productTranslationFieldFlags).values(
          srcFlags.map((f) => ({
            productId: clone.id,
            locale: f.locale,
            fieldName: f.fieldName,
            machineTranslated: f.machineTranslated,
          })),
        );
      }

      // 5. Audit row — action='duplicate_product' (closed AUDIT_ACTIONS
      //    enum from src/lib/audit.ts). before={sourceId} so the viewer
      //    can link from the clone back to its origin.
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "duplicate_product",
        entityType: "product",
        entityId: clone.id,
        before: { sourceId },
        after: { id: clone.id, status: "draft" },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return clone;
    });

    await revalidateProduct(result.id);

    return result;
  },
);

// ─── Plan 02-13b: lifecycle actions ────────────────────────────────────────
//
// Three actions that mutate ONLY the product lifecycle state — distinct from
// saveProduct's content edits. Each writes its own audit-action enum value
// ('publish' / 'unpublish' / 'delete') so the audit log separates "admin
// edited the product" from "admin transitioned its lifecycle" (D-09 / W7 /
// T-02-13b-02 / T-02-13b-03 repudiation register).
//
// Universal shape:
//   1. Pre-tx: schema-validated by withAdminAction; no extra prep.
//   2. dbTx.transaction: capture before snapshot → mutation → atomic audit row.
//   3. AFTER tx commit: revalidateProduct(id) — Pitfall #2 prohibits firing
//      revalidate inside a tx (T-02-13b-04).
//
// publishProduct sets status='published' AND publishedAt=now() in the SAME
// SET clause so the row never observes a partial state where status flipped
// without publishedAt being set (the public detail page derives "is live"
// from status, but sitemap + sort-by-recently-published keys publishedAt).
// unpublishProduct does the inverse atomically: status='draft' AND
// publishedAt=null in the same SET. (Open Q §1 Option B locked.)
//
// deleteProduct is a HARD delete. The Phase-1 FKs cascade to
// product_translations / product_spec_values / product_translation_field_flags,
// so a single DELETE on `product` drops every related row. The audit row
// (written BEFORE the DELETE inside the tx) preserves the full row snapshot
// in before_json so the action remains forensically reconstructable.

export const publishProduct = withAdminAction(
  productPublishSchema,
  async ({ id }, ctx) => {
    const result = await dbTx.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      if (!before) {
        throw new Error("NOT_FOUND");
      }
      const now = new Date();
      const [row] = await tx
        .update(products)
        .set({
          status: "published",
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(products.id, id))
        .returning();
      if (!row) {
        // Defensive — UPDATE..RETURNING with the same predicate that found
        // `before` should always return one row. If it doesn't, something
        // raced (concurrent DELETE) and we abort the tx.
        throw new Error("NOT_FOUND");
      }
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "publish",
        entityType: "product",
        entityId: id,
        before: { status: before.status, publishedAt: before.publishedAt },
        after: { status: row.status, publishedAt: row.publishedAt },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return row;
    });

    await revalidateProduct(id);

    return result;
  },
);

export const unpublishProduct = withAdminAction(
  productPublishSchema,
  async ({ id }, ctx) => {
    const result = await dbTx.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      if (!before) {
        throw new Error("NOT_FOUND");
      }
      const now = new Date();
      const [row] = await tx
        .update(products)
        .set({
          status: "draft",
          publishedAt: null,
          updatedAt: now,
        })
        .where(eq(products.id, id))
        .returning();
      if (!row) {
        throw new Error("NOT_FOUND");
      }
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "unpublish",
        entityType: "product",
        entityId: id,
        before: { status: before.status, publishedAt: before.publishedAt },
        after: { status: row.status, publishedAt: row.publishedAt },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return row;
    });

    await revalidateProduct(id);

    return result;
  },
);

export const deleteProduct = withAdminAction(
  productDeleteSchema,
  async ({ id }, ctx) => {
    await dbTx.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      if (!before) {
        throw new Error("NOT_FOUND");
      }
      // Audit row first — written BEFORE the DELETE so the audit insert can
      // still observe `before` even after FK cascades have fired in the
      // same tx. (Postgres lets us DELETE the parent then INSERT into
      // audit_log because audit_log has no FK to product.)
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "delete",
        entityType: "product",
        entityId: id,
        before,
        after: null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      // Hard delete — Phase-1 FKs cascade translations / spec values / MT
      // flags. T-02-13b-03: forensic snapshot survives in before_json.
      await tx.delete(products).where(eq(products.id, id));
    });

    await revalidateProduct(id);

    return { id };
  },
);
