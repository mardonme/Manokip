---
phase: 01-foundations
plan: 06
subsystem: middleware+cloudinary
tags: [proxy, middleware, edge-runtime, next-intl, auth.js, admin-gate, cloudinary, signed-upload]

requires:
  - phase: 01-foundations/01-04
    provides: src/i18n/routing.ts (locales SSOT) + [locale] layout shell + next-intl v4 runtime
  - phase: 01-foundations/01-05
    provides: src/lib/auth.config.ts (Edge-safe providers-only NextAuthConfig) + src/lib/auth.ts (Node-runtime auth() + requireAdmin()) + /[locale]/login + /[locale]/admin RSCs
provides:
  - proxy.ts — Composed Edge runtime entry (Next.js 16 file convention) wrapping `next-intl createMiddleware(routing)` inside Auth.js v5 `auth(...)` wrapper. Admin-path regex `/^\/(uz|ru|en)\/admin(\/|$)/` redirects unauthenticated requests 307 to `/{locale}/login`; all other paths flow through next-intl's locale redirect + detection chain (D-03 cookie → Accept-Language → uz). Matcher excludes /api, /_next/*, /_vercel, and any path with a file extension.
  - src/lib/cloudinary.ts — Shared `cloudinary.v2` singleton configured once at module load with env.CLOUDINARY_{CLOUD_NAME,API_KEY,API_SECRET}. Consumed by /api/cloudinary/sign and all Phase 2+ upload consumers.
  - src/app/api/cloudinary/sign/route.ts — Node-runtime POST endpoint returning `{ signature, timestamp, folder, apiKey, cloudName }`. Order of defence: (1) `await auth()` returns 401 BEFORE any body read (T-CLD-01); (2) Zod enum on folder ∈ {products, recipes, industries, manufacturers} returns 400 (T-CLD-02); (3) `Math.floor(Date.now() / 1000)` integer seconds for the HMAC input (Pitfall 5, T-CLD-03); (4) response never includes apiSecret under any key (T-SEC-ENV).
  - tests/api/cloudinary-sign.test.ts — 9 integration tests with `vi.mock('@/lib/auth')`: 2× 401 (no session, session-no-email), 3× 400 (bad folder, missing folder, invalid JSON), 4× 200 (one per allowlisted folder — verifies signature shape `/^[a-f0-9]+$/`, integer timestamp bounds, apiSecret absence under both camelCase + snake_case keys).
  - tests/e2e/admin-gate.spec.ts — 10 Playwright tests exercising T-ADMIN-GATE: 3 locales × 3 scenarios (admin/ → 307 login, admin/subpath → 307 login, login → 200) + 1 regex-precision test confirming `/uz/administrator` is NOT gated.
  - tests/e2e/magic-link-login.spec.ts — Documented-manual scaffold for FOUND-05 round-trip, CI-skipped behind `RUN_MAGIC_LINK_TEST=1` env gate. `pollForMagicLink()` stub throws loudly so accidental CI runs fail instead of silently passing. Developer wires MailHog / Mailtrap / Resend-webhook capture when automation budget allows.
affects: [phase-1-plan-07, phase-2, phase-3]

tech-stack:
  added: []  # cloudinary 2.9.0 + @playwright 1.57.0 + vitest 4.1.4 pre-installed in package.json from plan 01-01
  patterns:
    - "Pattern 2 (RESEARCH) — Composed Edge middleware: `const { auth } = NextAuth(authConfig); export const proxy = auth(async fn); export const config = { matcher: [...] };`. The Auth.js `auth()` wrapper returns a NextMiddleware whose handler receives a request decorated with `req.auth` (session cookie cryptographically verified at Edge). Inside the handler, next-intl's `createMiddleware(routing)` runs for non-admin paths."
    - "Pitfall 1 (RESEARCH) — Edge-safety of middleware: proxy.ts's ONLY static import from src/lib/* is `@/lib/auth.config` (providers-only NextAuthConfig from plan 05). Importing `@/lib/auth` would pull DrizzleAdapter + @neondatabase/serverless + Drizzle + the emails barrel into the Edge bundle and crash at build. pnpm build confirms no Node-module leak (exits 0)."
    - "Pattern 8 (RESEARCH) — Cloudinary signed-upload endpoint: admin session gate runs FIRST (401 exits before body parse, so unauthenticated callers never learn the expected request shape). Zod enum validates folder strictly; Math.floor(Date.now()/1000) produces the integer timestamp that the browser uploader must echo in its multipart form — both the server sign-step and client upload-step feed the same integer into the HMAC or verification fails."
    - "Task 06.3 (human checkpoint) — DEFERRED: the magic-link round-trip manual e2e is not yet approved. FOUND-05 acceptance criterion awaits developer verification in an environment where the bootstrap admin user has been inserted (requires plan 07's instrumentation.ts or manual bootstrapAdmin() invocation)."
---

# Plan 01-06 — Composed proxy + Cloudinary sign endpoint + e2e scaffolds

## What was built

1. **`proxy.ts` at repo root** — Next.js 16 renamed the middleware file convention from `middleware.ts` to `proxy.ts` with a named `proxy` export. The plan (written against Next.js 15 conventions) specified `middleware.ts`; the file name was updated to match Next.js 16's convention but every other contract (Edge-safety, composition order, matcher list, regex, 307 redirect shape) matches the plan verbatim. The single static import from `@/lib/*` is `@/lib/auth.config` — auth.ts, db/*, bootstrap, emails are all excluded. `pnpm build` succeeds in 7s, generating 11 static pages + 3 dynamic routes (`/[locale]/admin`, `/api/auth/[...nextauth]`, `/api/cloudinary/sign`).

