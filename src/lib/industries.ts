// Plan 04-03 Task 3.4 — Public read helpers for industries (CONT-02 + CONT-03).
//
// Mirror of src/lib/recipes.ts — see that file for the rationale; this module
// only differs in the table name it reads from. Three exports consumed by the
// Wave 3 public RSC pages (plan 04-10):
//
//   1. getIndustryBySlug(slug, locale): industry detail with Phase-3 D-05
//      fallback cascade + usedFallbackLocale flag.
//   2. findPublishedIndustries(locale): list view (publishedAt DESC, no cascade).
//   3. getLinkedProductsForIndustry(industryId, locale): TechArticle mentions
//      array for plan 04-10's industry detail page.
//
// Status filter: every query explicitly adds `WHERE status='published'`
// (T-04-INFO-01 mitigation).

import { eq, and, desc, sql } from 'drizzle-orm';
import { cacheTag, cacheLife } from 'next/cache';
import { db } from '@/db/client';
import { industries, industryTranslations } from '@/db/schema/industries';
import { productIndustries } from '@/db/schema/junctions';
import { products, productTranslations } from '@/db/schema/products';
import type { JSONContent } from '@tiptap/core';

export type Locale = 'uz' | 'ru' | 'en';
const FALLBACK_CASCADE: readonly Locale[] = ['uz', 'ru', 'en'];

/**
 * Phase-3 D-05 cascade heuristic — does this Tiptap doc carry meaningful
 * content? An empty paragraph (Tiptap default content) does NOT count.
 *
 * Inlined per RESEARCH §Translation completeness for Tiptap doc lines 522-530.
 * Mirrored verbatim from recipes.ts; if plans 04-07/04-08 surface this in
 * the admin completeness display, extract to src/lib/tiptap-helpers.ts then.
 */
function isTiptapDocFilled(doc: unknown): boolean {
  if (doc == null || typeof doc !== 'object') return false;
  const d = doc as JSONContent;
  if (!d.content || d.content.length === 0) return false;
  const onlyEmptyParas = d.content.every(
    (n) =>
      n.type === 'paragraph' && (!n.content || n.content.length === 0),
  );
  return !onlyEmptyParas;
}

export interface IndustryTranslationRow {
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string | null;
  body: JSONContent | null;
}

export interface IndustryDetail {
  id: string;
  status: 'draft' | 'published';
  featuredImagePublicId: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  translation: IndustryTranslationRow;
  usedFallbackLocale: Locale | null;
  slugByLocale: Partial<Record<Locale, string>>;
}

export async function getIndustryBySlug(
  slug: string,
  locale: Locale,
): Promise<IndustryDetail | null> {
  'use cache';
  cacheLife('max');

  const headRows = await db
    .select({
      id: industries.id,
      status: industries.status,
      featuredImagePublicId: industries.featuredImagePublicId,
      publishedAt: industries.publishedAt,
      updatedAt: industries.updatedAt,
    })
    .from(industries)
    .innerJoin(
      industryTranslations,
      eq(industryTranslations.industryId, industries.id),
    )
    .where(
      and(
        eq(industries.status, 'published'),
        eq(industryTranslations.locale, locale),
        eq(industryTranslations.slug, slug),
      ),
    )
    .limit(1);

  const head = headRows[0];
  if (!head) return null;

  cacheTag(`industry:${head.id}`);

  const allRows = await db
    .select({
      locale: industryTranslations.locale,
      title: industryTranslations.title,
      slug: industryTranslations.slug,
      excerpt: industryTranslations.excerpt,
      body: industryTranslations.body,
    })
    .from(industryTranslations)
    .where(eq(industryTranslations.industryId, head.id));

  const byLocale = new Map<Locale, IndustryTranslationRow>();
  const slugByLocale: Partial<Record<Locale, string>> = {};
  for (const r of allRows) {
    if (r.locale !== 'uz' && r.locale !== 'ru' && r.locale !== 'en') continue;
    const loc = r.locale as Locale;
    byLocale.set(loc, {
      locale: loc,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      body: (r.body ?? null) as JSONContent | null,
    });
    slugByLocale[loc] = r.slug;
  }

  let resolved: IndustryTranslationRow | null = null;
  let usedFallbackLocale: Locale | null = null;

  const requested = byLocale.get(locale);
  if (requested && isTiptapDocFilled(requested.body)) {
    resolved = requested;
  } else {
    for (const l of FALLBACK_CASCADE) {
      if (l === locale) continue;
      const candidate = byLocale.get(l);
      if (candidate && isTiptapDocFilled(candidate.body)) {
        resolved = candidate;
        usedFallbackLocale = l;
        break;
      }
    }
  }

  if (!resolved) return null;

  return {
    id: head.id,
    status: head.status as 'draft' | 'published',
    featuredImagePublicId: head.featuredImagePublicId,
    publishedAt: head.publishedAt,
    updatedAt: head.updatedAt,
    translation: resolved,
    usedFallbackLocale,
    slugByLocale,
  };
}

