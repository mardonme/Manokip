---
phase: 02-admin-panel
plan: 08
type: execute
wave: 2
depends_on: [02]
files_modified:
  - src/app/[locale]/login/page.tsx
  - src/app/[locale]/login/login-form.tsx
  - src/app/[locale]/login/actions.ts
  - src/lib/auth.config.ts
  - messages/uz.json
  - messages/ru.json
  - messages/en.json
autonomous: true
requirements: [ADMIN-01]
must_haves:
  truths:
    - "Login page is a client component using useActionState; form submission returns { ok: true } | { ok: false; error }"
    - "Successful submission shows a 'Check your email' confirmation state (no longer a void return)"
    - "Failed signIn with AccessDenied error renders an error banner ('You do not have admin access')"
    - "Magic-link harvesting (Pitfall in RESEARCH §Security): unknown email + active=false admin do NOT receive email — checked in sendVerificationRequest before Resend send"
    - "Phase-1 DEF (login-action returning void) is closed: discriminated return shape ships"
  artifacts:
    - path: "src/app/[locale]/login/page.tsx"
      provides: "Login page hosting LoginForm client component"
      contains: "LoginForm"
    - path: "src/app/[locale]/login/login-form.tsx"
      provides: "useActionState client form with check-email + error states"
      contains: "useActionState"
    - path: "src/app/[locale]/login/actions.ts"
      provides: "requestMagicLink Server Action with discriminated return"
      contains: "{ ok: true } | { ok: false"
    - path: "src/lib/auth.config.ts"
      provides: "sendVerificationRequest checks admin_user existence + active before sending email"
      contains: "active = true"
  key_links:
    - from: "src/app/[locale]/login/login-form.tsx"
      to: "src/app/[locale]/login/actions.ts (requestMagicLink)"
      via: "useActionState(requestMagicLink, null)"
      pattern: "useActionState\\(requestMagicLink"
---

<objective>
Polish Phase-1's minimal `/[locale]/login` page (the Phase-1 DEF noted): convert to a client component using `useActionState` so the discriminated `{ ok } | { error }` return surfaces a "Check your email" confirmation OR an "Access denied" error banner. Also closes the magic-link email-harvesting issue noted in 02-RESEARCH.md §Security: `sendVerificationRequest` consults admin_user table BEFORE issuing the Resend send (so unknown/inactive emails don't receive an email at all).

