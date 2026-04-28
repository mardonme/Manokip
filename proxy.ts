// Composed Edge proxy (Next.js 16 renames `middleware.ts` -> `proxy.ts`).
// Composes next-intl locale redirect + Auth.js v5 admin gate + D-15 dual session cap.
//
// This file runs in the Edge runtime. It MUST NOT statically import anything
// that touches Node-only APIs (DB, Node net/fs, React Email render, Resend SDK,
// DrizzleAdapter). The ONLY src/lib import allowed here is `@/lib/auth.config`
// — the providers-only Auth.js config locked in plan 01-05. Importing
// `@/lib/auth` (without `.config`) would pull the Drizzle + Neon driver into
// Edge and crash at build. See .planning/phases/01-foundations/01-RESEARCH.md
// Pattern 2 + Pitfall 1.
//
// `@neondatabase/serverless`'s `neon(url)` HTTP driver IS Edge-safe (it
// uses fetch under the hood) — we use it directly with
// `process.env.DATABASE_URL!` rather than going through `@/db/client` (which
// transitively imports `@/env`, a Node-only Zod boundary).
//
// Composition order:
//   1. Admin path gate — if `/(uz|ru|en)/admin(/|$)` and no `req.auth`,
//      307-redirect to `/{locale}/login`.
//   2. D-15 dual cap (plan 02-03) — if cookie is present, read the backing
//      sessions row and reject if `expires < now()` (24h idle cap) OR
//      `absolute_expires < now()` (7d absolute cap). Clear-cookie headers
//      on the redirect so the stale cookie cannot be replayed.
//   3. Otherwise hand off to next-intl `createMiddleware(routing)` for locale
//      detection + `/` -> `/{detected-locale}/` redirect (D-03 chain:
//      cookie NEXT_LOCALE -> Accept-Language -> default `uz`).
//
// Next.js 16 note: the file convention is `proxy.ts` with a named export
// `proxy`. Auth.js v5's canonical shape is `export const proxy = auth(...)`.

import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { neon } from '@neondatabase/serverless';
import authConfig from '@/lib/auth.config';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export const proxy = auth(async function middleware(req) {
  const pathname = req.nextUrl.pathname;

  // Admin gate: requires valid Auth.js session (T-ADMIN-GATE, D-15).
  // Regex requires `/` or end-of-string after `admin` so `/uz/administrator`
  // is NOT gated.
  const isAdminPath = /^\/(uz|ru|en)\/admin(\/|$)/.test(pathname);
  if (isAdminPath) {
    if (!req.auth) {
      const locale = pathname.split('/')[1] || 'uz';
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return Response.redirect(url, 307);
    }

    // D-15 dual cap (plan 02-03): one Neon HTTP read per admin request to
    // confirm the backing `sessions` row is still within both the 24h-idle
    // (`expires`) and 7d-absolute (`absolute_expires`) windows. Auth.js's
    // own cookie expiry is a backstop, NOT the source of truth — a stolen
    // cookie whose JWT is still cryptographically valid could otherwise
    // outlive its server-side row. The DB row is canonical.
    //
    // `absolute_expires` is populated lazily by the session callback in
    // `src/lib/auth.ts:81-98` on the first session read after sign-in
    // (set to created_at + 7d, mathematically equivalent to D-15's original
    // cap formulation — verified at Phase-2 planning time, no schema change).
    // Treat NULL as "grandfathered Phase-1 session" → ok; the next session
    // read after this redeploy stamps it.
    const sessionToken = req.cookies.get(
      process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
    )?.value;

    if (sessionToken) {
      const sql = neon(process.env.DATABASE_URL!);
      const rows = (await sql`
        SELECT expires, absolute_expires
          FROM sessions
         WHERE session_token = ${sessionToken}
         LIMIT 1
      `) as Array<{ expires: string; absolute_expires: string | null }>;
      const row = rows[0];
      const now = Date.now();
      const expiresOk = row && new Date(row.expires).getTime() > now;
      const absOk = row?.absolute_expires
        ? new Date(row.absolute_expires).getTime() > now
        : true; // null absolute_expires = grandfathered Phase-1 session; treat as ok.

      if (!row || !expiresOk || !absOk) {
        const locale = pathname.split('/')[1] || 'uz';
        const res = Response.redirect(
          new URL(`/${locale}/login`, req.url),
          307,
        );
        // Clear BOTH the production (`__Secure-`) and dev cookie names so a
        // dev/prod confusion can't replay the stale cookie. Max-Age=0 is the
        // canonical RFC-6265 form for cookie deletion.
        res.headers.append(
          'Set-Cookie',
          '__Secure-authjs.session-token=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax',
        );
        res.headers.append(
          'Set-Cookie',
          'authjs.session-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
        );
        return res;
      }
    }
  }

  // Locale redirect + detection chain (D-03: cookie -> Accept-Language -> uz).
  return handleI18nRouting(req);
});

export const config = {
  matcher: [
    // Skip: api routes, Next internals, static assets (anything with a file extension)
    '/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
