'use server';

// Server Action bound to the login form. Validates email + locale with Zod,
// then delegates to Auth.js signIn('resend', ...) which:
//   1. Creates a verification_tokens row (Auth.js internals).
//   2. Invokes the Resend provider's sendVerificationRequest (auth.config.ts),
//      which renders the React Email template and sends via Resend.
// The signIn callback (auth.ts) authorizes the email against admin_user only
// AFTER the user clicks the link — ensuring unknown emails can still submit
// (to avoid enumeration) but only admins land on /admin/.

import { signIn } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(routing.locales),
});

// Phase 1 shape: returns void for direct <form action={...}> binding in an RSC
// (React 19 DOM typings reject non-void returns on Server Actions passed to
// <form action>). Phase 2 will switch the page to a client component using
// useActionState + a discriminated return union so the UI can render
// check-your-email vs. invalid-input state. For now we silently swallow
// failures — acceptable because (a) the magic-link UX doesn't distinguish
// known from unknown email (avoids enumeration), and (b) plan 06's e2e
// magic-link-login test drives the happy path from Resend's event stream.
export async function requestMagicLink(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return;

  const { email, locale } = parsed.data;

  try {
    await signIn('resend', {
      email,
      redirect: false,
      redirectTo: `/${locale}/admin`,
    });
  } catch {
    // Phase 2 surfaces this via useActionState; Phase 1 intentionally silent.
    return;
  }
}
