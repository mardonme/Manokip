// Admin invite email template (D-14, ADMIN-02). Mirror of magic-link.tsx —
// minimal three-locale shell with a CTA link to the accept-invite landing
// page. Rendered to HTML via @react-email/components' `render()` inside the
// inviteAdmin Server Action (src/actions/admins.ts) using a dynamic import
// so React Email's Node-only render path never enters the Edge bundle.
//
// Per-locale COPY map (uz / ru / en) covers Manometr's three supported
// locales; default locale is `uz` (the canonical default per Phase 1 D-01).

import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Preview,
} from '@react-email/components';

interface AdminInviteEmailProps {
  acceptUrl: string;
  invitedBy?: string;
  locale?: 'uz' | 'ru' | 'en';
}

const COPY = {
  uz: {
    preview: 'Manometr admin paneliga taklif',
    body: 'Sizni Manometr admin paneliga taklif qilishdi. Quyidagi tugmani bosib qabul qiling.',
    cta: 'Taklifni qabul qilish',
  },
  ru: {
    preview: 'Приглашение в админ-панель Manometr',
    body: 'Вас пригласили в админ-панель Manometr. Нажмите кнопку ниже, чтобы принять приглашение.',
    cta: 'Принять приглашение',
  },
  en: {
    preview: 'Invitation to Manometr admin panel',
    body: 'You have been invited to the Manometr admin panel. Click the button below to accept.',
    cta: 'Accept invitation',
  },
} as const;

const button = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
};

export default function AdminInviteEmail({
  acceptUrl,
  locale = 'uz',
}: AdminInviteEmailProps) {
  const copy = COPY[locale];
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', padding: '24px' }}>
        <Container>
          <Text>{copy.body}</Text>
          <Link href={acceptUrl} style={button}>
            {copy.cta}
          </Link>
          <Text style={{ fontSize: '12px', color: '#666', marginTop: '16px' }}>
            {acceptUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
