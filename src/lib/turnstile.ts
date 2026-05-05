// Phase 5 plan 05-02 task 2.1 — Cloudflare Turnstile siteverify wrapper (CTA-01).
//
// Posture mirrors src/lib/auth.ts external-service helpers:
//   - Single env-imported secret (TURNSTILE_SECRET_KEY).
//   - Module-scoped fetch with `cache: 'no-store'` so Next never caches the call
//     (siteverify tokens are single-use; caching would break the contract).
//   - Discriminated TurnstileResult; non-2xx surfaces success:false errorCodes:
//     ['siteverify-http-error'] instead of throwing — withPublicAction maps the
//     non-success case to { ok:false, error:'turnstile_failed' }.
//
// No SDK: Cloudflare ships siteverify as a single REST POST. Body must be
// form-urlencoded (NOT JSON) with keys secret, response, remoteip.
// Token TTL is 5 minutes single-use (RESEARCH §Pitfall 2 — caller must reset
// widget on rejected submit).

import { env } from '@/env';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstile(
  token: string,
  ip: string,
): Promise<TurnstileResult> {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: ip,
  });

  const res = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    return { success: false, errorCodes: ['siteverify-http-error'] };
  }

  const json = (await res.json()) as {
    success: boolean;
    'error-codes'?: string[];
  };
  return { success: json.success === true, errorCodes: json['error-codes'] };
}
