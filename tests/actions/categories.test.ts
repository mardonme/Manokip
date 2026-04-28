// Plan 02-09 Task 9.2 — categories Server Actions integration tests against
// the live Neon test branch.
//
// Covers the three contracts that distinguish the categories action from a
// generic CRUD wrapper:
//
//   1. Create — saveCategory (no input.id) writes 1 categories row + 3
//      categoryTranslations rows + 1 audit_log row(action='create',
//      before_json IS NULL) atomically. Cache fan-out: revalidateCategory(id).
//
//   2. Update with parent change — saveCategory (with input.id and a
//      different parentId) writes audit_log row(action='update',
//      before_json contains old parentId, after_json contains new). Cache
//      fan-out: revalidateCategoryMove(oldParent, newParent, id) — D-12.
//
//   3. Delete — deleteCategory writes audit_log row(action='delete',
//      before_json contains the row, after_json IS NULL), the categories
//      row is gone (cascade deletes translations).
//
// Posture: lives in the `node` vitest project (live-Neon HTTP). Uses
// vi.mock('@/lib/auth') to short-circuit the next-auth import chain (same
// posture as plan 02-04 require-admin tests + plan 02-07 admins tests),
// and vi.mock('next/cache') to spy on revalidateTag fan-out without booting
// Next.js runtime.
//
// Closest analog: tests/actions/admins.test.ts (live-Neon + vi.mock
// short-circuit) + tests/db/spec-values.test.ts (15s cold-Neon timeouts).

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";

// -- Mocks (must be hoisted by Vitest before the @/actions import below) -----

// requireAdmin is the gatekeeper inside withAdminAction. We provide a stub
// session so the wrapped action body executes; the next-auth import chain
// (auth.ts -> next-auth -> next/server) cannot be resolved by vitest outside
// the Next runtime, so the whole module gets mocked at scope.
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({
    user: { email: "test-admin@manometr.uz" },
    sessionToken: "stub-token",
  })),
}));

// next/headers is consulted by withAdminAction to populate ctx.ip /
// ctx.userAgent. Stubbing it avoids "headers() outside request scope" errors.
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Map<string, string>()),
}));

// next/cache is the chokepoint for the typed revalidate helpers. Spy here
// so each test can assert the fan-out shape.
//
// Use vi.hoisted so the spy is constructed BEFORE vi.mock's factory runs
// (vi.mock is hoisted by Vitest to the top of the file; a plain
// `const revalidateTag = vi.fn()` would be in the temporal dead zone when
// the hoisted factory accesses it).
const { revalidateTag } = vi.hoisted(() => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({
  revalidateTag,
}));

import { saveCategory, deleteCategory } from "@/actions/categories";

