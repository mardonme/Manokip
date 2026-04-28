'use server';

// Plan 02-08: discriminated-return Server Action consumed by the LoginForm
// client component via React 19's useActionState. Replaces the Phase-1 void
// return (the `<form action={fn}>` constraint that forced the original DEF
// in plan 01-05's decisions log).
//
// Anti-enumeration contract (T-02-08-02):
//   - Valid email + Auth.js signIn rejection (e.g. AccessDenied because the
//     email is not in admin_user) -> still returns { ok: true }. The actual
//     email-send is gated server-side by sendVerificationRequest (Task 8.2,
//     auth.config.ts) which short-circuits before Resend if the email is not
//     a known active admin. From the form's perspective, every valid email
//     yields the same "Check your email" confirmation.
//   - Invalid email format -> { ok: false, error: 'invalid_email' } (this is
//     a client-side hint and does not reveal anything about the server's
//     admin list).
//   - Any other unexpected error -> { ok: false, error: 'unknown' }.

import { signIn } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import { z } from 'zod';

export type RequestMagicLinkState =
  | { ok: true }
  | { ok: false; error: 'invalid_email' | 'unknown' };

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(routing.locales),
});

export async function requestMagicLink(
  _prev: RequestMagicLinkState | null,
  formData: FormData,
): Promise<RequestMagicLinkState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid_email' };

  const { email, locale } = parsed.data;

  try {
    await signIn('resend', {
      email,
      redirect: false,
      redirectTo: `/${locale}/admin`,
    });
    return { ok: true };
  } catch (err) {
    // AccessDenied surfaces as Auth.js redirect-error or as an Error whose
    // message includes 'AccessDenied'. The signIn callback in src/lib/auth.ts
    // already enforces "must be active admin"; the email-send gate in
    // auth.config.ts (Task 8.2) prevents the Resend send for unknown emails.
    // Both paths are anti-enumeration: collapse to the same { ok: true }
    // confirmation so the client can't distinguish "registered admin" from
    // "unknown email" via the response shape.
    if (err instanceof Error && err.message.toLowerCase().includes('accessdenied')) {
      return { ok: true };
    }
    // Auth.js redirect-control also throws; treat NEXT_REDIRECT as success
    // (it means signIn proceeded far enough to want to redirect, i.e. the
    // verification token row was created and the email was queued).
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as { digest?: string }).digest?.startsWith?.('NEXT_REDIRECT'))
    ) {
      return { ok: true };
    }
    return { ok: false, error: 'unknown' };
  }
}
