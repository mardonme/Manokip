---
phase: 02-admin-panel
plan: 16
type: execute
wave: 4
depends_on: [04, 06]
files_modified:
  - src/app/[locale]/admin/audit/page.tsx
  - src/app/[locale]/admin/audit/audit-table.tsx
  - src/app/[locale]/admin/audit/audit-row-detail.tsx
autonomous: true
requirements: [ADMIN-11]
must_haves:
  truths:
    - "Audit log page lists audit_log rows in DataTable, server-paginated 50/page, ordered by at DESC"
    - "Filters: actor email, entity_type, action, date range — all reflected in the URL via nuqs (D-17)"
    - "Each row expandable to show before_json and after_json side-by-side"
    - "No mutation Server Actions on this page (audit log is append-only by convention)"
  artifacts:
    - path: "src/app/[locale]/admin/audit/page.tsx"
      provides: "RSC list of audit_log entries"
      contains: "DataTable"
    - path: "src/app/[locale]/admin/audit/audit-table.tsx"
      provides: "DataTable client component with filters + row expansion"
      contains: "DataTable"
  key_links:
    - from: "src/app/[locale]/admin/audit/page.tsx"
      to: "audit_log table"
      via: "db.select().from(auditLog).orderBy(desc(auditLog.at))"
      pattern: "auditLog"
---

<objective>
Land the read-only audit log viewer (D-17). Surfaces the audit_log rows produced by every other action plan. No mutations — audit log is append-only by convention.

Purpose: ADMIN-11 UI surface. Closes the "what happened?" question for the admin team. Charts deferred to Phase 5.
Output: 3 admin pages.
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
@src/db/client.ts
@src/components/admin/data-table.tsx
@src/lib/audit.ts

<interfaces>
From src/db/schema/admin.ts (Phase 1):
```typescript
// auditLog: { id (bigserial PK), at (timestamptz), actorEmail (text), action (text),
// entityType (text), entityId (text), beforeJson (jsonb), afterJson (jsonb), ip, userAgent }
```

From plan 02-04:
```typescript
import { AUDIT_ACTIONS } from "@/lib/audit"; // closed enum for filter UI
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 16.1: Audit log RSC page + table + row detail</name>
  <files>src/app/[locale]/admin/audit/page.tsx, src/app/[locale]/admin/audit/audit-table.tsx, src/app/[locale]/admin/audit/audit-row-detail.tsx</files>
  <read_first>
    - src/app/[locale]/admin/products/page.tsx (closest analog for server-paginated RSC)
    - src/components/admin/data-table.tsx (toolbar slot for filter chips)
    - src/lib/audit.ts (AUDIT_ACTIONS for the filter dropdown options)
  </read_first>
  <action>
    Create `src/app/[locale]/admin/audit/page.tsx`:
    ```typescript
    import { setRequestLocale } from "next-intl/server";
    import { sql, and, eq, gte, lte, desc, like } from "drizzle-orm";
    import { db } from "@/db/client";
    import { auditLog } from "@/db/schema";
    import { requireAdmin } from "@/lib/auth";
    import { AuditTable } from "./audit-table";

    type SP = Promise<{
      page?: string; pageSize?: string;
      actor?: string; action?: string; entityType?: string;
      from?: string; to?: string;
    }>;

    export default async function AuditPage({
      params, searchParams,
    }: { params: Promise<{ locale: string }>; searchParams: SP }) {
      const { locale } = await params;
      setRequestLocale(locale);
      await requireAdmin();
      const sp = await searchParams;
      const page = Math.max(1, Number(sp.page ?? 1));
      const size = Math.min(100, Math.max(1, Number(sp.pageSize ?? 50)));

      const conds = [];
      if (sp.actor) conds.push(like(auditLog.actorEmail, `%${sp.actor}%`));
      if (sp.action) conds.push(eq(auditLog.action, sp.action));
      if (sp.entityType) conds.push(eq(auditLog.entityType, sp.entityType));
      if (sp.from) conds.push(gte(auditLog.at, new Date(sp.from)));
      if (sp.to) conds.push(lte(auditLog.at, new Date(sp.to)));

      const where = conds.length ? and(...conds) : undefined;
      const [rows, [{ count }]] = await Promise.all([
        db.select().from(auditLog).where(where).orderBy(desc(auditLog.at)).limit(size).offset((page - 1) * size),
        db.select({ count: sql<number>`count(*)` }).from(auditLog).where(where),
      ]);

      return <AuditTable data={rows} rowCount={Number(count)} />;
    }
    ```

    Create `src/app/[locale]/admin/audit/audit-table.tsx` (client):
    - Wraps DataTable with columns: at, actorEmail, action, entityType, entityId, ip, expand button.
    - Row expansion (controlled state) renders `<AuditRowDetail before={row.beforeJson} after={row.afterJson} />` inline.
    - Toolbar slot: actor search input bound to `?actor=`, action select bound to `?action=` (using AUDIT_ACTIONS as options), entityType select, from/to date inputs.

    Create `src/app/[locale]/admin/audit/audit-row-detail.tsx` (client):
    - Renders before_json and after_json as syntax-highlighted JSON side by side (just `<pre>{JSON.stringify(x, null, 2)}</pre>` is fine for v1).

    Verify NO Server Action mutations exist in any of these files (audit log is read-only).
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - 3 files exist
    - `grep -c 'await requireAdmin()' src/app/[locale]/admin/audit/page.tsx` returns `1`
    - `grep -c 'desc(auditLog.at)' src/app/[locale]/admin/audit/page.tsx` returns `1`
    - `grep -c '"use server"' src/app/[locale]/admin/audit/audit-table.tsx` returns `0` (no mutations)
    - `grep -c '"use server"' src/app/[locale]/admin/audit/audit-row-detail.tsx` returns `0`
    - `grep -c 'AUDIT_ACTIONS' src/app/[locale]/admin/audit/audit-table.tsx` returns `>=1`
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Audit log viewer renders read-only with filters + row expansion.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| URL searchParams → SQL filters | actor / action / entityType / dates |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-16-01 | Tampering | SQL injection via filters | mitigate | All filters use Drizzle's parameterized eq/like/gte/lte; never raw sql tagged |
| T-02-16-02 | Repudiation | audit log row tampered | mitigate | No UPDATE/DELETE Server Actions on auditLog in this plan or any other; convention enforced |
| T-02-16-03 | Information Disclosure | before/after JSON could contain PII | accept | actor_email is admin email; entity payloads are admin-managed content; admin-only access |
| T-02-16-04 | DoS | unbounded paging | mitigate | pageSize clamped 1-100; LIMIT/OFFSET on every query |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm build` exits 0
</verification>

<success_criteria>
1. Audit log RSC page renders with server-pagination + URL-driven filters.
2. Row expansion shows before/after JSON.
3. No mutation Server Actions on this surface.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-16-SUMMARY.md` documenting filter coverage and confirming append-only convention.
</output>
