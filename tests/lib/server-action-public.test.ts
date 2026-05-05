// Phase 5 plan 05-02 task 2.4 — withPublicAction triple-gate tests.
//
// Mocks (hoisted): @/lib/turnstile + next/headers; the rate-limit + audit
// paths exercise the live Neon test branch so we lock the actual contract
// (audit row gets written; rate-limit denies after 5 hour-bucket hits).
//
// Per-suite stamp prefixes test ipHashes (which are the audit entity_ids
// for the visitor flow) and audit cleanup uses entity_id LIKE.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';

// Short-circuit next-auth chain (server-action.ts top-level imports requireAdmin
// even though withPublicAction never calls it). Mirrors tests/actions/*.test.ts.
vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

// Mock Turnstile so we control its outcome per-test without hitting Cloudflare.
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstile: vi.fn(),
}));

// Vitest auto-hoists vi.mock; explicit headers mock so we can vary the IP.
let currentHeaders = new Headers({
  'x-forwarded-for': '203.0.113.5',
  'user-agent': 'vitest-public-action',
});
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(currentHeaders),
}));

import { withPublicAction } from '@/lib/server-action';
import { verifyTurnstile } from '@/lib/turnstile';
import { hashIp } from '@/lib/rate-limit';

const verifyTurnstileMock = vi.mocked(verifyTurnstile);

const baseSchema = z.object({
  name: z.string().min(1),
  field_extra: z.string().max(500).optional(),
  turnstileToken: z.string().min(1),
});

describe('withPublicAction triple-gate', () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const issuedHashes: string[] = [];

  function setIp(ip: string): string {
    currentHeaders = new Headers({
      'x-forwarded-for': ip,
      'user-agent': 'vitest-public-action',
    });
    const h = hashIp(ip);
    issuedHashes.push(h);
    return h;
  }

  afterEach(async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    if (issuedHashes.length > 0) {
      // Pass as Postgres text[] literal so ANY($1) gets an array, not a record.
      const arr = sql`ARRAY[${sql.join(
        issuedHashes.map((h) => sql`${h}`),
        sql`, `,
      )}]::text[]`;
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ANY(${arr})`);
      await db.execute(
        sql`DELETE FROM contact_rate_limit WHERE ip_hash = ANY(${arr})`,
      );
      issuedHashes.length = 0;
    }
    verifyTurnstileMock.mockReset();
  });

  it(
    'rejects honeypot-populated input with ok:true (silent drop) + audit row',
    async () => {
      requireTestDatabaseUrl();
      const ipHash = setIp(`198.51.100.${(Math.random() * 250).toFixed(0)}-honeypot-${stamp}`);
      const handler = vi.fn(async () => ({ id: 'should-not-run' }));
      const action = withPublicAction(baseSchema, handler);

      const result = await action({
        name: 'spammer',
        field_extra: 'i am a bot',
        turnstileToken: 'token-doesnt-matter',
      });

      expect(result.ok).toBe(true);
      expect(handler).not.toHaveBeenCalled();
      // Audit row should exist for the spam_detected verb.
      const db = await getTestDb();
      const rows = await db.execute(sql`
        SELECT action, actor_email FROM audit_log WHERE entity_id = ${ipHash}
      `);
      expect(rows.rows).toHaveLength(1);
      expect((rows.rows[0] as { action: string; actor_email: string }).action).toBe(
        'spam_detected',
      );
      expect(
        (rows.rows[0] as { action: string; actor_email: string }).actor_email,
      ).toBe('visitor');
    },
    30_000,
  );

  it('rejects invalid Turnstile token with ok:false error:turnstile_failed', async () => {
    setIp(`198.51.100.${(Math.random() * 250).toFixed(0)}-ts-fail-${stamp}`);
    verifyTurnstileMock.mockResolvedValue({
      success: false,
      errorCodes: ['invalid-input-response'],
    });
    const handler = vi.fn(async () => ({ id: 'should-not-run' }));
    const action = withPublicAction(baseSchema, handler);

    const result = await action({
      name: 'visitor',
      turnstileToken: 'bad-token',
    });

    expect(result).toEqual({ ok: false, error: 'turnstile_failed' });
    expect(handler).not.toHaveBeenCalled();
  });

  it(
    'rejects rate-limited IP with ok:false error:rate_limited + audit row',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();
      const ipHash = setIp(
        `198.51.100.${(Math.random() * 250).toFixed(0)}-rl-${stamp}`,
      );
      // Pre-seed both buckets at the limits so the next call's UPSERT pushes
      // hour to 6 → throws.
      const now = new Date();
      const hourBucket = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
      const dayBucket = new Date(Math.floor(now.getTime() / 86_400_000) * 86_400_000);
      await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${ipHash}, 'hour', ${hourBucket}, 5)
      `);
      await db.execute(sql`
        INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
        VALUES (${ipHash}, 'day', ${dayBucket}, 5)
      `);

      verifyTurnstileMock.mockResolvedValue({ success: true });
      const handler = vi.fn(async () => ({ id: 'should-not-run' }));
      const action = withPublicAction(baseSchema, handler);

      const result = await action({
        name: 'visitor',
        turnstileToken: 'good-token',
      });

      expect(result).toEqual({ ok: false, error: 'rate_limited' });
      expect(handler).not.toHaveBeenCalled();
      const rows = await db.execute(sql`
        SELECT action FROM audit_log WHERE entity_id = ${ipHash} AND action = 'rate_limited'
      `);
      expect(rows.rows).toHaveLength(1);
    },
    30_000,
  );

  it(
    'passes valid input through to handler with PublicActionContext { ip, ipHash, userAgent }',
    async () => {
      requireTestDatabaseUrl();
      const ip = `198.51.100.${(Math.random() * 250).toFixed(0)}-happy-${stamp}`;
      setIp(ip);
      verifyTurnstileMock.mockResolvedValue({ success: true });
      const handler = vi.fn(async (_input, ctx) => ({ ctx }));
      const action = withPublicAction(baseSchema, handler);

      const result = await action({
        name: 'visitor',
        turnstileToken: 'good-token',
      });

      expect(result.ok).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
      const ctx = (handler.mock.calls[0]![1] as unknown) as {
        ip: string;
        ipHash: string;
        userAgent: string;
      };
      expect(ctx.ip).toBe(ip);
      expect(ctx.ipHash).toBe(hashIp(ip));
      expect(ctx.userAgent).toBe('vitest-public-action');
    },
    30_000,
  );

  it('returns ok:false error:validation on Zod failure', async () => {
    setIp(`198.51.100.${(Math.random() * 250).toFixed(0)}-zod-${stamp}`);
    const handler = vi.fn();
    const action = withPublicAction(baseSchema, handler);

    // Missing required `name`.
    const result = await action({
      turnstileToken: 'token',
    });

    expect(result).toEqual({ ok: false, error: 'validation' });
    expect(handler).not.toHaveBeenCalled();
  });

  it(
    'returns ok:false error:unknown on unexpected handler throw',
    async () => {
      requireTestDatabaseUrl();
      setIp(`198.51.100.${(Math.random() * 250).toFixed(0)}-unknown-${stamp}`);
      verifyTurnstileMock.mockResolvedValue({ success: true });
      const handler = vi.fn(async () => {
        throw new Error('boom');
      });
      const action = withPublicAction(baseSchema, handler);

      const result = await action({
        name: 'visitor',
        turnstileToken: 'good-token',
      });

      expect(result).toEqual({ ok: false, error: 'unknown' });
    },
    30_000,
  );
});
