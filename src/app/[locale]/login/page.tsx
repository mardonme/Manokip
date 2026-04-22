// Magic-link login page — minimal Phase 1 shell. Phase 2 polishes UX
// (check-email confirmation screen, invalid-input toasts, resend throttle).
//
// setRequestLocale(locale) is mandatory before any getTranslations() call to
// avoid forced dynamic rendering (Pitfall 4).

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { requestMagicLink } from './actions';

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <main
      style={{
        padding: '2rem',
        maxWidth: '420px',
        margin: '4rem auto',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      <h1>{t('signIn')}</h1>
      <p style={{ color: '#555', marginBottom: '1rem' }}>{t('signInPrompt')}</p>
      <form
        action={requestMagicLink}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <input type="hidden" name="locale" value={locale} />
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@manometr.uz"
          style={{
            padding: '0.6rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.6rem 1rem',
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {t('sendLink')}
        </button>
      </form>
    </main>
  );
}
