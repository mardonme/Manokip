// Plan 02-09 Task 9.3 — edit category page (RSC).
//
// Fetches the canonical row + all 3 translations + parent options, then
// reshapes them into the CategoryInput form-default shape so RHF's
// `defaultValues` populates every field.

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq, and, asc, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LOCALES } from "@/components/admin/locale-tabs";
import type { CategoryInput } from "@/lib/zod/category";
import { CategoryForm } from "../../category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!row) notFound();

  const translationRows = await db
    .select()
    .from(categoryTranslations)
    .where(eq(categoryTranslations.categoryId, id));

  // Reshape the 3 sibling rows into the CategoryInput.translations object.
  const emptyLocale = { name: "", slug: "", description: "" };
  const translations = LOCALES.reduce(
    (acc, l) => {
      const t = translationRows.find((r) => r.locale === l);
      acc[l] = t
        ? {
            name: t.name,
            slug: t.slug,
            description: t.description ?? "",
          }
        : { ...emptyLocale };
      return acc;
    },
    {} as CategoryInput["translations"],
  );

  const initial: CategoryInput = {
    id: row.id,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    translations,
  };

  // Parent options exclude self to prevent the form from offering a
  // self-loop (T-02-09-02 form-level guard; DB CHECK does not enforce).
  const parentOptions = await db
    .select({
      id: categories.id,
      name: categoryTranslations.name,
    })
    .from(categories)
    .leftJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.categoryId, categories.id),
        eq(categoryTranslations.locale, locale),
      ),
    )
    .where(ne(categories.id, id))
    .orderBy(asc(categoryTranslations.name));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit category</h1>
      <CategoryForm
        locale={locale}
        parentOptions={parentOptions.map((p) => ({
          id: p.id,
          name: p.name ?? "(untranslated)",
        }))}
        initial={initial}
      />
    </div>
  );
}
