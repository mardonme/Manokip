// Plan 05-04 Task 4.1 — canonical /[locale]/contact RSC page (CTA-01 + SEO-06).
//
// Per D-01 (05-CONTEXT.md): the form lives at canonical `/[locale]/contact`
// AND opens in a modal from `<ContactButton />` in SiteHeader. Both render the
// SAME `<ContactForm />` component (SSOT). This page is the SEO surface — it
// emits per-locale canonical + hreflang fan-out for uz/ru/en + x-default via
// `buildAlternates({ pathPrefix: '/contact' })` (Phase-3 SEO-01 / SEO-02).
//
// Architecture:
//   - RSC. `setRequestLocale(locale)` BEFORE any `getTranslations()` call —
//     Pattern F invariant from 05-PATTERNS.md (avoids forced-dynamic rendering
//     which breaks ISR).
//   - No <Suspense> boundary needed: ContactForm is a client island handling
//     its own loading state; this RSC has no async DB read.
//   - No `productContext` prop on the canonical page — the page doesn't know
//     which product the visitor came from (that's the modal's job in
//     <StickyCtaContactButton /> on product detail).
//   - `mode="page"` routes the success state to the inline "Thanks…" swap
//     defined in ContactForm (plan 05-03), instead of calling `onSuccess`.

import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { ContactForm } from '@/components/public/contact-form';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'public.contact' });
  return {
    title: t('pageTitle'),
    description: t('pageSubtitle'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/contact',
    }),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'public.contact' });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('pageTitle')}</h1>
        <p className="mt-2 text-slate-600">{t('pageSubtitle')}</p>
      </header>
      <ContactForm locale={locale as Locale} mode="page" />
    </main>
  );
}
