/**
 * One-off verification script for plan 02-01 SCHEMA-MIGRATION.
 * Mirrors the `psql` checks in the plan checkpoint, executed via Drizzle/Neon HTTP
 * because psql is not on the developer's PATH (Git-for-Windows + nvm Node setup).
 *
 * Run with: pnpm tsx scripts/verify-02-01-migration.ts
 *
 * Safe to delete after plan 02-01 completes — kept committed for repeatability if
 * the migration ever needs to be re-verified on a fresh branch.
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
  // neon-http returns { rows: [...] }; some drivers return arrays directly.
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

  // 1. New tables exist (\dt admin_invite spec_field_group spec_field_group_translations product_translation_field_flags)
  {
    const rows = await exec(sql`
      SELECT table_name
        FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN (
           'admin_invite',
           'spec_field_group',
           'spec_field_group_translations',
           'product_translation_field_flags'
         )
       ORDER BY table_name
    `);
    const got = rows.map((r) => r.table_name).sort();
    const want = [
      "admin_invite",
      "product_translation_field_flags",
      "spec_field_group",
      "spec_field_group_translations",
    ];
    log(
      "Check 1: 4 new tables exist",
      JSON.stringify(got) === JSON.stringify(want),
      `tables=${JSON.stringify(got)}`,
    );
  }

  // 2. product.status column with CHECK + default 'draft'
  {
    const cols = await exec(sql`
      SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'product' AND column_name = 'status'
    `);
    const checks = await exec(sql`
      SELECT pg_get_constraintdef(c.oid) AS def, c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'product' AND c.conname = 'product_status_check'
    `);
    const col = cols[0];
    const colOK =
      cols.length === 1 &&
      col != null &&
      col.data_type === "text" &&
      String(col.column_default ?? "").includes("'draft'") &&
      col.is_nullable === "NO";
    const check = checks[0];
    const checkOK =
      checks.length === 1 &&
      check != null &&
      String(check.def).includes("'draft'") &&
      String(check.def).includes("'published'");
    log(
      "Check 2: product.status column + CHECK constraint",
      colOK && checkOK,
      `column=${JSON.stringify(cols)} check=${JSON.stringify(checks)}`,
    );
  }

  // 3. SELECT DISTINCT status FROM product (subset of {draft, published})
  {
    const rows = await exec(sql`SELECT DISTINCT status FROM product`);
    const distinct = rows.map((r) => r.status).sort();
    const ok = distinct.every((s) => s === "draft" || s === "published");
    log(
      "Check 3: product.status backfill — only {draft, published} present",
      ok,
      `distinct=${JSON.stringify(distinct)} (rows=${rows.length})`,
    );
  }

  // 4. spec_field has deleted_at + group_id columns
  {
    const cols = await exec(sql`
      SELECT column_name
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'spec_field'
         AND column_name IN ('deleted_at', 'group_id')
       ORDER BY column_name
    `);
    const got = cols.map((r) => r.column_name);
    log(
      "Check 4: spec_field.deleted_at + spec_field.group_id columns exist",
      got.length === 2 && got.includes("deleted_at") && got.includes("group_id"),
      `columns=${JSON.stringify(got)}`,
    );
  }

  // 5. SELECT * FROM product_translation_completeness LIMIT 1
  {
    let viewError: string | null = null;
    let returnedRows = 0;
    try {
      const rows = await exec(sql`SELECT * FROM product_translation_completeness LIMIT 1`);
      returnedRows = rows.length;
    } catch (err) {
      viewError = err instanceof Error ? err.message : String(err);
    }
    log(
      "Check 5: product_translation_completeness pgView resolves",
      viewError === null,
      viewError === null ? `rows=${returnedRows} (0 rows is expected on a near-empty dev DB)` : `error=${viewError}`,
    );
  }

  // 6. drizzle.__drizzle_migrations latest entries
  {
    const rows = await exec(sql`
      SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 2
    `);
    log(
      "Check 6: drizzle.__drizzle_migrations has 2 entries (0000 phase-1, 0001 phase-2)",
      rows.length === 2,
      `migrations=${JSON.stringify(rows.map((r) => ({ id: r.id, hash: String(r.hash).slice(0, 16) + "...", created_at: r.created_at })))}`,
    );
  }

  // 7. Bonus: confirm partial-unique index on spec_field shape
  {
    const rows = await exec(sql`
      SELECT indexname, indexdef
        FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'spec_field' AND indexname = 'spec_field_category_key_idx'
    `);
    const def = rows.length === 1 && rows[0] != null ? String(rows[0].indexdef) : "";
    const ok = rows.length === 1 && def.toLowerCase().includes("where") && def.toLowerCase().includes("deleted_at is null");
    log(
      "Check 7: spec_field_category_key_idx is partial-unique WHERE deleted_at IS NULL",
      ok,
      `def=${def}`,
    );
  }

  // 8. Bonus: confirm view shape (returns relkind='v')
  {
    const rows = await exec(sql`
      SELECT relkind FROM pg_class WHERE relname = 'product_translation_completeness'
    `);
    log(
      "Check 8: product_translation_completeness is a view (relkind='v')",
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
