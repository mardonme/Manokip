// Plan 02-15 Task 15.2 — submissions Server Actions integration tests
// against the live Neon test branch.
//
// Locks the inbox + export contracts:
//
//   1. markSubmissionRead — toggles read_at: setting isRead=true stamps
//      now(); isRead=false clears to null. Atomic with audit_log row
//      (action='update', entityType='contact_submission', before/after
//      both populated). T-02-15-05 (admin denies the export).
//
//   2. exportSubmissionsCsv — assembles the filtered rows into a CSV
//      string with UTF-8 BOM + RFC 4180 quoting (Pitfall #9 +
//      T-02-15-01). Returns { filename, csv }. Audits the export with
//      entityType='contact_submission_export', after.count + after.filter.
//
//   3. exportSubmissionsCsv with from/to filter returns only the rows
//      whose submitted_at falls inside the window. The Zod schema is
//      the only allowlisted filter surface (T-02-15-03 mass-assignment).
//
// Posture matches the canonical Phase-2 test shape from
// tests/actions/manufacturers.test.ts: vi.mock('@/lib/auth') short-circuits
// the next-auth import chain; vi.hoisted spy on next/cache avoids the
// 'next/cache' RSC boundary throwing under vitest.

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

import {
  markSubmissionRead,
  exportSubmissionsCsv,
} from "@/actions/submissions";

