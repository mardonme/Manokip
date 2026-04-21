# Phase 1: Foundations - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers schema, locale routing, auth plumbing, and deployment topology. Everything expensive to migrate once content exists is locked here: translation tables, typed spec storage, locale-prefixed URL shape, Neon pooled+direct connections co-located with Vercel, Auth.js magic-link + middleware gate, Cloudinary signing endpoint, Sentry/Analytics/Speed Insights wiring.

Phase 1 does NOT build any admin CRUD, any public content pages, or any search UI — those are Phases 2–3. Phase 1 produces: a deployable Next.js app where (a) `/` 307-redirects to `/{locale}/`, (b) an invited admin can complete a magic-link login round-trip and land on an empty admin placeholder, (c) Cloudinary sign endpoint returns a valid signature for an authorized admin, and (d) Sentry receives a test event from production.

Covers requirements: **FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07**.

</domain>

<decisions>
## Implementation Decisions

### Locale codes + default locale

- **D-01:** Locale codes are bare: `uz`, `ru`, `en` (no BCP-47 expansion). Stored in DB as `TEXT` with a `CHECK (locale IN ('uz','ru','en'))` constraint, and used verbatim in URLs (`/uz/...`, `/ru/...`, `/en/...`) and hreflang attributes. Accepted trade-off: if Uzbek Cyrillic (`uz-Cyrl`) is ever added in v2+, a migration will expand existing `'uz'` rows to `'uz-Latn'`. `uz-Cyrl` is explicitly out-of-scope for v1 per PROJECT.md.
- **D-02:** Default locale is `uz` (Uzbek-first). A `.uz` domain + primary audience (Uzbek-speaking engineers) drives this over the CIS-traditional default of `ru`. Sets the correct geo/language signal to Yandex and Google.
- **D-03:** Root `/` middleware detection chain: **cookie (`NEXT_LOCALE`) → `Accept-Language` header → default `uz`**. LocaleSwitcher component (Phase 3) writes the cookie; first-time visitors are steered by their browser, and returning visitors keep their last choice. 307 redirect, not 308 (transient, cookies may change).
- **D-04:** `next-intl` v4 is configured with `locales: ['uz','ru','en']`, `defaultLocale: 'uz'`, `localePrefix: 'always'`. `/` is a middleware-only redirect — no root `page.tsx`.

### Translation fallback policy

