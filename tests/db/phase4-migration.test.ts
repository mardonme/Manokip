// Phase 4 plan 04-01 Task 1.4: 7 live-Neon specs locking the migration contract.
//
// Each spec exercises one invariant from the migration:
//   1. recipe.status backfill correctness (CASE WHEN published_at ...)
//   2. industry.status backfill correctness
//   3. recipe_status_check CHECK rejects bad values
//   4. industry_status_check CHECK rejects bad values
//   5. product_recipes FK cascade — DELETE FROM product drops junction rows
//   6. product_industries FK cascade — same
//   7. pgView union-and-filter — published rows visible, drafts absent
//
// Cleanup uses afterEach reverse-order DELETE statements (mirrors
// translation-completeness-view.test.ts posture). 15s per-test timeout for
// the cold-Neon HTTP first-query pattern (DEF-2-01).
import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

/**
 * Drizzle's neon-http wraps the underlying PG error. The constraint name lives
 * on err.cause (NeonDbError) — exposed as .constraint, .constraint_name, or
 * embedded in .detail/.message. We collect every string field across the
 * wrapper + cause so the assertion is robust to driver-version differences.
 */
function errMessage(err: unknown): string {
  const parts: string[] = [];
  const visit = (e: unknown) => {
    if (e == null) return;
    if (typeof e === 'string') {
      parts.push(e);
      return;
    }
    if (typeof e !== 'object') return;
    const rec = e as Record<string, unknown>;
    for (const k of [
      'message',
      'detail',
      'hint',
      'where',
      'constraint',
      'constraint_name',
    ]) {
      const v = rec[k];
      if (typeof v === 'string') parts.push(v);
    }
    if ('cause' in rec) visit(rec.cause);
  };
  visit(err);
  return parts.join(' | ');
}

