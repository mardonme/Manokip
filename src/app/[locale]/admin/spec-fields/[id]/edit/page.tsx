// Plan 02-11 Task 11.4 — edit spec field page (RSC).
//
// Fetches the canonical row + 3 translations + impact summary
// (COUNT(*) FROM product_spec_values WHERE spec_field_id = id) so the
// editor's footer can display "N products use this field" — informs the
// admin before they soft-delete or rename. Reshapes into SpecFieldInput.

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { asc, eq, and, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  specFields,
  specFieldTranslations,
  productSpecValues,
  categories,
  categoryTranslations,
  specFieldGroups,
  specFieldGroupTranslations,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LOCALES } from "@/components/admin/locale-tabs";
import type { SpecFieldInput } from "@/lib/zod/spec-field";
import { SpecFieldForm } from "../../spec-field-form";

export default async function EditSpecFieldPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [row] = await db
    .select()
    .from(specFields)
    .where(eq(specFields.id, id))
    .limit(1);

  if (!row) notFound();

  const translationRows = await db
    .select()
    .from(specFieldTranslations)
    .where(eq(specFieldTranslations.specFieldId, id));

  // Impact summary — drives the admin's mental model before they soft- or
  // hard-delete.
  const [impactRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productSpecValues)
    .where(eq(productSpecValues.specFieldId, id));
  const productCount = Number(impactRow?.count ?? 0);

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
      .select({ id: specFieldGroups.id, label: grpTr.label })
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

  // Reshape into SpecFieldInput.
  const emptyLocale = { label: "", helpText: "" };
  const translations = LOCALES.reduce(
    (acc, l) => {
      const t = translationRows.find((r) => r.locale === l);
      acc[l] = t
        ? { label: t.label, helpText: "" }
        : { ...emptyLocale };
      return acc;
    },
    {} as SpecFieldInput["translations"],
  );

  const initial: SpecFieldInput = {
    id: row.id,
    categoryId: row.categoryId,
    key: row.key,
    dataType: row.dataType,
    unit: row.unit ?? null,
    required: row.required,
    filterKind: row.filterKind ?? null,
    filterGroupKey: row.filterGroupKey ?? null,
    groupId: row.groupId ?? null,
    sortOrder: row.sortOrder,
    translations,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Edit spec field</h1>
        <p className="text-sm text-muted-foreground">
          {productCount === 0
            ? "No products reference this field yet."
            : `${productCount} product${productCount === 1 ? "" : "s"} reference this field.`}
        </p>
      </div>
      <SpecFieldForm
        locale={locale}
        initial={initial}
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
