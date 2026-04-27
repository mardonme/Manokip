# Phase 2: Admin Panel - Research

**Researched:** 2026-04-27
**Domain:** Next.js 16 App Router admin CMS with Server Actions, Drizzle/Neon, Auth.js v5, Cloudinary signed direct upload, Tanstack Table + nuqs + RHF + Zod, Playwright on Vercel preview
**Confidence:** HIGH (the stack is locked from Phase 1; the open questions are caching API choice in Next 16 and the HTTP-vs-WS Drizzle client split — both addressable via verified sources)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Editor layout + product CRUD**
- **D-01:** Single long scrollable page with three-locale tabs at the top. Locale tabs swap **only the translatable fields in place**; typed spec values, manufacturer/category, media `public_id` arrays, and publish state are shared (rendered once outside the tab strip).
- **D-02:** All three locales held in **one React Hook Form instance**. Tabs are pure UI state. A single Save action upserts `product` + 3 `product_translations` + N `product_spec_values` (+ sibling `product_spec_value_translations` for `is_extra=true` and typed `text` values) in **one Server Action transaction**. Used across every CRUD entity. Rollback on any failure leaves no partial state.
- **D-03:** Duplicate-product (ADMIN-08) = full clone. Status forced to `draft`. Slug per locale gets `-copy` suffix. Audit log writes `action='duplicate_product'`.
- **D-04:** Translation-completeness indicator = per-locale `%` bar in the editor + per-locale colored dot in the product list. Required fields: `name`, `short_description`, `long_description`, `slug` per locale (4 fields), plus all `product_spec_values` where `spec_field.is_required=true` AND `data_type='text'`. Computed server-side via SQL view `product_translation_completeness(product_id, locale, percent)`.
- **D-05:** Machine-translated flag is **per-field, per-locale**. Sibling `*_translation_field_flags (translation_id, field_name, machine_translated BOOLEAN)` is the canonical schema; boolean column per field is the alternative. Planner picks whichever ships cleaner.

**Spec-schema editor mechanics**
- **D-06:** Rename `spec_field.key` runs as a single transaction with an impact-preview confirm dialog. Updates `spec_field.key` + affected `extra_key` rows + writes `audit_log(action='rename_spec_field')`.
- **D-07:** Delete spec_field is soft-delete by default with hard-delete as an explicit option. Add `spec_field.deleted_at TIMESTAMPTZ NULL`. Both paths write audit_log rows.
- **D-08:** Type changes are **blocked**. Once saved with `data_type`, the type dropdown disables. Workaround: create a new field, optionally run "Copy values from old field," soft-delete the old.
- **D-09:** Add `spec_field_group` entity (new tables): `spec_field_group(id UUID PK, category_id UUID FK, key TEXT, sort_order INT, deleted_at TIMESTAMPTZ NULL, UNIQUE(category_id, key))` + `spec_field_group_translations(group_id UUID FK, locale TEXT, label TEXT, PK (group_id, locale))` + add `spec_field.group_id UUID FK NULL`.

**Cache invalidation + draft/published**
- **D-10:** Fine-grained typed tags + small set of collection tags. Per-entity tags: `product:<uuid>`, `category:<uuid>`, `manufacturer:<uuid>`, `spec-field:<uuid>`, `spec-field-group:<uuid>`, `recipe:<uuid>`, `industry:<uuid>`. Per-collection: `products-list`, `categories-tree`, `manufacturers-list`, `sitemap`, `search-index`. Helper module `src/lib/revalidation.ts`.
- **D-11:** Single `product.status` enum: `draft` | `published`. Schema additive: `product.status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'))`. Translation-completeness % is informational, **not** a publish gate.
- **D-12:** Category re-parent invalidates: old parent + new parent + moved category + `categories-tree` + `sitemap`. Helper `revalidateCategoryMove(oldParentId, newParentId, movedId)`.
- **D-13:** CI gate for OPS-01 = Playwright spec running against the Vercel preview URL. GH Actions: wait for preview ready → admin login → edit product name (uz) → reload public detail URL → assert new name visible within 5s. Blocks PR merge.

**Admin lifecycle + audit log**
- **D-14:** Admin invite: pre-create `admin_user(active=false)` + new `admin_invite` row + Resend email. New table `admin_invite(id UUID PK, email TEXT, token TEXT UNIQUE, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ NULL, invited_by TEXT, created_at TIMESTAMPTZ)`.
- **D-15:** Session timeout enforced in `proxy.ts` middleware + Auth.js `maxAge` as backstop. Per-request: read `sessions` row, reject if `expires < now()` (idle) or `created_at < now() - '7d'` (absolute), 307 → `/[locale]/login` + clear cookie.
- **D-16:** Audit log: one row per Server Action with full before/after JSON. Helper `src/lib/audit.ts` with closed-set action enum: `'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'invite' | 'rename_spec_field' | 'soft_delete_spec_field' | 'delete_spec_field' | 'duplicate_product' | 'login' | 'logout' | 'session_revoked'`. Called inside the same transaction as the mutation.
- **D-17:** Reusable `DataTable<TData>` primitive: TanStack Table v8 + shadcn DataTable + nuqs URL state. Used for products list, categories list, manufacturers list, spec-fields list, audit log viewer, contact submissions inbox.

### Claude's Discretion

- Component library wiring: `pnpm dlx shadcn@latest init` + add Button, Input, Form, Tabs, Dialog, AlertDialog, Toast/Sonner, Select, Checkbox, Switch, Tooltip, Card, Sheet, DataTable. Default shadcn theme (Slate or Zinc).
- Form library: React Hook Form + Zod via `@hookform/resolvers/zod` + drizzle-zod. One Zod schema per entity, declared next to the Server Action.
- Cloudinary upload UX: `next-cloudinary`'s `<CldUploadWidget>` for drag-drop multi-image. Allow reordering via `@dnd-kit/sortable` or similar. Datasheet upload uses same widget restricted to `pdf` resource type. DB stores `public_id` array.
- Slug auto-generation: Phase-1 `src/lib/slug.ts` is the source of truth. Auto-generate on blur with manual override. Friendly toast on collision.
- Per-field MT flag schema choice (D-05 alternative): planner picks sibling `translation_field_flags` table vs. boolean columns per translation table.
- Audit log retention: no policy in Phase 2 (table grows unbounded). Phase 5 polish item.
- Admin route layout: sidebar with sections (Dashboard, Products, Categories, Manufacturers, Spec Fields, Submissions, Audit Log, Admins) + top bar with admin email + sign-out. Mobile responsive nice-to-have.
- Login UX: polish Phase-1 minimal `/[locale]/login` with "Check your email" confirmation and an error banner for AccessDenied. Use `useActionState` on a client component to handle the discriminated `{ ok } | { error }` return.
- Test posture: each Server Action has a Vitest unit test (mocks Neon HTTP) + at least one integration test against live Neon dev branch (transaction shape, audit log row written). Playwright e2e covers login → invite admin → revalidation gate → CSV export.

### Deferred Ideas (OUT OF SCOPE)

