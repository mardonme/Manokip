// Plan 02-13a Task 13a.2 — saveProduct + duplicateProduct integration tests
// against the live Neon test branch.
//
// Locks the seven product-write contracts the editor data tier ships with:
//
//   1. Create — saveProduct (no input.id) writes 1 product row + 3
//      product_translations rows + 1 audit_log(action='create', before_json
//      IS NULL) atomically. status writes verbatim from input. Cache fan-out:
//      revalidateProduct(id) → 4 tags (product:<id>, products-list, sitemap,
//      search-index).
//
//   2. Update — saveProduct with input.id writes audit_log(action='update');
//      before_json carries the old row, after_json carries the new. status
//      unchanged → succeeds (refusal-to-elevate only triggers on transition).
//
//   3. Spec-values replace-on-save — first save with N values inserts N
//      product_spec_values rows. Second save with M (different) values
//      DELETEs the N + INSERTs the M. DB ends with exactly M rows.
//
//   4. mtFlags replace-on-save — first save with mtFlags={uz:{name:true}}
//      writes 1 product_translation_field_flags row. Second save with empty
//      mtFlags writes 0 rows (replace-on-save semantics, T-02-13a-06).
//
//   5. Refusal-to-elevate (W7) — saveProduct on a product persisted with
//      status='draft' and input.status='published' throws inside the action
//      so withAdminAction returns { ok:false }. No audit_log row written;
//      product row unchanged.
//
//   6. Transaction rollback — slug collision on locale 'uz' (uniqueIndex
//      product_translations_locale_slug) inside the upsert loop forces the
//      tx to abort. No audit_log row; the partial product row from the
//      pre-existing seed remains untouched.
//
//   7. Duplicate — duplicateProduct({ sourceId }) clones every base column
//      EXCEPT status (forced to 'draft') and publishedAt (forced to null).
//      Translations cloned with -copy slug suffix per locale; spec values +
//      MT flags cloned 1-for-1. Audit row action='duplicate_product' with
//      before.sourceId + after.id matching the new clone.
//
// Posture: lives in the `node` vitest project (live-Neon HTTP). vi.mock(
// '@/lib/auth') short-circuits the next-auth import chain (canonical pattern
// from plan 02-04). vi.hoisted spy on next/cache for the revalidateTag
// fan-out.

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";
import { seedProduct } from "../_fixtures/seed-products";

// -- Mocks (must be hoisted by Vitest before the @/actions import) ------------

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({
    user: { email: "test-admin@manometr.uz" },
    sessionToken: "stub-token",
  })),
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Map<string, string>()),
}));

const { revalidateTag } = vi.hoisted(() => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({
  revalidateTag,
}));

import { saveProduct, duplicateProduct } from "@/actions/products";

