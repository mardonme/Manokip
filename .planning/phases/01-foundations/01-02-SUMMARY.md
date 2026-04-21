---
phase: 01-foundations
plan: 02
subsystem: database
tags: [drizzle, schema, postgres, neon, translations, tsvector, auth-js]

requires:
  - phase: 01-foundations/01-01
    provides: Next.js scaffold, @t3-oss/env boundary (env.DATABASE_URL + env.DATABASE_URL_DIRECT typed), Vitest harness with tests/schema directory, drizzle-orm@0.45.2 + drizzle-kit@0.31.10 installed, @neondatabase/serverless@1.1.0 installed
provides:
  - 24-table Drizzle schema covering all Phase 1-5 entities (auth, admin, 8 entity bases, 7 translation siblings, 2 enum-option siblings, 2 misc)
  - Every translatable entity has a sibling *_translations table keyed (entity_id, locale) with CHECK(locale IN ('uz','ru','en'))
  - spec_data_type enum exactly ['number','text','enum','bool'] (D-16) — NO 'range' value
  - spec_filter_kind enum ['range','select','toggle'] (D-17) — 'range' lives on filter_kind, not data_type
  - product_spec_values long-table with typed columns (num_value/text_value/bool_value/enum_value + unit + is_extra/extra_key CHECK)
  - product_search per-locale tsvector customType with GIN index + three-locale CHECK
  - sessions.absoluteExpires TIMESTAMPTZ column for D-09 7d absolute session cap
  - Drizzle HTTP client (drizzle-orm/neon-http, runtime) + WebSocket client (drizzle-orm/neon-serverless, transactions)
  - drizzle.config.ts pointing at DATABASE_URL_DIRECT (Pitfall 3 — pooled URL silently fails DDL under PgBouncer)
  - Wave 0 schema snapshot tests: FOUND-01 translations invariants (4 assertions) + FOUND-02 spec-field shape (3 assertions)
affects: [phase-1-plan-03, phase-1-plan-05, phase-1-plan-06, phase-2, phase-3, phase-4]

tech-stack:
  added: []  # All deps were pinned in plan 01-01; this plan only authored source files
  patterns:
    - "Translations-sibling template (Pattern A): composite PK (entity_id, locale) + UNIQUE(locale, slug) [when slug exists] + locale idx + CHECK(locale IN ('uz','ru','en'))"
    - "Typed spec long-table (Pattern 4): num_value NUMERIC, text_value TEXT, bool_value BOOLEAN, enum_value TEXT, unit TEXT — NEVER an opaque value TEXT column"
    - "Dual Drizzle client boundary: @/db/client = HTTP (pooled runtime), @/db/client-ws = WebSocket Pool (transactions only)"
    - "drizzle-kit uses DATABASE_URL_DIRECT exclusively (never pooled) — Pitfall 3 guardrail"
    - "tsvector modeled via customType<{ data: string }>({ dataType() { return 'tsvector'; } }) — not a built-in Drizzle type (Assumption A5)"
    - "Self-referential category tree uses type AnyPgColumn cast on references callback to break TS circular inference"
    - "bigserial FK columns declared as bigint notNull().references(...) on the child side (product_spec_value_translations.valueId) — avoids double-sequence; bigserial only on the owning PK"

key-files:
  created:
    - src/db/schema/auth.ts
    - src/db/schema/admin.ts
    - src/db/schema/categories.ts
    - src/db/schema/manufacturers.ts
    - src/db/schema/products.ts
    - src/db/schema/spec-fields.ts
    - src/db/schema/spec-values.ts
    - src/db/schema/search.ts
    - src/db/schema/recipes.ts
    - src/db/schema/industries.ts
    - src/db/schema/contact.ts
    - src/db/schema/index.ts
    - src/db/client.ts
    - src/db/client-ws.ts
    - drizzle.config.ts
    - tests/schema/translations.test.ts
    - tests/schema/spec-field.test.ts
  modified:
    - tests/_fixtures/db.ts  # @ts-expect-error directive removed (committed in cb24dc8)

