# Phase 2: Admin Panel - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the operational layer that lets a 2–5 person content team enter real trilingual products in under 10 minutes each, with every admin write invalidating the correct public caches. Admin UX quality IS the operational risk this phase closes — if the editor is awkward the catalog never gets populated. The deliverables are: admin shell + invite/login lifecycle, category CRUD (tree), manufacturer CRUD, spec-field schema editor (with rename/delete/group mechanics), product CRUD (single long page, three-locale tabs, typed specs, free-form extras, draft/published, duplicate, media via Cloudinary signed direct upload), translation-completeness + machine-translated indicators, audit log writer + viewer, contact-submissions inbox with CSV export, fine-grained `revalidateTag` on every mutation, and a Playwright e2e gate on Vercel preview that proves edit-then-refresh works.

Phase 2 does NOT build any public listing/detail pages, search UI, JSON-LD emission, or the recipe/industry editor (Phase 4). It does NOT introduce role splits beyond `admin_user.role='admin'` (Phase 1 forward-compat row already covers v2's editor split). Phase 2 also does NOT populate `product_search` tsvectors — that is wired in Phase 3 transactionally on the product write path (the Phase-2 mutation handlers expose hooks for it but Phase 2 ships with `product_search` empty/no-op).

Covers requirements: **ADMIN-01..12, OPS-01**.

</domain>

<decisions>
## Implementation Decisions

### Editor layout + product CRUD

- **D-01:** **Single long scrollable page with three-locale tabs at the top.** All sections (basics, manufacturer/category, spec values, free-form extras, media, publish) on one page. The locale tabs (`uz` / `ru` / `en`) swap **only the translatable fields in place** — typed spec values, manufacturer/category assignment, media `public_id` arrays, and publish state are shared (rendered once below or above the tab strip). Closest to fiztech editing density, lowest motion for repeat edits, matches RHF + shadcn defaults.
- **D-02:** **All three locales held in one React Hook Form instance.** Tabs are pure UI state — switching tabs is instant, no save needed. A single Save action upserts `product` + all three `product_translations` rows + all `product_spec_values` (with their per-row sibling `product_spec_value_translations` for `is_extra=true` and typed `text` values) in **one Server Action transaction**. Used across every CRUD entity (category, manufacturer, spec_field, product). Rollback on any failure leaves no partial state.
- **D-03:** **Duplicate-product (ADMIN-08) = full clone.** Click "Duplicate" on a product → server clones the row + all three translation rows + all spec values + extras + media `public_id` array. Status forced to `draft` regardless of source. Slug per locale gets `-copy` suffix to avoid the `(locale, slug)` UNIQUE collision; admin renames before publish. New product gets fresh `created_at`, fresh `audit_log` rows (`action='create'`, `entity_type='product'`).
- **D-04:** **Translation-completeness indicator (ADMIN-10) = per-locale `%` bar in the editor + per-locale colored dot in the product list.** "Required" fields counted toward the percentage are: `name`, `short_description`, `long_description`, `slug` per locale (4 fields), plus all `product_spec_values` where the underlying `spec_field.is_required=true` AND `data_type='text'`. Computed server-side via a SQL view `product_translation_completeness(product_id, locale, percent)` — refreshed lazily on read, no Phase-1 schema change needed (the underlying tables exist). Editor shows three % bars next to the locale tabs; the product list (TanStack Table) shows three colored dots in a "Translations" column (green ≥95%, amber ≥50%, red <50%).
- **D-05:** **Machine-translated flag (ADMIN-09) is per-field, per-locale.** Each translatable text field renders an "MT" checkbox below it. When set, the field renders with a subtle amber left-border in the editor and a small "MT" badge appears next to the locale dot in the product list. **Schema additive in Phase 2:** add a sibling `*_translation_field_flags (translation_id, field_name, machine_translated BOOLEAN, PRIMARY KEY (translation_id, field_name))` to keep the per-translation row width fixed across all translation tables (alternative — boolean columns named `machine_translated_<field>` on each translation table — left to Claude's discretion if the planner judges it cleaner; both pass the requirement).

### Spec-schema editor mechanics (the design-spike concern from Phase 1)

- **D-06:** **Rename `spec_field.key` runs as a single transaction with an impact-preview confirm dialog.** Clicking Rename opens a modal: "This will update `spec_field.key` and N rows in `product_spec_values.extra_key`. Y products reference this field. Type the new key to confirm." On confirm, a Server Action transaction updates `spec_field.key` + the affected `extra_key` rows + writes one `audit_log` row (`action='rename_spec_field'`, `before_json={key:'old'}`, `after_json={key:'new'}`). Documented contract (added to `CLAUDE.md` after this phase): "spec_field keys are mutable but should not be casually renamed — rename when the original was wrong, not for cosmetic reasons." Phase 3 filter URLs that key on `spec_field.key` will respect this contract.
- **D-07:** **Delete spec_field is soft-delete by default, with hard-delete as an explicit option.** Clicking Delete shows: "N products use this field. [Cancel] [Soft-delete (hide from new products, keep data)] [Hard delete (drop all N values)]." **Schema additive in Phase 2:** add `spec_field.deleted_at TIMESTAMPTZ NULL` (soft-delete column). Soft-delete just sets `deleted_at`; existing `product_spec_values` rows keep rendering on public detail pages until cleaned up. Hard delete cascades on `product_spec_values` (FK already `ON DELETE CASCADE` per Phase 1). Both paths write an `audit_log` row (`action='soft_delete_spec_field'` or `'delete_spec_field'`). Public read paths in Phase 3 filter `WHERE spec_field.deleted_at IS NULL`.
- **D-08:** **Type changes are blocked.** Once a `spec_field` is saved with `data_type`, the type dropdown disables in the editor. To change type, admin creates a new field with the desired type and (optionally) runs a one-shot "Copy values from old field" Server Action to migrate the data, then soft-deletes the old field. Saves significant editor complexity and prevents silent data corruption (text→enum needs an option list; "Stainless 304" → which enum value?). PITFALLS #14 supports this posture.
- **D-09:** **Add `spec_field_group` entity (new in Phase 2) for fiztech-style grouped detail tables.** New tables (Phase 2 additive migration):
  - `spec_field_group (id UUID PK DEFAULT gen_random_uuid(), category_id UUID FK NOT NULL, key TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, deleted_at TIMESTAMPTZ NULL, UNIQUE(category_id, key))`
  - `spec_field_group_translations (group_id UUID FK, locale TEXT CHECK(locale IN ('uz','ru','en')), label TEXT NOT NULL, PRIMARY KEY (group_id, locale))`
  - `spec_field.group_id UUID FK NULL` (nullable; NULL means "ungrouped — appears in a default group at the bottom").
  Schema editor lets admin: (a) create groups per category (with translated labels), (b) drag fields between groups, (c) reorder groups (`sort_order`), (d) reorder fields within a group (`spec_field.sort_order`). Phase 3 product detail page renders **one `<table>` per group** (this is the fiztech aesthetic).

### Cache invalidation + draft/published

- **D-10:** **Fine-grained typed tags + a small set of collection tags.** Tag scheme:
  - **Per-entity:** `product:<uuid>`, `category:<uuid>`, `manufacturer:<uuid>`, `spec-field:<uuid>`, `spec-field-group:<uuid>`, `recipe:<uuid>` (Phase 4), `industry:<uuid>` (Phase 4)
  - **Per-collection:** `products-list`, `categories-tree`, `manufacturers-list`, `sitemap`, `search-index`
  Public RSC pages declare their tags via `unstable_cache(..., { tags: [...] })` or `fetch(..., { next: { tags: [...] } })`. Mutation handlers call typed helpers (`revalidateProduct(id)`, `revalidateCategoryMove(oldParentId, newParentId, movedId)`, etc.) that fan out to the right combo. Helper module `src/lib/revalidation.ts` exports one helper per entity type.
- **D-11:** **Single `product.status` enum: `draft` | `published`.** Schema additive in Phase 2: `product.status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'))`. "Published" means visible on the public site in **any locale that has at least the `uz` translation** (per D-06 of Phase 1's fallback chain). Other locales fall back per `uz → ru → en` and render the cross-locale banner. Translation-completeness % is informational, **not** a publish gate (admin can publish a product with 50% ru and 0% en — the public site falls back gracefully). Aligns with "listings populated from day one" (D-07 of Phase 1) and matches PITFALLS #12's single-policy rule. Admin sees ONE Publish button per product.
- **D-12:** **Category re-parent invalidates: old parent + new parent + moved category + `categories-tree` + `sitemap`.** Helper `revalidateCategoryMove(oldParentId, newParentId, movedId)` fans out: `category:<oldParentId>`, `category:<newParentId>`, `category:<movedId>`, `categories-tree`, `sitemap`. Documented in the plan so the executor doesn't miss the old-parent breadcrumb refresh.
- **D-13:** **CI gate for OPS-01 = Playwright spec running against the Vercel preview URL.** GitHub Actions workflow:
  1. Wait for Vercel preview ready (existing Phase-1 deploy already does this).
  2. Run a Playwright spec that: (a) admin-logs-in via magic-link delivered to a test inbox, (b) edits a known seed product's `name` (uz locale), (c) reloads the public product detail URL on the same preview deployment, (d) asserts the new name is visible within 5s.
  3. Block PR merge on failure. The Phase-1 e2e harness exists; this adds one spec file (`tests/e2e/admin-edit-revalidates.spec.ts`) plus a small seed fixture. This IS the definition-of-done for OPS-01.

### Admin lifecycle + audit log

- **D-14:** **Admin invite (ADMIN-02): pre-create `admin_user(active=false)` + new `admin_invite` row + Resend email.** Schema additive in Phase 2:
  - `admin_invite (id UUID PK DEFAULT gen_random_uuid(), email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ NULL, invited_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  Existing admin enters email → Server Action: insert `admin_user(email, role='admin', active=false, invited_by, invited_at)` + insert `admin_invite(token=crypto.randomUUID(), email, expires_at=now()+'48h')` + Resend email "You're invited to Manometr admin. [Accept invite (link)]". Click consumes token: `UPDATE admin_invite SET used_at=now() WHERE token=$1 AND used_at IS NULL AND expires_at > now()` → if 1 row affected, `UPDATE admin_user SET active=true WHERE email=$1` → redirect to `/[locale]/login` for standard magic-link sign-in. Single-use enforced at DB level (the `WHERE used_at IS NULL` clause). Resend template is a React Email component (Phase-1 pattern reused). Audit log: `action='invite'`, `entity_type='admin_user'`, `entity_id=email`.
- **D-15:** **Session timeout (ADMIN-01) enforced in `proxy.ts` (middleware) + Auth.js `maxAge` as backstop.** On every `/[locale]/admin/*` request, the middleware:
  1. Reads the Auth.js session cookie → looks up `sessions` row by `sessionToken`.
  2. Rejects if `sessions.expires < now()` (idle: Auth.js's own `expires` is updated to `now() + 24h` on every authenticated request — this gives the 24h-idle timeout for free with Auth.js DB strategy).
  3. Rejects if `sessions.absoluteExpires < now()` (absolute timeout — Phase 1 already populates this column via `src/lib/auth.ts:81-98` session callback, set to `now() + 7d` on session creation; this is mathematically equivalent to the originally-prescribed `created_at + '7d'` cap. **Verified at Phase-2 planning time (2026-04-27): no new column needed.**).
  4. On rejection: 307 redirect to `/[locale]/login` + clear cookie.
  Auth.js `auth.config.ts`: `session: { strategy: 'database', maxAge: 7*24*60*60, updateAge: 24*60*60 }` (so Auth.js auto-extends `expires` only on requests at least 24h after the last update — keeps DB writes minimal). Single Neon HTTP read per admin request, ~30ms cold from `fra1`. Gives the **server-enforced** guarantee D-09 from Phase 1 demanded.
- **D-16:** **Audit log (ADMIN-11): one row per Server Action with full before/after JSON.** Helper `src/lib/audit.ts` exports `logAudit({ actor, action, entityType, entityId, before, after, req })`. Called inside every mutation Server Action **inside the same transaction** so the log row commits or rolls back atomically with the mutation. Action enum (closed set, lints reject unknown values): `'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'invite' | 'rename_spec_field' | 'soft_delete_spec_field' | 'delete_spec_field' | 'duplicate_product' | 'login' | 'logout' | 'session_revoked'`. `before_json` is `null` on create; `after_json` is `null` on hard delete. `ip` and `user_agent` extracted from request headers in the Server Action wrapper. Uses Phase-1's `audit_log` table verbatim (D-13 of Phase 1).
- **D-17:** **Reusable DataTable as the primitive for every admin list page.** One component `src/components/admin/data-table.tsx` built on TanStack Table v8 + shadcn DataTable + nuqs URL state. Used for: products list, categories list, manufacturers list, spec-fields list (per category), audit log viewer (`/[locale]/admin/audit`, filter by actor / entity_type / date range, paginated 50/page), and contact submissions inbox (`/[locale]/admin/submissions`, filter by date / read state, mark read, CSV export via Server Action returning a Blob with `Content-Disposition: attachment`). All filter state lives in the URL via nuqs so the filtered view is shareable + bookmarkable.

### Claude's Discretion

- **Component library wiring:** `pnpm dlx shadcn@latest init` + add the components needed (Button, Input, Form, Tabs, Dialog, AlertDialog, Toast/Sonner, Select, Checkbox, Switch, Tooltip, Card, Sheet, DataTable). Use the default shadcn theme (Slate or Zinc) — final theme tuning is a Phase 3 design decision. Tailwind CSS v4 already installed and pinned (4.2.3 per Phase 1 DEF-01 resolution).
- **Form library posture:** React Hook Form + Zod via `@hookform/resolvers/zod` + drizzle-zod for inferred insert schemas. One Zod schema per entity, declared next to the Server Action. Client-side validation + server re-validation on submit.
- **Cloudinary upload UX:** `next-cloudinary`'s `<CldUploadWidget>` for drag-drop multi-image (signed via `/api/cloudinary/sign` from Phase 1). Allow reordering via drag (use `@dnd-kit/sortable` or similar — small bundle). Datasheet upload uses the same widget restricted to `pdf` resource type. DB stores `public_id` array; thumbnail render via `<CldImage>`.
- **Slug auto-generation:** Phase-1 `src/lib/slug.ts` is the source of truth for normalization; admin form auto-generates slug from `name` on blur with a manual override field. Slug uniqueness enforced at DB level via `(locale, slug) UNIQUE` on each `*_translations` table (already in Phase 1 schema); admin gets a friendly toast on collision.
- **Per-field MT flag schema choice (D-05 alternative):** sibling `translation_field_flags` table vs. boolean columns per translation table — planner picks whichever ships cleaner. Both satisfy ADMIN-09; the table form is more flexible (supports arbitrary new flag types in v2 like `needs_review`), the column form has cheaper queries.
- **Audit log retention:** No retention policy in Phase 2 (table grows unbounded). Phase 5 launch polish item: document an `audit_log` archival strategy (move rows older than 1y to a cold table or just drop). Out of scope here.
- **Admin route layout (`/[locale]/admin/layout.tsx`):** sidebar with sections (Dashboard, Products, Categories, Manufacturers, Spec Fields, Submissions, Audit Log, Admins) + top bar with current admin email + sign-out. Mobile responsive is nice-to-have but not a Phase 2 requirement (admin is desktop-first content work).
- **Login UX:** Phase 1 ships a minimal `/[locale]/login` page; Phase 2 polishes it with a "Check your email" confirmation state and an error banner for `ErrorPages.AccessDenied` (when an `active=false` admin tries to sign in). Use `useActionState` on a client component to handle the discriminated `{ ok } | { error }` return that the Phase-1 deferral DEF noted.
- **Test posture:** Each Server Action has a Vitest unit test (mocks Neon HTTP) + at least one integration test against the live Neon dev branch (transaction shape, audit log row written). Playwright e2e covers: login → invite admin → invite shows up in list → revalidation gate (D-13) → CSV export downloads.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context (always)
- `CLAUDE.md` — Project-level guardrails (locked: translation siblings, typed spec long-table, locale routing, cache invalidation contract, Cloudinary direct upload, admin auth rules — every Phase-2 decision honors these)
- `.planning/PROJECT.md` — Vision, audience, constraints, out-of-scope, Key Decisions table
- `.planning/REQUIREMENTS.md` §"Admin Panel (ADMIN)" + §"Content Operations (OPS)" — acceptance criteria for ADMIN-01..12 and OPS-01
- `.planning/ROADMAP.md` §"Phase 2: Admin Panel" — goal statement + 5 success criteria (must all be TRUE before phase exits)
- `.planning/STATE.md` — current execution state, Phase 1 deferred items, performance metrics

### Phase 1 carries forward (read-only — locked)
- `.planning/phases/01-foundations/01-CONTEXT.md` §"Implementation Decisions" — Phase-1 decisions D-01..D-21 are LOCKED. Phase-2 builds on them, never contradicts. Especially: locale codes (D-01..D-04), fallback chain (D-05..D-08), Auth.js DB strategy + admin_user shape (D-09..D-15), spec_field type system (D-16..D-21).
- `.planning/phases/01-foundations/01-VERIFICATION.md` — Phase-1 verifier output (5/5 success criteria + 7/7 FOUND requirements passing)
- `.planning/phases/01-foundations/01-SUMMARY.md` — what shipped in Phase 1 (the modules Phase 2 imports)

### Architecture patterns (Phase 2 implements)
- `.planning/research/ARCHITECTURE.md` §"Pattern 1: Translated-fields = sibling `*_translations` table" — every CRUD page upserts the sibling rows in one transaction (D-02)
- `.planning/research/ARCHITECTURE.md` §"Pattern 2: Hybrid spec schema" — spec_field + product_spec_values + spec_field_group (new in D-09)
- `.planning/research/ARCHITECTURE.md` §"Pattern 6: Admin writes via Server Actions" — `requireAdmin()` wrapper, Server Action vs API route split (D-15..D-17)
- `.planning/research/ARCHITECTURE.md` §"Pattern 7: Cloudinary signed direct uploads" — admin upload flow (D-15 of Phase 1, consumed in Phase 2)
- `.planning/research/ARCHITECTURE.md` §"Pattern 5: Full-text search" — `product_search` table is in the schema; Phase-2 mutation handlers expose hooks but DO NOT populate (Phase 3)

### Pitfalls (things Phase 2 must prevent or address)
- `.planning/research/PITFALLS.md` §"Pitfall 12: Locale fallback leaks" — D-11 single-publish-state honors single-policy rule
- `.planning/research/PITFALLS.md` §"Pitfall 14: Spec-schema evolution" — D-06..D-09 directly address rename/delete/type-change/group mechanics
- `.planning/research/PITFALLS.md` §"Pitfall 7: Serverless + Postgres connection meltdown" — pooled URL still used at runtime; D-15 middleware adds 1 read per admin request, well within Neon's pool budget
- `.planning/research/PITFALLS.md` §"Integration Gotchas" — Cloudinary signed upload TTL (15 min, set in Phase 1), region co-location

### Stack (version pinning)
- `.planning/research/STACK.md` §"Executive Recommendation" — TanStack Table, RHF, Zod, nuqs, sonner, lucide-react, shadcn/ui, Tailwind v4 — all locked
- `package.json` (current) — RHF 7.73.1, Zod 4.3.6, sonner 1.7.4, lucide-react 0.460.0, react-hook-form-resolvers 3.10.0 already installed; TanStack Table + nuqs + shadcn-cli + @dnd-kit are Phase-2 additions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1)

- `src/db/client.ts` — Drizzle client on Neon HTTP driver (pooled). Every Server Action imports this.
- `src/db/schema/index.ts` — barrel export of all 10 schema modules. Phase 2 mutations type-check against these directly via drizzle-zod inserts.
- `src/lib/auth.ts` + `src/lib/auth.config.ts` — Auth.js v5 edge-split. `auth()` export is the canonical session reader. Phase 2 wraps this with `requireAdmin()` (Phase-1 deferred to here, full implementation lands here).
- `src/lib/bootstrap.ts` — first-admin bootstrap (idempotent, runs in `instrumentation.ts`). Phase 2 doesn't touch this — it remains the cold-start seed.
- `src/lib/cloudinary.ts` — Cloudinary SDK client (signing endpoint already at `/api/cloudinary/sign`). Phase 2 admin UI calls the endpoint via `<CldUploadWidget>`.
- `src/lib/slug.ts` — slug normalization (handles `oʻ`/`gʻ` U+02BB). Auto-generation in admin forms uses this.
- `src/env.ts` — `@t3-oss/env-nextjs` Zod boundary. Phase 2 reads admin-related env vars (none new expected — Resend already in Phase 1).
- `proxy.ts` (repo root) — Next.js 16 middleware. Phase 1 has the locale rewrite + admin cookie gate; Phase 2 adds the session-row idle/absolute check (D-15) inside the same handler.
- `src/app/[locale]/layout.tsx` — locale provider + `next/font`. Phase 2 admin shell layout mounts under `/[locale]/admin/layout.tsx` (already exists as a stub from Phase 1).
- `src/app/[locale]/admin/page.tsx` — minimal "Admin (coming soon)" placeholder from Phase 1. Phase 2 replaces with a real dashboard.
- `src/emails/` — React Email templates (magic-link template exists from Phase 1). Phase 2 adds `AdminInviteEmail`.
- `src/db/schema/admin.ts` — `admin_user` + `audit_log` tables. Phase 2 ADDS `admin_invite` table here.
- `src/db/schema/spec.ts` — `spec_field` + `spec_field_enum_option` + `product_spec_values` + sibling translation tables. Phase 2 ADDS `spec_field_group` + `spec_field_group_translations` here, and ADDS `spec_field.deleted_at` + `spec_field.group_id` columns.
- `src/db/schema/products.ts` — `product` + `product_translations`. Phase 2 ADDS `product.status TEXT CHECK (...)` column.

### Established Patterns (from Phase 1, Phase 2 must continue)

- One schema file per aggregate root (`src/db/schema/admin.ts`, `auth.ts`, `core.ts`, `industries.ts`, `manufacturers.ts`, `products.ts`, `recipes.ts`, `search.ts`, `spec.ts`, `spec-fields.ts`, `spec-values.ts`).
- Every translation table has `UNIQUE (locale, slug)` where applicable + `CHECK (locale IN ('uz','ru','en'))`.
- Every translatable entity has a sibling `*_translations` table — never `_ru` / `_en` / `_uz` columns, never JSONB translation bag.
- Every spec value goes through `product_spec_values` (typed `num_value` / `text_value` / `enum_value` / `bool_value` + unit) — never opaque strings.
- Every Server Action wraps its DB writes in a `db.transaction(async (tx) => { ... })`.
- Tests: Vitest + drizzle-orm, hit live Neon dev branch via `tests/_fixtures/load-env.ts` env loader.
- Migrations: drizzle-kit `generate` → review → `migrate` against `DATABASE_URL_DIRECT` (Vercel build hook). NEVER push schema changes via `db:push` against production.
- E2E: Playwright tests run against Vercel preview URL (not `next dev`).
- Commits: conventional commits with phase prefix (e.g., `feat(02-XX): ...`).

### Integration Points

- **Vercel build step:** `drizzle-kit migrate` runs before Next.js build. Phase 2's additive migration (`spec_field_group`, `admin_invite`, `product.status`, `spec_field.deleted_at`, `spec_field.group_id`, optional translation_field_flags) ships in one migration commit early in the phase.
- **Resend:** Phase 1 wired up the magic-link email; Phase 2 adds `AdminInviteEmail` template + a second send path. Same Resend API key, same `RESEND_FROM_EMAIL`.
- **Cloudinary:** Phase 1 signs uploads; Phase 2 consumes — `<CldUploadWidget>` calls `/api/cloudinary/sign`, uploads directly to Cloudinary, returns `public_id` to the admin form, which writes it to DB on Save.
- **Sentry:** all Server Actions wrapped (or auto-wrapped via `withSentryConfig`). Phase 2 verifies admin errors land in Sentry with `actor.email` tag (PII config in Phase 1 still scrubs by default; admin email is allowlisted as a meaningful tag).
- **proxy.ts:** session enforcement (D-15) adds one Neon HTTP read per admin request. ~30ms cold from `fra1` → `eu-central-1`. Acceptable.
- **GH Actions / Vercel preview:** new Playwright spec `tests/e2e/admin-edit-revalidates.spec.ts` runs after preview deploy (D-13). Blocks merge.

</code_context>

<specifics>
## Specific Ideas

- **Inspiration for the editor density:** fiztech.ru. The product detail page (Phase 3) renders specs in **grouped tables** — Phase 2's `spec_field_group` (D-09) is what enables that. Admin schema editor needs to support creating those groups before Phase 3 can render them.
- **The 10-minute target (OPS-02 in Phase 5)** is a measurable KPI for Phase 2 success. The single-page editor (D-01..D-02) + duplicate-product (D-03) + auto-slug + drag-drop media + per-locale % indicator are all in service of this number.
- **Audit log first, dashboard later.** Phase 2 ships the audit log writer (D-16) on every mutation but the **viewer** (D-17) is a simple paginated table — no charts, no analytics. Charts are a Phase 5 polish item.
- **Per-field MT flag (D-05) is an information layer, not a workflow gate.** Phase 2 doesn't route MT-flagged content through review; it just makes it visible. Review workflow is v2 (V2-ADMIN-03 — TMS integration).
- **Single-publish-state (D-11) trade-off accepted:** an admin who publishes with only `ru` filled gets fallback rendering on `/uz/...` with the cross-locale banner. This is the right default for a small team — simpler than per-locale gates, matches "listings populated from day one" (D-07 of Phase 1).
- **`requireAdmin()` is the universal Server Action wrapper.** Every mutation Server Action starts with `const admin = await requireAdmin()` (throws on no session, on inactive admin, or on session timeout). Returns `{ email, role }` — the actor for `audit_log`. Pattern is one helper, used 30+ times across the phase.
- **Phase 1 DEF-03 (magic-link round-trip) was resolved as part of 07.3.** Phase 2 inherits a working magic-link login. The polish work (check-your-email state, error banner, useActionState client component for the discriminated return) is documented at the top of Phase 2 Plan 02-XX-LOGIN-POLISH.

</specifics>

<deferred>
## Deferred Ideas

### To Phase 3 (Public Rendering, Search, SEO)
- Public detail page rendering of `spec_field_group` (the table-per-group view)
- `product_search` tsvector population on every Phase-2 product mutation transaction (Phase 2 leaves a hook in the mutation handler; Phase 3 fills it in)
- Locale-filter UI for the admin product list (Phase 2 ships TanStack Table with a "Translations" column showing dots; filtering by "products missing ru translation" is Phase 3+)
- Public sitemap regeneration on every Phase-2 mutation (Phase 2 emits the `sitemap` cache tag; Phase 3 wires the actual `app/[locale]/sitemap.xml/route.ts` that consumes it)
- Cross-locale banner component (rendered on fallback-rendered detail pages)

### To Phase 4 (Recipes + Industries)
- Tiptap editor for recipe / industry rich text — Phase 2 ships the basic CRUD scaffolding for `recipe` / `industry` translations as a "stub" in the audit log only if it's a low-effort lift; otherwise full Tiptap is Phase 4
- M:N admin UI for `product ↔ recipe` and `product ↔ industry` (Phase 4 scope)
- "Used in" reverse lookup component on product detail (Phase 4 public, but the Phase-2 product editor MUST NOT cache product → recipe links — it just upserts the products themselves)

### To Phase 5 (Launch polish)
- Audit log retention / archival strategy (move rows >1y to cold table)
- CSV export hardening for ADMIN-12 (large submission counts, streaming response, encoding test for `oʻ`/`gʻ`)
- Admin shell mobile-responsive polish (Phase 2 is desktop-first)
- `BOOTSTRAP_ADMIN_EMAIL` env-var retirement (once real invites work, the bootstrap path can be unset — document in launch runbook)
- Error/load testing the admin under concurrent edits (rare in real life with 5 admins; not Phase 2 concern)
- Sentry release tagging integration + admin-action breadcrumbs

### v2 / backlog
- Editor / Admin RBAC split — `admin_user.role` already accepts other values, `requireAdmin()` already gates on `role='admin'` (D-11 of Phase 1). v2 just adds `'editor'` as a valid value + a finer `requireEditor()` helper.
- Translation-memory / TMS integration (V2-ADMIN-03)
- Bulk import/export of products via CSV (V2-ADMIN-04)
- Manufacturer self-service portal (V2-ADMIN-02)
- Per-locale publish flags (rejected for v1 per D-11; would require schema migration `product.status` → `product_translations.published`)
- Three-state status (`draft | review | published`) — out of scope for 2–5 person team
- "Allow narrow type conversions" path for spec_field type changes (rejected for D-08; reconsider only if admin team complains)
- Field-level diff log (rejected for D-16; reconsider if "what changed in this product" becomes a frequent question)

</deferred>

---

*Phase: 02-admin-panel*
*Context gathered: 2026-04-27*