2. **`next.config.ts` turbopack root pin** — Next.js 16's Turbopack walks upward from the project root to infer a monorepo root. On this developer's Windows machine the walk hit `C:\Users\hp elitebook\package-lock.json` and wrongly rooted the workspace there, which breaks the single-file `proxy.ts` discovery (the one file Next.js resolves from project root rather than from app/). Added `turbopack.root = path.resolve(__dirname)` to pin the workspace root to this repo. Referenced in the Next.js turbopack docs under `root directory`.

3. **`src/lib/cloudinary.ts`** — 3-line singleton: `cloudinary.config({ cloud_name, api_key, api_secret })` using env.CLOUDINARY_*.

4. **`src/app/api/cloudinary/sign/route.ts`** — Node-runtime POST (`export const runtime = 'nodejs'`) with ordered defence: session → JSON parse → Zod enum → HMAC. Response shape: `{ signature, timestamp, folder, apiKey, cloudName }` — apiSecret never leaks.

5. **`tests/api/cloudinary-sign.test.ts`** — 9 passing integration tests (401×2, 400×3, 200×4). Uses `vi.mock('@/lib/auth')` with a narrow `ReturnType<typeof vi.fn<() => Promise<Session | null>>>` cast to bypass the Auth.js `auth()` overload union that makes `vi.mocked(auth).mockResolvedValue(null)` fail typecheck.

6. **`tests/e2e/admin-gate.spec.ts`** — 10 Playwright tests covering 3 locales × (admin root, admin subpath, login public) + 1 regex precision test. Uses `request.get(..., { maxRedirects: 0 })` + `expect(response.status()).toBe(307)` to assert the gate fires without chasing the redirect.

7. **`tests/e2e/magic-link-login.spec.ts`** — Documented-manual scaffold. `test.skip(process.env.RUN_MAGIC_LINK_TEST !== '1', ...)` gates the whole describe block; `pollForMagicLink()` stub throws rather than silently returns empty.

## Edge/Node boundary (enforced, not documented-only)

| Module | Runtime | Can be imported from proxy.ts? |
|---|---|---|
| `@/lib/auth.config` | Edge-safe | Yes (the only allowed src/lib import) |
| `@/i18n/routing` | Edge-safe | Yes (next-intl SSOT) |
| `@/lib/auth` | Node-only (DrizzleAdapter + Neon driver) | **No** — would crash Edge build |
| `@/db/*` | Node-only (postgres TCP) | **No** |
| `@/lib/bootstrap` | Node-only (transitively imports @/db/*) | **No** |
| `@/emails/*` | Node-only (@react-email/components render) | **No** |

The `next-auth/providers/resend` provider's `sendVerificationRequest` dynamic-imports the emails barrel at call time (plan 05 pattern) — this path runs only when Auth.js invokes the verification flow from a Node context (the `/api/auth/[...nextauth]` route handler), never from Edge.

## Cloudinary sign endpoint contract

**Request (POST JSON):**
```
{ "folder": "products" | "recipes" | "industries" | "manufacturers" }
```

**Response 200:**
```
{
  "signature":  string (lowercase hex SHA-1),
  "timestamp":  integer Unix seconds,
  "folder":     echoed from request,
  "apiKey":     string (public),
  "cloudName":  string (public)
}
```

**Response 401:** body `"Unauthorized"` — no session / session has no email.
**Response 400:** body `"Invalid JSON"` (malformed body) or `"Invalid folder"` (Zod miss).

**TTL semantics:** Cloudinary rejects uploads whose timestamp drifts > 1 hour from server time. The effective usable window is ~15 minutes because the browser uploader must post the form shortly after receiving the credentials — any longer and clock skew / network delay risks crossing the 1h server cutoff. Never return apiSecret in the response (T-SEC-ENV) — it's server-only and would let any response reader forge their own signatures.

## Task 06.3 status — DEFERRED

The human magic-link round-trip checkpoint has not yet run. This requires either (a) plan 07's `instrumentation.ts` to auto-invoke `bootstrapAdmin()` at dev-server boot, or (b) a one-time manual `bootstrapAdmin()` call. Both options will be picked up when plan 01-07 executes. Until then, the acceptance criterion is observable but unverified — carrying to deferred-items.md.

## Deferred / followups

- **DEF-03**: Task 06.3 human checkpoint (magic-link round-trip manual verification) — awaits plan 01-07 bootstrap instrumentation OR a one-time manual run + sessions-table psql observation.
- Playwright automation of the magic-link round-trip — needs email-intercept infra (MailHog / Mailtrap / Resend webhook capture). Phase 2 or later. Scaffold committed with this plan behind `RUN_MAGIC_LINK_TEST=1`.

## Verification outcomes

```
pnpm typecheck                  0 errors
pnpm build                      0 errors, 7.0s compile, 7.3s TS, 11 static + 3 dynamic routes
pnpm vitest run                 42/42 passing (+9 from plan 05's 33)
pnpm playwright test --list     10 admin-gate tests + 1 magic-link test discovered
```

Plan 04's `tests/e2e/locale-redirect.spec.ts` (six tests that were red because no middleware existed) is now expected to pass against a running dev server; full e2e pass requires `pnpm dev` + `pnpm playwright test` which is a manual gate not run in this executor session.

## Next

Plan 01-07 — Sentry + instrumentation.ts bootstrap hook. Will auto-run `bootstrapAdmin()` at dev/production boot, which unblocks Task 06.3 manual verification.
