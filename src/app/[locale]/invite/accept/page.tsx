// Plan 02-07 Task 7.3 — accept-invite landing page (D-14, ADMIN-02).
//
// Unauthenticated route. The recipient clicks the link from
// AdminInviteEmail (`/[locale]/invite/accept?token=…`), this RSC consumes
// the token via the acceptInvite Server Action (which performs the atomic
// single-UPDATE per Pitfall #4), and renders one of three states:
//
//   - Missing token            -> "missing token" notice
//   - Token consumed (ok=true) -> redirect to /[locale]/login?email=…
//                                 so Auth.js v5 sends the magic-link email
//                                 to the now-active admin_user.
//   - Token rejected (ok=false)-> single constant message ("invalid or
//                                 expired") regardless of the underlying
//                                 cause (T-02-07-06 — defeats email
//                                 enumeration; the UUID search space is 122
//                                 bits so we lose nothing by collapsing the
//                                 error states).
//
// Closest analog: src/app/[locale]/login/page.tsx (RSC + setRequestLocale)
// + src/app/[locale]/login/actions.ts (Server Action invocation pattern).
//
// NOTE: not under `/[locale]/admin/*`, so the admin auth gate in proxy.ts
// (line 46) does not apply — the invitee is by definition unauthenticated.

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { acceptInvite } from '@/actions/admins';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

// Phase 3 Plan 01 / Pitfall A6: cacheComponents requires runtime data
// fetches (here, the searchParams + acceptInvite DB call) to live inside a
// <Suspense> boundary so the static page shell can prerender while the
// dynamic invite-consumption streams in.

async function InviteAcceptanceFlow({
  locale,
  searchParams,
}: {
  locale: string;
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Branch 1: link arrived without a token at all (someone hand-typed the
  // URL or an email client mangled the query string). Render a helpful
  // notice rather than redirecting — there's nothing to redirect to.
  if (!token) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Missing invite token</h1>
        <p className="mt-2 text-muted-foreground">
          This invite link is missing the token parameter. Please use the link
          from your invitation email, or ask the admin who invited you to
          re-send it.
        </p>
      </main>
    );
  }

  // Atomic consume — the WHERE used_at IS NULL guard inside acceptInvite
  // makes a second click after success a no-op (the second call returns
  // ok:false, mapped to the same "invalid or expired" notice below).
  const result = await acceptInvite(token);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">
          Invite link is invalid or expired
        </h1>
        <p className="mt-2 text-muted-foreground">
          This invitation may have already been used, or it has expired (links
          are valid for 48 hours). Ask the admin who invited you to send a
          fresh invitation.
        </p>
        <p className="mt-6 text-sm">
          <Link href={`/${locale}/login`} className="underline">
            Back to sign-in
          </Link>
        </p>
      </main>
    );
  }

  // Happy path — admin_user.active is now true. Hand the user off to
  // /[locale]/login with their email pre-filled so Auth.js v5 magic-link
  // sign-in is one click away. redirect() throws a special Next.js
  // navigation signal; any code after it is unreachable.
  redirect(`/${locale}/login?email=${encodeURIComponent(result.email)}`);
}

export default async function AcceptInvitePage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-6 py-16 text-center">
          <p className="text-muted-foreground">Processing your invitation…</p>
        </main>
      }
    >
      <InviteAcceptanceFlow locale={locale} searchParams={searchParams} />
    </Suspense>
  );
}
