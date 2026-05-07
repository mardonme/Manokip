// Composed Edge proxy (Next.js 16 renames `middleware.ts` -> `proxy.ts`).
// Composes next-intl locale redirect + admin gate + D-15 dual session cap.
//
// This file runs in the Edge runtime. It MUST NOT statically import anything
// that touches Node-only APIs (DB, Node net/fs, React Email render, Resend SDK,
// DrizzleAdapter). `@neondatabase/serverless`'s `neon(url)` HTTP driver IS
// Edge-safe (uses fetch under the hood) — we use it directly with
// `process.env.DATABASE_URL!` rather than going through `@/db/client` (which
// transitively imports `@/env`, a Node-only Zod boundary).
//
// Why we don't use `auth(authConfig)` here: Auth.js v5 throws `MissingAdapter`
// when an email provider is configured without an adapter. We can't include
// the Drizzle adapter in this Edge bundle (Pattern 5 + Pitfall 1 in
// .planning/phases/01-foundations/01-RESEARCH.md), so we validate the session
// cookie directly. The cookie is opaque (DB strategy, not JWT), so DB lookup
// is the canonical validation anyway.
//
// Composition order:
//   1. Admin path gate — if `/(uz|ru|en)/admin(/|$)` validate the session
//      cookie against `sessions` (existence + 24h idle + 7d absolute caps).
//      Any failure 307-redirects to `/{locale}/login` and clears stale cookies.
//   2. Otherwise hand off to next-intl `createMiddleware(routing)` for locale
//      detection + `/` -> `/{detected-locale}/` redirect (D-03 chain:
//      cookie NEXT_LOCALE -> Accept-Language -> default `uz`).

import createMiddleware from 'next-intl/middleware';
import { neon } from '@neondatabase/serverless';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

function redirectClearingSession(loginUrl: URL) {
  // NextResponse.redirect (mutable headers) — Response.redirect headers are
  // immutable so we can't append Set-Cookie there. Clear BOTH dev and prod
  // cookie names so a dev/prod confusion can't replay a stale token.
  const res = NextResponse.redirect(loginUrl, 307);
  res.cookies.set('__Secure-authjs.session-token', '', {
    path: '/',
    maxAge: 0,
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
  });
  res.cookies.set('authjs.session-token', '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });
  return res;
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Admin gate: requires a live session row (T-ADMIN-GATE, D-15).
  // Regex requires `/` or end-of-string after `admin` so `/uz/administrator`
  // is NOT gated.
  const isAdminPath = /^\/(uz|ru|en)\/admin(\/|$)/.test(pathname);
  if (isAdminPath) {
    const locale = pathname.split('/')[1] || 'uz';
    const loginUrl = new URL(`/${locale}/login`, req.url);

    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return Response.redirect(loginUrl, 307);
    }

    // D-15 dual cap (plan 02-03): one Neon HTTP read per admin request to
    // confirm the backing `sessions` row is still within both the 24h-idle
    // (`expires`) and 7d-absolute (`absolute_expires`) windows. The DB row
    // is the source of truth — a stolen cookie that escaped Auth.js's
    // own expiry should still be rejected here.
    //
    // `absolute_expires` is populated lazily by the session callback in
    // `src/lib/auth.ts` on the first session read after sign-in (set to
    // created_at + 7d). Treat NULL as "grandfathered Phase-1 session" → ok;
    // the next session read after this redeploy stamps it.
    try {
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
        : true;

      if (!row || !expiresOk || !absOk) {
        return redirectClearingSession(loginUrl);
      }
    } catch (err) {
      // Fail closed: any error reading the session row redirects to login.
      // Edge runtime + transient Neon failure shouldn't grant access.
      console.error('proxy: session lookup failed', err);
      return redirectClearingSession(loginUrl);
    }
  }

  // Locale redirect + detection chain (D-03: cookie -> Accept-Language -> uz).
  return handleI18nRouting(req);
}

export const config = {
  matcher: [
    // Skip: api routes, Next internals, static assets (anything with a file extension)
    '/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
