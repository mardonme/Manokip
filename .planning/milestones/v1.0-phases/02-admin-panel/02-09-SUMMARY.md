---
phase: 02-admin-panel
plan: 09
subsystem: categories-crud
tags: [server-action, dbtx-transaction, audit-log, revalidate-tag, locale-tabs, slug-input, rhf, zod, tdd, tree-crud]

requires:
  - phase: 01-foundations/01-02
    provides: src/db/schema/categories.ts (categories + categoryTranslations sibling, composite PK on (category_id, locale), UNIQUE(locale, slug), CHECK locale IN ('uz','ru','en'))
  - phase: 01-foundations/01-01
    provides: src/lib/slug.ts (toSlug helper with apostrophe-variant set + Uzbek Latin oʻ/gʻ -> U+02BB normalization)
  - phase: 02-admin-panel/02-04
    provides: src/lib/server-action.ts (withAdminAction + AdminActionResult discriminated return) + src/lib/audit.ts (logAudit + closed AUDIT_ACTIONS enum)
  - phase: 02-admin-panel/02-05
    provides: src/lib/revalidation.ts (revalidateCategory + revalidateCategoryMove typed helpers — D-10 / D-12)
  - phase: 02-admin-panel/02-06
    provides: src/components/admin/data-table.tsx (generic DataTable<TData> with nuqs URL state)

provides:
  - src/components/admin/locale-tabs.tsx (NEW) — reusable 3-tab swap (uz/ru/en) for translatable fields with per-tab error count badge from RHF formState.errors; render-prop children receives the locale string so callers produce per-locale field paths (translations.${l}.name etc.). Marquee D-01 UI primitive.
  - src/components/admin/slug-input.tsx (NEW) — paired name/slug Inputs; onBlur of name calls toSlug() from @/lib/slug IFF the slug field is not yet dirty (RHF getFieldState dirty check). Shouldn't mark slug as dirty itself so the auto-fill keeps following the name field until the user takes ownership.
  - src/lib/zod/category.ts (NEW) — categoryInsertSchema (id optional, parentId nullable, sortOrder default 0, translations as fixed-shape object with uz/ru/en keys, slug regex /^[a-z0-9-]+$/) + categoryDeleteSchema. Same per-locale localeFields shape will be reused by 02-10 manufacturers.
  - src/actions/categories.ts (NEW) — saveCategory + deleteCategory Server Actions, both wrapped by withAdminAction; saveCategory does pre-tx snapshot + transactional base upsert + 3 translation upserts (ON CONFLICT DO UPDATE) + logAudit, then AFTER tx commit fans out via revalidateCategoryMove (when parentId changed) or revalidateCategory; deleteCategory throws NOT_FOUND sentinel for unknown ids and fans out by parent presence.
  - src/app/[locale]/admin/categories/page.tsx (NEW) — RSC list with parallel slice + count fetch, alias() lets the same category_translations table join twice (current locale name + uz canonical slug + parent name in current locale).
  - src/app/[locale]/admin/categories/categories-table.tsx (NEW) — 'use client' island consuming DataTable<CategoryRow> from 02-06 with edit link + inline delete via deleteCategory in useTransition (window.confirm gate before destructive call).
  - src/app/[locale]/admin/categories/new/page.tsx (NEW) — RSC pre-fetches localized parent options + renders CategoryForm without `initial` (insert mode).
  - src/app/[locale]/admin/categories/[id]/edit/page.tsx (NEW) — RSC fetches the canonical row + 3 translations, reshapes them into the CategoryInput.translations object (uz/ru/en keys, fallback to empty when a locale row is missing), excludes self from parent options to prevent self-loops at form level (T-02-09-02).
  - src/app/[locale]/admin/categories/category-form.tsx (NEW) — ONE useForm instance with zodResolver over categoryInsertSchema; LocaleTabs render-prop emits per-locale fields via SlugInput; shared parentId select + sortOrder render once outside the tab strip (D-01); submit calls saveCategory via React.useTransition + narrows on .ok.
  - tests/actions/categories.test.ts (NEW) — 3 live-Neon specs against the test branch covering create (1+3+1 row write + 3-tag fan-out), update with parent change (audit + 5-tag move fan-out per D-12), delete (audit + cascade); vi.mock('@/lib/auth') short-circuits next-auth import chain (same posture as 02-04 + 02-07); vi.hoisted spy on next/cache revalidateTag.

