// Admin dashboard placeholder — Phase-2 Wave 2/3 plans replace the body
// with actual KPI cards / recent activity. The shell (sidebar + top bar +
// NuqsAdapter) is provided by the parent admin layout.
//
// requireAdmin() and setRequestLocale() are duplicated here despite the
// layout calling them: setRequestLocale is per-page in next-intl's RSC
// model (the layout's call covers its own static rendering; pages still
// need their own call to participate in static generation), and the
// requireAdmin() call is defense-in-depth — should the layout ever be
// modified to skip it, the page still refuses to render.

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';

type Props = { params: Promise<{ locale: string }> };

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations({ locale, namespace: 'admin' });

  return (
    <div data-testid="admin-dashboard">
      <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('dashboard.placeholder')}</p>
    </div>
  );
}
