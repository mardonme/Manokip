// Plan 04-03 Task 3.4 — Public read helpers for recipes (CONT-01 + CONT-03).
//
// Three exports consumed by the Wave 3 public RSC pages (plan 04-09):
//
//   1. getRecipeBySlug(slug, locale)
//        Resolves a published recipe by per-locale slug. The lookup tries the
//        requested locale first; if no translation matches OR the body is empty
//        per `isTiptapDocFilled` heuristic, walks the Phase-3 D-05 fallback
//        cascade (uz → ru → en, stop at first non-empty). Returns null if the
//        recipe ultimately has no published-and-non-empty translation.
//
//        The returned shape carries `usedFallbackLocale: Locale | null` so the
//        consuming RSC page can render the locale-fallback banner per D-07.
//        `null` means the requested locale matched directly.
//
//   2. findPublishedRecipes(locale)
//        List page data — every published recipe with its current-locale
//        summary (title + slug + excerpt + featuredImagePublicId + dates),
//        ordered by publishedAt DESC. No fallback cascade for the list view
//        (recipes lacking the requested locale are filtered out — same posture
//        as Phase-3 catalog list pages). The list page can render a smaller
//        per-row banner if a content-author cares about parity.
//
//   3. getLinkedProductsForRecipe(recipeId, locale)
//        Returns linked products as `[{name, slug, locale}]` for the TechArticle
//        JSON-LD `mentions` array (CONT-06 / D-10). Falls back to uz product
//        translations when the requested locale is missing per Phase-3 D-05.
//        Consumed by plan 04-09's recipe detail page.
//
// Cache + invalidation:
//   - All three helpers wrap with 'use cache' + cacheLife('max').
//   - getRecipeBySlug + getLinkedProductsForRecipe tag `recipe:<id>` so
//     revalidateRecipe(id) busts the row.
//   - findPublishedRecipes tags `recipes:list:<locale>` so the per-locale list
//     tag fan-out from revalidateRecipe (Task 3.2) busts the list view.
//
// Status filter: every query explicitly adds `WHERE status='published'`
// (T-04-INFO-01 mitigation — defense-in-depth alongside the pgView's same
// filter for the Used-In path).

import { eq, and, desc, sql } from 'drizzle-orm';
import { cacheTag, cacheLife } from 'next/cache';
import { db } from '@/db/client';
import { recipes, recipeTranslations } from '@/db/schema/recipes';
import {
  productRecipes,
} from '@/db/schema/junctions';
import { products, productTranslations } from '@/db/schema/products';
import type { JSONContent } from '@tiptap/core';

export type Locale = 'uz' | 'ru' | 'en';
const FALLBACK_CASCADE: readonly Locale[] = ['uz', 'ru', 'en'];

/**
 * Phase-3 D-05 cascade heuristic — does this Tiptap doc carry meaningful
 * content? An empty paragraph (Tiptap default content) does NOT count.
 *
 * Inlined per RESEARCH §Translation completeness for Tiptap doc lines 522-530.
 * Mirrored verbatim in industries.ts; if plans 04-07/04-08 surface this in
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

export interface RecipeTranslationRow {
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string | null;
  body: JSONContent | null;
}

export interface RecipeDetail {
  id: string;
  status: 'draft' | 'published';
  featuredImagePublicId: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  /** Resolved translation row (after fallback cascade). */
  translation: RecipeTranslationRow;
  /**
   * `null` if the requested locale matched. Otherwise the locale that DID
   * match (uz / ru / en) so the RSC page can render the D-07 banner.
   */
  usedFallbackLocale: Locale | null;
  /**
   * Per-locale slugs for hreflang fan-out (Pitfall #6 — never advertise a 404
   * locale variant). Missing locales are absent from the map.
   */
  slugByLocale: Partial<Record<Locale, string>>;
}

/**
 * Look up a published recipe by per-locale slug. The slug match itself
 * happens in the requested locale; if found AND the body is filled, the
 * returned translation is verbatim. If the slug matches a published recipe
 * but the body in that locale is empty, the cascade falls back to the next
 * non-empty locale per Phase-3 D-05.
 *
 * Drafts are filtered out (T-04-INFO-01 mitigation). Returns null if no row
 * matches OR every locale's body is empty.
 */
