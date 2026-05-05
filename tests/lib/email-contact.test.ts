// FLIP-IN: 05-03-PLAN.md
//
// Plan 05-01 RED stub for the React Email contact templates (CTA-02).
// Wave 2 plan 05-03 ships emails/ContactSubmissionAdminEmail.tsx and
// emails/ContactSubmissionAutoReply.tsx. These tests render with
// @react-email/components' render() and assert localized + conditional
// fragments are present.

import { describe, it, expect } from 'vitest';

const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const ADMIN_EMAIL_MODULE = '@/emails/contact-submission-admin';
const AUTOREPLY_EMAIL_MODULE = '@/emails/contact-submission-auto-reply';

describe('Contact email templates', () => {
  it.skip('ContactSubmissionAdminEmail renders English-only with name/company/email/phone/message/sourcePage/locale/submittedAt', async () => {
    // D-09 — admin email is English-only (admins read English).
    const mod = await dynamicImport(ADMIN_EMAIL_MODULE);
    void mod;
    expect.fail(
      'FLIP-IN: 05-03-PLAN.md task creates emails/ContactSubmissionAdminEmail.tsx',
    );
  });

  it.skip('ContactSubmissionAutoReply renders uz greeting + body + signature', async () => {
    // D-08 — visitor auto-reply is locale-parameterized; uz/ru/en are the
    // only valid locales. Strings come from messages/<locale>.json
    // public.contact.autoReply.* (skeleton already in place from plan 05-01).
    const mod = await dynamicImport(AUTOREPLY_EMAIL_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('ContactSubmissionAutoReply renders ru greeting + body + signature', async () => {
    const mod = await dynamicImport(AUTOREPLY_EMAIL_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('ContactSubmissionAutoReply renders en greeting + body + signature', async () => {
    const mod = await dynamicImport(AUTOREPLY_EMAIL_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('ContactSubmissionAutoReply conditionally includes productLine when productContext is provided', async () => {
    // D-03 — when sourcePage is /[locale]/products/<slug>, server prepends a
    // productInquiry line; auto-reply includes the localized productLine row.
    const mod = await dynamicImport(AUTOREPLY_EMAIL_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });
});