key-decisions:
  - "product_spec_value_translations.valueId typed as bigint (not bigserial) because it's a FK, not a PK — the owning row in product_spec_values already carries bigserial; a second bigserial would double-sequence."
  - "Plan 01-02 was split across two executor sessions; task 02.1 (auth/admin/core + clients + drizzle.config + translations.test) landed in commit cb24dc8, task 02.2 (spec/search/recipe/industry + barrel + spec-field.test) landed in commit 40ee1a0."
  - "@ts-expect-error directive on tests/_fixtures/db.ts @/db/client import was removed as part of commit cb24dc8 (task 02.1) — no separate fix-up commit needed in this continuation."

patterns-established:
  - "Pattern A (translations sibling): every *_translations table carries composite PK (entity_id, locale) + CHECK(locale IN ('uz','ru','en')) + per-locale idx; UNIQUE(locale, slug) added only when the table has a slug column"
  - "Pattern 4 (typed spec long-table): product_spec_values.num_value NUMERIC / text_value TEXT / bool_value BOOLEAN / enum_value TEXT / unit TEXT — a spec row populates exactly ONE typed slot, plus unit if overriding spec_field.unit (D-21)"
  - "Pattern 6 (dual Drizzle clients): HTTP default (neon-http on pooled DATABASE_URL), WebSocket fallback (neon-serverless Pool) used only where .transaction() is required — bootstrap admin INSERT..ON CONFLICT does NOT need it; Phase 3 product_search rebuild DOES"
  - "Pattern 10 (drizzle-kit config): out './drizzle', schema './src/db/schema/index.ts', DATABASE_URL_DIRECT (NOT pooled) to survive PgBouncer transaction-mode — snake_case casing for JS→DB column mapping"

requirements-completed: [FOUND-01, FOUND-02, FOUND-04]

duration: ~95min
completed: 2026-04-21
---

# Phase 1 Plan 02: Drizzle Schema Summary

**24-table Drizzle schema with sibling `*_translations` tables (CHECK locale IN uz/ru/en), typed `product_spec_values` long-table (num/text/bool/enum + unit), per-locale `product_search` tsvector with GIN index, dual HTTP/WebSocket Drizzle clients, and 7 green Wave 0 schema snapshot tests locking FOUND-01 + FOUND-02 invariants.**

## Performance

- **Duration:** plan spanned two executor sessions; ~95 min wall-clock across both.
- **Completed:** 2026-04-21
- **Tasks:** 2 (02.1 auth/admin/core + clients + drizzle.config + translations test · 02.2 spec/search/recipe/industry + barrel extension + spec-field test)
- **Files created:** 17 (11 schema modules + barrel + 2 client factories + drizzle.config.ts + 2 schema snapshot tests)
- **Files modified:** 1 (`tests/_fixtures/db.ts` — @ts-expect-error removed, part of commit cb24dc8)

## Accomplishments

- **All 24 Phase-1 tables declared in Drizzle TS:** auth (4) + admin (2) + category tree + translations + manufacturer + translations + product + translations + spec_field + translations + enum options + option translations + product_spec_values + value translations + product_search + recipe + translations + industry + translations + contact_submission = 24.
- **FOUND-01 locked at source-level:** source scan + barrel import test prove every `*_translations` table has composite PK `(entity_id, locale)` and `CHECK(locale IN ('uz','ru','en'))`. Zero per-locale columns anywhere in `src/db/schema/`.
- **FOUND-02 locked at source-level:** `specDataTypeEnum.enumValues` reflection proves exactly `['number','text','enum','bool']` (no `range`). `productSpecValues` has typed columns `numValue/textValue/boolValue/enumValue` plus `unit/isExtra/extraKey`; has no opaque `value` column.
- **Dual Drizzle clients wired via `@/env`:** `src/db/client.ts` uses `drizzle-orm/neon-http` on pooled `DATABASE_URL`; `src/db/client-ws.ts` uses `drizzle-orm/neon-serverless` `Pool` for transactions on the same URL. Both import `* as schema from './schema'` so the type-safe query builder sees all 24 tables at once.
- **drizzle-kit Pitfall 3 guardrail committed:** `drizzle.config.ts` reads `process.env.DATABASE_URL_DIRECT!` (the non-pooled URL). Using pooled `DATABASE_URL` would silently no-op DDL under PgBouncer transaction-mode pooling — the migration appears to succeed but the schema is never actually applied.
- **D-09 7d absolute session cap column in place:** `sessions.absoluteExpires` is a TIMESTAMPTZ Phase 1 column; Phase 1 plan 05 populates it in the signIn callback and Phase 2's `requireAdmin()` enforces it.
- **Wave 0 schema snapshot tests green:** `pnpm vitest run` exits 0 with **23/23 tests passing** — 4 env (plan 01-01), 12 slug (plan 01-01), 4 translations snapshot (this plan), 3 spec-field snapshot (this plan).
- **`pnpm typecheck` exits 0** across the full schema barrel, both client factories, and drizzle.config.ts — type-safe query builder is live.