export async function getRecipeBySlug(
  slug: string,
  locale: Locale,
): Promise<RecipeDetail | null> {
  'use cache';
  cacheLife('max');

  // Step 1: resolve recipe row by (locale, slug) on published recipes only.
  const headRows = await db
    .select({
      id: recipes.id,
      status: recipes.status,
      featuredImagePublicId: recipes.featuredImagePublicId,
      publishedAt: recipes.publishedAt,
      updatedAt: recipes.updatedAt,
    })
    .from(recipes)
    .innerJoin(
      recipeTranslations,
      eq(recipeTranslations.recipeId, recipes.id),
    )
    .where(
      and(
        eq(recipes.status, 'published'),
        eq(recipeTranslations.locale, locale),
        eq(recipeTranslations.slug, slug),
      ),
    )
    .limit(1);

  const head = headRows[0];
  if (!head) return null;

  cacheTag(`recipe:${head.id}`);

  // Step 2: pull all 3 locale rows for the recipe (cascade + hreflang slugs).
  const allRows = await db
    .select({
      locale: recipeTranslations.locale,
      title: recipeTranslations.title,
      slug: recipeTranslations.slug,
      excerpt: recipeTranslations.excerpt,
      body: recipeTranslations.body,
    })
    .from(recipeTranslations)
    .where(eq(recipeTranslations.recipeId, head.id));

  const byLocale = new Map<Locale, RecipeTranslationRow>();
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

  // Step 3: cascade resolve. Try requested locale, then the FALLBACK_CASCADE
  // in order, stopping at the first non-empty body.
  let resolved: RecipeTranslationRow | null = null;
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

export interface RecipeListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImagePublicId: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
}

/**
 * List view — every published recipe with its current-locale row, ordered
 * publishedAt DESC. No cascade fallback (recipes lacking the requested locale
 * are filtered out by the inner join).
 */
export async function findPublishedRecipes(
  locale: Locale,
): Promise<RecipeListItem[]> {
  'use cache';
  cacheLife('max');
  cacheTag(`recipes:list:${locale}`);

  const rows = await db
    .select({
      id: recipes.id,
      title: recipeTranslations.title,
      slug: recipeTranslations.slug,
      excerpt: recipeTranslations.excerpt,
      featuredImagePublicId: recipes.featuredImagePublicId,
      publishedAt: recipes.publishedAt,
      updatedAt: recipes.updatedAt,
    })
    .from(recipes)
    .innerJoin(
      recipeTranslations,
      and(
        eq(recipeTranslations.recipeId, recipes.id),
        eq(recipeTranslations.locale, locale),
      ),
    )
    .where(eq(recipes.status, 'published'))
    .orderBy(desc(recipes.publishedAt));

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

/**
 * Linked-products read for the TechArticle JSON-LD `mentions` array (D-10).
 * Returns one row per linked PUBLISHED product with a translation in the
 * requested locale; products without a current-locale translation fall back
 * to uz per Phase-3 D-05. Used by plan 04-09's recipe detail page.
 *
 * The `locale` field on each item indicates which locale's translation was
 * used (the requested locale OR the uz fallback) — useful for the consuming
 * page when building canonical URLs for the mentions array.
 */
export async function getLinkedProductsForRecipe(
  recipeId: string,
  locale: Locale,
): Promise<LinkedProductMention[]> {
  'use cache';
  cacheLife('max');
  cacheTag(`recipe:${recipeId}`);

  // Single query JOINing junction → product → product_translations with a
  // COALESCE-style preference for the requested locale, falling back to uz
  // in JS after the rows return.
  const rows = await db
    .select({
      productId: products.id,
      locale: productTranslations.locale,
      name: productTranslations.name,
      slug: productTranslations.slug,
      position: productRecipes.position,
    })
    .from(productRecipes)
    .innerJoin(
      products,
      and(
        eq(products.id, productRecipes.productId),
        eq(products.status, 'published'),
      ),
    )
    .innerJoin(
      productTranslations,
      eq(productTranslations.productId, products.id),
    )
    .where(eq(productRecipes.recipeId, recipeId))
    .orderBy(productRecipes.position, products.id);

  // Reduce: for each productId, prefer requested-locale row, else uz, else
  // first available.
  type Row = (typeof rows)[number];
  const byProduct = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byProduct.get(r.productId) ?? [];
    list.push(r);
    byProduct.set(r.productId, list);
  }

  // Preserve junction order (productRecipes.position) — we rebuild the
  // unique-product order from the FIRST occurrence of each productId in rows.
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
    if (first && (first.locale === 'uz' || first.locale === 'ru' || first.locale === 'en')) {
      mentions.push({
        name: first.name,
        slug: first.slug,
        locale: first.locale as Locale,
      });
    }
  }

  // Reference unused `sql` import to silence linter if not used elsewhere.
  void sql;
  return mentions;
}
