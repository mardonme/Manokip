// Plan 02-10 Task 10.3 — manufacturers list page (ADMIN-04).
//
// Mirrors src/app/[locale]/admin/categories/page.tsx (plan 02-09).
// Joins manufacturer_translations twice via alias() — current-locale name
// (for the row label) + uz canonical slug (sitemap SSOT per Phase-1
// guardrail). No tree, so no parent join.

import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { sql, asc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { manufacturers, manufacturerTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  ManufacturersTable,
  type ManufacturerRow,
} from "./manufacturers-table";

type SP = Promise<{ page?: string; pageSize?: string; q?: string }>;

export default async function ManufacturersPage({
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

  const tCurrent = alias(manufacturerTranslations, "tCurrent");
  const tUz = alias(manufacturerTranslations, "tUz");

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: manufacturers.id,
        logoPublicId: manufacturers.logoPublicId,
        updatedAt: manufacturers.updatedAt,
        name: tCurrent.name,
        slugUz: tUz.slug,
      })
      .from(manufacturers)
      .leftJoin(
        tCurrent,
        and(
          eq(tCurrent.manufacturerId, manufacturers.id),
          eq(tCurrent.locale, locale),
        ),
      )
      .leftJoin(
        tUz,
        and(
          eq(tUz.manufacturerId, manufacturers.id),
          eq(tUz.locale, "uz"),
        ),
      )
      .orderBy(asc(tCurrent.name))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(manufacturers),
  ]);

  const data: ManufacturerRow[] = rows.map((r) => ({
    id: r.id,
    logoPublicId: r.logoPublicId,
    name: r.name ?? "(untranslated)",
    slugUz: r.slugUz ?? "",
    // RSC -> client island: serialise Date to ISO so the boundary stays
    // structured-clone-safe. The table's cell formatter re-parses with
    // `new Date(...)` for display.
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manufacturers</h1>
        <Button
          render={
            <Link href={`/${locale}/admin/manufacturers/new`}>
              New manufacturer
            </Link>
          }
        />
      </div>
      <ManufacturersTable
        locale={locale}
        data={data}
        rowCount={Number(countRow?.count ?? 0)}
      />
    </div>
  );
}
