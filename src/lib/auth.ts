// Node-runtime Auth.js v5 composition — glues auth.config.ts to DrizzleAdapter
// + live-DB signIn callback + D-09 7d absolute session cap enforcement.
//
// Import this file from Server Actions, RSCs, and /api/auth route handlers.
// DO NOT import it from middleware.ts (Edge runtime) — use ./auth.config
// directly there (plan 06 pattern).

import NextAuth, { type DefaultSession } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  authUsers,
  authAccounts,
  sessions,
  verificationTokens,
  adminUsers,
} from '@/db/schema';
import authConfig from './auth.config';

// Augment the default Session type to expose the opaque sessionToken (cookie
// value, not user-facing) so requireAdmin() can enforce the D-09 7d absolute
// cap against sessions.absoluteExpires. The value is only stamped server-side
// by the session callback below; it's never part of the JSON returned over
// the wire to the client — consumers of auth() on the server can use it.
declare module 'next-auth' {
  interface Session extends DefaultSession {
    sessionToken?: string;
  }
}

// D-09 dual session caps.
// IDLE: sliding 24h — Auth.js refreshes sessions.expires on every
// authenticated request (via DrizzleAdapter). Sessions unused for >24h
// have sessions.expires < now() and auth() returns null.
// ABSOLUTE: 7d hard cap — stamped once into sessions.absoluteExpires on
// first session read (guarded by isNull so the UPDATE is idempotent).
// requireAdmin() rejects + deletes any session where absoluteExpires < now().
const ABSOLUTE_SESSION_SECONDS = 7 * 24 * 60 * 60; // 604800
const IDLE_SESSION_SECONDS = 24 * 60 * 60; // 86400

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: 'database',
    maxAge: IDLE_SESSION_SECONDS,
    updateAge: 60 * 60, // refresh sessions.expires at most once per hour
  },
  callbacks: {
    // D-10 + T-AUTH-02: authorize only admin_user WHERE email=? AND active=true AND role='admin'.
    // v1 only accepts role='admin' (D-11 future-proofs for v2 'editor').
    async signIn({ user }) {
      if (!user?.email) return false;
      const [adminRow] = await db
        .select({
          email: adminUsers.email,
          role: adminUsers.role,
          active: adminUsers.active,
        })
        .from(adminUsers)
        .where(and(eq(adminUsers.email, user.email), eq(adminUsers.active, true)))
        .limit(1);
      if (!adminRow || adminRow.role !== 'admin') return false;
      return true;
    },

    // D-09: lazily stamp sessions.absoluteExpires = now()+7d on first read of
    // a freshly-created session. isNull guard keeps subsequent reads as a
    // zero-row UPDATE (Postgres optimizes these away).
    //
    // Param `session` here is { user: AdapterUser } & AdapterSession (per
    // @auth/core/types when strategy='database'), so `sessionToken` is on it.
    // We forward `sessionToken` onto the returned public Session shape so
    // requireAdmin() can enforce the 7d cap via a DB lookup.
    async session({ session }) {
      const sessionToken = (session as { sessionToken?: string }).sessionToken;
      if (sessionToken) {
        await db
          .update(sessions)
          .set({
            absoluteExpires: new Date(Date.now() + ABSOLUTE_SESSION_SECONDS * 1000),
          })
          .where(
            and(
              eq(sessions.sessionToken, sessionToken),
              isNull(sessions.absoluteExpires),
            ),
          );
        (session as { sessionToken?: string }).sessionToken = sessionToken;
      }
      return session;
    },
  },
});

/**
 * D-09 admin gate helper. Call at the top of every admin Server Action /
 * admin RSC before any DB mutation. Rejects when:
 *   1. No session exists or session has no email.
 *   2. sessions.absoluteExpires < now() — 7d absolute cap exceeded.
 *
 * 24h idle cap is enforced implicitly by Auth.js — expired sessions
 * (sessions.expires < now()) cause auth() to return null, which the
 * !session check below rejects.
 *
 * When the 7d cap is exceeded, the offending session row is deleted so
 * the next request with the same cookie also fails (belt-and-suspenders).
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  if (session.sessionToken) {
    const [row] = await db
      .select({ absoluteExpires: sessions.absoluteExpires })
      .from(sessions)
      .where(eq(sessions.sessionToken, session.sessionToken))
      .limit(1);
    if (row?.absoluteExpires && row.absoluteExpires.getTime() < Date.now()) {
      await db.delete(sessions).where(eq(sessions.sessionToken, session.sessionToken));
      throw new Error('Unauthorized'); // D-09 absolute timeout
    }
  }

  return session;
}
