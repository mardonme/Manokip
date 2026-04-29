// Plan 02-15 Task 15.3 — submissions inbox RSC (ADMIN-12).
//
// Server-paginated list of contact_submission rows ordered by submitted_at
// desc. The optional `q` searches name + email + message via ILIKE; the
// optional `unread` boolean trims to read_at IS NULL; optional `from`/`to`
// trim to submitted_at within the window. Filters live in the URL via the
// nuqs-driven DataTable toolbar so admin-shared inbox views stay shareable.
//
// Mirrors src/app/[locale]/admin/manufacturers/page.tsx (plan 02-10) and
// src/app/[locale]/admin/products/page.tsx (plan 02-13b) — same RSC →
// client island shape. Date filters round-trip through ISO strings; the
// table component re-parses for the date input.

import { setRequestLocale } from "next-intl/server";
import { sql, desc, and, ilike, isNull, isNotNull, gte, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { contactSubmissions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { SubmissionsTable, type SubmissionRow } from "./submissions-table";

type SP = Promise<{
  page?: string;
  pageSize?: string;
  q?: string;
  unread?: string;
  from?: string;
  to?: string;
}>;

export default async function SubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 20)));
  const q = (sp.q ?? "").trim();
  const unreadOnly = sp.unread === "1";
  const from = sp.from ? safeDate(sp.from) : null;
  const to = sp.to ? safeDate(sp.to) : null;

  const conditions = [];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(contactSubmissions.name, pattern),
        ilike(contactSubmissions.email, pattern),
        ilike(contactSubmissions.message, pattern),
      ),
    );
  }
  if (unreadOnly) conditions.push(isNull(contactSubmissions.readAt));
  if (from) conditions.push(gte(contactSubmissions.submittedAt, from));
  if (to) conditions.push(lte(contactSubmissions.submittedAt, to));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: contactSubmissions.id,
        name: contactSubmissions.name,
        email: contactSubmissions.email,
        company: contactSubmissions.company,
        message: contactSubmissions.message,
        sourcePage: contactSubmissions.sourcePage,
        submittedAt: contactSubmissions.submittedAt,
        readAt: contactSubmissions.readAt,
      })
      .from(contactSubmissions)
      .where(where)
      .orderBy(desc(contactSubmissions.submittedAt))
      .limit(size)
      .offset((page - 1) * size),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contactSubmissions)
      .where(where),
  ]);

  const data: SubmissionRow[] = rows.map((r) => ({
    // bigserial id surfaced as a string so the client island can pass it
    // back unchanged through the Server Action boundary (FormData/fetch
    // can't carry BigInt).
    id: String(r.id),
    name: r.name ?? "",
    email: r.email ?? "",
    company: r.company ?? "",
    message: r.message,
    sourcePage: r.sourcePage ?? "",
    submittedAt: r.submittedAt.toISOString(),
    readAt: r.readAt ? r.readAt.toISOString() : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Submissions</h1>
      </div>
      <SubmissionsTable
        locale={locale}
        data={data}
        rowCount={Number(countRow?.count ?? 0)}
        unreadOnly={unreadOnly}
        from={sp.from ?? ""}
        to={sp.to ?? ""}
      />
    </div>
  );
}

/**
 * Defensive ISO/YYYY-MM-DD parser. The URL params are admin-controlled but
 * we still validate before passing into Drizzle's `gte`/`lte` so a typo
 * doesn't surface as a 500 in the RSC.
 */
function safeDate(input: string): Date | null {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}
