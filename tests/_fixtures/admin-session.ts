// Plan 02-04 Wave-0: createActiveAdminSession() — the canonical test fixture
// every Wave-2/3/4 action integration test depends on. Inserts a fresh
// admin_user(active=true) + auth_users row + sessions row directly into
// the live Neon test branch and returns the cookie value (sessionToken)
// alongside a `cleanup()` function that drops all three rows.
//
// Activates plan 02-03's e2e fixme probes (tests/e2e/admin-session-cap.spec.ts)
// + plan 02-02's admin-shell smoke (tests/e2e/admin-shell.spec.ts) once those
// agents flip the .fixme markers. We do NOT touch those e2e files here —
// fixture authoring only, per plan 02-04's <sequential_execution> note.
//
// Usage (Vitest):
//   const session = await createActiveAdminSession();
//   try { /* ... */ } finally { await session.cleanup(); }
//
// Usage (Playwright e2e):
//   await page.context().addCookies([{
//     name: 'authjs.session-token',
//     value: session.cookieValue,
//     url: 'http://localhost:3000',
//   }]);
//
// Default windows match Phase-1 D-15 caps verbatim:
//   expires (24h idle)         = now + 24h
//   absolute_expires (7d cap)  = now + 7d
//
// Override `absoluteExpiresOffsetSec: -3600` (1h ago) to simulate a
// cap-rejected session for the require-admin test, etc.

import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from './db';
import { adminUsers, authUsers, sessions } from '@/db/schema';

export interface CreateActiveAdminSessionOptions {
  /** Admin email; auto-generated if omitted. */
  email?: string;
  /** sessions.absolute_expires offset in seconds from now. Default +7d. */
  absoluteExpiresOffsetSec?: number;
  /** sessions.expires (24h idle) offset in seconds from now. Default +24h. */
  expiresOffsetSec?: number;
  /** admin_user.role override. Default 'admin'. */
  role?: string;
  /** admin_user.active override. Default true. */
  active?: boolean;
}

export interface ActiveAdminSession {
  /** Generated or supplied admin email. */
  email: string;
  /** authjs.session-token cookie value (== sessions.session_token). */
  sessionToken: string;
  /** Convenience alias of `sessionToken`, named for cookie injection clarity. */
  cookieValue: string;
  /** auth_users.id — useful for tests that need to assert on the FK. */
  userId: string;
  /** Drops sessions, auth_users, admin_user rows in the right order. */
  cleanup: () => Promise<void>;
}

const DEFAULT_ABS_OFFSET = 7 * 24 * 60 * 60; // 7d
const DEFAULT_EXP_OFFSET = 24 * 60 * 60; // 24h

export async function createActiveAdminSession(
  opts: CreateActiveAdminSessionOptions = {},
): Promise<ActiveAdminSession> {
  requireTestDatabaseUrl();
  const db = await getTestDb();

  const email = opts.email ?? `test-admin+${randomUUID().slice(0, 8)}@manometr.uz`;
  const sessionToken = randomUUID();
  const now = Date.now();
  const absMs = now + (opts.absoluteExpiresOffsetSec ?? DEFAULT_ABS_OFFSET) * 1000;
  const expMs = now + (opts.expiresOffsetSec ?? DEFAULT_EXP_OFFSET) * 1000;

  // 1. admin_user row (the gate signIn() consults). PK is the email.
  await db
    .insert(adminUsers)
    .values({
      email,
      role: opts.role ?? 'admin',
      active: opts.active ?? true,
    })
    .onConflictDoNothing();

  // 2. auth_users row (Auth.js DrizzleAdapter requires this for the
  //    sessions.user_id FK). PK is a generated UUID; email is `unique`,
  //    not the PK, so we onConflictDoUpdate to make the call idempotent
  //    and still recover the existing id via .returning().
  const [userRow] = await db
    .insert(authUsers)
    .values({ email })
    .onConflictDoUpdate({
      target: authUsers.email,
      set: { email },
    })
    .returning({ id: authUsers.id });

  if (!userRow) {
    throw new Error(
      'createActiveAdminSession: failed to upsert auth_users row for ' + email,
    );
  }

  // 3. sessions row — token is the cookie value the test injects.
  await db.insert(sessions).values({
    sessionToken,
    userId: userRow.id,
    expires: new Date(expMs),
    absoluteExpires: new Date(absMs),
  });

  return {
    email,
    sessionToken,
    cookieValue: sessionToken,
    userId: userRow.id,
    cleanup: async () => {
      // Order: sessions (FK -> auth_users) -> auth_users -> admin_user.
      // admin_user has no FK on auth_users (D-10/D-11 — app-owned table
      // keyed by email), so its ordering only matters for symmetry.
      await db.execute(
        sql`DELETE FROM sessions WHERE session_token = ${sessionToken}`,
      );
      await db.execute(sql`DELETE FROM auth_users WHERE id = ${userRow.id}`);
      await db.execute(sql`DELETE FROM admin_user WHERE email = ${email}`);
    },
  };
}
