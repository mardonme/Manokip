// Contact-form admin notification email (Phase 5 plan 05-02; CTA-02).
//
// English-only by design (D-09): admins read English; locale parameterization
// would add three sets of strings nobody internalizes. This is the SECOND email
// the platform sends for a single submission — the first is the visitor
// auto-reply (src/emails/contact-auto-reply.tsx, locale-parameterized).
//
// Rendered to HTML via @react-email/components' `render()` inside
// src/lib/email-contact.ts (sendAdminNotification). The dispatcher fires this
// fire-and-forget AFTER the contact_submission row is committed (D-10), so a
// Resend outage cannot block the visitor's success path.
//
// Subject is the named export `SUBJECT` (no localization). All 8 props
// (name/company/email/phone/message/sourcePage/locale/submittedAt) appear in
// the rendered HTML so admins can triage without opening the admin inbox.

import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Preview,
} from '@react-email/components';

interface ContactAdminEmailProps {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  message: string;
  sourcePage: string;
  locale: 'uz' | 'ru' | 'en';
  submittedAt: Date;
}

export const SUBJECT = 'New contact submission — Manometr';

export default function ContactAdminEmail({
  name,
  company,
  email,
  phone,
  message,
  sourcePage,
  locale,
  submittedAt,
}: ContactAdminEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>New contact submission from {name}</Preview>
      <Body style={{ fontFamily: 'sans-serif', padding: '24px' }}>
        <Container>
          <Text>
            <strong>From:</strong> {name}
            {company ? ` (${company})` : ''}
          </Text>
          <Text>
            <strong>Email:</strong> {email}
          </Text>
          {phone && (
            <Text>
              <strong>Phone:</strong> {phone}
            </Text>
          )}
          <Text>
            <strong>Message:</strong>
          </Text>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{message}</Text>
          <Text style={{ color: '#666', fontSize: '12px', marginTop: '24px' }}>
            Source: {sourcePage} · Locale: {locale} · Submitted:{' '}
            {submittedAt.toISOString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
