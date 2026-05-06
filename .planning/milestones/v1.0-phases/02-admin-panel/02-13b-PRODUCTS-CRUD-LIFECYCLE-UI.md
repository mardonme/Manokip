---
phase: 02-admin-panel
plan: 13b
type: execute
wave: 4
depends_on: [13a, 12, 09, 10, 11]
files_modified:
  - src/actions/products.ts
  - src/components/admin/spec-values-editor.tsx
  - src/components/admin/machine-translated-toggle.tsx
  - src/app/[locale]/admin/products/page.tsx
  - src/app/[locale]/admin/products/products-table.tsx
  - src/app/[locale]/admin/products/[id]/edit/page.tsx
  - src/app/[locale]/admin/products/new/page.tsx
  - src/app/[locale]/admin/products/product-form.tsx
  - tests/actions/products.test.ts
autonomous: true
requirements: [ADMIN-06, ADMIN-08, ADMIN-09, ADMIN-11, OPS-01]
must_haves:
  truths:
    - "publishProduct + unpublishProduct + deleteProduct Server Actions ship; each writes a distinct audit row (action='publish' | 'unpublish' | 'delete')"
    - "publishProduct sets status='published' AND publishedAt=now() in the same transaction"
    - "unpublishProduct sets status='draft' AND publishedAt=NULL in the same transaction"
    - "deleteProduct hard-deletes (cascading via Phase-1 FKs); audit row written in the same tx with before=row, after=null"
    - "Single-page editor: 3-locale tabs swap translatable fields per D-01; non-translatable shared below tabs"
    - "Status changes route through publishProduct/unpublishProduct buttons — NEVER through saveProduct (which refuses to elevate per 13a)"
    - "Per-locale completeness % bar next to locale tabs (D-04 + D-10) computed via useWatch"
    - "Per-field MT flag (D-05) is per (productId, locale, fieldName); UI shows amber left-border + 'MT' badge"
    - "Products list page renders DataTable + nuqs URL state + completeness column (TranslationDots) + Duplicate/Publish/Unpublish/Delete row actions"
    - "Integration tests assert publishProduct → audit='publish' row; unpublishProduct → audit='unpublish' row; deleteProduct → audit='delete' row; all distinct from saveProduct's 'update'"
  artifacts:
    - path: "src/actions/products.ts"
      provides: "publishProduct + unpublishProduct + deleteProduct (added alongside saveProduct + duplicateProduct from 13a)"
      contains: "action: \"publish\""
    - path: "src/app/[locale]/admin/products/product-form.tsx"
      provides: "ProductForm client component composing LocaleTabs + SlugInput + SpecValuesEditor + MachineTranslatedToggle + MediaUploader + TranslationCompleteness + Publish/Unpublish buttons"
      contains: "publishProduct"
    - path: "src/app/[locale]/admin/products/products-table.tsx"
      provides: "DataTable rendering with row actions calling publish/unpublish/duplicate/delete"
      contains: "TranslationDots"
  key_links:
    - from: "src/app/[locale]/admin/products/product-form.tsx"
      to: "src/actions/products.ts (publishProduct, unpublishProduct)"
      via: "button onClick → action call"
      pattern: "publishProduct\\("
    - from: "src/actions/products.ts (publishProduct)"
      to: "products.status + products.publishedAt"
      via: "tx.update(products).set({ status: 'published', publishedAt: now })"
      pattern: "status: \"published\""
---

<objective>
Land the product lifecycle Server Actions (publishProduct, unpublishProduct, deleteProduct) and the full editor UI on top of plan 02-13a's data tier. Lifecycle actions write the canonical `status` column (created in plan 02-01) directly. UI routes status changes through dedicated lifecycle buttons — saveProduct refuses to elevate (W7). Closes ADMIN-06 + ADMIN-08 + ADMIN-09 + ADMIN-11 (UI surface).

Purpose: This is the OPS-02 KPI plan — the 10-minute-per-product target rests on this editor's UX. Lifecycle actions are kept distinct from content edits so audit trails are precise (`publish` vs `update`).
Output: 3 lifecycle Server Actions + 2 client editor components + 5 admin pages + 3 integration tests asserting distinct audit rows for publish / unpublish / delete.
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
@src/components/admin/locale-tabs.tsx
@src/components/admin/slug-input.tsx
@src/components/admin/translation-completeness.tsx
@src/components/admin/data-table.tsx
@src/components/admin/media-uploader.tsx
@src/lib/translation-completeness.ts
@src/actions/products.ts
@src/lib/zod/product.ts

