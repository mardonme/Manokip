// Plan 02-09 Task 9.3 — categories list page (ADMIN-03).
//
// RSC server-paginates over the `category` table joined with the
// per-locale `category_translations` row for the current request locale,
// so the list can render localized names without a client-side join. The
// parent name (also localized via the same join) renders as a chip in the
// table, and the locale-uz slug surfaces because the canonical sitemap
// + product URL slug is the uz locale (CLAUDE.md / Phase-1 guardrail).
//
// Closest analog: src/app/[locale]/admin/admins/page.tsx (RSC opener,
// locale, requireAdmin, parallel slice + count fetch).

import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { sql, asc, eq, and, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { categories, categoryTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CategoriesTable, type CategoryRow } from "./categories-table";

type SP = Promise<{ page?: string; pageSize?: string; q?: string }>;

export default async function CategoriesPage({
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

  // Resolve the translation alias once so we can join twice (current
  // locale for the row label + uz for the canonical slug + parent name).
  const tCurrent = alias(categoryTranslations, "tCurrent");
  const tUz = alias(categoryTranslations, "tUz");
  const tParent = alias(categoryTranslations, "tParent");

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        name: tCurrent.name,
        slugUz: tUz.slug,
        parentName: tParent.name,
      })
      .from(categories)
      .leftJoin(
        tCurrent,
        and(
          eq(tCurrent.categoryId, categories.id),
          eq(tCurrent.locale, locale),
        ),
      )
      .leftJoin(
        tUz,
        and(eq(tUz.categoryId, categories.id), eq(tUz.locale, "uz")),
      )
      .leftJoin(
        tParent,
        and(
          eq(tParent.categoryId, categories.parentId),
          eq(tParent.locale, locale),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(tCurrent.name))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(categories),
  ]);

  // Fall back to the uz translation when the requested locale doesn't yet
  // have a translation row (D-04 informational behavior — admins may save a
  // category before completing all 3 locales).
  void isNotNull;
  const data: CategoryRow[] = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    sortOrder: r.sortOrder,
    name: r.name ?? "(untranslated)",
    slugUz: r.slugUz ?? "",
    parentName: r.parentName,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Button render={<Link href={`/${locale}/admin/categories/new`}>New category</Link>} />
      </div>
      <CategoriesTable
        locale={locale}
        data={data}
        rowCount={Number(countRow?.count ?? 0)}
      />
    </div>
  );
}
