---
phase: 02-admin-panel
plan: 12
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/lib/translation-completeness.ts
  - src/components/admin/translation-completeness.tsx
  - tests/db/translation-completeness-view.test.ts
autonomous: true
requirements: [ADMIN-10]
must_haves:
  truths:
    - "product_translation_completeness pgView (created in plan 02-01) returns one row per (product_id, locale) with percent 0-100"
    - "Helper findProductCompleteness(productId) returns Record<'uz'|'ru'|'en', number>"
    - "Helper findCompletenessForProducts(productIds[]) returns batched map for the products list"
    - "Component <TranslationCompleteness percent={N} /> renders a progress bar with green ≥95%, amber ≥50%, red <50% (D-04)"
    - "Component <TranslationDots completeness={...} /> renders 3 colored dots for the products list 'Translations' column"
    - "Integration test seeds a product + partial translations + asserts the view returns 25%, 50%, 100% as expected"
  artifacts:
    - path: "src/lib/translation-completeness.ts"
      provides: "Server-side helpers wrapping the pgView"
      contains: "productTranslationCompleteness"
    - path: "src/components/admin/translation-completeness.tsx"
      provides: "TranslationCompleteness + TranslationDots client components"
      contains: "TranslationDots"
  key_links:
    - from: "src/lib/translation-completeness.ts"
      to: "src/db/schema/views/product-translation-completeness.ts"
      via: "drizzle select against the pgView"
      pattern: "productTranslationCompleteness"
---

<objective>
Wire the `product_translation_completeness` pgView (declared + migrated in plan 02-01) into a server helper + UI components. ADMIN-10 = the user can see per-locale % completeness in the editor and per-locale colored dots in the products list.

Purpose: ADMIN-10 deliverable; consumed by plan 02-13b (product editor % bars next to locale tabs and products list "Translations" column dots).
Output: 1 helper module + 1 UI component module + 1 integration test.

