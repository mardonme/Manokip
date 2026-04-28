// Plan 02-08 Task 8.2: magic-link email-harvesting mitigation (T-02-08-01).
//
// Single chokepoint consulted by `sendVerificationRequest` (auth.config.ts)
// BEFORE the Resend SDK send. If the email is not registered AND active,
// short-circuit silently — the caller of the Server Action (login form)
// already returns the same { ok: true } confirmation regardless, so the
// attacker cannot tell whether their probe email is in admin_user.
//
// Lives in its own module (no next-auth import) for two reasons:
//   1. Vitest cannot transitively resolve next-auth's `next/server` ref
//      outside a Next.js runtime — the `auth.config.ts` module is therefore
//      not directly testable. Extracting this seam mirrors the
//      `enforceAbsoluteCap` pattern from plan 02-04.
//   2. Keeps `auth.config.ts` Edge-safe at the static-import layer: this
//      file is reached only via dynamic import inside the Node-runtime
//      `sendVerificationRequest` callback (Auth.js route handler).

import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';

/**
 * Returns true iff `email` corresponds to an `admin_user` row with
 * `active = true`. Returns false for any falsy / non-string input, for
 * unknown emails, and for inactive admins. Never throws — DB errors are
 * logged and treated as "not allowed to send" (fail closed).
 */
export async function isActiveAdminEmail(email: unknown): Promise<boolean> {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;

  // admin_user.email is the PK; Phase-1 D-10/D-11 stores it verbatim and
  // the signIn callback in src/lib/auth.ts uses exact-match — we mirror that
  // contract here to keep both gates consistent.
  try {
    const rows = await db
      .select({ email: adminUsers.email })
      .from(adminUsers)
      .where(and(eq(adminUsers.email, trimmed), eq(adminUsers.active, true)))
      .limit(1);
    return rows.length > 0;
  } catch (err) {
    // Fail-closed: any DB error is treated as "not allowed to send" so we
    // never leak information about the admin set on transient failures.
    console.error('isActiveAdminEmail: DB error', err);
    return false;
  }
}
