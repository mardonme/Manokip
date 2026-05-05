// FLIP-IN: 05-03-PLAN.md
//
// Plan 05-01 RED stub for the visitor-side <ContactForm /> component
// (CTA-01 + CTA-03). Wave 2 plan 05-03 ships
// src/components/public/contact-form.tsx (RHF + Zod + Turnstile widget +
// useActionState + locale-aware error/success copy).
//
// Mock chain (will be wired in plan 05-03):
//   - vi.mock('@marsidev/react-turnstile') — replace the Turnstile widget
//     with a stub component that exposes a fake onSuccess() / reset()
//     handle so jsdom doesn't try to load Cloudflare's iframe.
//   - vi.mock('@/actions/contact') — submitContactForm returns ok:true /
//     ok:false { error: 'turnstile_failed' | 'rate_limited' | ... }
//     deterministically per test.

import * as React from 'react';
import { describe, it, expect } from 'vitest';

const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const CONTACT_FORM_MODULE = '@/components/public/contact-form';

void React;

describe('<ContactForm />', () => {
  it.skip('renders 5 visible inputs (name/company/email/phone/message) + Turnstile widget mount', async () => {
    const mod = await dynamicImport(CONTACT_FORM_MODULE);
    void mod;
    expect.fail(
      'FLIP-IN: 05-03-PLAN.md task creates src/components/public/contact-form.tsx',
    );
  });

  it.skip('renders honeypot input field_extra with off-screen inline style + aria-hidden + tabIndex=-1 + autoComplete=off', async () => {
    // Specifics — honeypot field name is field_extra (NOT 'honeypot');
    // off-screen via `position:absolute; left:-9999px`; aria-hidden so
    // screen readers skip it; tabIndex=-1 so keyboard nav skips it;
    // autoComplete=off so password managers skip it.
    const mod = await dynamicImport(CONTACT_FORM_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('captures sourcePage hidden field from usePathname()', async () => {
    // CTA-03 — visitor-supplied sourcePage feeds into the auto-prepend
    // product-context detection (server side re-validates, never trusts).
    const mod = await dynamicImport(CONTACT_FORM_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('on ok:false error:turnstile_failed, calls turnstileRef.current.reset() and shows errorTurnstile copy', async () => {
    // The widget MUST be reset so the next submit gets a fresh token;
    // localized copy from messages/<locale>.json public.contact.form.errorTurnstile.
    const mod = await dynamicImport(CONTACT_FORM_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('on ok:false error:rate_limited, shows errorRateLimit copy', async () => {
    // Localized copy from messages/<locale>.json public.contact.form.errorRateLimit.
    const mod = await dynamicImport(CONTACT_FORM_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('on ok:true, swaps to success state (mode="page") OR calls onSuccess (mode="modal")', async () => {
    // D-01 — same component renders in two modes:
    //   - page: replaces form with success copy (canonical /[locale]/contact)
    //   - modal: invokes onSuccess prop so the parent <ContactButton /> Dialog can close
    const mod = await dynamicImport(CONTACT_FORM_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });
});
