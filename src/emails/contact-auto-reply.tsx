// Contact-form visitor auto-reply email (Phase 5 plan 05-02; CTA-02).
//
// Locale-parameterized (uz/ru/en) per D-09 — the visitor wrote to us in their
// language; the auto-reply must come back in that same language. COPY map
// shape mirrors src/emails/admin-invite.tsx and src/emails/magic-link.tsx
// (Phase 1/2 analogs).
//
// Sent fire-and-forget AFTER the contact_submission row commits (D-10) by
// src/lib/email-contact.ts. Failures are caught + Sentry-logged; visitor
// always sees ok:true.
//
// `productContext` is optional — when sourcePage matches /[locale]/products/
// <slug> AND the slug resolves to a published product, the action prepends a
// "Inquiry about <name> (<sku>)" line to the visitor's message AND surfaces a
// productLine row in this auto-reply. When productContext is undefined we
// short-circuit the productLine render (D-03 fail-open posture).

import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Preview,
} from '@react-email/components';

interface ContactAutoReplyProps {
  name: string;
  productContext?: string;
  locale: 'uz' | 'ru' | 'en';
}

const COPY = {
  uz: {
    preview: 'Murojaatingiz qabul qilindi — Manometr',
    greeting: (n: string) => `Hurmatli ${n},`,
    body: 'Murojaatingiz uchun rahmat. Tez orada siz bilan bogʻlanamiz.',
    productLine: (ctx: string) => `Mahsulot boʻyicha: ${ctx}`,
    signature: '— Manometr jamoasi',
  },
  ru: {
    preview: 'Ваше обращение получено — Manometr',
    greeting: (n: string) => `Уважаемый(ая) ${n},`,
    body: 'Спасибо за обращение. Мы свяжемся с вами в ближайшее время.',
    productLine: (ctx: string) => `По продукту: ${ctx}`,
    signature: '— Команда Manometr',
  },
  en: {
    preview: 'Your inquiry has been received — Manometr',
    greeting: (n: string) => `Dear ${n},`,
    body: 'Thank you for your inquiry. We will get back to you shortly.',
    productLine: (ctx: string) => `Regarding: ${ctx}`,
    signature: '— The Manometr team',
  },
} as const;

export const SUBJECTS = {
  uz: 'Murojaatingiz qabul qilindi',
  ru: 'Ваше обращение получено',
  en: 'Your inquiry has been received',
} as const;

export default function ContactAutoReply({
  name,
  productContext,
  locale,
}: ContactAutoReplyProps) {
  const copy = COPY[locale];
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', padding: '24px' }}>
        <Container>
          <Text>{copy.greeting(name)}</Text>
          <Text>{copy.body}</Text>
          {productContext && (
            <Text style={{ color: '#666' }}>
              {copy.productLine(productContext)}
            </Text>
          )}
          <Text>{copy.signature}</Text>
        </Container>
      </Body>
    </Html>
  );
}
