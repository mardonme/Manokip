/**
 * Verification script for Phase 4 plan 04-01 SCHEMA-MIGRATION.
 *
 * Asserts the live Neon dev branch matches the contract from
 * drizzle/0003_phase4_content_features.sql:
 *   - recipe.status + industry.status columns (NOT NULL, DEFAULT 'draft')
 *   - recipe_status_check + industry_status_check CHECK constraints
 *   - product_recipes + product_industries tables exist with composite PK
 *   - 2 indices per junction (recipe_idx + product_idx, industry_idx + product_idx)
 *   - 2 FKs per junction with ON DELETE CASCADE
 *   - product_used_in_v pgView is queryable + relkind='v'
 *
 * Run with: pnpm tsx scripts/verify-04-01-migration.ts
 *
 * Mirrors scripts/verify-02-01-migration.ts shape — Drizzle/Neon HTTP
 * db.execute(sql`...`) against information_schema + pg_constraint + pg_indexes.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL_DIRECT;
if (!url) {
  console.error("DATABASE_URL_DIRECT not set");
  process.exit(1);
}

const client = neon(url);
const db = drizzle(client);

type Row = Record<string, unknown>;

async function exec(query: ReturnType<typeof sql>): Promise<Row[]> {
  const result = (await db.execute(query)) as unknown as { rows?: Row[] };
  if (Array.isArray(result)) return result as Row[];
  return result.rows ?? [];
}

async function run() {
  const failures: string[] = [];
  const log = (label: string, ok: boolean, detail: string) => {
    const status = ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${label}`);
    console.log(`        ${detail}`);
    if (!ok) failures.push(label);
  };

  // 1. recipe.status column shape
  {
    const cols = await exec(sql`
      SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'recipe' AND column_name = 'status'
    `);
    const col = cols[0];
    const ok =
      cols.length === 1 &&
      col != null &&
      col.data_type === "text" &&
      String(col.column_default ?? "").includes("'draft'") &&
      col.is_nullable === "NO";
    log(
      "Check 1: recipe.status column (text NOT NULL DEFAULT 'draft')",
      ok,
      `column=${JSON.stringify(cols)}`,
    );
  }

  // 2. recipe_status_check CHECK constraint
  {
    const checks = await exec(sql`
      SELECT pg_get_constraintdef(c.oid) AS def, c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'recipe' AND c.conname = 'recipe_status_check'
    `);
    const check = checks[0];
    const ok =
      checks.length === 1 &&
      check != null &&
      String(check.def).includes("'draft'") &&
      String(check.def).includes("'published'");
    log(
      "Check 2: recipe_status_check CHECK constraint includes 'draft' and 'published'",
      ok,
      `check=${JSON.stringify(checks)}`,
    );
  }

  // 3. industry.status column shape
  {
    const cols = await exec(sql`
      SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'industry' AND column_name = 'status'
    `);
    const col = cols[0];
    const ok =
      cols.length === 1 &&
      col != null &&
      col.data_type === "text" &&
      String(col.column_default ?? "").includes("'draft'") &&
      col.is_nullable === "NO";
    log(
      "Check 3: industry.status column (text NOT NULL DEFAULT 'draft')",
      ok,
      `column=${JSON.stringify(cols)}`,
    );
  }

  // 4. industry_status_check CHECK constraint
  {
    const checks = await exec(sql`
      SELECT pg_get_constraintdef(c.oid) AS def, c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'industry' AND c.conname = 'industry_status_check'
    `);
    const check = checks[0];
    const ok =
      checks.length === 1 &&
      check != null &&
      String(check.def).includes("'draft'") &&
      String(check.def).includes("'published'");
    log(
      "Check 4: industry_status_check CHECK constraint includes 'draft' and 'published'",
      ok,
      `check=${JSON.stringify(checks)}`,
    );
  }

  // 5. backfill correctness — distinct status values are subset of {draft,published}
  {
    const recipeStatuses = await exec(sql`SELECT DISTINCT status FROM recipe`);
    const industryStatuses = await exec(sql`SELECT DISTINCT status FROM industry`);
    const recipeOk = recipeStatuses.every(
      (r) => r.status === "draft" || r.status === "published",
    );
    const industryOk = industryStatuses.every(
      (r) => r.status === "draft" || r.status === "published",
    );
    log(
      "Check 5: status backfill — recipe + industry rows only contain {draft, published}",
      recipeOk && industryOk,
      `recipe_distinct=${JSON.stringify(recipeStatuses.map((r) => r.status))} ` +
        `industry_distinct=${JSON.stringify(industryStatuses.map((r) => r.status))}`,
    );
  }

  // 6. product_recipes + product_industries tables exist with composite PK
  {
    const rows = await exec(sql`
      SELECT table_name
        FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('product_recipes', 'product_industries')
       ORDER BY table_name
    `);
    const got = rows.map((r) => r.table_name).sort();
    log(
      "Check 6: product_recipes + product_industries junction tables exist",
      got.length === 2 &&
        got.includes("product_recipes") &&
        got.includes("product_industries"),
      `tables=${JSON.stringify(got)}`,
    );
  }

  // 7. composite PKs on both junction tables
  {
    const rows = await exec(sql`
      SELECT t.relname AS table_name, c.conname AS pk_name,
             pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
       WHERE c.contype = 'p'
         AND t.relname IN ('product_recipes', 'product_industries')
       ORDER BY t.relname
    `);
    const recipeRow = rows.find((r) => r.table_name === "product_recipes");
    const industryRow = rows.find((r) => r.table_name === "product_industries");
    const recipeOk =
      recipeRow != null &&
      String(recipeRow.def).includes("product_id") &&
      String(recipeRow.def).includes("recipe_id");
    const industryOk =
      industryRow != null &&
      String(industryRow.def).includes("product_id") &&
      String(industryRow.def).includes("industry_id");
    log(
      "Check 7: composite primary keys on both junction tables",
      recipeOk && industryOk,
      `pks=${JSON.stringify(rows)}`,
    );
  }

  // 8. 2 indices on each junction (recipe_idx + product_idx; industry_idx + product_idx)
  {
    const rows = await exec(sql`
      SELECT tablename, indexname
        FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename IN ('product_recipes', 'product_industries')
       ORDER BY tablename, indexname
    `);
    const recipeIdx = rows.filter((r) => r.tablename === "product_recipes")
      .map((r) => r.indexname);
    const industryIdx = rows.filter((r) => r.tablename === "product_industries")
      .map((r) => r.indexname);
    // Each junction has the PK index + 2 supporting indices = 3 indices total.
    const recipeOk =
      recipeIdx.includes("product_recipes_recipe_idx") &&
      recipeIdx.includes("product_recipes_product_idx");
    const industryOk =
      industryIdx.includes("product_industries_industry_idx") &&
      industryIdx.includes("product_industries_product_idx");
    log(
      "Check 8: 2 supporting indices on each junction (recipe_idx + product_idx)",
      recipeOk && industryOk,
      `indices=${JSON.stringify(rows.map((r) => r.indexname))}`,
    );
  }

  // 9. 2 FKs ON DELETE CASCADE per junction
  {
    const rows = await exec(sql`
      SELECT t.relname AS table_name, c.conname AS fk_name,
             pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
       WHERE c.contype = 'f'
         AND t.relname IN ('product_recipes', 'product_industries')
       ORDER BY t.relname, c.conname
    `);
    const recipeFks = rows.filter((r) => r.table_name === "product_recipes");
    const industryFks = rows.filter((r) => r.table_name === "product_industries");
    const recipeOk =
      recipeFks.length === 2 &&
      recipeFks.every((r) => String(r.def).toUpperCase().includes("ON DELETE CASCADE"));
    const industryOk =
      industryFks.length === 2 &&
      industryFks.every((r) => String(r.def).toUpperCase().includes("ON DELETE CASCADE"));
    log(
      "Check 9: 2 FKs ON DELETE CASCADE per junction",
      recipeOk && industryOk,
      `fks=${JSON.stringify(rows.map((r) => ({ t: r.table_name, def: r.def })))}`,
    );
  }

  // 10. product_used_in_v pgView is queryable
  {
    let viewError: string | null = null;
    let returnedRows = 0;
    try {
      const rows = await exec(sql`SELECT 1 FROM product_used_in_v LIMIT 0`);
      returnedRows = rows.length;
    } catch (err) {
      viewError = err instanceof Error ? err.message : String(err);
    }
    log(
      "Check 10: product_used_in_v pgView resolves",
      viewError === null,
      viewError === null
        ? `rows=${returnedRows} (0 rows expected — empty content tier at Phase 4 open)`
        : `error=${viewError}`,
    );
  }

  // 11. product_used_in_v is a view (relkind='v')
  {
    const rows = await exec(sql`
      SELECT relkind FROM pg_class WHERE relname = 'product_used_in_v'
    `);
    log(
      "Check 11: product_used_in_v is a view (relkind='v')",
      rows.length === 1 && rows[0] != null && rows[0].relkind === "v",
      `relkind=${JSON.stringify(rows.map((r) => r.relkind))}`,
    );
  }

  console.log("");
  if (failures.length === 0) {
    console.log("ALL VERIFICATION CHECKS PASSED");
    process.exit(0);
  } else {
    console.log(`FAILED: ${failures.join(", ")}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
