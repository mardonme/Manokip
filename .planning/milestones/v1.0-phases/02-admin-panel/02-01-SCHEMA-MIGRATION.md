---
phase: 02-admin-panel
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/db/schema/admin.ts
  - src/db/schema/spec-fields.ts
  - src/db/schema/spec-field-groups.ts
  - src/db/schema/translation-flags.ts
  - src/db/schema/views/product-translation-completeness.ts
  - src/db/schema/products.ts
  - src/db/schema/index.ts
  - drizzle/migrations
autonomous: false
requirements: [ADMIN-02, ADMIN-05, ADMIN-09, ADMIN-10, ADMIN-11]
must_haves:
  truths:
    - "admin_invite table exists with token UNIQUE, expires_at, used_at, invited_by columns"
    - "spec_field has nullable deleted_at TIMESTAMPTZ and group_id UUID FK columns"
    - "spec_field_group + spec_field_group_translations tables exist with sibling translations shape"
    - "product_translation_field_flags sibling table exists keyed (product_id, locale, field_name) with machine_translated boolean"
    - "product.status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')) column exists, backfilled from publishedAt"
    - "product_translation_completeness pgView exists computing per-locale percent over name+slug+short_desc+long_desc plus required text spec values"
    - "Migration applied to live Neon dev branch and visible via SELECT to_regclass('admin_invite')"
  artifacts:
    - path: "src/db/schema/admin.ts"
      provides: "adminInvites pgTable export"
      contains: "export const adminInvites = pgTable(\"admin_invite\""
    - path: "src/db/schema/spec-fields.ts"
      provides: "deletedAt + groupId columns on specFields; partial unique index"
      contains: "deletedAt: timestamp(\"deleted_at\""
    - path: "src/db/schema/products.ts"
      provides: "status column on product table with CHECK constraint"
      contains: "status: text(\"status\").notNull().default(\"draft\")"
    - path: "src/db/schema/spec-field-groups.ts"
      provides: "specFieldGroups + specFieldGroupTranslations tables"
      contains: "export const specFieldGroups = pgTable(\"spec_field_group\""
    - path: "src/db/schema/translation-flags.ts"
      provides: "productTranslationFieldFlags table"
      contains: "export const productTranslationFieldFlags = pgTable(\"product_translation_field_flags\""
    - path: "src/db/schema/views/product-translation-completeness.ts"
      provides: "productTranslationCompleteness pgView"
      contains: "pgView(\"product_translation_completeness\""
    - path: "src/db/schema/index.ts"
      provides: "Barrel exports for new schema modules"
      contains: "export * from \"./spec-field-groups\""
  key_links:
    - from: "src/db/schema/index.ts"
      to: "src/db/schema/spec-field-groups.ts, src/db/schema/translation-flags.ts, src/db/schema/views/product-translation-completeness.ts"
      via: "barrel re-export"
      pattern: "export \\* from \"\\./(spec-field-groups|translation-flags|views/product-translation-completeness)\""
    - from: "drizzle/migrations/<latest>.sql"
      to: "Neon Postgres dev branch"
      via: "drizzle-kit migrate against DATABASE_URL_DIRECT"
      pattern: "ALTER TABLE \"spec_field\" ADD COLUMN \"deleted_at\""
    - from: "drizzle/migrations/<latest>.sql"
      to: "product table"
      via: "ALTER TABLE + UPDATE backfill"
      pattern: "ALTER TABLE \"product\" ADD COLUMN \"status\""
---

<objective>
Land all Phase-2 additive schema changes in a SINGLE drizzle migration so every downstream wave has the new columns/tables/view available. Implements CONTEXT D-11 verbatim (`product.status` enum column with CHECK constraint, backfilled from `publishedAt`); replaces existing `spec_field(category_id, key)` UNIQUE with a partial unique `WHERE deleted_at IS NULL` (per RESOLVED Open Q §7); adopts sibling `translation_field_flags` table (per RESOLVED Open Q §2 Option A) scoped to `productTranslations` for v1.

