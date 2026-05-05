// Phase 5 plan 05-02 task 2.2 — IP rate-limit lib (CTA-04 + D-05/D-06).
//
// Three exports:
//   - hashIp(ip)           HMAC-SHA256 with RATE_LIMIT_IP_SALT (D-06: never
//                          store raw IPs — GDPR posture).
//   - parseClientIp(h)     Vercel-canonical first-hop x-forwarded-for; falls
//                          back to x-real-ip; returns 'unknown' if absent.
//   - checkAndIncrementRateLimit(ipHash)
//                          Atomic 2-bucket UPSERT inside dbTx.transaction.
//                          Throws RateLimitError when hour > 5 OR day > 20
//                          (the throw triggers a rollback so denied requests
//                          don't permanently consume the budget — RESEARCH §A2
//                          rollback model).
//
// **Critical**: imports from '@/db/client-ws' (WebSocket Pool), NOT '@/db/client'
// (HTTP driver). The HTTP driver is single-statement only — multi-statement
// work silently breaks atomicity. See client-ws.ts:1-20.

import { createHmac } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { dbTx } from '@/db/client-ws';
import { env } from '@/env';

const HOUR_LIMIT = 5;
const DAY_LIMIT = 20;

export class RateLimitError extends Error {
  constructor(
    public hourCount: number,
    public dayCount: number,
  ) {
    super('RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

export function hashIp(ip: string): string {
  return createHmac('sha256', env.RATE_LIMIT_IP_SALT).update(ip).digest('hex');
}

export function parseClientIp(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = h.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

export async function checkAndIncrementRateLimit(ipHash: string): Promise<void> {
  const now = new Date();
  const hourBucket = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
  const dayBucket = new Date(Math.floor(now.getTime() / 86_400_000) * 86_400_000);

  await dbTx.transaction(async (tx) => {
    // Opportunistic cleanup (D-05) — DELETE rows older than 2 days.
    // The contact_rate_limit_cleanup_idx btree on window_start keeps this
    // scan cheap so we don't need a cron.
    await tx.execute(sql`
      DELETE FROM contact_rate_limit WHERE window_start < now() - interval '2 days'
    `);

    const hourRes = await tx.execute(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${ipHash}, 'hour', ${hourBucket}, 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
        DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `);
    const dayRes = await tx.execute(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${ipHash}, 'day', ${dayBucket}, 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
        DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `);

    const hourCount =
      Number((hourRes.rows[0] as { count: number | string } | undefined)?.count ?? 0);
    const dayCount =
      Number((dayRes.rows[0] as { count: number | string } | undefined)?.count ?? 0);

    if (hourCount > HOUR_LIMIT || dayCount > DAY_LIMIT) {
      // Throw triggers rollback: denied requests don't permanently consume
      // the budget. Open Q §2 rollback model.
      throw new RateLimitError(hourCount, dayCount);
    }
  });
}
