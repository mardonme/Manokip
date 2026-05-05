// D-16 audit log writer. Called inside every Server Action transaction so
// the audit row commits/rolls back atomically with the mutation. Never call
// `logAudit` outside a `dbTx.transaction(async (tx) => { ... })` lambda —
// passing the regular `dbTx` client breaks atomicity.
//
// Closed action enum: keeps actions discoverable + lints typos (`'creat'`)
// at compile time. Add new actions here AND update audit log viewer filter
// dropdown in plan 02-15. Per-entity dispositions:
//   - `before_json = null` on create
//   - `after_json  = null` on hard delete
//   - both populated on update
//
// `actorEmail` is the admin's email (from `requireAdmin()` -> session); IP
// + UA come from `next/headers` in the Server Action wrapper (plan 02-04
// withAdminAction).

import { auditLog } from '@/db/schema';
import type { dbTx } from '@/db/client-ws';

// Drizzle's transaction lambda receives a typed Tx object. Pulling its
// type out of the imported runtime client keeps this in lock-step with
// whatever drizzle-orm version we're on (no manual NeonDatabase generic).
type Tx = Parameters<Parameters<typeof dbTx.transaction>[0]>[0];

// Closed v1 action set (D-16). Exported as a `const` tuple so consumers
// can derive `AuditAction` AND iterate at runtime (audit log viewer
// filter dropdown will use this in plan 02-15).
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'publish',
  'unpublish',
  'invite',
  'duplicate_product',
  'rename_spec_field',
  'soft_delete_spec_field',
  'delete_spec_field',
  'login',
  'logout',
  'session_revoked',
  // Phase 5 plan 05-01 — visitor-flow verbs (anonymous, actorEmail='visitor').
  'spam_detected', // honeypot trip (D-04)
  'rate_limited', // per-IP rate-limit denial (D-05)
  'contact_submission_create', // happy-path visitor submission (CLAUDE.md: every mutation writes audit row)
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface LogAuditArgs {
  actorEmail: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  /** Snapshot of the entity BEFORE the mutation. `null` on create. */
  before: unknown;
  /** Snapshot AFTER the mutation. `null` on hard delete. */
  after: unknown;
  /** Admin request IP (from x-forwarded-for via next/headers). */
  ip?: string;
  /** Admin request UA (from user-agent via next/headers). */
  userAgent?: string;
}

export async function logAudit(tx: Tx, args: LogAuditArgs): Promise<void> {
  await tx.insert(auditLog).values({
    actorEmail: args.actorEmail,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    beforeJson: args.before as Record<string, unknown> | null,
    afterJson: args.after as Record<string, unknown> | null,
    ip: args.ip ?? null,
    userAgent: args.userAgent ?? null,
  });
}
