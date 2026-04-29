// Plan 02-13b Task 13b.3 — edit product page (RSC).
//
// Fetches the canonical product row + 3 sibling translations + spec values
// + per-spec-value translations + MT flags + the category-scoped active
// spec fields catalog (via the soft-delete repository wrapper from plan
// 02-11). Reshapes everything into the ProductFormUiInput shape — including
// wrapping the Cloudinary public_ids into the `{ publicId }` objects the
// MediaUploader's useFieldArray expects.

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq, and, asc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  products,
  productTranslations,
  productSpecValues,
  productSpecValueTranslations,
  productTranslationFieldFlags,
  categories,
  categoryTranslations,
  manufacturers,
  manufacturerTranslations,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { findActiveSpecFields } from "@/lib/repositories/spec-field";
import { LOCALES, type Locale } from "@/components/admin/locale-tabs";
import type { SpecFieldOption } from "@/components/admin/spec-values-editor";
import { ProductForm } from "../../product-form";

const EMPTY_LOCALE_FIELDS = {
  name: "",
  slug: "",
  shortDesc: "",
  longDesc: "",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!row) notFound();

  const [translationRows, specValueRows, flagRows, catalog, categoryRows, manufacturerRows] =
    await Promise.all([
      db
        .select()
        .from(productTranslations)
        .where(eq(productTranslations.productId, id)),
      db
        .select()
        .from(productSpecValues)
        .where(eq(productSpecValues.productId, id))
        .orderBy(asc(productSpecValues.sortOrder)),
      db
        .select()
        .from(productTranslationFieldFlags)
        .where(eq(productTranslationFieldFlags.productId, id)),
      findActiveSpecFields(row.categoryId),
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

  // Per-spec-value translation map for the inline `translations` field.
  const specValueIds = specValueRows.map((v) => v.id);
  const specValueTranslationRows =
    specValueIds.length === 0
      ? []
      : await db
          .select()
          .from(productSpecValueTranslations)
          .where(
            inArray(productSpecValueTranslations.valueId, specValueIds),
          );

  // Reshape translations[] (3 sibling rows) into the per-locale object.
  const translations = LOCALES.reduce(
    (acc, l) => {
      const t = translationRows.find((r) => r.locale === l);
      acc[l] = t
        ? {
            name: t.name,
            slug: t.slug,
            shortDesc: t.shortDesc ?? "",
            longDesc: t.longDesc ?? "",
          }
        : { ...EMPTY_LOCALE_FIELDS };
      return acc;
    },
    {} as Record<Locale, typeof EMPTY_LOCALE_FIELDS>,
  );

  // Reshape spec values; bigint ids are coerced to strings (Drizzle returns
  // bigint for bigserial columns). The form re-uses sortOrder; numValue is
  // numeric in PG → Drizzle returns string; we coerce to number for the UI.
  const specValues = specValueRows.map((v) => {
    const translationsForValue = specValueTranslationRows.filter(
      (t) => t.valueId === v.id,
    );
    const txs: { uz?: string | null; ru?: string | null; en?: string | null } =
      {};
    for (const t of translationsForValue) {
      if (t.locale === "uz") txs.uz = t.textValue;
      else if (t.locale === "ru") txs.ru = t.textValue;
      else if (t.locale === "en") txs.en = t.textValue;
    }
    return {
      specFieldId: v.specFieldId ?? null,
      isExtra: v.isExtra,
      extraKey: v.extraKey ?? null,
      numValue: v.numValue != null ? Number(v.numValue) : null,
      textValue: v.textValue ?? null,
      enumValue: v.enumValue ?? null,
      boolValue: v.boolValue ?? null,
      unit: v.unit ?? null,
      sortOrder: v.sortOrder,
      translations:
        Object.keys(txs).length > 0 ? txs : undefined,
    };
  });

  // Reshape MT flags into the per-locale boolean map. Phase-1 stores only
  // truthy flags; the form treats absence as false.
  const mtFlags: { uz: Record<string, boolean>; ru: Record<string, boolean>; en: Record<string, boolean> } = {
    uz: {},
    ru: {},
    en: {},
  };
  for (const f of flagRows) {
    if (f.locale === "uz" || f.locale === "ru" || f.locale === "en") {
      mtFlags[f.locale][f.fieldName] = f.machineTranslated;
    }
  }

  // Cloudinary asset arrays — wrapped for MediaUploader's useFieldArray.
  // Phase-1 doesn't yet persist product images / datasheets in the DB
  // (no product_images table in this plan path), so editing always starts
  // empty. The form preserves the wrapped shape on save; the wire payload
  // flattens to string[] via the form's onSubmit transform.
  const imagePublicIds: { publicId: string }[] = [];
  const datasheetPublicIds: { publicId: string }[] = [];

  const availableSpecFields: SpecFieldOption[] = catalog.map((s) => ({
    id: s.id,
    key: s.key,
    dataType: s.dataType,
    unit: s.unit,
  }));

  const initial = {
    id: row.id,
    categoryId: row.categoryId,
    manufacturerId: row.manufacturerId,
    status: (row.status === "published" ? "published" : "draft") as
      | "draft"
      | "published",
    translations,
    specValues,
    imagePublicIds,
    datasheetPublicIds,
    mtFlags,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit product</h1>
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
        availableSpecFields={availableSpecFields}
        initial={initial}
      />
    </div>
  );
}