describe("categories actions (live Neon)", () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanups: Array<() => Promise<void>> = [];

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

  it("create — writes 1 categories row + 3 translations + audit_log(action='create') atomically", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const namePrefix = `cat-create-${stamp}`;

    const result = await saveCategory({
      parentId: null,
      sortOrder: 0,
      translations: {
        uz: { name: `${namePrefix} uz`, slug: `${namePrefix}-uz`, description: null },
        ru: { name: `${namePrefix} ru`, slug: `${namePrefix}-ru`, description: null },
        en: { name: `${namePrefix} en`, slug: `${namePrefix}-en`, description: null },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const id = result.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(sql`DELETE FROM category WHERE id = ${id}::uuid`);
    });

    // 1 categories row.
    const baseRows = await db.execute(
      sql`SELECT id FROM category WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(1);

    // 3 translation rows (uz, ru, en).
    const trRows = await db.execute(
      sql`SELECT locale, name, slug FROM category_translations WHERE category_id = ${id}::uuid`,
    );
    expect(trRows.rows.length).toBe(3);
    const locales = (trRows.rows as Array<{ locale: string }>)
      .map((r) => r.locale)
      .sort();
    expect(locales).toEqual(["en", "ru", "uz"]);

    // 1 audit_log row, action='create', before_json IS NULL.
    const auditRows = await db.execute(sql`
      SELECT action, entity_type, entity_id, actor_email, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${id}
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows[0]).toMatchObject({
      action: "create",
      entity_type: "category",
      entity_id: id,
      actor_email: "test-admin@manometr.uz",
      before_json: null,
    });

    // revalidateCategory(id) fan-out — 3 tags: category:<id>,
    // categories-tree, sitemap. (D-10 / src/lib/revalidation.ts)
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`category:${id}`);
    expect(calls).toContain("categories-tree");
    expect(calls).toContain("sitemap");
  }, 15_000);

  it("update with parent change — writes audit_log(action='update') + revalidateCategoryMove fan-out (D-12)", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const namePrefix = `cat-move-${stamp}`;

    // Seed: parent A + parent B + child under A.
    const parentA = await saveCategory({
      parentId: null,
      sortOrder: 0,
      translations: {
        uz: { name: `${namePrefix}-A uz`, slug: `${namePrefix}-a-uz`, description: null },
        ru: { name: `${namePrefix}-A ru`, slug: `${namePrefix}-a-ru`, description: null },
        en: { name: `${namePrefix}-A en`, slug: `${namePrefix}-a-en`, description: null },
      },
    });
    if (!parentA.ok) throw new Error("seed parentA failed");
    const parentAId = parentA.data.id as string;

    const parentB = await saveCategory({
      parentId: null,
      sortOrder: 0,
      translations: {
        uz: { name: `${namePrefix}-B uz`, slug: `${namePrefix}-b-uz`, description: null },
        ru: { name: `${namePrefix}-B ru`, slug: `${namePrefix}-b-ru`, description: null },
        en: { name: `${namePrefix}-B en`, slug: `${namePrefix}-b-en`, description: null },
      },
    });
    if (!parentB.ok) throw new Error("seed parentB failed");
    const parentBId = parentB.data.id as string;

    const child = await saveCategory({
      parentId: parentAId,
      sortOrder: 0,
      translations: {
        uz: { name: `${namePrefix}-C uz`, slug: `${namePrefix}-c-uz`, description: null },
        ru: { name: `${namePrefix}-C ru`, slug: `${namePrefix}-c-ru`, description: null },
        en: { name: `${namePrefix}-C en`, slug: `${namePrefix}-c-en`, description: null },
      },
    });
    if (!child.ok) throw new Error("seed child failed");
    const childId = child.data.id as string;

    cleanups.push(async () => {
      await db.execute(
        sql`DELETE FROM audit_log WHERE entity_id IN (${childId}, ${parentAId}, ${parentBId})`,
      );
      // child first (FK -> parent), then both parents.
      await db.execute(sql`DELETE FROM category WHERE id = ${childId}::uuid`);
      await db.execute(sql`DELETE FROM category WHERE id = ${parentAId}::uuid`);
      await db.execute(sql`DELETE FROM category WHERE id = ${parentBId}::uuid`);
    });

    // Reset spy — we want to assert ONLY the move's fan-out.
    revalidateTag.mockClear();

    // Re-parent the child from A -> B.
    const moved = await saveCategory({
      id: childId,
      parentId: parentBId,
      sortOrder: 0,
      translations: {
        uz: { name: `${namePrefix}-C uz`, slug: `${namePrefix}-c-uz`, description: null },
        ru: { name: `${namePrefix}-C ru`, slug: `${namePrefix}-c-ru`, description: null },
        en: { name: `${namePrefix}-C en`, slug: `${namePrefix}-c-en`, description: null },
      },
    });
    expect(moved.ok).toBe(true);

    // audit_log row for the update; before_json.parent_id = parentAId.
    const auditRows = await db.execute(sql`
      SELECT action, entity_id, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${childId} AND action = 'update'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    const auditRow = auditRows.rows[0] as {
      action: string;
      entity_id: string;
      before_json: Record<string, unknown> | null;
      after_json: Record<string, unknown> | null;
    };
    expect(auditRow.action).toBe("update");
    // Drizzle stores snake_case keys when serialising the row to JSON via
    // the implicit cast — accept either casing.
    const beforeParent =
      auditRow.before_json?.["parentId"] ?? auditRow.before_json?.["parent_id"];
    expect(beforeParent).toBe(parentAId);
    const afterParent =
      auditRow.after_json?.["parentId"] ?? auditRow.after_json?.["parent_id"];
    expect(afterParent).toBe(parentBId);

    // Fan-out: revalidateCategoryMove(parentAId, parentBId, childId)
    // emits 5 tags: category:<oldParent>, category:<newParent>,
    // category:<moved>, categories-tree, sitemap.
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`category:${parentAId}`);
    expect(calls).toContain(`category:${parentBId}`);
    expect(calls).toContain(`category:${childId}`);
    expect(calls).toContain("categories-tree");
    expect(calls).toContain("sitemap");
    // Crucially NOT a plain revalidateCategory(child) — that would only emit
    // 3 tags. The 5-tag superset is the D-12 contract.
    expect(calls.length).toBeGreaterThanOrEqual(5);
  }, 20_000);

  it("delete — writes audit_log(action='delete') + before_json contains row + after_json IS NULL + row is gone", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const namePrefix = `cat-delete-${stamp}`;

    const created = await saveCategory({
      parentId: null,
      sortOrder: 0,
      translations: {
        uz: { name: `${namePrefix} uz`, slug: `${namePrefix}-uz`, description: null },
        ru: { name: `${namePrefix} ru`, slug: `${namePrefix}-ru`, description: null },
        en: { name: `${namePrefix} en`, slug: `${namePrefix}-en`, description: null },
      },
    });
    if (!created.ok) throw new Error("seed failed");
    const id = created.data.id as string;

    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      // Delete may have already removed the row; guard with id existence.
      await db.execute(sql`DELETE FROM category WHERE id = ${id}::uuid`);
    });

    // Sanity: before deleting we have the row.
    const before = await db.execute(
      sql`SELECT id FROM category WHERE id = ${id}::uuid`,
    );
    expect(before.rows.length).toBe(1);

    revalidateTag.mockClear();

    const result = await deleteCategory({ id });
    expect(result.ok).toBe(true);

    // Row gone (cascade also removed translations via FK ON DELETE CASCADE).
    const after = await db.execute(
      sql`SELECT id FROM category WHERE id = ${id}::uuid`,
    );
    expect(after.rows.length).toBe(0);

    // audit_log row.
    const auditRows = await db.execute(sql`
      SELECT action, entity_id, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${id} AND action = 'delete'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    const auditRow = auditRows.rows[0] as {
      action: string;
      before_json: Record<string, unknown> | null;
      after_json: Record<string, unknown> | null;
    };
    expect(auditRow.action).toBe("delete");
    expect(auditRow.before_json).not.toBeNull();
    expect(auditRow.after_json).toBeNull();
  }, 15_000);
});

// Mark the unused `randomUUID` import as referenced so tsc --noEmit doesn't
// complain when test bodies stop using it (kept for future test additions).
void randomUUID;
