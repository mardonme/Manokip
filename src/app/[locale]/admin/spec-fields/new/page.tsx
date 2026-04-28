// Plan 02-11 Task 11.4 — new spec field page (RSC).
//
// Loads the category + group options for the form's selects.

import { setRequestLocale } from "next-intl/server";
import { asc, eq, and, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  categories,
  categoryTranslations,
  specFieldGroups,
  specFieldGroupTranslations,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { SpecFieldForm } from "../spec-field-form";

export default async function NewSpecFieldPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const catTr = alias(categoryTranslations, "catTr");
  const grpTr = alias(specFieldGroupTranslations, "grpTr");

  const [categoryRows, groupRows] = await Promise.all([
    db
      .select({ id: categories.id, name: catTr.name })
      .from(categories)
      .leftJoin(
        catTr,
        and(eq(catTr.categoryId, categories.id), eq(catTr.locale, locale)),
      )
      .orderBy(asc(catTr.name)),
    db
      .select({
        id: specFieldGroups.id,
        label: grpTr.label,
      })
      .from(specFieldGroups)
      .leftJoin(
        grpTr,
        and(
          eq(grpTr.groupId, specFieldGroups.id),
          eq(grpTr.locale, locale),
        ),
      )
      .where(isNull(specFieldGroups.deletedAt))
      .orderBy(asc(grpTr.label)),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New spec field</h1>
      <SpecFieldForm
        locale={locale}
        categoryOptions={categoryRows.map((c) => ({
          id: c.id,
          name: c.name ?? "(untranslated)",
        }))}
        groupOptions={groupRows.map((g) => ({
          id: g.id,
          label: g.label ?? "(untranslated)",
        }))}
      />
    </div>
  );
}
