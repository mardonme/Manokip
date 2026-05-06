---
phase: 02-admin-panel
plan: 13a
type: execute
wave: 3
depends_on: [01, 04, 05, 06, 09, 10, 11, 12]
files_modified:
  - src/actions/products.ts
  - src/lib/zod/product.ts
  - tests/_fixtures/seed-products.ts
  - tests/actions/products.test.ts
autonomous: true
requirements: [ADMIN-06, ADMIN-08, ADMIN-09, ADMIN-10, ADMIN-11, OPS-01]
must_haves:
  truths:
    - "productInsertSchema validates: id?, categoryId, manufacturerId?, status enum, translations: { uz, ru, en } each with name + slug + shortDesc? + longDesc?, specValues, imagePublicIds, datasheetPublicIds, mtFlags"
    - "saveProduct Server Action persists in one tx: 1 product row + 3 product_translations + N product_spec_values + per-row product_spec_value_translations + N product_translation_field_flags + audit_log row"
    - "saveProduct refuses to elevate state: rejects when input.status='published' but persisted status='draft' (lifecycle transitions go through publishProduct/unpublishProduct, not saveProduct)"
    - "duplicateProduct Server Action: full clone with status forced to 'draft', slug suffixed -copy per locale, fresh created_at, fresh audit_log row with action='duplicate_product'"
    - "Per-field MT flag (D-05) is per (productId, locale, fieldName) row in product_translation_field_flags; replace-on-save semantics"
    - "audit_log written for create / update / duplicate_product"
    - "revalidateProduct(id) called AFTER tx.commit"
    - "tests/_fixtures/seed-products.ts exports seedProduct() helper used by 13a + 13b tests"
    - "Integration tests cover: create new, update existing, transaction rollback on failure, duplicate full clone, mtFlags persistence, refusal-to-elevate"
  artifacts:
    - path: "src/actions/products.ts"
      provides: "saveProduct + duplicateProduct"
      contains: "duplicate_product"
    - path: "src/lib/zod/product.ts"
      provides: "productInsertSchema with translations + specValues + mtFlags + status enum"
      contains: "translations: z.object"
    - path: "tests/_fixtures/seed-products.ts"
      provides: "Wave-0 seed helper"
      contains: "export async function seedProduct"
  key_links:
    - from: "src/actions/products.ts"
      to: "product_translation_field_flags table"
      via: "tx.insert(productTranslationFieldFlags) inside tx"
      pattern: "productTranslationFieldFlags"
    - from: "src/actions/products.ts (saveProduct)"
      to: "product.status column (created in plan 02-01)"
      via: "tx.update(products).set({ status })"
      pattern: "status:"
---

<objective>
Land the validation tier + content-edit Server Actions for the product editor: Zod schemas, the 5-step `saveProduct` transaction (product + 3 translations + spec values + extras + audit), and the `duplicateProduct` full-clone action. Plan 02-13b builds the lifecycle actions (publish/unpublish/delete) and UI on top of these. Together they deliver ADMIN-06 + ADMIN-08 + ADMIN-09 + ADMIN-10 (data tier) + ADMIN-11 (audit on every mutation).

Purpose: This is the data-tier half of the marquee product editor. saveProduct is the single transaction that upserts everything translatable + audit; duplicateProduct is the full-clone path. Lifecycle (publish/unpublish/delete) and UI live in plan 02-13b.
Output: 1 Zod schema + 2 Server Actions (saveProduct, duplicateProduct) + 1 test fixture + integration tests covering create / update / rollback / duplicate / mtFlags / refusal-to-elevate.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@CLAUDE.md
@src/db/schema/products.ts
@src/db/schema/spec-values.ts
@src/db/schema/spec-fields.ts
@src/db/schema/translation-flags.ts
@src/db/client-ws.ts
@src/lib/audit.ts
@src/lib/revalidation.ts
@src/lib/server-action.ts
@src/lib/slug.ts
@src/actions/categories.ts
@src/actions/spec-fields.ts