Purpose: ADMIN-01 finishing touches; Phase-1 DEF closure; Pitfall §Magic-link harvesting addressed.
Output: 4 modified files + i18n strings.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@CLAUDE.md
@src/app/[locale]/login/page.tsx
@src/app/[locale]/login/actions.ts
@src/lib/auth.config.ts
@src/lib/auth.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 8.1: Rewrite login page + actions with useActionState + error states</name>
  <files>src/app/[locale]/login/page.tsx, src/app/[locale]/login/login-form.tsx, src/app/[locale]/login/actions.ts, messages/uz.json, messages/ru.json, messages/en.json</files>
  <read_first>
    - src/app/[locale]/login/page.tsx (current Phase-1 implementation — server component with form action)
    - src/app/[locale]/login/actions.ts (current Phase-1 — returns void; needs replacement with discriminated return per .planning/STATE.md decision log entry "Phase 2 will reintroduce discriminated result via useActionState on a client component")
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/app/[locale]/login/page.tsx + actions.ts (modify — Phase 2 polish)` — verbatim shape
    - src/lib/auth.config.ts (Phase-1 sendVerificationRequest)
    - messages/uz.json, ru.json, en.json (i18n keys to add under `login` namespace)
  </read_first>
  <behavior>
    - Test 1: Submitting a valid email returns `{ ok: true }`; the page shows the "Check your email" confirmation banner.
    - Test 2: Submitting an unknown email — `requestMagicLink` returns `{ ok: true }` (anti-enumeration: same UI), but `sendVerificationRequest` short-circuits and does not call Resend.
    - Test 3: Submitting an email belonging to `admin_user.active=false` — same anti-enumeration `{ ok: true }`; no Resend call.
    - Test 4: Invalid email format — `{ ok: false, error: 'invalid_email' }`; the page shows the error banner.
  </behavior>
  <action>
    Rewrite `src/app/[locale]/login/actions.ts` to use the discriminated return:
    ```typescript
    "use server";
    import { z } from "zod";
    import { signIn } from "@/lib/auth";

    const schema = z.object({
      email: z.string().email(),
      locale: z.enum(["uz", "ru", "en"]).default("uz"),
    });

    export async function requestMagicLink(
      _prev: { ok: boolean; error?: string } | null,
      formData: FormData,
    ): Promise<{ ok: true } | { ok: false; error: string }> {
      const parsed = schema.safeParse({
        email: formData.get("email"),
        locale: formData.get("locale"),
      });
      if (!parsed.success) return { ok: false, error: "invalid_email" };
      try {
        await signIn("resend", {
          email: parsed.data.email,
          redirect: false,
          redirectTo: `/${parsed.data.locale}/admin`,
        });
        return { ok: true };
      } catch (err) {
        if (err instanceof Error && err.message.toLowerCase().includes("accessdenied")) {
          // Anti-enumeration: surface generic ok to the UI; logging happens server-side
          return { ok: true };
        }
        return { ok: false, error: "unknown" };
      }
    }
    ```

    Create `src/app/[locale]/login/login-form.tsx` (client component):
    ```tsx
    "use client";
    import { useActionState } from "react";
    import { requestMagicLink } from "./actions";

    type Labels = {
      email: string; submit: string;
      success: string; invalidEmail: string; unknown: string;
    };

    export function LoginForm({ locale, labels }: { locale: string; labels: Labels }) {
      const [state, formAction, pending] = useActionState(requestMagicLink, null);

      if (state?.ok) {
        return (
          <div data-testid="login-success" className="rounded-md bg-green-50 p-4 text-green-900">
            {labels.success}
          </div>
        );
      }

      return (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input
            type="email"
            name="email"
            required
            placeholder={labels.email}
            data-testid="login-email"
            className="w-full border rounded px-3 py-2"
          />
          {state && !state.ok && (
            <div data-testid="login-error" className="rounded-md bg-red-50 p-3 text-red-900">
              {state.error === "invalid_email" ? labels.invalidEmail : labels.unknown}
            </div>
          )}
          <button type="submit" disabled={pending} className="w-full bg-slate-900 text-white rounded px-3 py-2 disabled:opacity-50">
            {labels.submit}
          </button>
        </form>
      );
    }
    ```

    Rewrite `src/app/[locale]/login/page.tsx` (server component) to host the form:
    ```typescript
    import { setRequestLocale, getTranslations } from "next-intl/server";
    import { LoginForm } from "./login-form";

    export default async function LoginPage({
      params,
    }: { params: Promise<{ locale: string }> }) {
      const { locale } = await params;
      setRequestLocale(locale);
      const t = await getTranslations({ locale, namespace: "login" });
      const labels = {
        email: t("email"),
        submit: t("submit"),
        success: t("success"),
        invalidEmail: t("invalidEmail"),
        unknown: t("unknown"),
      };
      return (
        <div className="max-w-md mx-auto py-12">
          <h1 className="text-2xl font-semibold mb-6">{t("title")}</h1>
          <LoginForm locale={locale} labels={labels} />
        </div>
      );
    }
    ```

    Add to all 3 messages files under `login`:
    ```json
    "login": {
      "title": "Admin login",
      "email": "Your email",
      "submit": "Send magic link",
      "success": "Check your email — we've sent you a magic link.",
      "invalidEmail": "Please enter a valid email address.",
      "unknown": "Something went wrong. Please try again."
    }
    ```
    Use proper translations per locale.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'useActionState' src/app/[locale]/login/login-form.tsx` returns `1`
    - `grep -c '{ ok: true } | { ok: false' src/app/[locale]/login/actions.ts` returns `>=1`
    - `grep -c 'data-testid="login-success"' src/app/[locale]/login/login-form.tsx` returns `1`
    - `grep -c 'data-testid="login-error"' src/app/[locale]/login/login-form.tsx` returns `1`
    - `pnpm build` exits 0
    - **I12:** `grep -rn "requestMagicLink(" src/ tests/ --exclude-dir=node_modules` matches only `LoginForm.tsx`'s `useActionState` site (single call site; no stragglers from the Phase-1 void-returning version)
  </acceptance_criteria>
  <done>Login page + form support discriminated return; check-email and error banners render based on state; single call site for requestMagicLink (I12).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 8.2: Harden sendVerificationRequest against email harvesting</name>
  <files>src/lib/auth.config.ts</files>
  <read_first>
    - src/lib/auth.config.ts (Phase-1 sendVerificationRequest dynamic-import body — Edge-split file; only `next-auth/providers/resend` imports allowed at top level)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Security Domain — "Magic-link email harvesting" mitigation: short-circuit before Resend send when admin not present/inactive
    - src/db/schema/admin.ts (adminUsers table, `active` column)
  </read_first>
  <behavior>
    - sendVerificationRequest receives `{ identifier (email), url, provider }`. Before sending: dynamic-import dbTx + select adminUsers WHERE email = identifier AND active = true. If 0 rows, return early (no Resend send). If ≥1 row, proceed with the existing Resend send.
    - Successful path unchanged from Phase 1.
  </behavior>
  <action>
    Inside `src/lib/auth.config.ts`'s `sendVerificationRequest` body, before the existing dynamic Resend import + send block, add:
    ```typescript
    sendVerificationRequest: async ({ identifier, url }) => {
      // Email harvesting protection (RESEARCH §Security): only send to active admins.
      const { dbTx } = await import("@/db/client-ws");
      const { adminUsers } = await import("@/db/schema");
      const { eq, and } = await import("drizzle-orm");
      const rows = await dbTx
        .select({ email: adminUsers.email })
        .from(adminUsers)
        .where(and(eq(adminUsers.email, identifier), eq(adminUsers.active, true)))
        .limit(1);
      if (rows.length === 0) {
        // Silent: do not signal to the caller whether the email is unknown or inactive.
        return;
      }

      // Existing Resend send path (unchanged from Phase 1)
      const { Resend } = await import("resend");
      // ... existing render() + resend.emails.send(...) ...
    }
    ```
    Preserve the rest of the existing function body verbatim.

    Edge constraint: `auth.config.ts` is the edge-split file. Dynamic imports of `@/db/client-ws` are acceptable here ONLY because `sendVerificationRequest` runs on the Node Auth.js callback, not on the Edge middleware. Verify by checking that this file is consumed by `src/lib/auth.ts` (Node) and not by `proxy.ts`.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'eq(adminUsers.active, true)' src/lib/auth.config.ts` returns `1`
    - `grep -c "if (rows.length === 0)" src/lib/auth.config.ts` returns `1`
    - `pnpm tsc --noEmit` exits 0
    - `pnpm build` exits 0 (Edge bundle still compiles)
  </acceptance_criteria>
  <done>Magic-link harvesting mitigated: unknown/inactive emails never trigger a Resend send.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| login form → requestMagicLink Server Action | untrusted email input |
| Auth.js → sendVerificationRequest | identifier email controllable by attacker |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-08-01 | Information Disclosure | magic-link email harvesting (RESEARCH §Security) | mitigate | sendVerificationRequest short-circuits before Resend if `admin_user.active=true` row absent for the identifier |
| T-02-08-02 | Information Disclosure | login response distinguishes known vs unknown emails | mitigate | Both successful-send and silent-skip return `{ ok: true }` to the client (anti-enumeration) |
| T-02-08-03 | Tampering | mass assignment via formData | mitigate | Zod schema parses `{ email, locale }` only; ignore extra fields |
| T-02-08-04 | EoP | injecting redirectTo to off-site URL | mitigate | redirectTo built server-side as `/${locale}/admin` — locale enum-validated |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm build` exits 0
</verification>

<success_criteria>
1. Login form uses useActionState; success and error banners render distinctly.
2. requestMagicLink returns `{ ok: true } | { ok: false; error: string }`.
3. sendVerificationRequest skips Resend send for unknown/inactive emails.
4. i18n keys present in all 3 locale files.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-08-SUMMARY.md` documenting: final action discriminated-return shape, harvesting mitigation approach, deferred items.
</output>