## Schema Inventory (24 tables)

### Auth.js v5 + admin (6 tables — no translations)
| Table | Purpose |
|-------|---------|
| `auth_users` | Auth.js `user` table (text PK via `crypto.randomUUID()`, unique email) |
| `auth_accounts` | Auth.js account table (composite PK `(provider, providerAccountId)`) |
| `sessions` | Auth.js sessions + `absolute_expires TIMESTAMPTZ` (D-09 7d cap) |
| `verification_tokens` | Auth.js magic-link tokens (composite PK `(identifier, token)`) |
| `admin_user` | app-owned allowlist; PK=email; `role` default `'admin'` (D-10, D-11); `active` flag |
| `audit_log` | declared Phase 1, written Phase 2 (`bigserial` PK, before/after JSONB, actor_email) |

### Core catalog (6 base + 3 translations = 9 tables)
| Table | Purpose |
|-------|---------|
| `category` | Self-referential tree (`parent_id` FK, `AnyPgColumn` cast; `on delete restrict`) |
| `category_translations` | `(category_id, locale)` PK; `name`, `slug`, `description`; UNIQUE(locale, slug) |
| `manufacturer` | Base + `logo_public_id` TEXT (D-07 Cloudinary), `website_url` |
| `manufacturer_translations` | `(manufacturer_id, locale)` PK; `name`, `slug`, `description`; UNIQUE(locale, slug) |
| `product` | FKs to `category` (required) + `manufacturer` (optional); `sku` UNIQUE; `published_at` NULL = draft |
| `product_translations` | `(product_id, locale)` PK; `name`, `slug`, `short_desc`, `long_desc`; UNIQUE(locale, slug) |

### Spec schema (2 base + 2 translations + 2 enum-option + 2 option-translations = 4 user-facing tables / 6 total)
| Table | Purpose |
|-------|---------|
| `spec_field` | Catalog — per-category field (`key` + `data_type` + `unit` + `filter_kind` + `filter_group_key`); `(category_id, key)` UNIQUE |
| `spec_field_translations` | `(spec_field_id, locale)` PK; `label` per locale; no slug |
| `spec_field_enum_option` | D-18 — opaque `key` stored in `product_spec_values.enum_value`; `(spec_field_id, key)` UNIQUE |
| `spec_field_enum_option_translations` | `(option_id, locale)` PK; translated `label` — the opaque key NEVER translated |
| `product_spec_values` | **Typed long-table** (FOUND-02): `num_value NUMERIC`, `text_value TEXT`, `bool_value BOOLEAN`, `enum_value TEXT`, `unit TEXT`; `is_extra` + `extra_key` with CHECK `is_extra=false OR extra_key IS NOT NULL`; indexes on `(spec_field_id, num_value)` and `(spec_field_id, enum_value)` for the filter fast-path |
| `product_spec_value_translations` | D-20 — `(value_id, locale)` PK; `text_value` per locale (for free-form extras + text-typed specs that need localization) |

### Content + search (3 base + 2 translations + 1 search = 6 tables)
| Table | Purpose |
|-------|---------|
| `recipe` | Base + `featured_image_public_id` + `published_at` |
| `recipe_translations` | `(recipe_id, locale)` PK; `title`, `slug` (UNIQUE per locale), `excerpt`, `body JSONB` (Tiptap doc) |
| `industry` | Base + `featured_image_public_id` + `published_at` |
| `industry_translations` | `(industry_id, locale)` PK; `title`, `slug` (UNIQUE per locale), `excerpt`, `body JSONB` (Tiptap doc) |
| `product_search` | `(product_id, locale)` PK; `search_tsv` tsvector + GIN index; declared Phase 1, populated Phase 3 |
| `contact_submission` | No translations — messages stored as-received; `source_page` for CTA-03 |