affects: [phase-2-plan-10, phase-2-plan-11, phase-2-plan-13b, phase-3-public-categories]

tech-stack:
  added: []  # No new deps. RHF + Zod + zodResolver + base-ui Tabs already in package.json.
  patterns:
    - "Pattern (LocaleTabs render-prop for 3-locale tab swap, D-01): the component receives a `(locale) => ReactNode` render-prop rather than 3 children, so the per-locale subtree is parameterized — callers produce `translations.${locale}.name` etc. without three near-identical copies. Per-tab error count badge counts keys in formState.errors[locale] so the active tab shows when validation fails on an inactive tab. This is the canonical Phase-2+ admin form pattern; reused in plans 02-10, 02-11, 02-13b."
    - "Pattern (SlugInput auto-fill with dirty guard): paired name + slug Inputs registered against RHF; onBlur of the name field calls toSlug(name) ONLY if the slug field has not yet been dirty (per RHF getFieldState). The auto-fill itself sets shouldDirty:false so the slug keeps following the name until the user takes ownership. Edge case: an admin who clears the slug then types something different gets exactly the field state they expect — manual edit wins."
    - "Pattern (universal Server Action shape per 02-PATTERNS): pre-tx snapshot for audit before_json + move detection; dbTx.transaction does base upsert + sibling translation upserts (ON CONFLICT DO UPDATE) + logAudit; AFTER tx.commit fans out via the typed revalidate helper. PITFALL #2 mitigated structurally: revalidate calls live on lines outside the dbTx.transaction lambda (verified by linear read; grep for 'await revalidate' inside the transaction returns 0). Reusable for all Phase-2 mutation Server Actions."
    - "Pattern (parent-change detection for D-12 move fan-out): pre-tx `before` snapshot is read OUTSIDE the transaction (small inefficiency, acceptable). After tx commit, compare `before.parentId ?? null` with `input.parentId ?? null`; if they differ, call revalidateCategoryMove(oldParent, newParent, movedId) — the helper is null-safe on either slot per plan 02-05. Otherwise the lighter revalidateCategory is sufficient. Test 2 in tests/actions/categories.test.ts locks the 5-tag fan-out shape explicitly."
    - "Pattern (NOT_FOUND sentinel in admin Server Actions): when a delete or update points at a non-existent id, throw a typed sentinel (`Error('NOT_FOUND')`) inside the wrapped handler so withAdminAction maps it to `{ ok:false, error:'unknown' }` without leaking unknown-vs-forbidden to the caller (defense-in-depth — the admin already has requireAdmin gate, but the sentinel posture mirrors plan 02-07 acceptInvite's INVALID_OR_EXPIRED sentinel for consistency)."
    - "Pattern (alias() for double-join on translations table): the categories list page joins category_translations 3 times — current-locale name, uz canonical slug, parent name in current locale — using drizzle-orm/pg-core's alias() helper. Without alias() the 3 joins would conflict on table identity. Reused approach for any list page that wants both current-locale labels and uz canonical fields in one query."
    - "Pattern (form-level self-loop guard for tree CRUD): the edit page filters self out of parentOptions BEFORE rendering the form, so the parent select can't offer the current category as its own parent. T-02-09-02 deferred a DB-level CHECK to Phase 3; the form guard is the v1 mitigation. Plan 02-11's spec-field-groups will follow the same posture for its own self-ref tree."
    - "Pattern (drizzle runtime client casing strategy): src/db/client.ts and src/db/client-ws.ts now both pass `casing: 'snake_case'` to drizzle() so runtime queries emit the same column names that drizzle-kit migrations generated (e.g. createdAt → \"created_at\"). Without this, schemas that rely on the casing strategy rather than explicit per-column name strings (categories/products/manufacturers/recipes/industries — Phase-1 convention) produce PG 42703 'column does not exist' errors at runtime. Documented in the deviation section."

