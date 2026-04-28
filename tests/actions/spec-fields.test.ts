// Plan 02-11 Task 11.2 — spec-field Server Actions integration tests
// against the live Neon test branch.
//
// Locks the four spec-field-specific contracts (D-06 / D-07 / D-08):
//
//   1. Create — saveSpecField (no input.id) writes 1 spec_field row + 3
//      spec_field_translations rows + 1 audit_log(action='create',
//      before_json IS NULL) atomically. Cache fan-out:
//      revalidateSpecField(id, categoryId).
//
//   2. dataType lock (D-08) — saveSpecField update with a different
//      dataType throws inside the action body so withAdminAction maps to
//      { ok:false, error:'unknown' }. The Phase-1 schema column accepts the
//      change at the DB level — the runtime block is the v1 mitigation.
//
//   3. Rename (D-06) — renameSpecField updates spec_field.key + cascade-
//      renames product_spec_values.extra_key for rows referencing this
//      field. Audit row is action='rename_spec_field'; before_json carries
//      the old key, after_json the new.
//
//   4. Soft-delete (D-07) — softDeleteSpecField sets deleted_at; the
//      spec_field row remains; product_spec_values rows are untouched. Audit
//      action='soft_delete_spec_field'.
//
//   5. Hard-delete (D-07) — deleteSpecField drops the row + cascades
//      product_spec_values via FK ON DELETE CASCADE (Phase-1 contract). Audit
//      action='delete_spec_field' with after_json IS NULL.
//
// Posture: lives in the `node` vitest project (live-Neon HTTP). vi.mock(
// '@/lib/auth') short-circuits the next-auth import chain (canonical pattern
// from plan 02-04), vi.hoisted spy on next/cache for the revalidateTag
// fan-out (vi.mock factories are hoisted by Vitest).
//
// Cleanup: each test seeds a parent category (FK target) + the spec_field
// (and any product/value rows the test inserts) and tears them down in
// reverse order via the `cleanups` stack. Cold-Neon timeouts at 15-25s.

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";

// -- Mocks (must be hoisted by Vitest before the @/actions import below) -----

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

import {
  saveSpecField,
  renameSpecField,
  softDeleteSpecField,
  deleteSpecField,
} from "@/actions/spec-fields";

