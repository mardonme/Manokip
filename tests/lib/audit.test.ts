// Plan 02-04 Task 4.1+4.3 — logAudit helper integration test against the live
// Neon test branch. Asserts:
//   1. logAudit called inside dbTx.transaction commits exactly one audit_log
//      row with the expected column shape (D-13 / D-16 in CONTEXT.md).
//   2. When the transaction throws after logAudit, no row is committed
//      (atomic rollback — the audit log MUST commit/roll back with the
//      mutation, not separately).
//   3. AUDIT_ACTIONS exposes the closed-set v1 enum for type-narrowing.
//
// Closest analog: tests/db/spec-values.test.ts (live-Neon insert + assertion).
// 15s timeouts — cold-Neon HTTP first-query exceeds vitest's 5s default
// (DEF-2-01 — see .planning/phases/02-admin-panel/deferred-items.md).

import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { dbTx } from '@/db/client-ws';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit';

describe('logAudit (D-16) writes one audit_log row inside a transaction', () => {
  // Use a per-suite prefix so concurrent test runs don't trample each other
  // and cleanup is precise (entity_id LIKE 'audit-test-<suite-stamp>-%').
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const prefix = `audit-test-${stamp}`;

  afterEach(async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    await db.execute(sql`DELETE FROM audit_log WHERE entity_id LIKE ${prefix + '%'}`);
  });

  it('commits the audit row when the transaction succeeds', async () => {
    requireTestDatabaseUrl();
    const entityId = `${prefix}-commit`;

    await dbTx.transaction(async (tx) => {
      await logAudit(tx, {
        actorEmail: 'test@manometr.uz',
        action: 'create',
        entityType: 'category',
        entityId,
        before: null,
        after: { id: entityId, name: 'Test Category' },
        ip: '127.0.0.1',
        userAgent: 'vitest',
      });
    });

    const db = await getTestDb();
    const result = await db.execute(sql`
      SELECT actor_email, action, entity_type, entity_id,
             before_json, after_json, ip, user_agent
        FROM audit_log
       WHERE entity_id = ${entityId}
    `);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0] as Record<string, unknown>;
    expect(row).toMatchObject({
      actor_email: 'test@manometr.uz',
      action: 'create',
      entity_type: 'category',
      entity_id: entityId,
      before_json: null,
      ip: '127.0.0.1',
      user_agent: 'vitest',
    });
    // after_json comes back as a JS object via the jsonb column
    expect(row.after_json).toMatchObject({ id: entityId, name: 'Test Category' });
  }, 15_000);

  it('rolls back the audit row when the transaction throws', async () => {
    requireTestDatabaseUrl();
    const entityId = `${prefix}-rollback`;

    await expect(
      dbTx.transaction(async (tx) => {
        await logAudit(tx, {
          actorEmail: 'test@manometr.uz',
          action: 'create',
          entityType: 'category',
          entityId,
          before: null,
          after: {},
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    const db = await getTestDb();
    const result = await db.execute(sql`
      SELECT 1 FROM audit_log WHERE entity_id = ${entityId}
    `);
    expect(result.rows).toHaveLength(0);
  }, 15_000);

  it('AUDIT_ACTIONS is a closed const tuple covering all 13 v1 actions', () => {
    // Sanity: closed enum must match D-16 (CONTEXT.md) verbatim. Adding /
    // removing items is a contract change — bump the v1 list deliberately.
    expect(AUDIT_ACTIONS).toEqual([
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
    ]);
    expect(AUDIT_ACTIONS).toHaveLength(13);
  });
});