key-files:
  created:
    - src/components/admin/locale-tabs.tsx (commit 12f7f05)
    - src/components/admin/slug-input.tsx (commit 12f7f05)
    - src/lib/zod/category.ts (commit c55c5dd)
    - src/actions/categories.ts (commit c55c5dd)
    - tests/actions/categories.test.ts (commit 5981b26 RED + c55c5dd GREEN)
    - src/app/[locale]/admin/categories/page.tsx (commit bb4baa0)
    - src/app/[locale]/admin/categories/categories-table.tsx (commit bb4baa0)
    - src/app/[locale]/admin/categories/category-form.tsx (commit bb4baa0)
    - src/app/[locale]/admin/categories/new/page.tsx (commit bb4baa0)
    - src/app/[locale]/admin/categories/[id]/edit/page.tsx (commit bb4baa0)
    - .planning/phases/02-admin-panel/02-09-SUMMARY.md (this file)
  modified:
    - src/db/client.ts (commit c55c5dd — added casing: 'snake_case' for runtime drizzle client)
    - src/db/client-ws.ts (commit c55c5dd — added casing: 'snake_case' for transactional drizzle client)
    - .planning/STATE.md (completed_plans 15 → 16, percent 43 → 47, position cursor advance)
    - .planning/ROADMAP.md (Phase 2 row 8/18 → 9/18)
    - .planning/REQUIREMENTS.md (ADMIN-03 marked complete)

key-decisions:
  - "toSlug() not slugify(): the plan's <action> block referenced `slugify` as the helper name but src/lib/slug.ts (Phase-1 SSOT) exports `toSlug`. Used the actual export name. Plan acceptance criterion `grep -c 'slugify(name)' src/components/admin/slug-input.tsx === 1` is unsatisfiable as-written; the equivalent `grep -c 'toSlug(name)' === 1` IS satisfied. Documented as a Rule-1 plan internal-spec discrepancy below — the functional contract (auto-generate slug from name on blur) is preserved."
  - "Drizzle runtime clients pass `casing: 'snake_case'`: this is a Rule-1 fix for a Phase-1 schema/runtime mismatch. drizzle.config.ts:22 sets casing: 'snake_case' for migration generation, which produces snake_case DB columns (verified in drizzle/0000_phase1_foundations.sql:65-68 — 'parent_id', 'sort_order', 'created_at', 'updated_at'). However the runtime drizzle clients (db, dbTx) did NOT pass the casing option, so a query like `tx.update(categories).set({ updatedAt: new Date() })` emitted SQL targeting a literal \"updatedAt\" column. The DB column is \"updated_at\". Without the fix, the categories test reproducibly hits PG 42703 'column \"createdAt\" of relation \"category\" does not exist'. The fix is two-line (one line per client) and matches drizzle-kit's documented pattern. Affects categories/products/manufacturers/recipes/industries schemas (those that rely on casing rather than explicit per-column name strings)."
  - "vi.hoisted for the next/cache spy: vi.mock() factories are hoisted by Vitest to the top of the file, so a plain `const revalidateTag = vi.fn(); vi.mock('next/cache', () => ({ revalidateTag }))` produces a temporal-dead-zone error (factory references a const not yet initialized). The canonical fix is `const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))` — the hoisted construct executes before vi.mock factories. Applied here; future test files spying on next/cache should follow the same shape."
  - "RHF defaultValues + Zod resolver: form mode is 'onBlur' so SlugInput's blur handler reads fresh dirty state from RHF and validation surfaces in tab badges as the admin tabs across. Mode 'onSubmit' would defer all error display to the first submit attempt — bad UX when one of three locale tabs has invalid input."
  - "Server Action submit via React.useTransition rather than useActionState: saveCategory takes a typed CategoryInput payload, not FormData. useActionState's (state, formData) signature would force us to serialize/deserialize the form into FormData and back. useTransition lets us call `saveCategory(values)` directly with the typed object and narrow the discriminated AdminActionResult on `.ok`. Same posture as plan 02-07's InviteAdminDialog established."
  - "List page joins translations 3 times via alias(): current-locale name (for the list label), uz canonical slug (sitemap source-of-truth per Phase-1 guardrail), and parent name in current locale (for the list parent column). Without alias() the 3 left-joins would conflict on table identity at the SQL level."
  - "Form-level self-loop guard (T-02-09-02): the edit page filters `categories.id != currentEditId` from parentOptions before threading them into CategoryForm, so the parent select can't offer the current category as its own parent. The Phase-1 schema (categories.parent_id self-ref FK with onDelete:'restrict') accepts self-loops at the column level, and the planner deferred a DB-level CHECK to Phase 3 (rare in practice; admin discipline). The form guard is the v1 mitigation."

