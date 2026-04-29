// Plan 02-13b Task 13b.2 — products list page (RSC, ADMIN-04 / ADMIN-08).
//
// Mirrors src/app/[locale]/admin/manufacturers/page.tsx (plan 02-10) with
// two product-specific extras:
//
//   1. <TranslationDots/> column (D-04 / ADMIN-10) — batched per-row 3-locale
//      completeness via findCompletenessForProducts(productIds[]). The view
//      bound is pageSize ≤ 100 (T-02-12-02), enforced here by clamping the
//      `pageSize` query param.
//
//   2. Per-row lifecycle row actions (Edit / Duplicate / Publish | Unpublish
//      / Delete) — implemented in the `<ProductsTable>` client island. The
//      page itself only fetches data; the lifecycle Server Actions are
//      called from the client with React.useTransition.
//
// Joins product_translations twice via alias() — current-locale name + uz
// slug (sitemap SSOT). No tree, so no parent join.

import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { sql, asc, desc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { products, productTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { findCompletenessForProducts } from "@/lib/translation-completeness";
import { Button } from "@/components/ui/button";
import { ProductsTable, type ProductRow } from "./products-table";

type SP = Promise<{ page?: string; pageSize?: string; q?: string }>;

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SP;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  // Bounded by T-02-12-02 — the completeness view fan-out is keyed
  // pageSize, so capping here matches the helper contract.
  const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 20)));

  const tCurrent = alias(productTranslations, "tCurrent");
  const tUz = alias(productTranslations, "tUz");

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: products.id,
        status: products.status,
        publishedAt: products.publishedAt,
        updatedAt: products.updatedAt,
        name: tCurrent.name,
        slugUz: tUz.slug,
      })
      .from(products)
      .leftJoin(
        tCurrent,
        and(
          eq(tCurrent.productId, products.id),
          eq(tCurrent.locale, locale),
        ),
      )
      .leftJoin(
        tUz,
        and(eq(tUz.productId, products.id), eq(tUz.locale, "uz")),
      )
      .orderBy(desc(products.updatedAt))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(products),
  ]);

  // Batched per-row completeness lookup. The pgView reads non-materialized
  // so this is a single SELECT scoped to the page's product_ids; cap is the
  // 100-row pageSize clamp above.
  const completenessByProduct = await findCompletenessForProducts(
    rows.map((r) => r.id),
  );

  const data: ProductRow[] = rows.map((r) => ({
    id: r.id,
    status: (r.status === "published" ? "published" : "draft") as
      | "draft"
      | "published",
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    name: r.name ?? "(untranslated)",
    slugUz: r.slugUz ?? "",
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button
          render={<Link href={`/${locale}/admin/products/new`}>New product</Link>}
        />
      </div>
      <ProductsTable
        locale={locale}
        data={data}
        rowCount={Number(countRow?.count ?? 0)}
        completenessByProduct={completenessByProduct}
      />
    </div>
  );
}
