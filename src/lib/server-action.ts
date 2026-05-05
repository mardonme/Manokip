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
import { dbTx } from '@/db/client-ws';
import { logAudit } from '@/lib/audit';
import {
  hashIp,
  parseClientIp,
  checkAndIncrementRateLimit,
  RateLimitError,
} from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

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

// ---------------------------------------------------------------------------
// withPublicAction — public-facing analog of withAdminAction (Phase 5 plan 02).
//
// Composes the honeypot → Turnstile → rate-limit triple-gate before invoking
// the handler. Each gate is short-circuiting:
//   Step A — Zod allowlist (validation error → ok:false validation)
//   Step B — Extract IP (parseClientIp Vercel-canonical) + hash (HMAC-SHA256)
//   Step C — Honeypot: if field_extra populated, write spam_detected audit row
//            and return ok:true silent (D-04 — drop-don't-retry posture)
//   Step D — Turnstile siteverify: ok:false turnstile_failed on non-success
//   Step E — Atomic 2-bucket rate-limit; RateLimitError → audit row + ok:false
//   Step F — Hand off to handler with PublicActionContext { ip, ipHash, userAgent }
//
// `actorEmail` for visitor-anonymous flow is the literal string 'visitor'.
// Existing withAdminAction is NOT touched — every Phase-2/3/4 admin Server
// Action depends on it verbatim.
// ---------------------------------------------------------------------------

export type PublicActionResult<O> =
  | { ok: true; data: O }
  | {
      ok: false;
      error:
        | 'validation'
        | 'turnstile_failed'
        | 'rate_limited'
        | 'spam_detected'
        | 'unknown';
    };

export interface PublicActionInputBase {
  field_extra?: string;
  turnstileToken: string;
}

export interface PublicActionContext {
  ip: string;
  ipHash: string;
  userAgent: string;
}

export function withPublicAction<I extends PublicActionInputBase, O>(
  schema: z.ZodType<I>,
  handler: (input: I, ctx: PublicActionContext) => Promise<O>,
): (raw: unknown) => Promise<PublicActionResult<O>> {
  return async (raw): Promise<PublicActionResult<O>> => {
    try {
      // Step A — Zod allowlist (mass-assignment guard).
      const input = schema.parse(raw);

      // Step B — IP extraction (Vercel-canonical first hop) + HMAC hash.
      const h = await headers();
      const ip = parseClientIp(h);
      const ipHash = hashIp(ip);
      const userAgent = h.get('user-agent') ?? 'unknown';

      // Step C — Honeypot trip → silent ok:true + audit row.
      // D-04 drop-don't-retry: bot is told the submission succeeded so it
      // doesn't retry with a fresh token. The honeypot row goes to audit_log
      // with action='spam_detected', actorEmail='visitor'.
      if (input.field_extra && input.field_extra.length > 0) {
        await dbTx.transaction(async (tx) => {
          await logAudit(tx, {
            actorEmail: 'visitor',
            action: 'spam_detected',
            entityType: 'contact_submission_attempt',
            entityId: ipHash,
            before: null,
            after: { ipHash, userAgent },
            ip,
            userAgent,
          });
        });
        return { ok: true, data: undefined as unknown as O };
      }

      // Step D — Turnstile siteverify.
      const tsResult = await verifyTurnstile(input.turnstileToken, ip);
      if (!tsResult.success) {
        return { ok: false, error: 'turnstile_failed' };
      }

      // Step E — Atomic 2-bucket rate limit. RateLimitError throws inside the
      // tx (rollback). The wrapper catches it, writes a rate_limited audit
      // row in a *separate* tx (the original rolled back), and returns
      // ok:false rate_limited.
      try {
        await checkAndIncrementRateLimit(ipHash);
      } catch (err) {
        if (err instanceof RateLimitError) {
          await dbTx.transaction(async (tx) => {
            await logAudit(tx, {
              actorEmail: 'visitor',
              action: 'rate_limited',
              entityType: 'contact_submission_attempt',
              entityId: ipHash,
              before: null,
              after: {
                ipHash,
                hourCount: err.hourCount,
                dayCount: err.dayCount,
              },
              ip,
              userAgent,
            });
          });
          return { ok: false, error: 'rate_limited' };
        }
        throw err;
      }

      // Step F — Hand off to handler.
      const data = await handler(input, { ip, ipHash, userAgent });
      return { ok: true, data };
    } catch (err) {
      if (err instanceof z.ZodError) return { ok: false, error: 'validation' };
      console.error('public-action', err);
      return { ok: false, error: 'unknown' };
    }
  };
}
