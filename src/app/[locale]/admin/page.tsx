// Admin placeholder — Phase 2 builds the real shell + CRUD. Here we only
// assert the D-09 + D-10 gate by calling requireAdmin() before rendering.
//
// Without middleware (plan 06), an unauthenticated request to this page
// will surface requireAdmin()'s `throw new Error('Unauthorized')` as a 500.
// Once plan 06 ships middleware, the admin gate short-circuits at the Edge
// with a 307 to /{locale}/login before this RSC ever renders.

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations('admin');

  return (
    <main
      style={{
        padding: '2rem',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      <h1>{t('title')}</h1>
      <p>{t('comingSoon')}</p>
    </main>
  );
}
