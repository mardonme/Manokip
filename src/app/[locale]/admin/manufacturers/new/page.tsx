// Plan 02-10 Task 10.3 — new manufacturer page (RSC).
//
// No parent options to fetch (manufacturers are flat), so this is the
// thinnest of the three CRUD pages — requireAdmin gate, locale set, hand
// off to ManufacturerForm with no `initial` prop (insert mode).

import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { ManufacturerForm } from "../manufacturer-form";

export default async function NewManufacturerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New manufacturer</h1>
      <ManufacturerForm locale={locale} />
    </div>
  );
}
