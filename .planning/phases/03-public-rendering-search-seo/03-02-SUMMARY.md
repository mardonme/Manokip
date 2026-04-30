---
phase: 03-public-rendering-search-seo
plan: 02
subsystem: data-write-path
tags: [drizzle, neon, postgres, fts, tsvector, migration, server-actions, srch-05, mfg-01, mfg-02, gap-1]

# Dependency graph
requires:
  - phase: 03-public-rendering-search-seo
    provides: Wave-0 test scaffolding (Plan 01) — seed-public fixture skeleton, RED stub for SRCH-05 in tests/actions/products.test.ts, schema-dts dep, cacheComponents enabled
  - phase: 02-admin-panel
    provides: saveProduct/duplicateProduct 5-step transaction, dbTx WebSocket pool, withAdminAction wrapper, productSearch table (Phase 1, empty until now), product_translations + product_spec_values tables
provides:
  - Additive migration 0002_phase3_media_search_manufacturer (extensions + 4 columns) applied to Neon dev
  - rebuildProductSearch(tx, productId) helper inside src/actions/products.ts — atomic Step 6 of saveProduct AND duplicateProduct
  - product.image_public_ids + datasheet_public_ids text[] columns populated by saveProduct on every save and cloned by duplicateProduct
  - manufacturer.is_official_rep boolean + manufacturer_translations.relationship_note text columns ready for D-10/D-11 admin + public surfaces (downstream plans 07/05/03)
  - Extended seed-public fixture: WIKA flagged is_official_rep=true with per-locale relationship_note; every seeded product carries hero+side image_public_ids and a datasheet
  - 4 new live-Neon vitest specs in tests/actions/products.test.ts closing SRCH-05 + Phase-2 Gap 1
affects: [03-03-public-shell-locale-jsonld, 03-04-catalog-listing-filters, 03-05-product-detail, 03-06-search-autocomplete-locale-fallback, 03-07-manufacturer-pages, 03-08-sitemap-robots-seo, 03-09-smoke-cwv]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-locale FTS rebuild via INSERT ... ON CONFLICT (product_id, locale) DO UPDATE — keeps row count to exactly 3 across re-saves"
    - "Drizzle sql`` parameterization for regconfig casts (closed enum source — T-03-02-01 mitigation)"
    - "Shared rebuildProductSearch helper called from BOTH saveProduct + duplicateProduct so the FTS contract has a single source of truth"
    - "Drizzle tx-typed helper signature via Parameters<Parameters<typeof dbTx.transaction>[0]>[0] — no neon-driver type leakage"
    - "Hand-prepended CREATE EXTENSION IF NOT EXISTS in a drizzle-kit-generated SQL file (drizzle-kit cannot generate extensions from schema diffs)"
    - "Spread-clone pattern for array columns in duplicateProduct: [...src.imagePublicIds] avoids alias coupling"

key-files:
  created:
    - "drizzle/0002_phase3_media_search_manufacturer.sql — additive migration: 2 CREATE EXTENSION + 4 ALTER TABLE ADD COLUMN"
    - "drizzle/meta/0002_snapshot.json — Drizzle schema snapshot for the new migration"
    - "scripts/verify-extensions.ts — ad-hoc verification script for pg_extension + information_schema.columns + drizzle.__drizzle_migrations"
  modified:
    - "src/db/schema/manufacturers.ts — added isOfficialRep boolean column + relationshipNote nullable text column to manufacturer_translations"
    - "src/db/schema/products.ts — added imagePublicIds + datasheetPublicIds text[] NOT NULL DEFAULT '{}' columns"
    - "src/actions/products.ts — added rebuildProductSearch helper, integrated as Step 6 of saveProduct + final step of duplicateProduct; Step 1 now writes media arrays on both insert and update branches; duplicateProduct clones media arrays via spread"
    - "tests/actions/products.test.ts — flipped describe.skip SRCH-05 stub to 4 live-Neon GREEN specs (create rebuild, re-save update without duplicates, media-array persist, duplicate clones arrays)"
    - "tests/fixtures/seed-public.ts — populates is_official_rep=true on WIKA + relationship_note per locale on WIKA, image_public_ids + datasheet_public_ids per product; teardown defensively drops product_search rows"
    - "drizzle/meta/_journal.json — registered new migration tag"