describe('Phase 4 plan 04-01 — schema migration contract', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const fn = cleanups.pop();
      if (fn) {
        try {
          await fn();
        } catch {
          // best-effort cleanup; do not mask passing tests with teardown errors
        }
      }
    }
  });

  it('recipe.status backfill: published_at NULL ⇒ status="draft"; non-NULL ⇒ "published"', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Insert 2 recipe rows: one with published_at, one without. The migration's
    // backfill UPDATE has already run; new INSERTs use the column DEFAULT 'draft'.
    // To exercise the backfill formula directly we re-run it on these rows
    // (idempotent — same CASE expression).
    const r1 = await db.execute(sql`
      INSERT INTO recipe (published_at) VALUES (now()) RETURNING id
    `);
    const r1Id = (r1.rows as Array<{ id: string }>)[0]!.id;

    const r2 = await db.execute(sql`
      INSERT INTO recipe (published_at) VALUES (NULL) RETURNING id
    `);
    const r2Id = (r2.rows as Array<{ id: string }>)[0]!.id;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM recipe WHERE id IN (${sql.raw(`'${r1Id}'::uuid, '${r2Id}'::uuid`)})`);
    });

    // Apply the migration's backfill formula — should set r1='published',
    // r2='draft' (the column DEFAULT 'draft' would have given r1='draft' too,
    // so the backfill is the only thing that lifts r1 to 'published').
    await db.execute(sql`
      UPDATE recipe
         SET status = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END
       WHERE id IN (${sql.raw(`'${r1Id}'::uuid, '${r2Id}'::uuid`)})
    `);

    const result = await db.execute(sql`
      SELECT id::text AS id, status FROM recipe
       WHERE id IN (${sql.raw(`'${r1Id}'::uuid, '${r2Id}'::uuid`)})
       ORDER BY published_at NULLS LAST
    `);
    const rows = result.rows as Array<{ id: string; status: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === r1Id)?.status).toBe('published');
    expect(rows.find((r) => r.id === r2Id)?.status).toBe('draft');
  }, 15_000);

  it('industry.status backfill: published_at NULL ⇒ "draft"; non-NULL ⇒ "published"', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const i1 = await db.execute(sql`
      INSERT INTO industry (published_at) VALUES (now()) RETURNING id
    `);
    const i1Id = (i1.rows as Array<{ id: string }>)[0]!.id;

    const i2 = await db.execute(sql`
      INSERT INTO industry (published_at) VALUES (NULL) RETURNING id
    `);
    const i2Id = (i2.rows as Array<{ id: string }>)[0]!.id;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM industry WHERE id IN (${sql.raw(`'${i1Id}'::uuid, '${i2Id}'::uuid`)})`);
    });

    await db.execute(sql`
      UPDATE industry
         SET status = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END
       WHERE id IN (${sql.raw(`'${i1Id}'::uuid, '${i2Id}'::uuid`)})
    `);

    const result = await db.execute(sql`
      SELECT id::text AS id, status FROM industry
       WHERE id IN (${sql.raw(`'${i1Id}'::uuid, '${i2Id}'::uuid`)})
    `);
    const rows = result.rows as Array<{ id: string; status: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === i1Id)?.status).toBe('published');
    expect(rows.find((r) => r.id === i2Id)?.status).toBe('draft');
  }, 15_000);

  it('recipe_status_check rejects values outside {draft, published}', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const r = await db.execute(sql`
      INSERT INTO recipe DEFAULT VALUES RETURNING id
    `);
    const rId = (r.rows as Array<{ id: string }>)[0]!.id;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM recipe WHERE id = ${rId}::uuid`);
    });

    // Postgres surfaces CHECK violations as error code 23514. Drizzle rethrows
    // with the message containing "recipe_status_check".
    let caught: unknown = null;
    try {
      await db.execute(sql`UPDATE recipe SET status = 'archived' WHERE id = ${rId}::uuid`);
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toBeNull();
    // Drizzle's neon-http driver wraps the underlying PG error. The constraint
    // name lives on err.cause (NeonDbError) under .constraint. We check both
    // the wrapped + cause messages so the test is robust to driver upgrades.
    const msg = errMessage(caught);
    expect(msg.toLowerCase()).toContain('recipe_status_check');
  }, 15_000);

  it('industry_status_check rejects values outside {draft, published}', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const i = await db.execute(sql`
      INSERT INTO industry DEFAULT VALUES RETURNING id
    `);
    const iId = (i.rows as Array<{ id: string }>)[0]!.id;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM industry WHERE id = ${iId}::uuid`);
    });

    let caught: unknown = null;
    try {
      await db.execute(sql`UPDATE industry SET status = 'archived' WHERE id = ${iId}::uuid`);
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toBeNull();
    const msg = errMessage(caught);
    expect(msg.toLowerCase()).toContain('industry_status_check');
  }, 15_000);

  it('product_recipes FK cascade: DELETE FROM product drops the junction row', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const cat = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (cat.rows as Array<{ id: string }>)[0]!.id;

    const prod = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prod.rows as Array<{ id: string }>)[0]!.id;

    const rec = await db.execute(sql`
      INSERT INTO recipe DEFAULT VALUES RETURNING id
    `);
    const recId = (rec.rows as Array<{ id: string }>)[0]!.id;

    await db.execute(sql`
      INSERT INTO product_recipes (product_id, recipe_id)
      VALUES (${prodId}::uuid, ${recId}::uuid)
    `);

    // Cleanup: recipe + category remain after the cascading product DELETE.
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM recipe WHERE id = ${recId}::uuid`);
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    // Junction row is present.
    const before = await db.execute(sql`
      SELECT 1 AS one FROM product_recipes
       WHERE product_id = ${prodId}::uuid AND recipe_id = ${recId}::uuid
    `);
    expect((before.rows as unknown[]).length).toBe(1);

    // DELETE the product → FK cascade should drop the junction row.
    await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);

    const after = await db.execute(sql`
      SELECT 1 AS one FROM product_recipes
       WHERE product_id = ${prodId}::uuid AND recipe_id = ${recId}::uuid
    `);
    expect((after.rows as unknown[]).length).toBe(0);
  }, 15_000);

  it('product_industries FK cascade: DELETE FROM product drops the junction row', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const cat = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (cat.rows as Array<{ id: string }>)[0]!.id;

    const prod = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prod.rows as Array<{ id: string }>)[0]!.id;

    const ind = await db.execute(sql`
      INSERT INTO industry DEFAULT VALUES RETURNING id
    `);
    const indId = (ind.rows as Array<{ id: string }>)[0]!.id;

    await db.execute(sql`
      INSERT INTO product_industries (product_id, industry_id)
      VALUES (${prodId}::uuid, ${indId}::uuid)
    `);

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM industry WHERE id = ${indId}::uuid`);
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    const before = await db.execute(sql`
      SELECT 1 AS one FROM product_industries
       WHERE product_id = ${prodId}::uuid AND industry_id = ${indId}::uuid
    `);
    expect((before.rows as unknown[]).length).toBe(1);

    await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`);

    const after = await db.execute(sql`
      SELECT 1 AS one FROM product_industries
       WHERE product_id = ${prodId}::uuid AND industry_id = ${indId}::uuid
    `);
    expect((after.rows as unknown[]).length).toBe(0);
  }, 15_000);

  it('product_used_in_v: only published recipes + industries appear (drafts filtered out)', async () => {
    // Marquee end-to-end probe — ties together status column + junctions + pgView.
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const cat = await db.execute(sql`
      INSERT INTO category (id) VALUES (gen_random_uuid()) RETURNING id
    `);
    const catId = (cat.rows as Array<{ id: string }>)[0]!.id;

    const prod = await db.execute(sql`
      INSERT INTO product (category_id) VALUES (${catId}::uuid) RETURNING id
    `);
    const prodId = (prod.rows as Array<{ id: string }>)[0]!.id;

    // 2 published recipes + 1 draft recipe
    const rPub1 = await db.execute(sql`
      INSERT INTO recipe (status, published_at) VALUES ('published', now()) RETURNING id
    `);
    const rPub1Id = (rPub1.rows as Array<{ id: string }>)[0]!.id;

    const rPub2 = await db.execute(sql`
      INSERT INTO recipe (status, published_at) VALUES ('published', now()) RETURNING id
    `);
    const rPub2Id = (rPub2.rows as Array<{ id: string }>)[0]!.id;

    const rDraft = await db.execute(sql`
      INSERT INTO recipe (status) VALUES ('draft') RETURNING id
    `);
    const rDraftId = (rDraft.rows as Array<{ id: string }>)[0]!.id;

    // 1 published industry + 1 draft industry
    const iPub = await db.execute(sql`
      INSERT INTO industry (status, published_at) VALUES ('published', now()) RETURNING id
    `);
    const iPubId = (iPub.rows as Array<{ id: string }>)[0]!.id;

    const iDraft = await db.execute(sql`
      INSERT INTO industry (status) VALUES ('draft') RETURNING id
    `);
    const iDraftId = (iDraft.rows as Array<{ id: string }>)[0]!.id;

    // Translations (the view JOINs against *_translations rows, so each
    // recipe/industry needs at least one locale row to surface in the view).
    const stamp = Date.now();
    await db.execute(sql`
      INSERT INTO recipe_translations (recipe_id, locale, title, slug)
      VALUES
        (${rPub1Id}::uuid, 'uz', 'Pub1', ${'pub1-' + stamp}),
        (${rPub2Id}::uuid, 'uz', 'Pub2', ${'pub2-' + stamp}),
        (${rDraftId}::uuid, 'uz', 'Draft', ${'draft-' + stamp})
    `);
    await db.execute(sql`
      INSERT INTO industry_translations (industry_id, locale, title, slug)
      VALUES
        (${iPubId}::uuid, 'uz', 'IndPub', ${'ind-pub-' + stamp}),
        (${iDraftId}::uuid, 'uz', 'IndDraft', ${'ind-draft-' + stamp})
    `);

    // Junction rows linking each piece of content to the product.
    await db.execute(sql`
      INSERT INTO product_recipes (product_id, recipe_id) VALUES
        (${prodId}::uuid, ${rPub1Id}::uuid),
        (${prodId}::uuid, ${rPub2Id}::uuid),
        (${prodId}::uuid, ${rDraftId}::uuid)
    `);
    await db.execute(sql`
      INSERT INTO product_industries (product_id, industry_id) VALUES
        (${prodId}::uuid, ${iPubId}::uuid),
        (${prodId}::uuid, ${iDraftId}::uuid)
    `);

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM product WHERE id = ${prodId}::uuid`); // cascades junction rows
      await db.execute(sql`DELETE FROM recipe WHERE id IN (${sql.raw(`'${rPub1Id}'::uuid, '${rPub2Id}'::uuid, '${rDraftId}'::uuid`)})`);
      await db.execute(sql`DELETE FROM industry WHERE id IN (${sql.raw(`'${iPubId}'::uuid, '${iDraftId}'::uuid`)})`);
      await db.execute(sql`DELETE FROM category WHERE id = ${catId}::uuid`);
    });

    const result = await db.execute(sql`
      SELECT content_type, content_id::text AS content_id
        FROM product_used_in_v
       WHERE product_id = ${prodId}::uuid
       ORDER BY content_type, title
    `);
    const rows = result.rows as Array<{ content_type: string; content_id: string }>;

    // Expect exactly 3 rows: 2 published recipes + 1 published industry.
    // The draft recipe + draft industry MUST be filtered out by the view.
    expect(rows).toHaveLength(3);
    const contentIds = rows.map((r) => r.content_id);
    expect(contentIds).toContain(rPub1Id);
    expect(contentIds).toContain(rPub2Id);
    expect(contentIds).toContain(iPubId);
    expect(contentIds).not.toContain(rDraftId);
    expect(contentIds).not.toContain(iDraftId);

    const recipeRows = rows.filter((r) => r.content_type === 'recipe');
    const industryRows = rows.filter((r) => r.content_type === 'industry');
    expect(recipeRows).toHaveLength(2);
    expect(industryRows).toHaveLength(1);
  }, 15_000);
});
