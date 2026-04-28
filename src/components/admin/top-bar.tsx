// Admin shell top bar — server component. Shows the logged-in admin email
// (D-15 informational; admin sees their own email, not a secret) and a
// sign-out form whose action posts to an inline Server Action that calls
// Auth.js v5's `signOut({ redirectTo: '/{locale}/login' })`.
//
// No /api/auth/signout route is involved; Server Actions are the canonical
// Phase-2 mutation surface (CONTEXT D-16, anti-pattern #4 in PATTERNS.md).
// CSRF is mitigated automatically by Next.js Server Action origin checks
// (T-02-02-02 in plan threat model — no extra wiring needed).

import { signOut } from '@/lib/auth';

async function signOutAction(formData: FormData): Promise<void> {
  'use server';
  const locale = String(formData.get('locale') || 'uz');
  await signOut({ redirect: true, redirectTo: `/${locale}/login` });
}

type Props = {
  email: string;
  signOutLabel: string;
  locale: string;
};

export function AdminTopBar({ email, signOutLabel, locale }: Props) {
  return (
    <header
      className="flex items-center justify-between border-b bg-background px-6 py-3"
      data-testid="admin-topbar"
    >
      <span
        data-testid="admin-email"
        className="text-sm text-muted-foreground"
      >
        {email}
      </span>
      <form action={signOutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          {signOutLabel}
        </button>
      </form>
    </header>
  );
}
