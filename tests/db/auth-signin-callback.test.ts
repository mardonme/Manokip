// FOUND-05 / T-AUTH-02 — the Auth.js signIn callback in src/lib/auth.ts
// authorizes only emails present in admin_user WHERE active=true AND role='admin'.
//
// Auth.js doesn't expose the callback post-construction in a typed-stable way;
// we replicate the exact query here to exercise the DB contract. If the two
// ever diverge, this test MUST be updated in the same review as src/lib/auth.ts
// — that's the point: keep the auth gate query under test even when the live
// Auth.js handler can't be easily invoked in isolation.

import { describe, it, expect, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { requireTestDatabaseUrl } from '../_fixtures/db';

async function signInCheck(
  email: string | undefined | null,
): Promise<boolean> {
  if (!email) return false;
  const [row] = await db
    .select({ role: adminUsers.role, active: adminUsers.active })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  return !!row && row.active === true && row.role === 'admin';
}

const TEST_ACTIVE = `test-active-${Date.now()}@example.com`;
const TEST_INACTIVE = `test-inactive-${Date.now()}@example.com`;

// 15s per-test timeout: Neon HTTP cold-connection latency on the first query
// in a fresh Vitest run routinely exceeds the 5s default (seen in sibling
// live-DB tests too — locale-constraint/spec-values take 2.5s each on cold
// start). Live-DB tests in this repo are network-bound; 15s is a generous
// upper bound that still fails fast on genuine errors.
const TIMEOUT = 15_000;

describe('FOUND-05 / T-AUTH-02: signIn callback authorizes only admin_user.active=true', () => {
  it(
    'rejects email NOT present in admin_user',
    async () => {
      requireTestDatabaseUrl();
      const result = await signInCheck('ghost@example.com');
      expect(result).toBe(false);
    },
    TIMEOUT,
  );

  it(
    'rejects email with no value (null / undefined / empty string)',
    async () => {
      requireTestDatabaseUrl();
      expect(await signInCheck(undefined)).toBe(false);
      expect(await signInCheck(null)).toBe(false);
      expect(await signInCheck('')).toBe(false);
    },
    TIMEOUT,
  );

  it(
    'accepts email in admin_user with active=true and role=admin',
    async () => {
      requireTestDatabaseUrl();
      await db
        .insert(adminUsers)
        .values({ email: TEST_ACTIVE, role: 'admin', active: true })
        .onConflictDoNothing();
      const result = await signInCheck(TEST_ACTIVE);
      expect(result).toBe(true);
    },
    TIMEOUT,
  );

  it(
    'rejects email in admin_user with active=false',
    async () => {
      requireTestDatabaseUrl();
      await db
        .insert(adminUsers)
        .values({ email: TEST_INACTIVE, role: 'admin', active: false })
        .onConflictDoNothing();
      const result = await signInCheck(TEST_INACTIVE);
      expect(result).toBe(false);
    },
    TIMEOUT,
  );

  afterAll(async () => {
    await db.delete(adminUsers).where(eq(adminUsers.email, TEST_ACTIVE));
    await db.delete(adminUsers).where(eq(adminUsers.email, TEST_INACTIVE));
  });
});