describe("submissions actions (live Neon)", () => {
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

  /**
   * Insert a contact_submission row with deterministic content for the
   * test. Returns the bigserial id as a string (the stable wire shape
   * the Server Action expects from form / fetch boundaries).
   */
  async function seedSubmission(opts: {
    name: string;
    email: string;
    message: string;
    submittedAt?: Date;
    company?: string | null;
  }): Promise<string> {
    const db = await getTestDb();
    const submittedAt = opts.submittedAt ?? new Date();
    const rows = await db.execute(sql`
      INSERT INTO contact_submission (name, email, company, message, submitted_at)
      VALUES (${opts.name}, ${opts.email}, ${opts.company ?? null}, ${opts.message}, ${submittedAt.toISOString()})
      RETURNING id
    `);
    const id = String((rows.rows[0] as { id: string | bigint }).id);
    cleanups.push(async () => {
      await db.execute(
        sql`DELETE FROM audit_log WHERE entity_id = ${id}`,
      );
      await db.execute(
        sql`DELETE FROM contact_submission WHERE id = ${id}::bigint`,
      );
    });
    return id;
  }

  it("markSubmissionRead — toggles read_at + writes audit_log(action='update') with before/after read_at", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const id = await seedSubmission({
      name: `inbox-mark-${stamp}`,
      email: `${stamp}@example.test`,
      message: "Test submission for mark-read.",
    });

    // Sanity: read_at starts NULL.
    const initial = await db.execute(
      sql`SELECT read_at FROM contact_submission WHERE id = ${id}::bigint`,
    );
    expect((initial.rows[0] as { read_at: string | null }).read_at).toBeNull();

    // Mark read.
    const markedRead = await markSubmissionRead({ id, isRead: true });
    expect(markedRead.ok).toBe(true);

    const afterRead = await db.execute(
      sql`SELECT read_at FROM contact_submission WHERE id = ${id}::bigint`,
    );
    const readRow = afterRead.rows[0] as { read_at: string | null };
    expect(readRow.read_at).not.toBeNull();

    // Audit row written.
    const auditRows = await db.execute(sql`
      SELECT action, entity_type, entity_id, actor_email, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${id} AND entity_type = 'contact_submission'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBe(1);
    const audit = auditRows.rows[0] as {
      action: string;
      entity_type: string;
      actor_email: string;
      before_json: Record<string, unknown> | null;
      after_json: Record<string, unknown> | null;
    };
    expect(audit.action).toBe("update");
    expect(audit.entity_type).toBe("contact_submission");
    expect(audit.actor_email).toBe("test-admin@manometr.uz");
    expect(audit.before_json).not.toBeNull();
    expect(audit.after_json).not.toBeNull();
    // before.read_at was NULL; after.read_at is non-null.
    const beforeReadAt =
      audit.before_json?.["readAt"] ?? audit.before_json?.["read_at"];
    const afterReadAt =
      audit.after_json?.["readAt"] ?? audit.after_json?.["read_at"];
    expect(beforeReadAt).toBeNull();
    expect(afterReadAt).not.toBeNull();

    // Mark unread again — read_at returns to NULL.
    const markedUnread = await markSubmissionRead({ id, isRead: false });
    expect(markedUnread.ok).toBe(true);

    const finalRow = await db.execute(
      sql`SELECT read_at FROM contact_submission WHERE id = ${id}::bigint`,
    );
    expect((finalRow.rows[0] as { read_at: string | null }).read_at).toBeNull();
  }, 20_000);

  it("exportSubmissionsCsv — returns CSV with UTF-8 BOM + audit row + the seeded submission's content", async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // Seed a row whose name + message exercise Cyrillic + Uzbek Latin oʻ
    // to verify the BOM survives the round-trip and Pitfall #9 is mitigated.
    const distinctMarker = `EXPORT-${stamp}`;
    const id = await seedSubmission({
      name: `Manometr — oʻta yaxshi`,
      email: `${stamp}@example.test`,
      message: `Манометр ${distinctMarker}, "quoted", a, b`,
    });

    const result = await exportSubmissionsCsv({});
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const { filename, csv } = result.data;

    // BOM at byte 0 (Pitfall #9 / W8).
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    // Filename shape: submissions-YYYY-MM-DD.csv.
    expect(filename).toMatch(/^submissions-\d{4}-\d{2}-\d{2}\.csv$/);
    // Header row contains the documented columns.
    expect(csv).toContain("submittedAt");
    expect(csv).toContain("name");
    expect(csv).toContain("email");
    expect(csv).toContain("message");
    // Cyrillic + Uzbek Latin survive intact.
    expect(csv).toContain("Manometr — oʻta yaxshi");
    expect(csv).toContain(`Манометр ${distinctMarker}`);
    // RFC 4180 quoting kicked in for the message (commas + quotes).
    expect(csv).toContain('""quoted""');

    // Audit row for the export action.
    const auditRows = await db.execute(sql`
      SELECT action, entity_type, entity_id, after_json
        FROM audit_log
       WHERE entity_type = 'contact_submission_export'
         AND actor_email = 'test-admin@manometr.uz'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRows.rows.length).toBeGreaterThanOrEqual(1);
    const audit = auditRows.rows[0] as {
      action: string;
      entity_type: string;
      entity_id: string;
      after_json: Record<string, unknown> | null;
    };
    expect(audit.action).toBe("update");
    expect(audit.entity_type).toBe("contact_submission_export");
    expect(audit.entity_id).toBe("batch");
    expect(audit.after_json).not.toBeNull();
    expect(audit.after_json?.["count"]).toBeGreaterThanOrEqual(1);

    // Cleanup: the helper deleted the submission row + its update audit
    // row; the export audit row is keyed entity_id='batch' so we drop the
    // matching row explicitly.
    cleanups.push(async () => {
      await db.execute(sql`
        DELETE FROM audit_log
         WHERE entity_type = 'contact_submission_export'
           AND (after_json->>'count')::int >= 1
      `);
    });

    // Hand-coded marker assertion: the CSV must contain the distinct stamp
    // we seeded so we know the row was actually included.
    expect(csv).toContain(distinctMarker);
  }, 20_000);

  it("exportSubmissionsCsv — from/to filter returns only rows inside the window", async () => {
    requireTestDatabaseUrl();

    // Seed two rows: one BEFORE the window, one INSIDE.
    const insideMarker = `INSIDE-${stamp}`;
    const outsideMarker = `OUTSIDE-${stamp}`;
    const insideAt = new Date();
    const outsideAt = new Date(insideAt.getTime() - 7 * 24 * 60 * 60 * 1000); // 7d ago

    await seedSubmission({
      name: `inside-${stamp}`,
      email: `inside-${stamp}@example.test`,
      message: insideMarker,
      submittedAt: insideAt,
    });
    await seedSubmission({
      name: `outside-${stamp}`,
      email: `outside-${stamp}@example.test`,
      message: outsideMarker,
      submittedAt: outsideAt,
    });

    // Window covers only the recent-day-ish range.
    const fromIso = new Date(
      insideAt.getTime() - 60 * 60 * 1000, // 1h before
    ).toISOString();
    const toIso = new Date(
      insideAt.getTime() + 60 * 60 * 1000, // 1h after
    ).toISOString();

    const result = await exportSubmissionsCsv({ from: fromIso, to: toIso });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const { csv } = result.data;

    expect(csv).toContain(insideMarker);
    expect(csv).not.toContain(outsideMarker);

    cleanups.push(async () => {
      const db = await getTestDb();
      await db.execute(sql`
        DELETE FROM audit_log
         WHERE entity_type = 'contact_submission_export'
           AND (after_json->>'count')::int >= 1
      `);
    });
  }, 20_000);
});
