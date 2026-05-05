// Phase 5 plan 05-02 task 2.2 — rate-limit lib tests.
//
// Mix of pure-unit (hashIp, parseClientIp) + live-Neon (checkAndIncrementRateLimit).
//
// Per-suite stamp prefixes the test ipHash so concurrent / re-runs don't trample.

import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import {
  hashIp,
  parseClientIp,
  checkAndIncrementRateLimit,
  RateLimitError,
} from '@/lib/rate-limit';

describe('hashIp + checkAndIncrementRateLimit', () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  afterEach(async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    await db.execute(
      sql`DELETE FROM contact_rate_limit WHERE ip_hash LIKE ${'rl-test-' + stamp + '%'}`,
    );
  });

  it('hashIp produces deterministic HMAC-SHA256 hex digest with RATE_LIMIT_IP_SALT', () => {
    const a = hashIp('203.0.113.5');
    const b = hashIp('203.0.113.5');
    expect(a).toBe(b);
    // SHA-256 hex digest is 64 chars
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashIp returns different digests for different IPs', () => {
    const a = hashIp('203.0.113.5');
    const b = hashIp('198.51.100.1');
    expect(a).not.toBe(b);
  });

  it(
    'checkAndIncrementRateLimit increments hour bucket; throws RateLimitError at 6th request in hour',
    async () => {
      requireTestDatabaseUrl();
      const ipHash = `rl-test-${stamp}-hour-${Math.random().toString(36).slice(2, 8)}`;
      // 5 requests succeed
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
    'checkAndIncrementRateLimit throws RateLimitError at 21st request in day window even if hour bucket is fresh',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();
      const ipHash = `rl-test-${stamp}-day-${Math.random().toString(36).slice(2, 8)}`;
      // Pre-seed day bucket with count=20 at the current day window.
      // Use a fresh hour bucket so hourCount stays 1 on the next call.
      const now = new Date();
      const dayBucket = new Date(Math.floor(now.getTime() / 86_400_000) * 86_400_000);
      // Insert a stale hour bucket so the next call lands on a fresh hour row.
      await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${ipHash}, 'day', ${dayBucket}, 20)
      `);
      // Next call increments day to 21 → throws.
      await expect(checkAndIncrementRateLimit(ipHash)).rejects.toBeInstanceOf(
        RateLimitError,
      );
    },
    30_000,
  );

  it('parseClientIp returns first non-empty hop from x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '203.0.113.5, 198.51.100.1' });
    expect(parseClientIp(h)).toBe('203.0.113.5');

    const empty = new Headers();
    expect(parseClientIp(empty)).toBe('unknown');

    const realIp = new Headers({ 'x-real-ip': '198.51.100.7' });
    expect(parseClientIp(realIp)).toBe('198.51.100.7');
  });
});
