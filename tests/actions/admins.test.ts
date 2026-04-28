// Plan 02-07 Task 7.2 — admins Server Actions integration tests against the
// live Neon test branch.
//
// Covers acceptInvite (the security-critical surface — Pitfall #4 atomic
// single-use UPDATE consumes the token IFF used_at IS NULL AND expires_at >
// now()):
//   1. Happy path: valid unused token -> ok:true, admin_user.active flips to
//      true, audit_log row written with action='update'.
//   2. Replay: a second accept call with the SAME token -> ok:false /
//      'invalid_or_expired'. This is the canonical Pitfall #4 mitigation.
//   3. Expired token: expires_at < now() -> ok:false / 'invalid_or_expired'.
//   4. Unknown token: token does not exist -> ok:false / 'invalid_or_expired'.
//
// inviteAdmin's Resend send path is exercised end-to-end via a Wave-3
// Playwright spec; integration-testing the email send here would require
// mocking @/emails/admin-invite + the resend SDK module graph from inside a
// 'use server' file, which is more disruptive than the Wave-3 e2e gate.
//
// Closest analog: tests/lib/audit.test.ts (live-Neon insert + assertion +
// 15s timeouts for cold-Neon HTTP first-query).

import { describe, it, expect, afterEach, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

// acceptInvite does NOT use withAdminAction (the invitee is unauthenticated)
// but it lives in src/actions/admins.ts alongside inviteAdmin which imports
// `@/lib/server-action` -> `@/lib/auth` -> next-auth. Vitest cannot resolve
// next-auth's `next/server` reference (Next.js-runtime-only); same posture
// as plan 02-04 SUMMARY deviation #3. Mocking @/lib/auth at module scope
// short-circuits that import chain so we can exercise acceptInvite against
// the live Neon test branch without booting next-auth.
vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(async () => {
    throw new Error('not used by acceptInvite');
  }),
}));

import { acceptInvite } from '@/actions/admins';

describe('acceptInvite — atomic single-use UPDATE (Pitfall #4)', () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const c of cleanups) await c();
    cleanups.length = 0;
  });

  it('consumes token atomically + flips admin_user.active=true + writes audit row (single-use happy path)', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const inviterEmail = `inviter+${stamp}@manometr.uz`;
    const inviteeEmail = `invitee+${stamp}@manometr.uz`;
    const token = randomUUID();

    // Seed: admin_user(active=false) + admin_invite(48h, unused).
    await db.execute(sql`
      INSERT INTO admin_user (email, role, active, invited_by, invited_at)
      VALUES (${inviteeEmail}, 'admin', false, ${inviterEmail}, now())
    `);
    await db.execute(sql`
      INSERT INTO admin_invite (email, token, expires_at, invited_by)
      VALUES (${inviteeEmail}, ${token}, now() + interval '48 hours', ${inviterEmail})
    `);
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM admin_invite WHERE email = ${inviteeEmail}`);
      await db.execute(sql`DELETE FROM admin_user WHERE email = ${inviteeEmail}`);
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${inviteeEmail}`);
    });

    // First accept — happy path.
    const first = await acceptInvite(token);
    expect(first).toEqual({ ok: true, email: inviteeEmail });

    // admin_user activated.
    const adminRow = await db.execute(
      sql`SELECT active FROM admin_user WHERE email = ${inviteeEmail}`,
    );
    expect((adminRow.rows[0] as { active: boolean }).active).toBe(true);

    // audit_log row written with action='update'.
    const auditRow = await db.execute(sql`
      SELECT action, entity_type, entity_id, actor_email
        FROM audit_log
       WHERE entity_id = ${inviteeEmail}
         AND action = 'update'
       ORDER BY at DESC LIMIT 1
    `);
    expect(auditRow.rows[0]).toMatchObject({
      action: 'update',
      entity_type: 'admin_user',
      entity_id: inviteeEmail,
      actor_email: inviterEmail,
    });

    // Replay: a second use rejects (Pitfall #4 — atomic consume already
    // marked used_at, the WHERE used_at IS NULL guard returns zero rows).
    const second = await acceptInvite(token);
    expect(second).toEqual({ ok: false, error: 'invalid_or_expired' });
  }, 15_000);

  it('rejects when token is expired (expires_at < now())', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    const inviteeEmail = `expired+${stamp}@manometr.uz`;
    const expiredToken = randomUUID();

    await db.execute(sql`
      INSERT INTO admin_invite (email, token, expires_at, invited_by)
      VALUES (
        ${inviteeEmail},
        ${expiredToken},
        now() - interval '1 minute',
        'inviter@manometr.uz'
      )
    `);
    cleanups.push(async () => {
      await db.execute(sql`DELETE FROM admin_invite WHERE email = ${inviteeEmail}`);
    });

    const result = await acceptInvite(expiredToken);
    expect(result).toEqual({ ok: false, error: 'invalid_or_expired' });
  }, 15_000);

  it('rejects an unknown token (no row matches)', async () => {
    requireTestDatabaseUrl();
    const result = await acceptInvite(randomUUID());
    expect(result).toEqual({ ok: false, error: 'invalid_or_expired' });
  }, 15_000);
});
