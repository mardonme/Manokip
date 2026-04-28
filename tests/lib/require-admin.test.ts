// Plan 02-04 Task 4.3 — D-15 7d absolute-cap rejection.
//
// requireAdmin() is the universal admin gate at the top of every Server
// Action and admin RSC. The cap-check half of its body lives in the
// extracted `enforceAbsoluteCap(sessionToken, actorEmail)` helper so tests
// can exercise the audit + delete + throw path against the live Neon test
// branch without spinning up a real Auth.js session (vi.importActual on
// `@/lib/auth` cannot resolve next-auth's `next/server` import in vitest).
//
// Behavior under test (D-15 + Open Q §5):
//   1. expired absolute_expires -> session_revoked audit row emitted,
//      sessions row deleted, throws `Unauthorized`.
//   2. future absolute_expires  -> no audit, sessions row preserved.
//   3. NULL absolute_expires    -> grandfathered Phase-1 session, no audit.
//   4. missing sessions row     -> no-op (returns silently).
//
// Closest analog: tests/db/spec-values.test.ts (live-Neon shape +
// 15s timeouts for cold-Neon HTTP — see DEF-2-01).

import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { createActiveAdminSession } from '../_fixtures/admin-session';
import { enforceAbsoluteCap } from '@/lib/admin-session-cap';

describe('D-15 absolute-cap rejection in requireAdmin / enforceAbsoluteCap (Open Q §5)', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    for (const c of cleanups.splice(0)) {
      try {
        await c();
      } catch (err) {
        console.error('session cleanup failed', err);
      }
    }
    // Audit rows are append-only; clean up any session_revoked rows this
    // suite emitted by joining on the test-admin email pattern.
    await db.execute(sql`
      DELETE FROM audit_log
       WHERE action = 'session_revoked'
         AND entity_id LIKE 'test-admin+%@manometr.uz'
    `);
  });

  it('emits session_revoked + deletes sessions row + throws when absolute_expires < now()', async () => {
    requireTestDatabaseUrl();
    const session = await createActiveAdminSession({
      absoluteExpiresOffsetSec: -3600, // expired 1h ago
    });
    cleanups.push(session.cleanup);

    await expect(
      enforceAbsoluteCap(session.sessionToken, session.email),
    ).rejects.toThrow('Unauthorized');

    const db = await getTestDb();

    // 1. session_revoked audit row was emitted.
    const audit = await db.execute(sql`
      SELECT action, entity_type, before_json, after_json
        FROM audit_log
       WHERE entity_id = ${session.email}
         AND action = 'session_revoked'
       ORDER BY at DESC
       LIMIT 1
    `);
    expect(audit.rows).toHaveLength(1);
    const row = audit.rows[0] as Record<string, unknown>;
    expect(row).toMatchObject({
      action: 'session_revoked',
      entity_type: 'admin_user',
      after_json: null,
    });
    expect(row.before_json).toMatchObject({ absoluteExpires: expect.any(String) });

    // 2. sessions row has been deleted (belt-and-suspenders).
    const sess = await db.execute(sql`
      SELECT 1 FROM sessions WHERE session_token = ${session.sessionToken}
    `);
    expect(sess.rows).toHaveLength(0);
  }, 15_000);

  it('passes through silently when absolute_expires is in the future', async () => {
    requireTestDatabaseUrl();
    const session = await createActiveAdminSession({
      absoluteExpiresOffsetSec: 7 * 24 * 3600, // +7d
    });
    cleanups.push(session.cleanup);

    await expect(
      enforceAbsoluteCap(session.sessionToken, session.email),
    ).resolves.toBeUndefined();

    const db = await getTestDb();
    const audit = await db.execute(sql`
      SELECT 1 FROM audit_log
       WHERE entity_id = ${session.email} AND action = 'session_revoked'
    `);
    expect(audit.rows).toHaveLength(0);

    const sess = await db.execute(sql`
      SELECT session_token FROM sessions WHERE session_token = ${session.sessionToken}
    `);
    expect(sess.rows).toHaveLength(1);
  }, 15_000);

  it('passes through silently when absolute_expires is NULL (grandfathered Phase-1 session)', async () => {
    requireTestDatabaseUrl();
    const session = await createActiveAdminSession();
    cleanups.push(session.cleanup);

    const db = await getTestDb();
    // Null out absolute_expires to simulate a Phase-1 session that hasn't
    // hit the lazy stamp yet (auth.ts session callback only stamps when
    // it's currently NULL).
    await db.execute(sql`
      UPDATE sessions SET absolute_expires = NULL
       WHERE session_token = ${session.sessionToken}
    `);

    await expect(
      enforceAbsoluteCap(session.sessionToken, session.email),
    ).resolves.toBeUndefined();

    const audit = await db.execute(sql`
      SELECT 1 FROM audit_log
       WHERE entity_id = ${session.email} AND action = 'session_revoked'
    `);
    expect(audit.rows).toHaveLength(0);
  }, 15_000);

  it('passes through silently when sessions row is missing', async () => {
    requireTestDatabaseUrl();
    // Use a token that does not correspond to any sessions row.
    const orphanToken = 'orphan-' + Math.random().toString(36).slice(2);
    await expect(
      enforceAbsoluteCap(orphanToken, 'no-such-admin@manometr.uz'),
    ).resolves.toBeUndefined();
  }, 15_000);
});
