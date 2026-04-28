// Plan 02-10 Task 10.2 — manufacturers Server Actions integration tests
// against the live Neon test branch.
//
// Mirrors tests/actions/categories.test.ts (plan 02-09) but locks the
// manufacturer-specific contracts:
//
//   1. Create — saveManufacturer (no input.id, with logoPublicId) writes
//      1 manufacturer row + 3 manufacturer_translations rows + 1
//      audit_log(action='create', before_json IS NULL) atomically. The
//      logo_public_id column persists the SHORT public_id ONLY (no full URL,
//      no asset_id) per CLAUDE.md guardrail. Cache fan-out:
//      revalidateManufacturer(id) emits 3 tags.
//
//   2. Update with logo change — saveManufacturer with a different
//      logoPublicId writes audit_log(action='update'); before_json carries
//      the old public_id and after_json carries the new. Cache fan-out:
//      revalidateManufacturer(id) emits the same 3 tags.
//
//   3. Delete — deleteManufacturer cascades the 3 translation rows via FK
//      ON DELETE CASCADE; audit row is action='delete' with the row in
//      before_json and after_json IS NULL.
//
// Posture: vitest `node` project (live-Neon HTTP). vi.mock('@/lib/auth')
// short-circuits the next-auth import chain (canonical pattern from plan
// 02-04). vi.hoisted spy on next/cache for the revalidateTag fan-out.

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";

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

import { saveManufacturer, deleteManufacturer } from "@/actions/manufacturers";

describe("manufacturers actions (live Neon)", () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanups: Array<() => Promise<void>> = [];

  beforeEach(() => {
    revalidateTag.mockClear();
  });

  afterEach(async () => {
    for (let i = cleanups.length - 1; i >= 0; i--) {
      await cleanups[i]!();
    }
    cleanups.length = 0;
  });

  it("create — writes 1 manufacturer row + 3 translations + audit_log(action='create') atomically; logo_public_id persists the SHORT public_id only", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const namePrefix = `mfr-create-${stamp}`;
    const logoPublicId = `manufacturers/${namePrefix}-logo`;

    const result = await saveManufacturer({
      logoPublicId,
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
      await db.execute(sql`DELETE FROM manufacturer WHERE id = ${id}::uuid`);
    });

    // 1 manufacturer row with the SHORT logo_public_id only (no URL).
    const baseRows = await db.execute(
      sql`SELECT id, logo_public_id FROM manufacturer WHERE id = ${id}::uuid`,
    );
    expect(baseRows.rows.length).toBe(1);
    const base = baseRows.rows[0] as { id: string; logo_public_id: string | null };
    expect(base.logo_public_id).toBe(logoPublicId);
    // SSOT invariant: never stored as URL.
    expect(base.logo_public_id).not.toMatch(/^https?:\/\//);

    // 3 translation rows (uz, ru, en).
    const trRows = await db.execute(
      sql`SELECT locale, name, slug FROM manufacturer_translations WHERE manufacturer_id = ${id}::uuid`,
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
      entity_type: "manufacturer",
      entity_id: id,
      actor_email: "test-admin@manometr.uz",
      before_json: null,
    });

    // revalidateManufacturer fan-out: 3 tags (manufacturer:<id>,
    // manufacturers-list, sitemap) per src/lib/revalidation.ts:71-75.
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`manufacturer:${id}`);
    expect(calls).toContain("manufacturers-list");
    expect(calls).toContain("sitemap");
  }, 15_000);

  it("update with logo change — audit before_json carries old public_id; after_json carries new", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const namePrefix = `mfr-logo-${stamp}`;
    const oldLogo = `manufacturers/${namePrefix}-old`;
    const newLogo = `manufacturers/${namePrefix}-new`;

    // Seed.
    const created = await saveManufacturer({
      logoPublicId: oldLogo,
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
      await db.execute(sql`DELETE FROM manufacturer WHERE id = ${id}::uuid`);
    });

    revalidateTag.mockClear();

    // Update — swap logoPublicId.
    const updated = await saveManufacturer({
      id,
      logoPublicId: newLogo,
      translations: {
        uz: { name: `${namePrefix} uz`, slug: `${namePrefix}-uz`, description: null },
        ru: { name: `${namePrefix} ru`, slug: `${namePrefix}-ru`, description: null },
        en: { name: `${namePrefix} en`, slug: `${namePrefix}-en`, description: null },
      },
    });
    expect(updated.ok).toBe(true);

    // Persisted column updated.
    const baseRows = await db.execute(
      sql`SELECT logo_public_id FROM manufacturer WHERE id = ${id}::uuid`,
    );
    const base = baseRows.rows[0] as { logo_public_id: string | null };
    expect(base.logo_public_id).toBe(newLogo);

    // Audit row: before_json carries the OLD public_id; after_json the NEW.
    const auditRows = await db.execute(sql`
      SELECT action, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${id} AND action = 'update'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    const auditRow = auditRows.rows[0] as {
      action: string;
      before_json: Record<string, unknown> | null;
      after_json: Record<string, unknown> | null;
    };
    expect(auditRow.action).toBe("update");
    // Drizzle JSON serialisation may emit either camelCase or snake_case keys
    // depending on the strategy — accept either.
    const beforeLogo =
      auditRow.before_json?.["logoPublicId"] ??
      auditRow.before_json?.["logo_public_id"];
    expect(beforeLogo).toBe(oldLogo);
    const afterLogo =
      auditRow.after_json?.["logoPublicId"] ??
      auditRow.after_json?.["logo_public_id"];
    expect(afterLogo).toBe(newLogo);

    // revalidateManufacturer fan-out (same 3 tags as create).
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`manufacturer:${id}`);
    expect(calls).toContain("manufacturers-list");
    expect(calls).toContain("sitemap");
  }, 20_000);

  it("delete — writes audit_log(action='delete') + before_json contains row + after_json IS NULL + row + translations are gone", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const namePrefix = `mfr-delete-${stamp}`;

    const created = await saveManufacturer({
      logoPublicId: `manufacturers/${namePrefix}-logo`,
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
      await db.execute(sql`DELETE FROM manufacturer WHERE id = ${id}::uuid`);
    });

    // Sanity: row + 3 translations exist before delete.
    const before = await db.execute(
      sql`SELECT id FROM manufacturer WHERE id = ${id}::uuid`,
    );
    expect(before.rows.length).toBe(1);
    const beforeTr = await db.execute(
      sql`SELECT locale FROM manufacturer_translations WHERE manufacturer_id = ${id}::uuid`,
    );
    expect(beforeTr.rows.length).toBe(3);

    revalidateTag.mockClear();

    const result = await deleteManufacturer({ id });
    expect(result.ok).toBe(true);

    // Row gone — translations cascaded via FK ON DELETE CASCADE.
    const after = await db.execute(
      sql`SELECT id FROM manufacturer WHERE id = ${id}::uuid`,
    );
    expect(after.rows.length).toBe(0);
    const afterTr = await db.execute(
      sql`SELECT locale FROM manufacturer_translations WHERE manufacturer_id = ${id}::uuid`,
    );
    expect(afterTr.rows.length).toBe(0);

    // audit_log row.
    const auditRows = await db.execute(sql`
      SELECT action, before_json, after_json
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

    // Fan-out for delete = revalidateManufacturer(id) — 3 tags.
    const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain(`manufacturer:${id}`);
    expect(calls).toContain("manufacturers-list");
    expect(calls).toContain("sitemap");
  }, 15_000);
});
