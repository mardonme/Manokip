// Plan 02-11 Task 11.3 — spec_field_group Server Actions integration tests
// against the live Neon test branch.
//
// Locks the three contracts (D-09):
//
//   1. Create — saveSpecFieldGroup writes 1 spec_field_group row + 3
//      spec_field_group_translations rows + 1 audit_log(action='create')
//      atomically. Cache fan-out: revalidateSpecFieldGroup(id, categoryId).
//
//   2. Reorder — reorderGroups({ categoryId, ordering: [...] }) updates
//      sort_order for each id in a single transaction; audit action='update'
//      with entityType='spec_field_group' and entityId=categoryId (the
//      reorder is a category-scoped operation, not per-row).
//
//   3. Soft-delete — deleteSpecFieldGroup sets deleted_at; the row remains;
//      audit action='delete' with after.deletedAt populated.
//
// Posture: same as tests/actions/spec-fields.test.ts (live-Neon `node`
// project, vi.mock('@/lib/auth') + vi.hoisted spy on next/cache).

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";

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
  saveSpecFieldGroup,
  reorderGroups,
  deleteSpecFieldGroup,
} from "@/actions/spec-field-groups";

describe("spec-field-groups actions (live Neon)", () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanups: Array<() => Promise<void>> = [];

  async function seedCategory(suffix: string): Promise<string> {
    const db = await getTestDb();
    const id = randomUUID();
    await db.execute(sql`
      INSERT INTO category (id, sort_order)
      VALUES (${id}::uuid, 0)
    `);
    const slugBase = `sfg-test-${stamp}-${suffix}`;
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

  beforeEach(() => {
    revalidateTag.mockClear();
  });

  afterEach(async () => {
    for (let i = cleanups.length - 1; i >= 0; i--) {
      await cleanups[i]!();
    }
    cleanups.length = 0;
  });

  it("create — writes 1 spec_field_group row + 3 translations + audit_log(action='create') atomically", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("create");

    const keyName = `dimensions_${stamp.replace(/-/g, "_")}`;

    const result = await saveSpecFieldGroup({
      categoryId,
      key: keyName,
      sortOrder: 0,
      translations: {
        uz: { label: "O'lchamlar" },
        ru: { label: "Размеры" },
        en: { label: "Dimensions" },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const id = result.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(sql`DELETE FROM spec_field_group WHERE id = ${id}::uuid`);
    });

    // 1 spec_field_group row.
    const baseRows = await db.execute(
      sql`SELECT id, key FROM spec_field_group WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(1);
    expect((baseRows.rows[0] as { key: string }).key).toBe(keyName);

    // 3 translation rows.
    const trRows = await db.execute(
      sql`SELECT locale, label FROM spec_field_group_translations WHERE group_id = ${id}::uuid`,
    );
    expect(trRows.rows.length).toBe(3);
    const locales = (trRows.rows as Array<{ locale: string }>)
      .map((r) => r.locale)
      .sort();
    expect(locales).toEqual(["en", "ru", "uz"]);

    // Audit row.
    const auditRows = await db.execute(sql`
      SELECT action, entity_type, before_json
        FROM audit_log
       WHERE entity_id = ${id}
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows[0]).toMatchObject({
      action: "create",
      entity_type: "spec_field_group",
      before_json: null,
    });

    // Cache fan-out — revalidateSpecFieldGroup emits 2 tags.
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`spec-field-group:${id}`);
    expect(calls).toContain(`category:${categoryId}`);
  }, 25_000);

  it("reorder — batch updates sort_order for each id in a single transaction", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("reorder");

    // Seed two groups with sort_order 0 and 1.
    const g0 = await saveSpecFieldGroup({
      categoryId,
      key: `g0_${stamp.replace(/-/g, "_")}`,
      sortOrder: 0,
      translations: {
        uz: { label: "G0 uz" },
        ru: { label: "G0 ru" },
        en: { label: "G0 en" },
      },
    });
    if (!g0.ok) throw new Error("seed g0 failed");
    const g0Id = g0.data.id as string;

    const g1 = await saveSpecFieldGroup({
      categoryId,
      key: `g1_${stamp.replace(/-/g, "_")}`,
      sortOrder: 1,
      translations: {
        uz: { label: "G1 uz" },
        ru: { label: "G1 ru" },
        en: { label: "G1 en" },
      },
    });
    if (!g1.ok) throw new Error("seed g1 failed");
    const g1Id = g1.data.id as string;

    cleanups.push(async () => {
      await db.execute(
        sql`DELETE FROM audit_log WHERE entity_id IN (${g0Id}, ${g1Id}, ${categoryId})`,
      );
      await db.execute(
        sql`DELETE FROM spec_field_group WHERE id IN (${g0Id}::uuid, ${g1Id}::uuid)`,
      );
    });

    revalidateTag.mockClear();

    // Swap the two — g1 first (sort_order=0), g0 second (sort_order=1).
    const result = await reorderGroups({
      categoryId,
      ordering: [
        { id: g1Id, sortOrder: 0 },
        { id: g0Id, sortOrder: 1 },
      ],
    });
    expect(result.ok).toBe(true);

    // Persisted sort_order swapped.
    const rows = await db.execute(sql`
      SELECT id, sort_order FROM spec_field_group
       WHERE id IN (${g0Id}::uuid, ${g1Id}::uuid)
    `);
    const byId = new Map(
      (rows.rows as Array<{ id: string; sort_order: number }>).map((r) => [
        r.id,
        Number(r.sort_order),
      ]),
    );
    expect(byId.get(g0Id)).toBe(1);
    expect(byId.get(g1Id)).toBe(0);

    // Audit row attributed to the categoryId — single 'update' row.
    const auditRows = await db.execute(sql`
      SELECT action, entity_type, entity_id FROM audit_log
       WHERE entity_id = ${categoryId} AND entity_type = 'spec_field_group'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    expect((auditRows.rows[0] as { action: string }).action).toBe("update");
  }, 25_000);

  it("soft-delete — sets deleted_at + audit action='delete'", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const categoryId = await seedCategory("delete");

    const seed = await saveSpecFieldGroup({
      categoryId,
      key: `del_${stamp.replace(/-/g, "_")}`,
      sortOrder: 0,
      translations: {
        uz: { label: "Del uz" },
        ru: { label: "Del ru" },
        en: { label: "Del en" },
      },
    });
    if (!seed.ok) throw new Error("seed failed");
    const id = seed.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(sql`DELETE FROM spec_field_group WHERE id = ${id}::uuid`);
    });

    revalidateTag.mockClear();

    const result = await deleteSpecFieldGroup({ id });
    expect(result.ok).toBe(true);

    // Row remains; deleted_at populated.
    const baseRows = await db.execute(
      sql`SELECT id, deleted_at FROM spec_field_group WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(1);
    expect((baseRows.rows[0] as { deleted_at: string | null }).deleted_at).not.toBeNull();

    // Audit row.
    const auditRows = await db.execute(sql`
      SELECT action FROM audit_log
       WHERE entity_id = ${id} AND action = 'delete'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
  }, 25_000);
});
