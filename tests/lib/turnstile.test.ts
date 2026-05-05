// Phase 5 plan 05-02 task 2.1 — verifyTurnstile() siteverify client tests.
//
// Mocks globalThis.fetch (vi.spyOn) to assert the request shape AND each
// response-handling branch:
//   1. POST to canonical siteverify URL with form-urlencoded body
//      keys (secret, response, remoteip) — no JSON, no SDK.
//   2. success:true when Cloudflare returns {success:true}.
//   3. success:false + error-codes pass-through on a JSON failure body.
//   4. success:false errorCodes:['siteverify-http-error'] on non-2xx.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyTurnstile } from '@/lib/turnstile';

describe('verifyTurnstile()', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch') as unknown as ReturnType<
      typeof vi.spyOn
    >;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('POSTs to challenges.cloudflare.com/turnstile/v0/siteverify with secret+response+remoteip body', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as unknown as never,
    );

    await verifyTurnstile('test-token', '203.0.113.5');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(init.method).toBe('POST');
    expect(init.cache).toBe('no-store');
    // Body is URLSearchParams (form-urlencoded, NOT JSON)
    expect(init.body).toBeInstanceOf(URLSearchParams);
    const body = init.body as URLSearchParams;
    expect(body.get('response')).toBe('test-token');
    expect(body.get('remoteip')).toBe('203.0.113.5');
    expect(body.get('secret')).toBeTruthy();
  });

  it('returns success:true when Cloudflare returns success', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }) as unknown as never,
    );

    const result = await verifyTurnstile('valid-token', '127.0.0.1');
    expect(result.success).toBe(true);
  });

  it('returns success:false with errorCodes when Cloudflare returns failure (e.g., timeout-or-duplicate)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          'error-codes': ['timeout-or-duplicate'],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ) as unknown as never,
    );

    const result = await verifyTurnstile('expired-token', '127.0.0.1');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(['timeout-or-duplicate']);
  });

  it('returns success:false errorCodes:[siteverify-http-error] on non-2xx response', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('Internal Server Error', {
        status: 500,
      }) as unknown as never,
    );

    const result = await verifyTurnstile('any-token', '127.0.0.1');
    expect(result.success).toBe(false);
    expect(result.errorCodes).toEqual(['siteverify-http-error']);
  });
});
