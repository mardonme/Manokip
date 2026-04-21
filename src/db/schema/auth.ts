// Auth.js v5 / @auth/drizzle-adapter required tables.
// sessions.absoluteExpires is the D-09 7d absolute cap column — populated
// by the signIn callback (plan 05) and enforced by requireAdmin().
import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const authUsers = pgTable('auth_users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
});

export const authAccounts = pgTable(
  'auth_accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  // Auth.js default; sliding 24h idle (D-09) is set via auth.ts session.maxAge=86400
  expires: timestamp('expires', { mode: 'date' }).notNull(),
  // D-09 7d absolute cap — populated by signIn callback in plan 05;
  // requireAdmin() rejects when absoluteExpires < now()
  absoluteExpires: timestamp('absolute_expires', {
    mode: 'date',
    withTimezone: true,
  }),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
