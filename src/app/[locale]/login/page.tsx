// Plan 02-08: server-component page that hosts the LoginForm client island.
// Replaces the Phase-1 void-action page with a useActionState-driven form
// that surfaces "Check your email" confirmation and access-denied banner.
//
// `?error=` reading: Auth.js redirects to `/[locale]/login?error=AccessDenied`
// when the signIn callback rejects (e.g. inactive admin clicked the magic
// link). We map that to `initialError='access_denied'` so the form renders
// a localized banner above the input. Other Auth.js error codes collapse to
// the generic 'unknown' surface (the client form already renders this for
// transient errors).
//
// setRequestLocale(locale) is mandatory before any getTranslations() call to
// avoid forced dynamic rendering (Pitfall 4).

import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LoginForm, type LoginFormLabels } from './login-form';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

function normalizeError(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower === 'accessdenied' || lower === 'access_denied') return 'access_denied';
  return undefined;
}

// Phase 3 Plan 01 / Pitfall A6: cacheComponents requires the searchParams
// access (`?error=...`) to live inside a <Suspense> boundary so the static
// shell prerenders cleanly. The form itself is a client island already.
async function LoginFormShell({
  locale,
  searchParams,
  labels,
}: {
  locale: string;
  searchParams: Promise<{ error?: string }>;
  labels: LoginFormLabels;
}) {
  const sp = await searchParams;
  const initialError = normalizeError(sp.error);
  return (
    <LoginForm locale={locale} labels={labels} initialError={initialError} />
  );
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'auth' });

  const labels: LoginFormLabels = {
    title: t('signIn'),
    prompt: t('signInPrompt'),
    email: t('emailPlaceholder'),
    submit: t('sendLink'),
    success: t('checkEmail'),
    invalidEmail: t('invalidEmail'),
    unknown: t('unknownError'),
    accessDenied: t('accessDenied'),
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold">{labels.title}</h1>
      <Suspense fallback={null}>
        <LoginFormShell
          locale={locale}
          searchParams={searchParams}
          labels={labels}
        />
      </Suspense>
    </main>
  );
}
