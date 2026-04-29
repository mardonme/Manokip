// Plan 02-16 Task 16.1 — audit log viewer RSC (ADMIN-11 / D-17).
//
// Read-only surface. The audit_log table is append-only by convention —
// every other Phase-2 plan writes rows via logAudit() inside its mutation
// transactions; THIS page never mutates. There are no Server Actions in
// this directory; the read-only invariant is structural (the absence of
// mutation primitives is the boundary).
//
// Server-paginated query of audit_log ordered by `at DESC`, default
// 50/page (D-17 / plan literal). Filters live in the URL (D-17): actor
// email (ILIKE), action (eq), entity_type (eq), from/to (gte/lte on
// `at`). Every filter goes through Drizzle's parameterized helpers so
// the threat model T-02-16-01 (SQL injection via filter params) is
// mitigated by construction. pageSize is clamped 1..100 (T-02-16-04
// DoS via unbounded paging).
//
// Mirrors src/app/[locale]/admin/submissions/page.tsx (plan 02-15) — the
// closest analog for a server-paginated RSC with URL-driven filters.

import { setRequestLocale } from "next-intl/server";
import { sql, and, eq, gte, lte, desc, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { AuditTable, type AuditRow } from "./audit-table";

type SP = Promise<{
  page?: string;
  pageSize?: string;
  actor?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}>;

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Defense-in-depth: the /[locale]/admin/* edge gate (proxy.ts) already
  // 307-redirects unauth requests, but the RSC re-checks per CLAUDE.md
  // mandate and the threat model expectation that every admin page
  // explicitly requires admin.
  await requireAdmin();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  // T-02-16-04: pageSize clamped 1..100 even though the typical default
  // for the audit viewer is 50/page (plan literal). A query string of
  // `?pageSize=999999` cannot blow up the LIMIT.
  const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 50)));

  const actor = (sp.actor ?? "").trim();
  const action = (sp.action ?? "").trim();
  const entityType = (sp.entityType ?? "").trim();
  const from = sp.from ? safeDate(sp.from) : null;
  const to = sp.to ? safeDate(sp.to) : null;

  const conditions = [];
  // ILIKE on actor_email so a partial email like "alice" matches
  // "alice@manometr.uz". Drizzle parameterizes the pattern (T-02-16-01).
  if (actor) conditions.push(ilike(auditLog.actorEmail, `%${actor}%`));
  if (action) conditions.push(eq(auditLog.action, action));
  if (entityType) conditions.push(eq(auditLog.entityType, entityType));
  if (from) conditions.push(gte(auditLog.at, from));
  if (to) conditions.push(lte(auditLog.at, to));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.at))
      .limit(size)
      .offset((page - 1) * size),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(where),
  ]);

  const data: AuditRow[] = rows.map((r) => ({
    // bigserial id surfaced as a string so the client island can carry
    // it through React keys / data-testid attributes without BigInt
    // serialization drama (same posture as submissions inbox).
    id: String(r.id),
    at: r.at.toISOString(),
    actorEmail: r.actorEmail ?? "",
    action: r.action ?? "",
    entityType: r.entityType ?? "",
    entityId: r.entityId ?? "",
    ip: r.ip ?? "",
    userAgent: r.userAgent ?? "",
    beforeJson: r.beforeJson ?? null,
    afterJson: r.afterJson ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
      </div>
      <AuditTable
        data={data}
        rowCount={Number(countRow?.count ?? 0)}
        actor={actor}
        action={action}
        entityType={entityType}
        from={sp.from ?? ""}
        to={sp.to ?? ""}
      />
    </div>
  );
}

/**
 * Defensive ISO/YYYY-MM-DD parser. URL params are admin-controlled but a
 * typo shouldn't surface as a 500 in the RSC — same posture as the
 * submissions inbox safeDate.
 */
function safeDate(input: string): Date | null {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}