Purpose: Build/typecheck of every later plan compiles against these schema files; integration tests fail without the live migration applied. The `product.status` column becomes the canonical lifecycle state for `publishProduct` / `unpublishProduct` / `saveProduct` actions in plans 02-13a/02-13b.
Output: 6 schema file changes + 1 migration commit + applied DDL on Neon dev (with backfill).
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@CLAUDE.md
@src/db/schema/admin.ts
@src/db/schema/spec-fields.ts
@src/db/schema/categories.ts
@src/db/schema/products.ts
@src/db/schema/index.ts
@drizzle.config.ts

<assumptions>
- **RESOLVED Open Q §1 (product.status):** Option B (literal CONTEXT D-11) — add the `status` column with CHECK constraint, backfill from `publishedAt`. Keeps `publishedAt` as the publish timestamp; `status` is the canonical state lifecycle actions mutate.
- **RESOLVED Open Q §2 (MT-flag schema):** Option A — sibling `translation_field_flags` form. Phase 2 ships flags only for `productTranslations` and (forward) `productSpecValueTranslations`; category/manufacturer/spec-field flags deferred to v2 per PATTERNS.md note.
- **RESOLVED Open Q §7 (UNIQUE on spec_field):** partial unique index `WHERE deleted_at IS NULL` so a soft-deleted key can be re-created.
- **CONTEXT D-15 (amended 2026-04-27):** `sessions.absoluteExpires` already exists from Phase 1 (`src/db/schema/auth.ts`) and is mathematically equivalent to D-15's `created_at + '7d'` formulation. CONTEXT.md D-15 step 3 was amended to reflect this — NO schema change to `sessions` in this migration.
</assumptions>
</context>

<tasks>