patterns-established:
  - "LocaleTabs is the canonical 3-locale form primitive for Phase-2+ admin editors. Every translatable entity CRUD page uses it. The render-prop signature `(locale) => ReactNode` is the locked contract; callers produce `translations.${locale}.<field>` paths."
  - "SlugInput is the canonical name+slug input pair. Reused by 02-10 (manufacturers — same shape) and 02-13b (products — multiple per-locale name fields). The dirty-guard pattern means the helper is safe to use on edit pages where the slug starts pre-populated."
  - "Universal Server Action shape (pre-tx snapshot + dbTx.transaction with sibling-translations loop + logAudit + post-commit revalidate fan-out) is the verified template for plans 02-10, 02-11, 02-13b. The plan 02-PATTERNS template is now backed by working code + 3 green live-Neon specs."
  - "List page double-locale-join pattern (alias() current locale + uz canonical) is reusable for plans 02-10 (manufacturers list), 02-13a (products list — name in current locale + uz slug for the public URL preview)."

requirements-completed: [ADMIN-03]
requirements-touched: [ADMIN-11, OPS-01]  # logAudit on every mutation (ADMIN-11) + revalidateTag fan-out (OPS-01) — both already marked complete by plans 02-04 + 02-05; this plan exercises them.

duration: ~25min
completed: 2026-04-28
---

# Phase 2 Plan 09: Categories CRUD Summary

**Categories CRUD ships with 3-locale tabs, slug auto-generation, audit log on every mutation, and D-12 re-parent fan-out (revalidateCategoryMove). The marquee deliverable is two reusable form primitives — LocaleTabs and SlugInput — that 02-10 (manufacturers), 02-11 (spec-fields), and 02-13b (products) will reuse verbatim. Discovered + fixed a Phase-1 runtime/schema casing mismatch as a Rule-1 deviation: drizzle.config.ts sets `casing: 'snake_case'` for migration generation but the runtime drizzle clients didn't pass the same option, producing PG 42703 'column does not exist' errors at runtime for any schema relying on the casing strategy (categories/products/manufacturers/recipes/industries). Two-line fix, applied to both src/db/client.ts and src/db/client-ws.ts. 4 commits (2 TDD RED+GREEN cycles + 2 feat), 3 live-Neon specs added, 84/84 tests passing across 18 files (was 81/81 across 17). pnpm tsc --noEmit plan-relevant clean; pnpm build Compiled in 12.1s with same pre-existing 02-01 script TS errors gating the typecheck step (out-of-scope per CLAUDE.md scope-boundary).**

## Performance