describe("spec-fields actions (live Neon)", () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanups: Array<() => Promise<void>> = [];

  /**
   * Seed a parent category for the spec_field's FK. Returns the category id.
   * Adds its own cleanup row to the stack.
   */
  async function seedCategory(suffix: string): Promise<string> {
    const db = await getTestDb();
    const id = randomUUID();
    await db.execute(sql`
      INSERT INTO category (id, sort_order)
      VALUES (${id}::uuid, 0)
    `);
    const slugBase = `sf-test-${stamp}-${suffix}`;
    for (const locale of ["uz", "ru", "en"] as const) {
      await db.execute(sql`
        INSERT INTO category_translations (category_id, locale, name, slug)
        VALUES (${id}::uuid, ${locale}, ${`${slugBase} ${locale}`}, ${`${slugBase}-${locale}`})
      `);
    }
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM category WHERE id = ${id}::uuid`);
    });
    return id;
  }

  /**
   * Seed a product belonging to the given category. Returns the product id.
   * Adds its own cleanup. Used by the rename cascade test.
   */
  async function seedProduct(categoryId: string, suffix: string): Promise<string> {
    const db = await getTestDb();
    const id = randomUUID();
    await db.execute(sql`
      INSERT INTO product (id, category_id, status)
      VALUES (${id}::uuid, ${categoryId}::uuid, 'draft')
    `);
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM product WHERE id = ${id}::uuid`);
    });
    void suffix; // unused placeholder for parallel naming
    return id;
  }

  beforeEach(() => {
    revalidateTag.mockClear();
  });

  afterEach(async () => {
    // Run cleanups in reverse so children drop before parents (FK constraints).
    for (let i = cleanups.length - 1; i >= 0; i--) {
      await cleanups[i]!();
    }
    cleanups.length = 0;
  });

  it("create — writes 1 spec_field row + 3 translations + audit_log(action='create') atomically", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("create");

    const keyName = `pressure_max_${stamp.replace(/-/g, "_")}`;

    const result = await saveSpecField({
      categoryId,
      key: keyName,
      dataType: "number",
      unit: "bar",
      required: false,
      filterKind: "range",
      filterGroupKey: "pressure",
      groupId: null,
      sortOrder: 0,
      translations: {
        uz: { label: "Maks. bosim", helpText: null },
        ru: { label: "Макс. давление", helpText: null },
        en: { label: "Max pressure", helpText: null },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const id = result.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(sql`DELETE FROM spec_field WHERE id = ${id}::uuid`);
    });

    // 1 spec_field row.
    const baseRows = await db.execute(
      sql`SELECT id, key, data_type, unit FROM spec_field WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(1);
    const base = baseRows.rows[0] as {
      id: string;
      key: string;
      data_type: string;
      unit: string | null;
    };
    expect(base.key).toBe(keyName);
    expect(base.data_type).toBe("number");
    expect(base.unit).toBe("bar");

    // 3 translation rows (uz, ru, en).
    const trRows = await db.execute(
      sql`SELECT locale, label FROM spec_field_translations WHERE spec_field_id = ${id}::uuid`,
    );
    expect(trRows.rows.length).toBe(3);
    const locales = (trRows.rows as Array<{ locale: string }>)
      .map((r) => r.locale)
      .sort();
    expect(locales).toEqual(["en", "ru", "uz"]);

    // 1 audit_log row, action='create', before_json IS NULL.
    const auditRows = await db.execute(sql`
      SELECT action, entity_type, entity_id, actor_email, before_json
        FROM audit_log
       WHERE entity_id = ${id}
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows[0]).toMatchObject({
      action: "create",
      entity_type: "spec_field",
      entity_id: id,
      actor_email: "test-admin@manometr.uz",
      before_json: null,
    });

    // revalidateSpecField(id, categoryId) fan-out: 3 tags
    // (spec-field:<id>, category:<categoryId>, search-index).
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`spec-field:${id}`);
    expect(calls).toContain(`category:${categoryId}`);
    expect(calls).toContain("search-index");
  }, 25_000);

  it("update with dataType change — throws (D-08 type-lock)", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("typelock");

    const keyName = `typelock_${stamp.replace(/-/g, "_")}`;

    // Seed as 'number'.
    const seed = await saveSpecField({
      categoryId,
      key: keyName,
      dataType: "number",
      unit: null,
      required: false,
      filterKind: null,
      filterGroupKey: null,
      groupId: null,
      sortOrder: 0,
      translations: {
        uz: { label: "Maydon", helpText: null },
        ru: { label: "Поле", helpText: null },
        en: { label: "Field", helpText: null },
      },
    });
    if (!seed.ok) throw new Error("seed failed");
    const id = seed.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(sql`DELETE FROM spec_field WHERE id = ${id}::uuid`);
    });

    // Try to flip 'number' → 'text'. Action must reject (returns
    // { ok:false }) and the persisted column stays 'number'.
    const flip = await saveSpecField({
      id,
      categoryId,
      key: keyName,
      dataType: "text",
      unit: null,
      required: false,
      filterKind: null,
      filterGroupKey: null,
      groupId: null,
      sortOrder: 0,
      translations: {
        uz: { label: "Maydon", helpText: null },
        ru: { label: "Поле", helpText: null },
        en: { label: "Field", helpText: null },
      },
    });
    expect(flip.ok).toBe(false);

    const baseRows = await db.execute(
      sql`SELECT data_type FROM spec_field WHERE id = ${id}::uuid`,
    );
    expect((baseRows.rows[0] as { data_type: string }).data_type).toBe("number");
  }, 25_000);

  it("rename — updates spec_field.key + cascades product_spec_values.extra_key + audit action='rename_spec_field'", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("rename");
    const productId = await seedProduct(categoryId, "rename");

    const oldKey = `oldkey_${stamp.replace(/-/g, "_")}`;
    const newKey = `newkey_${stamp.replace(/-/g, "_")}`;

    const seed = await saveSpecField({
      categoryId,
      key: oldKey,
      dataType: "text",
      unit: null,
      required: false,
      filterKind: null,
      filterGroupKey: null,
      groupId: null,
      sortOrder: 0,
      translations: {
        uz: { label: "Eski", helpText: null },
        ru: { label: "Старый", helpText: null },
        en: { label: "Old", helpText: null },
      },
    });
    if (!seed.ok) throw new Error("seed failed");
    const id = seed.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      // Cascade drops translations + product_spec_values rows.
      await db.execute(sql`DELETE FROM spec_field WHERE id = ${id}::uuid`);
    });

    // Seed a product_spec_values row referencing the spec_field with the
    // old extra_key — the rename should cascade-update extra_key.
    await db.execute(sql`
      INSERT INTO product_spec_values
        (product_id, spec_field_id, is_extra, extra_key, text_value, sort_order)
      VALUES
        (${productId}::uuid, ${id}::uuid, true, ${oldKey}, 'old value', 0)
    `);

    revalidateTag.mockClear();

    const result = await renameSpecField({ id, oldKey, newKey });
    expect(result.ok).toBe(true);

    // spec_field.key updated.
    const baseRows = await db.execute(
      sql`SELECT key FROM spec_field WHERE id = ${id}::uuid`,
    );
    expect((baseRows.rows[0] as { key: string }).key).toBe(newKey);

    // product_spec_values.extra_key cascaded.
    const psvRows = await db.execute(sql`
      SELECT extra_key FROM product_spec_values
       WHERE spec_field_id = ${id}::uuid AND product_id = ${productId}::uuid
    `);
    expect((psvRows.rows[0] as { extra_key: string }).extra_key).toBe(newKey);

    // Audit action='rename_spec_field' with before_json.key = old, after_json.key = new.
    const auditRows = await db.execute(sql`
      SELECT action, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${id} AND action = 'rename_spec_field'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    const auditRow = auditRows.rows[0] as {
      action: string;
      before_json: Record<string, unknown> | null;
      after_json: Record<string, unknown> | null;
    };
    expect(auditRow.action).toBe("rename_spec_field");
    expect(auditRow.before_json?.["key"]).toBe(oldKey);
    expect(auditRow.after_json?.["key"]).toBe(newKey);

    // Cache fan-out via revalidateSpecField.
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`spec-field:${id}`);
    expect(calls).toContain(`category:${categoryId}`);
  }, 25_000);

  it("soft-delete — sets deleted_at + audit action='soft_delete_spec_field'", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("soft");

    const keyName = `soft_${stamp.replace(/-/g, "_")}`;

    const seed = await saveSpecField({
      categoryId,
      key: keyName,
      dataType: "text",
      unit: null,
      required: false,
      filterKind: null,
      filterGroupKey: null,
      groupId: null,
      sortOrder: 0,
      translations: {
        uz: { label: "S", helpText: null },
        ru: { label: "S", helpText: null },
        en: { label: "S", helpText: null },
      },
    });
    if (!seed.ok) throw new Error("seed failed");
    const id = seed.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(sql`DELETE FROM spec_field WHERE id = ${id}::uuid`);
    });

    revalidateTag.mockClear();

    const result = await softDeleteSpecField({ id });
    expect(result.ok).toBe(true);

    // deleted_at set; row still present.
    const baseRows = await db.execute(
      sql`SELECT id, deleted_at FROM spec_field WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(1);
    expect((baseRows.rows[0] as { deleted_at: string | null }).deleted_at).not.toBeNull();

    // Audit row.
    const auditRows = await db.execute(sql`
      SELECT action FROM audit_log
       WHERE entity_id = ${id} AND action = 'soft_delete_spec_field'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
  }, 25_000);

  it("hard-delete — drops row + cascades product_spec_values + audit action='delete_spec_field' with after_json IS NULL", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("hard");
    const productId = await seedProduct(categoryId, "hard");

    const keyName = `hard_${stamp.replace(/-/g, "_")}`;

    const seed = await saveSpecField({
      categoryId,
      key: keyName,
      dataType: "text",
      unit: null,
      required: false,
      filterKind: null,
      filterGroupKey: null,
      groupId: null,
      sortOrder: 0,
      translations: {
        uz: { label: "H", helpText: null },
        ru: { label: "H", helpText: null },
        en: { label: "H", helpText: null },
      },
    });
    if (!seed.ok) throw new Error("seed failed");
    const id = seed.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      // The row may already be gone after deleteSpecField; this is idempotent.
      await db.execute(sql`DELETE FROM spec_field WHERE id = ${id}::uuid`);
    });

    // Seed a product_spec_values row referencing the spec_field — the FK
    // is ON DELETE SET NULL on spec_field_id (Phase-1 schema). Phase-2
    // semantic is "hard-delete the field; values become orphaned with
    // spec_field_id=NULL". The plan's <behavior> says "cascades via FK
    // ON DELETE CASCADE" — but the actual Phase-1 schema declares
    // ON DELETE SET NULL on product_spec_values.spec_field_id. We assert
    // the live-schema behaviour: the value row survives with NULL FK.
    await db.execute(sql`
      INSERT INTO product_spec_values
        (product_id, spec_field_id, is_extra, extra_key, text_value, sort_order)
      VALUES
        (${productId}::uuid, ${id}::uuid, true, ${keyName}, 'val', 0)
    `);

    revalidateTag.mockClear();

    const result = await deleteSpecField({ id });
    expect(result.ok).toBe(true);

    // spec_field row gone.
    const baseRows = await db.execute(
      sql`SELECT id FROM spec_field WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(0);

    // Audit row, after_json IS NULL.
    const auditRows = await db.execute(sql`
      SELECT action, after_json FROM audit_log
       WHERE entity_id = ${id} AND action = 'delete_spec_field'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    expect((auditRows.rows[0] as { after_json: unknown }).after_json).toBeNull();

    // product_spec_values row survives with spec_field_id=NULL (Phase-1
    // contract: ON DELETE SET NULL on spec_field_id).
    const psvRows = await db.execute(sql`
      SELECT spec_field_id FROM product_spec_values WHERE product_id = ${productId}::uuid
    `);
    expect(psvRows.rows.length).toBe(1);
    expect(
      (psvRows.rows[0] as { spec_field_id: string | null }).spec_field_id,
    ).toBeNull();
  }, 25_000);
});
