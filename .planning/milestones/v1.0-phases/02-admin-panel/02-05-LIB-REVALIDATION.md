---
phase: 02-admin-panel
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/revalidation.ts
  - tests/lib/revalidation.test.ts
autonomous: true
requirements: [OPS-01]
must_haves:
  truths:
    - "revalidateProduct(id) calls revalidateTag with product:<id>, products-list, sitemap (each with cacheLife='max' — Next 16 2-arg form)"
    - "revalidateCategoryMove(oldParentId, newParentId, movedId) fans out to old parent + new parent + moved cat + categories-tree + sitemap (D-12)"
    - "revalidateCategory(id), revalidateManufacturer(id), revalidateSpecField(id, categoryId), revalidateSpecFieldGroup(id, categoryId), revalidateSubmissionsCollection() all exist with correct tag sets"
    - "Helpers use Next.js 16 2-arg revalidateTag signature (single-arg is TS-error in Next 16)"
    - "Unit test asserts each helper calls revalidateTag with the expected tag set + 'max' second arg"
  artifacts:
    - path: "src/lib/revalidation.ts"
      provides: "Typed cache-invalidation helpers per entity"
      contains: "export async function revalidateProduct"
    - path: "tests/lib/revalidation.test.ts"
      provides: "vi.mock('next/cache') + assertions for each helper"
      contains: "vi.mock(\"next/cache\""
  key_links:
    - from: "src/lib/revalidation.ts"
      to: "next/cache (revalidateTag)"
      via: "import { revalidateTag } from 'next/cache'"
      pattern: "import \\{ revalidateTag \\} from \"next/cache\""
---

