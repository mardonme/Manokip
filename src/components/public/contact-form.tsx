'use client';

// Phase 5 plan 05-03 task 3.1 — visitor-facing ContactForm (CTA-01 + CTA-03).
//
// SSOT for both:
//   - <ContactButton /> Dialog body (mode="modal")
//   - canonical /[locale]/contact page (mode="page", plan 05-04)
//
// Architecture:
//   - 'use client' because react-hook-form + Cloudflare Turnstile both need a
//     client runtime. Strings are sourced via useTranslations('public.contact')
//     so the component is self-contained — no need to thread labels props
//     through every parent.
//   - submitContactForm Server Action (plan 05-02) is invoked inside a
//     useTransition transition so the form stays responsive while the
//     triple-gate (honeypot → Turnstile → rate-limit) executes server-side.
//   - On ok:false the Turnstile widget is reset() so the visitor gets a fresh
//     token (Pitfall 2 — reused tokens are siteverify-rejected).
//   - Honeypot (`field_extra`) is rendered with INLINE off-screen style — NOT
//     a Tailwind class — because Tailwind v4 purge could drop it from the
//     production bundle and reveal the field to humans (T-05-03-01).
//   - sourcePage is captured client-side from usePathname() as a hint; the
//     server re-validates against /^\/(uz|ru|en)\/[a-z0-9\-/]*$/ and falls
//     back to /<locale> on mismatch (T-CTA-04 mitigation in plan 05-02).

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { submitContactForm } from '@/actions/contact';
import { contactInsertSchema, type ContactInsertInput } from '@/lib/zod/contact';

// NEXT_PUBLIC_* is inlined by Next.js at build time, so we read it from
// process.env directly. We deliberately do NOT import `@/env` here: that
// module's t3-env Proxy throws on access of any non-NEXT_PUBLIC key, and any
// stray reference (e.g. via tooling, Sentry instrumentation, or future edits)
// would crash the client bundle with "Attempted to access a server-side
// environment variable on the client". Server-only validation of these keys
// still happens at server boot via src/env.ts.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;

export interface ContactFormProps {
  locale: 'uz' | 'ru' | 'en';
  mode: 'page' | 'modal';
  /** Pre-resolved 'Manometr MD-100 (SKU-001)' display string when opened from a product CTA. */
  productContext?: string;
  /** Modal close hook — fired when the action returns ok:true and mode==='modal'. */
  onSuccess?: () => void;
}

// T-05-03-01 — inline style (NOT Tailwind class) so Tailwind v4 purge can't
// strip the rules and reveal the honeypot to humans.
const HONEYPOT_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const HONEYPOT_LABEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: '-9999px',
};

