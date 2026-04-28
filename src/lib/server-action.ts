// withAdminAction — universal Server Action wrapper (D-15..D-17 of CONTEXT,
// 02-PATTERNS §`src/lib/server-action.ts`). Every mutation Server Action in
// `src/actions/*.ts` calls this so the four-step boilerplate is consistent:
//
//   1. requireAdmin()  — D-09 admin gate (Unauthorized -> { ok:false, "unauthorized" })
//                        Also enforces D-15 7d absolute cap; cap rejection
//                        emits `session_revoked` audit row inside requireAdmin.
//   2. schema.parse(raw) — Zod allowlist (T-02-04-01 mass-assignment guard).
//                        Failure -> { ok:false, "validation" }.
//   3. headers()       — pull x-forwarded-for + user-agent into ctx.
//   4. handler(input, ctx) — caller's body. Anything thrown other than
//                        Unauthorized maps to { ok:false, "unknown" }.
//
// The discriminated return matches the React 19 / useActionState contract,
// so admin forms can `useActionState(action, null)` and switch on `.ok`.

import { headers } from 'next/headers';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';

export type AdminActionResult<O> =
  | { ok: true; data: O }
  | { ok: false; error: 'validation' | 'unauthorized' | 'unknown' };

export interface AdminActionContext {
  actorEmail: string;
  ip: string;
  userAgent: string;
}

export function withAdminAction<I, O>(
  schema: z.ZodType<I>,
  handler: (input: I, ctx: AdminActionContext) => Promise<O>,
): (raw: unknown) => Promise<AdminActionResult<O>> {
  return async (raw: unknown): Promise<AdminActionResult<O>> => {
    try {
      // T-02-04-02: auth gate FIRST — unauthenticated callers never reach
      // the body parse, so they don't learn the schema shape from error
      // messages.
      const session = await requireAdmin();
      // T-02-04-01: Zod allowlist BEFORE handler. Any field not in `schema`
      // is silently dropped by `parse()` (Zod default).
      const input = schema.parse(raw);
      const h = await headers();
      const data = await handler(input, {
        actorEmail: session.user!.email!,
        ip: h.get('x-forwarded-for') ?? 'unknown',
        userAgent: h.get('user-agent') ?? 'unknown',
      });
      return { ok: true, data };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return { ok: false, error: 'validation' };
      }
      // requireAdmin throws `new Error('Unauthorized')` (src/lib/auth.ts:118,129).
      // Any other Error is a handler/runtime fault.
      if (err instanceof Error && err.message === 'Unauthorized') {
        return { ok: false, error: 'unauthorized' };
      }
      console.error('admin-action', err);
      return { ok: false, error: 'unknown' };
    }
  };
}
