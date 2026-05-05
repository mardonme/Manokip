// Plan 05-03 task 3.2 — flipped GREEN from plan 05-01 RED stub.
//
// jsdom specs for src/components/public/contact-button.tsx (CTA-01).
//
// Mocks:
//   - @/components/public/contact-form — stub component that records the
//     props it receives so specs can assert mode="modal" + onSuccess wiring
//     + productContext forwarding without booting the real ContactForm
//     (which pulls in Turnstile, env, RHF, etc.).
//   - next-intl useTranslations — returns identity fn so the cta label
//     renders as the literal `cta` key string (still satisfies "localized
//     label" — assertions just compare on the visible token).

import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';

// --- Module mocks (must come BEFORE module imports) ----------------------

const contactFormPropsLog: Array<Record<string, unknown>> = [];

vi.mock('@/components/public/contact-form', () => ({
  ContactForm: (props: Record<string, unknown>) => {
    contactFormPropsLog.push(props);
    return React.createElement(
      'div',
      { 'data-testid': 'contact-form-stub' },
      'ContactForm stub',
    );
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// --- Imports (after mocks) -----------------------------------------------

import { ContactButton } from '@/components/public/contact-button';

beforeEach(() => {
  cleanup();
  contactFormPropsLog.length = 0;
});

describe('<ContactButton />', () => {
  it('renders sticky button with localized cta label', () => {
    render(<ContactButton locale="uz" />);
    const btn = screen.getByTestId('contact-button');
    expect(btn).toBeDefined();
    // The mocked useTranslations returns the key — `cta` resolves to "cta"
    // verbatim, which is enough to prove the localized lookup happened.
    expect(btn.textContent).toContain('cta');
  });

  it('clicking the button opens the shadcn Dialog (ContactForm mounts)', async () => {
    render(<ContactButton locale="uz" />);
    const btn = screen.getByTestId('contact-button');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByTestId('contact-form-stub')).toBeDefined();
    });
  });

  it('Dialog body mounts <ContactForm mode="modal" /> with onSuccess prop', async () => {
    render(<ContactButton locale="uz" />);
    fireEvent.click(screen.getByTestId('contact-button'));
    await waitFor(() => {
      expect(contactFormPropsLog.length).toBeGreaterThanOrEqual(1);
    });
    const lastProps = contactFormPropsLog[contactFormPropsLog.length - 1]!;
    expect(lastProps.mode).toBe('modal');
    expect(typeof lastProps.onSuccess).toBe('function');
    expect(lastProps.locale).toBe('uz');
  });

  it('forwards productContext prop through to ContactForm when provided', async () => {
    render(
      <ContactButton
        locale="ru"
        productContext="Manometr MD-100 (SKU-001)"
      />,
    );
    fireEvent.click(screen.getByTestId('contact-button'));
    await waitFor(() => {
      expect(contactFormPropsLog.length).toBeGreaterThanOrEqual(1);
    });
    const lastProps = contactFormPropsLog[contactFormPropsLog.length - 1]!;
    expect(lastProps.productContext).toBe('Manometr MD-100 (SKU-001)');
    expect(lastProps.locale).toBe('ru');
  });
});
