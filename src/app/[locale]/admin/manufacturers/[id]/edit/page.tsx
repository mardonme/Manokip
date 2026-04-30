// Plan 02-10 Task 10.3 — edit manufacturer page (RSC).
//
// Mirrors the categories edit page (plan 02-09). Fetches the canonical
// manufacturer row + 3 translations and reshapes them into the
// ManufacturerInput form-default shape so RHF's `defaultValues` populates
// every field including the logoPublicId for the MediaUploader.

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { manufacturers, manufacturerTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LOCALES } from "@/components/admin/locale-tabs";
import type { ManufacturerInput } from "@/lib/zod/manufacturer";
import { ManufacturerForm } from "../../manufacturer-form";

export default async function EditManufacturerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const [row] = await db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.id, id))
    .limit(1);

  if (!row) notFound();

  const translationRows = await db
    .select()
    .from(manufacturerTranslations)
    .where(eq(manufacturerTranslations.manufacturerId, id));

  // Reshape the 3 sibling rows into the ManufacturerInput.translations
  // object. Falls back to empty when a locale row is missing — the editor
  // will surface the locale tab as untouched.
  // Plan 03-07 (D-11): include relationshipNote per-locale so the form's
  // Textarea defaults to the persisted value.
  const emptyLocale = {
    name: "",
    slug: "",
    description: "",
    relationshipNote: "",
  };
  const translations = LOCALES.reduce(
    (acc, l) => {
      const t = translationRows.find((r) => r.locale === l);
      acc[l] = t
        ? {
            name: t.name,
            slug: t.slug,
            description: t.description ?? "",
            relationshipNote: t.relationshipNote ?? "",
          }
        : { ...emptyLocale };
      return acc;
    },
    {} as ManufacturerInput["translations"],
  );

  const initial: ManufacturerInput = {
    id: row.id,
    logoPublicId: row.logoPublicId,
    isOfficialRep: row.isOfficialRep,
    translations,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit manufacturer</h1>
      <ManufacturerForm locale={locale} initial={initial} />
    </div>
  );
}
