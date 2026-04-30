// Plan 03-03 Task 3.2 — Recursive category tree navigation (CAT-02).
//
// Two exports in one file:
//   - CategoryTreeServer({ locale }) — async RSC that fetches categories +
//     translations via Drizzle. Wrapped in 'use cache' + cacheTag so Phase-2
//     revalidateCategory(...) helpers invalidate this tree on every category
//     mutation. Reshapes flat rows into a nested tree by parentId.
//   - CategoryTreeClient({ tree }) — client island ('use client' is
//     scoped via the imported child component file) that wraps each branch
//     in <details> for no-JS expand/collapse + highlights the active path
//     via usePathname. The server passes pre-resolved tree data so the
//     client doesn't re-query the DB on every interaction.
//
// Pattern reference: PATTERNS.md §category-nav (admin sidebar nav-link list
// pattern + Phase-2 cacheTag('categories-tree') tag is wired into existing
// revalidateCategory/revalidateCategoryMove helpers).

import { and, asc, eq } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { db } from '@/db/client';
import { categories, categoryTranslations } from '@/db/schema/categories';
import type { Locale } from '@/lib/metadata';
import { CategoryTreeClient, type CategoryNode } from './category-nav-client';

export type { CategoryNode };

interface CategoryRow {
  id: string;
  parentId: string | null;
  sortOrder: number;
  name: string | null;
  slug: string | null;
}

async function fetchCategoryRows(locale: Locale): Promise<CategoryRow[]> {
  'use cache';
  cacheTag('categories-tree');
  cacheTag(`categories-tree:${locale}`);

  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      sortOrder: categories.sortOrder,
      name: categoryTranslations.name,
      slug: categoryTranslations.slug,
    })
    .from(categories)
    .leftJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.categoryId, categories.id),
        eq(categoryTranslations.locale, locale),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categoryTranslations.name));

  return rows;
}

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  // Index nodes by id and seed empty children arrays so we can mutate in
  // place during the parent-pass.
  const byId = new Map<string, CategoryNode>();
  for (const r of rows) {
    if (!r.name || !r.slug) continue; // skip categories with no translation in this locale
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      parentId: r.parentId,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node); // orphaned (parent untranslated) — treat as root
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export interface CategoryTreeServerProps {
  locale: Locale;
}

/**
 * Server-side category tree fetcher. Renders a CategoryTreeClient with the
 * resolved tree as JSON-serializable props.
 */
export async function CategoryTreeServer({
  locale,
}: CategoryTreeServerProps) {
  const rows = await fetchCategoryRows(locale);
  const tree = buildTree(rows);
  return <CategoryTreeClient tree={tree} locale={locale} />;
}