describe("products actions (live Neon)", () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanups: Array<() => Promise<void>> = [];

  /**
   * Build a baseline saveProduct input that the test can mutate. Uses a
   * caller-provided categoryId (from seedProduct) so the FK is valid.
   */
  function buildInput(overrides: {
    id?: string;
    categoryId: string;
    status?: "draft" | "published";
    namePrefix?: string;
    slugPrefix?: string;
  }): Parameters<typeof saveProduct>[0] {
    const namePrefix = overrides.namePrefix ?? `prod-${stamp}`;
    const slugPrefix = overrides.slugPrefix ?? namePrefix;
    return {
      ...(overrides.id ? { id: overrides.id } : {}),
      categoryId: overrides.categoryId,
      manufacturerId: null,
      status: overrides.status ?? "draft",
      translations: {
        uz: {
          name: `${namePrefix} uz`,
          slug: `${slugPrefix}-uz`,
          shortDesc: null,
          longDesc: null,
        },
        ru: {
          name: `${namePrefix} ru`,
          slug: `${slugPrefix}-ru`,
          shortDesc: null,
          longDesc: null,
        },
        en: {
          name: `${namePrefix} en`,
          slug: `${slugPrefix}-en`,
          shortDesc: null,
          longDesc: null,
        },
      },
      specValues: [],
      imagePublicIds: [],
      datasheetPublicIds: [],
      mtFlags: {},
    };
  }

  beforeEach(() => {
    revalidateTag.mockClear();
  });

  afterEach(async () => {
    for (let i = cleanups.length - 1; i >= 0; i--) {
      await cleanups[i]!();
    }
    cleanups.length = 0;
  });

  it("create — writes product row (status='draft') + 3 translations + audit(action='create') atomically", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Seed only a category — saveProduct will create the product itself.
    const seed = await seedProduct({ name: "create-anchor", locales: {} });
    cleanups.push(async () => {
      // The seedProduct() helper inserts a product too; we created our own
      // product via saveProduct, so the seed product is unused but cleanup
      // still drops it. We append our own cleanup for the saveProduct row.
      await seed.cleanup();
    });

    const input = buildInput({
      categoryId: seed.categoryId,
      status: "draft",
      namePrefix: `create-${stamp}`,
    });
    const result = await saveProduct(input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const id = result.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(
        sql`DELETE FROM product_translation_field_flags WHERE product_id = ${id}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM product_spec_values WHERE product_id = ${id}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM product_translations WHERE product_id = ${id}::uuid`,
      );
      await db.execute(sql`DELETE FROM product WHERE id = ${id}::uuid`);
    });

    // 1 product row, status='draft' written verbatim.
    const baseRows = await db.execute(
      sql`SELECT id, category_id, status FROM product WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(1);
    expect((baseRows.rows[0] as { status: string }).status).toBe("draft");

    // 3 translation rows (uz, ru, en).
    const trRows = await db.execute(
      sql`SELECT locale FROM product_translations WHERE product_id = ${id}::uuid`,
    );
    expect(trRows.rows.length).toBe(3);
    const locales = (trRows.rows as Array<{ locale: string }>)
      .map((r) => r.locale)
      .sort();
    expect(locales).toEqual(["en", "ru", "uz"]);

    // Audit row, action='create', before_json IS NULL.
    const auditRows = await db.execute(sql`
      SELECT action, entity_type, entity_id, actor_email, before_json
        FROM audit_log
       WHERE entity_id = ${id}
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows[0]).toMatchObject({
      action: "create",
      entity_type: "product",
      entity_id: id,
      actor_email: "test-admin@manometr.uz",
      before_json: null,
    });

    // revalidateProduct(id) fan-out: 4 tags
    // (product:<id>, products-list, sitemap, search-index).
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`product:${id}`);
    expect(calls).toContain("products-list");
    expect(calls).toContain("sitemap");
    expect(calls).toContain("search-index");
  }, 25_000);

  it("update — audit action='update' with before_json populated; same-status save succeeds", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const seed = await seedProduct({
      name: `upd-${stamp}`,
      locales: { uz: true, ru: true, en: true },
    });
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${seed.productId}`);
      await seed.cleanup();
    });

    // First save (update) — same status, new translation names.
    const input = buildInput({
      id: seed.productId,
      categoryId: seed.categoryId,
      status: "draft",
      namePrefix: `upd-renamed-${stamp}`,
    });
    const result = await saveProduct(input);
    expect(result.ok).toBe(true);

    // Audit row action='update' with before_json containing the old row.
    const auditRows = await db.execute(sql`
      SELECT action, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${seed.productId} AND action = 'update'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    const auditRow = auditRows.rows[0] as {
      action: string;
      before_json: Record<string, unknown> | null;
      after_json: Record<string, unknown> | null;
    };
    expect(auditRow.action).toBe("update");
    // before_json carries the old base row (status='draft' from seed).
    expect(auditRow.before_json).not.toBeNull();
    expect(auditRow.before_json?.["status"]).toBe("draft");
    // after_json carries the row post-update.
    expect(auditRow.after_json).not.toBeNull();
    expect(auditRow.after_json?.["status"]).toBe("draft");

    // Translation names actually changed.
    const trRows = await db.execute(sql`
      SELECT locale, name FROM product_translations
       WHERE product_id = ${seed.productId}::uuid AND locale = 'uz'
    `);
    expect((trRows.rows[0] as { name: string }).name).toBe(`upd-renamed-${stamp} uz`);
  }, 25_000);

  it("spec-values replace-on-save — 2nd save with M values leaves DB with exactly M rows", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const seed = await seedProduct({
      name: `psv-${stamp}`,
      locales: { uz: true, ru: true, en: true },
    });
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${seed.productId}`);
      await seed.cleanup();
    });

    // First save — N=3 spec values (extras only, no spec_field FK).
    const baseInput = buildInput({
      id: seed.productId,
      categoryId: seed.categoryId,
      status: "draft",
      namePrefix: `psv-${stamp}`,
    });
    const firstResult = await saveProduct({
      ...baseInput,
      specValues: [
        {
          specFieldId: null,
          isExtra: true,
          extraKey: "key_a",
          textValue: "alpha",
          sortOrder: 0,
        },
        {
          specFieldId: null,
          isExtra: true,
          extraKey: "key_b",
          textValue: "beta",
          sortOrder: 1,
        },
        {
          specFieldId: null,
          isExtra: true,
          extraKey: "key_c",
          textValue: "gamma",
          sortOrder: 2,
        },
      ],
    });
    expect(firstResult.ok).toBe(true);

    let psvRows = await db.execute(
      sql`SELECT id, extra_key FROM product_spec_values WHERE product_id = ${seed.productId}::uuid`,
    );
    expect(psvRows.rows.length).toBe(3);

    // Second save — M=1 spec value. Replace-on-save means the 3 originals
    // are gone and the new 1 is the only row.
    const secondResult = await saveProduct({
      ...baseInput,
      specValues: [
        {
          specFieldId: null,
          isExtra: true,
          extraKey: "key_only",
          textValue: "single",
          sortOrder: 0,
        },
      ],
    });
    expect(secondResult.ok).toBe(true);

    psvRows = await db.execute(
      sql`SELECT id, extra_key FROM product_spec_values WHERE product_id = ${seed.productId}::uuid`,
    );
    expect(psvRows.rows.length).toBe(1);
    expect((psvRows.rows[0] as { extra_key: string }).extra_key).toBe("key_only");
  }, 25_000);

  it("mtFlags replace-on-save — 1st save inserts 1 row; 2nd save with empty flags leaves 0 rows", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const seed = await seedProduct({
      name: `mt-${stamp}`,
      locales: { uz: true, ru: true, en: true },
    });
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${seed.productId}`);
      await seed.cleanup();
    });

    const baseInput = buildInput({
      id: seed.productId,
      categoryId: seed.categoryId,
      status: "draft",
      namePrefix: `mt-${stamp}`,
    });
    // 1st save — flag uz.name=true.
    const r1 = await saveProduct({
      ...baseInput,
      mtFlags: {
        uz: { name: true },
        ru: { name: false }, // falsy → skipped per replace-on-save rules
        en: {},
      },
    });
    expect(r1.ok).toBe(true);

    let flagRows = await db.execute(
      sql`SELECT product_id, locale, field_name, machine_translated
            FROM product_translation_field_flags
           WHERE product_id = ${seed.productId}::uuid`,
    );
    expect(flagRows.rows.length).toBe(1);
    expect(flagRows.rows[0]).toMatchObject({
      locale: "uz",
      field_name: "name",
      machine_translated: true,
    });

    // 2nd save — empty mtFlags (replace-on-save deletes all flags).
    const r2 = await saveProduct({
      ...baseInput,
      mtFlags: {},
    });
    expect(r2.ok).toBe(true);

    flagRows = await db.execute(
      sql`SELECT product_id FROM product_translation_field_flags WHERE product_id = ${seed.productId}::uuid`,
    );
    expect(flagRows.rows.length).toBe(0);
  }, 25_000);

  it("refusal-to-elevate (W7) — saveProduct status='draft' → 'published' rejects; product row + audit unchanged", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const seed = await seedProduct({
      name: `refuse-${stamp}`,
      locales: { uz: true, ru: true, en: true },
    });
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${seed.productId}`);
      await seed.cleanup();
    });

    // Snapshot row count BEFORE the call.
    const auditBefore = await db.execute(
      sql`SELECT COUNT(*)::int AS n FROM audit_log WHERE entity_id = ${seed.productId}`,
    );
    const auditBeforeN = (auditBefore.rows[0] as { n: number }).n;

    const input = buildInput({
      id: seed.productId,
      categoryId: seed.categoryId,
      status: "published", // attempt to elevate from persisted 'draft'
      namePrefix: `refuse-${stamp}`,
    });
    const result = await saveProduct(input);
    expect(result.ok).toBe(false);

    // Product row unchanged — status still 'draft'.
    const baseRows = await db.execute(
      sql`SELECT status FROM product WHERE id = ${seed.productId}::uuid`,
    );
    expect((baseRows.rows[0] as { status: string }).status).toBe("draft");

    // No new audit row.
    const auditAfter = await db.execute(
      sql`SELECT COUNT(*)::int AS n FROM audit_log WHERE entity_id = ${seed.productId}`,
    );
    expect((auditAfter.rows[0] as { n: number }).n).toBe(auditBeforeN);
  }, 25_000);

  it("transaction rollback — slug collision on locale 'uz' aborts tx; no audit row written", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Two seeded products. Product A is the "victim" we'll try to mutate;
    // product B owns a slug we'll collide against on the unique
    // (locale, slug) index.
    const seedA = await seedProduct({
      name: `rb-a-${stamp}`,
      locales: { uz: true, ru: true, en: true },
    });
    const seedB = await seedProduct({
      name: `rb-b-${stamp}`,
      locales: { uz: true, ru: true, en: true },
    });
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${seedA.productId}`);
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${seedB.productId}`);
      await seedB.cleanup();
      await seedA.cleanup();
    });

    // Snapshot audit count.
    const auditBefore = await db.execute(
      sql`SELECT COUNT(*)::int AS n FROM audit_log WHERE entity_id = ${seedA.productId}`,
    );
    const auditBeforeN = (auditBefore.rows[0] as { n: number }).n;

    // Snapshot the seed product's uz translation name to detect rollback.
    const trBefore = await db.execute(sql`
      SELECT name FROM product_translations
       WHERE product_id = ${seedA.productId}::uuid AND locale = 'uz'
    `);
    const nameBefore = (trBefore.rows[0] as { name: string }).name;

    // Save product A with new translations BUT collide the uz slug onto
    // product B's existing uz slug. The upsert loop hits ON CONFLICT
    // (product_id, locale) → DO UPDATE, but the UPDATE writes the new slug
    // and trips the unique (locale, slug) index — postgres aborts the tx.
    const input = buildInput({
      id: seedA.productId,
      categoryId: seedA.categoryId,
      status: "draft",
      namePrefix: `rb-a-renamed-${stamp}`,
    });
    // Collide slug on uz against product B's existing uz slug.
    input.translations.uz.slug = `${seedB.name}-uz`;

    const result = await saveProduct(input);
    expect(result.ok).toBe(false);

    // Translation name unchanged (rollback preserved the seed value).
    const trAfter = await db.execute(sql`
      SELECT name FROM product_translations
       WHERE product_id = ${seedA.productId}::uuid AND locale = 'uz'
    `);
    expect((trAfter.rows[0] as { name: string }).name).toBe(nameBefore);

    // No new audit row.
    const auditAfter = await db.execute(
      sql`SELECT COUNT(*)::int AS n FROM audit_log WHERE entity_id = ${seedA.productId}`,
    );
    expect((auditAfter.rows[0] as { n: number }).n).toBe(auditBeforeN);
  }, 25_000);

  it("duplicate — clones product (status forced 'draft', publishedAt null), translations with -copy slug suffix, spec values, MT flags, + audit action='duplicate_product'", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const seed = await seedProduct({
      name: `dup-${stamp}`,
      locales: { uz: true, ru: true, en: true },
    });
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${seed.productId}`);
      await seed.cleanup();
    });

    // Promote the source product to 'published' with publishedAt set so the
    // duplicate-forces-draft-and-null-publishedAt assertion is meaningful.
    await db.execute(sql`
      UPDATE product SET status = 'published', published_at = now()
       WHERE id = ${seed.productId}::uuid
    `);

    // Add 2 spec values + 1 MT flag so we can assert clone fidelity.
    await db.execute(sql`
      INSERT INTO product_spec_values
        (product_id, spec_field_id, is_extra, extra_key, text_value, sort_order)
      VALUES
        (${seed.productId}::uuid, NULL, true, 'k1', 'v1', 0),
        (${seed.productId}::uuid, NULL, true, 'k2', 'v2', 1)
    `);
    await db.execute(sql`
      INSERT INTO product_translation_field_flags (product_id, locale, field_name, machine_translated)
      VALUES (${seed.productId}::uuid, 'uz', 'name', true)
    `);

    revalidateTag.mockClear();

    const result = await duplicateProduct({ sourceId: seed.productId });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const cloneId = result.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${cloneId}`);
      await db.execute(
        sql`DELETE FROM product_translation_field_flags WHERE product_id = ${cloneId}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM product_spec_value_translations
             WHERE value_id IN (SELECT id FROM product_spec_values WHERE product_id = ${cloneId}::uuid)`,
      );
      await db.execute(
        sql`DELETE FROM product_spec_values WHERE product_id = ${cloneId}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM product_translations WHERE product_id = ${cloneId}::uuid`,
      );
      await db.execute(sql`DELETE FROM product WHERE id = ${cloneId}::uuid`);
    });

    // Clone is a different uuid.
    expect(cloneId).not.toBe(seed.productId);

    // status forced 'draft', publishedAt forced null regardless of source.
    const cloneBase = await db.execute(
      sql`SELECT status, published_at FROM product WHERE id = ${cloneId}::uuid`,
    );
    const cloneRow = cloneBase.rows[0] as {
      status: string;
      published_at: string | null;
    };
    expect(cloneRow.status).toBe("draft");
    expect(cloneRow.published_at).toBeNull();

    // Translations cloned with -copy slug suffix per locale.
    const cloneTrs = await db.execute(sql`
      SELECT locale, slug FROM product_translations WHERE product_id = ${cloneId}::uuid
    `);
    expect(cloneTrs.rows.length).toBe(3);
    for (const row of cloneTrs.rows as Array<{ locale: string; slug: string }>) {
      expect(row.slug.endsWith("-copy")).toBe(true);
    }

    // Spec values cloned 1-for-1.
    const cloneVals = await db.execute(
      sql`SELECT extra_key FROM product_spec_values WHERE product_id = ${cloneId}::uuid ORDER BY sort_order`,
    );
    expect(cloneVals.rows.length).toBe(2);
    expect(
      (cloneVals.rows as Array<{ extra_key: string }>).map((r) => r.extra_key),
    ).toEqual(["k1", "k2"]);

    // MT flags cloned 1-for-1.
    const cloneFlags = await db.execute(
      sql`SELECT locale, field_name, machine_translated FROM product_translation_field_flags WHERE product_id = ${cloneId}::uuid`,
    );
    expect(cloneFlags.rows.length).toBe(1);
    expect(cloneFlags.rows[0]).toMatchObject({
      locale: "uz",
      field_name: "name",
      machine_translated: true,
    });

    // Audit row action='duplicate_product' with before.sourceId + after.id.
    const auditRows = await db.execute(sql`
      SELECT action, before_json, after_json FROM audit_log
       WHERE entity_id = ${cloneId} AND action = 'duplicate_product'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    const auditRow = auditRows.rows[0] as {
      action: string;
      before_json: Record<string, unknown> | null;
      after_json: Record<string, unknown> | null;
    };
    expect(auditRow.action).toBe("duplicate_product");
    expect(auditRow.before_json?.["sourceId"]).toBe(seed.productId);
    expect(auditRow.after_json?.["id"]).toBe(cloneId);
    expect(auditRow.after_json?.["status"]).toBe("draft");

    // revalidateProduct(cloneId) fan-out called after tx commit.
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`product:${cloneId}`);
  }, 30_000);
});
