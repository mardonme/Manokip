// Phase 5 plan 05-02 task 2.5 — React Email contact templates (CTA-02).
//
// Templates are rendered via @react-email/components' `render()` to HTML and
// asserted against. Admin email is English-only (D-09); visitor auto-reply
// is locale-parameterized (uz/ru/en) with conditional productLine fragment
// (D-03 — only present when sourcePage matched a product slug).

import { describe, it, expect } from 'vitest';
import { render } from '@react-email/components';

import ContactAdminEmail, {
  SUBJECT as ADMIN_SUBJECT,
} from '@/emails/contact-admin';
import ContactAutoReply, {
  SUBJECTS as AUTO_SUBJECTS,
} from '@/emails/contact-auto-reply';

describe('Contact email templates', () => {
  it('ContactAdminEmail renders English-only with name/company/email/phone/message/sourcePage/locale/submittedAt', async () => {
    // D-09 — admin email is English-only (admins read English).
    const submittedAt = new Date('2026-05-05T12:34:56.000Z');
    const html = await render(
      ContactAdminEmail({
        name: 'Alisher Karimov',
        company: 'Tashkent Engineering LLC',
        email: 'alisher@example.com',
        phone: '+998 90 123 4567',
        message: 'Need MD-100 spec sheet for Q3 procurement.',
        sourcePage: '/uz/products/md-100',
        locale: 'uz',
        submittedAt,
      }),
    );
    expect(html).toContain('Alisher Karimov');
    expect(html).toContain('Tashkent Engineering LLC');
    expect(html).toContain('alisher@example.com');
    expect(html).toContain('+998 90 123 4567');
    expect(html).toContain('Need MD-100 spec sheet for Q3 procurement.');
    expect(html).toContain('/uz/products/md-100');
    expect(html).toContain('uz');
    expect(html).toContain(submittedAt.toISOString());
    // English-only: subject is fixed, no locale variants.
    expect(ADMIN_SUBJECT).toBe('New contact submission — Manometr');
    // Body must be EN — no Uzbek/Russian COPY-map entry.
    expect(html).toContain('From:');
    expect(html).toContain('Email:');
    expect(html).toContain('Source:');
  });

  it('ContactAutoReply renders uz greeting + body + signature', async () => {
    const html = await render(
      ContactAutoReply({ name: 'Alisher', locale: 'uz' }),
    );
    expect(html).toContain('Hurmatli Alisher');
    expect(html).toContain('Murojaatingiz uchun rahmat');
    expect(html).toContain('Manometr jamoasi');
    expect(AUTO_SUBJECTS.uz).toBe('Murojaatingiz qabul qilindi');
  });

  it('ContactAutoReply renders ru greeting + body + signature', async () => {
    const html = await render(
      ContactAutoReply({ name: 'Алишер', locale: 'ru' }),
    );
    expect(html).toContain('Уважаемый(ая) Алишер');
    expect(html).toContain('Спасибо за обращение');
    expect(html).toContain('Команда Manometr');
    expect(AUTO_SUBJECTS.ru).toBe('Ваше обращение получено');
  });

  it('ContactAutoReply renders en greeting + body + signature', async () => {
    const html = await render(
      ContactAutoReply({ name: 'Alisher', locale: 'en' }),
    );
    expect(html).toContain('Dear Alisher');
    expect(html).toContain('Thank you for your inquiry');
    expect(html).toContain('The Manometr team');
    expect(AUTO_SUBJECTS.en).toBe('Your inquiry has been received');
  });

  it('ContactAutoReply conditionally includes productLine when productContext is provided', async () => {
    // D-03 — when sourcePage is /[locale]/products/<slug>, server prepends a
    // productInquiry line; auto-reply includes the localized productLine row.
    const without = await render(
      ContactAutoReply({ name: 'Alisher', locale: 'uz' }),
    );
    expect(without).not.toContain('Mahsulot boʻyicha');

    const withCtx = await render(
      ContactAutoReply({
        name: 'Alisher',
        productContext: 'Manometr MD-100 (SKU-001)',
        locale: 'uz',
      }),
    );
    expect(withCtx).toContain('Mahsulot boʻyicha: Manometr MD-100 (SKU-001)');
  });
});