<assumptions>
- **RESOLVED Open Q §1 (product.status):** Option B locked — `product.status` column is the canonical lifecycle state. publishProduct / unpublishProduct mutate `status` AND `publishedAt` (the timestamp) atomically.
- **D-04 completeness deferral note REMOVED (W10):** the pgView in plan 02-01 includes required text spec values in the percent calculation. The editor's per-locale % bar reads from the view, not from a partial four-field count. UI can also use a quick `useWatch`-based estimate for live feedback during editing; the persisted view is the source of truth on read.
- **W7 refusal-to-elevate:** plan 02-13a's saveProduct throws USE_PUBLISH_ACTION on status transition. The editor MUST NOT submit a status flip via saveProduct — the Publish/Unpublish buttons call publishProduct/unpublishProduct directly.
</assumptions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 13b.1: publishProduct + unpublishProduct + deleteProduct Server Actions + integration tests for distinct audit actions</name>
  <files>src/actions/products.ts, tests/actions/products.test.ts</files>
  <read_first>
    - src/actions/products.ts (saveProduct + duplicateProduct from 13a — append the lifecycle actions to the same module)
    - src/db/schema/products.ts (product.status + publishedAt columns)
    - src/lib/audit.ts (closed AuditAction enum — incl. 'publish' | 'unpublish' | 'delete')
    - src/lib/revalidation.ts (revalidateProduct helper)
    - tests/_fixtures/seed-products.ts (Task 13a.1)
    - tests/_fixtures/admin-session.ts (plan 02-04)
  </read_first>
  <behavior>
    - publishProduct({ id }): tx { UPDATE status='published', publishedAt=now() (single SET clause), audit action='publish' with before={status, publishedAt}, after={status: 'published', publishedAt: now} }; AFTER tx revalidateProduct.
    - unpublishProduct({ id }): tx { UPDATE status='draft', publishedAt=NULL, audit action='unpublish' }; AFTER tx revalidateProduct.
    - deleteProduct({ id }): tx { capture before snapshot, DELETE product (cascade handles translations/spec values/flags via Phase-1 FKs), audit action='delete' with before=row, after=null }; AFTER tx revalidateProduct.
    - Each action throws NOT_FOUND if id absent.
  </behavior>
  <action>
    Append to `src/actions/products.ts`:
    ```typescript
    import { productPublishSchema, productDeleteSchema } from "@/lib/zod/product";

    export const publishProduct = withAdminAction(productPublishSchema, async ({ id }, ctx) => {
      const result = await dbTx.transaction(async (tx) => {
        const [before] = await tx.select().from(products).where(eq(products.id, id)).limit(1);
        if (!before) throw new Error("NOT_FOUND");
        const now = new Date();
        const [row] = await tx.update(products)
          .set({ status: "published", publishedAt: now, updatedAt: now })
          .where(eq(products.id, id))
          .returning();
        await logAudit(tx, {
          actorEmail: ctx.actorEmail,
          action: "publish",
          entityType: "product",
          entityId: id,
          before: { status: before.status, publishedAt: before.publishedAt },
          after: { status: row.status, publishedAt: row.publishedAt },
          ip: ctx.ip, userAgent: ctx.userAgent,
        });
        return row;
      });
      await revalidateProduct(id);
      return result;
    });

    export const unpublishProduct = withAdminAction(productPublishSchema, async ({ id }, ctx) => {
      const result = await dbTx.transaction(async (tx) => {
        const [before] = await tx.select().from(products).where(eq(products.id, id)).limit(1);
        if (!before) throw new Error("NOT_FOUND");
        const now = new Date();
        const [row] = await tx.update(products)
          .set({ status: "draft", publishedAt: null, updatedAt: now })
          .where(eq(products.id, id))
          .returning();
        await logAudit(tx, {
          actorEmail: ctx.actorEmail,
          action: "unpublish",
          entityType: "product",
          entityId: id,
          before: { status: before.status, publishedAt: before.publishedAt },
          after: { status: row.status, publishedAt: row.publishedAt },
          ip: ctx.ip, userAgent: ctx.userAgent,
        });
        return row;
      });
      await revalidateProduct(id);
      return result;
    });

    export const deleteProduct = withAdminAction(productDeleteSchema, async ({ id }, ctx) => {
      const result = await dbTx.transaction(async (tx) => {
        const [before] = await tx.select().from(products).where(eq(products.id, id)).limit(1);
        if (!before) throw new Error("NOT_FOUND");
        await tx.delete(products).where(eq(products.id, id));
        await logAudit(tx, {
          actorEmail: ctx.actorEmail,
          action: "delete",
          entityType: "product",
          entityId: id,
          before, after: null,
          ip: ctx.ip, userAgent: ctx.userAgent,
        });
        return { id };
      });
      await revalidateProduct(id);
      return result;
    });
    ```

    Append to `tests/actions/products.test.ts` (W7 distinct-audit assertions):
    - **publishProduct test:** seed a product with status='draft' → call publishProduct(id) → assert product.status='published' AND product.publishedAt non-null AND audit_log has exactly one row with action='publish' AND no row with action='update' for this id during this test window.
    - **unpublishProduct test:** seed a published product → call unpublishProduct(id) → assert product.status='draft' AND publishedAt=null AND audit_log row action='unpublish'.
    - **deleteProduct test:** seed a product → call deleteProduct(id) → product row absent, related translations/spec_values cascade-deleted, audit_log row action='delete' with before populated and after=null.
    - **W7 saveProduct vs publishProduct distinction test:** seed a draft product → call saveProduct with input.status='published' (other fields valid) → assert it throws USE_PUBLISH_ACTION AND audit_log has zero new rows; then call publishProduct(id) → assert audit_log has exactly one new row with action='publish' (NOT 'update').
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/products.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const publishProduct = withAdminAction' src/actions/products.ts` returns `1`
    - `grep -c 'export const unpublishProduct = withAdminAction' src/actions/products.ts` returns `1`
    - `grep -c 'export const deleteProduct = withAdminAction' src/actions/products.ts` returns `1`
    - `grep -c 'action: "publish"' src/actions/products.ts` returns `>=1`
    - `grep -c 'action: "unpublish"' src/actions/products.ts` returns `>=1`
    - `grep -c 'action: "delete"' src/actions/products.ts` returns `>=1`
    - `grep -cE 'status:\s*"published".*publishedAt:\s*now' src/actions/products.ts` returns `>=1` (publishProduct sets both)
    - `grep -cE 'status:\s*"draft".*publishedAt:\s*null' src/actions/products.ts` returns `>=1` (unpublishProduct sets both)
    - `pnpm vitest run tests/actions/products.test.ts -t publish` exits 0
    - `pnpm vitest run tests/actions/products.test.ts -t unpublish` exits 0
    - `pnpm vitest run tests/actions/products.test.ts -t delete` exits 0
    - All tests in tests/actions/products.test.ts pass (combined 13a+13b should be 9+ tests)
  </acceptance_criteria>
  <done>3 lifecycle actions ship with distinct audit rows; W7 distinction enforced; tests assert distinct action enums.</done>
