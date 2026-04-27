---
phase: 02-admin-panel
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/[locale]/admin/layout.tsx
  - src/app/[locale]/admin/page.tsx
  - src/components/admin/sidebar.tsx
  - src/components/admin/top-bar.tsx
  - src/components/ui/* (~20 shadcn primitives, scaffolded via 'pnpm dlx shadcn@latest add ...')
  - components.json
  - lib/utils.ts
  - package.json
  - messages/uz.json
  - messages/ru.json
  - messages/en.json
autonomous: true
requirements: [ADMIN-01]
must_haves:
  truths:
    - "Visiting /[locale]/admin shows a real layout (sidebar + top bar) — not the Phase-1 'coming soon' stub"
    - "Sidebar exposes nav links to Products, Categories, Manufacturers, Spec Fields, Submissions, Audit Log, Admins"
    - "Top bar displays the current admin's email + a sign-out button"
    - "NuqsAdapter wraps the admin layout (Pitfall #10 mitigated)"
    - "Phase-2 dependencies installed: @tanstack/react-table, nuqs, @dnd-kit/{core,sortable,utilities}"
    - "shadcn/ui components installed under src/components/ui/* (button, input, label, textarea, select, table, dialog, alert-dialog, dropdown-menu, form, tabs, card, badge, sheet, tooltip, switch, checkbox, separator, sonner)"
  artifacts:
    - path: "src/app/[locale]/admin/layout.tsx"
      provides: "Admin shell with sidebar + top bar + NuqsAdapter + requireAdmin gate"
      contains: "import { NuqsAdapter } from \"nuqs/adapters/next/app\""
    - path: "src/components/admin/sidebar.tsx"
      provides: "Section list as Next-Link buttons"
      contains: "/admin/products"
    - path: "src/components/admin/top-bar.tsx"
      provides: "Admin email display + sign-out form action"
      contains: "signOut"
    - path: "components.json"
      provides: "shadcn/ui config"
      contains: "\"style\": "
  key_links:
    - from: "src/app/[locale]/admin/layout.tsx"
      to: "src/lib/auth.ts (requireAdmin)"
      via: "await requireAdmin() at the top of the RSC layout"
      pattern: "await requireAdmin\\(\\)"
    - from: "src/app/[locale]/admin/layout.tsx"
      to: "nuqs/adapters/next/app"
      via: "NuqsAdapter wrapping children"
      pattern: "<NuqsAdapter>"
---

<objective>
Replace the Phase-1 admin "coming soon" stub with a real desktop-first admin shell: sidebar nav, top bar with admin email + sign-out, and the `<NuqsAdapter>` provider that every downstream DataTable depends on. Also install the Phase-2 dependency set (TanStack Table, nuqs, dnd-kit) and run `shadcn@latest init` + `add` for the 19 components every later plan composes from.

Purpose: Every Wave-2/3/4 page renders inside this shell; nuqs URL state requires the adapter at this level; shadcn primitives must exist before DataTable / Form / Dialog components compile.
Output: New layout + sidebar + top bar components, shadcn UI primitives in `src/components/ui/`, package.json updated with new deps, i18n strings for sidebar labels.
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
@src/app/[locale]/admin/page.tsx
@src/app/[locale]/layout.tsx
@src/lib/auth.ts
@messages/uz.json
@messages/en.json
@package.json

<interfaces>
From src/lib/auth.ts (Phase 1):
```typescript
export async function requireAdmin(): Promise<Session>; // throws on no session / inactive admin
export const { auth, signIn, signOut, handlers } = NextAuth(/* ... */);
// session.user.email is the admin's email; session.sessionToken is non-public.
```

From src/app/[locale]/layout.tsx:
```typescript
// Already wraps with NextIntlClientProvider; calls setRequestLocale(locale).
// Admin layout MUST also call setRequestLocale; admin route is under same /[locale]/.
```

NuqsAdapter import path (Next 16):
```typescript
import { NuqsAdapter } from "nuqs/adapters/next/app";
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 2.1: Install Phase-2 deps + shadcn/ui init + add 19 components</name>
  <files>package.json, components.json, lib/utils.ts, src/components/ui/*.tsx</files>
  <read_first>
    - package.json (current Phase-1 deps; pinned versions matter — RHF 7.73.1 + @hookform/resolvers 3.10.0 must NOT be upgraded; sonner 1.7.4 must NOT be upgraded — confirmed in 02-RESEARCH.md §Standard Stack)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Phase 2 Additions and §Installation (one-shot, Wave 1) — exact pnpm commands to run
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pitfall 10 (nuqs adapter requirement)
  </read_first>
  <action>
    Run, in order:
    1. `pnpm add @tanstack/react-table@8.21.3 nuqs@2.8.9 @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2`
       - Pin exact versions (no `^`) to match RESEARCH.md §Standard Stack. Use `pnpm add -E` (`--save-exact`) or post-install edit `package.json` to remove caret.
       - Do NOT upgrade `react-hook-form`, `@hookform/resolvers`, `sonner`, or `next-cloudinary` — they remain at Phase-1 pins (7.73.1 / 3.10.0 / 1.7.4 / 6.17.5).
    2. `pnpm dlx shadcn@latest init` — non-interactive options: style="default", baseColor="slate", cssVariables=true. Writes `components.json` and `lib/utils.ts` (the `cn` helper). Confirm `tailwind.config` is preserved (Phase-1 pinned tailwind v4.2.3).
       - If the CLI prompts on TTY, accept defaults; if running in CI, set `CI=true` and use `--yes` flags as needed.
    3. `pnpm dlx shadcn@latest add button input label textarea select table dialog alert-dialog dropdown-menu form tabs card badge sheet tooltip switch checkbox separator sonner` — generates files under `src/components/ui/<name>.tsx`.

    After install, `package.json` `dependencies` MUST contain:
    - `@tanstack/react-table`: `8.21.3`
    - `nuqs`: `2.8.9`
    - `@dnd-kit/core`: `6.3.1`
    - `@dnd-kit/sortable`: `10.0.0`
    - `@dnd-kit/utilities`: `3.2.2`
    - existing `react-hook-form`, `@hookform/resolvers`, `sonner` versions UNCHANGED.

    Run `pnpm install` once more to lock the lockfile. Commit lockfile + package.json + components.json + lib/utils.ts + src/components/ui/*.tsx as a single change.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit && node -e "const p=require('./package.json'); const need={'@tanstack/react-table':'8.21.3','nuqs':'2.8.9','@dnd-kit/core':'6.3.1','@dnd-kit/sortable':'10.0.0','@dnd-kit/utilities':'3.2.2'}; for(const k in need){ if(p.dependencies[k]!==need[k]){ console.error('mismatch',k,p.dependencies[k]); process.exit(1);} } console.log('ok');"</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` has the 5 new deps at exact pinned versions listed above
    - `components.json` exists at repo root
    - `lib/utils.ts` exists and exports `cn`
    - 19 files exist under `src/components/ui/`: button.tsx, input.tsx, label.tsx, textarea.tsx, select.tsx, table.tsx, dialog.tsx, alert-dialog.tsx, dropdown-menu.tsx, form.tsx, tabs.tsx, card.tsx, badge.tsx, sheet.tsx, tooltip.tsx, switch.tsx, checkbox.tsx, separator.tsx, sonner.tsx (`grep -l 'export' src/components/ui/*.tsx | wc -l` >= 19)
    - `pnpm tsc --noEmit` exits 0
    - `pnpm test` exits 0 (no regression in Phase-1 baseline)
  </acceptance_criteria>
  <done>Dependencies and shadcn primitives are in place; typecheck + Phase-1 tests still pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2.2: Build admin shell layout + sidebar + top bar + i18n strings</name>
  <files>src/app/[locale]/admin/layout.tsx, src/app/[locale]/admin/page.tsx, src/components/admin/sidebar.tsx, src/components/admin/top-bar.tsx, messages/uz.json, messages/ru.json, messages/en.json</files>
  <read_first>
    - src/app/[locale]/admin/page.tsx (current Phase-1 stub — replace shape)
    - src/app/[locale]/layout.tsx (canonical RSC layout shape: `params` Promise, `setRequestLocale`, NextIntlClientProvider — admin layout follows the same opening 4 lines)
    - src/lib/auth.ts (export shape of `requireAdmin`, `signOut`)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/app/[locale]/admin/layout.tsx (NEW)` — verbatim layout shape
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pitfall 10 (NuqsAdapter wrapping)
    - messages/uz.json (current i18n keys; admin namespace must be added)
  </read_first>
  <behavior>
    - Test 1: `GET /uz/admin` returns 200 (after auth) and HTML contains `data-testid="admin-sidebar"` and `data-testid="admin-topbar"` and `data-testid="admin-email"` matching the logged-in admin email.
    - Test 2: `GET /uz/admin` HTML contains hrefs `/uz/admin/products`, `/uz/admin/categories`, `/uz/admin/manufacturers`, `/uz/admin/spec-fields`, `/uz/admin/submissions`, `/uz/admin/audit`, `/uz/admin/admins`.
    - Test 3: Top bar contains a sign-out form whose action POSTs to a Server Action that calls `signOut()` and redirects to `/uz/login`.
    - Test 4: Layout wraps children in `<NuqsAdapter>`; rendering a downstream nuqs hook produces no "nuqs requires an adapter" error.
  </behavior>
  <action>
    Create `src/app/[locale]/admin/layout.tsx` (per PATTERNS §admin layout):
    ```typescript
    import { setRequestLocale, getTranslations } from "next-intl/server";
    import { NuqsAdapter } from "nuqs/adapters/next/app";
    import { requireAdmin } from "@/lib/auth";
    import { AdminSidebar } from "@/components/admin/sidebar";
    import { AdminTopBar } from "@/components/admin/top-bar";

    type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

    export default async function AdminLayout({ children, params }: Props) {
      const { locale } = await params;
      setRequestLocale(locale);
      const session = await requireAdmin();
      const t = await getTranslations({ locale, namespace: "admin" });
      const labels = {
        dashboard: t("nav.dashboard"),
        products: t("nav.products"),
        categories: t("nav.categories"),
        manufacturers: t("nav.manufacturers"),
        specFields: t("nav.specFields"),
        submissions: t("nav.submissions"),
        audit: t("nav.audit"),
        admins: t("nav.admins"),
        signOut: t("topbar.signOut"),
      };
      return (
        <NuqsAdapter>
          <div className="flex min-h-screen">
            <AdminSidebar locale={locale} labels={labels} data-testid="admin-sidebar" />
            <div className="flex-1 flex flex-col">
              <AdminTopBar email={session.user!.email!} signOutLabel={labels.signOut} locale={locale} data-testid="admin-topbar" />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </NuqsAdapter>
      );
    }
    ```

    Create `src/components/admin/sidebar.tsx` (server component; uses next-intl Link):
    ```typescript
    import { Link } from "@/i18n/routing";

    type Labels = {
      dashboard: string; products: string; categories: string; manufacturers: string;
      specFields: string; submissions: string; audit: string; admins: string; signOut: string;
    };

    export function AdminSidebar({ locale, labels }: { locale: string; labels: Labels }) {
      const items = [
        { href: "/admin", label: labels.dashboard },
        { href: "/admin/products", label: labels.products },
        { href: "/admin/categories", label: labels.categories },
        { href: "/admin/manufacturers", label: labels.manufacturers },
        { href: "/admin/spec-fields", label: labels.specFields },
        { href: "/admin/submissions", label: labels.submissions },
        { href: "/admin/audit", label: labels.audit },
        { href: "/admin/admins", label: labels.admins },
      ];
      return (
        <aside className="w-64 border-r bg-muted/40 p-4" data-testid="admin-sidebar">
          <nav className="flex flex-col gap-1">
            {items.map((it) => (
              <Link key={it.href} href={it.href} className="px-3 py-2 rounded hover:bg-accent">
                {it.label}
              </Link>
            ))}
          </nav>
        </aside>
      );
    }
    ```

    Create `src/components/admin/top-bar.tsx`:
    ```typescript
    import { signOut } from "@/lib/auth";

    async function signOutAction(formData: FormData): Promise<void> {
      "use server";
      const locale = (formData.get("locale") as string) || "uz";
      await signOut({ redirect: true, redirectTo: `/${locale}/login` });
    }

    export function AdminTopBar({ email, signOutLabel, locale }: { email: string; signOutLabel: string; locale: string }) {
      return (
        <header className="flex items-center justify-between border-b px-6 py-3" data-testid="admin-topbar">
          <span data-testid="admin-email" className="text-sm text-muted-foreground">{email}</span>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="text-sm underline">{signOutLabel}</button>
          </form>
        </header>
      );
    }
    ```

    Replace `src/app/[locale]/admin/page.tsx` with a minimal dashboard placeholder:
    ```typescript
    import { setRequestLocale, getTranslations } from "next-intl/server";
    import { requireAdmin } from "@/lib/auth";

    export default async function AdminDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
      const { locale } = await params;
      setRequestLocale(locale);
      await requireAdmin();
      const t = await getTranslations({ locale, namespace: "admin" });
      return (
        <div>
          <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("dashboard.placeholder")}</p>
        </div>
      );
    }
    ```

    Add to `messages/uz.json`, `messages/ru.json`, `messages/en.json` (under `admin` namespace; create the namespace if absent):
    ```json
    "admin": {
      "nav": {
        "dashboard": "Dashboard / Panel / Bosh sahifa (per locale)",
        "products": "Products / Товары / Mahsulotlar",
        "categories": "Categories / Категории / Kategoriyalar",
        "manufacturers": "Manufacturers / Производители / Ishlab chiqaruvchilar",
        "specFields": "Spec Fields / Спецификации / Spetsifikatsiyalar",
        "submissions": "Submissions / Заявки / Murojaatlar",
        "audit": "Audit Log / Журнал действий / Audit log",
        "admins": "Admins / Администраторы / Adminlar"
      },
      "topbar": { "signOut": "Sign out / Выйти / Chiqish" },
      "dashboard": { "title": "Admin / Админ / Admin", "placeholder": "Phase 2 dashboard placeholder" }
    }
    ```
    Use the correct per-locale strings in each file (the JSON above shows three slashes-separated values; choose the appropriate one per locale file).

    Do NOT introduce a sign-out API route — use the inline Server Action `signOutAction` defined in `top-bar.tsx`.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm playwright test tests/e2e/admin-shell.spec.ts --reporter=list</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'NuqsAdapter' src/app/[locale]/admin/layout.tsx` returns `>=1`
    - `grep -c 'await requireAdmin()' src/app/[locale]/admin/layout.tsx` returns `1`
    - `grep -c '/admin/products' src/components/admin/sidebar.tsx` returns `1`
    - `grep -c 'signOut' src/components/admin/top-bar.tsx` returns `>=1`
    - `grep -c '"admin"' messages/uz.json` returns `>=1` and similarly for ru.json + en.json
    - `pnpm tsc --noEmit` exits 0
    - A new e2e test `tests/e2e/admin-shell.spec.ts` (created in this task) signs in via the shared admin-session fixture (Wave 1 fixture from plan 02-04) OR mocks `requireAdmin` and asserts the sidebar + top bar HTML markers; if the fixture is not yet present, the test MUST be authored with a `MISSING — Wave 0 must create tests/_fixtures/admin-session.ts (plan 02-04)` automated stub that returns "skipped" until fixture exists.
  </acceptance_criteria>
  <done>Admin shell renders with sidebar, top bar (email + sign-out), NuqsAdapter wraps children, i18n strings defined for all 3 locales, e2e shell smoke test exists.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → /[locale]/admin | unauth/inactive admin reaches admin layout; mitigation = `requireAdmin()` at the top of the RSC layout |
| sign-out form → server action | CSRF on Server Actions |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-02-01 | Spoofing | admin layout | mitigate | `await requireAdmin()` at the top of the RSC; throws + redirects on no session/inactive |
| T-02-02-02 | Tampering | sign-out Server Action | mitigate | Next.js 14+ Server Actions have built-in origin checks (POST + Origin header validated) [VERIFIED in 02-RESEARCH.md §Security] |
| T-02-02-03 | Information Disclosure | admin email rendered in top bar | accept | session.user.email is intentionally surfaced to the admin themselves; no secret in markup |
| T-02-02-04 | EoP | nuqs adapter missing | mitigate | NuqsAdapter wraps children at admin layout (Pitfall #10); downstream pages cannot bypass |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm test` (Vitest) exits 0
- `pnpm playwright test tests/e2e/admin-shell.spec.ts` exits 0 (or `skipped` if fixture pending)
</verification>

<success_criteria>
1. `/[locale]/admin` renders the new shell (sidebar + top bar + NuqsAdapter) — Phase-1 stub replaced.
2. Sidebar exposes 8 nav links to all admin sections.
3. Top bar shows the admin email and a working sign-out form.
4. shadcn/ui primitives + new deps installed at exact pinned versions.
5. i18n keys present in all 3 locale files for `admin.nav.*`, `admin.topbar.*`, `admin.dashboard.*`.
</success_criteria>

<output>
After completion, create `.planning/phases/02-admin-panel/02-02-SUMMARY.md` documenting:
- Final dependency list and pinned versions
- shadcn components installed
- NuqsAdapter wiring location
- Any deviations.
</output>
