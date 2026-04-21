import { setRequestLocale, getTranslations } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('common');
  return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
      <h1>{t('siteTitle')}</h1>
    </main>
  );
}