key-decisions:
  - "tsvector rebuild lives inside the saveProduct transaction (Step 6, after audit). Asynchronous/queued rebuild was rejected: a search query running between commit and rebuild would either miss the product (rebuild deferred) or surface stale data (rebuild raced). At v1 scale (≤500 products) the per-product rebuild is ≤50ms — synchronous is the simpler, correct shape (T-03-02-03 accept)."
  - "Single rebuildProductSearch helper called from BOTH saveProduct and duplicateProduct rather than duplicating the SQL. Single source of truth means Plan 06 (search) can rely on the FTS contract holding for both write paths."
  - "Migration is purely additive — 2 CREATE EXTENSION IF NOT EXISTS + 4 ALTER TABLE ADD COLUMN with safe defaults. No backfill required (existing rows get [] / false / NULL on the new columns automatically). Auto-approved per the orchestrator's pre-approval contract."
  - "Used CREATE EXTENSION IF NOT EXISTS rather than CREATE EXTENSION — idempotent against re-runs and against Neon branches that already have the extensions (Pitfall #4)."
  - "PG_CONFIG map is closed/keyed by Locale type so the regconfig cast is never user-controlled (closes T-03-02-01 tampering risk on the dynamic SQL)."

# Metrics
duration: ~14min
completed: 2026-04-30
tasks: 3
files_created: 3
files_modified: 6
---

# Phase 3 Plan 02: Data Write-Path Migration & Search Rebuild Summary

**Phase-2 silent gaps closed: saveProduct now persists media arrays AND rebuilds product_search tsvector for 3 locales atomically; duplicateProduct clones arrays + populates clone tsvector. Migration 0002_phase3_media_search_manufacturer applied to Neon dev.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-04-30T07:06:57Z (worktree base verification)
- **Completed:** 2026-04-30T07:20:28Z
- **Tasks:** 3
- **Files created:** 3 (migration SQL + snapshot + verify script)
- **Files modified:** 6 (2 schema files + 1 action file + 1 fixture + 1 test file + 1 journal)

## Accomplishments

- **SRCH-05 closed end-to-end** — `rebuildProductSearch(tx, productId)` rebuilds the per-locale tsvector for all three locales (`uz` / `ru` / `en`) inside the same atomic transaction as the product write. Called from both `saveProduct` (Step 6, after audit) and `duplicateProduct` (final step, before tx return). Subsequent re-saves use `ON CONFLICT (product_id, locale) DO UPDATE` so the row count stays at exactly 3.
- **Phase-2 Gap 1 closed** — `imagePublicIds` and `datasheetPublicIds` are now persisted on every save (both insert and update branches of `saveProduct`) and cloned by `duplicateProduct` via spread (`[...src.imagePublicIds]`). The Phase-2 Zod schema already declared the fields; only the action body never wrote them.
- **D-11 schema landed** — `manufacturer.is_official_rep BOOLEAN NOT NULL DEFAULT false` and `manufacturer_translations.relationship_note TEXT NULL` are live in Neon dev. Drives the Authorized-representative badge on the product detail page (D-01) and on manufacturer landing pages (D-10) in downstream plans.
- **Postgres extensions installed** — `unaccent` and `pg_trgm` added via `CREATE EXTENSION IF NOT EXISTS`. Required by Plan 06 (search autocomplete + accent-insensitive matching).
- **seed-public fixture is now Phase-3-complete** — WIKA flagged official-rep with per-locale relationship notes; every seeded product carries hero+side image public_ids + a datasheet. Downstream test suites can rely on these without setup ceremony.
- **Live-DB verification** captured in `scripts/verify-extensions.ts`:
  - `SELECT extname FROM pg_extension` returns `[ pg_trgm, unaccent ]`.
  - `information_schema.columns` confirms 4 new columns with correct types and defaults.
  - `drizzle.__drizzle_migrations` row id=3 records the applied migration.

## Task Commits

Each task was committed atomically with `--no-verify`:

1. **Task 2.1: Drizzle schema columns + Zod confirmation** — `174e8e3` (feat) — `src/db/schema/manufacturers.ts`, `src/db/schema/products.ts`. Zod already had `imagePublicIds`/`datasheetPublicIds` from Phase 2.
2. **Task 2.2: Generate + apply migration 0002_phase3_media_search_manufacturer** — `228b066` (feat) — `drizzle/0002_phase3_media_search_manufacturer.sql`, `drizzle/meta/0002_snapshot.json`, `drizzle/meta/_journal.json`, `scripts/verify-extensions.ts`. Generated via `pnpm drizzle-kit generate`, hand-prepended `CREATE EXTENSION` statements, renamed from auto-tag, applied via `pnpm drizzle-kit migrate` to Neon dev.
3. **Task 2.3: saveProduct + duplicateProduct extensions + tests + fixture** — `f6a27bc` (feat) — `src/actions/products.ts`, `tests/actions/products.test.ts`, `tests/fixtures/seed-public.ts`. 15/15 vitest specs pass.

