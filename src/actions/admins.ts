'use server';

// Plan 02-07 ADMINS-INVITE — Server Actions for the admin invite lifecycle
// (D-14, ADMIN-02, ADMIN-11).
//
// Two actions:
//
// inviteAdmin (gated by withAdminAction; ADMIN-02 onboarding):
//   1. dbTx.transaction inserts admin_user(active=false) + admin_invite row +
//      audit_log row atomically. The admin_user upsert uses
//      onConflictDoNothing so re-inviting an existing-but-inactive admin
//      doesn't trip the email PK.
//   2. AFTER the transaction commits, dynamic-imports Resend +
//      @react-email/components + AdminInviteEmail and sends the email. The
//      dynamic import keeps the Node-only render path out of the Edge bundle
//      (mirrors src/lib/auth.config.ts:33-37 sendVerificationRequest).
//
// acceptInvite (NOT gated by withAdminAction — invitee is unauthenticated):
//   - Single atomic UPDATE consumes the token (Pitfall #4):
//       UPDATE admin_invite SET used_at = now()
//        WHERE token = $1 AND used_at IS NULL AND expires_at > now()
//        RETURNING email, invited_by
//     The WHERE used_at IS NULL guard makes the UPDATE single-use at the DB
//     level — a replay (used twice) returns zero rows because the first
//     successful consume stamped used_at.
//   - On non-zero rows: flips admin_user.active=true and writes an audit
//     row (action='update' — the closed AUDIT_ACTIONS set covers
//     'update' for activation; D-16 / 02-04 SUMMARY).
//   - On zero rows: returns { ok:false, error:'invalid_or_expired' } —
//     constant message regardless of cause (T-02-07-06: defeats email
//     enumeration; the UUID guess space is 122 bits).

import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { dbTx } from '@/db/client-ws';
import { adminUsers, adminInvites } from '@/db/schema';
import { withAdminAction } from '@/lib/server-action';
import { logAudit } from '@/lib/audit';

const inviteSchema = z.object({ email: z.string().email() });

export const inviteAdmin = withAdminAction(
  inviteSchema,
  async ({ email }, { actorEmail, ip, userAgent }) => {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    await dbTx.transaction(async (tx) => {
      // admin_user pre-created in inactive state. onConflictDoNothing
      // tolerates re-invite of an existing-but-inactive admin.
      await tx
        .insert(adminUsers)
        .values({
          email,
          role: 'admin',
          active: false,
          invitedBy: actorEmail,
          invitedAt: new Date(),
        })
        .onConflictDoNothing();

      await tx.insert(adminInvites).values({
        email,
        token,
        expiresAt,
        invitedBy: actorEmail,
      });

      await logAudit(tx, {
        actorEmail,
        action: 'invite',
        entityType: 'admin_user',
        entityId: email,
        before: null,
        after: { email, expiresAt: expiresAt.toISOString() },
        ip,
        userAgent,
      });
    });

    // Send AFTER tx commits. Dynamic imports keep the Node-only render path
    // out of the Edge bundle (auth.config.ts:33-37 mirror).
    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.AUTH_URL ??
      'https://manometr.uz';
    const acceptUrl = `${baseUrl}/uz/invite/accept?token=${encodeURIComponent(token)}`;

    const { Resend: ResendSDK } = await import('resend');
    const { render } = await import('@react-email/components');
    const AdminInviteEmail = (await import('@/emails/admin-invite')).default;

    const html = await render(AdminInviteEmail({ acceptUrl, locale: 'uz' }));
    const resend = new ResendSDK(process.env.AUTH_RESEND_KEY!);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: "You're invited to Manometr admin",
      html,
    });
    if (error) {
      // Resend SDK returns errors in the body rather than throwing; surface
      // them so the discriminated AdminActionResult shows 'unknown' to the
      // caller (and the row stays in the DB for retry — admins list will
      // surface the still-inactive row).
      throw new Error(`resend: ${error.message}`);
    }

    return { invited: email };
  },
);

// Discriminated return matches the React 19 useActionState contract — the
// accept-invite landing page narrows on `.ok` to render either the redirect
// or the invalid/expired notice.
export type AcceptInviteResult =
  | { ok: true; email: string }
  | { ok: false; error: 'invalid_or_expired' };

/**
 * acceptInvite — token consume + admin_user activation. Called from the
 * unauthenticated accept-invite landing page (src/app/[locale]/invite/accept/page.tsx)
 * with the token from the URL.
 *
 * Pitfall #4 atomic single-use UPDATE: the WHERE used_at IS NULL guard
 * means a second call with the same token returns zero rows because the
 * first successful consume already stamped used_at. No read-then-write
 * TOCTOU race.
 *
 * NOT wrapped in withAdminAction: the invitee is unauthenticated; the
 * security invariant lives in the WHERE clause, not in requireAdmin().
 */
export async function acceptInvite(
  rawToken: string,
): Promise<AcceptInviteResult> {
  // Cheap input shape guard — rawToken should always be a non-empty string
  // coming from page searchParams; bail before opening a DB transaction.
  if (typeof rawToken !== 'string' || rawToken.length === 0) {
    return { ok: false, error: 'invalid_or_expired' };
  }

  try {
    const result = await dbTx.transaction(async (tx) => {
      // Pitfall #4 — single atomic UPDATE consumes IFF unused AND unexpired.
      // We use raw SQL so we get RETURNING in the same statement; Drizzle's
      // .update().set().where().returning() builder would emit the same
      // shape but raw SQL is closer to the contract documented in
      // src/db/schema/admin.ts.
      const consumed = await tx.execute(sql`
        UPDATE admin_invite
           SET used_at = now()
         WHERE token = ${rawToken}
           AND used_at IS NULL
           AND expires_at > now()
        RETURNING email, invited_by
      `);

      const row = consumed.rows[0] as
        | { email: string; invited_by: string }
        | undefined;
      if (!row) {
        // Throw a sentinel so the catch below can map it to the discriminated
        // failure shape without leaking transaction internals to callers.
        throw new Error('INVALID_OR_EXPIRED');
      }

      // Activate the admin_user. Idempotent: subsequent UPDATEs are no-ops
      // because the row is already active=true (matched no actual change).
      await tx
        .update(adminUsers)
        .set({ active: true })
        .where(eq(adminUsers.email, row.email));

      // Audit row INSIDE the transaction so it commits/rolls back atomically
      // with the consume + activation (D-16 contract).
      await logAudit(tx, {
        actorEmail: row.invited_by,
        action: 'update',
        entityType: 'admin_user',
        entityId: row.email,
        before: { active: false },
        after: { active: true, accepted_at: new Date().toISOString() },
      });

      return { email: row.email };
    });

    return { ok: true, email: result.email };
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_OR_EXPIRED') {
      // Constant-message rejection (T-02-07-06): same response whether the
      // token is unknown, expired, or already used.
      return { ok: false, error: 'invalid_or_expired' };
    }
    // Real database / driver error — bubble up so it lands in Sentry.
    throw err;
  }
}
