// FLIP-IN: 05-02-PLAN.md
//
// Plan 05-01 RED stub for the Cloudflare Turnstile siteverify client (CTA-01).
// Wave 1 plan 05-02 ships src/lib/turnstile.ts. Tests vi.mock global fetch
// to assert the request shape AND the response-handling branches.

import { describe, it, expect } from 'vitest';

const dynamicImport = (specifier: string): Promise<unknown> =>
  import(/* @vite-ignore */ specifier);
const TURNSTILE_MODULE = '@/lib/turnstile';

describe('verifyTurnstile()', () => {
  it.skip('POSTs to challenges.cloudflare.com/turnstile/v0/siteverify with secret+response+remoteip body', async () => {
    // Pattern 5 — siteverify endpoint takes form-urlencoded body with keys
    // secret, response, remoteip. verifyTurnstile must POST to the canonical
    // URL (no proxy, no SDK) and pass remoteip from the request context.
    const mod = await dynamicImport(TURNSTILE_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md task creates src/lib/turnstile.ts');
  });

  it.skip('returns success:true when Cloudflare returns success', async () => {
    const mod = await dynamicImport(TURNSTILE_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('returns success:false with errorCodes when Cloudflare returns failure (e.g., timeout-or-duplicate)', async () => {
    // Cloudflare returns { success: false, "error-codes": ["timeout-or-duplicate"] }
    const mod = await dynamicImport(TURNSTILE_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });

  it.skip('returns success:false errorCodes:[siteverify-http-error] on non-2xx response', async () => {
    // Cloudflare 5xx or network error → the wrapper must NOT throw; instead
    // surface success:false with a synthetic error code so withPublicAction
    // can short-circuit with error:'turnstile_failed'.
    const mod = await dynamicImport(TURNSTILE_MODULE);
    void mod;
    expect.fail('FLIP-IN: 05-02-PLAN.md');
  });
});