## Translations Sibling Inventory

Entities with a sibling `*_translations` table (8 total):
- `category` → `category_translations`
- `product` → `product_translations`
- `manufacturer` → `manufacturer_translations`
- `spec_field` → `spec_field_translations`
- `spec_field_enum_option` → `spec_field_enum_option_translations`
- `recipe` → `recipe_translations`
- `industry` → `industry_translations`
- `product_spec_values` → `product_spec_value_translations`

Entities intentionally without translations:
- `auth_users`, `auth_accounts`, `sessions`, `verification_tokens` (Auth.js surface)
- `admin_user`, `audit_log` (operational surface, not visitor-facing)
- `contact_submission` (messages stored as visitor typed them; locale is a tag column, not a translation key)

## Enum Declarations

| Enum | Values | Rationale |
|------|--------|-----------|
| `spec_data_type` | `['number','text','enum','bool']` | **D-16** — a range is NOT a data type. A range is two `number` spec fields sharing `filter_group_key` (e.g., `pressure_min`, `pressure_max` both group_key=`pressure_range`). Encoding `range` as a data_type would force the long-table to carry `num_value_min` / `num_value_max` columns, coupling filter UI to storage shape. |
| `spec_filter_kind` | `['range','select','toggle']` | **D-17** — filter behavior is distinct from value shape. `range` lives HERE because it describes how the UI pairs two `number` fields; `select` = single-value enum dropdown; `toggle` = boolean. NULL `filter_kind` = field is display-only (never rendered in the facet panel). |

## Drizzle Client Decision Matrix

| Use case | Client | Driver | When |
|----------|--------|--------|------|
| RSC / Server Action / route handler read | `@/db/client` (`db`) | `drizzle-orm/neon-http` | Default. One-shot SELECT / INSERT / UPDATE / DELETE that doesn't need multi-statement atomicity. |
| `.transaction(async (tx) => { ... })` | `@/db/client-ws` (`dbTx`) | `drizzle-orm/neon-serverless` + `Pool` | Only when ACID atomicity across multiple statements is required. Phase 3 product_search rebuild (delete old 3 rows + insert new 3 rows in one tx) uses this. |
| Bootstrap admin `INSERT..ON CONFLICT DO NOTHING` | `@/db/client` (`db`) | HTTP | Single statement; the `ON CONFLICT` clause handles idempotency at the statement level — no transaction needed. |

## Task Commits

1. **Task 02.1 — auth/admin/core entities + Drizzle clients + drizzle.config.ts + translations snapshot test** — `cb24dc8` (feat)
   - Landed in prior executor session before context cap.
   - Also removed `@ts-expect-error` from `tests/_fixtures/db.ts` (the `@/db/client` import now resolves).
2. **Task 02.2 — spec/search/recipe/industry schemas + barrel extension + spec-field snapshot test** — `40ee1a0` (feat)
   - Continuation session. Verified all 5 untracked modules + extended barrel + new test matched plan verbatim before staging and committing.

Plan metadata commit (this SUMMARY + STATE + ROADMAP update) will follow as `docs(01-02): complete Drizzle schema plan`.

## Files Created/Modified

