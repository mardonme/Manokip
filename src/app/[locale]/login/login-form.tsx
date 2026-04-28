'use client';

// Plan 02-08: client-component magic-link login form using React 19's
// useActionState. The Phase-1 page bound the Server Action directly to
// <form action>, which constrains the action to a void return — that meant
// no success/error UX surface (decisions log of plan 01-05 explicitly
// deferred this here).
//
// Discriminated state shape:
//   null                                  — idle (form rendered)
//   { ok: true }                          — anti-enumeration success banner
//   { ok: false; error: 'invalid_email' } — bad input banner
//   { ok: false; error: 'unknown' }       — unexpected failure banner
//
// The 'access_denied' state is rendered separately at the top of the form
// when the page passes `initialError='access_denied'` (driven by the
// `?error=AccessDenied` query string Auth.js redirects to). It coexists
// with the form so a denied user can re-submit a different email.
//
// Anti-enumeration (T-02-08-02 in the plan threat model): the action ALWAYS
// returns `{ ok: true }` for syntactically valid emails. Whether the email
// is registered + active is checked deeper (auth.config.ts's
// sendVerificationRequest short-circuits before the Resend send for unknown
// emails — Task 8.2). This UI never sees that distinction.

import { useActionState } from 'react';
import { requestMagicLink, type RequestMagicLinkState } from './actions';

export type LoginFormLabels = {
  title: string;
  prompt: string;
  email: string;
  submit: string;
  success: string;
  invalidEmail: string;
  unknown: string;
  accessDenied: string;
};

type ActionState = RequestMagicLinkState | null;

export function LoginForm({
  locale,
  labels,
  initialError,
}: {
  locale: string;
  labels: LoginFormLabels;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestMagicLink,
    null,
  );

  const showAccessDenied = initialError === 'access_denied';

  if (state?.ok) {
    return (
      <div
        data-testid="login-success"
        role="status"
        className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
      >
        {labels.success}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showAccessDenied && (
        <div
          data-testid="login-access-denied"
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"
        >
          {labels.accessDenied}
        </div>
      )}

      <form
        data-testid="login-form"
        action={formAction}
        className="space-y-3"
      >
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="login-email" className="block text-sm text-muted-foreground">
          {labels.prompt}
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={labels.email}
          data-testid="login-email"
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
        />
        {state && !state.ok && (
          <div
            data-testid="login-error"
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900"
          >
            {state.error === 'invalid_email' ? labels.invalidEmail : labels.unknown}
          </div>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {labels.submit}
        </button>
      </form>
    </div>
  );
}
