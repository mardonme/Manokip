// Plan 02-11 Task 11.4 — edit spec_field_group page (RSC).

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { asc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  specFieldGroups,
  specFieldGroupTranslations,
  categories,
  categoryTranslations,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LOCALES } from "@/components/admin/locale-tabs";
import type { SpecFieldGroupInput } from "@/lib/zod/spec-field-group";
import { GroupForm } from "../../group-form";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [row] = await db
    .select()
    .from(specFieldGroups)
    .where(eq(specFieldGroups.id, id))
    .limit(1);

  if (!row) notFound();

  const translationRows = await db
    .select()
    .from(specFieldGroupTranslations)
    .where(eq(specFieldGroupTranslations.groupId, id));

  const catTr = alias(categoryTranslations, "catTr");
  const categoryRows = await db
    .select({ id: categories.id, name: catTr.name })
    .from(categories)
    .leftJoin(
      catTr,
      and(eq(catTr.categoryId, categories.id), eq(catTr.locale, locale)),
    )
    .orderBy(asc(catTr.name));

  const translations = LOCALES.reduce(
    (acc, l) => {
      const t = translationRows.find((r) => r.locale === l);
      acc[l] = t ? { label: t.label } : { label: "" };
      return acc;
    },
    {} as SpecFieldGroupInput["translations"],
  );

  const initial: SpecFieldGroupInput = {
    id: row.id,
    categoryId: row.categoryId,
    key: row.key,
    sortOrder: row.sortOrder,
    translations,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit spec-field group</h1>
      <GroupForm
        locale={locale}
        initial={initial}
        categoryOptions={categoryRows.map((c) => ({
          id: c.id,
          name: c.name ?? "(untranslated)",
        }))}
      />
    </div>
  );
}
