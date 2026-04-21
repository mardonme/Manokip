// Live-DB Nyquist smoke test for plan 01-03: after drizzle-kit migrate runs
// against the Neon test/dev branch, every expected Phase 1 table must exist
// in the public schema, and the spec_data_type enum must have exactly the
// four D-16 values (no 'range').
//
// Runs against DATABASE_URL (pooled) via the HTTP client — the query is a
// plain SELECT against pg_tables / pg_enum, no DDL, so pooled is fine.
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

const EXPECTED_TABLES = [
  'auth_users',
  'auth_accounts',
  'sessions',
  'verification_tokens',
  'admin_user',
  'audit_log',
  'category',
  'category_translations',
  'manufacturer',
  'manufacturer_translations',
  'product',
  'product_translations',
  'spec_field',
  'spec_field_translations',
  'spec_field_enum_option',
  'spec_field_enum_option_translations',
  'product_spec_values',
  'product_spec_value_translations',
  'product_search',
  'recipe',
  'recipe_translations',
  'industry',
  'industry_translations',
  'contact_submission',
] as const;

describe('schema-push smoke: all Phase 1 tables exist in live DB', () => {
  it('pg_tables returns every expected table', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const result = await db.execute(sql`
      SELECT tablename::text AS t
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    const actual = new Set(
      (result.rows as Array<{ t: string }>).map((r) => r.t),
    );
    const missing = EXPECTED_TABLES.filter((t) => !actual.has(t));
    expect(missing, `missing tables: ${missing.join(', ')}`).toEqual([]);
  });

  it('spec_data_type enum contains exactly [number, text, enum, bool] (no range)', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const result = await db.execute(sql`
      SELECT enumlabel::text AS label
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'spec_data_type'
      ORDER BY e.enumsortorder
    `);
    const labels = (result.rows as Array<{ label: string }>).map(
      (r) => r.label,
    );
    expect(labels.sort()).toEqual(['bool', 'enum', 'number', 'text']);
  });
});
