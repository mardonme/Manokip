// Plan 02-07 Task 7.3 — admins list page (ADMIN-02 / D-14).
//
// RSC server-paginates over admin_user using the canonical 4-line opener
// (params Promise -> setRequestLocale -> requireAdmin -> render). Threads
// the already-paginated slice + total rowCount into the AdminsTable client
// island, which renders columns via the generic DataTable<TData> primitive
// from plan 02-06.
//
// Closest analog: src/app/[locale]/admin/page.tsx (RSC + locale + auth)
// + 02-PATTERNS.md §`src/app/[locale]/admin/products/page.tsx (NEW — RSC
// list with DataTable)`.

import { setRequestLocale } from 'next-intl/server';
import { sql, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { AdminsTable, type AdminRow } from './admins-table';

type SP = Promise<{ page?: string; pageSize?: string; q?: string }>;

export default async function AdminsPage({
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

  // Read slice + total in parallel (Phase-2 02-PATTERNS canonical RSC list
  // shape). createdAt DESC so the most recently invited admins land on top.
  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        email: adminUsers.email,
        role: adminUsers.role,
        active: adminUsers.active,
        invitedBy: adminUsers.invitedBy,
        invitedAt: adminUsers.invitedAt,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(adminUsers),
  ]);

  // Drizzle returns Date objects for timestamp columns; AdminRow expects
  // strings (the client component renders them via toLocaleString) so we
  // serialize at the RSC boundary — never pass non-serializable values
  // across the server/client boundary.
  const data: AdminRow[] = rows.map((r) => ({
    email: r.email,
    role: r.role,
    active: r.active,
    invitedBy: r.invitedBy ?? null,
    invitedAt: r.invitedAt ? r.invitedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admins</h1>
      </div>
      <AdminsTable data={data} rowCount={Number(countRow?.count ?? 0)} />
    </div>
  );
}