<assumptions>
- **RESOLVED Open Q §1 (product.status):** Option B locked — `product.status` column exists from plan 02-01 (CHECK constraint enforces enum). saveProduct writes `status` directly; lifecycle transitions (`'draft' ↔ 'published'`) are NOT done via saveProduct (see W7 — saveProduct is for content edits only).
- **RESOLVED Open Q §2 (MT-flag schema):** Sibling `product_translation_field_flags` table (from plan 02-01).
- **CONTEXT D-04 completeness fields:** name, slug, short_desc, long_desc per locale + required text spec values (the pgView in plan 02-01 includes both). saveProduct does not compute completeness; it just writes the data. The view recomputes on read.
</assumptions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 13a.1: Zod schema + seed-products fixture</name>
  <files>src/lib/zod/product.ts, tests/_fixtures/seed-products.ts</files>
  <read_first>
    - src/db/schema/products.ts (column shapes incl. publishedAt timestamptz + status text NOT NULL)
    - src/db/schema/spec-values.ts (productSpecValues + productSpecValueTranslations columns)
    - src/db/schema/spec-fields.ts (data_type enum to drive Zod discriminated union)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 5 (Zod schema shape verbatim)
    - tests/_fixtures/admin-session.ts (from plan 02-04 — seed pattern)
  </read_first>
  <behavior>
    - productInsertSchema validates: id?, categoryId, manufacturerId?, status: z.enum(['draft','published']), translations: { uz, ru, en } each with name + slug + shortDesc? + longDesc?, specValues: array of typed values, imagePublicIds, datasheetPublicIds, mtFlags: per-locale Record<fieldName, boolean>.
    - productDuplicateSchema, productPublishSchema, productDeleteSchema each validate `{ id: uuid }` shape (the latter two are consumed by 13b).
    - seedProduct() inserts a category + product (status='draft' default) + 3 translations + cleanup; returns `{ productId, categoryId, cleanup }`.
  </behavior>
  <action>
    Create `src/lib/zod/product.ts`:
    ```typescript
    import { z } from "zod";

    const localeFields = z.object({
      name: z.string().min(1).max(300),
      slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/),
      shortDesc: z.string().optional().nullable(),
      longDesc: z.string().optional().nullable(),
    });

    const specValueInput = z.object({
      specFieldId: z.string().uuid().nullable(),  // null when isExtra=true (free-form extras)
      isExtra: z.boolean().default(false),
      extraKey: z.string().optional().nullable(),
      numValue: z.number().optional().nullable(),
      textValue: z.string().optional().nullable(),
      enumValue: z.string().optional().nullable(),
      boolValue: z.boolean().optional().nullable(),
      unit: z.string().optional().nullable(),
      sortOrder: z.number().int().nonnegative().default(0),
      // For text values, optional per-locale translations
      translations: z.object({
        uz: z.string().optional().nullable(),
        ru: z.string().optional().nullable(),
        en: z.string().optional().nullable(),
      }).optional(),
    });

    const localeFlags = z.record(z.string(), z.boolean()).optional();

    export const productInsertSchema = z.object({
      id: z.string().uuid().optional(),
      categoryId: z.string().uuid(),
      manufacturerId: z.string().uuid().nullable().optional(),
      status: z.enum(["draft", "published"]),
      translations: z.object({
        uz: localeFields, ru: localeFields, en: localeFields,
      }),
      specValues: z.array(specValueInput).default([]),
      imagePublicIds: z.array(z.string()).default([]),
      datasheetPublicIds: z.array(z.string()).default([]),
      mtFlags: z.object({
        uz: localeFlags, ru: localeFlags, en: localeFlags,
      }).default({}),
    });

    export type ProductInput = z.infer<typeof productInsertSchema>;

    export const productDuplicateSchema = z.object({ sourceId: z.string().uuid() });
    export const productPublishSchema = z.object({ id: z.string().uuid() });
    export const productDeleteSchema = z.object({ id: z.string().uuid() });
    ```

    Create `tests/_fixtures/seed-products.ts`:
    ```typescript
    import { sql } from "drizzle-orm";
    import { getTestDb } from "./db";

    export async function seedProduct(opts: { name?: string; locales?: { uz?: boolean; ru?: boolean; en?: boolean } } = {}) {
      const db = await getTestDb();
      const catId = crypto.randomUUID();
      const productId = crypto.randomUUID();
      await db.execute(sql`INSERT INTO category (id, parent_id, sort_order) VALUES (${catId}, NULL, 0)`);
      await db.execute(sql`INSERT INTO category_translations (category_id, locale, name, slug) VALUES (${catId}, 'uz', 'cat', ${`cat-${catId.slice(0,8)}`})`);
      // status defaults to 'draft' via the column default (plan 02-01)
      await db.execute(sql`INSERT INTO product (id, category_id) VALUES (${productId}, ${catId})`);
      const enabled = opts.locales ?? { uz: true };
      const name = opts.name ?? `seed-${productId.slice(0, 8)}`;
      for (const loc of ["uz", "ru", "en"] as const) {
        if (enabled[loc]) {
          await db.execute(sql`INSERT INTO product_translations (product_id, locale, name, slug) VALUES (${productId}, ${loc}, ${name}, ${`${name}-${loc}`})`);
        }
      }
      return {
        productId, categoryId: catId,
        cleanup: async () => {
          await db.execute(sql`DELETE FROM product_translation_field_flags WHERE product_id = ${productId}`);
          await db.execute(sql`DELETE FROM product_spec_value_translations WHERE value_id IN (SELECT id FROM product_spec_values WHERE product_id = ${productId})`);
          await db.execute(sql`DELETE FROM product_spec_values WHERE product_id = ${productId}`);
          await db.execute(sql`DELETE FROM product_translations WHERE product_id = ${productId}`);
          await db.execute(sql`DELETE FROM product WHERE id = ${productId}`);
          await db.execute(sql`DELETE FROM category_translations WHERE category_id = ${catId}`);
          await db.execute(sql`DELETE FROM category WHERE id = ${catId}`);
          await db.execute(sql`DELETE FROM audit_log WHERE entity_id IN (${productId}, ${catId})`);
        },
      };
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const productInsertSchema' src/lib/zod/product.ts` returns `1`
    - `grep -c 'mtFlags' src/lib/zod/product.ts` returns `>=1`
    - `grep -c 'status: z.enum' src/lib/zod/product.ts` returns `>=1`
    - `grep -c 'export const productDuplicateSchema' src/lib/zod/product.ts` returns `1`
    - `grep -c 'export const productPublishSchema' src/lib/zod/product.ts` returns `1`
    - `grep -c 'export const productDeleteSchema' src/lib/zod/product.ts` returns `1`
    - `grep -c 'export async function seedProduct' tests/_fixtures/seed-products.ts` returns `1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Schema + seed fixture ready for the heaviest action implementation in 13a.2 and the lifecycle/UI plan in 13b.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 13a.2: saveProduct Server Action + integration tests (create / update / rollback / refusal-to-elevate)</name>
  <files>src/actions/products.ts, tests/actions/products.test.ts</files>
  <read_first>
    - src/db/schema/products.ts + src/db/schema/spec-values.ts + src/db/schema/translation-flags.ts (after plan 02-01 — confirm column names incl. status)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 1 (Server Action transaction shape) — the verbatim 5-step skeleton
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/actions/categories.ts / ... / products.ts` table — products extras: replace-on-save spec values + per-row translations
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-05 (MT flags), §D-11 (single publish state via status column)
    - tests/_fixtures/seed-products.ts (Task 13a.1)
    - tests/_fixtures/admin-session.ts (plan 02-04)
  </read_first>
  <behavior>
    - saveProduct: snapshot before → tx { upsert product (incl. status), upsert 3 translations, DELETE+INSERT spec values, DELETE+INSERT spec_value_translations for the new ids, DELETE+INSERT product_translation_field_flags, write audit }; AFTER tx call revalidateProduct(id).
    - **Refusal-to-elevate (W7):** if `before.status === 'draft'` and `input.status === 'published'`, the action throws `Error("USE_PUBLISH_ACTION")`. Same for `'published' → 'draft'` (must use unpublishProduct). saveProduct may write the same status the row already has (no transition), but cannot transition.
    - audit row uses `action: 'create'` for new products, `action: 'update'` for existing — never `'publish'` or `'unpublish'` (those come from the dedicated actions in plan 02-13b).
  </behavior>
  <action>
    Create `src/actions/products.ts` per RESEARCH §Pattern 1, with the saveProduct + duplicateProduct actions. Lifecycle actions (publishProduct, unpublishProduct, deleteProduct) are added in plan 02-13b.

    **saveProduct skeleton:**
    ```typescript
    "use server";
    import { eq, and, sql } from "drizzle-orm";
    import { dbTx } from "@/db/client-ws";
    import {
      products, productTranslations,
      productSpecValues, productSpecValueTranslations,
      productTranslationFieldFlags,
    } from "@/db/schema";
    import { withAdminAction } from "@/lib/server-action";
    import { logAudit } from "@/lib/audit";
    import { revalidateProduct } from "@/lib/revalidation";
    import { productInsertSchema, productDuplicateSchema } from "@/lib/zod/product";

    export const saveProduct = withAdminAction(productInsertSchema, async (input, ctx) => {
      const before = input.id
        ? (await dbTx.select().from(products).where(eq(products.id, input.id)).limit(1))[0] ?? null
        : null;

      // W7: refuse to elevate via saveProduct — lifecycle transitions go through publishProduct/unpublishProduct
      if (before && before.status !== input.status) {
        throw new Error("USE_PUBLISH_ACTION");
      }

      const result = await dbTx.transaction(async (tx) => {
        // 1. base product (status written verbatim from input — no derivation from publishedAt)
        const [row] = input.id
          ? await tx.update(products).set({
              categoryId: input.categoryId,
              manufacturerId: input.manufacturerId ?? null,
              status: input.status,
              imagePublicIds: input.imagePublicIds,
              datasheetPublicIds: input.datasheetPublicIds,
              updatedAt: new Date(),
            }).where(eq(products.id, input.id)).returning()
          : await tx.insert(products).values({
              categoryId: input.categoryId,
              manufacturerId: input.manufacturerId ?? null,
              status: input.status,        // 'draft' for new; CHECK constraint enforces valid value
              imagePublicIds: input.imagePublicIds,
              datasheetPublicIds: input.datasheetPublicIds,
            }).returning();

        // 2. three translations (upsert)
        for (const locale of ["uz", "ru", "en"] as const) {
          const t = input.translations[locale];
          await tx.insert(productTranslations).values({
            productId: row.id, locale,
            name: t.name, slug: t.slug,
            shortDesc: t.shortDesc ?? null,
            longDesc: t.longDesc ?? null,
          }).onConflictDoUpdate({
            target: [productTranslations.productId, productTranslations.locale],
            set: { name: t.name, slug: t.slug, shortDesc: t.shortDesc ?? null, longDesc: t.longDesc ?? null },
          });
        }

        // 3. spec values: replace-on-save
        await tx.delete(productSpecValues).where(eq(productSpecValues.productId, row.id));
        if (input.specValues.length > 0) {
          const inserted = await tx.insert(productSpecValues).values(
            input.specValues.map((v) => ({
              productId: row.id,
              specFieldId: v.specFieldId,
              isExtra: v.isExtra,
              extraKey: v.extraKey ?? null,
              numValue: v.numValue ?? null,
              textValue: v.textValue ?? null,
              enumValue: v.enumValue ?? null,
              boolValue: v.boolValue ?? null,
              unit: v.unit ?? null,
              sortOrder: v.sortOrder,
            })),
          ).returning();
          // 3b. per-spec-value translations (only if v.translations populated)
          for (let i = 0; i < input.specValues.length; i++) {
            const v = input.specValues[i];
            const newId = inserted[i].id;
            if (v.translations) {
              for (const locale of ["uz", "ru", "en"] as const) {
                const text = v.translations[locale];
                if (text != null) {
                  await tx.insert(productSpecValueTranslations).values({
                    valueId: newId, locale, textValue: text,
                  });
                }
              }
            }
          }
        }

        // 4. MT flags: replace-on-save
        await tx.delete(productTranslationFieldFlags).where(eq(productTranslationFieldFlags.productId, row.id));
        const flagRows: Array<{ productId: string; locale: string; fieldName: string; machineTranslated: boolean }> = [];
        for (const locale of ["uz", "ru", "en"] as const) {
          const f = input.mtFlags[locale];
          if (f) for (const [fieldName, val] of Object.entries(f)) {
            if (val) flagRows.push({ productId: row.id, locale, fieldName, machineTranslated: true });
          }
        }
        if (flagRows.length > 0) {
          await tx.insert(productTranslationFieldFlags).values(flagRows);
        }

        // 5. audit (inside tx)
        await logAudit(tx, {
          actorEmail: ctx.actorEmail,
          action: input.id ? "update" : "create",
          entityType: "product",
          entityId: row.id,
          before, after: row,
          ip: ctx.ip, userAgent: ctx.userAgent,
        });

        return row;
      });

      // 6. cache invalidation AFTER tx
      await revalidateProduct(result.id);

      return result;
    });
    ```

    Create `tests/actions/products.test.ts` (lifecycle tests are added in plan 02-13b). At least 5 tests in this plan:
    1. saveProduct create → product row (status='draft' default) + 3 translations + audit action='create'.
    2. saveProduct update → audit action='update'; before_json contains old name. status unchanged → succeeds.
    3. saveProduct with N spec values → N rows in product_spec_values; replace-on-save: 2nd save with M values → DB has exactly M rows.
    4. saveProduct with mtFlags={ uz: { name: true } } → 1 row in product_translation_field_flags with machineTranslated=true; 2nd save with no flags → 0 rows (replace-on-save semantics).
    5. **Refusal-to-elevate (W7):** saveProduct called on a product with persisted `status='draft'` and `input.status='published'` → throws `USE_PUBLISH_ACTION`; audit_log gets NO row; product row unchanged.
    6. saveProduct transaction rollback: simulate a constraint violation mid-tx (e.g., duplicate slug on one locale) → no rows persisted; audit_log no row.
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/products.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const saveProduct = withAdminAction' src/actions/products.ts` returns `1`
    - `grep -c 'USE_PUBLISH_ACTION' src/actions/products.ts` returns `>=1`
    - `grep -c 'productTranslationFieldFlags' src/actions/products.ts` returns `>=2`
    - `grep -c 'status: input.status' src/actions/products.ts` returns `>=2` (insert + update branches)
    - `pnpm vitest run tests/actions/products.test.ts -t "refus"` exits 0 (refusal-to-elevate test passes)
    - `pnpm vitest run tests/actions/products.test.ts -t "rollback"` exits 0
    - `pnpm vitest run tests/actions/products.test.ts` exits 0; 5+ tests pass
  </acceptance_criteria>
  <done>saveProduct ships with refusal-to-elevate; replace-on-save semantics covered; rollback covered; 5+ tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 13a.3: duplicateProduct Server Action + integration test</name>
  <files>src/actions/products.ts, tests/actions/products.test.ts</files>
  <read_first>
    - src/actions/products.ts (saveProduct shape from Task 13a.2 — duplicate appends to the same module)
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-03 (full clone, status forced to draft, slug -copy suffix)
    - tests/_fixtures/seed-products.ts (Task 13a.1)
  </read_first>
  <behavior>
    - duplicateProduct({ sourceId }): tx { INSERT new product cloning all base columns EXCEPT status (forced to 'draft'), INSERT 3 translations with slug='${slug}-copy', INSERT cloned spec values + their translations, INSERT cloned MT flags, audit action='duplicate_product' }; AFTER tx revalidateProduct(newId).
    - Audit row records `before: { sourceId }`, `after: { id: newId, status: 'draft' }`.
  </behavior>
  <action>
    Append to `src/actions/products.ts`:
    ```typescript
    export const duplicateProduct = withAdminAction(productDuplicateSchema, async ({ sourceId }, ctx) => {
      const result = await dbTx.transaction(async (tx) => {
        const [src] = await tx.select().from(products).where(eq(products.id, sourceId)).limit(1);
        if (!src) throw new Error("NOT_FOUND");

        const [clone] = await tx.insert(products).values({
          categoryId: src.categoryId,
          manufacturerId: src.manufacturerId,
          imagePublicIds: src.imagePublicIds,
          datasheetPublicIds: src.datasheetPublicIds,
          status: "draft",                            // D-03: forced to draft regardless of source
          publishedAt: null,                          // also clear the publish timestamp
        }).returning();

        // translations: clone with -copy slug suffix
        const srcTrs = await tx.select().from(productTranslations).where(eq(productTranslations.productId, sourceId));
        if (srcTrs.length > 0) {
          await tx.insert(productTranslations).values(srcTrs.map((t) => ({
            productId: clone.id,
            locale: t.locale,
            name: t.name,
            slug: `${t.slug}-copy`,
            shortDesc: t.shortDesc, longDesc: t.longDesc,
          })));
        }

        // spec values
        const srcVals = await tx.select().from(productSpecValues).where(eq(productSpecValues.productId, sourceId));
        if (srcVals.length > 0) {
          const insertedVals = await tx.insert(productSpecValues).values(srcVals.map((v) => ({
            productId: clone.id,
            specFieldId: v.specFieldId, isExtra: v.isExtra, extraKey: v.extraKey,
            numValue: v.numValue, textValue: v.textValue,
            enumValue: v.enumValue, boolValue: v.boolValue,
            unit: v.unit, sortOrder: v.sortOrder,
          }))).returning();

          // spec value translations (clone keyed by old value_id → new value_id)
          for (let i = 0; i < srcVals.length; i++) {
            const oldId = srcVals[i].id;
            const newId = insertedVals[i].id;
            const tr = await tx.select().from(productSpecValueTranslations)
              .where(eq(productSpecValueTranslations.valueId, oldId));
            if (tr.length > 0) {
              await tx.insert(productSpecValueTranslations).values(tr.map((t) => ({
                valueId: newId, locale: t.locale, textValue: t.textValue,
              })));
            }
          }
        }

        // MT flags: clone
        const srcFlags = await tx.select().from(productTranslationFieldFlags)
          .where(eq(productTranslationFieldFlags.productId, sourceId));
        if (srcFlags.length > 0) {
          await tx.insert(productTranslationFieldFlags).values(srcFlags.map((f) => ({
            productId: clone.id, locale: f.locale, fieldName: f.fieldName,
            machineTranslated: f.machineTranslated,
          })));
        }

        await logAudit(tx, {
          actorEmail: ctx.actorEmail,
          action: "duplicate_product",
          entityType: "product",
          entityId: clone.id,
          before: { sourceId },
          after: { id: clone.id, status: "draft" },
          ip: ctx.ip, userAgent: ctx.userAgent,
        });

        return clone;
      });

      await revalidateProduct(result.id);
      return result;
    });
    ```

    Append to `tests/actions/products.test.ts`:
    - **t = "duplicate"** test: seed a published product with 2 spec values + MT flags + 3 translations → duplicateProduct(sourceId) → assert new product has `status='draft'`, `publishedAt=null`, slug suffixed `-copy` per locale, all spec values and MT flags cloned, audit_log has action='duplicate_product' with before.sourceId and after.id matching.
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/products.test.ts -t duplicate --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const duplicateProduct = withAdminAction' src/actions/products.ts` returns `1`
    - `grep -c '"duplicate_product"' src/actions/products.ts` returns `1`
    - `grep -c '"-copy"' src/actions/products.ts` returns `1`
    - `grep -c 'status: "draft"' src/actions/products.ts` returns `>=1` (in duplicate path)
    - `pnpm vitest run tests/actions/products.test.ts -t duplicate` exits 0
  </acceptance_criteria>
  <done>duplicateProduct ships; full-clone semantics + status-force + slug-copy + audit row; test green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| client form → saveProduct | full product state including spec values |
