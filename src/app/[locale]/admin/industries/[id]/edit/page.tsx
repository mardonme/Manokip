// Plan 04-08 Task 8.2 — edit industry RSC route (CONT-02).
//
// Mirror of src/app/[locale]/admin/recipes/[id]/edit/page.tsx — pre-fetches
// the industry + 3 translation rows + linked productIds + the published-products
// list (for the picker options), reshapes everything into the IndustryInput
// shape, renders IndustryForm with pre-filled defaultValues.

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  industries,
  industryTranslations,
  productIndustries,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { findAllPublishedProducts } from "@/lib/products";
import { IndustryForm } from "@/components/admin/industry-form";
import { LOCALES, type Locale } from "@/components/admin/locale-tabs";
import type { IndustryInput } from "@/lib/zod/industry";

const EMPTY_LOCALE_FIELDS = {
  title: "",
  slug: "",
  excerpt: "",
  body: null as unknown,
};

export default async function EditIndustryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [row] = await db
    .select()
    .from(industries)
    .where(eq(industries.id, id))
    .limit(1);

  if (!row) notFound();

  const safeLocale: Locale =
    locale === "uz" || locale === "ru" || locale === "en"
      ? (locale as Locale)
      : "uz";

  const [translationRows, linkedRows, productOptions] = await Promise.all([
    db
      .select()
      .from(industryTranslations)
      .where(eq(industryTranslations.industryId, id)),
    db
      .select({
        productId: productIndustries.productId,
        position: productIndustries.position,
      })
      .from(productIndustries)
      .where(eq(productIndustries.industryId, id))
      .orderBy(asc(productIndustries.position)),
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

  const initial: IndustryInput & { id?: string } = {
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
      <h1 className="text-2xl font-semibold">Edit industry</h1>
      <IndustryForm
        locale={locale}
        productOptions={productOptions}
        initial={initial}
      />
    </div>
  );
}