export interface IndustryListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImagePublicId: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}

export async function findPublishedIndustries(
  locale: Locale,
): Promise<IndustryListItem[]> {
  'use cache';
  cacheLife('max');
  cacheTag(`industries:list:${locale}`);

  const rows = await db
    .select({
      id: industries.id,
      title: industryTranslations.title,
      slug: industryTranslations.slug,
      excerpt: industryTranslations.excerpt,
      featuredImagePublicId: industries.featuredImagePublicId,
      publishedAt: industries.publishedAt,
      updatedAt: industries.updatedAt,
    })
    .from(industries)
    .innerJoin(
      industryTranslations,
      and(
        eq(industryTranslations.industryId, industries.id),
        eq(industryTranslations.locale, locale),
      ),
    )
    .where(eq(industries.status, 'published'))
    .orderBy(desc(industries.publishedAt));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    featuredImagePublicId: r.featuredImagePublicId,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
  }));
}

export interface LinkedProductMention {
  name: string;
  slug: string;
  locale: Locale;
}

export async function getLinkedProductsForIndustry(
  industryId: string,
  locale: Locale,
): Promise<LinkedProductMention[]> {
  'use cache';
  cacheLife('max');
  cacheTag(`industry:${industryId}`);

  const rows = await db
    .select({
      productId: products.id,
      locale: productTranslations.locale,
      name: productTranslations.name,
      slug: productTranslations.slug,
      position: productIndustries.position,
    })
    .from(productIndustries)
    .innerJoin(
      products,
      and(
        eq(products.id, productIndustries.productId),
        eq(products.status, 'published'),
      ),
    )
    .innerJoin(
      productTranslations,
      eq(productTranslations.productId, products.id),
    )
    .where(eq(productIndustries.industryId, industryId))
    .orderBy(productIndustries.position, products.id);

  type Row = (typeof rows)[number];
  const byProduct = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byProduct.get(r.productId) ?? [];
    list.push(r);
    byProduct.set(r.productId, list);
  }

  const seen = new Set<string>();
  const orderedProductIds: string[] = [];
  for (const r of rows) {
    if (!seen.has(r.productId)) {
      seen.add(r.productId);
      orderedProductIds.push(r.productId);
    }
  }

  const mentions: LinkedProductMention[] = [];
  for (const pid of orderedProductIds) {
    const candidates = byProduct.get(pid) ?? [];
    const requested = candidates.find((c) => c.locale === locale);
    if (requested) {
      mentions.push({
        name: requested.name,
        slug: requested.slug,
        locale,
      });
      continue;
    }
    const uz = candidates.find((c) => c.locale === 'uz');
    if (uz) {
      mentions.push({ name: uz.name, slug: uz.slug, locale: 'uz' });
      continue;
    }
    const first = candidates[0];
    if (
      first &&
      (first.locale === 'uz' || first.locale === 'ru' || first.locale === 'en')
    ) {
      mentions.push({
        name: first.name,
        slug: first.slug,
        locale: first.locale as Locale,
      });
    }
  }

  void sql;
  return mentions;
}