**W10 — view scope (CANONICAL):** the pgView created in plan 02-01 includes BOTH the four base translation fields (`name`, `slug`, `short_desc`, `long_desc`) AND any `product_spec_values` rows whose underlying `spec_field.is_required = true AND spec_field.data_type = 'text' AND spec_field.deleted_at IS NULL` — the percent denominator is `4 + count(required_text_spec_fields)` and the numerator counts filled-base + filled-text-spec-translations per locale. There is NO v1.1 deferral; D-04 is implemented verbatim in plan 02-01's view DDL.
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
@src/db/schema/views/product-translation-completeness.ts
@src/db/schema/products.ts
@src/db/client.ts
@src/components/ui/badge.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 12.1: Server helpers for completeness view + integration test</name>
  <files>src/lib/translation-completeness.ts, tests/db/translation-completeness-view.test.ts</files>
  <read_first>
    - src/db/schema/views/product-translation-completeness.ts (from plan 02-01)
    - src/db/schema/products.ts (productTranslations columns to seed in tests)
    - tests/db/spec-values.test.ts (live-Neon insert pattern)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 6 (the SQL inside the view)
  </read_first>
  <behavior>
    - findProductCompleteness('product-id') → returns `{ uz: number; ru: number; en: number }` with each value 0-100. Missing rows in the view = 0.
    - findCompletenessForProducts(['p1','p2',...]) → returns `Record<productId, { uz, ru, en }>` for batch usage in list pages. Missing locales default to 0.
    - Test 1 (base only): insert a product + only `name` filled in `uz` (slug + short_desc + long_desc null) → expect uz=25 (1/4); insert ru with 2 fields → expect ru=50; insert en with all 4 → expect en=100.
    - Test 2 (W10 spec values): insert a product + a required text spec_field for the category + a product_spec_values row + product_spec_value_translations for `uz` only with non-empty text. With 4 base fields filled + 1 required spec → denominator=5, numerator=5 → uz=100; ru/en denominator=5 numerator=4 (no spec translation) → 80.
  </behavior>
  <action>
    Create `src/lib/translation-completeness.ts`:
    ```typescript
    import { eq, inArray } from "drizzle-orm";
    import { db } from "@/db/client";
    import { productTranslationCompleteness } from "@/db/schema";

    export type LocaleKey = "uz" | "ru" | "en";
    export type CompletenessByLocale = Record<LocaleKey, number>;

    function emptyCompleteness(): CompletenessByLocale {
      return { uz: 0, ru: 0, en: 0 };
    }

    export async function findProductCompleteness(productId: string): Promise<CompletenessByLocale> {
      const rows = await db.select().from(productTranslationCompleteness)
        .where(eq(productTranslationCompleteness.productId, productId));
      const out = emptyCompleteness();
      for (const r of rows) {
        if (r.locale === "uz" || r.locale === "ru" || r.locale === "en") {
          out[r.locale] = r.percent;
        }
      }
      return out;
    }

    export async function findCompletenessForProducts(productIds: string[]): Promise<Record<string, CompletenessByLocale>> {
      if (productIds.length === 0) return {};
      const rows = await db.select().from(productTranslationCompleteness)
        .where(inArray(productTranslationCompleteness.productId, productIds));
      const out: Record<string, CompletenessByLocale> = {};
      for (const id of productIds) out[id] = emptyCompleteness();
      for (const r of rows) {
        if (r.locale === "uz" || r.locale === "ru" || r.locale === "en") {
          (out[r.productId] ??= emptyCompleteness())[r.locale] = r.percent;
        }
      }
      return out;
    }
    ```

    Create `tests/db/translation-completeness-view.test.ts`:
    ```typescript
    import { describe, it, expect, afterEach } from "vitest";
    import { sql } from "drizzle-orm";
    import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";
    import { findProductCompleteness } from "@/lib/translation-completeness";

    describe("product_translation_completeness pgView", () => {
      const cleanups: Array<() => Promise<void>> = [];
      afterEach(async () => { for (const c of cleanups) await c(); cleanups.length = 0; });

      it("returns 25% for uz (only name filled), 50% for ru (name+slug), 100% for en (all 4)", async () => {
        requireTestDatabaseUrl();
        const db = await getTestDb();
        // 1. seed a category + product (Phase-1 schema; reuse minimal inserts)
        const catId = crypto.randomUUID();
        const productId = crypto.randomUUID();
        await db.execute(sql`INSERT INTO category (id, parent_id, sort_order) VALUES (${catId}, NULL, 0)`);
        await db.execute(sql`INSERT INTO category_translations (category_id, locale, name, slug) VALUES (${catId}, 'uz', 'cat', 'cat')`);
        await db.execute(sql`INSERT INTO product (id, category_id) VALUES (${productId}, ${catId})`);
        // uz: only name (1/4)
        await db.execute(sql`INSERT INTO product_translations (product_id, locale, name, slug) VALUES (${productId}, 'uz', 'P', '')`);
        // wait — slug='' length=0 → counted as missing per the view's CASE WHEN length>0; so uz = 1/4 = 25
        // Re-run with slug = NULL to be unambiguous
        await db.execute(sql`UPDATE product_translations SET slug = NULL, short_desc = NULL, long_desc = NULL WHERE product_id = ${productId} AND locale = 'uz'`);
        // ru: name + slug (2/4)
        await db.execute(sql`INSERT INTO product_translations (product_id, locale, name, slug) VALUES (${productId}, 'ru', 'P', 'p-ru')`);
        // en: all 4
        await db.execute(sql`INSERT INTO product_translations (product_id, locale, name, slug, short_desc, long_desc) VALUES (${productId}, 'en', 'P', 'p-en', 's', 'l')`);

        cleanups.push(async () => {
          await db.execute(sql`DELETE FROM product_translations WHERE product_id = ${productId}`);
          await db.execute(sql`DELETE FROM product WHERE id = ${productId}`);
          await db.execute(sql`DELETE FROM category_translations WHERE category_id = ${catId}`);
          await db.execute(sql`DELETE FROM category WHERE id = ${catId}`);
        });

        const result = await findProductCompleteness(productId);
        expect(result.uz).toBe(25);
        expect(result.ru).toBe(50);
        expect(result.en).toBe(100);
      }, 15000);
    });
    ```
    Adjust column names if Phase-1 schema differs (`short_desc` may be `shortDescription` in Drizzle camelCase; the SQL uses snake_case verbatim from the view).
  </action>
  <verify>
    <automated>pnpm vitest run tests/db/translation-completeness-view.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export async function findProductCompleteness' src/lib/translation-completeness.ts` returns `1`
    - `grep -c 'export async function findCompletenessForProducts' src/lib/translation-completeness.ts` returns `1`
    - `pnpm vitest run tests/db/translation-completeness-view.test.ts` exits 0; the assertion against 25/50/100 passes
  </acceptance_criteria>
  <done>Helpers expose the pgView; integration test confirms math.</done>
