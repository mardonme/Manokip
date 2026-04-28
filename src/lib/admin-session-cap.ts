// D-15 / Open Q §5 — 7d absolute session cap enforcement helper.
//
// Lives in its own module (NO next-auth import) so vitest can exercise it
// against the live Neon test branch without pulling in next-auth's env.js,
// which transitively fails to resolve `next/server` outside a Next.js
// runtime. The seam is intentional — `requireAdmin()` in src/lib/auth.ts
// imports + delegates to this function.
//
// Behavior:
//   - sessions row missing or absolute_expires is NULL or in the future
//     -> returns silently (no-op).
//   - absolute_expires < now() -> emits a `session_revoked` audit row,
//     deletes the session row, throws `new Error('Unauthorized')`.
//
// Audit-write failures are caught + logged so they can never bypass the
// cap rejection — the throw at the end is the security gate. Sessions
// deletion is belt-and-suspenders so a cookie replay after this rejection
// also fails.

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dbTx } from '@/db/client-ws';
import { sessions } from '@/db/schema';
import { logAudit } from '@/lib/audit';

export async function enforceAbsoluteCap(
  sessionToken: string,
  actorEmail: string,
): Promise<void> {
  const [row] = await db
    .select({ absoluteExpires: sessions.absoluteExpires })
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);
  if (!row?.absoluteExpires || row.absoluteExpires.getTime() >= Date.now()) {
    return;
  }
  try {
    await dbTx.transaction(async (tx) => {
      await logAudit(tx, {
        actorEmail,
        action: 'session_revoked',
        entityType: 'admin_user',
        entityId: actorEmail,
        before: { absoluteExpires: row.absoluteExpires!.toISOString() },
        after: null,
      });
    });
  } catch (err) {
    console.error('audit:session_revoked emit failed', err);
  }
  await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  throw new Error('Unauthorized'); // D-09 absolute timeout
}