- Phase 3 (Public): public detail page rendering of `spec_field_group`, `product_search` tsvector population, locale-filter UI for admin product list, sitemap regeneration consumer, cross-locale banner component.
- Phase 4 (Recipes/Industries): Tiptap editor; M:N admin UI for `product ↔ recipe` and `product ↔ industry`; "Used in" reverse lookup.
- Phase 5 (Launch): audit log retention/archival, CSV export hardening, admin shell mobile-responsive polish, `BOOTSTRAP_ADMIN_EMAIL` env-var retirement, error/load testing, Sentry release tagging integration.
- v2/backlog: Editor/Admin RBAC split, TMS integration, Bulk import/export, Manufacturer self-service portal, Per-locale publish flags, Three-state status, "Allow narrow type conversions," Field-level diff log.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Magic-link login; idle 24h / absolute 7d session expiry | Auth.js v5 `session.maxAge=24h, updateAge=1h` (idle); explicit `created_at < now()-7d` check in proxy.ts. Phase-1 `sessions.absoluteExpires` column exists; D-15 patches the proxy gate. See "Pattern: Server Action transaction" §1 + "Auth.js session enforcement on Edge" §2. |
| ADMIN-02 | Invite admin; 48h single-use token | New `admin_invite` table; `crypto.randomUUID()` token; `WHERE used_at IS NULL AND expires_at > now()` enforces single-use atomically at DB level. AdminInviteEmail React Email template (sibling to existing magic-link template). |
| ADMIN-03 | Category CRUD with translation tabs | RHF single-instance + 3 tabs swapping translatable fields. Drizzle `dbTx.transaction(async (tx) => {...})` upserts category + 3 translation rows + audit_log atomically. |
| ADMIN-04 | Manufacturer CRUD + logo upload | Same Server Action shape as category. Logo upload via `<CldUploadWidget signatureEndpoint="/api/cloudinary/sign" options={{ multiple: false, folder: 'manufacturers', resourceType: 'image' }}>`; `public_id` returned to RHF state. |
| ADMIN-05 | Spec-field schema editor | Schema additive (Phase 2 migration): `spec_field.deleted_at`, `spec_field.group_id`, `spec_field_group(+translations)`. Rename Server Action: `tx.update(specFields).set({ key })` + `tx.update(productSpecValues).set({ extraKey: new }).where(eq(extraKey, old))` + audit. Type-change blocked at form level. |
| ADMIN-06 | Product CRUD with locale tabs, typed specs, draft/published | The marquee Server Action. Replace-on-save for spec values: `DELETE FROM product_spec_values WHERE product_id = ?` then `INSERT` all rows from form state, all in `dbTx.transaction`. Locked to `dbTx` (WS pool) — `db` (HTTP) cannot do `db.transaction`. |
| ADMIN-07 | Cloudinary signed direct upload (image + PDF) | Phase-1 `/api/cloudinary/sign` endpoint exists. Widget calls it; upload → `public_id` written to DB on form submit. PDF subtype: `<CldUploadWidget options={{ resourceType: 'auto', clientAllowedFormats: ['pdf'] }}>` (datasheet); image subtype restricts `clientAllowedFormats: ['jpg','jpeg','png','webp']`. |
| ADMIN-08 | Duplicate product = full clone | Server Action: clone `product` row + 3 translations (slug `-copy`) + all `product_spec_values` + sibling translations + media `public_id` array. Status forced to `draft`. Audit `action='duplicate_product'`. |
| ADMIN-09 | Per-field machine-translated flag | Sibling `translation_field_flags (translation_id BIGINT/UUID FK, field_name TEXT, machine_translated BOOLEAN, PK (translation_id, field_name))` per translation table family. UI: amber left-border + small "MT" badge in product list. |
| ADMIN-10 | Translation-completeness indicator | SQL view `product_translation_completeness(product_id, locale, percent)` — declared via `pgView('...').as(sql\`...\`)` in Drizzle. Counts: 4 base fields + N text-typed required spec values. Editor reads view per row; product list reads view in batch. Refreshed lazily on read (it's a view, not a materialized view). |
| ADMIN-11 | Audit log on every write | `logAudit({ actor, action, entityType, entityId, before, after, req })` helper executed inside the same `tx`. Closed action enum (lints reject unknown). Phase-1 `audit_log` table consumed verbatim. |
| ADMIN-12 | Contact submissions inbox: view, search, export | TanStack Table over Phase-1 `contact_submission`. nuqs filter state (date range, read state, free-text). CSV export Server Action returns `Response` with `Content-Disposition: attachment; filename="submissions-YYYY-MM-DD.csv"`. UTF-8 BOM prepended for Excel `oʻ`/`gʻ` round-trip. |
| OPS-01 | revalidateTag fan-out per mutation; e2e gate | `src/lib/revalidation.ts` typed helpers. Playwright spec `tests/e2e/admin-edit-revalidates.spec.ts` runs against Vercel preview (D-13 contract). Plus the canonical Next.js 16 caching API question (`unstable_cache` vs `'use cache'` directive vs `fetch.next.tags`) — see §8. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following directives MUST be honored by every Phase-2 plan and task. Treat them with the same weight as locked CONTEXT decisions.

| Directive | Source | Phase-2 Impact |
|-----------|--------|----------------|
| Translations via sibling `*_translations` tables, never `_ru/_en/_uz` columns, never JSONB | CLAUDE.md Conventions | Every CRUD Server Action upserts the sibling rows in one transaction. Forms render 3 tabs over the sibling rows. |
| Spec values stored in typed long-table (`num_value`/`text_value`/`enum_value`/`bool_value` + unit) | CLAUDE.md Conventions | Editor renders type-specific input per `spec_field.data_type`. Server Action writes typed columns, never opaque strings. |
| Locale routing `/[locale]/...`; root `/` redirects | CLAUDE.md Conventions | Admin lives under `/[locale]/admin/*`. proxy.ts already gates this from Phase 1. |
| **Cache invalidation: every Server Action mutation MUST call `revalidateTag` for affected public pages** | CLAUDE.md Conventions | The single most important Phase-2 contract. `src/lib/revalidation.ts` is the helper module. Forgetting a tag is a P1 bug. |
| **Edit-then-refresh must be e2e-tested on Vercel preview (NOT `next dev`)** | CLAUDE.md Conventions | OPS-01 Playwright spec lives in CI against the preview URL, not in `pnpm dev`. |
| Cloudinary admin uploads go directly to Cloudinary; DB stores only `public_id`; never round-trip via `/api/` | CLAUDE.md Conventions | Use `<CldUploadWidget>`. Server Actions accept `public_id` strings, never base64 or multipart. |
| Magic-link only (no passwords); 24h idle / 7d absolute; `requireAdmin()` on every Server Action | CLAUDE.md Conventions | `requireAdmin()` already exists in `src/lib/auth.ts` (Phase 1). Every mutation Server Action starts with `const session = await requireAdmin()`. |
| Every mutation writes to `audit_log` | CLAUDE.md Conventions | `logAudit()` helper inside the same `tx`. |

## Summary

Phase 2 is the operational layer that makes the catalog populatable. It is overwhelmingly a CRUD + Server Action + cache invalidation phase, layered with three risky details that have already been resolved in CONTEXT.md: (1) the spec-schema editor (rename + soft-delete + grouped tables), (2) the cache invalidation contract (typed tags + collection tags + an e2e gate against a real Vercel preview), and (3) admin lifecycle (invite + dual session caps + audit log). The stack is fully locked from Phase 1; the only library additions are `@tanstack/react-table`, `nuqs`, `shadcn-cli`, and `@dnd-kit/sortable`. Schema additions are purely additive.

**Critical infrastructure observation that the planner must not miss:** Phase 1 ships **two** Drizzle clients in `src/db/` — `db` (neon-http, no transactions) and `dbTx` (neon-serverless WebSocket Pool, full transactions). The Neon HTTP driver categorically does not support `db.transaction()` [VERIFIED: orm.drizzle.team/docs/connect-neon + answeroverflow.com Drizzle Team thread]. **Every Phase-2 mutation Server Action MUST import `dbTx`, not `db`.** The Phase-1 `db` client stays for single-statement reads in RSC. The plan must be explicit about this; the "wrong client import" failure mode is silent at typecheck and surfaces as a runtime "No transactions support in neon-http driver" exception at first form save.

**Second critical observation:** The existing `products` table uses `publishedAt TIMESTAMPTZ NULL` (NULL = draft, non-null = published) instead of the `status TEXT` enum CONTEXT D-11 prescribes. The planner must reconcile this. Two options: **(A)** keep `publishedAt`, treat D-11 as syntactic restatement (`status` is derived as `publishedAt IS NULL ? 'draft' : 'published'`); **(B)** add the `status` column in the Phase-2 migration and backfill from `publishedAt`. Option A is the cleaner additive change because it does not touch existing schema; option B costs a column-addition + backfill + a deprecate-publishedAt later. **Recommended primary: A. Defer B to v2.** This is a candidate for an Open Question — see §Open Questions.

**Third critical observation:** Next.js 16 ships a new caching model. `unstable_cache` is replaced by the `'use cache'` directive [VERIFIED: nextjs.org/docs/app/api-reference/directives/use-cache + nextjs.org/blog/next-16]. `revalidateTag` in Next 16 takes a second `cacheLife` argument; the single-argument form is deprecated and will produce a TypeScript error. Phase-2 cache helpers MUST adopt the new signature.

**Primary recommendation:** Build the spine first (Wave 1: layout + DataTable + revalidation helper + audit helper + invite scaffolding). Then ship CRUD per entity (Wave 2: category, manufacturer, spec-field schema editor with the migration). Then ship the marquee product editor (Wave 3). Then ship submissions inbox + audit viewer + the OPS-01 e2e gate (Wave 4).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin authentication (magic-link login) | Frontend Server (RSC + Server Action) | Edge (proxy.ts gate) | Auth.js v5 `auth()` reads session in RSC; proxy.ts at Edge does the cookie + 24h-idle + 7d-absolute check before any RSC runs. |
| Session timeout enforcement (24h idle / 7d absolute) | Edge (proxy.ts) | API/Backend (DB session row) | One Neon HTTP read per admin request from Edge `fra1` → Neon `eu-central-1` (~30ms). The 7d cap requires a DB row read because the cookie alone cannot represent the absolute origin time trustworthily. |
| Admin invite token mint + consume | API/Backend (Server Action) | Email (Resend) | DB transaction owns the atomicity (insert `admin_user(active=false)` + insert `admin_invite` + send email). Resend only carries the link. |
| Category/Manufacturer/Spec-field/Product CRUD | API/Backend (Server Action + dbTx transaction) | Frontend Server (RSC list pages) | All writes are Server Actions running on Node runtime against `dbTx`. RSC reads are single-statement, can use `db` (HTTP). |
| Spec-schema rename impact preview + commit | API/Backend (Server Action read + Server Action write) | Browser (confirm modal) | The "N products affected" count is a read-only Server Action invoked when the modal opens; the rename itself is a separate mutation Server Action (transaction). |
| Image/PDF upload | Browser (CldUploadWidget) → Cloudinary directly | API/Backend (sign endpoint) | `/api/cloudinary/sign` is the ONLY backend touchpoint; file bytes never reach Vercel (PROJECT constraint). |
| Translation-completeness indicator | Database (SQL view) | API/Backend (RSC read of view) | View `product_translation_completeness` materialized lazily on read; admin RSC pages join the view. |
| Per-field MT badge | Database (storage) | Frontend Server (render) | Storage in `*_translation_field_flags`; render-time tagged in the editor + product list. |
| Cache invalidation fan-out | API/Backend (Server Action) | Next.js cache layer | Server Actions call `revalidateTag(...)` after `tx.commit`. The cache layer rebuilds tagged pages on next read. |
| Audit log writer | API/Backend (logAudit() inside tx) | — | One row per Server Action, atomic with the mutation. |
| Audit log viewer | Frontend Server (RSC list) | API/Backend (Drizzle query) | TanStack Table over `audit_log`; nuqs URL state. |
| Contact submissions inbox + CSV export | Frontend Server (RSC list) + API/Backend (export Server Action) | — | TanStack Table over `contact_submission`. CSV export is a Server Action returning a `Response` with `Content-Disposition`. |
| OPS-01 revalidation gate | CI (GitHub Actions + Playwright) → Vercel preview deploy | — | The only end-to-end signal that revalidate-fan-out works; cannot be unit-tested. |

## Standard Stack

### Core (already installed in Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.4 | App framework | Phase 1 lock [VERIFIED: package.json] |
| react | 19.1.0 | UI runtime | Phase 1 lock [VERIFIED: package.json] |
| drizzle-orm | 0.45.2 | ORM | Phase 1 lock [VERIFIED: package.json]; current latest is 0.45.x line [VERIFIED: npm view drizzle-orm version → 0.45.2] |
| @neondatabase/serverless | 1.1.0 | DB driver (HTTP + WS) | Phase 1 lock; `neon()` for HTTP, `Pool` for WebSocket transactions [VERIFIED: package.json + verified by inspection of src/db/client.ts + src/db/client-ws.ts] |
| next-auth | 5.0.0-beta.31 | Auth.js v5 | Phase 1 lock [VERIFIED: package.json] |
| @auth/drizzle-adapter | 1.11.2 | Auth.js DrizzleAdapter | Phase 1 lock [VERIFIED: package.json] |
| next-intl | 4.9.1 | i18n | Phase 1 lock [VERIFIED: package.json] |
| next-cloudinary | 6.17.5 | Cloudinary widgets | Phase 1 lock; current published version is 6.17.5 [VERIFIED: npm view next-cloudinary version → 6.17.5] |
| cloudinary | 2.9.0 | Server SDK (signing) | Phase 1 lock [VERIFIED: package.json] |
| react-hook-form | 7.73.1 | Form state | Phase 1 installed [VERIFIED: package.json] |
| @hookform/resolvers | 3.10.0 | RHF + Zod glue | Phase 1 installed; current latest is 5.2.2 [VERIFIED: npm view → 5.2.2]. **Phase 2 should NOT upgrade unless required** — RHF 7.73.x peers with @hookform/resolvers 3.x; @hookform/resolvers 5.x requires RHF 8 / different peer surface. Pin 3.10.0 OR upgrade RHF together. **Recommendation: stay on 3.10.0.** |
| zod | 4.3.6 | Validation | Phase 1 lock [VERIFIED: package.json] |
| sonner | 1.7.4 | Toast | Phase 1 installed; current latest is 2.0.7 [VERIFIED: npm view sonner version → 2.0.7]. Phase 2 should NOT upgrade in-flight. Phase 5 polish item. |
| lucide-react | 0.460.0 | Icons | Phase 1 installed [VERIFIED: package.json] |
| drizzle-zod | 0.8.3 | Inferred Zod schemas from Drizzle tables | Phase 1 installed [VERIFIED: package.json] |

### Phase 2 Additions

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Headless table primitive for every admin list page | Mandated by STACK.md and CONTEXT D-17. Latest stable v8 [VERIFIED: npm view @tanstack/react-table → 8.21.3]. v9 alphas exist; do not adopt. |
| nuqs | 2.8.9 | Type-safe URL state for filters/pagination/sort | Mandated by STACK.md. Latest [VERIFIED: npm view nuqs → 2.8.9]. **Note:** Next.js 16 + nuqs 2.8.x reportedly need NuqsAdapter wrapping in root layout; one issue reported in 2.8.5 about adapter detection [CITED: github.com/47ng/nuqs/issues/1263 — needs validation at install time]. |
| @dnd-kit/core | 6.3.1 | Drag-drop primitives for media reorder | [VERIFIED: npm view → 6.3.1] |
| @dnd-kit/sortable | 10.0.0 | Sortable preset (paired with `@dnd-kit/core`) | [VERIFIED: npm view → 10.0.0] React 19 compatibility not officially confirmed by docs but no peer-dep block at install [ASSUMED]. Smoke-test on Wave-1 install. |
| @dnd-kit/utilities | 3.2.2 | dnd-kit helpers (`CSS.Transform.toString` etc.) | [VERIFIED: npm view → 3.2.2] |
| papaparse | 5.5.3 | CSV writing for ADMIN-12 export (server-side) | Latest [VERIFIED: npm view → 5.5.3]. Alternative: hand-roll a 30-line CSV writer (BOM + RFC 4180 quoting). For Phase 2 the surface is small enough that hand-rolling is acceptable. **Recommendation: hand-roll** — papaparse is 30KB for one use site. |

**shadcn/ui components** (added via CLI, not a dep): button, input, label, textarea, select, table, dialog, alert-dialog, dropdown-menu, form, tabs, toast (via sonner), card, badge, sheet, tooltip, switch, checkbox, separator. Run once: `pnpm dlx shadcn@latest init` (Slate or Zinc), then `pnpm dlx shadcn@latest add <names>`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled DataTable + nuqs | Refine, react-admin, Tremor | STACK.md §Admin UI explicitly rejects all three: Refine fights custom editors (per-locale tabs, spec-schema designer); react-admin looks dated; Tremor is dashboards not CRUD. |
| `papaparse` for CSV | Hand-rolled writer | Single use site → hand-roll. |
| `@dnd-kit/sortable` for media reorder | `react-beautiful-dnd` (deprecated), `framer-motion` Reorder | dnd-kit is the active maintained pick; React 19 / RSC-friendly. |
| `nuqs` for URL state | Plain `useSearchParams` + `router.replace` | Non-trivial type safety + parser composition. nuqs is mandated by STACK.md. |
| `@hookform/resolvers/zod` | Custom resolver | Standard idiom. |
| Drizzle WS Pool client (`dbTx`) | Drizzle HTTP client (`db`) for transactions | **HTTP driver does not support transactions** [VERIFIED: orm.drizzle.team/docs/connect-neon — "Querying over HTTP is faster for single, non-interactive transactions" + answeroverflow.com Drizzle Team thread "No transactions support in neon-http driver"]. Phase 2 mutations MUST use `dbTx`. |

**Installation (one-shot, Wave 1):**
```bash
pnpm add @tanstack/react-table nuqs @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label textarea select table dialog alert-dialog dropdown-menu form tabs card badge sheet tooltip switch checkbox separator
```

## Architecture Patterns

### System Architecture Diagram

```
                                        ┌─────────────────────┐
                                        │  Browser (admin)    │
                                        │ /[locale]/admin/*   │
                                        └──────────┬──────────┘
                                                   │ HTTP request
                                                   ▼
                                  ┌─────────────────────────────────┐
                                  │  Edge: proxy.ts (Next.js 16)    │
                                  │  • locale rewrite               │
                                  │  • admin gate (regex)           │
                                  │  • D-15: read sessions row,     │
                                  │    enforce 24h idle + 7d abs    │
                                  └──────────┬──────────────────────┘
                                             │ pass
                                             ▼
                          ┌──────────────────────────────────────────┐
                          │  Node: RSC tree                          │
                          │  /[locale]/admin/layout.tsx (sidebar)    │
                          │   ├─ /products  → DataTable (RSC)        │
                          │   ├─ /products/[id]/edit → ProductForm   │
                          │   │   (client island, RHF + tabs)        │
                          │   ├─ /categories, /manufacturers, ...    │
                          │   ├─ /audit  → DataTable (RSC)           │
                          │   └─ /submissions → DataTable + Export   │
                          └──────────┬───────────────────────────────┘
                                     │ user clicks Save
                                     ▼
                          ┌──────────────────────────────────────────┐
                          │  Server Action (Node, 'use server')      │
                          │  1. requireAdmin() — D-15 abs cap check  │
                          │  2. Zod parse(form input)                │
                          │  3. dbTx.transaction(async (tx) => {     │
                          │       a. UPSERT base entity              │
                          │       b. UPSERT 3 translation rows       │
                          │       c. spec values: DELETE + INSERT    │
                          │       d. UPSERT MT flag rows             │
                          │       e. INSERT audit_log row            │
                          │     })                                   │
                          │  4. revalidateTag(...)  // many tags     │
                          │  5. return { ok: true }                  │
                          └──────────┬─────────────────┬─────────────┘
                                     │                  │
                              SQL ▼                     ▼ Cache
                  ┌─────────────────────┐    ┌────────────────────┐
                  │ Neon Postgres       │    │ Next.js cache layer│
                  │ (eu-central-1)      │    │ tags fan out:      │
                  │ • dbTx via WS Pool  │    │  product:<id>      │
                  │ • db via HTTP       │    │  category:<id>     │
                  │   (single reads)    │    │  sitemap, ...      │
                  └─────────────────────┘    └────────────────────┘

  Out-of-band:
                  ┌─────────────────────────────────────────────┐
                  │  Cloudinary (browser ↔ Cloudinary direct)   │
                  │  CldUploadWidget → /api/cloudinary/sign     │
                  │  → cloudinary.com/upload → public_id        │
                  │  → form state                               │
                  └─────────────────────────────────────────────┘

  CI (GitHub Actions on PR):
                  ┌─────────────────────────────────────────────┐
                  │  Wait for Vercel preview ready              │
                  │  Playwright spec: admin-edit-revalidates    │
                  │   (login → edit → reload public → assert)   │
                  └─────────────────────────────────────────────┘
```

**Reading the diagram:** trace the primary use case (admin edits a product) by following the arrows: Browser → Edge proxy gate → Node RSC → Server Action → Neon (write) + Cache (invalidate) → response. Cloudinary is out-of-band: it never touches Vercel-hosted code. CI is independent: it asserts the whole flow over HTTP against a deployed preview.

### Recommended Project Structure (additive to Phase 1)

```
src/
├── app/[locale]/admin/
│   ├── layout.tsx               # sidebar shell (Phase 2 NEW; replaces Phase-1 stub)
│   ├── page.tsx                 # dashboard (recent activity)
│   ├── products/
│   │   ├── page.tsx             # DataTable (server-paginated)
│   │   ├── new/page.tsx         # ProductForm (RHF, 3-tab)
│   │   └── [id]/edit/page.tsx
│   ├── categories/page.tsx
│   ├── categories/[id]/edit/page.tsx
│   ├── manufacturers/...
│   ├── spec-fields/             # per-category schema editor
│   ├── submissions/page.tsx     # contact inbox + CSV export
│   ├── audit/page.tsx           # audit log viewer
│   └── admins/                  # invite + list
├── app/api/
│   └── cloudinary/sign/route.ts # exists from Phase 1
├── components/admin/
│   ├── data-table.tsx           # generic DataTable<TData>
│   ├── locale-tabs.tsx          # 3-tab swap component for forms
│   ├── translation-completeness.tsx
│   ├── machine-translated-toggle.tsx
│   ├── media-uploader.tsx       # CldUploadWidget wrapper + dnd-kit
│   ├── slug-input.tsx           # auto-generate + override
│   └── confirm-dialog.tsx
├── lib/
│   ├── audit.ts                 # logAudit()
│   ├── revalidation.ts          # typed tag helpers
│   ├── require-admin.ts         # already in lib/auth.ts; consider extracting
│   ├── csv.ts                   # 30-line CSV writer (UTF-8 BOM + RFC4180)
│   └── server-action.ts         # withAdminAction wrapper (auth + zod + audit)
├── actions/
│   ├── products.ts              # 'use server' product CRUD + duplicate
│   ├── categories.ts
│   ├── manufacturers.ts
│   ├── spec-fields.ts           # rename, soft-delete, hard-delete
│   ├── spec-field-groups.ts
│   ├── admins.ts                # invite, deactivate
│   └── submissions.ts           # mark-read, export-csv
├── db/schema/
│   ├── admin.ts                 # +admin_invite (Phase 2 ADD)
│   ├── auth.ts                  # +sessions.created_at (Phase 2 ADD if missing)
│   ├── products.ts              # +product.status (or keep publishedAt — see Open Q)
│   ├── spec-fields.ts           # +deleted_at, +group_id (Phase 2 ADD)
│   ├── spec-field-groups.ts     # NEW (Phase 2)
│   ├── translation-flags.ts     # NEW (Phase 2)
│   └── views/
│       └── product-translation-completeness.ts  # pgView with sql`...`
└── emails/
    └── admin-invite.tsx         # React Email template (NEW)
```

### Pattern 1: Server Action for translatable entities (the marquee pattern)

**What:** Every admin write Server Action follows the exact same shape. The only thing that varies is the entity-specific Drizzle calls inside the transaction.

**When to use:** Every CRUD mutation. ADMIN-03/04/05/06/08/11.

**Example:**
```typescript
// src/actions/products.ts
'use server';

import { revalidateTag } from 'next/cache';
import { eq } from 'drizzle-orm';
import { dbTx } from '@/db/client-ws';                // ← WS pool client (transactions)
import { products, productTranslations } from '@/db/schema';
import { productSpecValues } from '@/db/schema/spec-values';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { revalidateProduct } from '@/lib/revalidation';
import { productInsertSchema } from '@/lib/zod/product';

export async function saveProduct(input: unknown) {
  const session = await requireAdmin();              // D-15 enforces 7d cap
  const parsed = productInsertSchema.parse(input);   // throws ZodError
  const before = parsed.id
    ? await dbTx.select().from(products).where(eq(products.id, parsed.id)).limit(1)
    : null;

  const result = await dbTx.transaction(async (tx) => {
    // 1. base entity
    const [row] = parsed.id
      ? await tx.update(products).set({ /* ... */ }).where(eq(products.id, parsed.id)).returning()
      : await tx.insert(products).values({ /* ... */ }).returning();

    // 2. three translation rows
    for (const locale of ['uz', 'ru', 'en'] as const) {
      const t = parsed.translations[locale];
      await tx.insert(productTranslations)
        .values({ productId: row.id, locale, ...t })
        .onConflictDoUpdate({
          target: [productTranslations.productId, productTranslations.locale],
          set: t,
        });
    }

    // 3. spec values: replace-on-save
    await tx.delete(productSpecValues).where(eq(productSpecValues.productId, row.id));
    if (parsed.specValues.length) {
      await tx.insert(productSpecValues).values(
        parsed.specValues.map((v) => ({ productId: row.id, ...v }))
      );
    }

    // 4. audit (inside the same tx — atomic with the mutation)
    await logAudit(tx, {
      actorEmail: session.user.email!,
      action: parsed.id ? 'update' : 'create',
      entityType: 'product',
      entityId: row.id,
      before: before?.[0] ?? null,
      after: row,
    });

    return row;
  });

  // 5. cache invalidation AFTER commit (NEVER inside the tx — can't roll back)
  await revalidateProduct(result.id);

  return { ok: true, id: result.id };
}
```

Source: composes ARCHITECTURE.md §Pattern 6 + Phase-1 `src/lib/auth.ts` `requireAdmin()` + Drizzle `dbTx.transaction` API [VERIFIED: orm.drizzle.team/docs/connect-neon WebSocket section].

**Notes:**
- `requireAdmin()` already exists in Phase 1 and enforces D-15. Use it as-is.
- `revalidateTag` MUST run **after** `tx.commit` returns, never inside the transaction (rolling back the DB does not roll back cache invalidations; calling revalidate on rollback would create stale-cache leaks).
- The `before` snapshot for audit is read OUTSIDE the transaction (small inefficiency: one extra read) so we don't need to bundle a SELECT-inside-the-tx pattern. Acceptable; admin write throughput is low.
- `dbTx` (WS Pool) handles `tx.transaction` natively. **Do not** import `db` from `src/db/client.ts` here.

### Pattern 2: Auth.js session enforcement on Edge (proxy.ts)

**What:** Phase 1 already has a proxy.ts admin gate that checks `req.auth` (cookie presence). Phase 2 extends it with **DB-row-level** D-15 checks (24h idle + 7d absolute) so the cookie alone isn't trusted.

**When to use:** All `/[locale]/admin/*` paths.

**Example:**
```typescript
// proxy.ts (Phase 2 extension of Phase 1)
import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';
import { routing } from '@/i18n/routing';
// NOTE: cannot import dbTx here — Edge runtime has no Node net/fs.
// Use neon HTTP fetch directly instead — Neon HTTP works on Edge.
import { neon } from '@neondatabase/serverless';

const handleI18nRouting = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export const proxy = auth(async function middleware(req) {
  const { pathname } = req.nextUrl;
  const isAdminPath = /^\/(uz|ru|en)\/admin(\/|$)/.test(pathname);

  if (isAdminPath) {
    if (!req.auth) {
      const locale = pathname.split('/')[1] || 'uz';
      return Response.redirect(new URL(`/${locale}/login`, req.url), 307);
    }

    // D-15 absolute 7d cap. Cookie carries sessionToken; we look up the row.
    const sessionToken = req.cookies.get(
      process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token'
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
        : true;
      if (!row || !expiresOk || !absOk) {
        const locale = pathname.split('/')[1] || 'uz';
        const res = Response.redirect(new URL(`/${locale}/login`, req.url), 307);
        res.headers.append('Set-Cookie', '__Secure-authjs.session-token=; Path=/; Max-Age=0');
        res.headers.append('Set-Cookie', 'authjs.session-token=; Path=/; Max-Age=0');
        return res;
      }
    }
  }

  return handleI18nRouting(req);
});

export const config = { matcher: ['/((?!api|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'] };
```

**Notes:**
- Phase-1 sessions table already has `absoluteExpires` populated lazily by the `session()` callback in `src/lib/auth.ts`. The middleware here just reads it.
- The Neon HTTP `neon()` driver works on the Edge runtime; the WebSocket driver does NOT (no native ws on Edge). Direct DB access from middleware is correct here because we cannot import `@/db/client` (which imports `@/env`, which is a Node module).
- One DB roundtrip per admin request (~30ms cold from `fra1` → `eu-central-1`). Acceptable per Phase 1 D-15 rationale.
- Discrepancy with CONTEXT D-15 step 3: D-15 says "reject if `sessions.created_at < now() - 7d`". The Phase-1 schema has `absoluteExpires` (a timestamp = creation+7d), not `created_at`. **Use `absoluteExpires`** — it's already populated, fewer reads, zero schema change. Only add `sessions.created_at` if Phase 2 also wants to display admin "session created at" anywhere; D-15 itself does NOT require it.

[VERIFIED via inspection: src/db/schema/auth.ts has `absoluteExpires` column; src/lib/auth.ts session() callback already populates it on first read.]

### Pattern 3: Cloudinary signed direct upload via CldUploadWidget

**What:** The widget is a pre-built Cloudinary uploader that calls our `/api/cloudinary/sign` endpoint, uploads bytes to Cloudinary, and gives us back the `public_id`. The browser hits Cloudinary directly; Vercel never sees the file bytes.

**When to use:** ADMIN-04 logo upload, ADMIN-07 product images + datasheets.

**Example (image upload, multi):**
```tsx
// src/components/admin/media-uploader.tsx
'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { useFieldArray } from 'react-hook-form';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function MediaUploader({ control, name }: { control: Control<FormShape>; name: 'imagePublicIds' }) {
  const { fields, append, remove, move } = useFieldArray({ control, name });

  return (
    <>
      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        options={{
          multiple: true,
          maxFiles: 10,
          folder: 'products',
          resourceType: 'image',
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
          maxFileSize: 10 * 1024 * 1024,         // 10 MB
          sources: ['local', 'url'],
        }}
        onSuccess={(result) => {
          if (typeof result.info === 'object' && 'public_id' in result.info) {
            append({ publicId: result.info.public_id });
          }
        }}
      >
        {({ open }) => <Button type="button" onClick={() => open()}>Add images</Button>}
      </CldUploadWidget>

      <DndContext collisionDetection={closestCenter} onDragEnd={(e) => {/* arrayMove via move(...) */}}>
        <SortableContext items={fields.map((f) => f.id)} strategy={rectSortingStrategy}>
          {fields.map((f, i) => <SortableTile key={f.id} id={f.id} index={i} onRemove={() => remove(i)} publicId={f.publicId} />)}
        </SortableContext>
      </DndContext>
    </>
  );
}
```

**For PDF uploads (ADMIN-07 datasheet):** swap `resourceType: 'auto'` (Cloudinary infers from upload) AND add `clientAllowedFormats: ['pdf']`. Or `resourceType: 'raw'` for non-image arbitrary files. The widget's `result.info.resource_type` field tells you what came back.

**Sign endpoint signature contract:** the existing `/api/cloudinary/sign` signs `{ timestamp, folder }`. CldUploadWidget POSTs additional params (`upload_preset`, `source`, `tags`...) automatically; **the server signature must include every param Cloudinary will receive in the upload form, otherwise Cloudinary rejects with "Invalid Signature."** [VERIFIED: cloudinary.com/documentation/upload_widget; CITED: next.cloudinary.dev/clduploadwidget/signed-uploads]. Phase 2 may need to widen the sign endpoint to accept more `paramsToSign` from the widget; the current shape works only for `{ folder, timestamp }`. **Action item for Wave 1: spike a smoke upload, verify the widget calls the sign endpoint with no extra params; if it sends extra, widen the endpoint.**

Source: [CITED: next.cloudinary.dev/clduploadwidget/signed-uploads, next.cloudinary.dev/clduploadwidget/configuration]

### Pattern 4: Reusable DataTable with TanStack + nuqs

**What:** A generic `DataTable<TData, TValue>` component that owns sort/filter/pagination state in the URL via nuqs. Server-side pagination by default for the products table (will grow); client-side acceptable for spec-fields + categories (small N).

**When to use:** All list pages (D-17).

**Example skeleton:**
```tsx
// src/components/admin/data-table.tsx
'use client';

import { ColumnDef, flexRender, getCoreRowModel, useReactTable, PaginationState } from '@tanstack/react-table';
import { useQueryStates, parseAsInteger, parseAsString } from 'nuqs';

export function DataTable<TData>({
  columns,
  data,
  rowCount,
  onPageChange,
}: {
  columns: ColumnDef<TData>[];
  data: TData[];
  rowCount: number;
  onPageChange?: (s: PaginationState) => void;
}) {
  const [{ page, pageSize, q }, setQuery] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(20),
    q: parseAsString.withDefault(''),
  });

  const pagination = { pageIndex: page - 1, pageSize };
  const table = useReactTable({
    data,
    columns,
    rowCount,
    state: { pagination, globalFilter: q },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setQuery({ page: next.pageIndex + 1, pageSize: next.pageSize });
    },
    getCoreRowModel: getCoreRowModel(),
  });

  // ...render
}
```

**Server-side pagination (RSC parent):**
```tsx
// app/[locale]/admin/products/page.tsx
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; pageSize?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const size = Number(sp.pageSize ?? 20);
  const [rows, [{ count }]] = await Promise.all([
    db.select(...).from(products).limit(size).offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(products),
  ]);
  return <DataTable columns={...} data={rows} rowCount={Number(count)} />;
}
```

[CITED: medium.com/@destiya.dian/shadcn-datatable-server-side-pagination, data-table.openstatus.dev, nuqs.dev/docs/parsers/community/tanstack-table]

**`<NuqsAdapter>` wrapping:** Next 16 + nuqs requires wrapping the app in `<NuqsAdapter>` from `nuqs/adapters/next/app` in `app/[locale]/layout.tsx` or higher. Skipping this surfaces as "nuqs requires an adapter to work" runtime error [CITED: github.com/47ng/nuqs/issues/1263].

### Pattern 5: Single RHF instance with three-locale tabs

**What:** One `useForm` call, one Zod schema, nested object structure `{ translations: { uz, ru, en }, ... }`. Tabs are pure UI; switching does not save. A single `<form action={saveProduct}>` submits everything.

**When to use:** ADMIN-03/04/05/06.

**Zod schema shape:**
```typescript
const localeFields = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  shortDesc: z.string().optional(),
  longDesc: z.string().optional(),
});

export const productInsertSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  manufacturerId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published']),
  translations: z.object({ uz: localeFields, ru: localeFields, en: localeFields }),
  specValues: z.array(z.object({ /* ... */ })),
  imagePublicIds: z.array(z.string()),
  datasheetPublicIds: z.array(z.string()),
  // MT flags
  mtFlags: z.object({
    uz: z.record(z.string(), z.boolean()).optional(),
    ru: z.record(z.string(), z.boolean()).optional(),
    en: z.record(z.string(), z.boolean()).optional(),
  }),
});
```

**Per-tab error display:**
```tsx
const { formState: { errors } } = useForm({ resolver: zodResolver(productInsertSchema) });

const errorCount = (locale: 'uz' | 'ru' | 'en') =>
  Object.keys(errors.translations?.[locale] ?? {}).length;

<TabsList>
  {(['uz', 'ru', 'en'] as const).map((l) => (
    <TabsTrigger key={l} value={l}>
      {l.toUpperCase()}
      {errorCount(l) > 0 && <Badge variant="destructive">{errorCount(l)}</Badge>}
    </TabsTrigger>
  ))}
</TabsList>
```

**Per-tab `%` completeness without re-validating:**
```tsx
import { useWatch } from 'react-hook-form';

function CompletenessBar({ control, locale }: { control: Control<...>; locale: 'uz'|'ru'|'en' }) {
  const t = useWatch({ control, name: `translations.${locale}` });
  const filled = ['name', 'shortDesc', 'longDesc', 'slug'].filter((k) => Boolean(t?.[k])).length;
  const pct = Math.round((filled / 4) * 100);
  return <Progress value={pct} />;
}
```

`useWatch` with `name` scoped to the locale recomputes only when that locale's fields change, not the whole form.

[CITED: react-hook-form.com/docs/useform; CITED: github.com/orgs/react-hook-form/discussions/10010]

### Pattern 6: SQL view for translation completeness

**What:** A Postgres view that the RSC product list joins for the per-locale completeness percentage. Drizzle supports declaring views in schema; drizzle-kit generates the `CREATE VIEW` migration.

**When to use:** ADMIN-10.

**Drizzle declaration:**
```typescript
// src/db/schema/views/product-translation-completeness.ts
import { pgView, text, uuid, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productTranslationCompleteness = pgView('product_translation_completeness', {
  productId: uuid('product_id').notNull(),
  locale: text('locale').notNull(),
  percent: integer('percent').notNull(),
}).as(sql`
  WITH base AS (
    SELECT pt.product_id, pt.locale,
           (CASE WHEN pt.name        IS NOT NULL AND length(pt.name)        > 0 THEN 1 ELSE 0 END +
            CASE WHEN pt.short_desc  IS NOT NULL AND length(pt.short_desc)  > 0 THEN 1 ELSE 0 END +
            CASE WHEN pt.long_desc   IS NOT NULL AND length(pt.long_desc)   > 0 THEN 1 ELSE 0 END +
            CASE WHEN pt.slug        IS NOT NULL AND length(pt.slug)        > 0 THEN 1 ELSE 0 END) AS filled,
           4 AS total
      FROM product_translations pt
  )
  SELECT product_id, locale, ROUND(filled::numeric / NULLIF(total,0) * 100)::int AS percent
    FROM base
`);
```

**Notes:**
- Phase-2 v1 view: 4-base-fields only. Including the typed text spec values requires a JOIN; do as a v1.1 follow-up if perf permits.
- The view is non-materialized; reads are recomputed on each query. With ~100–500 products, this is sub-millisecond.
- drizzle-kit will emit `CREATE VIEW` in the next `pnpm db:generate` run.

Source: [CITED: orm.drizzle.team/docs/views — explicit `pgView('...').as(sql\`...\`)` pattern]

### Pattern 7: Cache tag fan-out with the Next 16 caching API

**What:** `unstable_cache` is replaced by `'use cache'` directive in Next.js 16. `revalidateTag` requires a 2nd `cacheLife` argument now (single-argument form is deprecated and TS-errors).

**When to use:** Every public read in Phase 3 will be tagged. Phase 2 only WRITES tags (does not read public pages itself), so the focus is the `revalidateTag(...)` calls in mutation handlers.

**Example (Phase 2 helper):**
```typescript
// src/lib/revalidation.ts
import { revalidateTag } from 'next/cache';

// Per-entity
export async function revalidateProduct(id: string) {
  await revalidateTag(`product:${id}`, 'max');
  await revalidateTag('products-list', 'max');
  await revalidateTag('sitemap', 'max');
}

export async function revalidateCategoryMove(oldParentId: string | null, newParentId: string | null, movedId: string) {
  if (oldParentId) await revalidateTag(`category:${oldParentId}`, 'max');
  if (newParentId) await revalidateTag(`category:${newParentId}`, 'max');
  await revalidateTag(`category:${movedId}`, 'max');
  await revalidateTag('categories-tree', 'max');
  await revalidateTag('sitemap', 'max');
}

export async function revalidateManufacturer(id: string) { /* ... */ }
export async function revalidateSpecField(id: string, categoryId: string) { /* ... */ }
```

**Example (Phase 3 reader, for reference):**
```typescript
// app/[locale]/products/[slug]/page.tsx — Phase 3 file, NOT Phase 2
import { unstable_cacheTag as cacheTag } from 'next/cache';

async function getProduct(slug: string, locale: string) {
  'use cache';
  cacheTag(`product:${slug}`, `products-list`);
  return await db.select(...).from(products)...;
}
```

**The discriminator:** Phase 2 only emits tags via `revalidateTag(...)`. The matching `cacheTag()` calls live in Phase 3 readers. Phase 2 plans **must use the new 2-argument `revalidateTag` form** to typecheck against Next 16.

Sources: [VERIFIED: nextjs.org/docs/app/api-reference/directives/use-cache; nextjs.org/docs/app/api-reference/functions/revalidateTag; nextjs.org/blog/next-16; nextjs.org/docs/app/guides/upgrading/version-16]

### Anti-Patterns to Avoid

- **Importing `db` (HTTP client) into a Server Action that wraps multiple statements in `db.transaction(...)`** → runtime "No transactions support in neon-http driver" exception. Always use `dbTx`.
- **Calling `revalidateTag` inside `dbTx.transaction(...)`** → cache invalidations are not transactional; if the tx rolls back, the cache is wrongly invalidated. Always call AFTER `tx.commit` returns.
- **Per-field fallback in admin display** → PITFALLS #12. We render fallback at the page level (Phase 3); admin shows raw `null` for missing translations (so % indicators are honest).
- **Hand-rolling JSON CRUD endpoints under `/api/`** → Server Actions are the standard for admin writes (ARCHITECTURE.md §Pattern 6). `/api/` is reserved for Cloudinary sign + Auth.js callbacks + the OPS-01 webhook surface (none added in Phase 2).
- **Custom upload route that proxies file bytes** → Cloudinary direct upload is mandated. PROJECT.md + CLAUDE.md.
- **Boolean `machine_translated` columns scattered across translation tables** → blocks v2 "needs_review" flag. Use the sibling `*_translation_field_flags` shape (D-05 default).
- **Hard-deleting a `spec_field` that has `product_spec_values` rows without confirmation** → PITFALLS #14. D-07 enforces a confirmation modal with affected count.
- **Storing the Auth.js session token client-side** → already mitigated by httpOnly cookie. Do not augment this; the `sessionToken` value flowed onto the Session in Phase 1 is server-only (via `declare module 'next-auth'`).
- **Running drizzle-kit `db:push` against production** → CLAUDE.md forbids it. Phase 2 schema changes ship via `db:generate` → review → `db:migrate` against `DATABASE_URL_DIRECT` (Vercel build hook).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Headless table state (sort/filter/page) | Custom hooks | `@tanstack/react-table` v8 | Battle-tested; STACK.md mandate. |
| URL-state sync | `useSearchParams` + manual setters | `nuqs` | Type-safe parsers, batched updates, SSR-correct. STACK.md mandate. |
| Drag-drop reorder | HTML5 DnD + custom listeners | `@dnd-kit/sortable` | Accessibility, keyboard support, React 19 friendly. |
| Cloudinary upload UI | Custom multipart form | `<CldUploadWidget>` from `next-cloudinary` | Cloudinary widget handles signature, retries, format negotiation, multi-file. |
| Magic-link auth flow | Custom token table + cookie crypto | Auth.js v5 (already wired) | Phase 1 already shipped this. |
| DrizzleAdapter for Auth.js | Custom session lookups | `@auth/drizzle-adapter` (already wired) | — |
| Form state | useState boilerplate | `react-hook-form` + Zod resolver | STACK.md mandate. |
| Email rendering | Inline strings | `react-email` (already wired) | Phase 1 has a magic-link template; just sibling-add `admin-invite.tsx`. |
| CSV writing | Hand-rolled escape | Hand-roll a 30-line writer; or `papaparse` | Single use site → hand-roll preferred. The trap is forgetting UTF-8 BOM for Excel + RFC 4180 quoting. |
| Postgres view migrations | Manual SQL files | `drizzle-orm` `pgView('...').as(sql\`...\`)` + `drizzle-kit generate` | Schema source-of-truth stays in TS. |
| Image transformation URLs | Manual string concat | `<CldImage>` from `next-cloudinary` (Phase 3 mostly; admin thumbnails Phase 2) | PITFALLS #11. |

**Key insight:** Manometr's admin is a thin orchestration layer over a deep stack. Most of the "interesting" work is in three places — (1) the marquee Server Action transaction shape, (2) the spec-schema editor mechanics, and (3) the OPS-01 e2e gate. Everything else is wiring proven libraries together.

## Runtime State Inventory

> Phase 2 is greenfield additive (new tables, new code, new routes). It does not rename or refactor existing entities. Most categories are blank by intent; this section is included for the planner to verify nothing was missed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None (no rename of existing entities). The single design point is the `publishedAt` vs `status` discrepancy (see Open Questions §1) — if Phase 2 adopts `status`, existing rows have NULL `publishedAt` and need backfilled `status='draft'`. | Decide in plan: A (keep `publishedAt`) avoids data migration; B (add `status`) requires a one-line backfill `UPDATE product SET status = CASE WHEN published_at IS NULL THEN 'draft' ELSE 'published' END` in the Phase-2 migration. |
| Live service config | None — no external SaaS state. Resend domain + Cloudinary credentials are Phase-1 wired. | None. |
| OS-registered state | None — no Windows Task Scheduler / pm2 / launchd / systemd. Vercel-hosted only. | None. |
| Secrets/env vars | Phase 2 reuses existing env vars. No new secrets required: Resend API key, Cloudinary trio, Neon URLs, Auth.js secret, Sentry trio — all installed in Phase 1. | None. **Verify:** `BOOTSTRAP_ADMIN_EMAIL` is still set in Vercel; the boot hook is harmless if also set when admins exist. |
| Build artifacts / installed packages | None — no installed CLI tools or compiled binaries. Phase 2 only adds npm dependencies. | Run `pnpm install` after package.json changes; rerun `drizzle-kit generate` after schema changes. |

## Common Pitfalls

### Pitfall 1: Wrong Drizzle client (HTTP vs WS) in Server Actions
**What goes wrong:** Server Action wraps writes in `db.transaction(async (tx) => {...})` using the HTTP `db` client. At runtime, the first form submit fails with `"No transactions support in neon-http driver"`.
**Why it happens:** Phase 1 ships two clients; the canonical "import from `@/db/client`" pattern picks the HTTP client by default.
**How to avoid:** Phase 2 mutation Server Actions import from `@/db/client-ws` (`dbTx`), not `@/db/client` (`db`). Add an ESLint rule (`no-restricted-imports`) on `src/actions/**` that blocks `@/db/client` and steers to `@/db/client-ws`. Lint failure = "use dbTx for mutations."
**Warning signs:** Server Action throws on save in dev; tests pass locally but break on Vercel.
[VERIFIED: orm.drizzle.team/docs/connect-neon — HTTP driver does not support transactions]

### Pitfall 2: revalidateTag inside the transaction
**What goes wrong:** Cache is invalidated even though the DB rolled back. Public pages briefly serve refetched stale data.
**Why it happens:** Developer puts `revalidateTag` inside `tx => { ... }` for "atomicity."
**How to avoid:** Convention: revalidate calls live AFTER `await dbTx.transaction(...)` returns. Code review checklist + a unit test asserting that `revalidateTag` is not called when the tx throws.
**Warning signs:** Public page is briefly empty after a save error.

### Pitfall 3: Forgotten cache tag (the OPS-01 silent failure)
**What goes wrong:** Admin updates a product's category. The product page rebuilds. The OLD category page still shows the product. The NEW category page does not show it.
**Why it happens:** Mutation calls `revalidateProduct(id)` but not `revalidateCategoryProducts(oldCatId)` and `revalidateCategoryProducts(newCatId)`.
**How to avoid:** D-12 helper `revalidateCategoryMove(oldParentId, newParentId, movedId)` documents the fan-out. The OPS-01 Playwright test asserts old-category page no longer lists the moved product. Make the helper take BOTH ids; never let the caller pass one.
**Warning signs:** "Why does the old category still show this product?" support ticket.
(See PITFALLS #14 + ARCHITECTURE.md §Pattern 6.)

### Pitfall 4: Admin invite email replay
**What goes wrong:** A leaked invite link is reused after the invitee already accepted. New attacker creates a session.
**Why it happens:** Token-consume query is non-atomic ("SELECT then UPDATE").
**How to avoid:** Single atomic UPDATE: `UPDATE admin_invite SET used_at = now() WHERE token = $1 AND used_at IS NULL AND expires_at > now() RETURNING email`. If 0 rows returned, reject. (D-14 specifies this contract.)
**Warning signs:** Audit log shows two `'invite-accept'` rows for the same token.

### Pitfall 5: Cloudinary signature mismatch
**What goes wrong:** The widget sends `upload_preset` or `tags` with the upload, but our sign endpoint only signed `{ folder, timestamp }`. Cloudinary returns 401 "Invalid Signature."
**Why it happens:** The signature must cover EVERY parameter Cloudinary will receive.
**How to avoid:** Either (a) sign the full param set the widget produces (server endpoint reads `req.body.paramsToSign` and signs it), or (b) lock the widget to a tight option set so the only signed param is `{ folder, timestamp }`. Phase-1 sign endpoint takes (b) approach. **Action item:** Wave 1 smoke test confirms the widget's actual upload params match the signed set.
[VERIFIED: cloudinary.com/documentation/upload_widget — "every parameter must be signed"]

### Pitfall 6: Per-field fallback in admin display
**What goes wrong:** Admin list shows mix of UZ/RU/EN values for the same product depending on which translation exists, hiding gaps.
**Why it happens:** Developer adds "if missing UZ, fall back to RU" to the admin query for "convenience."
**How to avoid:** Admin queries return raw `null` for missing translations. Fallback policy lives in Phase 3 public reads only. The completeness % indicator surfaces gaps.
(PITFALLS #12.)

### Pitfall 7: Spec-field type change attempt
**What goes wrong:** Admin tries to change `data_type` from `text` to `enum`. Existing values like "Stainless 304" cannot map to enum keys without manual review. Silent corruption if the change goes through.
**Why it happens:** Schema editor doesn't enforce immutability.
**How to avoid:** D-08: type dropdown disables after first save. The "create new field + copy values + soft-delete old" workflow is the documented escape hatch.
(PITFALLS #14.)

### Pitfall 8: TanStack Table client-side sort over server-paginated rows
**What goes wrong:** With 1,000 products the products table loads 20 rows server-side (page 1) but client-side sort tries to sort just those 20 — looking like a bug. User clicks a column header and only the visible 20 reorder.
**Why it happens:** Default TanStack pagination is client-side; mixing modes.
**How to avoid:** Server-paginated tables MUST set `manualPagination: true, manualSorting: true, manualFiltering: true` and pipe sort/filter through nuqs → URL → server reads them. Smaller tables (categories, spec-fields) stay client-side.

### Pitfall 9: Missing UTF-8 BOM in CSV export
**What goes wrong:** Excel opens the export and renders `oʻ`/`gʻ`/Cyrillic as mojibake. Content team reports "the export is broken."
**Why it happens:** Excel guesses encoding and picks Windows-1252 unless a BOM (`﻿`) leads the file.
**How to avoid:** Prepend `﻿` to the response body. RFC 4180 quote any field containing `,`, `"`, `\n`, or starting with `=` (Excel formula injection).

### Pitfall 10: nuqs adapter missing in Next 16
**What goes wrong:** Runtime error "nuqs requires an adapter."
**Why it happens:** App Router + nuqs 2.x requires `<NuqsAdapter>` wrapping.
**How to avoid:** Add `<NuqsAdapter>` from `nuqs/adapters/next/app` in `app/[locale]/layout.tsx` (or `app/layout.tsx`).
[CITED: github.com/47ng/nuqs/issues/1263]

### Pitfall 11: Playwright auth bypass on Vercel preview
**What goes wrong:** OPS-01 spec hangs on the Vercel "Authentication required" page. Default Vercel Pro has Deployment Protection enabled.
**Why it happens:** `vercel-preview` auth gate.
**How to avoid:** Disable Deployment Protection on previews from the project settings, OR use Vercel's Protection Bypass for Automation token (set `x-vercel-protection-bypass` header in Playwright). Document the choice in the PR for the OPS-01 workflow.
[CITED: github.com/vercel/vercel/discussions/10871]

### Pitfall 12: Magic-link inbox in CI
**What goes wrong:** OPS-01 spec calls Resend, but no inbox to read the link from.
**Why it happens:** Resend send-only API.
**How to avoid:** Three options, ordered by maintenance cost:
- **DB-direct token consumption (recommended):** the CI Playwright spec reads `verification_tokens` from Neon directly (we already have the `dbTx` and creds), grabs the token, constructs the magic-link URL, and follows it. Bypasses Resend entirely. Simplest. Production isn't touched.
- **Mailosaur** (~$10/mo) — disposable inbox API; spec polls for the email. More realistic but adds a vendor.
- **Resend test mode** — `delivered_at` mock + webhook callback. Heavier setup.
**Recommendation:** DB-direct. The OPS-01 spec is testing revalidation, not Resend deliverability.
[CITED: resend.com/docs/knowledge-base/end-to-end-testing-with-playwright + mailslurp.com/guides/test-next-auth-magic-links]

## Code Examples

### Audit log helper (atomic with the mutation)
```typescript
// src/lib/audit.ts
import { auditLog } from '@/db/schema';
import type { Tx } from '@/db/types';   // alias for Drizzle WS Pool tx

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'publish' | 'unpublish'
  | 'invite' | 'duplicate_product'
  | 'rename_spec_field' | 'soft_delete_spec_field' | 'delete_spec_field'
  | 'login' | 'logout' | 'session_revoked';

export async function logAudit(tx: Tx, args: {
  actorEmail: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip?: string;
  userAgent?: string;
}) {
  await tx.insert(auditLog).values({
    actorEmail: args.actorEmail,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    beforeJson: args.before as Record<string, unknown> | null,
    afterJson: args.after as Record<string, unknown> | null,
    ip: args.ip,
    userAgent: args.userAgent,
  });
}
```

### withAdminAction wrapper (DRY for every Server Action)
```typescript
// src/lib/server-action.ts
import { headers } from 'next/headers';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';

export function withAdminAction<I, O>(
  schema: z.ZodSchema<I>,
  handler: (input: I, ctx: { actorEmail: string; ip: string; userAgent: string }) => Promise<O>,
) {
  return async (raw: unknown): Promise<{ ok: true; data: O } | { ok: false; error: string }> => {
    try {
      const session = await requireAdmin();
      const input = schema.parse(raw);
      const h = await headers();
      const data = await handler(input, {
        actorEmail: session.user!.email!,
        ip: h.get('x-forwarded-for') ?? 'unknown',
        userAgent: h.get('user-agent') ?? 'unknown',
      });
      return { ok: true, data };
    } catch (err) {
      console.error('admin-action', err);
      return { ok: false, error: err instanceof z.ZodError ? 'validation' : 'unauthorized' };
    }
  };
}
```

### CSV writer (hand-rolled, ~30 lines)
```typescript
// src/lib/csv.ts
const NEEDS_QUOTE = /[",\n=]/;
function field(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (NEEDS_QUOTE.test(s) || s.startsWith(' ') || s.endsWith(' ')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
export function toCsv<T extends Record<string, unknown>>(rows: T[], cols: (keyof T)[]): string {
  const head = cols.map(field).join(',');
  const body = rows.map((r) => cols.map((c) => field(r[c])).join(',')).join('\r\n');
  return '﻿' + head + '\r\n' + body;          // UTF-8 BOM for Excel
}
```

### Admin invite Server Action
```typescript
// src/actions/admins.ts
'use server';
import { adminUsers, adminInvites } from '@/db/schema';
import { dbTx } from '@/db/client-ws';
import { Resend } from 'resend';
import { AdminInviteEmail } from '@/emails/admin-invite';
import { withAdminAction } from '@/lib/server-action';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });

export const inviteAdmin = withAdminAction(schema, async ({ email }, { actorEmail }) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await dbTx.transaction(async (tx) => {
    await tx.insert(adminUsers).values({
      email, role: 'admin', active: false, invitedBy: actorEmail, invitedAt: new Date(),
    }).onConflictDoNothing();
    await tx.insert(adminInvites).values({ email, token, expiresAt, invitedBy: actorEmail });
    await logAudit(tx, {
      actorEmail, action: 'invite', entityType: 'admin_user', entityId: email,
      before: null, after: { email, expiresAt },
    });
  });

  const resend = new Resend(process.env.AUTH_RESEND_KEY!);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'You\'re invited to Manometr admin',
    react: AdminInviteEmail({ acceptUrl: `${process.env.NEXTAUTH_URL}/uz/invite/accept?token=${token}` }),
  });

  return { invited: email };
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unstable_cache(fn, [], { tags, revalidate })` | `'use cache'` directive + `cacheTag()` + `cacheLife()` | Next.js 16 (released late 2025) | Phase-2 PUBLIC readers (Phase 3) use the directive form. Phase-2 mutators only call `revalidateTag(tag, 'max')` — note 2nd arg required. |
| `revalidateTag(tag)` (single arg) | `revalidateTag(tag, cacheLifeProfile)` | Next.js 16 | Single-arg form deprecated; TS error in Next 16. Phase-2 mutation handlers MUST pass profile (`'max'` for most cases). |
| `unstable_cache` for tagged reads | `'use cache'` directive | Next.js 16 | Old API still exists for back-compat but is no longer the recommended path. |
| Dialog/Tabs from headless libs | shadcn/ui (Radix + Tailwind, copy-paste components) | Stable | Phase 2 adopts via `pnpm dlx shadcn@latest add`. |
| `react-table` v7 | `@tanstack/react-table` v8 | 2022 | v8 is headless + framework-agnostic. v9 in alpha; do not adopt. |
| `react-beautiful-dnd` | `@dnd-kit` | 2023 | rb-dnd unmaintained; dnd-kit is the standard. |
| Auth.js v4 NextAuth + Mongo/Prisma | Auth.js v5 + DrizzleAdapter | 2024 | Phase 1 already on v5. |
| Custom upload routes proxying file bytes | Cloudinary direct upload via signed widget | Stable | Phase 2 consumes Phase 1's sign endpoint; no proxy. |

**Deprecated/outdated:**
- `unstable_cache` — still works in Next 16 but TypeScript-deprecated; migrate to `'use cache'` for any NEW caching code (Phase 3 readers).
- `revalidateTag(tag)` 1-arg — TS error.
- `react-beautiful-dnd` — abandoned.
- `react-table` v7 — replaced by TanStack Table v8.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@dnd-kit/sortable` 10.0.0 works on React 19 (npm page predates React 19 release) | Standard Stack | Smoke-test on Wave-1 install. If broken, workarounds: `framer-motion` Reorder, manual HTML5 DnD. Low-risk; dnd-kit is RSC-friendly and React-version-agnostic by design. |
| A2 | Phase-1 `/api/cloudinary/sign` endpoint signs `{ folder, timestamp }` only; CldUploadWidget will accept this without sending unsigned extras | Pattern 3 + Pitfall 5 | Wave-1 smoke upload fails with "Invalid Signature." Fix by widening sign endpoint to read `paramsToSign` from request body. 30-line change; not a phase blocker. |
| A3 | Vercel Deployment Protection on previews is OFF (or planner adds the bypass-token step to OPS-01 workflow) | Pitfall 11 | Playwright spec hangs on Vercel auth wall. Fix: enable Protection Bypass for Automation in project settings. |
| A4 | Resend test mode is unnecessary; the OPS-01 Playwright spec consumes magic-link tokens DB-direct from `verification_tokens` | Pitfall 12 | If we use Resend live in CI, the team consumes monthly send quota for every PR. Acceptable for a small project; switch to DB-direct if quota becomes a concern. |
| A5 | `sessions.absoluteExpires` (already populated in Phase 1) substitutes for the `sessions.created_at` column D-15 mentions | Pattern 2 | None — `absoluteExpires = created_at + 7d` is mathematically equivalent. Documented in proxy.ts comments. |
| A6 | `product.publishedAt TIMESTAMPTZ NULL` (existing) substitutes for `product.status` enum (D-11 prescription) | Open Questions §1 | If planner picks Option B (add `status`), small migration step. Low-risk. |
| A7 | Translation completeness view counts only the 4 base translation fields in v1; the typed-text spec values inclusion (D-04 spec) is a v1.1 add | Pattern 6 | If the view is "wrong" by D-04 spec, the % bars are too high (some spec values not counted). Fix: extend the view's WITH clause to JOIN spec values. Non-blocking. |
| A8 | nuqs 2.8.x + Next 16 works with `<NuqsAdapter>` wrapping; the GitHub issue #1263 is a setup mistake, not a bug | Standard Stack + Pitfall 10 | If the issue is real, downgrade to nuqs 2.7.x or add adapter manually. |
| A9 | The `@hookform/resolvers` 3.10.0 currently in package.json works with RHF 7.73.x; do not upgrade to 5.x | Standard Stack | If 3.10.0 has a Zod 4.x peer issue (zod was upgraded 3→4 at some point), upgrade to a 3.x line that supports zod 4 — verify at install. |
| A10 | The Cloudinary CldUploadWidget pre-PDF restriction works via `clientAllowedFormats: ['pdf']` + `resourceType: 'auto'` | Pattern 3 | If Cloudinary docs require `resource_type: 'raw'` for PDFs in signed mode, swap. Smoke-test in Wave 3. |

## Open Questions (RESOLVED)

1. **`product.status` enum vs `product.publishedAt` (existing)**
   - What we know: Phase 1 schema declares `product.publishedAt TIMESTAMPTZ NULL` (NULL = draft). CONTEXT D-11 says add `product.status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'))`.
   - What's unclear: Should Phase 2 add `status` as a new column (and backfill) OR keep `publishedAt` and treat `status` as a derived field (`published_at IS NULL ? 'draft' : 'published'`)?
   - **RESOLVED: Option B (literal CONTEXT D-11)** — add `product.status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'))` column to `product` table; backfill from existing `publishedAt` (`UPDATE product SET status = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END`). Keep `publishedAt` for the timestamp; `status` is the canonical state. **This reverses the previous Option A plan choice** — implementing CONTEXT D-11 verbatim avoids code-vs-schema drift and gives lifecycle actions (publishProduct/unpublishProduct) a single canonical column to mutate.

2. **Per-field MT flag schema choice (D-05 alternative)**
   - What we know: D-05 default is sibling `*_translation_field_flags` table; alternative is boolean column per field on each translation table.
   - What's unclear: Which is cleaner under our `*_translations` PK shape (composite `(productId, locale)`)?
   - **RESOLVED: Option A (sibling table)** — create `*_translation_field_flags (translation_id, field_name, machine_translated BOOLEAN, PRIMARY KEY (translation_id, field_name))` per translatable entity. Translation tables stay narrow; PK is naturally extensible to v2 `needs_review`; one extra keyed JOIN at read time is negligible.

3. **Spec-fields list — server-side or client-side pagination?**
   - What we know: D-17 says reusable DataTable for every list. Spec-fields per category typically 20–80 rows.
   - What's unclear: Per-category page client-side or server-side?
   - **RESOLVED: Option A (client-side TanStack pagination)** — ~80 rows expected per category; loading all rows is cheap. Audit log + products go server-side; categories + manufacturers + spec-fields go client-side.

4. **Where does `spec_field.deleted_at` filter go?**
   - What we know: D-07 soft-delete adds `deleted_at`. Public reads should `WHERE deleted_at IS NULL`.
   - What's unclear: How do we make this default without manually adding to every query? Drizzle does not have first-class soft-delete.
   - **RESOLVED: Option A (repository wrapper helpers)** — `findActiveSpecFields`, `listSpecFields`, etc. in `src/lib/repos/spec-fields.ts` always add `where(isNull(specFields.deletedAt))`, plus an ESLint `no-restricted-syntax` rule blocking direct `db.select().from(specFields)` outside the wrapper. The admin schema editor that needs to see soft-deleted fields imports a different function (`listAllSpecFields`).

5. **Audit log for `login`/`logout`?**
   - What we know: D-16 includes `'login'`, `'logout'`, `'session_revoked'` in the action enum. CONTEXT.md doesn't specify where these are written.
   - What's unclear: Phase 1's signIn callback could write `'login'`; logout via Auth.js `signOut`; session_revoked via the proxy.ts middleware D-15 cap rejection.
   - **RESOLVED: Auth.js `events.signIn` / `events.signOut` callbacks in `src/lib/auth.ts`** + `requireAdmin()` cap-rejection path emits `session_revoked`. All are HTTP-driver-friendly single statements; the events run after Auth.js completes the auth state change so the audit row is atomic with the lifecycle event.

6. **CSV export: streaming or buffered?**
   - What we know: Phase 5 polish item flags streaming for large counts. Phase 2 ships buffered.
   - What's unclear: How many submissions before buffered breaks? With ~10 KB per submission, 100k rows = 1 GB. Vercel serverless has a 4.5 MB response limit for non-streaming.
   - **RESOLVED: Buffered (in-memory) for Phase 2; streaming deferred to Phase 5 launch polish.** Hard cap of 10000 rows in the Server Action; ~5k-row CSV is ~5 MB and within Vercel's response budget. Phase 5 launch polish revisits with a streaming response.

7. **`spec_field.deleted_at` and the `(category_id, key)` UNIQUE index**
   - What we know: Phase-1 schema has `UNIQUE(spec_field_category_key_idx)`. Soft-delete a field, then add a new field with the same key in the same category → UNIQUE collision.
   - What's unclear: Replace with a partial unique index `WHERE deleted_at IS NULL`?
   - **RESOLVED: Partial unique index `WHERE deleted_at IS NULL`** to allow re-creation after soft-delete. Phase-2 migration drops the existing unique index and recreates as `UNIQUE INDEX ... ON spec_field(category_id, key) WHERE deleted_at IS NULL`. drizzle-kit supports partial indexes via `.where(...)` on `uniqueIndex`. [VERIFIED: orm.drizzle.team/docs/indexes-constraints]


## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 20+ | Build/runtime | ✓ | (Vercel managed) | — |
| pnpm 10.33.0 | Package manager | ✓ | 10.33.0 | — |
| Neon Postgres | DB | ✓ | Postgres 17.8 (verified Phase 1 03-SUMMARY) | — |
| Cloudinary | Media | ✓ | (Phase 1 wired) | — |
| Resend | Email | ✓ | (Phase 1 wired) | — |
| Sentry | Errors | ✓ | (Phase 1 wired, smoke ✅) | — |
| Vercel Pro | Deploy | ✓ | (Phase 1 wired, fra1) | — |
| Playwright | E2E | ✓ 1.59.1 | [VERIFIED: package.json] | — |
| Vitest | Unit | ✓ 4.1.4 | [VERIFIED: package.json] | — |
| GH Actions | CI | Assumed available | [ASSUMED] | If absent: run Playwright locally against preview manually as a checkpoint. |
| Vercel Protection Bypass | OPS-01 e2e auth | Unknown | — | Disable Deployment Protection on previews instead. |

**Missing dependencies with no fallback:** None known.

**Missing dependencies with fallback:**
- GH Actions configuration for OPS-01 — if the project doesn't yet have a workflow file, Wave 1 adds `.github/workflows/e2e-preview.yml`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (unit + integration) + Playwright 1.59.1 (e2e) |
| Config file | `vitest.config.ts` (already exists Phase 1) + `playwright.config.ts` (already exists Phase 1) |
| Quick run command | `pnpm test` (Vitest, ~5–8s as of Phase 1 baseline) |
| Full suite command | `pnpm test:all` (Vitest + Playwright local) |
| E2E against preview | `BASE_URL=https://<preview> pnpm playwright test` (CI: GH Actions wait-for-preview action) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ADMIN-01 | Magic-link login + 24h idle + 7d absolute timeout | unit + integration | `pnpm vitest run tests/lib/require-admin.test.ts` + Playwright `tests/e2e/admin-edit-revalidates.spec.ts` (login step) | ❌ Wave 0 (require-admin.test); ❌ Wave 4 (e2e) |
| ADMIN-02 | Invite admin, single-use 48h token | integration (live Neon) | `pnpm vitest run tests/actions/admins.test.ts` | ❌ Wave 1 |
| ADMIN-03 | Category CRUD + 3 translation rows in tx | integration | `pnpm vitest run tests/actions/categories.test.ts` | ❌ Wave 2 |
| ADMIN-04 | Manufacturer CRUD + logo upload (logo via mock) | integration + unit | `pnpm vitest run tests/actions/manufacturers.test.ts` | ❌ Wave 2 |
| ADMIN-05 | Spec-field schema editor: rename, soft-delete, hard-delete, group CRUD | integration | `pnpm vitest run tests/actions/spec-fields.test.ts` + `tests/actions/spec-field-groups.test.ts` | ❌ Wave 2 |
| ADMIN-06 | Product CRUD with locale tabs + typed specs + draft/published | integration (heaviest) | `pnpm vitest run tests/actions/products.test.ts` | ❌ Wave 3 |
| ADMIN-07 | Cloudinary signed upload from widget | unit (mock) + e2e | `pnpm vitest run tests/components/media-uploader.test.tsx` + Playwright `tests/e2e/upload.spec.ts` (skipped in CI; manual checkpoint) | ❌ Wave 3 |
| ADMIN-08 | Duplicate product full clone | integration | `pnpm vitest run tests/actions/products.test.ts -t duplicate` | ❌ Wave 3 |
| ADMIN-09 | Per-field MT flag stored | integration | `pnpm vitest run tests/actions/products.test.ts -t machine-translated` | ❌ Wave 3 |
| ADMIN-10 | Translation completeness view returns expected % | integration (against view) | `pnpm vitest run tests/db/translation-completeness-view.test.ts` | ❌ Wave 2 |
| ADMIN-11 | Audit log row written for every mutation | integration (assertion in every action test) | `pnpm vitest run tests/actions/*.test.ts` (audit_log row count assertion) | ❌ each action wave |
| ADMIN-12 | Submissions inbox + CSV export | integration + unit | `pnpm vitest run tests/actions/submissions.test.ts` + `tests/lib/csv.test.ts` | ❌ Wave 4 |
| OPS-01 | Edit-then-refresh on Vercel preview | e2e (Playwright on preview URL) | `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts` (CI-only, BASE_URL=preview) | ❌ Wave 4 |

### Sampling Rate
- **Per task commit:** `pnpm test` (Vitest unit + integration, < 30s). Baseline 42 tests from Phase 1; Phase 2 will add ~80 tests by exit.
- **Per wave merge:** `pnpm test:all` (Vitest + Playwright local against `pnpm dev`). Local Playwright skips OPS-01 (which needs preview).
- **Phase gate:** `pnpm test:all` green + Playwright OPS-01 spec green against the Vercel preview deploy + verifier sign-off. The Playwright OPS-01 spec is the gating proof of correct cache invalidation.

### Wave 0 Gaps

- [ ] `tests/_fixtures/admin-session.ts` — fixture that creates an active admin row + a Phase-1 sessions row + emits a session cookie for tests; integration tests require it for `requireAdmin()` to pass.
- [ ] `tests/_fixtures/seed-products.ts` — seed helper for product fixtures (used by products + duplicate + completeness tests).
- [ ] `tests/_fixtures/load-env.ts` already exists from Phase 1 — confirm it loads `.env.test` for live-Neon-dev tests.
- [ ] `.github/workflows/e2e-preview.yml` — GH Actions workflow that waits for Vercel preview ready, then runs `tests/e2e/admin-edit-revalidates.spec.ts` against it.
- [ ] `tests/e2e/admin-edit-revalidates.spec.ts` — the OPS-01 spec.
- [ ] `tests/lib/require-admin.test.ts` — unit-style tests for the D-15 7d cap rejection (mocked Neon HTTP).
- [ ] `tests/lib/audit.test.ts` — that `logAudit` writes the right shape inside a tx.
- [ ] `tests/lib/revalidation.test.ts` — that the typed helpers call `revalidateTag` with the right tags (mock `next/cache`).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 magic-link (Phase 1) + admin-only signIn callback. **No password vector.** |
| V3 Session Management | yes | Auth.js DB sessions + D-15 dual cap (idle + absolute) + sessions row revocable; httpOnly + Secure cookie + SameSite=Lax (Auth.js defaults). |
| V4 Access Control | yes | `requireAdmin()` on every Server Action; `proxy.ts` admin gate at Edge; `admin_user.active=true` check in signIn callback. |
| V5 Input Validation | yes | Zod schemas on every Server Action. drizzle-zod inferred inserts. |
| V6 Cryptography | partial | Token generation via `crypto.randomUUID()` (cryptographically random; UUIDv4 — 122 bits of entropy). HMAC for Cloudinary signing via Cloudinary SDK. **Never hand-roll.** |
| V7 Error Handling/Logging | yes | Sentry wraps Server Actions. Audit log for every mutation. PII scrubbing in Sentry config (Phase 1). |
| V11 Business Logic | yes | D-08 type-change blocked; D-07 soft-delete confirmation; D-04 `'-copy'` slug suffix. |
| V13 API & Web Service | yes | Server Actions are the surface; one external API route (`/api/cloudinary/sign`) is allowlisted + rate-limited (Phase 5). |
| V14 Configuration | yes | env vars only, validated by `@t3-oss/env-nextjs` (Phase 1). No secrets in client bundle. |

### Known Threat Patterns for {Next.js 16 + RSC + Server Actions + Drizzle + Cloudinary}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection | Tampering | Drizzle parameterizes everything by default; never use `sql\`...\` ${rawUserInput}\`` style. Lint rule: warn on `sql\`...\`` template literals containing variable interpolation outside of `sql.placeholder(...)` patterns. |
| XSS via stored content (admin pastes script) | Tampering | RSC default escapes; never use `dangerouslySetInnerHTML` for admin-provided content. Phase 4 Tiptap output is sanitized server-side. |
| CSRF on Server Actions | Tampering | Next.js 14+ Server Actions have built-in origin checks (POST + Origin header validated). [VERIFIED: nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security] |
| Mass assignment via Server Action | EoP | Zod schema is the allowlist; never spread `...input` into a Drizzle insert; pick fields explicitly. |
| Open invite link (token leakage) | Spoofing | 48h expiry + single-use atomic UPDATE (D-14) + admin sees their own action in audit log. |
| Magic-link email harvesting | Information Disclosure | Phase 1 D-10: signIn callback returns `false` for unknown emails BUT Auth.js Email provider sends the email anyway by default. Mitigated by signIn callback rejection (no session created); the email is still sent. **Action item:** verify `validateEmail` callback or move admin allowlist into the Email provider's `sendVerificationRequest` to suppress the email for unknown addresses. |
| Cloudinary signature replay | Spoofing | 15-min upload TTL (Phase 1 sign endpoint). Cloudinary rejects timestamps > 1h drift. |
| Audit log tampering | Repudiation | Append-only by convention; no UPDATE Server Actions on audit_log; DB role separation at Phase-5 launch (Phase 2 keeps single role). |
| Session fixation | Spoofing | Auth.js rotates sessionToken on signIn. |
| Privilege escalation via direct admin_user UPDATE | EoP | No public Server Action mutates `admin_user.active` or `role` outside the invite/deactivate flow; both gated by `requireAdmin()`. |
| File upload abuse (huge files, wrong types) | DoS | CldUploadWidget enforces `clientAllowedFormats` + `maxFileSize` client-side AS A HINT; Cloudinary's signed-upload server-side limits enforce hard cap. |
| Smoke endpoint quota burn (Phase-1 leftover) | DoS | Auth gate already on `/api/smoke/sentry`; not a Phase-2 surface. |
| 7d session not actually 7d (server clock drift) | Spoofing | Compare via `Date.now()` server-side in proxy.ts; Vercel runs NTP-synced. Acceptable. |

## Sources

### Primary (HIGH confidence)
- Phase 1 RESEARCH + CONTEXT: `.planning/phases/01-foundations/01-CONTEXT.md`, `.planning/phases/01-foundations/01-07-SUMMARY.md` — D-09..D-15 carry forward verbatim
- Phase 2 CONTEXT: `.planning/phases/02-admin-panel/02-CONTEXT.md` — D-01..D-17
- Project guardrails: `CLAUDE.md` — translation siblings, typed specs, Cloudinary direct upload, magic-link only, audit on every mutation
- Architecture: `.planning/research/ARCHITECTURE.md` §Patterns 1, 2, 6, 7
- Pitfalls: `.planning/research/PITFALLS.md` §Pitfall 7 (serverless connection meltdown), §Pitfall 12 (locale fallback leaks), §Pitfall 14 (spec-schema evolution)
- Stack: `.planning/research/STACK.md` §Admin UI (shadcn/ui + TanStack Table + RHF + nuqs all locked)
- `package.json` — installed Phase-1 versions
- Source code under `src/db/schema/*`, `src/lib/auth.ts`, `proxy.ts`, `src/app/api/cloudinary/sign/route.ts`
- Next.js 16 docs (canonical caching API): https://nextjs.org/docs/app/api-reference/directives/use-cache + https://nextjs.org/docs/app/api-reference/functions/revalidateTag + https://nextjs.org/blog/next-16
- Drizzle ORM Neon docs: https://orm.drizzle.team/docs/connect-neon
- Drizzle Views: https://orm.drizzle.team/docs/views
- Auth.js DrizzleAdapter: https://authjs.dev/getting-started/adapters/drizzle
- next-cloudinary docs: https://next.cloudinary.dev/clduploadwidget/signed-uploads + https://next.cloudinary.dev/clduploadwidget/configuration

### Secondary (MEDIUM confidence)
- npm view results: `@tanstack/react-table` 8.21.3, `nuqs` 2.8.9, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/core` 6.3.1, `@dnd-kit/utilities` 3.2.2, `papaparse` 5.5.3, `next-cloudinary` 6.17.5, `@hookform/resolvers` 5.2.2 (current), `sonner` 2.0.7 (current)
- Shadcn DataTable + nuqs + server pagination tutorials: https://medium.com/@destiya.dian/shadcn-datatable-server-side-pagination-on-nextjs-app-router-83a35075c767, https://data-table.openstatus.dev
- TanStack Table Pagination Guide: https://tanstack.com/table/v8/docs/guide/pagination
- nuqs TanStack parsers: https://nuqs.dev/docs/parsers/community/tanstack-table
- Playwright + Vercel preview tutorials: https://cushionapp.com/journal/how-to-use-playwright-with-github-actions-for-e2e-testing-of-vercel-preview, https://www.thisdot.co/blog/integrating-playwright-tests-into-your-github-workflow-with-vercel
- Resend E2E testing: https://resend.com/docs/knowledge-base/end-to-end-testing-with-playwright
- Drizzle Neon transaction limitations (HTTP vs WS): https://www.answeroverflow.com/m/1149370348593217619 (Drizzle Team thread "No transactions support in neon-http driver")

### Tertiary (LOW confidence — flagged for validation)
- nuqs + Next 16 adapter detection issue: https://github.com/47ng/nuqs/issues/1263 — single report; may be a setup error. Wave-1 install confirms behavior.
- React 19 + @dnd-kit/sortable 10.0.0 compatibility — no official statement; assume working pending Wave-1 smoke test.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libs version-verified via npm; rationale via STACK.md
- Architecture: **HIGH** — patterns are direct carry-forward from Phase 1 + ARCHITECTURE.md; Server Action shape is the canonical Drizzle + Auth.js + Next 16 pattern
- Pitfalls: **HIGH** — derived from Phase 1 PITFALLS.md + verified via Drizzle docs + verified via Next 16 docs + verified via Cloudinary docs + verified via npm
- Caching API (Next 16): **HIGH** — verified directly against current Next.js docs (post-Jan-2026 cutoff freshness)
- Auth.js Edge session DB-read pattern: **MEDIUM** — direct Neon HTTP from Edge is a verified pattern but not framework-recommended; Phase-1 inspectionconfirms `sessions.absoluteExpires` is populated; the proxy.ts read shape is straightforward
- Open Questions: **HIGH (well-formed) / LOW (resolution)** — recommended answers are best-judgment; planner can override

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 days, normal-rate-of-change)
