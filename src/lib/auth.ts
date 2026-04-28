// Node-only — never import from Edge contexts (proxy.ts uses @/lib/auth.config instead)
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
import { dbTx } from '@/db/client-ws';
import {
  authUsers,
  authAccounts,
  sessions,
  verificationTokens,
  adminUsers,
} from '@/db/schema';
import authConfig from './auth.config';
import { logAudit } from '@/lib/audit';

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
  // D-16 / Open Q §5: Auth.js lifecycle audit emission. Auth.js fires these
  // AFTER the auth state has been committed (signIn = adapter wrote the row;
  // signOut = adapter dropped the row), so the audit row is atomic with the
  // lifecycle event in the sense that requireAdmin() will already see the
  // new state on the next request. Errors thrown here are swallowed by
  // Auth.js (per next-auth/events docs), but we still wrap the body in
  // try/catch so an audit-write failure can never break the user-visible
  // sign-in/-out flow.
  events: {
    async signIn({ user }) {
      if (!user?.email) return;
      const at = new Date().toISOString();
      try {
        await dbTx.transaction(async (tx) => {
          await logAudit(tx, {
            actorEmail: user.email!,
            action: 'login',
            entityType: 'admin_user',
            entityId: user.email!,
            before: null,
            after: { at },
          });
        });
      } catch (err) {
        console.error('audit:login emit failed', err);
      }
    },
    async signOut(message) {
      // Auth.js v5 with database strategy passes `{ session: AdapterSession }`;
      // with JWT it would be `{ token: JWT }`. We only run database strategy
      // (src/lib/auth.ts:51), so the `session` branch is what matters. Look
      // up the user's email by `session.userId` since AdapterSession does
      // not carry email itself.
      try {
        let email: string | null = null;
        if (
          'session' in message &&
          message.session &&
          typeof message.session === 'object' &&
          'userId' in message.session &&
          typeof message.session.userId === 'string'
        ) {
          const [u] = await db
            .select({ email: authUsers.email })
            .from(authUsers)
            .where(eq(authUsers.id, message.session.userId))
            .limit(1);
          email = u?.email ?? null;
        }
        if (!email) return;
        const at = new Date().toISOString();
        await dbTx.transaction(async (tx) => {
          await logAudit(tx, {
            actorEmail: email!,
            action: 'logout',
            entityType: 'admin_user',
            entityId: email!,
            before: null,
            after: { at },
          });
        });
      } catch (err) {
        console.error('audit:logout emit failed', err);
      }
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
      // D-16 / Open Q §5: emit `session_revoked` BEFORE the row deletion +
      // throw so the audit log records who got 7d-capped and when. We use
      // the same dbTx transaction shape as every other audit write — the
      // row commits atomically with itself (no other mutation in this tx).
      // Errors are caught + logged so an audit-write failure can never
      // bypass the cap rejection (the throw below is the security gate).
      try {
        await dbTx.transaction(async (tx) => {
          await logAudit(tx, {
            actorEmail: session.user!.email!,
            action: 'session_revoked',
            entityType: 'admin_user',
            entityId: session.user!.email!,
            before: { absoluteExpires: row.absoluteExpires!.toISOString() },
            after: null,
          });
        });
      } catch (err) {
        console.error('audit:session_revoked emit failed', err);
      }
      await db.delete(sessions).where(eq(sessions.sessionToken, session.sessionToken));
      throw new Error('Unauthorized'); // D-09 absolute timeout
    }
  }

  return session;
}
