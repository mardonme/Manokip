// Phase 5 plan 05-02 task 2.2 — contact_rate_limit table contract (CTA-04).
//
// Live-Neon SQL probes against the table created by plan 05-01's migration:
//   - atomic UPSERT increments count via ON CONFLICT DO UPDATE
//   - HOUR_LIMIT=5: 6th call within an hour throws via checkAndIncrementRateLimit
//   - DAY_LIMIT=20: 21st call within a day throws even on fresh hour bucket
//   - opportunistic cleanup deletes rows older than 2 days

import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import {
  checkAndIncrementRateLimit,
  RateLimitError,
} from '@/lib/rate-limit';

describe('contact_rate_limit table contract', () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  afterEach(async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    await db.execute(
      sql`DELETE FROM contact_rate_limit WHERE ip_hash LIKE ${'crl-test-' + stamp + '%'}`,
    );
  });

  it(
    'atomic UPSERT increments count on conflict',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();
      const ipHash = `crl-test-${stamp}-upsert`;
      const now = new Date();
      const hourBucket = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);

      // First insert
      const r1 = await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${ipHash}, 'hour', ${hourBucket}, 1)
        ON CONFLICT (ip_hash, window_kind, window_start)
          DO UPDATE SET count = contact_rate_limit.count + 1
        RETURNING count
      `);
      expect(Number((r1.rows[0] as { count: number | string }).count)).toBe(1);

      // Second insert hits the conflict → DO UPDATE → count = 2
      const r2 = await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${ipHash}, 'hour', ${hourBucket}, 1)
        ON CONFLICT (ip_hash, window_kind, window_start)
          DO UPDATE SET count = contact_rate_limit.count + 1
        RETURNING count
      `);
      expect(Number((r2.rows[0] as { count: number | string }).count)).toBe(2);

      // Third
      const r3 = await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${ipHash}, 'hour', ${hourBucket}, 1)
        ON CONFLICT (ip_hash, window_kind, window_start)
          DO UPDATE SET count = contact_rate_limit.count + 1
        RETURNING count
      `);
      expect(Number((r3.rows[0] as { count: number | string }).count)).toBe(3);
    },
    30_000,
  );

  it(
    'hour bucket overflows when count exceeds 5',
    async () => {
      requireTestDatabaseUrl();
      const ipHash = `crl-test-${stamp}-hr-overflow`;
      // 5 succeed
      for (let i = 0; i < 5; i++) {
        await checkAndIncrementRateLimit(ipHash);
      }
      // 6th throws
      await expect(checkAndIncrementRateLimit(ipHash)).rejects.toBeInstanceOf(
        RateLimitError,
      );
    },
    30_000,
  );

  it(
    'day bucket overflows when count exceeds 20',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();
      const ipHash = `crl-test-${stamp}-day-overflow`;
      const now = new Date();
      const dayBucket = new Date(Math.floor(now.getTime() / 86_400_000) * 86_400_000);
      // Pre-seed day bucket at 20 (max allowed). The next call will push it to 21.
      await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${ipHash}, 'day', ${dayBucket}, 20)
      `);
      await expect(checkAndIncrementRateLimit(ipHash)).rejects.toBeInstanceOf(
        RateLimitError,
      );
    },
    30_000,
  );

  it(
    'opportunistic cleanup deletes rows older than 2 days',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();
      const staleIpHash = `crl-test-${stamp}-stale`;
      const freshIpHash = `crl-test-${stamp}-fresh`;
      // Insert a stale row (>2 days old).
      await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${staleIpHash}, 'hour', now() - interval '3 days', 99)
      `);
      // Trigger the rate-limit lib path which runs the DELETE step.
      await checkAndIncrementRateLimit(freshIpHash);
      // Stale row must be gone.
      const staleAfter = await db.execute(
        sql`SELECT 1 FROM contact_rate_limit WHERE ip_hash = ${staleIpHash}`,
      );
      expect(staleAfter.rows).toHaveLength(0);
    },
    30_000,
  );
});
