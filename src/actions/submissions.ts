"use server";

// Plan 02-15 Task 15.2 — submissions Server Actions (ADMIN-12 + ADMIN-11).
//
// Two actions, both wrapped by withAdminAction (D-15..D-17 admin gate +
// Zod allowlist + discriminated AdminActionResult):
//
//   markSubmissionRead({ id, isRead }):
//     1. Pre-tx: capture before snapshot for the audit row.
//     2. dbTx.transaction:
//          - UPDATE contact_submission SET read_at = $now-or-null WHERE id.
//          - logAudit(tx, action='update', entity_type='contact_submission',
//            before, after) — atomic with the mutation (D-16).
//     3. No revalidate — the inbox is admin-only; nothing public consumes
//        contact_submission. revalidateSubmissionsCollection is a no-op
//        (src/lib/revalidation.ts:110); we omit the call entirely.
//
//   exportSubmissionsCsv({ from?, to?, isRead? }):
//     1. Read the filtered rows (LIMIT 10_000 hard cap — T-02-15-04 DoS
//        mitigation; Phase 5 streaming + retention will lift the cap).
//     2. Pass through the CSV writer (UTF-8 BOM + RFC 4180 quoting — Pitfall #9 +
//        T-02-15-01).
//     3. Audit the export with entity_type='contact_submission_export',
//        entity_id='batch', after.count + after.filter (T-02-15-05 —
//        admin denying the export). The action enum value is 'update' —
//        the closed AUDIT_ACTIONS set (src/lib/audit.ts:28-42) does not
//        carry an 'export' verb; entity_type='contact_submission_export'
//        already disambiguates from row mutations on contact_submission.
//
// Closest analog: src/actions/manufacturers.ts (universal Server Action
// shape, verified five times across categories/manufacturers/spec-fields/
// spec-field-groups/products in plans 02-09..02-13b).

import { eq, and, gte, lte, desc, isNull, isNotNull, sql } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import { db } from "@/db/client";
import { contactSubmissions } from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { markReadSchema, exportSchema } from "@/lib/zod/submission";
import { toCsv } from "@/lib/csv";

/**
 * Project a contact_submission row into a plain JSON-safe object: the
 * bigserial id arrives as a JS BigInt which `JSON.stringify` cannot
 * serialise (throws TypeError). We stringify the id before handing the
 * snapshot to logAudit; every other column already serialises cleanly
 * (Date → ISO string via Drizzle's jsonb mapper).
 */
function serialiseSubmission(
  row: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!row) return null;
  return { ...row, id: String(row.id) };
}

export const markSubmissionRead = withAdminAction(
  markReadSchema,
  async ({ id, isRead }, ctx) => {
    // 1. Pre-tx snapshot — required for audit before_json.
    const before =
      (
        await dbTx
          .select()
          .from(contactSubmissions)
          .where(eq(contactSubmissions.id, id))
          .limit(1)
      )[0] ?? null;
    if (!before) {
      // Same NOT_FOUND posture as deleteManufacturer (plan 02-10) —
      // withAdminAction maps to { ok:false, error:'unknown' } without
      // leaking unknown vs. forbidden.
      throw new Error("NOT_FOUND");
    }

    const result = await dbTx.transaction(async (tx) => {
      const [row] = await tx
        .update(contactSubmissions)
        .set({ readAt: isRead ? new Date() : null })
        .where(eq(contactSubmissions.id, id))
        .returning();

      if (!row) {
        throw new Error("contact_submission row not found after update");
      }

      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "update",
        entityType: "contact_submission",
        // audit_log.entity_id is text — stringify the bigint so the column
        // round-trips cleanly. The before/after JSONB columns can't carry
        // a JS BigInt (JSON.stringify throws), so we project the bigint
        // id into a string before logging. Rest of the row is preserved.
        entityId: String(id),
        before: serialiseSubmission(before),
        after: serialiseSubmission(row),
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return row;
    });

    // No public-facing tag exists for contact_submission (D-10);
    // revalidateSubmissionsCollection is intentionally a no-op.
    return result;
  },
);

export const exportSubmissionsCsv = withAdminAction(
  exportSchema,
  async (filter, ctx) => {
    // Build WHERE clauses from the allowlisted filter fields. Anything
    // not in exportSchema was already dropped by Zod (T-02-15-03).
    const conditions = [];
    if (filter.from) {
      conditions.push(
        gte(contactSubmissions.submittedAt, new Date(filter.from)),
      );
    }
    if (filter.to) {
      conditions.push(
        lte(contactSubmissions.submittedAt, new Date(filter.to)),
      );
    }
    if (filter.isRead === true) {
      conditions.push(isNotNull(contactSubmissions.readAt));
    } else if (filter.isRead === false) {
      conditions.push(isNull(contactSubmissions.readAt));
    }

    // Fetch the filtered slice. LIMIT 10_000 is the hard cap (T-02-15-04
    // DoS mitigation). Phase 5 will swap this for a streamed export.
    const rows = await db
      .select()
      .from(contactSubmissions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(contactSubmissions.submittedAt))
      .limit(10_000);

    const csv = toCsv(
      rows.map((r) => ({
        submittedAt: r.submittedAt.toISOString(),
        name: r.name ?? "",
        email: r.email ?? "",
        company: r.company ?? "",
        phone: r.phone ?? "",
        locale: r.locale ?? "",
        sourcePage: r.sourcePage ?? "",
        message: r.message,
        readAt: r.readAt ? r.readAt.toISOString() : "",
      })),
      [
        "submittedAt",
        "name",
        "email",
        "company",
        "phone",
        "locale",
        "sourcePage",
        "message",
        "readAt",
      ],
    );

    // Audit the export inside a tx so the audit row commits atomically.
    // No row mutation happens here, but D-16 still requires the audit
    // write to ride on a tx boundary so a partial DB error doesn't leak
    // a phantom export record.
    await dbTx.transaction(async (tx) => {
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: "update",
        entityType: "contact_submission_export",
        entityId: "batch",
        before: null,
        after: { count: rows.length, filter },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    });

    const filename = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    return { filename, csv };
  },
);
