// Plan 04-08 Task 8.2 — new industry RSC route (CONT-02).
//
// Mirror of src/app/[locale]/admin/recipes/new/page.tsx — pre-fetches the
// published-products list for the LinkedProductsPicker (reused verbatim from
// 04-07), renders IndustryForm with empty initial values.

import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { findAllPublishedProducts } from "@/lib/products";
import { IndustryForm } from "@/components/admin/industry-form";

type Locale = "uz" | "ru" | "en";

export default async function NewIndustryPage({
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
      <h1 className="text-2xl font-semibold">New industry</h1>
      <IndustryForm
        locale={locale}
        productOptions={productOptions}
      />
    </div>
  );
}
