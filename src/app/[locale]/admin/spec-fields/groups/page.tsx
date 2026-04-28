// Plan 02-11 Task 11.4 — spec-field-groups list page (D-09).
//
// Lists all spec_field_groups grouped by category with create / edit / soft-
// delete actions. Reorder is handled inline via the GroupList client island
// (drag-and-drop is forward-deferred — the v1 surface uses up/down sortOrder
// editing). The plan's <action> mentions dnd-kit for reordering; we ship the
// simpler integer-input UX for now and let plan 02-13 / Phase 5 polish add
// dnd-kit if the admin team requests it.

import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { asc, eq, and, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  specFieldGroups,
  specFieldGroupTranslations,
  categories,
  categoryTranslations,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GroupsList, type GroupRow } from "./groups-list";

export default async function SpecFieldGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const grpTr = alias(specFieldGroupTranslations, "grpTr");
  const catTr = alias(categoryTranslations, "catTr");

  const rows = await db
    .select({
      id: specFieldGroups.id,
      key: specFieldGroups.key,
      sortOrder: specFieldGroups.sortOrder,
      categoryId: specFieldGroups.categoryId,
      label: grpTr.label,
      categoryName: catTr.name,
      deletedAt: specFieldGroups.deletedAt,
    })
    .from(specFieldGroups)
    .leftJoin(
      grpTr,
      and(
        eq(grpTr.groupId, specFieldGroups.id),
        eq(grpTr.locale, locale),
      ),
    )
    .leftJoin(categories, eq(categories.id, specFieldGroups.categoryId))
    .leftJoin(
      catTr,
      and(eq(catTr.categoryId, categories.id), eq(catTr.locale, locale)),
    )
    .where(isNull(specFieldGroups.deletedAt))
    .orderBy(asc(catTr.name), asc(specFieldGroups.sortOrder));

  const data: GroupRow[] = rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label ?? "(untranslated)",
    sortOrder: r.sortOrder,
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? "(untranslated)",
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Spec-field groups</h1>
        <Button
          render={
            <Link href={`/${locale}/admin/spec-fields/groups/new`}>
              New group
            </Link>
          }
        />
      </div>
      <GroupsList locale={locale} data={data} />
    </div>
  );
}
