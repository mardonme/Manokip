// FLIP-IN: 05-02-PLAN.md
//
// Plan 05-01 RED stub for the contact_rate_limit table contract (CTA-04).
// Wave 1 plan 05-02 ships src/lib/rate-limit.ts and flips these `it.skip`
// to `it`. Each test asserts the live-DB shape (atomic UPSERT increments
// count; opportunistic cleanup deletes rows >2 days old).
//
// Vitest 4 has no `it.fixme` (Phase 4 plan 04-04 confirmed); use `it.skip`
// + `expect.fail('FLIP-IN: 05-02-PLAN.md ...')` so the runner output
// documents the closure plan.

import { describe, it, expect } from 'vitest';

// Stub-import strategy (Phase 4 plan 04-04 pattern): the SUT module does not
// exist yet. Avoid a literal `import('@/lib/rate-limit')` because TypeScript
// statically resolves string-literal dynamic-import args. Instead, build the
// specifier at runtime and feed it through `dynamicImport()` which the
// compiler treats as `Promise<unknown>` — no path resolution.
const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const RATE_LIMIT_MODULE = '@/lib/rate-limit';

describe('contact_rate_limit table contract', () => {
  it.skip('atomic UPSERT increments count on conflict', async () => {
    // Contract: INSERT INTO contact_rate_limit (...) ON CONFLICT (ip_hash, window_kind, window_start)
    //   DO UPDATE SET count = contact_rate_limit.count + 1 RETURNING count
    // Asserts the returning count grows 1 → 2 → 3 within the same hour bucket.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail(
      'FLIP-IN: 05-02-PLAN.md task creates src/lib/rate-limit.ts with checkAndIncrementRateLimit',
    );
  });

  it.skip('hour bucket overflows when count exceeds 5', async () => {
    // Contract: 6th call within the same hour throws RateLimitError.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md (HOUR_LIMIT=5)');
  });

  it.skip('day bucket overflows when count exceeds 20', async () => {
    // Contract: 21st call within the day window throws RateLimitError even
    // when the hour bucket has just rolled over.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md (DAY_LIMIT=20)');
  });

  it.skip('opportunistic cleanup deletes rows older than 2 days', async () => {
    // Contract: rate-limit lib's UPSERT path runs
    //   DELETE FROM contact_rate_limit WHERE window_start < now() - interval '2 days'
    // before/after the increment so the table self-cleans without a cron.
    const mod = await dynamicImport(RATE_LIMIT_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md (opportunistic 2-day cleanup)');
  });
});
