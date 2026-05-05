// FLIP-IN: 05-03-PLAN.md
//
// Plan 05-01 RED stub for the sticky <ContactButton /> Dialog trigger
// (CTA-01). Wave 2 plan 05-03 ships
// src/components/public/contact-button.tsx — a 'use client' wrapper that
// mounts a shadcn Dialog and renders <ContactForm mode="modal" /> inside.

import * as React from 'react';
import { describe, it, expect } from 'vitest';

const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const CONTACT_BUTTON_MODULE = '@/components/public/contact-button';

void React;

describe('<ContactButton />', () => {
  it.skip('renders sticky button with localized label', async () => {
    // Label sourced from messages/<locale>.json public.contact.cta
    // ("Bog'lanish" / "Связаться" / "Contact us").
    const mod = await dynamicImport(CONTACT_BUTTON_MODULE);
    void mod;
    expect.fail(
      'FLIP-IN: 05-03-PLAN.md task creates src/components/public/contact-button.tsx',
    );
  });

  it.skip('clicking the button opens shadcn Dialog (open=true)', async () => {
    const mod = await dynamicImport(CONTACT_BUTTON_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('the Dialog body mounts <ContactForm mode="modal" />', async () => {
    // The same <ContactForm /> component used on /[locale]/contact (D-01);
    // mode="modal" swaps the success state from "replace form" to "call
    // onSuccess prop" so the parent Dialog can close.
    const mod = await dynamicImport(CONTACT_BUTTON_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });

  it.skip('passes productContext prop through when provided', async () => {
    // Product detail's sticky CTA rail (Phase-3 sketch 003) wires its
    // "Get in touch" button to <ContactButton productContext={{...}} />.
    // The button forwards productContext to <ContactForm /> so the modal
    // body shows "Inquiry about: <product>" inline.
    const mod = await dynamicImport(CONTACT_BUTTON_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-03-PLAN.md');
  });
});
