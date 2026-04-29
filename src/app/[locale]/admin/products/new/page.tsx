// Plan 02-13b Task 13b.3 — new product page (RSC).
//
// Fetches the category + manufacturer choice lists localized to the current
// request locale. The active spec_fields list is empty until the admin
// picks a category in the editor — re-keying it on category change is a
// follow-up (deferred to a Phase-2 polish plan); v1 ships with the spec
// editor disabled when no category has been chosen.

import { setRequestLocale } from "next-intl/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  categories,
  categoryTranslations,
  manufacturers,
  manufacturerTranslations,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ProductForm } from "../product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [categoryRows, manufacturerRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categoryTranslations.name })
      .from(categories)
      .leftJoin(
        categoryTranslations,
        and(
          eq(categoryTranslations.categoryId, categories.id),
          eq(categoryTranslations.locale, locale),
        ),
      )
      .orderBy(asc(categoryTranslations.name)),
    db
      .select({
        id: manufacturers.id,
        name: manufacturerTranslations.name,
      })
      .from(manufacturers)
      .leftJoin(
        manufacturerTranslations,
        and(
          eq(manufacturerTranslations.manufacturerId, manufacturers.id),
          eq(manufacturerTranslations.locale, locale),
        ),
      )
      .orderBy(asc(manufacturerTranslations.name)),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New product</h1>
      <ProductForm
        locale={locale}
        categoryOptions={categoryRows.map((r) => ({
          id: r.id,
          name: r.name ?? "(untranslated)",
        }))}
        manufacturerOptions={manufacturerRows.map((r) => ({
          id: r.id,
          name: r.name ?? "(untranslated)",
        }))}
        availableSpecFields={[]}
      />
    </div>
  );
}