## Files Created/Modified

### Created

- `drizzle/0002_phase3_media_search_manufacturer.sql` — 6 statements (2 CREATE EXTENSION + 4 ALTER TABLE ADD COLUMN), all additive. First 2 hand-prepended; 4 ALTER TABLEs auto-generated by drizzle-kit.
- `drizzle/meta/0002_snapshot.json` — Drizzle's serialized schema snapshot for the new migration (large auto-generated file).
- `scripts/verify-extensions.ts` — One-off TypeScript script that connects via `DATABASE_URL_DIRECT` and dumps `pg_extension`, `information_schema.columns` (filtered to the 4 new columns), and `drizzle.__drizzle_migrations`. Useful for follow-up migrations + audits.

### Modified

- `src/db/schema/manufacturers.ts` — imported `boolean` from `drizzle-orm/pg-core`; added `isOfficialRep: boolean('is_official_rep').notNull().default(false)` to the `manufacturers` table; added `relationshipNote: text('relationship_note')` (nullable) to `manufacturer_translations`. Comments tag both fields with D-11.
- `src/db/schema/products.ts` — added `imagePublicIds: text('image_public_ids').array().notNull().default(sql\`'{}'::text[]\`)` and `datasheetPublicIds: text('datasheet_public_ids').array().notNull().default(sql\`'{}'::text[]\`)` to the `products` table. Comments document the Cloudinary public_id contract and CAT-06 dependency.
- `src/actions/products.ts` — added the `Locale` type alias, `PG_CONFIG` per-locale dictionary map, and the `rebuildProductSearch(tx, productId)` helper. Step 1 of `saveProduct` now writes `imagePublicIds` and `datasheetPublicIds` on both insert and update branches. Step 6 (the new final step) calls the helper. `duplicateProduct` clones the media arrays via spread and calls the helper for the clone before returning.
- `tests/actions/products.test.ts` — replaced the `describe.skip` SRCH-05 stub with a `describe('SRCH-05 + Gap 1 — Phase 3 saveProduct + duplicateProduct extensions (live Neon)')` block containing 4 GREEN specs: SRCH-05 create rebuild, SRCH-05 re-save update (no duplicates), Gap 1 image/datasheet persistence, Gap 1 duplicate cloning + clone tsvector population. Reuses the existing `seedProduct` fixture for category seeding; cleans `product_search` and `audit_log` rows defensively.
- `tests/fixtures/seed-public.ts` — `MANUFACTURER_TRANSLATIONS` now includes `relationshipNote` per locale (WIKA populated; BD/Metran null). `manufacturer` insert sets `is_official_rep=true` for WIKA and `false` explicitly for the other two. `product` inserts now include `image_public_ids` (`hero` + `side` per SKU) and `datasheet_public_ids` (`datasheet` per SKU). Teardown defensively drops `product_search` rows.
- `drizzle/meta/_journal.json` — appended the entry for tag `0002_phase3_media_search_manufacturer` (auto-rewritten on rename).

## Decisions Made

