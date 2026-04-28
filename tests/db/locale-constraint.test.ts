// Live-DB Nyquist test for FOUND-01 (plan 01-03 Task 03.3):
// The `product_translations_locale_check` CHECK constraint must reject
// any INSERT with locale NOT IN ('uz','ru','en') at the database layer,
// not just in application code. A rogue deploy or a careless Server Action
// that bypasses the typed Drizzle schema must still be blocked.
//
// Each test provisions its own category + product, asserts the constraint,
// and cleans up after itself (CASCADE from product deletes any orphans).
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

describe("FOUND-01: product_translations CHECK rejects invalid locale", () => {
  // 15s timeouts: cold-Neon HTTP first-query exceeds vitest's 5s default
  // (DEF-2-01 — see .planning/phases/02-admin-panel/deferred-items.md).
  it("rejects locale='de' with CHECK violation", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Provision a category + product to reference. product.category_id is
    // NOT NULL; we must insert a category first. Each test uses fresh UUIDs
    // so parallel test runs don't collide.
    const catRes = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (catRes.rows as Array<{ id: string }>)[0]!.id;

    const prodRes = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prodRes.rows as Array<{ id: string }>)[0]!.id;

    // The assertion: product_translations with locale='de' must be rejected.
    // drizzle-orm/neon-http wraps the underlying Postgres error as `.cause`
    // (a NeonDbError with { code:'23514', constraint:'product_translations_locale_check' }).
    // We assert against the whole chain: outer message AND cause message, so the
    // regex /product_translations_locale_check|check constraint/i matches either.
    let caught: unknown;
    try {
      await db.execute(sql`
        INSERT INTO product_translations (product_id, locale, name, slug)
        VALUES (${prodId}::uuid, 'de', 'Test', ${'test-' + Date.now()})
      `);
    } catch (err) {
      caught = err;
    }
    expect(caught, 'INSERT with locale=de should have thrown').toBeDefined();
    const outer = caught as Error & { cause?: Error & { constraint?: string; code?: string } };
    const combined = [
      outer.message ?? '',
      outer.cause?.message ?? '',
      outer.cause?.constraint ?? '',
    ].join(' | ');
    expect(combined).toMatch(
      /product_translations_locale_check|check constraint/i,
    );
    expect(outer.cause?.code, 'Postgres SQLSTATE 23514 = CHECK violation').toBe(
      '23514',
    );

    // Cleanup — ON DELETE CASCADE from product removes any stray translation rows.
    await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
    await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
  }, 15_000);

  it('accepts locale=uz + ru + en', async () => {
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

    const ts = Date.now();
    for (const locale of ['uz', 'ru', 'en'] as const) {
      await db.execute(sql`
        INSERT INTO product_translations (product_id, locale, name, slug)
        VALUES (${prodId}::uuid, ${locale}, ${'Test ' + locale}, ${locale + '-test-' + ts})
      `);
    }

    // Verify all three rows landed.
    const rows = await db.execute(sql`
      SELECT locale::text AS locale FROM product_translations WHERE product_id = ${prodId}::uuid
    `);
    const locales = (rows.rows as Array<{ locale: string }>)
      .map((r) => r.locale)
      .sort();
    expect(locales).toEqual(['en', 'ru', 'uz']);

    // Cleanup.
    await db.execute(
      sql`DELETE FROM product_translations WHERE product_id = ${prodId}::uuid`,
    );
    await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);
    await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
  }, 15_000);
});
