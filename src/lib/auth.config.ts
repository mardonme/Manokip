// Edge-safe Auth.js v5 config — providers-only.
//
// This file is imported by middleware (plan 06), which runs in the Edge
// runtime. Edge runtime forbids Node.js core modules (net, fs, etc.), so
// THIS FILE MUST NOT STATICALLY IMPORT:
//   - @auth/drizzle-adapter (pulls in pg via @neondatabase/serverless deep)
//   - @/db/client, @/db/schema, drizzle-orm (pulls in Node DB drivers)
//   - @/lib/bootstrap (pulls in @/db/*)
//   - @/emails/* (React Email renders via react-dom/server — Node-only)
//   - resend (the sending SDK)
//   - @react-email/render / @react-email/components (Node-only render path)
//
// Callbacks + adapter + DB-aware signIn logic live in ./auth.ts, which is
// only imported by Node-runtime code (Server Actions, RSCs, route handlers).
// See .planning/phases/01-foundations/01-RESEARCH.md Pattern 5 + Pitfall 1.
//
// `sendVerificationRequest` IS present here (the Resend provider accepts it),
// but Node-only modules enter ONLY via dynamic `await import(...)` calls
// inside the function body. Those resolve at request time in the Node
// runtime (Auth.js triggers them from the route handler, not middleware), so
// they never enter the Edge bundle's static module graph.

import Resend from 'next-auth/providers/resend';
import type { NextAuthConfig } from 'next-auth';

export default {
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.RESEND_FROM_EMAIL,
      async sendVerificationRequest({ identifier: to, url, provider }) {
        // T-02-08-01 magic-link harvesting mitigation: only emit a Resend
        // send when the identifier corresponds to an active admin_user. For
        // unknown / inactive emails we silently no-op so the response shape
        // (and the Resend dashboard) cannot be used as an enumeration
        // oracle. The login form (Server Action) returns the same
        // { ok: true } confirmation in either case (T-02-08-02).
        //
        // Dynamic import — keeps the helper (and its DB import chain) out
        // of the Edge bundle's static graph. sendVerificationRequest runs
        // on the Node runtime (Auth.js route handler), so dynamic resolves
        // here are safe.
        const { isActiveAdminEmail } = await import('@/lib/active-admin-check');
        const allowed = await isActiveAdminEmail(to);
        if (!allowed) {
          // Silent: do not signal to the caller whether the email is unknown
          // or inactive. Audit-log the no-op? Out of scope for Phase 2;
          // adding it would create a covert channel via timing/audit-row
          // counts. Plan-2 PROJECT log notes this as a known posture.
          return;
        }

        // Dynamic imports keep Node-only modules out of the Edge bundle.
        const { Resend: ResendSDK } = await import('resend');
        const { render } = await import('@react-email/components');
        const MagicLinkEmail = (await import('@/emails/magic-link')).default;
        const resend = new ResendSDK(provider.apiKey as string);
        const html = await render(MagicLinkEmail({ url, locale: 'uz' }));
        const { error } = await resend.emails.send({
          from: provider.from as string,
          to,
          subject: 'Manometr — kirish havolasi',
          html,
        });
        if (error) throw new Error(error.message);
      },
    }),
  ],
  // D-15 locale-prefixed sign-in page (Pitfall 7 — Auth.js default /signin
  // would skip the locale shell).
  pages: {
    signIn: '/uz/login',
    error: '/uz/login',
  },
} satisfies NextAuthConfig;