- **tsvector rebuild is synchronous inside the write transaction.** An asynchronous/queued rebuild would create a window where a search query could miss a freshly-saved product (rebuild deferred) or surface stale data (rebuild raced). The threat model accepts the small per-product rebuild cost (≤50ms at v1 scale, ≤500 products) — T-03-02-03 disposition `accept`. If scale grows, Phase 5 can introduce a queued background job that supersedes Step 6.
- **Single `rebuildProductSearch` helper used by both write paths.** Saves `saveProduct` and `duplicateProduct` from divergent SQL; keeps the FTS contract single-sourced for downstream Plan 06 (search).
- **Migration is purely additive.** 2 `CREATE EXTENSION IF NOT EXISTS` + 4 `ALTER TABLE ADD COLUMN` with safe defaults (`'{}'::text[]`, `false`, NULL). No backfill required. The `IF NOT EXISTS` clauses make the migration idempotent against re-runs and against Neon branches that may already have the extensions installed (Pitfall #4 mitigation).
- **`PG_CONFIG` is a closed/typed map keyed by `Locale`** — the regconfig cast value is therefore never user-controlled (T-03-02-01 tampering mitigation in the threat register). Drizzle's `sql\`\`` parameterization handles the rest.
- **Zod schema already had `imagePublicIds`/`datasheetPublicIds`** declared in Phase 2 — no change required. The Phase-2 silent gap was that the action body never persisted them, not that the schema rejected them. This plan closes that gap by writing the values, not by changing validation.

## Deviations from Plan

None — plan executed exactly as written. The `[BLOCKING]` checkpoint at Task 2.2 was pre-approved per the orchestrator's `auto_approve_checkpoint` directive (purely additive migration, verified before apply). The auto-mode reminder explicitly authorized progressing through the plan.

## Authentication Gates

None encountered. The only network call was to Neon dev via `DATABASE_URL_DIRECT` (developer .env.local secret), and no Cloudinary, Resend, or OAuth flows were touched.

## Issues Encountered

- **First-edit path collision (parent vs. worktree)** — the initial `Edit` calls for `src/db/schema/manufacturers.ts` and `src/db/schema/products.ts` accidentally landed in the parent repo (same path was active in the editor's recent-read cache). Reverted the parent via `git checkout --` and re-applied the edits to the worktree using absolute paths under `.claude/worktrees/agent-...`. No production data lost; verified with `git status` against both repos. Same-shape issue noted in the Wave-0 summary; documented here for reference.
- **Worktree had no `node_modules` and no `.env.local`** — `pnpm install` resolved deps; copied `.env.local` from the parent (gitignored). Both expected for a fresh worktree.

## User Setup Required

None. The migration is already applied to Neon dev. Downstream plans inherit the live schema state.

## Next Phase Readiness

- **Plan 03 (Wave 2 — public shell + locale + JSON-LD)** is unblocked: Organization JSON-LD can render with the existing manufacturer rows; locale switcher + hreflang have no schema dependency.
- **Plan 04 (Wave 3 — catalog listing + filters)** is unblocked: spec-value EAV queries are unchanged.
- **Plan 05 (Wave 3 — product detail page)** is unblocked: `<CldImage>` gallery can read `product.image_public_ids[0]` for hero LCP, the rest for thumbs; the Documentation section reads `datasheet_public_ids`.
- **Plan 06 (Wave 3 — search + autocomplete + locale fallback)** is unblocked: every product touched by `saveProduct` (or duplicated) now has 3 populated `product_search` rows. Plan 06 can layer the search query helpers on top without re-deriving the rebuild path.
- **Plan 07 (Wave 4 — manufacturer pages)** is unblocked: `is_official_rep` + `relationship_note` are queryable; admin-side surfacing of those fields is folded into Plan 07 per CONTEXT.md D-11.
- **Plan 08 / 09** unaffected by this plan but transitively unblocked by 03–07.

## Self-Check: PASSED

Verified after summary write:

- `drizzle/0002_phase3_media_search_manufacturer.sql` — FOUND
- `drizzle/meta/0002_snapshot.json` — FOUND
- `scripts/verify-extensions.ts` — FOUND
- `src/db/schema/manufacturers.ts` contains `isOfficialRep` + `relationshipNote` — VERIFIED
- `src/db/schema/products.ts` contains `imagePublicIds` + `datasheetPublicIds` — VERIFIED
- `src/actions/products.ts` contains `rebuildProductSearch` (3 occurrences: helper + saveProduct call + duplicateProduct call) — VERIFIED
- `src/actions/products.ts` contains `imagePublicIds: input.imagePublicIds` (2 occurrences: insert + update branch) — VERIFIED
- `src/actions/products.ts` contains `datasheetPublicIds: input.datasheetPublicIds` (2 occurrences) — VERIFIED
- `src/actions/products.ts` contains `INSERT INTO product_search` (1 occurrence in helper) — VERIFIED
- `src/lib/zod/product.ts` contains `imagePublicIds: z.array` — VERIFIED
- Live DB: `pg_extension` returns `pg_trgm` + `unaccent` — VERIFIED via scripts/verify-extensions.ts
- Live DB: 4 new columns present with correct types + defaults — VERIFIED
- Live DB: `drizzle.__drizzle_migrations` row id=3 — VERIFIED
- Commit `174e8e3` (Task 2.1) — FOUND in `git log`
- Commit `228b066` (Task 2.2) — FOUND in `git log`
- Commit `f6a27bc` (Task 2.3) — FOUND in `git log`
- `pnpm vitest run tests/actions/products.test.ts` → 15 passed (11 Phase-2 + 4 Phase-3) — VERIFIED
- `pnpm tsc --noEmit` → exits 0 — VERIFIED

---
*Phase: 03-public-rendering-search-seo*
*Completed: 2026-04-30*
