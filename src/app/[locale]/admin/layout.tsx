// Admin shell RSC layout — replaces the Phase-1 `coming soon` posture with
// the real chrome: sidebar (8 nav links), top bar (admin email + sign-out
// Server Action form), and the `<NuqsAdapter>` provider that every Wave 2/3
// downstream DataTable depends on (RESEARCH.md Pitfall #10).
//
// Order of operations is deliberate:
//   1. await params -> destructure locale (Next 16 dynamic API).
//   2. setRequestLocale(locale) — required by next-intl's RSC API for
//      server-rendered pages under the [locale] segment.
//   3. await requireAdmin() — D-15 admin gate (throws on no/expired session).
//      Edge middleware (proxy.ts) already 307-redirects unauth requests so
//      this throw is a defense-in-depth check, not the primary gate.
//   4. getTranslations({ locale, namespace: 'admin' }) — server-side i18n
//      lookup; the labels are pre-resolved here and passed to child server
//      components as props (avoids each child needing its own provider).

import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { requireAdmin } from '@/lib/auth';
import { AdminSidebar, type AdminNavLabels } from '@/components/admin/sidebar';
import { AdminTopBar } from '@/components/admin/top-bar';

// Phase 3 Plan 01 / Pitfall A6: with `cacheComponents: true` enabled in
// next.config.ts, every RSC page must either render its data fetches inside
// <Suspense> boundaries OR opt into 'use cache'. Admin pages always require
// a live `requireAdmin()` session check (D-15) — they must NEVER cache. The
// previous `dynamic = 'force-dynamic'` segment config is incompatible with
// cacheComponents (Next 16 build error). The migration path is to move the
// runtime/auth data fetch into a child server component wrapped in
// <Suspense> so the layout shell is statically renderable while the admin
// chrome streams in dynamically. This preserves the Phase-2 D-15 gate
// contract while satisfying the cacheComponents prerender invariants.

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

async function AdminChrome({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  // requireAdmin() reads cookies/headers (runtime APIs) and DB; it MUST be
  // inside a Suspense boundary under cacheComponents. The Edge gate
  // (proxy.ts) is the primary auth check; this is the defense-in-depth.
  const session = await requireAdmin();
  const t = await getTranslations({ locale, namespace: 'admin' });

  const labels: AdminNavLabels = {
    dashboard: t('nav.dashboard'),
    products: t('nav.products'),
    categories: t('nav.categories'),
    manufacturers: t('nav.manufacturers'),
    specFields: t('nav.specFields'),
    // Plan 04-07 — Recipes admin nav entry (CONT-01).
    recipes: t('nav.recipes'),
    // Plan 04-08 — Industries admin nav entry (CONT-02).
    industries: t('nav.industries'),
    submissions: t('nav.submissions'),
    audit: t('nav.audit'),
    admins: t('nav.admins'),
  };

  // The Edge gate guarantees session.user.email is present before reaching
  // here; requireAdmin() also throws if it's missing. The non-null assertion
  // is therefore safe and lets us avoid a redundant fallback string.
  const adminEmail = session.user!.email!;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar labels={labels} />
      <div className="flex flex-1 flex-col">
        <AdminTopBar
          email={adminEmail}
          signOutLabel={t('topbar.signOut')}
          locale={locale}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <NuqsAdapter>
      <Suspense fallback={<div className="min-h-screen" />}>
        <AdminChrome locale={locale}>{children}</AdminChrome>
      </Suspense>
    </NuqsAdapter>
  );
}