**Created (17):**
- `src/db/schema/auth.ts` — Auth.js v5 tables + `sessions.absoluteExpires` (D-09)
- `src/db/schema/admin.ts` — `admin_user` (email PK, role default 'admin') + `audit_log` (bigserial PK)
- `src/db/schema/categories.ts` — self-ref tree + `category_translations` sibling
- `src/db/schema/manufacturers.ts` — base + `logo_public_id` + translations sibling
- `src/db/schema/products.ts` — base (FK category/manufacturer, sku unique, publishedAt) + translations sibling
- `src/db/schema/spec-fields.ts` — two enums + `spec_field` catalog + translations + enum options + option translations
- `src/db/schema/spec-values.ts` — typed long-table + translations sibling (D-20)
- `src/db/schema/search.ts` — `product_search` with tsvector customType + GIN index
- `src/db/schema/recipes.ts` — base + translations (Tiptap JSONB body)
- `src/db/schema/industries.ts` — base + translations (Tiptap JSONB body)
- `src/db/schema/contact.ts` — `contact_submission` (no translations; `source_page` for CTA-03)
- `src/db/schema/index.ts` — barrel re-exporting all 11 modules
- `src/db/client.ts` — `drizzle-orm/neon-http` HTTP client from `env.DATABASE_URL`
- `src/db/client-ws.ts` — `drizzle-orm/neon-serverless` `Pool` client from `env.DATABASE_URL`
- `drizzle.config.ts` — drizzle-kit config against `DATABASE_URL_DIRECT` (Pitfall 3)
- `tests/schema/translations.test.ts` — 4 Wave 0 assertions (FOUND-01)
- `tests/schema/spec-field.test.ts` — 3 Wave 0 assertions (FOUND-02)

**Modified (1):**
- `tests/_fixtures/db.ts` — removed `@ts-expect-error` on `@/db/client` import (module now exists; directive would self-error). Committed as part of `cb24dc8`.

## Decisions Made

- **`product_spec_value_translations.valueId` typed as `bigint`, not `bigserial`.** It's a FK pointing at `product_spec_values.id` (which is the owning `bigserial`). A second `bigserial` would generate its own sequence and cause dual-ID writes on the translation row.
- **Plan split across two sessions by prior agent's context cap.** Task 02.1 landed in `cb24dc8` (auth/admin/core + clients + drizzle.config + translations test). Task 02.2 pending files were authored but uncommitted when the prior agent ran out; this continuation session reviewed each pending file against the plan verbatim, ran typecheck + test suite green, then committed as `40ee1a0`.
- **`@ts-expect-error` on `tests/_fixtures/db.ts` removed in task 02.1's commit** (`cb24dc8`), not in a separate follow-up commit. The executor-prompt asked for a second `chore(01-02)` commit but the directive was already gone in the working tree. No additional action needed; documented here instead.

## Deviations from Plan

None — plan executed as written. The split across two executor sessions (02.1 in `cb24dc8`, 02.2 in `40ee1a0`) is a continuation operational detail, not a scope or design deviation.

## Issues Encountered

- **Prior executor session hit context cap mid-plan.** Task 02.1 was fully committed (`cb24dc8`), task 02.2's 6 files were authored in the working tree but uncommitted. Continuation session reviewed each pending file for LOCKED-rule compliance (critical_rules 1-7 from the executor prompt), ran `pnpm typecheck` + full `pnpm vitest run` green, then committed atomically.
- **CRLF warnings on `git add`** for all 7 staged files (`src/db/schema/index.ts`, 5 new schema modules, `tests/schema/spec-field.test.ts`). This is a Windows line-ending normalization notice from core.autocrlf — no content impact; Git stores LF and checks out CRLF on Windows. No action.

## User Setup Required

None. External-service setup (Neon test branch, Resend, Cloudinary, Sentry) is required before plans 03, 05, 06, 07 can run end-to-end, and will be documented in each plan's SUMMARY as needed.

## Next Phase Readiness

**Plan 01-03 (drizzle-kit generate/migrate + vercel.json) is unblocked:**
- `drizzle.config.ts` points at `DATABASE_URL_DIRECT`; running `pnpm drizzle-kit generate` will produce `drizzle/0000_*.sql` against the full schema barrel.
- `src/db/client.ts` + `src/db/client-ws.ts` are ready to receive live Neon reads/writes once migration lands.
- `tests/db/.gitkeep` exists (plan 01-01); plan 01-03 will add `tests/db/locale-constraint.test.ts` + `tests/db/spec-values.test.ts` against the test branch.

**Plan 01-05 (Auth.js v5) is unblocked:**
- `authUsers`, `authAccounts`, `sessions`, `verificationTokens` are declared and type-safe via the barrel import.
- `sessions.absoluteExpires` is in place; the `signIn` callback in plan 01-05 will write `now() + 7d` to it.
- `adminUsers` is declared; the `signIn` callback checks membership + `active=true`.

