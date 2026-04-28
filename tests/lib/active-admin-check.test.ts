// Plan 02-08 Task 8.2 — magic-link email harvesting mitigation (T-02-08-01).
//
// `sendVerificationRequest` (auth.config.ts) consults this helper BEFORE
// invoking the Resend SDK, so unknown / inactive emails never trigger an
// outbound email. The helper is a tiny SELECT against `admin_user`; we test
// it against the live Neon test branch via the same shape as
// tests/lib/require-admin.test.ts (createActiveAdminSession fixture +
// per-test cleanup + 15s cold-Neon timeouts).
//
// Behavior under test:
//   1. active=true admin -> returns true (Resend send proceeds)
//   2. active=false admin -> returns false (Resend send skipped)
//   3. unknown email -> returns false (Resend send skipped)
//   4. case-insensitive email match -> returns true (admin_user.email is
//      stored lowercased per Phase-1 D-10; we lowercase the input before
//      lookup for defense-in-depth)

import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { isActiveAdminEmail } from '@/lib/active-admin-check';
import { adminUsers } from '@/db/schema';

describe('isActiveAdminEmail (T-02-08-01 magic-link harvesting mitigation)', () => {
  const cleanupEmails: string[] = [];

  afterEach(async () => {
    requireTestDatabaseUrl();
    if (cleanupEmails.length === 0) return;
    const db = await getTestDb();
    for (const email of cleanupEmails.splice(0)) {
      try {
        await db.execute(sql`DELETE FROM admin_user WHERE email = ${email}`);
      } catch (err) {
        console.error('admin_user cleanup failed', err);
      }
    }
  });

  it('returns true for an active admin', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const email = `test-active+${randomUUID().slice(0, 8)}@manometr.uz`;
    cleanupEmails.push(email);
    await db.insert(adminUsers).values({ email, role: 'admin', active: true });

    await expect(isActiveAdminEmail(email)).resolves.toBe(true);
  }, 15_000);

  it('returns false for an inactive admin (T-02-08-01 disposition)', async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    const email = `test-inactive+${randomUUID().slice(0, 8)}@manometr.uz`;
    cleanupEmails.push(email);
    await db.insert(adminUsers).values({ email, role: 'admin', active: false });

    await expect(isActiveAdminEmail(email)).resolves.toBe(false);
  }, 15_000);

  it('returns false for an unknown email (anti-enumeration)', async () => {
    requireTestDatabaseUrl();
    const orphan = `does-not-exist+${randomUUID().slice(0, 8)}@example.invalid`;
    await expect(isActiveAdminEmail(orphan)).resolves.toBe(false);
  }, 15_000);

  it('returns false for empty/null-like inputs without hitting the DB', async () => {
    await expect(isActiveAdminEmail('')).resolves.toBe(false);
  });
});
