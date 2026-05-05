// Phase 5 plan 05-01 — visitor-side contact-form rate-limit storage (D-05).
//
// Two buckets per IP keyed by `window_kind`: 'hour' (5/hr) and 'day' (20/day).
// CONTEXT.md D-05 specified PK `(ip_hash, window_start)`; RESEARCH §A2 enriches
// it to `(ip_hash, window_kind, window_start)` so the two sibling rows for the
// same IP at the same `window_start` (one bucket per kind) don't collide.
//
// IP is HMAC-SHA256 hashed with `RATE_LIMIT_IP_SALT` before storage (D-06)
// so the table never persists raw visitor IPs (GDPR posture).
//
// Cleanup: opportunistic `DELETE WHERE window_start < now() - interval '2 days'`
// on every UPSERT — the `contact_rate_limit_cleanup_idx` btree on
// `window_start` keeps that scan cheap.
import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const contactRateLimit = pgTable(
  'contact_rate_limit',
  {
    ipHash: text('ip_hash').notNull(),
    windowKind: text('window_kind').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [
    primaryKey({
      columns: [table.ipHash, table.windowKind, table.windowStart],
    }),
    index('contact_rate_limit_cleanup_idx').on(table.windowStart),
    check(
      'contact_rate_limit_window_kind_check',
      sql`${table.windowKind} IN ('hour','day')`,
    ),
  ],
);
