// Plan 02-04 Task 4.2 — withAdminAction wrapper unit tests.
//
// Mocks @/lib/auth (requireAdmin) + next/headers (headers()) so the wrapper
// can be exercised without a live Auth.js session. Covers all four return
// branches of the discriminated result:
//   1. requireAdmin OK + Zod parse OK -> handler called with ctx; ok:true
//   2. requireAdmin throws Unauthorized -> ok:false, error:'unauthorized'
//   3. Zod parse fails -> ok:false, error:'validation'
//   4. Handler throws non-auth error -> ok:false, error:'unknown'
//
// Closest analog: tests/api/cloudinary-sign.test.ts (vi.mock + vi.mocked
// typed cast pattern for @/lib/auth + Request fake).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

import { requireAdmin } from '@/lib/auth';
import { headers } from 'next/headers';
import { withAdminAction } from '@/lib/server-action';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockHeaders = vi.mocked(headers);

function fakeHeaders(map: Record<string, string>) {
  return {
    get: (k: string) => map[k.toLowerCase()] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>;
}

describe('withAdminAction (T-02-04-01, T-02-04-02)', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockHeaders.mockReset();
  });

  const schema = z.object({ name: z.string().min(1) });

  it('calls handler with parsed input + ctx (actorEmail/ip/userAgent) when auth + parse succeed', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { email: 'admin@manometr.uz' },
      expires: '2099-01-01T00:00:00Z',
    } as never);
    mockHeaders.mockResolvedValue(
      fakeHeaders({
        'x-forwarded-for': '203.0.113.7',
        'user-agent': 'Mozilla/5.0 (vitest)',
      }),
    );

    const handler = vi.fn(async (input: { name: string }, ctx) => ({
      echoed: input.name,
      ctx,
    }));
    const action = withAdminAction(schema, handler);
    const result = await action({ name: 'Acme' });

    expect(result).toEqual({
      ok: true,
      data: {
        echoed: 'Acme',
        ctx: {
          actorEmail: 'admin@manometr.uz',
          ip: '203.0.113.7',
          userAgent: 'Mozilla/5.0 (vitest)',
        },
      },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns { ok:false, error:"unauthorized" } when requireAdmin throws Unauthorized (T-02-04-02)', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));
    mockHeaders.mockResolvedValue(fakeHeaders({}));

    const handler = vi.fn();
    const action = withAdminAction(schema, handler);
    const result = await action({ name: 'Acme' });

    expect(result).toEqual({ ok: false, error: 'unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns { ok:false, error:"validation" } when Zod parse fails (T-02-04-01 mass-assignment guard)', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { email: 'admin@manometr.uz' },
      expires: '2099-01-01T00:00:00Z',
    } as never);
    mockHeaders.mockResolvedValue(fakeHeaders({}));

    const handler = vi.fn();
    const action = withAdminAction(schema, handler);
    const result = await action({ name: '' }); // fails min(1)

    expect(result).toEqual({ ok: false, error: 'validation' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns { ok:false, error:"unknown" } when handler throws a non-auth error', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { email: 'admin@manometr.uz' },
      expires: '2099-01-01T00:00:00Z',
    } as never);
    mockHeaders.mockResolvedValue(fakeHeaders({}));

    const handler = vi.fn(async () => {
      throw new Error('database is on fire');
    });
    const action = withAdminAction(schema, handler);

    // Suppress expected console.error for this branch
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await action({ name: 'Acme' });
    errSpy.mockRestore();

    expect(result).toEqual({ ok: false, error: 'unknown' });
  });

  it('falls back to "unknown" ip/userAgent when headers are absent', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { email: 'admin@manometr.uz' },
      expires: '2099-01-01T00:00:00Z',
    } as never);
    mockHeaders.mockResolvedValue(fakeHeaders({}));

    const handler = vi.fn(async (_input: { name: string }, ctx) => ctx);
    const action = withAdminAction(schema, handler);
    const result = await action({ name: 'Acme' });

    expect(result).toEqual({
      ok: true,
      data: { actorEmail: 'admin@manometr.uz', ip: 'unknown', userAgent: 'unknown' },
    });
  });
});