</task>

<task type="auto">
  <name>Task 12.2: TranslationCompleteness + TranslationDots UI components</name>
  <files>src/components/admin/translation-completeness.tsx</files>
  <read_first>
    - src/components/ui/badge.tsx (Badge primitive — for the dots)
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-04 (color thresholds: green ≥95, amber ≥50, red <50)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 5 (`useWatch` snippet for editor-side per-locale % bar — used by plan 02-13)
  </read_first>
  <behavior>
    - `<TranslationCompleteness percent={N} label?="" />` renders a horizontal bar with width N% and a tone (green/amber/red).
    - `<TranslationDots completeness={{ uz, ru, en }} />` renders 3 small colored dots in a row, each tooltipped with `${locale.toUpperCase()}: ${pct}%`.
    - Pure presentational; client component (uses Tooltip). No data fetching here; consumers pass values from server helpers.
  </behavior>
  <action>
    Create `src/components/admin/translation-completeness.tsx`:
    ```tsx
    "use client";
    import * as React from "react";
    import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
    import type { CompletenessByLocale, LocaleKey } from "@/lib/translation-completeness";

    function tone(p: number): "green" | "amber" | "red" {
      if (p >= 95) return "green";
      if (p >= 50) return "amber";
      return "red";
    }

    const COLOR: Record<ReturnType<typeof tone>, string> = {
      green: "bg-emerald-500",
      amber: "bg-amber-500",
      red: "bg-red-500",
    };

    export function TranslationCompleteness({ percent, label }: { percent: number; label?: string }) {
      return (
        <div className="space-y-1" data-testid={`completeness-${label ?? "unknown"}`}>
          {label && <div className="text-xs text-muted-foreground">{label} — {percent}%</div>}
          <div className="h-2 w-full rounded bg-muted">
            <div className={`h-full rounded ${COLOR[tone(percent)]}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
          </div>
        </div>
      );
    }

    export function TranslationDots({ completeness }: { completeness: CompletenessByLocale }) {
      const locales: LocaleKey[] = ["uz", "ru", "en"];
      return (
        <TooltipProvider>
          <div className="flex items-center gap-1" data-testid="completeness-dots">
            {locales.map((l) => (
              <Tooltip key={l}>
                <TooltipTrigger asChild>
                  <span className={`h-2 w-2 rounded-full ${COLOR[tone(completeness[l])]}`} aria-label={`${l}: ${completeness[l]}%`} />
                </TooltipTrigger>
                <TooltipContent>{l.toUpperCase()}: {completeness[l]}%</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export function TranslationCompleteness' src/components/admin/translation-completeness.tsx` returns `1`
    - `grep -c 'export function TranslationDots' src/components/admin/translation-completeness.tsx` returns `1`
    - `grep -c 'bg-emerald-500' src/components/admin/translation-completeness.tsx` returns `>=1`
    - `grep -c 'bg-amber-500' src/components/admin/translation-completeness.tsx` returns `>=1`
    - `grep -c 'bg-red-500' src/components/admin/translation-completeness.tsx` returns `>=1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Components compile and are ready for plan 02-13 product editor + product list.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Server helper → pgView | read-only |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-12-01 | Information Disclosure | the pgView is non-materialized; reads recompute on each query | accept | RESEARCH.md notes: 100-500 products → sub-millisecond |
| T-02-12-02 | DoS | unbounded productIds[] for findCompletenessForProducts | mitigate | Caller (RSC list page) bounds via DataTable pageSize ≤ 100 |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/db/translation-completeness-view.test.ts` exits 0
</verification>

<success_criteria>
1. findProductCompleteness + findCompletenessForProducts helpers ship.
2. TranslationCompleteness + TranslationDots components ship with correct color thresholds (green/amber/red).
3. Integration test confirms view math (25/50/100).
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-12-SUMMARY.md` with: helper API, color thresholds, view-math test results.
</output>
