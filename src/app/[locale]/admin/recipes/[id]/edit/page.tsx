// Plan 04-07 Task 7.3 — edit recipe RSC route (CONT-01).
//
// Pre-fetches the recipe + 3 translation rows + linked productIds + the
// published-products list (for the picker options), reshapes everything
// into the RecipeInput shape, renders RecipeForm with pre-filled
// defaultValues.

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  recipes,
  recipeTranslations,
  productRecipes,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { findAllPublishedProducts } from "@/lib/products";
import { RecipeForm } from "@/components/admin/recipe-form";
import { LOCALES, type Locale } from "@/components/admin/locale-tabs";
import type { RecipeInput } from "@/lib/zod/recipe";

const EMPTY_LOCALE_FIELDS = {
  title: "",
  slug: "",
  excerpt: "",
  body: null as unknown,
};

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [row] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, id))
    .limit(1);

  if (!row) notFound();

  const safeLocale: Locale =
    locale === "uz" || locale === "ru" || locale === "en"
      ? (locale as Locale)
      : "uz";

  const [translationRows, linkedRows, productOptions] = await Promise.all([
    db
      .select()
      .from(recipeTranslations)
      .where(eq(recipeTranslations.recipeId, id)),
    db
      .select({
        productId: productRecipes.productId,
        position: productRecipes.position,
      })
      .from(productRecipes)
      .where(eq(productRecipes.recipeId, id))
      .orderBy(asc(productRecipes.position)),
    findAllPublishedProducts(safeLocale),
  ]);

  // Reshape translations[] (3 sibling rows) into the per-locale object.
  const translations = LOCALES.reduce(
    (acc, l) => {
      const t = translationRows.find((r) => r.locale === l);
      acc[l] = t
        ? {
            title: t.title,
            slug: t.slug,
            excerpt: t.excerpt ?? "",
            body: t.body ?? null,
          }
        : { ...EMPTY_LOCALE_FIELDS };
      return acc;
    },
    {} as Record<Locale, typeof EMPTY_LOCALE_FIELDS>,
  );

  const initial: RecipeInput & { id?: string } = {
    id: row.id,
    status: (row.status === "published" ? "published" : "draft") as
      | "draft"
      | "published",
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    featuredImagePublicId: row.featuredImagePublicId ?? null,
    translations,
    linkedProductIds: linkedRows.map((r) => ({
      productId: r.productId,
      position: r.position,
    })),
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit recipe</h1>
      <RecipeForm
        locale={locale}
        productOptions={productOptions}
        initial={initial}
      />
    </div>
  );
}
