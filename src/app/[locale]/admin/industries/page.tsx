// Plan 04-08 Task 8.2 — industries admin list page (CONT-02 / ADMIN-04).
//
// Verbatim mirror of src/app/[locale]/admin/recipes/page.tsx with the entity
// swap (recipes → industries). Same JS-side completeness heuristic over title
// + body filledness; same admin-sees-all-statuses posture.

import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { sql, desc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { industries, industryTranslations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  IndustriesTable,
  type IndustryRow,
  type CompletenessByLocale,
} from "./industries-table";
import type { JSONContent } from "@tiptap/core";

type SP = Promise<{ page?: string; pageSize?: string }>;

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

export default async function IndustriesPage({
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

  const tCurrent = alias(industryTranslations, "tCurrent");
  const tUz = alias(industryTranslations, "tUz");

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: industries.id,
        status: industries.status,
        publishedAt: industries.publishedAt,
        updatedAt: industries.updatedAt,
        title: tCurrent.title,
        slugUz: tUz.slug,
      })
      .from(industries)
      .leftJoin(
        tCurrent,
        and(
          eq(tCurrent.industryId, industries.id),
          eq(tCurrent.locale, locale),
        ),
      )
      .leftJoin(
        tUz,
        and(eq(tUz.industryId, industries.id), eq(tUz.locale, "uz")),
      )
      .orderBy(desc(industries.updatedAt))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(industries),
  ]);

  const industryIds = rows.map((r) => r.id);
  const completenessByIndustry: Record<string, CompletenessByLocale> = {};
  if (industryIds.length > 0) {
    const trxRows = await db
      .select({
        industryId: industryTranslations.industryId,
        locale: industryTranslations.locale,
        title: industryTranslations.title,
        body: industryTranslations.body,
      })
      .from(industryTranslations);
    for (const id of industryIds) {
      const empty: CompletenessByLocale = { uz: 0, ru: 0, en: 0 };
      for (const t of trxRows) {
        if (t.industryId !== id) continue;
        if (t.locale !== "uz" && t.locale !== "ru" && t.locale !== "en")
          continue;
        const titleFilled =
          typeof t.title === "string" && t.title.trim().length > 0;
        const bodyFilled = isTiptapDocFilled(t.body);
        empty[t.locale] =
          (titleFilled ? 50 : 0) + (bodyFilled ? 50 : 0);
      }
      completenessByIndustry[id] = empty;
    }
  }

  const data: IndustryRow[] = rows.map((r) => ({
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
        <h1 className="text-2xl font-semibold">Industries</h1>
        <Button
          render={
            <Link href={`/${locale}/admin/industries/new`}>New industry</Link>
          }
        />
      </div>
      <IndustriesTable
        locale={locale}
        data={data}
        rowCount={Number(countRow?.count ?? 0)}
        completenessByIndustry={completenessByIndustry}
      />
    </div>
  );
}