<objective>
Land the cache-invalidation helper module that every Wave-2/3/4 action calls AFTER the transaction commits. Helpers are typed (one per entity), use the Next.js 16 2-arg `revalidateTag(tag, 'max')` signature, and never run inside a transaction (Pitfall #2).

Purpose: D-10 fan-out is centralized so callers cannot accidentally forget a tag (Pitfall #3 — the OPS-01 silent failure). Type safety prevents typos in tag names. The OPS-01 e2e gate (plan 02-17) is the integration proof; this plan is the unit-test foundation.
Output: `src/lib/revalidation.ts` + `tests/lib/revalidation.test.ts`.
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
@tests/api/cloudinary-sign.test.ts

<interfaces>
From next/cache (Next.js 16):
```typescript
export function revalidateTag(tag: string, profile: 'max' | 'default' | 'min'): Promise<void>;
// Single-arg form is deprecated and TS-errors in Next 16.
```

CONTEXT D-10 tag scheme:
- Per-entity: `product:<uuid>`, `category:<uuid>`, `manufacturer:<uuid>`, `spec-field:<uuid>`, `spec-field-group:<uuid>`
- Per-collection: `products-list`, `categories-tree`, `manufacturers-list`, `sitemap`, `search-index`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 5.1: Create typed revalidation helpers</name>
  <files>src/lib/revalidation.ts</files>
  <read_first>
    - .planning/phases/02-admin-panel/02-CONTEXT.md §D-10 (full tag scheme) and §D-12 (revalidateCategoryMove fan-out)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/lib/revalidation.ts (NEW — D-10, D-12)` — verbatim
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 7 (Next 16 2-arg revalidateTag mandate) and §Anti-Patterns to Avoid (revalidate inside tx is forbidden)
  </read_first>
  <behavior>
    - Test 1: `revalidateProduct('abc')` → `revalidateTag` called 3 times: `product:abc`/`'max'`, `products-list`/`'max'`, `sitemap`/`'max'`.
    - Test 2: `revalidateCategoryMove('OLD', 'NEW', 'MOVED')` → 5 calls covering all listed tags (D-12 fan-out).
    - Test 3: `revalidateCategoryMove(null, 'NEW', 'MOVED')` → 4 calls (skips old parent because it was null).
    - Test 4: `revalidateSpecField('SF', 'CAT')` → calls `spec-field:SF`, `category:CAT`, `search-index` each with `'max'`.
  </behavior>
  <action>
    Create `src/lib/revalidation.ts`:
    ```typescript
    import { revalidateTag } from "next/cache";

    type Profile = "max" | "default" | "min";
    const DEFAULT_PROFILE: Profile = "max";

    async function tag(name: string, profile: Profile = DEFAULT_PROFILE) {
      await revalidateTag(name, profile);
    }

    // ─── Per-entity helpers ───────────────────────────────────────

    export async function revalidateProduct(id: string): Promise<void> {
      await tag(`product:${id}`);
      await tag("products-list");
      await tag("sitemap");
      await tag("search-index");
    }

    export async function revalidateCategory(id: string): Promise<void> {
      await tag(`category:${id}`);
      await tag("categories-tree");
      await tag("sitemap");
    }

    export async function revalidateCategoryMove(
      oldParentId: string | null,
      newParentId: string | null,
      movedId: string,
    ): Promise<void> {
      if (oldParentId) await tag(`category:${oldParentId}`);
      if (newParentId) await tag(`category:${newParentId}`);
      await tag(`category:${movedId}`);
      await tag("categories-tree");
      await tag("sitemap");
    }

    export async function revalidateManufacturer(id: string): Promise<void> {
      await tag(`manufacturer:${id}`);
      await tag("manufacturers-list");
      await tag("sitemap");
    }

    export async function revalidateSpecField(id: string, categoryId: string): Promise<void> {
      await tag(`spec-field:${id}`);
      await tag(`category:${categoryId}`);
      await tag("search-index");
    }

    export async function revalidateSpecFieldGroup(id: string, categoryId: string): Promise<void> {
      await tag(`spec-field-group:${id}`);
      await tag(`category:${categoryId}`);
    }

    export async function revalidateSubmissionsCollection(): Promise<void> {
      // No public-facing tag; admin reads invalidate via the /admin/submissions page revalidatePath if needed.
      // This helper is a no-op placeholder so callers stay symmetric.
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm vitest run tests/lib/revalidation.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export async function revalidateProduct' src/lib/revalidation.ts` returns `1`
    - `grep -c 'export async function revalidateCategoryMove' src/lib/revalidation.ts` returns `1`
    - `grep -c 'export async function revalidateManufacturer' src/lib/revalidation.ts` returns `1`
    - `grep -c 'export async function revalidateSpecField' src/lib/revalidation.ts` returns `1`
    - `grep -c 'export async function revalidateSpecFieldGroup' src/lib/revalidation.ts` returns `1`
    - `grep -c 'revalidateTag(' src/lib/revalidation.ts` returns `0` (all calls go through the local `tag` wrapper)
    - `grep -c 'await revalidateTag(name, profile)' src/lib/revalidation.ts` returns `1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Typed helpers exported; all calls use the 2-arg revalidateTag form via the `tag` wrapper.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 5.2: Create vi.mock-based unit tests for each helper</name>
  <files>tests/lib/revalidation.test.ts</files>
  <read_first>
    - tests/api/cloudinary-sign.test.ts (vi.mock pattern; this test mocks @/lib/auth — the same shape applies to next/cache)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`tests/lib/revalidation.test.ts + tests/lib/require-admin.test.ts` (verbatim mock pattern)
    - .planning/phases/02-admin-panel/02-VALIDATION.md §Wave 0 Requirements (closes the revalidation.test.ts Wave-0 item)
  </read_first>
  <behavior>
    Each helper has a test asserting the exact tags called (in any order) and the second-arg `'max'`.
  </behavior>
  <action>
    Create `tests/lib/revalidation.test.ts`:
    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";

    vi.mock("next/cache", () => ({ revalidateTag: vi.fn().mockResolvedValue(undefined) }));

    import { revalidateTag } from "next/cache";
    import {
      revalidateProduct,
      revalidateCategory,
      revalidateCategoryMove,
      revalidateManufacturer,
      revalidateSpecField,
      revalidateSpecFieldGroup,
    } from "@/lib/revalidation";

    const mocked = vi.mocked(revalidateTag);

    describe("revalidation helpers — Next 16 2-arg form", () => {
      beforeEach(() => mocked.mockClear());

      it("revalidateProduct fans out product:<id>, products-list, sitemap, search-index", async () => {
        await revalidateProduct("abc");
        expect(mocked).toHaveBeenCalledWith("product:abc", "max");
        expect(mocked).toHaveBeenCalledWith("products-list", "max");
        expect(mocked).toHaveBeenCalledWith("sitemap", "max");
        expect(mocked).toHaveBeenCalledWith("search-index", "max");
        expect(mocked).toHaveBeenCalledTimes(4);
      });

      it("revalidateCategory fans out category:<id>, categories-tree, sitemap", async () => {
        await revalidateCategory("cat1");
        expect(mocked).toHaveBeenCalledWith("category:cat1", "max");
        expect(mocked).toHaveBeenCalledWith("categories-tree", "max");
        expect(mocked).toHaveBeenCalledWith("sitemap", "max");
        expect(mocked).toHaveBeenCalledTimes(3);
      });

      it("revalidateCategoryMove fans out old + new + moved + tree + sitemap", async () => {
        await revalidateCategoryMove("OLD", "NEW", "MOVED");
        expect(mocked).toHaveBeenCalledWith("category:OLD", "max");
        expect(mocked).toHaveBeenCalledWith("category:NEW", "max");
        expect(mocked).toHaveBeenCalledWith("category:MOVED", "max");
        expect(mocked).toHaveBeenCalledWith("categories-tree", "max");
        expect(mocked).toHaveBeenCalledWith("sitemap", "max");
        expect(mocked).toHaveBeenCalledTimes(5);
      });

      it("revalidateCategoryMove skips null oldParent", async () => {
        await revalidateCategoryMove(null, "NEW", "MOVED");
        expect(mocked).toHaveBeenCalledTimes(4);
        const calls = mocked.mock.calls.map(c => c[0]);
        expect(calls).not.toContain("category:null");
      });

      it("revalidateManufacturer fans out manufacturer:<id>, manufacturers-list, sitemap", async () => {
        await revalidateManufacturer("mfg1");
        expect(mocked).toHaveBeenCalledWith("manufacturer:mfg1", "max");
        expect(mocked).toHaveBeenCalledWith("manufacturers-list", "max");
        expect(mocked).toHaveBeenCalledWith("sitemap", "max");
      });

      it("revalidateSpecField fans out spec-field:<id>, category:<catId>, search-index", async () => {
        await revalidateSpecField("SF", "CAT");
        expect(mocked).toHaveBeenCalledWith("spec-field:SF", "max");
        expect(mocked).toHaveBeenCalledWith("category:CAT", "max");
        expect(mocked).toHaveBeenCalledWith("search-index", "max");
      });

      it("revalidateSpecFieldGroup fans out spec-field-group:<id>, category:<catId>", async () => {
        await revalidateSpecFieldGroup("SFG", "CAT");
        expect(mocked).toHaveBeenCalledWith("spec-field-group:SFG", "max");
        expect(mocked).toHaveBeenCalledWith("category:CAT", "max");
      });
    });
    ```
  </action>
  <verify>
    <automated>pnpm vitest run tests/lib/revalidation.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm vitest run tests/lib/revalidation.test.ts` exits 0
    - All 7 tests pass
    - `grep -c 'vi.mock("next/cache"' tests/lib/revalidation.test.ts` returns `1`
    - `grep -c '"max"' tests/lib/revalidation.test.ts` returns `>=15` (every assertion passes the profile arg)
  </acceptance_criteria>
  <done>Each helper has a passing vi.mock-based unit test asserting the exact tag set + 'max' profile.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Server Action → revalidateTag | post-commit cache invalidation |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-05-01 | Tampering | revalidate inside tx | mitigate | Helpers are pure functions; CONTEXT D-10 + Pitfall #2 explicitly forbid revalidating inside `dbTx.transaction(...)`. Lint via code-review checklist |
| T-02-05-02 | Information Disclosure | tag values include uuids | accept | Tags are server-only artifacts; not visible to public clients |
| T-02-05-03 | DoS | overly broad revalidate (e.g., revalidate everything) | mitigate | Helpers are scoped per entity; each helper invalidates ≤5 tags. No `revalidatePath('/')` |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/lib/revalidation.test.ts` exits 0 (7/7 passing)
</verification>

<success_criteria>
1. 7 typed helpers exist (`revalidateProduct`, `revalidateCategory`, `revalidateCategoryMove`, `revalidateManufacturer`, `revalidateSpecField`, `revalidateSpecFieldGroup`, `revalidateSubmissionsCollection`).
2. All calls use the 2-arg `revalidateTag(tag, 'max')` form.
3. Unit tests assert the exact tag fan-out for each helper.
</success_criteria>

<output>
After completion, create `.planning/phases/02-admin-panel/02-05-SUMMARY.md` listing each helper, its tag fan-out, and confirmation that the 2-arg form is used.
</output>
