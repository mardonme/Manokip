// Plan 05-03 task 3.1 — flipped GREEN from plan 05-01 RED stub.
//
// jsdom specs for src/components/public/contact-form.tsx (CTA-01 + CTA-03).
// Mocks:
//   - @marsidev/react-turnstile — replaced with a stub that exposes a
//     test-only `__resetSpy` ref + a programmatic `__emitToken(token)` so
//     specs can simulate the onSuccess callback without booting Cloudflare.
//   - next/navigation usePathname — fixed to /uz/products/manometr-m-100 so
//     the sourcePage hidden input has a deterministic value.
//   - @/actions/contact submitContactForm — controlled discriminated returns.
//   - @/env — provides NEXT_PUBLIC_TURNSTILE_SITE_KEY without booting t3-env.
//   - next-intl useTranslations — returns identity fn so spec assertions can
//     match on raw key paths.

import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from '@testing-library/react';

// --- Module mocks (must come BEFORE module imports) ----------------------

const turnstileResetSpy = vi.fn();
let turnstileOnSuccess: ((token: string) => void) | null = null;

vi.mock('@marsidev/react-turnstile', () => {
  return {
    Turnstile: React.forwardRef(function TurnstileStub(
      props: { onSuccess?: (token: string) => void },
      ref: React.Ref<{ reset: () => void }>,
    ) {
      turnstileOnSuccess = props.onSuccess ?? null;
      React.useImperativeHandle(ref, () => ({
        reset: () => turnstileResetSpy(),
      }));
      return React.createElement('div', { 'data-testid': 'turnstile-stub' });
    }),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/uz/products/manometr-m-100',
}));

vi.mock('@/actions/contact', () => ({
  submitContactForm: vi.fn(),
}));

vi.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, string | number>) => {
      if (!values) return key;
      // Stub interpolation: append `name=Manometr MD-100 sku=SKU-001` to the
      // key so productContext-prefill assertions can match on the values
      // without depending on real ICU message strings.
      const tail = Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      return `${key} ${tail}`;
    };
    return t;
  },
}));

// --- Imports (after mocks) -----------------------------------------------

import { ContactForm } from '@/components/public/contact-form';
import { submitContactForm } from '@/actions/contact';

beforeEach(() => {
  cleanup();
  turnstileResetSpy.mockReset();
  turnstileOnSuccess = null;
  vi.mocked(submitContactForm).mockReset();
});

function emitTurnstileToken(token = 'tok-fake-123') {
  if (!turnstileOnSuccess) {
    throw new Error('Turnstile stub not yet rendered');
  }
  act(() => {
    turnstileOnSuccess!(token);
  });
}

