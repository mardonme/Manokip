// D-10, D-11, D-13: app-owned admin_user (email PK, role='admin' default) +
// audit_log (declared in Phase 1, written in Phase 2 via logAudit()).
// Phase 2 D-14: admin_invite — single-use 48h tokens for new-admin onboarding.
import {
  pgTable,
  text,
  timestamp,
  boolean,
  bigserial,
  jsonb,
  uuid,
} from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_user', {
  email: text('email').primaryKey(),
  role: text('role').notNull().default('admin'),
  invitedBy: text('invited_by'),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
});

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  actorEmail: text('actor_email'),
  action: text('action'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  beforeJson: jsonb('before_json'),
  afterJson: jsonb('after_json'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  ip: text('ip'),
  userAgent: text('user_agent'),
});

// D-14 / ADMIN-02: admin_invite — single-use token-based onboarding.
// Atomic consume contract:
//   UPDATE admin_invite SET used_at = now()
//    WHERE token = $1 AND used_at IS NULL AND expires_at > now()
//    RETURNING email
export const adminInvites = pgTable('admin_invite', {
  id: uuid().primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  invitedBy: text('invited_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
