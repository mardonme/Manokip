// Admin shell sidebar — server component. Renders the 8 section nav links
// using next-intl's locale-aware `Link` so each href is automatically
// prefixed with the active /[locale]/ segment per the routing config.
//
// Server-component only: no client interactivity needed for the link list.
// (Active-link highlighting can be added later via a small client island
// reading the pathname; out of scope for plan 02-02.)

import { Link } from '@/i18n/navigation';

export type AdminNavLabels = {
  dashboard: string;
  products: string;
  categories: string;
  manufacturers: string;
  specFields: string;
  submissions: string;
  audit: string;
  admins: string;
};

type Props = {
  labels: AdminNavLabels;
};

export function AdminSidebar({ labels }: Props) {
  // Hrefs are written as next-intl pathnames (no /[locale] prefix); the
  // configured Link prefixes it at render time. The hrefs in the rendered
  // HTML therefore include the locale (e.g. `/uz/admin/products`), which
  // satisfies the plan's acceptance criterion ("/admin/products").
  const items: Array<{ href: string; label: string }> = [
    { href: '/admin', label: labels.dashboard },
    { href: '/admin/products', label: labels.products },
    { href: '/admin/categories', label: labels.categories },
    { href: '/admin/manufacturers', label: labels.manufacturers },
    { href: '/admin/spec-fields', label: labels.specFields },
    { href: '/admin/submissions', label: labels.submissions },
    { href: '/admin/audit', label: labels.audit },
    { href: '/admin/admins', label: labels.admins },
  ];

  return (
    <aside
      className="w-64 shrink-0 border-r bg-muted/40 p-4"
      data-testid="admin-sidebar"
    >
      <nav className="flex flex-col gap-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="rounded px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