**Phase 3 search (SRCH-01..05) is unblocked:**
- `product_search` with per-locale tsvector + GIN index is declared. Phase 3 only needs to wire the write-path transaction (rebuild three locale rows on product mutation) and the read-path query helper.

**Phase 2 admin CRUD (ADMIN-03..08) is unblocked:**
- `spec_field`, `spec_field_enum_option`, and `product_spec_values` shapes are locked. The spec-schema editor (ADMIN-05) + product CRUD (ADMIN-06) can proceed against a stable API surface.

## TDD Gate Compliance

Plan 01-02 is not flagged `type: tdd` at the plan level, but both tasks carry `tdd="true"`. The intent is "schema snapshot tests bootstrap alongside the schema they guard." Because the invariants are structural (enum values, column names, constraint presence), RED→GREEN as a time-ordered pair is less meaningful than "source-level invariant asserted on every commit." Both snapshot test files (`tests/schema/translations.test.ts` + `tests/schema/spec-field.test.ts`) were committed in the same commit as the schema modules they assert over (`cb24dc8` for translations, `40ee1a0` for spec-field) — test code and implementation code landed together. Running `pnpm vitest run` exits 0 with all 7 schema assertions green.

Gate commits visible in `git log`:
- `cb24dc8` feat(01-02) — 6 schema modules + clients + drizzle.config + `tests/schema/translations.test.ts` (task 02.1)
- `40ee1a0` feat(01-02) — 5 schema modules + barrel extension + `tests/schema/spec-field.test.ts` (task 02.2)

## Self-Check

Verifying every `must_haves.truths` item from the plan frontmatter:

- [x] **PASSED** — "Every translatable entity (category, product, manufacturer, spec_field, spec_field_enum_option, recipe, industry, product_spec_value) has a sibling *_translations table keyed (entity_id, locale)" — 8 translations tables present; every one has composite PK with locale column (verified by `tests/schema/translations.test.ts` test 2, green).
- [x] **PASSED** — "No table in src/db/schema/ has any column ending in _uz, _ru, or _en" — `grep -rE "(_uz|_ru|_en)(['\"]|:)" src/db/schema/` returns zero matches; `tests/schema/translations.test.ts` test 1 asserts the same invariant with a regex over all file contents.
- [x] **PASSED** — "spec_field.data_type enum equals ['number','text','enum','bool'] exactly — no 'range' value" — `src/db/schema/spec-fields.ts` line 22-27 declares `pgEnum('spec_data_type', ['number', 'text', 'enum', 'bool'])`. `tests/schema/spec-field.test.ts` test 1 asserts `specDataTypeEnum.enumValues` sorted = `['bool','enum','number','text']` AND does NOT contain `'range'`. Green.
- [x] **PASSED** — "product_spec_values has typed columns num_value, text_value, bool_value, enum_value, unit — no opaque value TEXT column" — `src/db/schema/spec-values.ts` declares `numValue`, `textValue`, `boolValue`, `enumValue`, `unit`. `tests/schema/spec-field.test.ts` test 3 asserts the TS column names via `Object.keys(productSpecValues)` include all 5 typed columns + `isExtra` + `extraKey`, and do NOT include `value`. Green.
- [x] **PASSED** — "Every *_translations table has a CHECK (locale IN ('uz','ru','en')) constraint" — `tests/schema/translations.test.ts` test 3 regex-asserts the literal `check(...sql\`... locale ... IN ('uz','ru','en')\`)` on every `pgTable('<name>_translations', ...)` block in every schema file. Green.
- [x] **PASSED** — "Every *_translations table has UNIQUE(locale, slug) where a slug column exists" — manual review: `category_translations`, `manufacturer_translations`, `product_translations`, `recipe_translations`, `industry_translations` all declare `uniqueIndex('..._translations_locale_slug').on(t.locale, t.slug)`. Tables without a slug column (`spec_field_translations`, `spec_field_enum_option_translations`, `product_spec_value_translations`) correctly omit the uniqueIndex.
- [x] **PASSED** — "Drizzle client factories exist for both HTTP (runtime) and WebSocket (transactional) on Neon" — `src/db/client.ts` imports `drizzle-orm/neon-http` + `@neondatabase/serverless`/`neon`; `src/db/client-ws.ts` imports `drizzle-orm/neon-serverless` + `@neondatabase/serverless`/`Pool`. Both read from `env.DATABASE_URL` and re-export the `* as schema` barrel.
- [x] **PASSED** — "sessions table includes absoluteExpires TIMESTAMPTZ column for D-09 7d absolute session cap enforcement by requireAdmin()" — `src/db/schema/auth.ts` line 51-54 declares `absoluteExpires: timestamp('absolute_expires', { mode: 'date', withTimezone: true })`. Column will be populated by the signIn callback in plan 01-05 and enforced by `requireAdmin()` in Phase 2.
- [x] **PASSED** — "Schema snapshot tests pass: pnpm vitest run tests/schema/translations.test.ts + tests/schema/spec-field.test.ts" — full `pnpm vitest run` reports `Test Files  4 passed (4) / Tests  23 passed (23)` in 592ms. The two schema test files contribute 4 + 3 = 7 of those 23.

