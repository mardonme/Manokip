// Plan 04-07 Task 7.3 — new recipe RSC route (CONT-01).
//
// Pre-fetches the published-products list for the LinkedProductsPicker,
// renders RecipeForm with empty initial values.

import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { findAllPublishedProducts } from "@/lib/products";
import { RecipeForm } from "@/components/admin/recipe-form";

type Locale = "uz" | "ru" | "en";

export default async function NewRecipePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const safeLocale: Locale =
    locale === "uz" || locale === "ru" || locale === "en"
      ? (locale as Locale)
      : "uz";

  const productOptions = await findAllPublishedProducts(safeLocale);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New recipe</h1>
      <RecipeForm
        locale={locale}
        productOptions={productOptions}
      />
    </div>
  );
}