| client → duplicateProduct | sourceId only |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-13a-01 | EoP | mass assignment via product form | mitigate | Zod productInsertSchema enumerates fields; specValueInput discriminates by data_type |
| T-02-13a-02 | EoP | privilege escalation via saveProduct status flip | mitigate | W7 refusal-to-elevate — saveProduct throws USE_PUBLISH_ACTION on status transition; lifecycle goes through dedicated actions in 13b |
| T-02-13a-03 | Tampering | duplicate creates published product | mitigate | status forced to 'draft' + publishedAt forced to null in clone (D-03) |
| T-02-13a-04 | Tampering | slug collision on duplicate | mitigate | -copy suffix; admin sees toast on collision (subsequent renames allowed) |
| T-02-13a-05 | Tampering | spec value with wrong type for spec_field | accept | DB-side CHECK constraints (Phase 1) catch type mismatches; Zod is the first gate |
| T-02-13a-06 | Information Disclosure | MT-flag rows leak across products | mitigate | PK (productId, locale, fieldName) + compound FK ON DELETE CASCADE — flags scoped to product |
| T-02-13a-07 | Tampering | revalidate inside tx | mitigate | revalidateProduct called AFTER `await dbTx.transaction(...)` returns |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/actions/products.test.ts` exits 0 (6+ tests pass: create, update, spec-values replace-on-save, mtFlags, refusal-to-elevate, rollback, duplicate)
</verification>

<success_criteria>
1. saveProduct + duplicateProduct ship.
2. Refusal-to-elevate prevents lifecycle transitions via saveProduct (W7).
3. Status written verbatim from input (no derivation from publishedAt).
4. Replace-on-save semantics for spec values + MT flags.
5. Duplicate forces status='draft' + slug-copy + clones everything.
6. seed-products fixture exported for downstream tests (13b + later).
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-13a-SUMMARY.md` with: 2 action API shapes, refusal-to-elevate contract, audit action coverage (`create` / `update` / `duplicate_product`), the deferred lifecycle actions list (publishProduct / unpublishProduct / deleteProduct in 13b).
</output>
