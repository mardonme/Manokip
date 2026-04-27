---
phase: 02-admin-panel
plan: 09
type: execute
wave: 2
depends_on: [04, 05, 06]
files_modified:
  - src/actions/categories.ts
  - src/lib/zod/category.ts
  - src/app/[locale]/admin/categories/page.tsx
  - src/app/[locale]/admin/categories/categories-table.tsx
  - src/app/[locale]/admin/categories/[id]/edit/page.tsx
  - src/app/[locale]/admin/categories/new/page.tsx
  - src/app/[locale]/admin/categories/category-form.tsx
  - src/components/admin/locale-tabs.tsx
  - src/components/admin/slug-input.tsx
  - tests/actions/categories.test.ts
autonomous: true
requirements: [ADMIN-03, ADMIN-11, OPS-01]
must_haves:
  truths:
    - "Admin can create a category with parent (tree) + 3 translation rows (uz, ru, en) in ONE Server Action transaction"
    - "Admin can update + delete categories"
    - "Re-parenting fans out revalidate to old parent + new parent + moved category + categories-tree + sitemap (D-12)"
    - "audit_log row written for every mutation (create / update / delete)"
    - "Slug auto-generated from name on blur via src/lib/slug.ts; admin can manually override"
    - "Tree CRUD UI is one form with parent select + 3-locale tabs + slug per locale"
  artifacts:
    - path: "src/actions/categories.ts"
      provides: "saveCategory + deleteCategory + reparentCategory Server Actions"
      contains: "withAdminAction"
    - path: "src/lib/zod/category.ts"
      provides: "categoryInsertSchema + categoryUpdateSchema"
      contains: "translations: z.object"
    - path: "src/components/admin/locale-tabs.tsx"
      provides: "Reusable 3-tab swap for translatable fields (D-01)"
      contains: "TabsTrigger"
    - path: "src/components/admin/slug-input.tsx"
      provides: "Auto-slug input bound to name field via slugify on blur"
      contains: "slugify"
  key_links:
    - from: "src/actions/categories.ts"
      to: "src/lib/revalidation.ts (revalidateCategory + revalidateCategoryMove)"
      via: "AFTER tx.commit"
      pattern: "revalidateCategory(Move)?\\("
    - from: "src/actions/categories.ts"
      to: "src/lib/audit.ts (logAudit)"
      via: "INSIDE tx"
      pattern: "logAudit\\(tx, \\{"
---

<objective>
Land category CRUD: tree (self-ref parent), 3-locale translations, slug auto-generation, audit + revalidate fan-out (including D-12 re-parent). Also delivers two reusable form primitives — `LocaleTabs` and `SlugInput` — used by every other entity CRUD.

Purpose: ADMIN-03 + a clean reusable foundation for plan 02-10 (manufacturers), 02-11 (spec-fields), 02-13 (products). LocaleTabs is the marquee D-01 UI primitive.
Output: Server Actions + Zod schemas + 3 RSC pages + 1 form client component + 2 reusable primitives + integration tests.
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
@src/db/schema/categories.ts
@src/db/client-ws.ts
@src/db/client.ts
@src/lib/audit.ts
@src/lib/revalidation.ts
@src/lib/server-action.ts
@src/lib/slug.ts
@src/components/admin/data-table.tsx
@src/components/ui/tabs.tsx
@src/components/ui/form.tsx

<interfaces>
From src/db/schema/categories.ts (Phase 1):
```typescript
// categories: { id (uuid PK), parentId (uuid FK, nullable), sortOrder (integer), createdAt, updatedAt }
// categoryTranslations: { categoryId, locale, name, slug, description }
// PK on (categoryId, locale); UNIQUE on (locale, slug)
```

From plan 02-04:
```typescript
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { dbTx } from "@/db/client-ws";
```

