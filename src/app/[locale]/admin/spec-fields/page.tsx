// Plan 02-11 Task 11.4 — spec-fields list page (ADMIN-05).
//
// Lists ALL spec_fields across the project (typically ~80 rows project-wide
// per Open Q §3 of plan 02-11), grouped visually by category. Admin sees
// soft-deleted rows by default since the editor needs to surface them for
// recovery / hard-delete actions; Phase 3 public reads filter via the
// repository wrapper.
//
// Posture (Open Q §3):
//   - Client-side pagination — DataTable receives `manualPagination={false}`
//     so the toolbar / pagination / sort all run in memory. ~80 rows is too
//     small to justify the server-pagination wiring overhead.
//
// Joins:
//   - spec_field_translations.label in the current request locale (for the
//     row label) — alias()'d so we can pull the canonical row.
//   - category_translations.name in the current request locale (so the
//     "Category" column is human-readable).
//   - spec_field_group_translations.label in the current request locale
//     for the optional "Group" column (LEFT JOIN — fields without a group
//     show "—").

import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { asc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  specFields,
  specFieldTranslations,
  categories,
  categoryTranslations,
  specFieldGroups,
  specFieldGroupTranslations,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SpecFieldsTable, type SpecFieldRow } from "./spec-fields-table";

export default async function SpecFieldsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const sfTr = alias(specFieldTranslations, "sfTr");
  const catTr = alias(categoryTranslations, "catTr");
  const grpTr = alias(specFieldGroupTranslations, "grpTr");

  const rows = await db
    .select({
      id: specFields.id,
      key: specFields.key,
      dataType: specFields.dataType,
      unit: specFields.unit,
      required: specFields.required,
      filterKind: specFields.filterKind,
      filterGroupKey: specFields.filterGroupKey,
      sortOrder: specFields.sortOrder,
      deletedAt: specFields.deletedAt,
      categoryId: specFields.categoryId,
      groupId: specFields.groupId,
      label: sfTr.label,
      categoryName: catTr.name,
      groupLabel: grpTr.label,
    })
    .from(specFields)
    .leftJoin(
      sfTr,
      and(
        eq(sfTr.specFieldId, specFields.id),
        eq(sfTr.locale, locale),
      ),
    )
    .leftJoin(categories, eq(categories.id, specFields.categoryId))
    .leftJoin(
      catTr,
      and(
        eq(catTr.categoryId, categories.id),
        eq(catTr.locale, locale),
      ),
    )
    .leftJoin(specFieldGroups, eq(specFieldGroups.id, specFields.groupId))
    .leftJoin(
      grpTr,
      and(
        eq(grpTr.groupId, specFieldGroups.id),
        eq(grpTr.locale, locale),
      ),
    )
    .orderBy(asc(catTr.name), asc(specFields.sortOrder));

  const data: SpecFieldRow[] = rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label ?? "(untranslated)",
    dataType: r.dataType,
    unit: r.unit,
    required: r.required,
    filterKind: r.filterKind,
    filterGroupKey: r.filterGroupKey,
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? "(untranslated)",
    groupId: r.groupId,
    groupLabel: r.groupLabel,
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Spec fields</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={
              <Link href={`/${locale}/admin/spec-fields/groups`}>
                Manage groups
              </Link>
            }
          />
          <Button
            render={
              <Link href={`/${locale}/admin/spec-fields/new`}>
                New spec field
              </Link>
            }
          />
        </div>
      </div>
      <SpecFieldsTable locale={locale} data={data} />
    </div>
  );
}