export function ContactForm({
  locale,
  mode,
  productContext,
  onSuccess,
}: ContactFormProps) {
  const t = useTranslations('public.contact');
  const pathname = usePathname();
  const turnstileRef = React.useRef<TurnstileInstance | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [turnstileToken, setTurnstileToken] = React.useState<string>('');

  const form = useForm<ContactInsertInput>({
    resolver: zodResolver(contactInsertSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      message: '',
      sourcePage: pathname ?? `/${locale}`,
      locale,
      field_extra: '',
      turnstileToken: '',
    },
  });

  const { register, handleSubmit, formState, setValue } = form;

  // Modal can outlive client-side route changes — keep sourcePage in sync.
  React.useEffect(() => {
    if (pathname) setValue('sourcePage', pathname);
  }, [pathname, setValue]);

  // Mirror token state into the RHF field so Zod sees it on submit.
  React.useEffect(() => {
    setValue('turnstileToken', turnstileToken);
  }, [turnstileToken, setValue]);

  function mapError(err: string): string {
    switch (err) {
      case 'validation':
        return t('form.errorValidation');
      case 'turnstile_failed':
        return t('form.errorTurnstile');
      case 'rate_limited':
        return t('form.errorRateLimit');
      default:
        return t('form.errorUnknown');
    }
  }

  function onSubmit(values: ContactInsertInput) {
    setServerError(null);
    startTransition(async () => {
      const res = await submitContactForm(values);
      if (res.ok) {
        setSuccess(true);
        if (mode === 'modal' && onSuccess) onSuccess();
        return;
      }
      // Pitfall 2 — widget reset on EVERY rejected submit so the next attempt
      // starts with a fresh token. Cloudflare siteverify rejects reused tokens.
      turnstileRef.current?.reset();
      setTurnstileToken('');
      setServerError(mapError(res.error));
    });
  }

  // Page-mode success: replace the form with a thank-you state.
  // Modal-mode success: caller closes the modal via onSuccess; we render
  // nothing meaningful here because the modal will unmount.
  if (success && mode === 'page') {
    return (
      <div data-testid="contact-success" className="space-y-2">
        <h2 className="text-lg font-semibold">{t('form.successTitle')}</h2>
        <p className="text-sm text-slate-700">{t('form.successBody')}</p>
      </div>
    );
  }

  // productContext arrives as 'Name (SKU)' — split for the {name}/{sku} ICU
  // placeholders. Defensive parsing: if the format ever changes the entire
  // string is shown verbatim under {name} and {sku} stays empty.
  const productCtxName = productContext
    ? (productContext.split(' (')[0] ?? '')
    : '';
  const productCtxSku = productContext
    ? (productContext.match(/\(([^)]+)\)/)?.[1] ?? '')
    : '';

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
        data-testid="contact-form"
      >
        {productContext && (
          <p
            className="text-sm text-slate-600"
            data-testid="product-context-prefill"
          >
            {t('productInquiry.inquiryAbout', {
              name: productCtxName,
              sku: productCtxSku,
            })}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">{t('form.name')}</Label>
          <Input
            id="name"
            data-testid="contact-name"
            {...register('name')}
            aria-invalid={!!formState.errors.name}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company">{t('form.company')}</Label>
          <Input
            id="company"
            data-testid="contact-company"
            {...register('company')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('form.email')}</Label>
          <Input
            id="email"
            type="email"
            data-testid="contact-email"
            {...register('email')}
            aria-invalid={!!formState.errors.email}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t('form.phone')}</Label>
          <Input
            id="phone"
            data-testid="contact-phone"
            {...register('phone')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="message">{t('form.message')}</Label>
          <Textarea
            id="message"
            rows={6}
            data-testid="contact-message"
            {...register('message')}
            aria-invalid={!!formState.errors.message}
          />
        </div>

        {/*
          Honeypot — off-screen via INLINE style (not Tailwind class — purge
          risk per Pitfall 3 / T-05-03-01). Field name is `field_extra`
          (NOT 'honeypot'/'email_confirm') so heuristic bots can't recognise
          and skip it. tabIndex=-1 keeps keyboard nav out, autoComplete=off
          tells password managers to ignore it, aria-hidden hides it from AT.
        */}
        <label
          htmlFor="field_extra"
          aria-hidden="true"
          style={HONEYPOT_LABEL_STYLE}
        >
          {t('form.honeypotLabel')}
        </label>
        <input
          id="field_extra"
          type="text"
          {...register('field_extra')}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={HONEYPOT_STYLE}
          data-testid="honeypot"
        />

        {/* Hidden bookkeeping fields */}
        <input
          type="hidden"
          {...register('sourcePage')}
          data-testid="source-page"
        />
        <input type="hidden" {...register('locale')} />
        <input type="hidden" {...register('turnstileToken')} />

        <div data-testid="turnstile-host">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            // Open Q §4 — Cloudflare Turnstile widget supports 'ru'/'en' but
            // not 'uz'; fall back to 'auto' for the Uzbek surface so the
            // widget picks the browser locale rather than crashing.
            options={{ language: locale === 'uz' ? 'auto' : locale }}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken('')}
            onExpire={() => setTurnstileToken('')}
          />
        </div>

        {serverError && (
          <p
            role="alert"
            className="text-sm text-red-600"
            data-testid="contact-error"
          >
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending || !turnstileToken}
          data-testid="contact-submit"
        >
          {pending ? t('form.submitting') : t('form.submit')}
        </Button>
      </form>
    </FormProvider>
  );
}
