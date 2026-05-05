// FLIP-IN: 05-02-PLAN.md
//
// Plan 05-01 RED stub for the visitor-side submitContactForm Server Action
// (CTA-01 + CTA-02 + CTA-03). Wave 1 plan 05-02 ships src/actions/contact.ts.
// Wave 2 plan 05-03 hooks the email templates into the fire-and-forget
// notify path and lights up the auto-reply.

import { describe, it, expect } from 'vitest';

const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const CONTACT_ACTION_MODULE = '@/actions/contact';

describe('submitContactForm', () => {
  it.skip('happy path: inserts contact_submission row + returns ok:true with row id (string)', async () => {
    // Contract: INSERT contact_submission row inside a transaction, write an
    // audit_log row (action='contact_submission_create', actorEmail='visitor'),
    // commit, then fire-and-forget admin email + auto-reply (D-10 — Resend
    // failures must NOT fail the submission).
    const mod = await dynamicImport(CONTACT_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md task creates src/actions/contact.ts');
  });

  it.skip('product-context auto-prepend: when sourcePage matches /(uz|ru|en)/products/<slug>, message is prefixed with localized inquiryAbout line', async () => {
    // D-03 — server-side prepend (NOT client-side) so admins see context
    // inline without new UI. Auto-prepend uses
    // messages/<locale>.json public.contact.productInquiry.inquiryAbout.
    const mod = await dynamicImport(CONTACT_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('sourcePage validation: invalid sourcePage falls back to /<locale>', async () => {
    // Pitfall 11: sourcePage is visitor-supplied; never trust as-is. The
    // action validates against /^\/(uz|ru|en)(\/.*)?$/ and falls back to
    // /<locale> root if it doesn't match.
    const mod = await dynamicImport(CONTACT_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('Resend admin send failure does NOT fail the submission (fire-and-forget)', async () => {
    // D-10 — emails are best-effort; Resend outage logged to Sentry but the
    // action still returns ok:true with the row id.
    const mod = await dynamicImport(CONTACT_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('ADMIN_NOTIFY_EMAILS empty: skips admin send without raising', async () => {
    // D-07 + Pitfall 5 — empty/unset ADMIN_NOTIFY_EMAILS short-circuits the
    // admin-notify branch (Resend would reject empty recipients).
    const mod = await dynamicImport(CONTACT_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });
});