- **Duration:** ~25 min wall-clock (single executor session)
- **Started:** 2026-04-28T14:40:00Z
- **Completed:** 2026-04-28T15:05:00Z
- **Tasks:** 3 (9.1 LocaleTabs + SlugInput, 9.2 Server Actions + Zod + tests, 9.3 list/new/edit pages + form)
- **Files created:** 11 (2 admin primitives + 1 zod + 1 actions + 1 test + 5 admin route + 1 SUMMARY)
- **Files modified:** 2 (src/db/client.ts + src/db/client-ws.ts — casing strategy fix)
- **Commits:** 4 task commits (1 primitives + 1 RED + 1 GREEN + 1 UI) + 1 final metadata commit

## Accomplishments

- **Two reusable form primitives ship.** LocaleTabs renders 3 tabs (uz/ru/en) with per-tab error count badges scoped from `formState.errors`; render-prop children pattern means callers parameterize the per-locale subtree by locale string (so `translations.${locale}.name` etc. is one expression rather than three near-identical copies). SlugInput pairs name + slug Inputs and auto-generates the slug from the name on blur via Phase-1's `toSlug()` helper (canonical apostrophe-variant + Uzbek Latin oʻ/gʻ → U+02BB) IFF the slug isn't yet dirty (RHF `getFieldState` dirty check). Both are now the locked Phase-2+ admin form pattern; plans 02-10 / 02-11 / 02-13b will reuse verbatim.
- **saveCategory + deleteCategory Server Actions land with the canonical universal shape.** Pre-tx snapshot for audit before_json + move detection; dbTx.transaction does base upsert + 3 translation upserts (ON CONFLICT DO UPDATE on (category_id, locale)) + logAudit; AFTER tx.commit fans out via revalidateCategoryMove (D-12) when parentId changed, else revalidateCategory. PITFALL #2 (revalidate inside transaction) mitigated structurally: every revalidate call lives outside the dbTx.transaction lambda. Verified by 3 live-Neon specs.
- **D-12 re-parent fan-out verified end-to-end.** Test 2 seeds parent A + parent B + child(parent=A), then re-parents the child to parent B and asserts the 5-tag fan-out: `category:<A>`, `category:<B>`, `category:<child>`, `categories-tree`, `sitemap`. The audit row's before_json.parent_id contains A; after_json.parent_id contains B. Plan 02-05's revalidateCategoryMove null-safety on either parent slot is exercised here.
- **3 admin route pages (RSC list + new + edit) consume the existing DataTable<TData> from 02-06.** List page joins category_translations 3 times via alias() — current-locale name (for the row label), uz canonical slug (sitemap source-of-truth per Phase-1 guardrail), parent name in current locale (for the parent column). New + edit pages pre-fetch localized parent options; edit excludes self from parent options to prevent self-loops at form level (T-02-09-02 form-layer mitigation; DB-level CHECK deferred to Phase 3 per planner).
- **CategoryForm is the canonical D-01 editor.** ONE useForm instance with zodResolver over categoryInsertSchema; LocaleTabs render-prop emits per-locale fields via SlugInput; shared parentId select + sortOrder render once outside the tab strip. Submit calls saveCategory via React.useTransition + narrows on `.ok`. Same posture as plan 02-07's InviteAdminDialog (typed object payload — useActionState's FormData reducer would add friction).
- **Drizzle runtime client casing strategy fixed (Rule-1 deviation).** Phase-1's drizzle.config.ts:22 sets `casing: 'snake_case'` for migration generation, but the runtime drizzle clients (db, dbTx) did NOT pass the same option. Result: any schema relying on the casing strategy rather than explicit per-column name strings (categories/products/manufacturers/recipes/industries) produced PG 42703 'column "createdAt" does not exist' errors at runtime when written to. Two-line fix applied to both src/db/client.ts and src/db/client-ws.ts. The categories test reproduces the bug pre-fix; the fix unblocks not just this plan but every downstream plan that writes to those schemas (02-10 manufacturers, 02-11 spec-fields, 02-13a/b products).

## Server Action API shape

