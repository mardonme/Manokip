// FLIP-IN: 05-02-PLAN.md
//
// Plan 05-01 RED stub for the `withPublicAction` Server Action wrapper
// (CTA-01 + CTA-04). Wave 1 plan 05-02 ships src/lib/server-action.ts
// (`withPublicAction`) — the public-facing analog of `withAdminAction`
// with triple-gate (honeypot → Turnstile → rate-limit) ordering.

import { describe, it, expect } from 'vitest';

// Stub-import strategy (Phase 4 plan 04-04 pattern): `withPublicAction` does
// not exist on `@/lib/server-action` yet. Build the specifier at runtime so
// TypeScript treats the result as Promise<unknown> and skips type-checking
// the named export.
const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const SERVER_ACTION_MODULE = '@/lib/server-action';

describe('withPublicAction triple-gate', () => {
  it.skip('rejects honeypot-populated input with ok:true (silent drop) + audit row', async () => {
    // D-04 — bot trip: honeypot field populated → silent ok:true (don't tell
    // the bot it tripped) + audit_log row with action='spam_detected',
    // actorEmail='visitor'.
    const mod = await dynamicImport(SERVER_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md task adds withPublicAction wrapper');
  });

  it.skip('rejects invalid Turnstile token with ok:false error:turnstile_failed', async () => {
    // Pattern 1 step D — Turnstile siteverify returns success:false →
    // wrapper short-circuits with ok:false error:'turnstile_failed'.
    const mod = await dynamicImport(SERVER_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('rejects rate-limited IP with ok:false error:rate_limited + audit row', async () => {
    // Pattern 1 step E — checkAndIncrementRateLimit throws RateLimitError →
    // wrapper returns ok:false error:'rate_limited' + audit_log row with
    // action='rate_limited'.
    const mod = await dynamicImport(SERVER_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('passes valid input through to handler with PublicActionContext { ip, ipHash, userAgent }', async () => {
    // Happy path — handler receives PublicActionContext from next/headers
    // (x-forwarded-for first hop → parseClientIp; HMAC-SHA256 hash via
    // RATE_LIMIT_IP_SALT).
    const mod = await dynamicImport(SERVER_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('returns ok:false error:validation on Zod failure', async () => {
    const mod = await dynamicImport(SERVER_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('returns ok:false error:unknown on unexpected handler throw', async () => {
    const mod = await dynamicImport(SERVER_ACTION_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });
});