From plan 02-05:
```typescript
import { revalidateCategory, revalidateCategoryMove } from "@/lib/revalidation";
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 9.1: Reusable LocaleTabs + SlugInput primitives</name>
  <files>src/components/admin/locale-tabs.tsx, src/components/admin/slug-input.tsx</files>
  <read_first>
    - src/lib/slug.ts (slugify export shape — Phase 1 normalizes oʻ/gʻ via U+02BB; this is the SSOT for slugs)
    - src/components/ui/tabs.tsx (shadcn Tabs primitives)
    - src/components/ui/badge.tsx (for the per-tab error count badge)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 5 (RHF + 3-locale tabs verbatim) — particularly the per-tab error count via `errorCount(locale)` and the % completeness via `useWatch`
  </read_first>
  <behavior>
    - LocaleTabs: renders 3 TabsTriggers (uz, ru, en) with badges showing per-locale error count from RHF formState.errors. Each tab content is the children prop scoped per locale (caller passes a render-prop `(locale: 'uz' | 'ru' | 'en') => ReactNode`).
    - SlugInput: controlled RHF input that calls `slugify(value)` from `@/lib/slug` on the linked name field's `onBlur`. Manual edit overrides the auto-fill.
  </behavior>
  <action>
    Create `src/components/admin/locale-tabs.tsx`:
    ```tsx
    "use client";
    import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
    import { Badge } from "@/components/ui/badge";
    import type { FieldErrors } from "react-hook-form";

    export type Locale = "uz" | "ru" | "en";
    export const LOCALES: Locale[] = ["uz", "ru", "en"];

    export interface LocaleTabsProps {
      errors?: Record<Locale, FieldErrors | undefined> | undefined;
      defaultValue?: Locale;
      children: (locale: Locale) => React.ReactNode;
    }

    export function LocaleTabs({ errors, defaultValue = "uz", children }: LocaleTabsProps) {
      const errorCount = (l: Locale) => Object.keys(errors?.[l] ?? {}).length;
      return (
        <Tabs defaultValue={defaultValue}>
          <TabsList>
            {LOCALES.map((l) => (
              <TabsTrigger key={l} value={l} data-testid={`tab-${l}`}>
                {l.toUpperCase()}
                {errorCount(l) > 0 && (
                  <Badge variant="destructive" className="ml-2">{errorCount(l)}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {LOCALES.map((l) => (
            <TabsContent key={l} value={l} className="space-y-3 pt-4">
              {children(l)}
            </TabsContent>
          ))}
        </Tabs>
      );
    }
    ```

    Create `src/components/admin/slug-input.tsx`:
    ```tsx
    "use client";
    import { useFormContext } from "react-hook-form";
    import { slugify } from "@/lib/slug";
    import { Input } from "@/components/ui/input";

    export interface SlugInputProps {
      nameField: string;   // e.g. "translations.uz.name"
      slugField: string;   // e.g. "translations.uz.slug"
    }

    export function SlugInput({ nameField, slugField }: SlugInputProps) {
      const { register, getValues, setValue, formState } = useFormContext();
      const isDirty = (formState.dirtyFields as Record<string, unknown>)?.[slugField];

      function handleNameBlur() {
        if (isDirty) return; // user manually edited slug — don't override
        const name = getValues(nameField) as string | undefined;
        if (!name) return;
        setValue(slugField, slugify(name), { shouldValidate: true });
      }

      return (
        <>
          <Input {...register(nameField, { onBlur: handleNameBlur })} placeholder="Name" />
          <Input {...register(slugField)} placeholder="slug" data-testid="slug-input" />
        </>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const LOCALES' src/components/admin/locale-tabs.tsx` returns `1`
    - `grep -c 'data-testid={`tab-${l}`}' src/components/admin/locale-tabs.tsx` returns `>=1`
    - `grep -c 'slugify(name)' src/components/admin/slug-input.tsx` returns `1`
    - `grep -c 'data-testid="slug-input"' src/components/admin/slug-input.tsx` returns `1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>LocaleTabs + SlugInput compile and are reusable.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 9.2: Categories Server Actions + Zod schema + integration tests</name>
  <files>src/actions/categories.ts, src/lib/zod/category.ts, tests/actions/categories.test.ts</files>
  <read_first>
    - src/db/schema/categories.ts (column shapes for categories + categoryTranslations)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/actions/categories.ts / manufacturers.ts / ...` — universal Server Action shape; categories has no extras
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 1 (Server Action transaction shape verbatim)
    - tests/db/spec-values.test.ts (live-Neon integration test pattern)
    - tests/_fixtures/admin-session.ts (from plan 02-04 — for createActiveAdminSession)
  </read_first>
  <behavior>
    - saveCategory (insert): writes 1 categories row + 3 categoryTranslations rows + 1 audit_log row in one tx; AFTER commit calls revalidateCategory(id).
    - saveCategory (update with parent change): same as insert + revalidateCategoryMove(oldParent, newParent, id) instead of plain revalidateCategory.
    - deleteCategory: writes audit_log + DELETE in tx; revalidateCategory + revalidateCategoryMove if had parent.
    - All actions enforce withAdminAction (requireAdmin + Zod parse).
  </behavior>
  <action>
    Create `src/lib/zod/category.ts`:
    ```typescript
    import { z } from "zod";

    const localeFields = z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
      description: z.string().optional().nullable(),
    });

    export const categoryInsertSchema = z.object({
      id: z.string().uuid().optional(),
      parentId: z.string().uuid().nullable().optional(),
      sortOrder: z.number().int().nonnegative().default(0),
      translations: z.object({
        uz: localeFields,
        ru: localeFields,
        en: localeFields,
      }),
    });

    export type CategoryInput = z.infer<typeof categoryInsertSchema>;

    export const categoryDeleteSchema = z.object({
      id: z.string().uuid(),
    });
    ```

    Create `src/actions/categories.ts`:
    ```typescript
    "use server";
    import { eq } from "drizzle-orm";
    import { dbTx } from "@/db/client-ws";
    import { categories, categoryTranslations } from "@/db/schema";
    import { withAdminAction } from "@/lib/server-action";
    import { logAudit } from "@/lib/audit";
    import { revalidateCategory, revalidateCategoryMove } from "@/lib/revalidation";
    import { categoryInsertSchema, categoryDeleteSchema } from "@/lib/zod/category";

    export const saveCategory = withAdminAction(categoryInsertSchema, async (input, ctx) => {
      const before = input.id
        ? (await dbTx.select().from(categories).where(eq(categories.id, input.id)).limit(1))[0] ?? null
        : null;

      const result = await dbTx.transaction(async (tx) => {
        const [row] = input.id
          ? await tx.update(categories)
              .set({ parentId: input.parentId ?? null, sortOrder: input.sortOrder, updatedAt: new Date() })
              .where(eq(categories.id, input.id)).returning()
          : await tx.insert(categories)
              .values({ parentId: input.parentId ?? null, sortOrder: input.sortOrder })
              .returning();

        for (const locale of ["uz", "ru", "en"] as const) {
          const t = input.translations[locale];
          await tx.insert(categoryTranslations)
            .values({ categoryId: row.id, locale, name: t.name, slug: t.slug, description: t.description ?? null })
            .onConflictDoUpdate({
              target: [categoryTranslations.categoryId, categoryTranslations.locale],
              set: { name: t.name, slug: t.slug, description: t.description ?? null },
            });
        }

        await logAudit(tx, {
          actorEmail: ctx.actorEmail,
          action: input.id ? "update" : "create",
          entityType: "category",
          entityId: row.id,
          before, after: row,
          ip: ctx.ip, userAgent: ctx.userAgent,
        });

        return row;
      });

      // Cache invalidation AFTER tx.commit (PITFALL #2)
      if (input.id && before && before.parentId !== (input.parentId ?? null)) {
        await revalidateCategoryMove(before.parentId, input.parentId ?? null, result.id);
      } else {
        await revalidateCategory(result.id);
      }
      return result;
    });

    export const deleteCategory = withAdminAction(categoryDeleteSchema, async ({ id }, ctx) => {
      const before = (await dbTx.select().from(categories).where(eq(categories.id, id)).limit(1))[0] ?? null;
      if (!before) throw new Error("NOT_FOUND");

      await dbTx.transaction(async (tx) => {
        await tx.delete(categories).where(eq(categories.id, id));
        await logAudit(tx, {
          actorEmail: ctx.actorEmail, action: "delete", entityType: "category", entityId: id,
          before, after: null, ip: ctx.ip, userAgent: ctx.userAgent,
        });
      });

      if (before.parentId) await revalidateCategoryMove(before.parentId, null, id);
      else await revalidateCategory(id);
      return { deleted: id };
    });
    ```

    Create `tests/actions/categories.test.ts` — 3 tests:
    1. Create category writes 1 categories row + 3 translation rows + 1 audit row (action='create').
    2. Update-with-parent-change writes audit row (action='update') + before_json contains old parentId.
    3. Delete writes audit row (action='delete') + before_json contains the row, after_json IS NULL, and the row is gone.

    Test pattern (mirror tests/db/spec-values.test.ts):
    ```typescript
    import { describe, it, expect, afterEach, vi } from "vitest";
    import { sql } from "drizzle-orm";
    import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";
    import { createActiveAdminSession } from "../_fixtures/admin-session";

    vi.mock("next/cache", () => ({ revalidateTag: vi.fn().mockResolvedValue(undefined) }));
    vi.mock("next/headers", () => ({ headers: () => Promise.resolve(new Map()) }));

    describe("categories actions (live Neon)", () => {
      // ... 3 tests asserting row count + audit_log + revalidate fan-out via vi.mocked(revalidateTag)
    });
    ```
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/categories.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const saveCategory = withAdminAction' src/actions/categories.ts` returns `1`
    - `grep -c 'export const deleteCategory = withAdminAction' src/actions/categories.ts` returns `1`
    - `grep -c 'revalidateCategoryMove' src/actions/categories.ts` returns `>=1`
    - `grep -c 'logAudit(tx,' src/actions/categories.ts` returns `>=2`
    - `grep -c 'await dbTx.transaction' src/actions/categories.ts` returns `>=2`
    - No `revalidateCategory*` call appears INSIDE a `dbTx.transaction(...)` arrow (PITFALL #2). Verify by reading the file linearly.
    - `pnpm vitest run tests/actions/categories.test.ts` exits 0; 3/3 tests pass
  </acceptance_criteria>
  <done>Categories Server Actions implemented; all 3 integration tests pass; PITFALL #2 + #3 mitigated by code structure.</done>
</task>

<task type="auto">
  <name>Task 9.3: Categories list + edit + new pages with CategoryForm</name>
  <files>src/app/[locale]/admin/categories/page.tsx, src/app/[locale]/admin/categories/categories-table.tsx, src/app/[locale]/admin/categories/[id]/edit/page.tsx, src/app/[locale]/admin/categories/new/page.tsx, src/app/[locale]/admin/categories/category-form.tsx</files>
  <read_first>
    - src/components/admin/data-table.tsx (DataTable from plan 02-06)
    - src/components/admin/locale-tabs.tsx (from Task 9.1)
    - src/components/admin/slug-input.tsx (from Task 9.1)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/app/[locale]/admin/products/page.tsx` (closest analog for the list page) — adapt to categories
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 5 (RHF + tabs single instance + Zod resolver)
  </read_first>
  <action>
    Create the 5 files. Guidelines:
    - `page.tsx` (list): RSC, `await requireAdmin()`, fetch categories with translation joined for the current locale, render `<CategoriesTable>`.
    - `categories-table.tsx` (client): wraps `<DataTable>` with columns: name (current locale), slug (uz), parent name, sortOrder, actions (edit / delete).
    - `[id]/edit/page.tsx` (RSC): fetch category + 3 translations, render `<CategoryForm initial={...} />`.
    - `new/page.tsx` (RSC): render `<CategoryForm />` with empty initial values.
    - `category-form.tsx` (client): single `useForm` with categoryInsertSchema resolver; uses `<LocaleTabs>` to render per-locale fields (Name + Slug via SlugInput + Description); parent is a `<Select>` outside the tabs (shared across locales). Submit button calls `saveCategory` via `useActionState` to surface success/error toast.

    Set `slug` `data-testid` to `slug-uz`/`slug-ru`/`slug-en` and use `<input name="parentId">` for the shared parent select so the form can be assertion-testable.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - 5 files exist at the specified paths
    - `grep -c 'await requireAdmin()' src/app/[locale]/admin/categories/page.tsx` returns `1`
    - `grep -c 'LocaleTabs' src/app/[locale]/admin/categories/category-form.tsx` returns `>=1`
    - `grep -c 'SlugInput' src/app/[locale]/admin/categories/category-form.tsx` returns `>=1`
    - `grep -c 'saveCategory' src/app/[locale]/admin/categories/category-form.tsx` returns `>=1`
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>List + edit + new pages render and submit; category form uses LocaleTabs + SlugInput.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| client form → saveCategory Server Action | translatable text + parent uuid |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-09-01 | EoP | mass assignment via category form | mitigate | withAdminAction + Zod categoryInsertSchema (fields explicit) |
| T-02-09-02 | Tampering | parentId set to non-existent or self | mitigate | DB FK enforces parent existence; self-loop allowed at column level (Phase 1 schema accepts it) but trivial to block at form level — defer self-loop check to Phase 3 (rare in practice; admin discipline) |
| T-02-09-03 | Tampering | slug collision per (locale,slug) | mitigate | DB UNIQUE catches; surfaces as a Drizzle error → admin sees toast |
| T-02-09-04 | Repudiation | admin denies category change | mitigate | logAudit row inside tx with before/after JSON |
| T-02-09-05 | Tampering | revalidate inside tx (Pitfall #2) | mitigate | All revalidate* calls live AFTER `await dbTx.transaction(...)` returns |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/actions/categories.test.ts` exits 0
- `pnpm build` exits 0
</verification>

<success_criteria>
1. Categories CRUD ships with 3-locale tabs + slug auto-gen.
2. Re-parent fan-out via revalidateCategoryMove(D-12).
3. audit_log row per mutation.
4. Reusable LocaleTabs + SlugInput primitives exported.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-09-SUMMARY.md` with: final Server Action shapes, the 2 new reusable components, integration test results.
</output>
