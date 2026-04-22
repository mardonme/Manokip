// Composed Edge proxy (Next.js 16 renames `middleware.ts` -> `proxy.ts`).
// Composes next-intl locale redirect + Auth.js v5 admin gate.
//
// This file runs in the Edge runtime. It MUST NOT statically import anything
// that touches Node-only APIs (DB, Node net/fs, React Email render, Resend SDK,
// DrizzleAdapter). The ONLY src/lib import allowed here is `@/lib/auth.config`
// — the providers-only Auth.js config locked in plan 01-05. Importing
// `@/lib/auth` (without `.config`) would pull the Drizzle + Neon driver into
// Edge and crash at build. See .planning/phases/01-foundations/01-RESEARCH.md
// Pattern 2 + Pitfall 1.
//
// Composition order:
//   1. Admin path gate — if `/(uz|ru|en)/admin(/|$)` and no `req.auth`,
//      307-redirect to `/{locale}/login`.
//   2. Otherwise hand off to next-intl `createMiddleware(routing)` for locale
//      detection + `/` -> `/{detected-locale}/` redirect (D-03 chain:
//      cookie NEXT_LOCALE -> Accept-Language -> default `uz`).
//
// Next.js 16 note: the file convention is `proxy.ts` with a named export
// `proxy`. Auth.js v5's canonical shape is `export const proxy = auth(...)`.

import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
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
  if (isAdminPath && !req.auth) {
    const locale = pathname.split('/')[1] || 'uz';
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return Response.redirect(url, 307);
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