<task type="auto">
  <name>Task 1.1: Add product.status column + adminInvites table + spec-field schema additions</name>
  <files>src/db/schema/products.ts, src/db/schema/admin.ts, src/db/schema/spec-fields.ts</files>
  <read_first>
    - src/db/schema/products.ts (current shape; the `product` pgTable definition is where `status` is added)
    - src/db/schema/admin.ts (current shape; the `auditLog` table style is the closest analog for column conventions)
    - src/db/schema/spec-fields.ts (current shape; the existing UNIQUE index on (categoryId, key) is the line that must be replaced with a partial-unique form)
    - src/db/schema/categories.ts (canonical sibling-translation-table shape, used as the reference for spec-field-groups)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/db/schema/admin.ts — extend with adminInvites` (verbatim adminInvites column shape) and §`src/db/schema/spec-fields.ts — modify` (verbatim deletedAt + groupId additions and partial-unique index pattern)
    - CLAUDE.md (translation-sibling guardrail; no per-locale columns; never JSONB translation bag)
  </read_first>
  <action>
    Modify `src/db/schema/products.ts` (per CONTEXT D-11, RESOLVED Open Q §1 Option B):
    1. Add `check` to the existing `drizzle-orm/pg-core` import: `import { pgTable, ..., check } from "drizzle-orm/pg-core";`
    2. Add `import { sql } from "drizzle-orm";` if not already imported.
    3. Inside the `product` pgTable column definition (alongside `publishedAt`), add:
       ```typescript
       status: text("status").notNull().default("draft"),
       ```
    4. In the table's third-arg constraints array (or add one if absent), append:
       ```typescript
       check("product_status_check", sql`status IN ('draft','published')`),
       ```
       (Mirror existing constraint style — if the table currently uses `(t) => [...]` / `(t) => ({ ... })` form, follow that pattern; the canonical form is `(t) => [check("product_status_check", sql\`${t.status} IN ('draft','published')\`)]`.)
    5. Do NOT remove `publishedAt`; it remains as the publish timestamp.

    Append `adminInvites` to `src/db/schema/admin.ts` (per D-14):
    ```typescript
    import { pgTable, text, timestamp, boolean, bigserial, jsonb, uuid } from "drizzle-orm/pg-core";
    // ... existing tables unchanged ...
    export const adminInvites = pgTable("admin_invite", {
      id: uuid().primaryKey().defaultRandom(),
      email: text("email").notNull(),
      token: text("token").notNull().unique(),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      usedAt: timestamp("used_at", { withTimezone: true }),
      invitedBy: text("invited_by").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    });
    ```

    Modify `src/db/schema/spec-fields.ts` (per D-07 + D-09 + RESOLVED Open Q §7):
    1. Add `import type { AnyPgColumn } from "drizzle-orm/pg-core"` if absent.
    2. Forward-declare reference to `specFieldGroups`: at top of file add `import { specFieldGroups } from "./spec-field-groups";` (the file is created in Task 1.2; the import resolves once the new module exists in this same plan).
    3. Inside the `specFields` table object (after the existing `filterGroupKey` column), add:
       ```typescript
       deletedAt: timestamp("deleted_at", { withTimezone: true }),
       groupId: uuid("group_id").references((): AnyPgColumn => specFieldGroups.id),
       ```
    4. Locate the existing `uniqueIndex(...).on(t.categoryId, t.key)` definition (around line 53) and REPLACE the whole entry with a partial-unique form:
       ```typescript
       uniqueIndex("spec_field_category_key_idx")
         .on(t.categoryId, t.key)
         .where(sql`${t.deletedAt} IS NULL`),
       ```
       Add `import { sql } from "drizzle-orm";` if not already imported.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE 'status.*text.*notNull.*default.*draft' src/db/schema/products.ts` returns `>=1`
    - `grep -c 'product_status_check' src/db/schema/products.ts` returns `1`
    - `grep -c "status IN ('draft','published')" src/db/schema/products.ts` returns `1`
    - `grep -c 'export const adminInvites = pgTable("admin_invite"' src/db/schema/admin.ts` returns `1`
    - `grep -c 'token: text("token").notNull().unique()' src/db/schema/admin.ts` returns `1`
    - `grep -c 'deletedAt: timestamp("deleted_at"' src/db/schema/spec-fields.ts` returns `1`
    - `grep -c 'groupId: uuid("group_id").references' src/db/schema/spec-fields.ts` returns `1`
    - `grep -c 'spec_field_category_key_idx' src/db/schema/spec-fields.ts` returns `1`
    - `grep -cE 'deleted_at.*IS NULL' src/db/schema/spec-fields.ts` returns `>=1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>product.status column declared with CHECK; adminInvites table declared; spec_field has deletedAt + groupId columns and a partial-unique index; typecheck passes (assumes spec-field-groups module is added in Task 1.2 before final typecheck).</done>
</task>

<task type="auto">
  <name>Task 1.2: Create spec-field-groups, translation-flags, and pgView modules; wire barrel</name>
  <files>src/db/schema/spec-field-groups.ts, src/db/schema/translation-flags.ts, src/db/schema/views/product-translation-completeness.ts, src/db/schema/index.ts</files>
  <read_first>
    - src/db/schema/categories.ts (canonical sibling-translations shape — copy verbatim shape for spec_field_group_translations: PK on (group_id, locale), index on locale, CHECK locale IN ('uz','ru','en'))
    - src/db/schema/products.ts (productTranslations PK shape `(productId, locale)` — needed for the compound FK on translation_field_flags)
    - src/db/schema/index.ts (barrel re-export pattern: one `export * from "./module"` per line)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/db/schema/spec-field-groups.ts (NEW)`, §`src/db/schema/translation-flags.ts (NEW)`, §`src/db/schema/views/product-translation-completeness.ts (NEW)` — verbatim code blocks
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 6 (the SQL inside the pgView).
  </read_first>
  <action>
    Create `src/db/schema/spec-field-groups.ts` (per D-09):
    ```typescript
    import {
      pgTable, uuid, text, integer, timestamp,
      primaryKey, uniqueIndex, index, check,
    } from "drizzle-orm/pg-core";
    import { sql } from "drizzle-orm";
    import { categories } from "./categories";

    export const specFieldGroups = pgTable(
      "spec_field_group",
      {
        id: uuid().primaryKey().defaultRandom(),
        categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
        key: text().notNull(),
        sortOrder: integer("sort_order").notNull().default(0),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
      },
      (t) => [
        uniqueIndex("spec_field_group_category_key_idx")
          .on(t.categoryId, t.key)
          .where(sql`${t.deletedAt} IS NULL`),
      ],
    );

    export const specFieldGroupTranslations = pgTable(
      "spec_field_group_translations",
      {
        groupId: uuid("group_id").notNull().references(() => specFieldGroups.id, { onDelete: "cascade" }),
        locale: text().notNull(),
        label: text().notNull(),
      },
      (t) => [
        primaryKey({ columns: [t.groupId, t.locale] }),
        index("spec_field_group_translations_locale_idx").on(t.locale),
        check(
          "spec_field_group_translations_locale_check",
          sql`${t.locale} IN ('uz','ru','en')`,
        ),
      ],
    );
    ```

    Create `src/db/schema/translation-flags.ts` (per D-05 / RESOLVED Open Q §2 Option A):
    ```typescript
    import { pgTable, uuid, text, boolean, primaryKey, foreignKey } from "drizzle-orm/pg-core";
    import { productTranslations } from "./products";

    export const productTranslationFieldFlags = pgTable(
      "product_translation_field_flags",
      {
        productId: uuid("product_id").notNull(),
        locale: text().notNull(),
        fieldName: text("field_name").notNull(),
        machineTranslated: boolean("machine_translated").notNull().default(false),
      },
      (t) => [
        primaryKey({ columns: [t.productId, t.locale, t.fieldName] }),
        foreignKey({
          columns: [t.productId, t.locale],
          foreignColumns: [productTranslations.productId, productTranslations.locale],
        }).onDelete("cascade"),
      ],
    );
    ```

    Create `src/db/schema/views/product-translation-completeness.ts` (per D-04 / ADMIN-10):
    ```typescript
    import { pgView, text, uuid, integer } from "drizzle-orm/pg-core";
    import { sql } from "drizzle-orm";

    export const productTranslationCompleteness = pgView(
      "product_translation_completeness",
      {
        productId: uuid("product_id").notNull(),
        locale: text("locale").notNull(),
        percent: integer("percent").notNull(),
      },
    ).as(sql`
      WITH base AS (
        SELECT pt.product_id, pt.locale,
               (CASE WHEN coalesce(pt.name,'')        <> '' THEN 1 ELSE 0 END +
                CASE WHEN coalesce(pt.short_desc,'')  <> '' THEN 1 ELSE 0 END +
                CASE WHEN coalesce(pt.long_desc,'')   <> '' THEN 1 ELSE 0 END +
                CASE WHEN coalesce(pt.slug,'')        <> '' THEN 1 ELSE 0 END) AS filled,
               4 AS total
          FROM product_translations pt
      ),
      spec_required AS (
        SELECT psv.product_id, sf.id AS spec_field_id
          FROM product_spec_values psv
          JOIN spec_field sf ON sf.id = psv.spec_field_id
         WHERE sf.is_required = true AND sf.data_type = 'text' AND sf.deleted_at IS NULL
      ),
      spec_required_count AS (
        SELECT product_id, COUNT(*)::int AS cnt FROM spec_required GROUP BY product_id
      ),
      spec_filled AS (
        SELECT psv.product_id, psvt.locale, COUNT(*)::int AS cnt
          FROM product_spec_values psv
          JOIN spec_field sf ON sf.id = psv.spec_field_id
          JOIN product_spec_value_translations psvt ON psvt.value_id = psv.id
         WHERE sf.is_required = true AND sf.data_type = 'text' AND sf.deleted_at IS NULL
           AND coalesce(psvt.text_value,'') <> ''
         GROUP BY psv.product_id, psvt.locale
      )
      SELECT base.product_id,
             base.locale,
             ROUND(
               100.0 * (base.filled + COALESCE(sf.cnt, 0))
                     / NULLIF(base.total + COALESCE(sr.cnt, 0), 0)
             )::int AS percent
        FROM base
        LEFT JOIN spec_required_count sr ON sr.product_id = base.product_id
        LEFT JOIN spec_filled sf
               ON sf.product_id = base.product_id AND sf.locale = base.locale
    `);
    ```
    Confirm column names `name`, `short_desc`, `long_desc`, `slug` match Phase-1 `product_translations` schema (read products.ts to verify; if columns are named differently, adjust the SQL identifiers but keep the four-base-field + required-text-spec-values shape).

    Append to `src/db/schema/index.ts`:
    ```typescript
    export * from "./spec-field-groups";
    export * from "./translation-flags";
    export * from "./views/product-translation-completeness";
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit && pnpm vitest run --reporter=basic 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - File `src/db/schema/spec-field-groups.ts` exists and contains `export const specFieldGroups = pgTable("spec_field_group"`
    - File `src/db/schema/spec-field-groups.ts` contains `export const specFieldGroupTranslations = pgTable("spec_field_group_translations"`
    - File `src/db/schema/translation-flags.ts` exists and contains `export const productTranslationFieldFlags = pgTable("product_translation_field_flags"`
    - File `src/db/schema/views/product-translation-completeness.ts` exists and contains `pgView("product_translation_completeness"`
    - View SQL contains `spec_required` and `spec_filled` CTEs (confirms D-04 verbatim per W10)
    - `grep -c 'export \* from "./spec-field-groups"' src/db/schema/index.ts` returns `1`
    - `grep -c 'export \* from "./translation-flags"' src/db/schema/index.ts` returns `1`
    - `grep -c 'export \* from "./views/product-translation-completeness"' src/db/schema/index.ts` returns `1`
    - `pnpm tsc --noEmit` exits 0
    - All Phase-1 vitest tests still pass (no regression in 42 baseline tests)
  </acceptance_criteria>
  <done>3 new schema modules + view declared; barrel re-exports them; typecheck and full Phase-1 test suite still pass.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1.3: [BLOCKING] drizzle-kit generate, edit migration to add status backfill, review, and migrate against Neon dev</name>
  <what-built>
    Migration file authored by drizzle-kit reflecting the schema changes from Tasks 1.1 + 1.2: ADD COLUMN product.status (with default + CHECK), ADD COLUMN spec_field.deleted_at, ADD COLUMN spec_field.group_id, CREATE TABLE admin_invite, CREATE TABLE spec_field_group, CREATE TABLE spec_field_group_translations, CREATE TABLE product_translation_field_flags, CREATE VIEW product_translation_completeness, DROP+CREATE partial-unique on spec_field(category_id, key). **Hand-edit step:** add the `UPDATE product SET status = ...` backfill BEFORE applying. Migration applied to Neon dev branch via `pnpm drizzle-kit migrate` against DATABASE_URL_DIRECT.
  </what-built>
  <how-to-verify>
    Claude executes:
    1. `pnpm drizzle-kit generate` — produces a new file under `drizzle/migrations/` (numbered 0001_*.sql). Halts here for human review.
    2. **Hand-edit step (REQUIRED, before review):** Append a backfill statement to the generated SQL file IMMEDIATELY AFTER the `ALTER TABLE "product" ADD COLUMN "status"` line:
       ```sql
       UPDATE "product" SET "status" = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END;
       ```
       This converts pre-existing rows from the legacy `publishedAt`-derived state to the new canonical `status`. Drizzle-kit does not auto-author backfills; this step is explicit and visible in the diff so the reviewer can catch it.
    3. Human reviews the diff: open the edited `.sql`. Expected DDL list (in order):
       - `ALTER TABLE "product" ADD COLUMN "status" text NOT NULL DEFAULT 'draft'`
       - `ALTER TABLE "product" ADD CONSTRAINT "product_status_check" CHECK (status IN ('draft','published'))`
       - `UPDATE "product" SET "status" = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END;` (hand-added)
       - `CREATE TABLE "admin_invite" (...)` with `token TEXT NOT NULL UNIQUE` and `expires_at TIMESTAMPTZ NOT NULL` and `used_at TIMESTAMPTZ`
       - `CREATE TABLE "spec_field_group" (...)` with `category_id UUID NOT NULL REFERENCES "category"(id) ON DELETE CASCADE`
       - `CREATE TABLE "spec_field_group_translations" (...)` with PK `(group_id, locale)` + `CHECK (locale IN ('uz','ru','en'))`
       - `CREATE TABLE "product_translation_field_flags" (...)` with PK `(product_id, locale, field_name)` + compound FK to `product_translations(product_id, locale) ON DELETE CASCADE`
       - `ALTER TABLE "spec_field" ADD COLUMN "deleted_at" TIMESTAMPTZ`
       - `ALTER TABLE "spec_field" ADD COLUMN "group_id" UUID REFERENCES "spec_field_group"(id)`
       - `DROP INDEX` (the old non-partial unique on spec_field(category_id, key)) + `CREATE UNIQUE INDEX "spec_field_category_key_idx" ON "spec_field"("category_id","key") WHERE "deleted_at" IS NULL`
       - `CREATE VIEW "product_translation_completeness" AS WITH base AS (...) ... spec_required AS (...) ... spec_filled AS (...) SELECT ...`
       NOT expected: any `ALTER TABLE "sessions"` (absoluteExpires reused; CONTEXT D-15 amended).
    4. If diff matches: type "approved". Claude then runs `pnpm drizzle-kit migrate` against `DATABASE_URL_DIRECT` (loaded by drizzle.config.ts from .env.local).
    5. Human verifies migration applied:
       - `psql "$DATABASE_URL_DIRECT" -c "\dt admin_invite spec_field_group spec_field_group_translations product_translation_field_flags"` returns 4 rows
       - `psql "$DATABASE_URL_DIRECT" -c "\d product"` shows `status` column with default `'draft'` and CHECK constraint
       - `psql "$DATABASE_URL_DIRECT" -c "SELECT DISTINCT status FROM product"` returns subset of `{draft, published}` (backfill confirmed)
       - `psql "$DATABASE_URL_DIRECT" -c "\d spec_field"` shows `deleted_at` and `group_id` columns
       - `psql "$DATABASE_URL_DIRECT" -c "SELECT * FROM product_translation_completeness LIMIT 1;"` returns 0 rows but no error
       - `psql "$DATABASE_URL_DIRECT" -c "SELECT version_num FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 2;"` shows the new migration row.
    6. If anything mismatches → type "rollback" → revert by `psql -f` of an explicit DROP/ALTER undo (Claude prepares the script in the same checkpoint).
  </how-to-verify>
  <resume-signal>Type "approved" once migration is applied and verified, "rollback" with details on mismatch, or "fix &lt;description&gt;" for diffs that need re-generation.</resume-signal>
  <acceptance_criteria>
    - `drizzle/migrations/<NNNN>_*.sql` file exists with DDL listed above
    - `grep -cE 'ALTER TABLE.*product.*ADD COLUMN.*status' drizzle/migrations/*.sql` returns `>=1`
    - `grep -cE 'UPDATE.*product.*SET.*status.*CASE WHEN published_at' drizzle/migrations/*.sql` returns `>=1` (backfill present)
    - `psql "$DATABASE_URL_DIRECT" -c "SELECT to_regclass('admin_invite')"` returns `admin_invite` (not NULL)
    - `psql "$DATABASE_URL_DIRECT" -c "SELECT to_regclass('spec_field_group')"` returns `spec_field_group`
    - `psql "$DATABASE_URL_DIRECT" -c "SELECT to_regclass('product_translation_field_flags')"` returns `product_translation_field_flags`
    - `psql "$DATABASE_URL_DIRECT" -c "SELECT column_name FROM information_schema.columns WHERE table_name='spec_field' AND column_name IN ('deleted_at','group_id')"` returns 2 rows
    - `psql "$DATABASE_URL_DIRECT" -c "SELECT column_name FROM information_schema.columns WHERE table_name='product' AND column_name='status'"` returns 1 row
    - `psql "$DATABASE_URL_DIRECT" -c "SELECT relkind FROM pg_class WHERE relname='product_translation_completeness'"` returns `v` (view)
    - Phase-1 test suite still passes against the migrated DB (run `pnpm test` after migration; 42 prior tests must remain green).
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| migration runner → Neon dev | `pnpm drizzle-kit migrate` runs over DATABASE_URL_DIRECT (Vercel build hook + dev). Untrusted input is the SQL planner's own diff; mitigation = human review before apply. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01-01 | Tampering | drizzle-kit generated SQL + hand-added backfill | mitigate | [BLOCKING] human checkpoint reviews the SQL (incl. backfill UPDATE) before `pnpm drizzle-kit migrate` runs (CLAUDE.md guardrail; never `db:push` against prod) |
| T-02-01-02 | Tampering | spec_field UNIQUE evolution | mitigate | Partial unique `WHERE deleted_at IS NULL` (RESOLVED Open Q §7) preserves data integrity through soft-delete and re-creation |
| T-02-01-03 | Information Disclosure | admin_invite.token | mitigate | `token TEXT NOT NULL UNIQUE` + 48h `expires_at` + `used_at` for single-use; consume contract enforced atomically in plan 02-07 |
| T-02-01-04 | Repudiation | audit_log evolution | accept | No audit_log table change in this migration; Phase-1 shape (jsonb before/after, actor_email) is sufficient |
| T-02-01-05 | DoS | translation_field_flags FK cascade | accept | ON DELETE CASCADE on compound FK to product_translations is the desired behavior; deletes scale with product count (small) |
| T-02-01-06 | Tampering | product.status drift between code and DB | mitigate | CHECK constraint at DB layer enforces enum; backfill ensures pre-existing rows have a valid value; Zod schema in plan 02-13a mirrors the enum |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm test` exits 0 (Phase 1 baseline, 42 tests)
- DDL applied verbatim per acceptance criteria above (incl. status column + backfill)
</verification>

<success_criteria>
1. All 6 schema modules type-check and re-export cleanly through `src/db/schema/index.ts`.
2. The single migration file under `drizzle/migrations/` includes the DDL list in Task 1.3 acceptance, with the hand-added backfill UPDATE for `product.status`.
3. Live Neon dev branch reflects the migration (`SELECT to_regclass(...)` returns non-NULL for the 4 new tables and the view; `product.status` column exists with valid backfilled values).
4. Phase-1 test suite remains green.
</success_criteria>

<output>
After completion, create `.planning/phases/02-admin-panel/02-01-SUMMARY.md` documenting:
- Final migration filename and DDL summary (incl. backfill UPDATE)
- Confirmation of Open Q resolutions (§1 Option B, §2 Option A, §7 partial unique)
- Phase-1 D-15 amendment: `sessions.absoluteExpires` reused (no schema change to `sessions`); CONTEXT.md D-15 step 3 updated 2026-04-27
- Any deviations/blockers encountered.
</output>
