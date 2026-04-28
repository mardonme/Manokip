// Live-DB Nyquist test for FOUND-02 (plan 01-03 Task 03.3):
// product_spec_values uses the typed long-table shape (num_value NUMERIC,
// text_value TEXT, bool_value BOOLEAN, enum_value TEXT + unit). A range
// query on num_value must return rows whose numeric value falls in range —
// the whole point of Pattern 4 over a JSONB bag is that range facets hit
// indexed numeric columns, not LIKE-searches on strings.
//
// Also asserts psv_extra_key_check: is_extra=true WITHOUT extra_key fails.
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

describe('FOUND-02: product_spec_values typed insert + range query', () => {
  // 15s timeouts: cold-Neon HTTP first-query exceeds vitest's 5s default
  // (DEF-2-01 — see .planning/phases/02-admin-panel/deferred-items.md).
  it('inserts num_value=42.5 and range query returns the row', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Provision category → spec_field (number/bar/range) → product.
    const catRes = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (catRes.rows as Array<{ id: string }>)[0]!.id;

    const specRes = await db.execute(sql`
      INSERT INTO spec_field (category_id, key, data_type, unit, filter_kind)
      VALUES (${catId}::uuid, ${'pressure_max_' + Date.now()}, 'number', 'bar', 'range')
      RETURNING id
    `);
    const specId = (specRes.rows as Array<{ id: string }>)[0]!.id;

    const prodRes = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prodRes.rows as Array<{ id: string }>)[0]!.id;

    // Typed num_value insert — NOT an opaque value TEXT column.
    await db.execute(sql`
      INSERT INTO product_spec_values (product_id, spec_field_id, num_value, unit)
      VALUES (${prodId}::uuid, ${specId}::uuid, 42.5, 'bar')
    `);

    // Range query: pressure between 40 and 50 inclusive. The psv_field_num_idx
    // index on (spec_field_id, num_value) is what makes this fast at scale.
    const result = await db.execute(sql`
      SELECT id, num_value::text AS num_value, unit::text AS unit
      FROM product_spec_values
      WHERE spec_field_id = ${specId}::uuid
        AND num_value >= 40 AND num_value <= 50
    `);
    const rows = result.rows as Array<{
      id: string;
      num_value: string;
      unit: string;
    }>;
    expect(rows.length).toBe(1);
    expect(parseFloat(rows[0]!.num_value)).toBe(42.5);
    expect(rows[0]!.unit).toBe('bar');

    // Cleanup — order matters: values first (FK → product), then spec_field,
    // product, category (spec_field's FK to category is ON DELETE no action).
    await db.execute(
      sql`DELETE FROM product_spec_values WHERE product_id = ${prodId}::uuid`,
    );
    await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
    await db.execute(sql`DELETE FROM spec_field WHERE id = ${specId}::uuid`);
    await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
  }, 15_000);

  it('is_extra=true WITHOUT extra_key violates psv_extra_key_check', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const catRes = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (catRes.rows as Array<{ id: string }>)[0]!.id;
    const prodRes = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prodRes.rows as Array<{ id: string }>)[0]!.id;

    // is_extra=true + extra_key=NULL must fail with SQLSTATE 23514 (CHECK violation)
    let caught: unknown;
    try {
      await db.execute(sql`
        INSERT INTO product_spec_values (product_id, is_extra, extra_key, text_value)
        VALUES (${prodId}::uuid, true, NULL, 'Special note')
      `);
    } catch (err) {
      caught = err;
    }
    expect(caught, 'is_extra=true without extra_key should throw').toBeDefined();
    const outer = caught as Error & { cause?: Error & { constraint?: string; code?: string } };
    const combined = [
      outer.message ?? '',
      outer.cause?.message ?? '',
      outer.cause?.constraint ?? '',
    ].join(' | ');
    expect(combined).toMatch(/psv_extra_key_check|check constraint/i);
    expect(outer.cause?.code).toBe('23514');

    // Cleanup
    await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
    await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
  }, 15_000);
});
