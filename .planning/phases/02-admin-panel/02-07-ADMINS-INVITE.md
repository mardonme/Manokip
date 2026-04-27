---
phase: 02-admin-panel
plan: 07
type: execute
wave: 2
depends_on: [01, 02, 04, 06]
files_modified:
  - src/actions/admins.ts
  - src/emails/admin-invite.tsx
  - src/app/[locale]/admin/admins/page.tsx
  - src/app/[locale]/admin/admins/admins-table.tsx
  - src/app/[locale]/invite/accept/page.tsx
  - tests/actions/admins.test.ts
autonomous: true
requirements: [ADMIN-02, ADMIN-11]
must_haves:
  truths:
    - "Existing admin can invite another admin by email; admin_user(active=false) row is pre-created and admin_invite row written with token + 48h expiry — atomic in one transaction"
    - "Invite email is sent via Resend with React Email AdminInviteEmail template"
    - "Clicking the accept link runs an atomic UPDATE that consumes the token (sets used_at) only if used_at IS NULL AND expires_at > now() (Pitfall #4)"
    - "On successful accept, admin_user.active flips to true; the user is redirected to /[locale]/login for magic-link sign-in"
    - "Token replay (used twice) is rejected"
    - "Audit log row written with action='invite' on invite, action='update' on accept"
    - "Admins list page shows all admins with their active state via DataTable"
  artifacts:
    - path: "src/actions/admins.ts"
      provides: "inviteAdmin Server Action + acceptInvite Server Action"
      contains: "export const inviteAdmin = withAdminAction"
    - path: "src/emails/admin-invite.tsx"
      provides: "React Email template for invite"
      contains: "export default function AdminInviteEmail"
    - path: "src/app/[locale]/admin/admins/page.tsx"
      provides: "RSC list of admins via DataTable"
      contains: "DataTable"
    - path: "src/app/[locale]/invite/accept/page.tsx"
      provides: "Accept-invite landing page that consumes the token and redirects"
      contains: "acceptInvite"
  key_links:
    - from: "src/actions/admins.ts"
      to: "src/lib/audit.ts (logAudit)"
      via: "atomic logAudit inside dbTx.transaction"
      pattern: "logAudit\\(tx, \\{"
    - from: "src/actions/admins.ts"
      to: "Resend (transactional email)"
      via: "dynamic import('resend')"
      pattern: "import\\(\"resend\"\\)"
    - from: "src/app/[locale]/invite/accept/page.tsx"
      to: "src/actions/admins.ts (acceptInvite)"
      via: "Server Action invocation on page load with token from searchParams"
      pattern: "acceptInvite\\("
---

<objective>
Land the admin-invite lifecycle end-to-end (D-14): an existing admin clicks "Invite", a 48h single-use token is created, an email is sent, the recipient clicks the link, the token is atomically consumed, and the admin_user row activates.

Purpose: ADMIN-02 + ADMIN-11. Closes the "how do new admins onboard" loop. Magic-link harvesting protection deferred to login flow polish (plan 02-08).
Output: 1 Server Action module + 1 email template + 2 admin pages + 1 integration test.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@CLAUDE.md
@src/db/schema/admin.ts
@src/db/client-ws.ts
@src/lib/audit.ts
@src/lib/server-action.ts
@src/lib/auth.ts
@src/emails/magic-link.tsx
@src/lib/auth.config.ts
@src/app/[locale]/login/actions.ts
@tests/_fixtures/admin-session.ts
@tests/_fixtures/db.ts

<interfaces>
From plan 02-01 schema migration:
```typescript
// adminInvites: { id, email, token (unique), expiresAt, usedAt, invitedBy, createdAt }
// adminUsers: { email, role, active, invitedBy, invitedAt }
```