describe('<ContactForm />', () => {
  it('renders 5 visible inputs (name/company/email/phone/message) + Turnstile widget mount', () => {
    render(<ContactForm locale="uz" mode="page" />);
    expect(screen.getByTestId('contact-name')).toBeDefined();
    expect(screen.getByTestId('contact-company')).toBeDefined();
    expect(screen.getByTestId('contact-email')).toBeDefined();
    expect(screen.getByTestId('contact-phone')).toBeDefined();
    expect(screen.getByTestId('contact-message')).toBeDefined();
    expect(screen.getByTestId('turnstile-stub')).toBeDefined();
  });

  it('renders honeypot input field_extra with off-screen inline style + aria-hidden + tabIndex=-1 + autoComplete=off', () => {
    render(<ContactForm locale="uz" mode="page" />);
    const honeypot = screen.getByTestId('honeypot') as HTMLInputElement;
    expect(honeypot.id).toBe('field_extra');
    expect(honeypot.getAttribute('aria-hidden')).toBe('true');
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.getAttribute('autocomplete')).toBe('off');
    // Inline style — Tailwind purge cannot affect inline styles.
    expect(honeypot.style.position).toBe('absolute');
    expect(honeypot.style.clip).toBe('rect(0px, 0px, 0px, 0px)');
  });

  it('captures sourcePage hidden field from usePathname()', () => {
    render(<ContactForm locale="uz" mode="page" />);
    const sourcePageInput = screen.getByTestId('source-page') as HTMLInputElement;
    expect(sourcePageInput.value).toBe('/uz/products/manometr-m-100');
  });

  it('on ok:false error:turnstile_failed, calls turnstileRef.current.reset() and shows errorTurnstile copy', async () => {
    vi.mocked(submitContactForm).mockResolvedValueOnce({
      ok: false,
      error: 'turnstile_failed',
    });
    render(<ContactForm locale="uz" mode="page" />);

    fireEvent.change(screen.getByTestId('contact-name'), {
      target: { value: 'Ali' },
    });
    fireEvent.change(screen.getByTestId('contact-email'), {
      target: { value: 'ali@example.com' },
    });
    fireEvent.change(screen.getByTestId('contact-message'), {
      target: { value: 'Hello, please send specs.' },
    });
    emitTurnstileToken();

    await waitFor(() => {
      expect((screen.getByTestId('contact-submit') as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.submit(screen.getByTestId('contact-form'));

    await waitFor(() => {
      expect(turnstileResetSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('contact-error').textContent).toContain(
      'form.errorTurnstile',
    );
  });

  it('on ok:false error:rate_limited, shows errorRateLimit copy', async () => {
    vi.mocked(submitContactForm).mockResolvedValueOnce({
      ok: false,
      error: 'rate_limited',
    });
    render(<ContactForm locale="uz" mode="page" />);

    fireEvent.change(screen.getByTestId('contact-name'), {
      target: { value: 'Ali' },
    });
    fireEvent.change(screen.getByTestId('contact-email'), {
      target: { value: 'ali@example.com' },
    });
    fireEvent.change(screen.getByTestId('contact-message'), {
      target: { value: 'Hello.' },
    });
    emitTurnstileToken();

    await waitFor(() => {
      expect((screen.getByTestId('contact-submit') as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.submit(screen.getByTestId('contact-form'));

    await waitFor(() => {
      expect(screen.getByTestId('contact-error').textContent).toContain(
        'form.errorRateLimit',
      );
    });
  });

  it('on ok:true (mode="page"), swaps to success state', async () => {
    vi.mocked(submitContactForm).mockResolvedValueOnce({
      ok: true,
      data: { id: '1' },
    });
    render(<ContactForm locale="uz" mode="page" />);

    fireEvent.change(screen.getByTestId('contact-name'), {
      target: { value: 'Ali' },
    });
    fireEvent.change(screen.getByTestId('contact-email'), {
      target: { value: 'ali@example.com' },
    });
    fireEvent.change(screen.getByTestId('contact-message'), {
      target: { value: 'Hello.' },
    });
    emitTurnstileToken();

    await waitFor(() => {
      expect((screen.getByTestId('contact-submit') as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.submit(screen.getByTestId('contact-form'));

    await waitFor(() => {
      expect(screen.getByTestId('contact-success')).toBeDefined();
    });
  });

  it('on ok:true (mode="modal"), calls onSuccess prop so parent Dialog can close', async () => {
    vi.mocked(submitContactForm).mockResolvedValueOnce({
      ok: true,
      data: { id: '1' },
    });
    const onSuccess = vi.fn();
    render(<ContactForm locale="uz" mode="modal" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByTestId('contact-name'), {
      target: { value: 'Ali' },
    });
    fireEvent.change(screen.getByTestId('contact-email'), {
      target: { value: 'ali@example.com' },
    });
    fireEvent.change(screen.getByTestId('contact-message'), {
      target: { value: 'Hello.' },
    });
    emitTurnstileToken();

    await waitFor(() => {
      expect((screen.getByTestId('contact-submit') as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.submit(screen.getByTestId('contact-form'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('renders productContext prefill when provided', () => {
    render(
      <ContactForm
        locale="uz"
        mode="modal"
        productContext="Manometr MD-100 (SKU-001)"
      />,
    );
    const prefill = screen.getByTestId('product-context-prefill');
    expect(prefill.textContent).toContain('Manometr MD-100');
    expect(prefill.textContent).toContain('SKU-001');
  });
});