- **D-05:** Site-wide single fallback rule: when the requested locale has no translation row for an entity, **render the page in the first available fallback locale with a prominent banner** (e.g., "Bu sahifa hozircha faqat rus tilida mavjud" / "Эта страница пока только на русском" / "This page is currently available in Russian only"). No 404, no redirect, no mid-content field-level mixing (per PITFALLS #12).
- **D-06:** Fallback locale priority chain: **`uz → ru → en`** — matches the Uzbek-first default. Each entity type uses this same chain; there is no per-entity source-of-truth override (PITFALLS #12 warns against mixing policies).
- **D-07:** Category listings and search **include** products that lack a translation in the requested locale, rendered via the fallback chain with a small badge on the card (e.g., `RU`). Listings stay populated from day one; deep links always work. The detail-page banner provides the per-page context.
- **D-08:** JSON-LD on a fallback-rendered page declares the actual content language (`inLanguage: "ru"` when rendering a Russian fallback under `/en/`), so search engines index it correctly (PITFALLS #13).

### Auth + identity

- **D-09:** Auth.js v5 uses `session: { strategy: 'database' }` with `@auth/drizzle-adapter`. A `sessions` table is part of the Phase 1 schema. Each authenticated request updates `sessions.expires` (or a mirrored `last_seen_at`); middleware rejects sessions older than **24h idle or 7d absolute** — true server-enforced timeouts, not cookie-lifetime tricks. Admin can be kicked by deleting a row.
- **D-10:** Auth.js-owned tables are isolated: `auth_users`, `auth_accounts`, `sessions`, `verification_tokens` (adapter-default names, prefix to taste). The app owns a separate **`admin_user`** table keyed by **email** (primary key) with columns: `email`, `role`, `invited_by`, `invited_at`, `created_at`, `last_login_at`, `active`. The Auth.js `signIn` callback authorizes only when `admin_user WHERE email = ? AND active = true` exists.
- **D-11:** `admin_user.role TEXT NOT NULL DEFAULT 'admin'` present from day one (forward-compat for v2-ADMIN-01 Editor/Admin RBAC). In v1 every row is `'admin'`; `requireAdmin()` wrapper treats anything other than `'admin'` as unauthorized.
- **D-12:** First-admin bootstrap via **`BOOTSTRAP_ADMIN_EMAIL` env var**, executed idempotently on app boot (or in a startup hook): if `admin_user` is empty and the env var is set, insert one row with that email + `role='admin'` + `active=true`. Runs once then no-ops (guarded by a `SELECT 1 FROM admin_user LIMIT 1` check). Env var can remain set safely; no other seeding behavior depends on it.
- **D-13:** **`audit_log` table is declared in Phase 1 schema** (preserves "schema locked early" guarantee), but no code writes to it in Phase 1. Columns: `id BIGSERIAL PK`, `actor_email TEXT`, `action TEXT`, `entity_type TEXT`, `entity_id TEXT`, `before_json JSONB`, `after_json JSONB`, `at TIMESTAMPTZ DEFAULT now()`, `ip TEXT`, `user_agent TEXT`. Phase 2 Server Actions write to it via a `logAudit()` helper.
- **D-14:** Magic-link email provider uses **Resend**; React Email template is a Phase 1 deliverable (minimal — invite flow UI lives in Phase 2, but the magic-link email for the bootstrap admin must work end-to-end in Phase 1 to satisfy FOUND-05 success criterion).
- **D-15:** Middleware enforces admin gate on `/[locale]/admin/*`: absence of a valid Auth.js session cookie → 307 redirect to `/[locale]/login` (login page itself is a minimal shell in Phase 1, full UX in Phase 2).

### spec_field shape details

- **D-16:** `spec_field.data_type` is an enum **`('number','text','enum','bool')`** — four values, no `range`. "Range" is modeled as **two `number` spec_fields** (`pressure_min`, `pressure_max`) sharing a `filter_group_key` and `filter_kind='range'`. Range overlap queries use standard SQL: `WHERE max_field.num_value > $user_min AND min_field.num_value < $user_max`.
- **D-17:** `spec_field.filter_kind` enum: **`('range','select','toggle',NULL)`**. `NULL` means the field is display-only (not a filter).
- **D-18:** Enum option keys and their translated labels live in **sibling child tables**:
  - `spec_field_enum_option (id UUID PK, spec_field_id UUID FK, key TEXT, sort_order INT, UNIQUE(spec_field_id, key))`
  - `spec_field_enum_option_translations (option_id UUID FK, locale TEXT, label TEXT, PRIMARY KEY (option_id, locale))`
  - `product_spec_values.enum_value TEXT` stores the option's `key` (not its translated label). Label lookup happens at render time with a locale-scoped JOIN. Matches the project-wide translation pattern.
- **D-19:** `spec_field.key` is **mutable with migration awareness**. The field-rename operation is a transaction that also updates every `product_spec_values.extra_key` referencing the old key. Schema supports the rename (no CHECK that bakes in `key`); the *admin UI for the rename workflow* is a Phase 2 deliverable. PITFALLS #14 explicitly calls this out — fields must be rename-capable without orphaning data.
- **D-20:** Free-form "extras" (`is_extra=true`) use a sibling **`product_spec_value_translations (value_id BIGINT FK, locale TEXT, text_value TEXT, PRIMARY KEY (value_id, locale))`** for per-locale text. Matches the universal translation-sibling pattern. For typed (non-extra) `text` values, translation also flows through this sibling (one `product_spec_values` row per (product, field), three translation rows per locale).
- **D-21:** `product_spec_values.unit TEXT` overrides `spec_field.unit` when non-null. Canonical unit conversion (e.g., kPa → bar) is NOT performed in Phase 1 — values are stored as entered. Unit-conversion semantics deferred; document that filter UIs must match input unit to the spec_field's canonical unit.

### Claude's Discretion

- Migration workflow: use **direct Neon URL** (`DATABASE_URL_DIRECT`) for `drizzle-kit migrate`, run in a Vercel build step (`vercel.json` `buildCommand`) against production and preview. Application runtime uses pooled URL (`DATABASE_URL`) via `@neondatabase/serverless` HTTP driver. Matches PITFALLS #7 + STACK research.
- Neon preview branching: enable the Neon-Vercel integration so every PR preview gets its own DB branch seeded from main. Uses Neon's free branching up to the tier limit; document the limit in the README.
- Env-var validation: adopt `@t3-oss/env-nextjs` + Zod at `src/env.ts` — strict split between `server` and `client` schemas, fails fast on boot if a required var is missing. All secrets server-only.
- Sentry configuration: default sample rates (100% error, 10% performance, no session replay in v1). PII scrubbing on by default. Wire via `@sentry/nextjs` with `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`. Tunnel config via `next.config.mjs` wrapper.
- Slug helper skeleton: `src/lib/slug.ts` stub in Phase 1 (handles `oʻ/gʻ/U+02BB` normalization) but full per-locale slug UX is Phase 2 when admin forms are built.
- Font loading: stub `next/font` setup in `src/app/[locale]/layout.tsx` with subsets `['latin','latin-ext','cyrillic']` per SEO-04. Specific typeface choice (Inter / Golos Text / IBM Plex) is a Phase 3 design decision.
- Minimal public homepage: Phase 1 ships an empty `/[locale]/page.tsx` placeholder that proves routing works — zero styling beyond the locale-switcher link. Real content is Phase 3.
- Minimal `/[locale]/admin` placeholder: after login, admin lands on a one-line "Admin (coming soon)" page. Full shell is Phase 2.
- Cloudinary sign endpoint: `/api/cloudinary/sign` requires a valid admin session, validates requested `folder` against an allowlist (`products|recipes|industries|manufacturers`), signs with 15-minute TTL. Implementation is Phase 1; consumers (uploaders) are Phase 2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context (always)
- `CLAUDE.md` — Project-level guardrails (locked: translation siblings, typed spec long-table, locale routing, cache invalidation contract, Cloudinary direct upload, admin auth rules)
- `.planning/PROJECT.md` — Vision, core value, audience, constraints, out-of-scope. "What This Is" + Key Decisions table
- `.planning/REQUIREMENTS.md` §Foundations (FOUND-01..07) — acceptance criteria for this phase
- `.planning/ROADMAP.md` §"Phase 1: Foundations" — goal statement + 5 success criteria (must all be TRUE before phase exits)

### Architecture + schema (Phase 1 core)
- `.planning/research/ARCHITECTURE.md` §"Standard Architecture" + §"Component Responsibilities" — system overview, ERD, Vercel↔Neon deployment boundary
- `.planning/research/ARCHITECTURE.md` §"Pattern 1: Translated-fields = sibling `*_translations` table" — canonical example schema for `product` + `product_translations` (D-01 locale CHECK constraint, `UNIQUE (locale, slug)` pattern)
- `.planning/research/ARCHITECTURE.md` §"Pattern 2: Hybrid spec schema" — `spec_field` + `product_spec_values` DDL (D-16..D-21 build on this; note the data_type enum reconciliation in D-16)
- `.planning/research/ARCHITECTURE.md` §"Pattern 3: Locale routing via `[locale]` segment + middleware rewrite" — middleware sketch (D-03 detection chain aligns; update default from `ru` to `uz`)
- `.planning/research/ARCHITECTURE.md` §"Pattern 5: Full-text search — one `product_search` row per (product, locale)" — `product_search` table schema is declared in Phase 1, populated in Phase 3
- `.planning/research/ARCHITECTURE.md` §"Pattern 6: Admin writes via Server Actions" — `requireAdmin()` pattern, API route vs Server Action split
- `.planning/research/ARCHITECTURE.md` §"Pattern 7: Cloudinary signed direct uploads" — sign endpoint shape, `public_id` storage contract

### Technology stack (version + library choices)
- `.planning/research/STACK.md` §"Executive Recommendation" — Next.js 16 / React 19 / Drizzle / next-intl v4 / Auth.js v5 / Resend / Neon HTTP driver — all locked
- `.planning/research/STACK.md` §"Installation" — canonical `pnpm` install sequence for Phase 1 scaffold
- `.planning/research/STACK.md` §"Version Compatibility" — confirmed peers (React 19 required for Next 16, node 20/22 LTS, `@auth/drizzle-adapter` shape)
- `.planning/research/STACK.md` §"Version Verification Notes" — Drizzle/next-intl/Auth.js exact minors to be verified at `pnpm install` time

### Pitfalls (things Phase 1 must prevent, ordered by Phase-1 relevance)
- `.planning/research/PITFALLS.md` §"Pitfall 1: Russian-first content schema" — prevented by D-01..D-08 (sibling translations, `uz` default, `uz → ru → en` chain, banner policy)
- `.planning/research/PITFALLS.md` §"Pitfall 2: Spec values as opaque strings" — prevented by D-16..D-21 (typed `num_value/text_value/enum_value/bool_value` + unit, enum option keys)
- `.planning/research/PITFALLS.md` §"Pitfall 7: Serverless + Postgres connection meltdown" — Claude's Discretion item (pooled URL at runtime, direct URL for migrations)
- `.planning/research/PITFALLS.md` §"Pitfall 10: JSONB spec filtering performance cliff" — prevented by D-16 long-table shape (no JSONB specs bag)
- `.planning/research/PITFALLS.md` §"Pitfall 12: Locale fallback leaks" — addressed by D-05..D-08 (single rule, banner, `inLanguage` JSON-LD)
- `.planning/research/PITFALLS.md` §"Pitfall 14: Spec-schema evolution" — addressed by D-19 (mutable key with migration-aware rename transaction)
- `.planning/research/PITFALLS.md` §"Integration Gotchas" — Neon pooler string, Vercel region co-location (fra1 ↔ eu-central-1), Cloudinary signed upload TTL

### Full research context
- `.planning/research/FEATURES.md` — feature map (reference when planning Phase 1 deliverables align to later phases)
- `.planning/research/SUMMARY.md` — synthesized executive summary of the three research docs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

None. Repository contains only `.planning/` + `CLAUDE.md` + `.claude/` so far. Phase 1 is the first code-producing phase.

### Established Patterns

None in-repo. Patterns will be established **by** Phase 1 and become conventions CLAUDE.md documents thereafter. The patterns Phase 1 must seed (for Phase 2+ to reuse):
- `src/db/schema/*.ts` — one file per aggregate root
- `src/db/client.ts` — Drizzle client on `@neondatabase/serverless` HTTP driver
- `src/lib/auth.ts` — Auth.js v5 config + `auth()` export + `requireAdmin()` helper
- `src/env.ts` — `@t3-oss/env-nextjs` Zod-validated env boundary
- `src/i18n/` — next-intl config, dictionary files, middleware helper
- `middleware.ts` (repo root) — locale redirect + admin gate
- `src/app/[locale]/layout.tsx` — locale provider + `next/font` subset setup
- `src/app/api/cloudinary/sign/route.ts` — signed upload endpoint

### Integration Points

- **Vercel build step**: `drizzle-kit migrate` against `DATABASE_URL_DIRECT` before Next.js build, to guarantee schema matches code before traffic is served. Fails the deploy if migration fails.
- **Neon**: pooled URL for runtime, direct URL for migrations. Neon-Vercel integration auto-creates preview branches on PR open.
- **Resend**: Auth.js Email provider sends magic links; React Email template for branded email shell. SPF/DKIM configured on Resend domain before Phase 2 invite flow ships.
- **Cloudinary**: signing only in Phase 1; actual upload consumers (admin MediaUploader) live in Phase 2.
- **Sentry**: instrumented across three runtimes (server/client/edge) via `@sentry/nextjs` wrapper in `next.config.mjs`. A smoke-test error is thrown once during Phase 1 verification to confirm events reach the project.

</code_context>

<specifics>
## Specific Ideas

- Inspirational SEO model is **fiztech.ru** — dense spec tables, clean minimal aesthetic. Phase 1's spec_field/product_spec_values shape must support that density (many typed fields per category, grouped in the detail page — the grouping is Phase 3, but the schema enables it).
- Uzbek Latin MUST use U+02BB (`ʻ`) for `oʻ`/`gʻ` — not `'` (U+0027). PITFALLS #9 calls this out. `src/lib/slug.ts` stub should normalize both to U+02BB on save.
- Neon region: **eu-central-1** (Frankfurt). Vercel region: **fra1**. Co-located per PITFALLS "Integration Gotchas" — cross-region adds 50–200ms per query, which compounds on the JOIN-heavy translation reads.
- Session strategy explicitly rejects JWT-only: the business requirement for true 24h idle timeout (not just cookie lifetime) makes database sessions the only faithful implementation.
- Bootstrap admin email handled at boot time, not build time — Vercel serverless doesn't have a reliable "build-time seed" hook, and build-time seeding against pooled URL is unsafe. Use a lazy boot-time check.

</specifics>

<deferred>
## Deferred Ideas

### To Phase 2 (Admin Panel)
- Full `LocaleSwitcher` component — Phase 1 middleware sets the cookie if one is present, but the UI to set it lives in Phase 2 layout work
- `requireAdmin()` Server Action wrapper full implementation (Phase 1 ships the stub for the placeholder admin page; Phase 2 hardens it for CRUD)
- `logAudit()` helper implementation (Phase 1 declares the `audit_log` table; Phase 2 writes rows from every mutation Server Action)
- Admin shell UI, invite flow, session timeout UX (banner + re-auth modal)
- `spec_field.key` rename migration UI + impact preview
- Slug admin UX (auto-generate + manual override + transliteration rules + collision suffix)
- Translation completeness indicator UI (schema has the data; UI is ADMIN-10)
- Cloudinary upload consumer components (`MediaUploader`, `DatasheetUploader`)

### To Phase 3 (Public + SEO + Search)
- `product_search` tsvector population on writes (Phase 1 declares the table; Phase 3 populates via write-path transaction per ARCHITECTURE §Pattern 5)
- hreflang + per-locale canonical emission per page
- JSON-LD generators (Product / Organization / BreadcrumbList / CollectionPage / TechArticle)
- Real typography choice + font pairing decision
- Fallback banner component + translated banner strings
- Listing-page translation badge component
- Search UI + autocomplete + part-number short-circuit

### To Phase 5 (Launch polish)
- `BOOTSTRAP_ADMIN_EMAIL` retirement plan (once the first admin has invited real admins, the env var can be unset — document in launch runbook)
- Cloudinary usage alert thresholds (50% / 75% / 90%)
- Sentry PII scrubbing audit + release tracking integration

### v2 / backlog
- `uz-Cyrl` locale support (triggers D-01 migration: `'uz'` rows → `'uz-Latn'`, add `'uz-Cyrl'` to CHECK)
- Editor / Admin RBAC split (D-11 `role` column is pre-wired — v2 just adds `'editor'` as a valid value + finer `requireAdmin()`)
- Per-entity source-of-truth locale override (rejected for v1 — PITFALLS #12 single-policy rule)
- Unit conversion semantics on spec filters (deferred per D-21)

</deferred>

---

*Phase: 01-foundations*
*Context gathered: 2026-04-21*
