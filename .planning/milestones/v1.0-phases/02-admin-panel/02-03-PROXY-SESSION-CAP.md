---
phase: 02-admin-panel
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - proxy.ts
  - tests/e2e/admin-session-cap.spec.ts
autonomous: true
requirements: [ADMIN-01]
must_haves:
  truths:
    - "An admin request to /[locale]/admin/* with sessionToken whose sessions.absolute_expires < now() is 307-redirected to /[locale]/login and gets clear-cookie headers"
    - "An admin request whose sessions.expires < now() is 307-redirected to /[locale]/login (24h idle cap)"
    - "An admin request with valid expires AND valid absolute_expires reaches RSC normally"
    - "Edge runtime continues to work (Neon HTTP driver only; no @/db/client import)"
  artifacts:
    - path: "proxy.ts"
      provides: "D-15 idle + absolute session cap on /[locale]/admin/*"
      contains: "absolute_expires"
  key_links:
    - from: "proxy.ts"
      to: "Neon HTTP driver"
      via: "neon(process.env.DATABASE_URL!)"
      pattern: "import \\{ neon \\} from \"@neondatabase/serverless\""
    - from: "proxy.ts"
      to: "sessions.absolute_expires column (Phase-1 schema, populated by src/lib/auth.ts session callback)"
      via: "SELECT expires, absolute_expires FROM sessions"
      pattern: "FROM sessions"
---