Verifying `must_haves.artifacts`:

- [x] **PASSED** — `src/db/schema/index.ts` exports all required names. `grep -E "^export \* from" src/db/schema/index.ts` returns 11 lines, one per module. Barrel import smoke test in `tests/schema/translations.test.ts` test 4 dereferences `mod.authUsers`, `mod.adminUsers`, `mod.products`, `mod.productTranslations`, `mod.categoryTranslations`, `mod.manufacturerTranslations` and they all resolve.
- [x] **PASSED** — `src/db/schema/products.ts` contains the literal `check('product_translations_locale_check'`. Grep confirms.
- [x] **PASSED** — `src/db/schema/spec-fields.ts` contains the literal `pgEnum('spec_data_type', ['number', 'text', 'enum', 'bool'])`. Grep confirms.
- [x] **PASSED** — `src/db/schema/spec-values.ts` contains `numValue: numeric('num_value')`. Grep confirms.
- [x] **PASSED** — `drizzle.config.ts` contains `DATABASE_URL_DIRECT`. Grep confirms (2 occurrences: one in the Pitfall 3 comment, one in `dbCredentials.url`).
- [x] **PASSED** — `src/db/client.ts` imports `drizzle-orm/neon-http`. Grep confirms (1 match).
- [x] **PASSED** — `src/db/client-ws.ts` imports `drizzle-orm/neon-serverless`. Grep confirms (1 match).

Verifying `must_haves.key_links`:

- [x] **PASSED** — `src/db/schema/index.ts` → every `src/db/schema/*.ts` via `export *`. 11 `export *` lines present, one per sibling module.
- [x] **PASSED** — `drizzle.config.ts` → `src/db/schema/index.ts` via `schema: './src/db/schema/index.ts'`. Line 10 of drizzle.config.ts.
- [x] **PASSED** — `drizzle.config.ts` → `env.DATABASE_URL_DIRECT` via `dbCredentials.url = process.env.DATABASE_URL_DIRECT`. Line 13 of drizzle.config.ts (`url: process.env.DATABASE_URL_DIRECT!`).

Commit hashes verified exist:

- [x] `cb24dc8` — `git log --oneline` FOUND (`feat(01-02): add auth/admin/core entity schemas + Drizzle clients + drizzle.config`)
- [x] `40ee1a0` — `git log --oneline` FOUND (`feat(01-02): add spec/search/recipe/industry schemas + extended barrel + spec-field Wave 0 test`)

Tooling verification:

- [x] **PASSED** — `pnpm typecheck` exits 0 (no TS errors across schema barrel, client factories, drizzle.config).
- [x] **PASSED** — `pnpm vitest run` exits 0 with `Test Files 4 passed (4) / Tests 23 passed (23)` — all 4 env + 12 slug (plan 01-01) + 4 translations + 3 spec-field (this plan).

**Self-Check: PASSED (9/9 must_haves.truths green, 7/7 must_haves.artifacts verified, 3/3 key_links verified, 2/2 commit hashes present, 2/2 tooling green).**

---
*Phase: 01-foundations*
*Completed: 2026-04-21*
