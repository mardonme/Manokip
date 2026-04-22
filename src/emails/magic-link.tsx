// Magic-link email template (D-14). Minimal 3-locale shell; Phase 2 expands
// with brand polish, invite flow language, and per-user locale threading.
// Rendered to HTML via @react-email/components' `render()` inside the Resend
// provider's sendVerificationRequest override in src/lib/auth.config.ts.

import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Preview,
} from '@react-email/components';

interface MagicLinkEmailProps {
  url: string;
  locale?: 'uz' | 'ru' | 'en';
}

const COPY = {
  uz: {
    preview: 'Manometr — kirish havolasi',
    body: 'Admin paneliga kirish uchun quyidagi havolani bosing:',
    cta: 'Kirish',
  },
  ru: {
    preview: 'Manometr — ссылка для входа',
    body: 'Нажмите ссылку ниже, чтобы войти в админ-панель:',
    cta: 'Войти',
  },
  en: {
    preview: 'Manometr — sign-in link',
    body: 'Click the link below to sign in to the admin panel:',
    cta: 'Sign in',
  },
} as const;

export default function MagicLinkEmail({
  url,
  locale = 'uz',
}: MagicLinkEmailProps) {
  const copy = COPY[locale];
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', padding: '24px' }}>
        <Container>
          <Text>{copy.body}</Text>
          <Link
            href={url}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#111',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
            }}
          >
            {copy.cta}
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
