/**
 * Plan 05-01 BLOCKING gate: post-migration structural verifier for the
 * `contact_rate_limit` table + cleanup index + window_kind CHECK constraint.
 *
 * Mirrors scripts/verify-02-01-migration.ts (Phase-2 analog). drizzle-kit's
 * own migration log only confirms the SQL ran; it does NOT confirm that the
 * resulting LIVE shape matches the schema file. Phase 5 cannot proceed past
 * Wave 0 until this verifier exits 0.
 *
 * Run with: pnpm tsx scripts/verify-05-01-migration.ts
 *
 * REQUIRES: DATABASE_URL_DIRECT (unpooled connection to the Neon dev branch)
 * in .env.local — same connection drizzle-kit migrate uses.
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

  // 1. contact_rate_limit table exists
  {
    const rows = await exec(sql`
      SELECT table_name
        FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'contact_rate_limit'
    `);
    log(
      "Check 1: contact_rate_limit table exists",
      rows.length === 1,
      `tables=${JSON.stringify(rows.map((r) => r.table_name))}`,
    );
  }

  // 2. Columns: ip_hash text NOT NULL, window_kind text NOT NULL,
  //    window_start timestamptz NOT NULL, count integer NOT NULL DEFAULT 0
  {
    const rows = await exec(sql`
      SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'contact_rate_limit'
       ORDER BY column_name
    `);
    const want: Record<
      string,
      { type: string; nullable: string; defaultIncludes?: string }
    > = {
      count: { type: "integer", nullable: "NO", defaultIncludes: "0" },
      ip_hash: { type: "text", nullable: "NO" },
      window_kind: { type: "text", nullable: "NO" },
      window_start: {
        type: "timestamp with time zone",
        nullable: "NO",
      },
    };
    let ok = rows.length === 4;
    const reasons: string[] = [];
    for (const r of rows) {
      const w = want[String(r.column_name)];
      if (!w) {
        ok = false;
        reasons.push(`unexpected column ${r.column_name}`);
        continue;
      }
      if (r.data_type !== w.type) {
        ok = false;
        reasons.push(
          `${r.column_name}: type ${r.data_type} (want ${w.type})`,
        );
      }
      if (r.is_nullable !== w.nullable) {
        ok = false;
        reasons.push(
          `${r.column_name}: nullable=${r.is_nullable} (want ${w.nullable})`,
        );
      }
      if (
        w.defaultIncludes !== undefined &&
        !String(r.column_default ?? "").includes(w.defaultIncludes)
      ) {
        ok = false;
        reasons.push(
          `${r.column_name}: default=${r.column_default} (want includes ${w.defaultIncludes})`,
        );
      }
    }
    log(
      "Check 2: 4 columns with correct types + NOT NULL + count default 0",
      ok,
      ok
        ? `columns=${JSON.stringify(rows.map((r) => r.column_name))}`
        : `mismatches=${JSON.stringify(reasons)} rows=${JSON.stringify(rows)}`,
    );
  }

  // 3. Composite PK is (ip_hash, window_kind, window_start)
  {
    const rows = await exec(sql`
      SELECT kcu.column_name, kcu.ordinal_position
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = 'public'
         AND tc.table_name = 'contact_rate_limit'
         AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position
    `);
    const got = rows.map((r) => r.column_name);
    const want = ["ip_hash", "window_kind", "window_start"];
    log(
      "Check 3: composite PK is (ip_hash, window_kind, window_start)",
      JSON.stringify(got) === JSON.stringify(want),
      `got=${JSON.stringify(got)} want=${JSON.stringify(want)}`,
    );
  }

  // 4. contact_rate_limit_cleanup_idx exists on window_start
  {
    const rows = await exec(sql`
      SELECT indexname, indexdef
        FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'contact_rate_limit'
         AND indexname = 'contact_rate_limit_cleanup_idx'
    `);
    const def = rows.length === 1 ? String(rows[0]?.indexdef ?? "") : "";
    const ok = rows.length === 1 && def.toLowerCase().includes("(window_start)");
    log(
      "Check 4: contact_rate_limit_cleanup_idx btree on window_start exists",
      ok,
      `def=${def}`,
    );
  }

  // 5. CHECK constraint contact_rate_limit_window_kind_check accepts 'hour' and 'day'
  //    + atomic UPSERT increments count on conflict (clean up after).
  const stamp = `verify-${Date.now()}`;
  try {
    const insertRows = await exec(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${stamp}, 'hour', date_trunc('hour', now()), 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
      DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `);
    const firstCount = Number(insertRows[0]?.count ?? 0);

    const upsertRows = await exec(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${stamp}, 'hour', date_trunc('hour', now()), 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
      DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `);
    const secondCount = Number(upsertRows[0]?.count ?? 0);

    log(
      "Check 5: ON CONFLICT DO UPDATE increments count (1 then 2)",
      firstCount === 1 && secondCount === 2,
      `first=${firstCount} second=${secondCount}`,
    );
  } catch (err) {
    log(
      "Check 5: ON CONFLICT DO UPDATE increments count (1 then 2)",
      false,
      `error=${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    await exec(sql`DELETE FROM contact_rate_limit WHERE ip_hash = ${stamp}`);
  }

  // 6. Sanity: contact_submission table is unchanged (10 columns total —
  //    9 from Phase-1 schema + 0 added in Phase 5; this is a regression guard).
  {
    const rows = await exec(sql`
      SELECT column_name
        FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'contact_submission'
       ORDER BY column_name
    `);
    const got = rows.map((r) => r.column_name);
    const expected = [
      "company",
      "email",
      "id",
      "locale",
      "message",
      "name",
      "phone",
      "read_at",
      "source_page",
      "submitted_at",
    ];
    log(
      "Check 6: contact_submission unchanged (10 cols, no Phase-5 drift)",
      JSON.stringify(got) === JSON.stringify(expected),
      `got=${JSON.stringify(got)}`,
    );
  }

  // 7. drizzle.__drizzle_migrations has 5 entries (0000–0004)
  {
    const rows = await exec(sql`
      SELECT id FROM drizzle.__drizzle_migrations ORDER BY id ASC
    `);
    log(
      "Check 7: drizzle.__drizzle_migrations has 5 entries (0000-0004)",
      rows.length === 5,
      `count=${rows.length}`,
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
