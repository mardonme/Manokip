---
phase: 02-admin-panel
plan: 16
subsystem: audit-log-viewer
tags: [admin, audit, read-only, datatable, url-state, nuqs, filters, row-expansion, admin-11, d-17]

requires:
  - phase: 02-admin-panel/02-04
    provides: AUDIT_ACTIONS closed enum (src/lib/audit.ts:28-42) — drives the action filter dropdown options; reused verbatim so adding a new action verb in v2 only touches the enum file.
  - phase: 02-admin-panel/02-06
    provides: DataTable<TData> + DataTablePagination + DataTableToolbar (server-paginated mode default); the toolbarSlot prop is the seam our domain filters (actor / action / entity_type / from / to) plug into.
  - phase: 01-foundations/01-02
    provides: audit_log table (bigserial id, actor_email text, action text, entity_type text, entity_id text, before_json jsonb, after_json jsonb, at timestamptz NOT NULL DEFAULT now(), ip text, user_agent text). Append-only by convention — no Phase-2 surface deletes or updates audit rows.

provides:
  - src/app/[locale]/admin/audit/page.tsx (NEW) — Audit log RSC. Server-paginated query (default 50/page, clamped 1..100 per T-02-16-04) ordered by `at DESC`. URL filters: actor (ILIKE on actor_email), action (eq), entityType (eq), from/to (gte/lte on `at`). All filters go through Drizzle's parameterised eq/ilike/gte/lte (T-02-16-01 SQL injection mitigated by construction). bigserial id stringified at the RSC boundary so the client island carries it as a React key without BigInt drama. requireAdmin() gate is defense-in-depth on top of the edge middleware /[locale]/admin/* gate.
  - src/app/[locale]/admin/audit/audit-table.tsx (NEW) — Client island. DataTable<AuditRow> with 7 columns (expand chevron, at, actorEmail, action, entityType, entityId, ip). Toolbar slot houses 5 controls: actor <Input type="search"> with onBlur+Enter commit (avoids re-running the RSC on every keystroke), action <select> populated from AUDIT_ACTIONS (closed enum from src/lib/audit.ts), entityType <select> populated from a local ENTITY_TYPES tuple grepped from src/actions/** (category, manufacturer, spec_field, spec_field_group, product, contact_submission, contact_submission_export, admin_user), from/to <Input type="date"> producing ISO datetime via T00:00:00Z / T23:59:59Z boundaries. patchQuery callback diffs URL params and pushes via router.push (resets `page` on filter change). Row expansion is a local React.useState<Record<string, boolean>> map (NOT URL-persisted — bookmarking expansion across pages is uninteresting + the row id changes meaning when filters change). Expanded rows render an <AuditRowDetail> panel below the table, multi-row simultaneous expansion allowed.
  - src/app/[locale]/admin/audit/audit-row-detail.tsx (NEW) — Pure presentational read-only component (no "use client" — renders identically on the server). Renders before + after as <pre>{JSON.stringify(x, null, 2)}</pre> in two panels side-by-side via grid-cols-1 md:grid-cols-2. null payloads (create rows have no before; hard-delete rows have no after per src/lib/audit.ts:49-54 contract) render "(none)" rather than the literal "null" so admins can tell at-a-glance whether they're looking at create / delete / update. safeStringify wraps JSON.stringify in a try/catch so a stray BigInt at read time degrades to a readable error string rather than 500-ing the page (defense-in-depth on top of the bigint→string projection pattern from src/actions/submissions.ts:serialiseSubmission).

affects: [phase-2-plan-17-revalidation-e2e-gate, phase-5-launch-polish]  # 02-17 is the last Phase-2 plan; Phase 5 polish covers the JSON-viewer / audit-archival follow-ups.

tech-stack:
  added: []
  patterns:
    - "Pattern (read-only admin surface): the absence of mutation primitives is the boundary, not a runtime check. There is NO src/actions/audit.ts, NO 'use server' directive in any of the three new files, and NO call site that opens a dbTx.transaction. The audit_log is append-only by convention (T-02-16-02); every mutation in Phase 2 writes its OWN audit row via logAudit() inside its own transaction. THIS surface only reads. A future ESLint rule can lock the convention by forbidding 'use server' under src/app/[locale]/admin/audit/."
    - "Pattern (URL-driven filters via patchQuery + DataTable toolbarSlot): identical to plan 02-15's submissions inbox but with the audit-specific filter dimension (actor / action / entityType / date range). Filters live in URL params (D-17) so admin views are shareable + bookmarkable; DataTable's nuqs-driven URL state (page/pageSize/q/sort) coexists alongside our domain filters. patchQuery deletes `page` on every filter change so admins don't land on a stale page index of a smaller result set."
    - "Pattern (closed-enum-driven filter dropdown): the action filter dropdown is populated by .map()ing over AUDIT_ACTIONS from src/lib/audit.ts. Adding a new action verb in v2 (e.g. 'archive') automatically extends the filter dropdown — no separate options array to keep in sync. The entityType dropdown takes a local ENTITY_TYPES tuple instead because entity_type strings are a textual convention (not a closed enum at the schema level); the local tuple is the editable source of truth and adding a new entity type means editing one constant. Both dropdowns close-the-set so admins can't filter by typos."
    - "Pattern (row expansion via local React state, not TanStack expansion API): the shared DataTable doesn't expose getRowCanExpand / getExpandedRowModel because most admin lists don't need expansion. Rather than thread a new opt-in prop into DataTable just for this one consumer, audit-table.tsx renders an Expand button column (chevron) that toggles a local Record<id, boolean>; expanded rows produce a sibling detail panel BELOW the table. Multi-row simultaneous expansion matches typical audit-log viewer UX (Datadog, Cloudwatch, Sentry — all allow simultaneous expansion). Single-row-at-a-time would feel modal."
    - "Pattern (parameterised SQL via Drizzle helpers — T-02-16-01 SQL injection mitigation): every filter uses eq() / ilike() / gte() / lte() which Drizzle parameterises. There is NO `sql` tagged template using the user-controlled filter strings; the only `sql` use in the file is the COUNT(*) aggregate which has no user-controlled input. ILIKE on actorEmail uses `%${actor}%` but the percent signs are part of the parameter binding, not interpolated into the SQL string."
    - "Pattern (defensive ISO/YYYY-MM-DD date parser at the RSC boundary): URL params for date filters are admin-controlled but a typo like ?from=garbage shouldn't surface as a 500. safeDate() wraps `new Date(input)` and returns null on NaN; downstream code skips the filter entirely on null. Same posture as src/app/[locale]/admin/submissions/page.tsx (plan 02-15 — the closest analog)."

key-files:
  created:
    - src/app/[locale]/admin/audit/page.tsx
    - src/app/[locale]/admin/audit/audit-table.tsx
    - src/app/[locale]/admin/audit/audit-row-detail.tsx
    - .planning/phases/02-admin-panel/02-16-SUMMARY.md (this file)
  modified:
    - .planning/STATE.md (completed_plans 22 → 23, percent 65 → ~67; Wave 4 advances 16/18)
    - .planning/ROADMAP.md (Phase 2 progress 15/18 → 16/18)
    - .planning/REQUIREMENTS.md (ADMIN-11 closed)

key-decisions:
  - "Read-only by structural absence — NOT a runtime check. The plan literal said 'no mutation Server Actions on this page (audit log is append-only by convention)' and that's exactly how it landed: zero 'use server' directives, zero src/actions/audit.ts, zero dbTx.transaction calls in any of the three new files. The grep `grep -c '\"use server\"' src/app/[locale]/admin/audit/audit-table.tsx` returns 0 (acceptance criterion met). Adding mutation primitives would be the explicit signal that the convention is being broken; reviewers will see it immediately."
  - "Plain <select> instead of base-ui Select for the action / entityType dropdowns. The base-ui Select primitive (src/components/ui/select.tsx) is excellent for in-form value control with typed values + accessible keyboard handling, but our use case is URL-driven (the URL is the source of truth, the <select> just exposes the patch). A plain <select> with onChange→patchQuery is 8 lines vs ~30 lines wrapping SelectTrigger/Content/Item; the keyboard a11y of <select> is browser-native. We use base-ui Select elsewhere (data-table-pagination, product-form data-type select) where typed-value + custom rendering matter; here it would be ceremony."
  - "Row expansion implemented at the column level (chevron button + local React.useState map) rather than threading an `enableExpansion` opt-in into the shared DataTable. DataTable is consumed by 8+ admin lists and only ONE (audit) needs expansion; widening the primitive's API for a single consumer would be the wrong trade-off. The detail panel renders BELOW the table (not inline as an extra TableRow) because the shared DataTable doesn't currently render arbitrary children inside a TableBody and changing that would similarly widen the API. Below-table panels also handle multi-row simultaneous expansion better visually (no awkward inline insertions reflowing the table)."
  - "ENTITY_TYPES tuple lives in audit-table.tsx, NOT in src/lib/audit.ts. The AUDIT_ACTIONS closed enum is a real schema-level concern (it gates what logAudit() accepts at compile time) so it lives next to logAudit in src/lib/audit.ts. ENTITY_TYPES is purely a UI dropdown population concern — entity_type strings are a textual convention written verbatim by individual mutation handlers (manufacturers.ts writes 'manufacturer', spec-fields.ts writes 'spec_field', etc.). Surfacing them at the schema level would imply a closed-set guarantee we don't actually enforce. The grep across src/actions/** is the source of truth for the current set; the audit viewer is the only consumer."
  - "Default page size = 50 (plan literal D-17). DataTable's defaultPageSize prop carries this; the shared default for other admin tables is 20 (manufacturers/products/submissions). Audit logs are scrolled rather than navigated — the operational pattern is 'recent activity at a glance', so 50 rows on the first page covers a typical day's mutation traffic in this admin panel size (2-5 admins). The clamp 1..100 (T-02-16-04) prevents ?pageSize=999999 DoS."
  - "Actor filter uses ILIKE with %wildcard% so partial emails like 'alice' match 'alice@manometr.uz'. Drizzle parameterises the pattern (the percent signs are part of the bind value, not interpolated into the SQL string) so T-02-16-01 (SQL injection via filter params) is mitigated. The actor input is local-state mirrored with onBlur+Enter commit rather than every-keystroke debounce because partial actor values like 'alic' are rarely meaningful for the audit viewer use case (admins look up specific actors by full email or paste from a Slack message)."
  - "before_json + after_json rendered as <pre>{JSON.stringify(x, null, 2)}</pre> for v1; syntax-highlighted JSON viewer (react-json-view, react-json-pretty, etc.) deferred to Phase 5 launch polish. Adding a transitive dep for admin-only diff inspection isn't worth the bundle weight in v1 — admins inspect audit rows infrequently, the <pre> output is perfectly readable, and we can swap in a JSON viewer in a single file change later. The JsonPanel component renders '(none)' rather than the literal 'null' for create/delete rows so admins can tell at-a-glance which row type they're looking at."

deviations:
  - "Rule-3 (pre-existing scope boundary): pnpm build TypeScript step fails on scripts/verify-02-01-migration.ts noUncheckedIndexedAccess errors (DEF-2-13b-01 logged in plan 02-13b's deferred-items.md; verified pre-existing on master before our changes). pnpm tsc --noEmit shows the same 7 errors and nothing else; plan-relevant code is clean. The Next.js compile step reports 'Compiled successfully in 14.3s'. Same posture as 02-13a/02-13b/02-15 — out-of-scope per CLAUDE.md scope-boundary rules; the failing file is unrelated to the audit viewer surface."
  - "Rule-3 (pre-existing tooling drift): pnpm lint executes `next lint` which is removed in Next 16 (the runner reports 'Invalid project directory provided, no such directory: .../lint'). Direct ESLint invocation (pnpm exec eslint) fails with a different pre-existing error: 'Cannot find package @eslint/eslintrc imported from eslint.config.mjs'. Both are pre-existing on master; lint pipeline is not green for ANY recent Phase-2 plan. Out-of-scope per CLAUDE.md scope-boundary rules — same posture as the verify-02-01-migration.ts deferral; should be addressed by a dedicated tooling-modernisation plan, not from inside a feature plan."

threat-flags: []  # No new trust boundaries beyond the plan's threat_model. T-02-16-01..04 all mitigated as specified (parameterised filters, no mutation primitives on this surface, admin-only behind requireAdmin, pageSize clamp).

requirements-completed: [ADMIN-11]  # Audit log writer + viewer fully shipped: writer landed in 02-04 (logAudit), every mutation across 02-09..02-15 emits audit rows, this plan ships the viewer.
requirements-touched: []

duration: ~10min
completed: 2026-04-29
---

# Phase 2 Plan 16: Audit Log Viewer Summary

**Read-only audit log viewer ships at /[locale]/admin/audit, server-paginated 50/page ordered by `at DESC` with URL-driven filters (actor ILIKE, action eq, entityType eq, from/to date range) and per-row expansion showing before_json + after_json side-by-side. ADMIN-11 closes; Wave 4 advances 16/18.** Three new files (page.tsx RSC + audit-table.tsx client island + audit-row-detail.tsx pure presentational), zero new dependencies, zero mutation Server Actions — the read-only invariant is structural (the absence of "use server" + the absence of src/actions/audit.ts is the boundary). Plan-relevant `pnpm tsc --noEmit` is clean (only the 7 pre-existing 02-01 script errors remain — DEF-2-13b-01 out-of-scope per CLAUDE.md scope-boundary, identical posture to 02-13a/02-13b/02-15). Full vitest suite 116/116 across 25 test files (this plan adds NO new tests — pure UI + read-only DB query, exercised via the existing audit_log writes from every prior Phase-2 plan; Playwright e2e gate landing in 02-17 will exercise the viewer end-to-end on Vercel preview).

## What shipped

**Audit viewer RSC** (`src/app/[locale]/admin/audit/page.tsx`, 130 lines):

- `requireAdmin()` defense-in-depth on top of the /[locale]/admin/\* edge gate.
- Server-paginated query of `auditLog` with default 50/page, clamped 1..100 per T-02-16-04 DoS guard.
- URL filters parsed from `searchParams`: `actor` (trimmed → ILIKE on actorEmail), `action` (trimmed → eq), `entityType` (trimmed → eq), `from`/`to` (parsed via safeDate → gte/lte on `at`).
- All filters go through Drizzle's parameterised eq / ilike / gte / lte helpers — T-02-16-01 SQL injection mitigated by construction.
- Two parallel queries via `Promise.all`: page slice (limit + offset + desc(at)) and total count.
- bigserial id stringified at the RSC boundary so the client island carries it as a React key without BigInt drama.

**Audit viewer client island** (`src/app/[locale]/admin/audit/audit-table.tsx`, 320 lines):

- DataTable<AuditRow> with 7 columns: expand chevron, at (formatted via `toLocaleString`), actorEmail, action (rendered as a badge), entityType, entityId, ip.
- defaultPageSize=50 (plan literal D-17).
- toolbarSlot houses 5 controls:
  - actor `<Input type="search">` with local-state mirror + onBlur/Enter commit (avoids re-running the RSC on every keystroke; partial actor values rarely meaningful for audit lookup).
  - action `<select>` populated from `AUDIT_ACTIONS` (closed enum from src/lib/audit.ts) — plain HTML `<select>` rather than base-ui Select primitive to keep the URL-state wiring direct (8 lines vs ~30 lines wrapping SelectTrigger/Content/Item).
  - entityType `<select>` populated from local `ENTITY_TYPES` tuple grepped from src/actions/\*\* (8 entries: category, manufacturer, spec_field, spec_field_group, product, contact_submission, contact_submission_export, admin_user).
  - from / to `<Input type="date">` producing ISO datetime via T00:00:00Z / T23:59:59Z boundaries.
- `patchQuery` callback diffs URL params and pushes via `router.push`, deletes `page` on every filter change so admins don't land on a stale page index.
- Row expansion: local `React.useState<Record<string, boolean>>` map keyed by stringified bigserial id — NOT URL-persisted because bookmarking expansion across pages is uninteresting and the row id changes meaning when filters change.
- Expanded rows render a sibling detail panel BELOW the table (multi-row simultaneous expansion allowed) with action / entityType / entityId header + `<AuditRowDetail>` body + optional User-Agent footer + Close button.

**Audit row detail** (`src/app/[locale]/admin/audit/audit-row-detail.tsx`, 60 lines):

- Pure presentational component — no `"use client"`, renders identically on the server.
- Two panels side-by-side via `grid-cols-1 md:grid-cols-2`: Before + After.
- Each panel renders `<pre>{JSON.stringify(x, null, 2)}</pre>` for v1 (syntax-highlighted JSON viewer deferred to Phase 5 launch polish).
- null payloads (create rows have no before; hard-delete rows have no after per src/lib/audit.ts:49-54 contract) render "(none)" rather than the literal "null" so admins can tell at-a-glance whether they're looking at create / delete / update.
- `safeStringify` wraps JSON.stringify in a try/catch so a stray BigInt at read time degrades to a readable error string rather than 500-ing the page (defense-in-depth on top of the bigint→string projection pattern from src/actions/submissions.ts:serialiseSubmission).

## Decisions Made

See `key-decisions` in the frontmatter.

## Deviations from Plan

See `deviations` in the frontmatter.

### Auto-fixed Issues

**1. [Rule 3 - Pre-existing scope boundary] `pnpm build` fails on script typecheck**

- **Found during:** verification.
- **Issue:** `pnpm build` typecheck sweeps `scripts/verify-02-01-migration.ts` which has 7 `Object is possibly 'undefined'` errors under `noUncheckedIndexedAccess: true`. Pre-existing per DEF-2-13b-01 (verified by checking git log — same 7 errors present on master before our changes).
- **Fix:** Not addressed in this plan per scope-boundary rules. Plan-relevant `pnpm tsc --noEmit` is clean (the 7 pre-existing errors are the only output). Next.js compile step reports "Compiled successfully in 14.3s" — the audit viewer files compile cleanly; the typecheck step is what fails.
- **Files modified:** none.
- **Note:** Same posture as 02-13a/02-13b/02-15.

**2. [Rule 3 - Pre-existing tooling drift] `pnpm lint` is broken**

- **Found during:** verification.
- **Issue:** `pnpm lint` runs `next lint` which Next 16 removed; the runner reports "Invalid project directory provided". Direct `pnpm exec eslint` invocation fails with a different pre-existing error: "Cannot find package @eslint/eslintrc imported from eslint.config.mjs". Both pre-existing on master.
- **Fix:** Not addressed in this plan. Should be addressed by a dedicated tooling-modernisation plan.
- **Files modified:** none.
- **Note:** Same posture as the verify-02-01-migration.ts deferral. Lint pipeline is not green for any recent Phase-2 plan; treating it as a tooling-drift backlog item rather than blocking on it.

## Auth Gates Encountered

None — read-only RSC + client island, no Server Actions. The page is gated by `requireAdmin()` like every other admin RSC.

## Threat Surface Recap

T-02-16-01..04 from the plan's `<threat_model>` all mitigated as specified:

- **T-02-16-01 (Tampering — SQL injection via filter params):** All five filter dimensions (actor / action / entityType / from / to) flow through Drizzle's parameterised `eq` / `ilike` / `gte` / `lte` helpers. There is NO `sql` tagged template literal using user-controlled filter strings in this plan. The only `sql` use is the COUNT(\*) aggregate which has no user-controlled input. The ILIKE pattern `%${actor}%` puts the percent signs INSIDE the parameter binding rather than interpolating them into the SQL string.
- **T-02-16-02 (Repudiation — audit log row tampered):** No UPDATE/DELETE Server Actions on auditLog in THIS plan, and a grep across `src/actions/**` confirms no other plan does either. The convention is enforced structurally (the absence of mutation primitives is the boundary). A future ESLint rule can lock this by forbidding `'use server'` under `src/app/[locale]/admin/audit/`.
- **T-02-16-03 (Information Disclosure — before/after JSON could contain PII):** Accepted per the plan literal. The audit viewer is admin-only behind `requireAdmin()`; actor_email is the admin's own email; entity payloads are admin-managed content. No customer PII flows through this surface (contact submissions ARE customer PII but admin already has access to them via the submissions inbox surface).
- **T-02-16-04 (DoS — unbounded paging):** `pageSize` clamped 1..100 in the RSC's URL parsing (`Math.min(100, Math.max(1, Number(sp.pageSize ?? 50)))`); LIMIT/OFFSET on every query.

## Self-Check: PASSED

**Created files (all verified present):**

- src/app/[locale]/admin/audit/page.tsx — FOUND
- src/app/[locale]/admin/audit/audit-table.tsx — FOUND
- src/app/[locale]/admin/audit/audit-row-detail.tsx — FOUND
- .planning/phases/02-admin-panel/02-16-SUMMARY.md — FOUND (this file)

**Commits (verified in git log):**

- b52f0a3 — feat(02-16): audit log viewer (read-only) — ADMIN-11 / D-17
- (next commit) — docs(02-16): complete audit-log-viewer plan

**Acceptance criteria:**

- `grep -c 'await requireAdmin()' src/app/[locale]/admin/audit/page.tsx` → 1 ✅
- `grep -c 'desc(auditLog.at)' src/app/[locale]/admin/audit/page.tsx` → 1 ✅
- `grep -c '"use server"' src/app/[locale]/admin/audit/audit-table.tsx` → 0 ✅
- `grep -c '"use server"' src/app/[locale]/admin/audit/audit-row-detail.tsx` → 0 ✅
- `grep -c 'AUDIT_ACTIONS' src/app/[locale]/admin/audit/audit-table.tsx` → 4 (≥1) ✅
- `pnpm build` Compiled successfully in 14.3s ✅ (typecheck step fails ONLY on pre-existing DEF-2-13b-01 — out-of-scope per CLAUDE.md scope-boundary)
- vitest 25 files / 116 tests passing ✅