<objective>
Extend Phase-1's `proxy.ts` admin gate from "cookie present" to "cookie present AND backing sessions row valid" — enforce D-15's dual cap (24h idle via Auth.js `expires`; 7d absolute via Phase-1's `sessions.absoluteExpires`). Edge-safe: uses Neon HTTP driver (`neon(...)`) — never imports `@/db/client` or `@/env`.

Purpose: Server-enforced session validity (CONTEXT D-15 honored — D-15 step 3 amended 2026-04-27 to confirm `sessions.absoluteExpires` is the canonical column for the 7d cap; mathematically equivalent to the original `created_at + 7d` formulation, so no longer flagged as a deviation). Without this, a stolen cookie with a still-live Auth.js cookie expiry but past its absolute 7d window would still grant admin access.
Output: Modified `proxy.ts` + Playwright e2e spec asserting redirect on expired absolute_expires.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@CLAUDE.md
@proxy.ts
@src/db/schema/auth.ts
@src/lib/auth.ts
@src/lib/auth.config.ts
@tests/e2e/admin-gate.spec.ts

<interfaces>
From src/db/schema/auth.ts (Phase 1):
```typescript
// sessions.sessionToken (text, PK), sessions.userId, sessions.expires (timestamptz),
// sessions.absoluteExpires (timestamptz, populated lazily by session() callback in src/lib/auth.ts)
```

From src/lib/auth.ts:81-98 (Phase 1 session callback already populates absoluteExpires):
```typescript
session: async ({ session, user }) => {
  // ensures sessions.absolute_expires is set on first session read after sign-in
  // → 7d from createdAt baseline
}
```

Edge constraint:
- `@/db/client` imports `@/env` which imports zod — Node-only path. Edge can't import these.
- `@neondatabase/serverless` `neon()` (HTTP) IS Edge-safe (uses fetch).

Cookie names:
- Production: `__Secure-authjs.session-token`
- Dev: `authjs.session-token`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 3.1: Extend proxy.ts with D-15 absolute-cap check</name>
  <files>proxy.ts</files>
  <read_first>
    - proxy.ts (current Phase-1 admin gate at lines 33-42 — the `if (isAdminPath)` branch is what gets extended)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`proxy.ts (modify — D-15 Edge session cap)` — verbatim insertion shape
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 2 lines 392-450 + critical note that absoluteExpires is the column to read (NOT created_at)
    - src/db/schema/auth.ts (confirm sessions table column names: `session_token`, `expires`, `absolute_expires`)
    - src/lib/auth.config.ts (Edge constraint comment block 5-21 — same pattern applies here)
  </read_first>
  <behavior>
    - Test 1: With a sessions row where `absolute_expires` is `now() - 1 minute`, request to `/uz/admin/products` → 307 to `/uz/login`, response Set-Cookie clears both `__Secure-authjs.session-token` and `authjs.session-token` (Max-Age=0).
    - Test 2: With a sessions row where `expires` is `now() - 1 minute` (idle expiry), request → 307 to `/uz/login`.
    - Test 3: With a sessions row where both `expires` and `absolute_expires` are in the future, request to `/uz/admin/products` → passes through (proxy returns the i18n-routed response, no redirect).
    - Test 4: Request to `/uz/products` (non-admin path) → no SQL query is made (no sessions read).
  </behavior>
  <action>
    Modify `proxy.ts` to insert the D-15 check inside the existing `if (isAdminPath)` branch, after the `if (!req.auth)` redirect.

    Required imports (add to top of `proxy.ts`):
    ```typescript
    import { neon } from "@neondatabase/serverless";
    ```
    Do NOT import `@/db/client` (Node-only) or `@/env` (Node-only). Use `process.env.DATABASE_URL!` directly — Auth.js already runs on the same env.

    Inside the `auth()` middleware function, after the existing `if (!req.auth) { return Response.redirect(...) }` line, insert:
    ```typescript
    const sessionToken = req.cookies.get(
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token"
    )?.value;

    if (sessionToken) {
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`
        SELECT expires, absolute_expires
          FROM sessions
         WHERE session_token = ${sessionToken}
         LIMIT 1
      ` as Array<{ expires: string; absolute_expires: string | null }>;
      const row = rows[0];
      const now = Date.now();
      const expiresOk = row && new Date(row.expires).getTime() > now;
      const absOk = row?.absolute_expires
        ? new Date(row.absolute_expires).getTime() > now
        : true; // null absolute_expires = grandfathered Phase-1 sessions; treat as ok
      if (!row || !expiresOk || !absOk) {
        const locale = pathname.split("/")[1] || "uz";
        const res = Response.redirect(new URL(`/${locale}/login`, req.url), 307);
        res.headers.append("Set-Cookie", "__Secure-authjs.session-token=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax");
        res.headers.append("Set-Cookie", "authjs.session-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
        return res;
      }
    }
    ```

    The check ONLY runs if `isAdminPath === true` AND `req.auth` is truthy AND `sessionToken` is present. If `req.auth` returned truthy but cookie is somehow absent (cookie-stripping proxy), defer to Auth.js's own behavior (no extra check; the rendered RSC's `requireAdmin` will catch it).

    Do NOT touch the matcher / `config.matcher` line.
    Do NOT remove or modify the existing locale rewrite call (`handleI18nRouting(req)`) at the function's tail.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm vitest run tests/lib/require-admin.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'absolute_expires' proxy.ts` returns `>=2` (one in the SQL, one in the JS check)
    - `grep -c 'import { neon } from "@neondatabase/serverless"' proxy.ts` returns `1`
    - `grep -c '@/db/client' proxy.ts` returns `0` (Edge constraint preserved)
    - `grep -c '@/env' proxy.ts` returns `0`
    - `grep -c 'Max-Age=0' proxy.ts` returns `>=2`
    - `pnpm tsc --noEmit` exits 0
    - `pnpm build` exits 0 (Edge runtime check)
  </acceptance_criteria>
  <done>proxy.ts performs absolute-cap check inline; Edge constraints honored; build still succeeds.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3.2: Author Playwright e2e for absolute-cap redirect (uses tests/_fixtures/admin-session.ts)</name>
  <files>tests/e2e/admin-session-cap.spec.ts</files>
  <read_first>
    - tests/e2e/admin-gate.spec.ts (Phase-1 e2e admin-gate spec — closest analog for HTTP probe shape with manual cookie injection)
    - tests/e2e/magic-link-login.spec.ts (login-via-cookie shape)
    - .planning/phases/02-admin-panel/02-VALIDATION.md §Wave 0 Requirements (the admin-session fixture this spec depends on lands in plan 02-04)
  </read_first>
  <behavior>
    - Test 1: Insert a sessions row with `absolute_expires = now() - interval '1 hour'`, then GET `/uz/admin/products` with that sessionToken cookie → response status is 307, Location is `/uz/login`, Set-Cookie clears the session cookie.
    - Test 2: Insert a sessions row with `absolute_expires = now() + interval '1 day'` and `expires = now() + interval '1 hour'`, GET `/uz/admin/products` → response status is NOT 307-to-/login (passes the gate; further behavior is plan 02-02's responsibility).
  </behavior>
  <action>
    Create `tests/e2e/admin-session-cap.spec.ts`. Until plan 02-04 ships `tests/_fixtures/admin-session.ts`, mark the spec as a `test.fixme` placeholder with a clear `TODO(02-04)` comment, but commit a fully-formed spec body so the migration into a passing state is just removing the `fixme`.

    Spec shape:
    ```typescript
    import { test, expect } from "@playwright/test";
    import { sql as sqlTag } from "drizzle-orm";
    // import { createExpiredAdminSession, createValidAdminSession } from "../_fixtures/admin-session";  // lands in 02-04

    const baseURL = process.env.BASE_URL || "http://localhost:3000";

    test.describe("D-15 absolute session cap (proxy.ts)", () => {
      test.fixme("expired absolute_expires → 307 to /uz/login + clear cookies", async ({ request }) => {
        // const { cookieValue } = await createExpiredAdminSession({ absoluteExpiresOffsetSec: -3600 });
        // const res = await request.get(`${baseURL}/uz/admin/products`, {
        //   headers: { cookie: `authjs.session-token=${cookieValue}` },
        //   maxRedirects: 0,
        // });
        // expect(res.status()).toBe(307);
        // expect(res.headers()["location"]).toContain("/uz/login");
        // expect(res.headers()["set-cookie"]).toMatch(/Max-Age=0/);
      });

      test.fixme("valid absolute_expires + valid expires → passes admin gate", async ({ request }) => {
        // const { cookieValue } = await createValidAdminSession();
        // const res = await request.get(`${baseURL}/uz/admin/products`, {
        //   headers: { cookie: `authjs.session-token=${cookieValue}` },
        //   maxRedirects: 0,
        // });
        // expect(res.status()).not.toBe(307);
      });
    });
    ```

    Plan 02-04 (LIB-AUDIT) ships the fixture; once it lands, the executor of plan 02-17 (REVALIDATION-E2E-GATE) will flip these `fixme` calls to `test`.

    Document the dependency in the file's leading comment so the audit leaves a paper trail.
  </action>
  <verify>
    <automated>pnpm playwright test tests/e2e/admin-session-cap.spec.ts --list</automated>
  </verify>
  <acceptance_criteria>
    - File `tests/e2e/admin-session-cap.spec.ts` exists
    - `grep -c 'D-15 absolute session cap' tests/e2e/admin-session-cap.spec.ts` returns `1`
    - `grep -c 'TODO(02-04)' tests/e2e/admin-session-cap.spec.ts` returns `>=1` (or equivalent dependency comment)
    - `pnpm playwright test tests/e2e/admin-session-cap.spec.ts --list` exits 0 and lists 2 fixme tests
  </acceptance_criteria>
  <done>e2e spec authored as fixme-stubs; ready for plan 02-04 fixture to flip them to live tests.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → Edge proxy.ts | Cookie-only auth claim; mitigation = DB-row session lookup |
| Edge → Neon HTTP | Read-only SELECT; mitigation = parameterized query (Drizzle/`neon` template literal) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-03-01 | Spoofing | stolen cookie past 7d absolute | mitigate | Read sessions.absolute_expires; reject + clear cookie if past now() (D-15) |
| T-02-03-02 | Spoofing | stolen cookie past 24h idle | mitigate | Read sessions.expires; reject + clear cookie if past now() |
| T-02-03-03 | Tampering | SQL injection via cookie value | mitigate | `neon`'s template-literal parameterizes ${sessionToken} (verified driver behavior) |
| T-02-03-04 | DoS | DB read on every admin request | accept | Single Neon HTTP read (~30ms cold) per request; admin traffic is low (≤5 admins); within Neon pool budget per Pitfall #7 |
| T-02-03-05 | Information Disclosure | session row leak via timing | accept | LIMIT 1 + parameterized; constant-time compare not required for absent-vs-expired distinction |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm build` exits 0 (Edge bundle compiles without Node imports)
- `pnpm playwright test --list` reports 2 fixme tests in admin-session-cap.spec.ts
</verification>

<success_criteria>
1. proxy.ts queries `sessions.expires` + `sessions.absolute_expires` for admin paths and rejects on expiry of either.
2. Edge constraint preserved (no `@/db/client` or `@/env` import).
3. Build still succeeds.
4. Placeholder e2e spec authored with explicit dependency comment on plan 02-04 fixture.
</success_criteria>

<output>
After completion, create `.planning/phases/02-admin-panel/02-03-SUMMARY.md` documenting:
- Verification that `sessions.absoluteExpires` was used (not a new column)
- Edge-runtime build confirmation
- The fixme placeholder for the e2e spec.
</output>
