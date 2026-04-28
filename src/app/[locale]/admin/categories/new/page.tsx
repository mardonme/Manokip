// Plan 02-09 Task 9.3 — new category page (RSC).
//
// Fetches the parent options (current-locale name + id) so the form's
// parent select can render localized labels, then hands off to the
// CategoryForm client island with no `initial` prop (insert mode).

import { setRequestLocale } from "next-intl/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, categoryTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { CategoryForm } from "../category-form";

export default async function NewCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

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
    .orderBy(asc(categoryTranslations.name));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New category</h1>
      <CategoryForm
        locale={locale}
        parentOptions={parentOptions.map((p) => ({
          id: p.id,
          name: p.name ?? "(untranslated)",
        }))}
      />
    </div>
  );
}
