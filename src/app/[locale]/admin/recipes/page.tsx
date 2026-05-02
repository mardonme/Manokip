// Plan 04-07 Task 7.3 — recipes admin list page (CONT-01 / ADMIN-04).
//
// Mirrors src/app/[locale]/admin/products/page.tsx with two simplifications:
//   - No category/manufacturer joins (recipes don't have either).
//   - Per-row TranslationDots are computed in JS over recipe_translations
//     row counts rather than a dedicated pgView (recipe completeness is just
//     "has the locale's title + body been written" — adequate for v1; a
//     fuller view can land alongside the industry surface in 04-08 if needed).
//
// Admins see ALL recipes (drafts + published) — only the public RSC filters
// by status (D-03 / T-04-INFO-01). Lifecycle row actions live in the
// `<RecipesTable>` client island (recipes-table.tsx).

import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { sql, desc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { recipes, recipeTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  RecipesTable,
  type RecipeRow,
  type CompletenessByLocale,
} from "./recipes-table";
import type { JSONContent } from "@tiptap/core";

type SP = Promise<{ page?: string; pageSize?: string }>;

/**
 * Same Tiptap "is filled" heuristic as src/lib/recipes.ts (Phase-3 D-05
 * cascade). An empty paragraph (Tiptap default content) does NOT count.
 */
function isTiptapDocFilled(doc: unknown): boolean {
  if (doc == null || typeof doc !== "object") return false;
  const d = doc as JSONContent;
  if (!d.content || d.content.length === 0) return false;
  const onlyEmptyParas = d.content.every(
    (n) =>
      n.type === "paragraph" && (!n.content || n.content.length === 0),
  );
  return !onlyEmptyParas;
}

export default async function RecipesPage({
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
  const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 20)));

  const tCurrent = alias(recipeTranslations, "tCurrent");
  const tUz = alias(recipeTranslations, "tUz");

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: recipes.id,
        status: recipes.status,
        publishedAt: recipes.publishedAt,
        updatedAt: recipes.updatedAt,
        title: tCurrent.title,
        slugUz: tUz.slug,
      })
      .from(recipes)
      .leftJoin(
        tCurrent,
        and(
          eq(tCurrent.recipeId, recipes.id),
          eq(tCurrent.locale, locale),
        ),
      )
      .leftJoin(
        tUz,
        and(eq(tUz.recipeId, recipes.id), eq(tUz.locale, "uz")),
      )
      .orderBy(desc(recipes.updatedAt))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(recipes),
  ]);

  // Per-row completeness — fetch the 3 translation rows for the page's
  // recipe ids, then compute "title written" + "body filled" → 0-100% per
  // locale. Two-bit logic (each filled field ⇒ 50%); v1.1 can refine.
  const recipeIds = rows.map((r) => r.id);
  const completenessByRecipe: Record<string, CompletenessByLocale> = {};
  if (recipeIds.length > 0) {
    const trxRows = await db
      .select({
        recipeId: recipeTranslations.recipeId,
        locale: recipeTranslations.locale,
        title: recipeTranslations.title,
        body: recipeTranslations.body,
      })
      .from(recipeTranslations);
    // We could narrow with inArray, but the recipe_translations table is
    // small (≤3*recipe_count rows) — full scan is fine at v1 scale.
    for (const id of recipeIds) {
      const empty: CompletenessByLocale = { uz: 0, ru: 0, en: 0 };
      for (const t of trxRows) {
        if (t.recipeId !== id) continue;
        if (t.locale !== "uz" && t.locale !== "ru" && t.locale !== "en")
          continue;
        const titleFilled =
          typeof t.title === "string" && t.title.trim().length > 0;
        const bodyFilled = isTiptapDocFilled(t.body);
        empty[t.locale] =
          (titleFilled ? 50 : 0) + (bodyFilled ? 50 : 0);
      }
      completenessByRecipe[id] = empty;
    }
  }

  const data: RecipeRow[] = rows.map((r) => ({
    id: r.id,
    status: (r.status === "published" ? "published" : "draft") as
      | "draft"
      | "published",
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    title: r.title ?? "(untranslated)",
    slugUz: r.slugUz ?? "",
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <Button
          render={
            <Link href={`/${locale}/admin/recipes/new`}>New recipe</Link>
          }
        />
      </div>
      <RecipesTable
        locale={locale}
        data={data}
        rowCount={Number(countRow?.count ?? 0)}
        completenessByRecipe={completenessByRecipe}
      />
    </div>
  );
}
