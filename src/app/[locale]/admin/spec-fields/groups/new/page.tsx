// Plan 02-11 Task 11.4 — new spec_field_group page (RSC).

import { setRequestLocale } from "next-intl/server";
import { asc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { categories, categoryTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { GroupForm } from "../group-form";

export default async function NewGroupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const catTr = alias(categoryTranslations, "catTr");

  const categoryRows = await db
    .select({ id: categories.id, name: catTr.name })
    .from(categories)
    .leftJoin(
      catTr,
      and(eq(catTr.categoryId, categories.id), eq(catTr.locale, locale)),
    )
    .orderBy(asc(catTr.name));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New spec-field group</h1>
      <GroupForm
        locale={locale}
        categoryOptions={categoryRows.map((c) => ({
          id: c.id,
          name: c.name ?? "(untranslated)",
        }))}
      />
    </div>
  );
}