```typescript
// src/actions/categories.ts
export const saveCategory = withAdminAction(
  categoryInsertSchema,
  async (input, ctx) => { /* tx + revalidate */ }
);
//  Returns: AdminActionResult<{ id: string; parentId: string | null;
//                               sortOrder: number; createdAt: Date;
//                               updatedAt: Date; }>

export const deleteCategory = withAdminAction(
  categoryDeleteSchema,
  async ({ id }, ctx) => { /* tx + revalidate */ }
);
//  Returns: AdminActionResult<{ deleted: string }>
```

```typescript
// src/lib/zod/category.ts
export const categoryInsertSchema = z.object({
  id: z.string().uuid().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  translations: z.object({
    uz: localeFields,  // { name, slug (regex /^[a-z0-9-]+$/), description? }
    ru: localeFields,
    en: localeFields,
  }),
});
```

## Reusable primitives signature

```typescript
// src/components/admin/locale-tabs.tsx
export type Locale = "uz" | "ru" | "en";
export const LOCALES: Locale[] = ["uz", "ru", "en"];
export interface LocaleTabsProps {
  errors?: Partial<Record<Locale, FieldErrors | undefined>>;
  defaultValue?: Locale;
  children: (locale: Locale) => React.ReactNode;
}

// src/components/admin/slug-input.tsx
export interface SlugInputProps {
  nameField: string;          // e.g. "translations.uz.name"
  slugField: string;          // e.g. "translations.uz.slug"
  namePlaceholder?: string;
  slugPlaceholder?: string;
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Drizzle runtime clients missing `casing: 'snake_case'`**
- **Found during:** Task 9.2 (running tests/actions/categories.test.ts after implementing saveCategory)
- **Issue:** First test run failed with PG 42703: `column "createdAt" of relation "category" does not exist`. drizzle.config.ts:22 sets `casing: 'snake_case'` for drizzle-kit migration generation (verified in drizzle/0000_phase1_foundations.sql:65-68 — DB columns are snake_case), but the runtime drizzle clients in src/db/client.ts and src/db/client-ws.ts did NOT pass the same option. Result: `tx.update(categories).set({ updatedAt: new Date() })` emitted SQL targeting a literal `"updatedAt"` column that does not exist. Affects every Phase-1 schema relying on the casing strategy (categories/products/manufacturers/recipes/industries) — would have blocked plans 02-10, 02-11, 02-13a, 02-13b downstream.
- **Fix:** Added `casing: 'snake_case'` to both drizzle() runtime client constructions. Two-line fix.
- **Files modified:** src/db/client.ts, src/db/client-ws.ts
- **Commit:** c55c5dd (bundled with the saveCategory GREEN commit since the test could not pass without the runtime fix)

**2. [Rule 1 - Plan internal-spec] Plan acceptance criterion references `slugify(name)` but Phase-1 lib exports `toSlug`**
- **Found during:** Task 9.1
- **Issue:** Plan's <action> block instructs `import { slugify } from "@/lib/slug"` and the acceptance criterion is `grep -c 'slugify(name)' src/components/admin/slug-input.tsx === 1`. The actual Phase-1 lib (src/lib/slug.ts:16) exports `toSlug`, not `slugify`. The plan misnamed the helper.
- **Fix:** Used the actual export name `toSlug`. The functional contract (auto-generate slug from name on blur) is preserved exactly. The literal grep criterion is unsatisfiable as-written; equivalent `grep -c 'toSlug(name)' === 1` IS satisfied.
- **Files modified:** src/components/admin/slug-input.tsx
- **Commit:** 12f7f05

**3. [Rule 3 - Blocker] vi.mock + factory-time const reference in tests/actions/categories.test.ts**
- **Found during:** Task 9.2 (first run after writing the action)
- **Issue:** Initial test had `const revalidateTag = vi.fn(); vi.mock('next/cache', () => ({ revalidateTag }))`. Vitest hoists vi.mock factories to the top of the file — the factory references a const not yet initialized. Threw `ReferenceError: Cannot access 'revalidateTag' before initialization`.
- **Fix:** Moved the spy construction inside `vi.hoisted(() => ({ revalidateTag: vi.fn() }))`. The hoisted construct runs before the vi.mock factory.
- **Files modified:** tests/actions/categories.test.ts
- **Commit:** c55c5dd (bundled with GREEN — needed for the test to even load before assertions)

## Test Coverage

3 live-Neon specs added in tests/actions/categories.test.ts:

| Spec | What it locks | Live-DB rows asserted |
|------|---------------|------------------------|
| `create — writes 1 categories row + 3 translations + audit_log(action='create') atomically` | Atomic insert path; 3-tag revalidateCategory fan-out | 1 category, 3 category_translations (locales sorted = ['en','ru','uz']), 1 audit_log(action='create', before_json IS NULL) |
| `update with parent change — writes audit_log(action='update') + revalidateCategoryMove fan-out (D-12)` | Move detection; D-12 5-tag fan-out (oldParent, newParent, moved, categories-tree, sitemap); audit before_json.parent_id matches old, after_json.parent_id matches new | 3 categories (parent A, parent B, child); audit_log(action='update') with parent ids in before_json + after_json |
| `delete — writes audit_log(action='delete') + before_json contains row + after_json IS NULL + row is gone` | DELETE path; FK cascade on translations; audit shape | category row gone post-call; audit_log(action='delete', before_json populated, after_json IS NULL) |

Vitest run: 18 files / 84 tests passing (was 17 / 81 at plan 02-08 close; +1 file +3 specs).
Cold-Neon HTTP first-query: 15-20s test timeouts applied (pattern from plan 02-04).

## Open Questions Resolved

None.

## Open Questions Deferred

None.

## Notes for next plan (02-10 manufacturers)

- **Reuse LocaleTabs + SlugInput verbatim.** Manufacturer form needs the same 3-locale tab strip. The render-prop API and RHF + Zod resolver pattern transplant directly; only the schema (manufacturer-specific fields like `logoPublicId`, `country`) and the parent-select (manufacturers don't have a tree) change. The pages structure (list + new + edit) is the same.
- **Reuse universal Server Action shape from src/actions/categories.ts.** Pre-tx snapshot, dbTx.transaction with translation upsert loop, logAudit, post-commit revalidateManufacturer (already in src/lib/revalidation.ts).
- **Casing fix already applied.** No need to re-apply; future runtime queries against manufacturers + manufacturer_translations will work with the corrected drizzle clients.
- **alias() pattern reusable for the manufacturers list.** Same shape: current-locale name + uz canonical slug.

## Self-Check: PASSED

- src/components/admin/locale-tabs.tsx (commit 12f7f05) — FOUND
- src/components/admin/slug-input.tsx (commit 12f7f05) — FOUND
- src/lib/zod/category.ts (commit c55c5dd) — FOUND
- src/actions/categories.ts (commit c55c5dd) — FOUND
- tests/actions/categories.test.ts (commit 5981b26 + c55c5dd) — FOUND
- src/app/[locale]/admin/categories/page.tsx (commit bb4baa0) — FOUND
- src/app/[locale]/admin/categories/categories-table.tsx (commit bb4baa0) — FOUND
- src/app/[locale]/admin/categories/category-form.tsx (commit bb4baa0) — FOUND
- src/app/[locale]/admin/categories/new/page.tsx (commit bb4baa0) — FOUND
- src/app/[locale]/admin/categories/[id]/edit/page.tsx (commit bb4baa0) — FOUND
- src/db/client.ts (modified — casing strategy, commit c55c5dd) — FOUND
- src/db/client-ws.ts (modified — casing strategy, commit c55c5dd) — FOUND
- All 4 commits present in git log (12f7f05, 5981b26, c55c5dd, bb4baa0) — VERIFIED
