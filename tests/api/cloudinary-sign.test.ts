// FOUND-06 / T-CLD-01,02,03: POST /api/cloudinary/sign integration tests.
//
// These tests import the route handler directly and mock `@/lib/auth` so
// the test suite doesn't need a live Auth.js database session. CLOUDINARY_*
// env vars (including CLOUDINARY_API_SECRET) come from tests/_fixtures/
// load-env.ts — real secrets when available in .env.local, placeholder
// strings otherwise. The test asserts the signature shape (lowercase hex)
// rather than a specific value because the HMAC input depends on the
// timestamp which rolls per second.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { POST } from '@/app/api/cloudinary/sign/route';
import { auth } from '@/lib/auth';

// Auth.js v5's `auth` is a heavily-overloaded union (handlers + middleware
// wrappers + bare session fetcher) so `vi.mocked(auth)` narrows to the
// NextMiddleware overload which rejects `null` from mockResolvedValue. Cast
// to the plain-fetcher shape — the only overload this route actually calls.
const mockAuth = vi.mocked(auth) as unknown as ReturnType<
  typeof vi.fn<() => Promise<{ user?: { email?: string | null } } | null>>
>;

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('FOUND-06 / T-CLD-01,02,03: POST /api/cloudinary/sign', () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it('returns 401 when no session (T-CLD-01)', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ folder: 'products' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when session has no email (T-CLD-01)', async () => {
    mockAuth.mockResolvedValue({ user: {} } as never);
    const res = await POST(makeRequest({ folder: 'products' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for folder outside allowlist (T-CLD-02)', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'admin@test.local' } } as never);
    const res = await POST(makeRequest({ folder: 'uploads' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing folder field', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'admin@test.local' } } as never);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'admin@test.local' } } as never);
    const res = await POST(makeRequest('{not json'));
    expect(res.status).toBe(400);
  });

  for (const folder of ['products', 'recipes', 'industries', 'manufacturers'] as const) {
    it(`returns 200 + signature shape for valid admin + folder=${folder} (T-CLD-03)`, async () => {
      mockAuth.mockResolvedValue({ user: { email: 'admin@test.local' } } as never);
      const res = await POST(makeRequest({ folder }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        folder,
        apiKey: expect.any(String),
        cloudName: expect.any(String),
        timestamp: expect.any(Number),
        signature: expect.any(String),
      });
      // Integer seconds (Pitfall 5) — sanity bounds.
      expect(body.timestamp).toBeGreaterThan(1_700_000_000); // after 2023
      expect(body.timestamp).toBeLessThan(Date.now() / 1000 + 10); // not far-future
      // Cloudinary signatures are lowercase hex (SHA-1 by default).
      expect(body.signature).toMatch(/^[a-f0-9]+$/);
      // T-SEC-ENV: apiSecret MUST NOT leak into the response under any key.
      expect(body).not.toHaveProperty('apiSecret');
      expect(body).not.toHaveProperty('api_secret');
    });
  }
});
