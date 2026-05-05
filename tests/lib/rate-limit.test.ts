// FLIP-IN: 05-02-PLAN.md
//
// Plan 05-01 RED stub for the rate-limit lib (CTA-04). Wave 1 plan 05-02
// ships src/lib/rate-limit.ts with hashIp, parseClientIp, and the
// checkAndIncrementRateLimit transactional UPSERT.

import { describe, it, expect } from 'vitest';

const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const RATE_LIMIT_MODULE = '@/lib/rate-limit';

describe('hashIp + checkAndIncrementRateLimit', () => {
  it.skip('hashIp produces deterministic HMAC-SHA256 hex digest with RATE_LIMIT_IP_SALT', async () => {
    // D-06 — same IP + same salt → same digest forever; output is hex
    // (64 chars for SHA256). Function MUST NOT log raw IP.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md task creates src/lib/rate-limit.ts');
  });

  it.skip('hashIp returns different digests for different IPs', async () => {
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('checkAndIncrementRateLimit increments hour bucket; throws RateLimitError at 6th request in hour', async () => {
    // RESEARCH §Pattern 2 — HOUR_LIMIT=5: 5 succeeds, 6th throws.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('checkAndIncrementRateLimit throws RateLimitError at 21st request in day window even if hour bucket is fresh', async () => {
    // DAY_LIMIT=20: must consult both buckets; day-bucket exhaustion alone
    // is sufficient to deny even if hour-bucket has just rolled.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('parseClientIp returns first non-empty hop from x-forwarded-for', async () => {
    // CONTEXT specifics — Vercel-canonical: read x-forwarded-for, split
    // by comma, return the first non-empty trimmed token. Fallback to
    // x-real-ip; never trust raw req.ip.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });
});
