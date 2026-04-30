import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { buildAlternates, type Locale } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    title: t('siteTitle'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '',
    }),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('common');
  return (
    <div
      style={{ padding: '2rem', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
    >
      <h1>{t('siteTitle')}</h1>
    </div>
  );
}