From plan 02-04:
```typescript
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { dbTx } from "@/db/client-ws";
import { createActiveAdminSession } from "tests/_fixtures/admin-session";
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 7.1: Create AdminInviteEmail React Email template</name>
  <files>src/emails/admin-invite.tsx</files>
  <read_first>
    - src/emails/magic-link.tsx (Phase-1 sibling — verbatim shape: Html / Head / Preview / Body / Container / Text / Link with per-locale COPY map)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/emails/admin-invite.tsx (NEW — D-14)` — verbatim
  </read_first>
  <behavior>
    - Renders an HTML email with a CTA link to `${acceptUrl}` and per-locale subject/body strings (uz, ru, en).
    - Includes a `Preview` text for inbox preview pane.
  </behavior>
  <action>
    Create `src/emails/admin-invite.tsx` mirroring `src/emails/magic-link.tsx`:
    ```tsx
    import { Html, Head, Body, Container, Text, Link, Preview } from "@react-email/components";

    interface AdminInviteEmailProps {
      acceptUrl: string;
      invitedBy?: string;
      locale?: "uz" | "ru" | "en";
    }

    const COPY = {
      uz: {
        preview: "Manometr admin paneliga taklif",
        body: "Sizni Manometr admin paneliga taklif qilishdi. Quyidagi tugmani bosib qabul qiling.",
        cta: "Taklifni qabul qilish",
      },
      ru: {
        preview: "Приглашение в админ-панель Manometr",
        body: "Вас пригласили в админ-панель Manometr. Нажмите кнопку ниже, чтобы принять приглашение.",
        cta: "Принять приглашение",
      },
      en: {
        preview: "Invitation to Manometr admin panel",
        body: "You have been invited to the Manometr admin panel. Click the button below to accept.",
        cta: "Accept invitation",
      },
    } as const;

    const button = {
      backgroundColor: "#0f172a",
      color: "#fff",
      padding: "12px 24px",
      borderRadius: "6px",
      textDecoration: "none",
      display: "inline-block",
    };

    export default function AdminInviteEmail({ acceptUrl, locale = "uz" }: AdminInviteEmailProps) {
      const copy = COPY[locale];
      return (
        <Html lang={locale}>
          <Head />
          <Preview>{copy.preview}</Preview>
          <Body style={{ fontFamily: "sans-serif", padding: "24px" }}>
            <Container>
              <Text>{copy.body}</Text>
              <Link href={acceptUrl} style={button}>{copy.cta}</Link>
              <Text style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
                {acceptUrl}
              </Text>
            </Container>
          </Body>
        </Html>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export default function AdminInviteEmail' src/emails/admin-invite.tsx` returns `1`
    - `grep -c 'COPY = {' src/emails/admin-invite.tsx` returns `1`
    - File contains all 3 locale keys: uz, ru, en (each with `preview`, `body`, `cta`)
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Email template type-checks; ready to be rendered by inviteAdmin Server Action.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 7.2: Implement inviteAdmin + acceptInvite Server Actions + integration tests</name>
  <files>src/actions/admins.ts, tests/actions/admins.test.ts</files>
  <read_first>
    - src/app/[locale]/login/actions.ts (Phase-1 'use server' shape — closest analog for the file directives + Zod parse)
    - src/lib/auth.config.ts:31-45 (sendVerificationRequest dynamic import pattern for Resend)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/actions/admins.ts (NEW — D-14, ADMIN-02)` — verbatim Server Action shape including the atomic single-use UPDATE
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Code Examples §"Admin invite Server Action"
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pitfall 4 (admin invite email replay — atomic single UPDATE)
    - tests/db/spec-values.test.ts (live-Neon insert + assertion pattern)
  </read_first>
  <behavior>
    - inviteAdmin (per D-14): 1) parses { email }, 2) inside dbTx.transaction inserts admin_user(active=false) onConflictDoNothing + admin_invite row + audit_log row, 3) AFTER tx commit, dynamic-imports Resend + AdminInviteEmail and sends.
    - acceptInvite(token): atomic UPDATE consumes the token IFF used_at IS NULL AND expires_at > now(); flips admin_user.active=true; logs audit row; returns { ok, email }.
    - Replay: a second acceptInvite call with the same token returns `{ ok: false, error: 'invalid_or_expired' }`.
  </behavior>
  <action>
    Create `src/actions/admins.ts`:
    ```typescript
    "use server";

    import { z } from "zod";
    import { eq, sql } from "drizzle-orm";
    import { dbTx } from "@/db/client-ws";
    import { adminUsers, adminInvites } from "@/db/schema";
    import { withAdminAction } from "@/lib/server-action";
    import { logAudit } from "@/lib/audit";

    const inviteSchema = z.object({ email: z.string().email() });

    export const inviteAdmin = withAdminAction(inviteSchema, async ({ email }, { actorEmail, ip, userAgent }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await dbTx.transaction(async (tx) => {
        await tx.insert(adminUsers).values({
          email,
          role: "admin",
          active: false,
          invitedBy: actorEmail,
          invitedAt: new Date(),
        }).onConflictDoNothing();

        await tx.insert(adminInvites).values({
          email,
          token,
          expiresAt,
          invitedBy: actorEmail,
        });

        await logAudit(tx, {
          actorEmail,
          action: "invite",
          entityType: "admin_user",
          entityId: email,
          before: null,
          after: { email, expiresAt: expiresAt.toISOString() },
          ip,
          userAgent,
        });
      });

      // Dynamic import keeps Edge bundles lean (mirrors auth.config.ts pattern)
      const { Resend } = await import("resend");
      const { render } = await import("@react-email/components");
      const AdminInviteEmail = (await import("@/emails/admin-invite")).default;

      const acceptUrl = `${process.env.NEXTAUTH_URL ?? "https://manometr.uz"}/uz/invite/accept?token=${encodeURIComponent(token)}`;
      const html = await render(AdminInviteEmail({ acceptUrl, locale: "uz" }));

      const resend = new Resend(process.env.AUTH_RESEND_KEY!);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        subject: "You're invited to Manometr admin",
        html,
      });

      return { invited: email };
    });

    export async function acceptInvite(rawToken: string): Promise<
      { ok: true; email: string } | { ok: false; error: "invalid_or_expired" }
    > {
      try {
        const result = await dbTx.transaction(async (tx) => {
          // Atomic single-UPDATE consume (Pitfall #4)
          const consumed = await tx.execute(sql`
            UPDATE admin_invite
               SET used_at = now()
             WHERE token = ${rawToken}
               AND used_at IS NULL
               AND expires_at > now()
             RETURNING email, invited_by
          `);
          const row = consumed.rows[0] as { email: string; invited_by: string } | undefined;
          if (!row) throw new Error("INVALID_OR_EXPIRED");

          await tx.update(adminUsers)
            .set({ active: true })
            .where(eq(adminUsers.email, row.email));

          await logAudit(tx, {
            actorEmail: row.invited_by,
            action: "update",
            entityType: "admin_user",
            entityId: row.email,
            before: { active: false },
            after: { active: true, accepted_at: new Date().toISOString() },
          });

          return { email: row.email };
        });
        return { ok: true, email: result.email };
      } catch (err) {
        if (err instanceof Error && err.message === "INVALID_OR_EXPIRED") {
          return { ok: false, error: "invalid_or_expired" };
        }
        throw err;
      }
    }
    ```

    Create `tests/actions/admins.test.ts` (live-Neon integration):
    ```typescript
    import { describe, it, expect, afterEach } from "vitest";
    import { sql } from "drizzle-orm";
    import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";
    import { createActiveAdminSession } from "../_fixtures/admin-session";
    import { acceptInvite } from "@/actions/admins";

    describe("admins actions", () => {
      const cleanups: Array<() => Promise<void>> = [];
      afterEach(async () => { for (const c of cleanups) await c(); cleanups.length = 0; });

      it("acceptInvite consumes token atomically and activates admin (single-use)", async () => {
        requireTestDatabaseUrl();
        const db = await getTestDb();
        const inviter = await createActiveAdminSession();
        cleanups.push(inviter.cleanup);
        const inviteeEmail = `invitee+${Date.now()}@manometr.uz`;
        const token = crypto.randomUUID();

        // Seed: admin_user inactive + admin_invite with 48h
        await db.execute(sql`
          INSERT INTO admin_user (email, role, active, invited_by, invited_at)
          VALUES (${inviteeEmail}, 'admin', false, ${inviter.email}, now())
        `);
        await db.execute(sql`
          INSERT INTO admin_invite (email, token, expires_at, invited_by)
          VALUES (${inviteeEmail}, ${token}, now() + interval '48 hours', ${inviter.email})
        `);
        cleanups.push(async () => {
          await db.execute(sql`DELETE FROM admin_invite WHERE email = ${inviteeEmail}`);
          await db.execute(sql`DELETE FROM admin_user WHERE email = ${inviteeEmail}`);
          await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${inviteeEmail}`);
        });

        const first = await acceptInvite(token);
        expect(first).toEqual({ ok: true, email: inviteeEmail });

        // admin_user activated
        const adminRow = await db.execute(sql`SELECT active FROM admin_user WHERE email = ${inviteeEmail}`);
        expect((adminRow.rows[0] as { active: boolean }).active).toBe(true);

        // audit_log row written
        const auditRow = await db.execute(sql`
          SELECT action, entity_type, entity_id FROM audit_log
           WHERE entity_id = ${inviteeEmail} AND action = 'update' ORDER BY at DESC LIMIT 1
        `);
        expect(auditRow.rows[0]).toMatchObject({
          action: "update", entity_type: "admin_user", entity_id: inviteeEmail,
        });

        // Replay: second use rejects
        const second = await acceptInvite(token);
        expect(second).toEqual({ ok: false, error: "invalid_or_expired" });
      }, 15000);

      it("acceptInvite rejects when token expired", async () => {
        requireTestDatabaseUrl();
        const db = await getTestDb();
        const expiredToken = crypto.randomUUID();
        const inviteeEmail = `expired+${Date.now()}@manometr.uz`;
        await db.execute(sql`
          INSERT INTO admin_invite (email, token, expires_at, invited_by)
          VALUES (${inviteeEmail}, ${expiredToken}, now() - interval '1 minute', 'inviter@manometr.uz')
        `);
        cleanups.push(async () => {
          await db.execute(sql`DELETE FROM admin_invite WHERE email = ${inviteeEmail}`);
        });
        const result = await acceptInvite(expiredToken);
        expect(result).toEqual({ ok: false, error: "invalid_or_expired" });
      }, 15000);

      it("acceptInvite rejects unknown token", async () => {
        const result = await acceptInvite(crypto.randomUUID());
        expect(result).toEqual({ ok: false, error: "invalid_or_expired" });
      }, 15000);
    });
    ```
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/admins.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const inviteAdmin = withAdminAction' src/actions/admins.ts` returns `1`
    - `grep -c 'export async function acceptInvite' src/actions/admins.ts` returns `1`
    - `grep -c 'UPDATE admin_invite' src/actions/admins.ts` returns `1`
    - `grep -c 'used_at IS NULL' src/actions/admins.ts` returns `1`
    - `grep -c 'expires_at > now()' src/actions/admins.ts` returns `1`
    - `grep -c 'logAudit(tx,' src/actions/admins.ts` returns `>=2`
    - `pnpm vitest run tests/actions/admins.test.ts` exits 0; 3/3 tests pass
  </acceptance_criteria>
  <done>Server Actions implemented with atomic single-use UPDATE; integration tests cover happy path + expiry + unknown + replay.</done>
</task>

<task type="auto">
  <name>Task 7.3: Admin list page + accept-invite landing page</name>
  <files>src/app/[locale]/admin/admins/page.tsx, src/app/[locale]/admin/admins/admins-table.tsx, src/app/[locale]/invite/accept/page.tsx</files>
  <read_first>
    - src/app/[locale]/admin/page.tsx (RSC + locale + auth shape)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/app/[locale]/admin/products/page.tsx (NEW — RSC list with DataTable)` — applies the same pattern here
    - src/components/admin/data-table.tsx (from plan 02-06)
    - src/db/schema/admin.ts (adminUsers + adminInvites column shapes)
  </read_first>
  <action>
    Create `src/app/[locale]/admin/admins/page.tsx`:
    ```typescript
    import { setRequestLocale } from "next-intl/server";
    import { sql } from "drizzle-orm";
    import { db } from "@/db/client";
    import { adminUsers } from "@/db/schema";
    import { requireAdmin } from "@/lib/auth";
    import { AdminsTable } from "./admins-table";

    type SP = Promise<{ page?: string; pageSize?: string; q?: string }>;

    export default async function AdminsPage({
      params, searchParams,
    }: { params: Promise<{ locale: string }>; searchParams: SP }) {
      const { locale } = await params;
      setRequestLocale(locale);
      await requireAdmin();
      const sp = await searchParams;
      const page = Math.max(1, Number(sp.page ?? 1));
      const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 20)));

      const [rows, [{ count }]] = await Promise.all([
        db.select().from(adminUsers).limit(size).offset((page - 1) * size),
        db.select({ count: sql<number>`count(*)` }).from(adminUsers),
      ]);

      return <AdminsTable data={rows} rowCount={Number(count)} />;
    }
    ```

    Create `src/app/[locale]/admin/admins/admins-table.tsx` (client component): defines columns (email, role, active, invitedBy, invitedAt) + an "Invite admin" button that opens a Dialog with an email input that calls `inviteAdmin`. Use `useActionState` to surface the discriminated `{ ok, error }` return.

    Create `src/app/[locale]/invite/accept/page.tsx` (server component, NOT under [locale]/admin so unauthenticated users can reach it):
    ```typescript
    import { redirect } from "next/navigation";
    import { acceptInvite } from "@/actions/admins";

    export default async function AcceptInvitePage({
      searchParams,
    }: { searchParams: Promise<{ token?: string }> }) {
      const { token } = await searchParams;
      if (!token) return <p>Missing token.</p>;
      const result = await acceptInvite(token);
      if (!result.ok) return <p>This invite link is invalid or expired.</p>;
      redirect(`/uz/login?email=${encodeURIComponent(result.email)}`);
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/[locale]/admin/admins/page.tsx` exists with `await requireAdmin()`
    - File `src/app/[locale]/invite/accept/page.tsx` exists and calls `acceptInvite(token)`
    - File `src/app/[locale]/admin/admins/admins-table.tsx` exists and imports `DataTable`
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Admins list and accept-invite landing pages compile and route correctly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Server Action input → DB | inviteAdmin email input |
| Email link → /invite/accept (unauthenticated) | token from URL |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-07-01 | Spoofing | invite token replay (Pitfall #4) | mitigate | Atomic single UPDATE `WHERE token=$1 AND used_at IS NULL AND expires_at > now() RETURNING email` — only 1 row ever returned |
| T-02-07-02 | Information Disclosure | token in URL | accept | 122-bit random UUID + 48h expiry + single-use; same posture as Auth.js magic-links |
| T-02-07-03 | EoP | mass assignment via inviteAdmin input | mitigate | withAdminAction enforces Zod parse `{ email: z.string().email() }` |
| T-02-07-04 | Spoofing | unauth invite (no requireAdmin) | mitigate | inviteAdmin wrapped in withAdminAction → requireAdmin() runs first |
| T-02-07-05 | Repudiation | admin denies sending invite | mitigate | logAudit row with action='invite', actor_email=inviter, entity_id=invitee email |
| T-02-07-06 | Information Disclosure | email enumeration via /invite/accept | accept | Reject message is constant ("invalid or expired") regardless of cause; UUID guess space is 122 bits |
| T-02-07-07 | Tampering | direct admin_user.active UPDATE bypass | mitigate | acceptInvite Server Action is the only code path that flips active=true; lint rule via code review |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/actions/admins.test.ts` exits 0 (3/3)
- `pnpm build` exits 0
</verification>

<success_criteria>
1. inviteAdmin sends email + creates admin_user(active=false) + admin_invite row + audit row in one tx.
2. acceptInvite atomically consumes token + flips active=true + writes audit row.
3. Replay/expired/unknown all reject.
4. Admins list page + accept-invite page render without auth errors.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-07-SUMMARY.md` with: final Server Action API shapes, audit log row format on invite/accept, the accept-flow URL pattern.
</output>