</task>

<task type="auto">
  <name>Task 13b.2: Products list page (RSC) + DataTable client with row actions</name>
  <files>src/app/[locale]/admin/products/page.tsx, src/app/[locale]/admin/products/products-table.tsx</files>
  <read_first>
    - src/components/admin/data-table.tsx (from plan 02-06; reusable primitive)
    - src/components/admin/translation-completeness.tsx (TranslationDots from plan 02-12)
    - src/lib/translation-completeness.ts (findCompletenessForProducts batched helper)
    - src/actions/products.ts (publishProduct, unpublishProduct, duplicateProduct, deleteProduct)
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-17 (DataTable + nuqs everywhere)
  </read_first>
  <action>
    Create `src/app/[locale]/admin/products/page.tsx` (RSC):
    ```tsx
    import { setRequestLocale } from "next-intl/server";
    import { requireAdmin } from "@/lib/auth";
    import { db } from "@/db/client";
    import { products } from "@/db/schema";
    import { findCompletenessForProducts } from "@/lib/translation-completeness";
    import { ProductsTable } from "./products-table";
    import { desc } from "drizzle-orm";

    export default async function ProductsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string>> }) {
      const { locale } = await params;
      setRequestLocale(locale);
      await requireAdmin();

      const sp = await searchParams;
      const page = Math.max(0, Number(sp.page ?? 0));
      const pageSize = Math.min(100, Number(sp.pageSize ?? 20));

      const rows = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(pageSize).offset(page * pageSize);
      const completenessByProduct = await findCompletenessForProducts(rows.map((r) => r.id));
      // also fetch primary-locale name for display via product_translations join (locale = current)
      // (left as a TODO with the executor — fetch via a single LEFT JOIN to product_translations WHERE locale=current)

      return <ProductsTable rows={rows} completenessByProduct={completenessByProduct} locale={locale} />;
    }
    ```

    Create `src/app/[locale]/admin/products/products-table.tsx` (client):
    ```tsx
    "use client";
    import { useTransition } from "react";
    import Link from "next/link";
    import { DataTable } from "@/components/admin/data-table";
    import { TranslationDots } from "@/components/admin/translation-completeness";
    import type { CompletenessByLocale } from "@/lib/translation-completeness";
    import { duplicateProduct, publishProduct, unpublishProduct, deleteProduct } from "@/actions/products";
    import { toast } from "sonner";

    type Row = { id: string; status: "draft" | "published"; publishedAt: Date | null; updatedAt: Date; categoryId: string; manufacturerId: string | null };

    export function ProductsTable({ rows, completenessByProduct, locale }: { rows: Row[]; completenessByProduct: Record<string, CompletenessByLocale>; locale: string }) {
      const [pending, startTransition] = useTransition();
      const columns = [
        { id: "name", header: "Name", cell: (r: Row) => <Link href={`/${locale}/admin/products/${r.id}/edit`}>{r.id.slice(0,8)}</Link> },
        { id: "status", header: "Status", cell: (r: Row) => r.status },
        { id: "translations", header: "Translations", cell: (r: Row) => <TranslationDots completeness={completenessByProduct[r.id] ?? { uz: 0, ru: 0, en: 0 }} /> },
        { id: "updated", header: "Updated", cell: (r: Row) => r.updatedAt.toISOString().slice(0, 10) },
        { id: "actions", header: "", cell: (r: Row) => (
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/products/${r.id}/edit`} data-testid={`edit-${r.id}`}>Edit</Link>
            <button data-testid={`duplicate-${r.id}`} disabled={pending} onClick={() => startTransition(async () => { const res = await duplicateProduct({ sourceId: r.id }); res.ok ? toast.success("Duplicated") : toast.error(res.error); })}>Duplicate</button>
            {r.status === "published"
              ? <button data-testid={`unpublish-${r.id}`} disabled={pending} onClick={() => startTransition(async () => { const res = await unpublishProduct({ id: r.id }); res.ok ? toast.success("Unpublished") : toast.error(res.error); })}>Unpublish</button>
              : <button data-testid={`publish-${r.id}`} disabled={pending} onClick={() => startTransition(async () => { const res = await publishProduct({ id: r.id }); res.ok ? toast.success("Published") : toast.error(res.error); })}>Publish</button>}
            <button data-testid={`delete-${r.id}`} disabled={pending} onClick={() => { if (confirm("Delete?")) startTransition(async () => { const res = await deleteProduct({ id: r.id }); res.ok ? toast.success("Deleted") : toast.error(res.error); }); }}>Delete</button>
          </div>
        )},
      ];
      return <DataTable columns={columns} rows={rows} />;
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - 2 files exist
    - `grep -c 'await requireAdmin' src/app/[locale]/admin/products/page.tsx` returns `1`
    - `grep -c 'TranslationDots' src/app/[locale]/admin/products/products-table.tsx` returns `>=1`
    - `grep -c 'duplicateProduct' src/app/[locale]/admin/products/products-table.tsx` returns `>=1`
    - `grep -c 'publishProduct' src/app/[locale]/admin/products/products-table.tsx` returns `>=1`
    - `grep -c 'unpublishProduct' src/app/[locale]/admin/products/products-table.tsx` returns `>=1`
    - `grep -c 'deleteProduct' src/app/[locale]/admin/products/products-table.tsx` returns `>=1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Products list page renders DataTable with translations dots and per-row publish/unpublish/duplicate/delete buttons routing through dedicated lifecycle actions.</done>
</task>

<task type="auto">
  <name>Task 13b.3: Editor pages + ProductForm with locale tabs + spec values + MT toggle + lifecycle buttons</name>
  <files>src/components/admin/spec-values-editor.tsx, src/components/admin/machine-translated-toggle.tsx, src/app/[locale]/admin/products/[id]/edit/page.tsx, src/app/[locale]/admin/products/new/page.tsx, src/app/[locale]/admin/products/product-form.tsx</files>
  <read_first>
    - src/components/admin/locale-tabs.tsx + slug-input.tsx (from plan 02-09)
    - src/components/admin/translation-completeness.tsx (from plan 02-12)
    - src/components/admin/media-uploader.tsx (from plan 02-10)
    - src/lib/repositories/spec-field.ts (from plan 02-11 — fetch active spec fields for the form)
    - src/actions/products.ts (Tasks 13a.2 + 13b.1)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 5 (RHF + tabs single instance)
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-01, §D-02, §D-04, §D-05
  </read_first>
  <action>
    Create `src/components/admin/machine-translated-toggle.tsx`:
    ```tsx
    "use client";
    import { useFormContext, Controller } from "react-hook-form";
    import { Checkbox } from "@/components/ui/checkbox";

    export function MachineTranslatedToggle({ fieldName, locale }: { fieldName: string; locale: "uz" | "ru" | "en" }) {
      const { control } = useFormContext();
      return (
        <Controller
          name={`mtFlags.${locale}.${fieldName}`}
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
              MT
            </label>
          )}
        />
      );
    }
    ```

    Create `src/components/admin/spec-values-editor.tsx` — a controlled list-editor:
    - Driven by `useFieldArray({ name: 'specValues' })`.
    - Props: `availableSpecFields: SpecField[]` (passed from RSC parent — fetched via findActiveSpecFields(categoryId)).
    - For each row: a Select to pick a spec_field (or "free-form extra"); typed value input based on data_type (number, range[low/high], enum select, bool switch, text input); unit display (read from spec_field.unit); sort order; remove button.
    - When `isExtra=true`, an `extraKey` input replaces the spec-field select.
    - Add-row button.

    Create `src/app/[locale]/admin/products/[id]/edit/page.tsx` (RSC):
    - Fetch product + 3 translations + spec values + spec value translations + MT flags + active spec fields for the category.
    - Pass everything as `initial` prop to `<ProductForm>`.

    Create `src/app/[locale]/admin/products/new/page.tsx` (RSC):
    - Render `<ProductForm>` with empty initial values (status='draft').

    Create `src/app/[locale]/admin/products/product-form.tsx` (client):
    ```tsx
    "use client";
    import { useTransition } from "react";
    import { useForm, FormProvider, useWatch } from "react-hook-form";
    import { zodResolver } from "@hookform/resolvers/zod";
    import { LocaleTabs, LOCALES, type Locale } from "@/components/admin/locale-tabs";
    import { SlugInput } from "@/components/admin/slug-input";
    import { MachineTranslatedToggle } from "@/components/admin/machine-translated-toggle";
    import { TranslationCompleteness } from "@/components/admin/translation-completeness";
    import { MediaUploader } from "@/components/admin/media-uploader";
    import { SpecValuesEditor } from "@/components/admin/spec-values-editor";
    import { productInsertSchema, type ProductInput } from "@/lib/zod/product";
    import { saveProduct, publishProduct, unpublishProduct, duplicateProduct } from "@/actions/products";
    import { toast } from "sonner";

    export function ProductForm({ initial, categories, manufacturers, availableSpecFields }: { initial?: ProductInput & { id?: string }; /* ... */ }) {
      const [pending, startTransition] = useTransition();
      const form = useForm<ProductInput>({
        resolver: zodResolver(productInsertSchema),
        defaultValues: initial ?? {
          status: "draft",
          translations: { uz: { name: "", slug: "" }, ru: { name: "", slug: "" }, en: { name: "", slug: "" } },
          specValues: [], imagePublicIds: [], datasheetPublicIds: [],
          mtFlags: { uz: {}, ru: {}, en: {} },
        },
      });

      const currentStatus = useWatch({ control: form.control, name: "status" });

      function PerLocaleCompleteness({ locale }: { locale: Locale }) {
        const t = useWatch({ control: form.control, name: `translations.${locale}` });
        const filled = ["name", "slug", "shortDesc", "longDesc"].filter((k) => Boolean((t as Record<string, unknown> | undefined)?.[k])).length;
        const pct = Math.round((filled / 4) * 100);
        return <TranslationCompleteness percent={pct} label={locale.toUpperCase()} />;
      }

      // saveProduct is for content edits ONLY — never status transitions (refusal-to-elevate per 13a/W7).
      // The form submits with the CURRENT persisted status; lifecycle changes go through publish/unpublish buttons.
      async function onSubmit(values: ProductInput) {
        const persisted = initial?.status ?? "draft";
        const submission = { ...values, status: persisted };  // freeze status to persisted value
        const res = await saveProduct(submission);
        if (res.ok) toast.success("Saved");
        else toast.error(res.error);
      }

      async function onPublish() {
        if (!initial?.id) return;
        startTransition(async () => {
          const res = await publishProduct({ id: initial.id! });
          if (res.ok) toast.success("Published");
          else toast.error(res.error);
        });
      }

      async function onUnpublish() {
        if (!initial?.id) return;
        startTransition(async () => {
          const res = await unpublishProduct({ id: initial.id! });
          if (res.ok) toast.success("Unpublished");
          else toast.error(res.error);
        });
      }

      async function onDuplicate() {
        if (!initial?.id) return;
        startTransition(async () => {
          const res = await duplicateProduct({ sourceId: initial.id! });
          if (res.ok) toast.success("Duplicated");
          else toast.error(res.error);
        });
      }

      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex gap-2">
              {LOCALES.map((l) => <PerLocaleCompleteness key={l} locale={l} />)}
            </div>

            <LocaleTabs errors={{
              uz: form.formState.errors.translations?.uz,
              ru: form.formState.errors.translations?.ru,
              en: form.formState.errors.translations?.en,
            } as never}>
              {(locale) => (
                <div className="space-y-2">
                  <SlugInput nameField={`translations.${locale}.name`} slugField={`translations.${locale}.slug`} />
                  <textarea {...form.register(`translations.${locale}.shortDesc`)} placeholder="Short description" />
                  <MachineTranslatedToggle fieldName="shortDesc" locale={locale} />
                  <textarea {...form.register(`translations.${locale}.longDesc`)} placeholder="Long description" />
                  <MachineTranslatedToggle fieldName="longDesc" locale={locale} />
                </div>
              )}
            </LocaleTabs>

            {/* Shared (non-translatable) fields below tabs */}
            <select {...form.register("categoryId")}>{/* options */}</select>
            <select {...form.register("manufacturerId")}>{/* options + null */}</select>

            <SpecValuesEditor availableSpecFields={availableSpecFields} />

            <MediaUploader name="imagePublicIds" mode="multi" maxFiles={10} folder="products" />
            <MediaUploader name="datasheetPublicIds" mode="multi" maxFiles={5} folder="datasheets" accept="pdf" />

            {/* Status display (read-only) — transitions happen through publish/unpublish buttons, NOT through this field */}
            <div data-testid="status-display">Status: {currentStatus}</div>

            <div className="flex gap-2">
              <button type="submit" data-testid="product-save" disabled={pending}>Save</button>
              {initial?.id && currentStatus === "draft" && (
                <button type="button" data-testid="product-publish" onClick={onPublish} disabled={pending}>Publish</button>
              )}
              {initial?.id && currentStatus === "published" && (
                <button type="button" data-testid="product-unpublish" onClick={onUnpublish} disabled={pending}>Unpublish</button>
              )}
              {initial?.id && (
                <button type="button" data-testid="product-duplicate" onClick={onDuplicate} disabled={pending}>Duplicate</button>
              )}
            </div>
          </form>
        </FormProvider>
      );
    }
    ```

    Apply MT-flag visual cue: any text input where the corresponding `mtFlags.${locale}.${fieldName}` is true gets `className="border-l-4 border-l-amber-500"`. Implement via a small wrapper or className calc.

    **W7 enforcement in UI:** the `Status: {currentStatus}` display is read-only. There is no `<select name="status">` in the form. Lifecycle transitions happen ONLY via the Publish / Unpublish buttons, which call `publishProduct(id)` / `unpublishProduct(id)` directly. The form submission (saveProduct) freezes `status` to the persisted value — even if a malicious client tampers with the field, saveProduct's refusal-to-elevate (13a) catches it.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - 5 files exist
    - `grep -c 'LocaleTabs' src/app/[locale]/admin/products/product-form.tsx` returns `>=1`
    - `grep -c 'SpecValuesEditor' src/app/[locale]/admin/products/product-form.tsx` returns `>=1`
    - `grep -c 'MachineTranslatedToggle' src/app/[locale]/admin/products/product-form.tsx` returns `>=1`
    - `grep -c 'TranslationCompleteness' src/app/[locale]/admin/products/product-form.tsx` returns `>=1`
    - `grep -c 'MediaUploader' src/app/[locale]/admin/products/product-form.tsx` returns `>=2` (images + datasheets)
    - `grep -c 'publishProduct' src/app/[locale]/admin/products/product-form.tsx` returns `>=1`
    - `grep -c 'unpublishProduct' src/app/[locale]/admin/products/product-form.tsx` returns `>=1`
    - `grep -c 'data-testid="product-publish"' src/app/[locale]/admin/products/product-form.tsx` returns `1`
    - `grep -c 'data-testid="product-unpublish"' src/app/[locale]/admin/products/product-form.tsx` returns `1`
    - `grep -c 'data-testid="product-duplicate"' src/app/[locale]/admin/products/product-form.tsx` returns `1`
    - **W7:** form does NOT submit a status field selection — `grep -c 'register("status")' src/app/[locale]/admin/products/product-form.tsx` returns `0`
    - **W7:** submission freezes status — `grep -cE 'status:\s*persisted' src/app/[locale]/admin/products/product-form.tsx` returns `>=1`
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Editor composes locale tabs + spec values + MT toggles + media + completeness; lifecycle transitions ONLY via Publish/Unpublish buttons; saveProduct freezes status (refusal-to-elevate enforced at UI + action layers).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| client form → publishProduct | id only |
| client form → unpublishProduct | id only |
| client form → deleteProduct | id only |
| client form → saveProduct | full state minus status (frozen by client; refusal-to-elevate at server) |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-13b-01 | EoP | privilege escalation via tampered status field on saveProduct | mitigate | Two-layer: UI freezes status to persisted (W7); saveProduct throws USE_PUBLISH_ACTION on transition (13a) |
| T-02-13b-02 | Repudiation | admin denies publish | mitigate | publishProduct logs action='publish' with before.status / after.status (distinct from 'update') |
| T-02-13b-03 | Repudiation | admin denies delete | mitigate | deleteProduct logs action='delete' with before snapshot (full row) and after=null |
| T-02-13b-04 | Tampering | revalidate inside tx | mitigate | revalidateProduct called AFTER `await dbTx.transaction(...)` returns |
| T-02-13b-05 | DoS | replay deletes spawning many transactions | accept | admin path; behind requireAdmin; rate-limit deferred to Phase 5 |
| T-02-13b-06 | Information Disclosure | confirm() prompt for delete | accept | UX-only friction; the actual gate is requireAdmin + audit logging |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/actions/products.test.ts` exits 0 (combined with 13a: 9+ tests pass)
- `pnpm vitest run tests/actions/products.test.ts -t publish` exits 0
- `pnpm vitest run tests/actions/products.test.ts -t unpublish` exits 0
- `pnpm vitest run tests/actions/products.test.ts -t delete` exits 0
- `pnpm build` exits 0
</verification>

<success_criteria>
1. publishProduct + unpublishProduct + deleteProduct ship; each writes a distinct audit action.
2. publishProduct sets status + publishedAt atomically; unpublishProduct clears both.
3. UI routes lifecycle through dedicated buttons — saveProduct freezes status (W7).
4. Editor composes locale tabs + spec values + MT toggles + completeness + media + lifecycle buttons.
5. Products list shows TranslationDots + Duplicate/Publish/Unpublish/Delete row actions.
6. Integration tests assert distinct audit rows for publish / unpublish / delete (not 'update').
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-13b-SUMMARY.md` with: 3 lifecycle action shapes, the editor's component tree, audit action enum coverage (publish / unpublish / delete distinct from create / update), W7 enforcement (UI + action layers).
</output>
