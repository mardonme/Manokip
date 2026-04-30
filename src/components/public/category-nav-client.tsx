'use client';

// Plan 03-03 Task 3.2 — Category-tree client island (CAT-02).
//
// Renders the tree shape produced by CategoryTreeServer. Each branch wraps
// children in <details> so expand/collapse works without JavaScript on
// initial paint and enhances with `usePathname` for active-route highlight.
//
// JS-free baseline: <details>/<summary> is a native disclosure widget — the
// tree is fully usable with JS disabled / before hydration. The client
// `usePathname()` adds the active highlight + open-by-default-on-active
// behavior progressively.

import { usePathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/metadata';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
}

export interface CategoryTreeClientProps {
  tree: CategoryNode[];
  locale: Locale;
}

function isActive(pathname: string, slug: string, locale: Locale): boolean {
  // Active when current pathname matches /[locale]/categories/<slug>(/...)?.
  // next-intl's usePathname returns the pathname WITHOUT the locale prefix,
  // so we compare against the locale-stripped variant.
  const stripped = pathname.startsWith(`/${locale}`)
    ? pathname.slice(locale.length + 1) || '/'
    : pathname;
  return (
    stripped === `/categories/${slug}` ||
    stripped.startsWith(`/categories/${slug}/`)
  );
}

function nodeContainsActive(
  node: CategoryNode,
  pathname: string,
  locale: Locale,
): boolean {
  if (isActive(pathname, node.slug, locale)) return true;
  return node.children.some((c) => nodeContainsActive(c, pathname, locale));
}

function CategoryBranch({
  node,
  pathname,
  locale,
  depth,
}: {
  node: CategoryNode;
  pathname: string;
  locale: Locale;
  depth: number;
}) {
  const active = isActive(pathname, node.slug, locale);
  const hasChildren = node.children.length > 0;
  const containsActive = nodeContainsActive(node, pathname, locale);

  const link = (
    <Link
      href={`/categories/${node.slug}`}
      className={cn(
        'block rounded px-2 py-1 text-sm hover:bg-slate-100',
        active && 'bg-slate-200 font-medium text-slate-900',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {node.name}
    </Link>
  );

  if (!hasChildren) {
    return <li>{link}</li>;
  }

  return (
    <li>
      <details
        open={containsActive || depth === 0}
        className="group"
      >
        <summary className="flex items-center gap-1 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden
            className="inline-block w-3 text-slate-400 transition-transform group-open:rotate-90"
          >
            {'>'}
          </span>
          <span className="flex-1">{link}</span>
        </summary>
        <ul className="ml-4 mt-1 space-y-0.5 border-l border-slate-200 pl-2">
          {node.children.map((c) => (
            <CategoryBranch
              key={c.id}
              node={c}
              pathname={pathname}
              locale={locale}
              depth={depth + 1}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

export function CategoryTreeClient({ tree, locale }: CategoryTreeClientProps) {
  const pathname = usePathname();
  return (
    <nav aria-label="Categories" data-testid="category-nav">
      <ul className="space-y-0.5">
        {tree.map((root) => (
          <CategoryBranch
            key={root.id}
            node={root}
            pathname={pathname}
            locale={locale}
            depth={0}
          />
        ))}
      </ul>
    </nav>
  );
}
