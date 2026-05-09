---
phase: 260509-n9j
plan: 01
subsystem: tooling/db-seed
tags: [seed, demo, cli, idempotent, uz-only, scaffolding]
requires: [DATABASE_URL_DIRECT env, drizzle schema barrel src/db/schema, @neondatabase/serverless Pool]
provides: [pnpm db:seed:demo CLI, pnpm db:unseed:demo CLI, scripts/seed-demo.ts module, scripts/README.md docs]
affects: [package.json scripts+devDeps, scripts/ directory]
tech-stack:
  added:
    - "tsx ^4.19.2 (devDep) — TypeScript CLI runner for scripts/"
  patterns:
    - "select-then-insert idempotent upsert keyed on (locale, slug) translation unique"
    - "verbatim transcription of product_search uz tsvector rebuild from src/actions/products.ts"
    - "single transaction for delete+upsert+insert+search-rebuild via drizzle-orm/neon-serverless Pool"
key-files:
  created:
    - scripts/seed-demo.ts
    - scripts/README.md
  modified:
    - package.json
decisions:
  - "Two-lifecycle tagging: DEMO- sku prefix marks products only (wipe+reinsert); categories/manufacturers are permanent industry taxonomy via select-then-insert on uz slug (never deleted by unseed)"
  - "audit_log writes skipped — table has no schema-level invariant requiring rows; audit is a Server-Action convention, not appropriate for one-off CLI scaffolding"
  - "revalidateTag skipped — no Next.js runtime in CLI; the CLAUDE.md guardrail applies to Server Actions only"
  - "Slugs are clean (manometrlar, wika-232-50-0-10-mpa) — DEMO- prefix lives only in the never-user-visible sku column"
metrics:
  duration: "~4 minutes (typecheck + 3 atomic commits)"
  completed: "2026-05-09T12:06Z"
---

# Phase 260509-n9j Plan 01: Idempotent uz-only demo seed Summary

**One-liner:** Adds `pnpm db:seed:demo` and `pnpm db:unseed:demo` CLI commands backed by a single transactional Drizzle script that wipes+reinserts 12 DEMO-prefixed products on every run while preserving permanent category and manufacturer taxonomy via select-then-insert on uz slugs.

## What Was Built

Three artifacts, three atomic commits:

### 1. `package.json` (commit `9c04d79`)
- Added `tsx` `^4.19.2` to `devDependencies` (alphabetically between `tailwindcss` and `typescript`).
- Added two npm scripts immediately after `db:studio`:
  - `db:seed:demo` → `tsx scripts/seed-demo.ts`
  - `db:unseed:demo` → `tsx scripts/seed-demo.ts --delete-only`
- No other dep version bumped, no other field changed, no `prepare`/`postinstall` hooks added.

### 2. `scripts/seed-demo.ts` (commit `a75ca4a`, 518 lines)
- Header block documents WHAT, WHY, HOW TO REMOVE, IDEMPOTENCY, LOCALE, URL AESTHETIC, PRODUCT_SEARCH, AUDIT_LOG, REVALIDATE, CONNECTION (10 sections).
- Env loading via `dotenv` (`.env.local` then `.env`) — matches `drizzle.config.ts`.
- DB client: `Pool` from `@neondatabase/serverless` + `drizzle({ client: pool, casing: 'snake_case' })` from `drizzle-orm/neon-serverless`. Uses `DATABASE_URL_DIRECT` (non-pooled — pgBouncer breaks multi-statement transactions).
- Demo content as typed const arrays: 4 categories, 6 manufacturers, 12 products (one with `manufacturerSlug: null` per plan, all `status='published'`, `publishedAt: new Date()`).
- All writes wrapped in a single `db.transaction(async (tx) => {...})`.
- `deleteDemoProducts(tx)` — `DELETE FROM product WHERE sku LIKE 'DEMO-%' RETURNING id`. FK CASCADE on `product_translations.product_id` and `product_search.product_id` handles dependents. Returns count for logging.
- `upsertCategories(tx)` / `upsertManufacturers(tx)` — select-then-insert on `(locale='uz', slug=?)` unique key in the translation table. Returns `Record<slug, id>`. Existing rows (including admin edits) are left untouched.
- `seedProducts(tx, catMap, mfrMap)` — inserts product base row, uz translation row, and uz `product_search` tsvector for each demo product.
- `rebuildSearchUz(tx, productId)` — verbatim transcription of `src/actions/products.ts:113-133` uz branch. `simple` regconfig, weights A/B/C/D on name/short_desc/long_desc/spec_text. Spec aggregation simplified to literal `''` since demo products carry zero `product_spec_values` rows. `ON CONFLICT (product_id, locale) DO UPDATE` matches the schema PK on `product_search` so re-runs replace the tsvector in place.
- Argv parsing: `process.argv.includes('--delete-only')`. `--delete-only` runs only `deleteDemoProducts(tx)` and logs `unseed complete`. Full seed runs delete → upsertCategories → upsertManufacturers → seedProducts → final assertions.
- Final integrity asserts inside the transaction (will roll back on failure): `count(product where sku LIKE 'DEMO-%') = 12`, `count(product_search uz for DEMO products) = 12`, `count(demo category slugs) >= 4`, `count(demo manufacturer slugs) >= 6`. The `>=` lower bounds matter for re-run-after-admin-edit safety: admin may have added more rows; that's not a failure.
- Logging: `[DEMO-SEED] ...` prefix on every line, matching `scripts/verify-*.ts` style.
- `pool.end()` in `finally`. `process.exitCode = 1` on error. UUIDs are cast `${productId}::uuid` in raw SQL.

### 3. `scripts/README.md` (commit `fc7c375`, 72 lines)
- Three sections: intro (DATABASE_URL_DIRECT + dotenv loading), verification scripts list, demo seed lifecycle.
- Two-lifecycle table: products demo / categories+manufacturers permanent.
- At-launch unseed step documented.
- Caveats: uz-only (ru/en → 404), clean URLs (no `demo-` prefix), no spec values / images, no `revalidateTag`, no `audit_log`, no schema mutation.

## Two Design Decisions

### D1. Two-lifecycle tagging — products demo, taxonomy permanent

The first version of this work (per the original quick-task brief) tagged everything DEMO-, including categories and manufacturers, intending to wipe them all on cleanup. The plan revised this: the 4 categories (Manometrlar, Diferensial manometrlar, Bosim datchiklari, Bosim relayalari) and 6 manufacturers (WIKA, Rosma, Manotom, Teplokontrol, Fiztech, Universal) are real industry data the user will keep at launch. The seed now treats them as permanent taxonomy:

- **Idempotency strategy:** select-then-insert keyed on the uz translation unique slug `(locale='uz', slug=?)`. The parent `categories` and `manufacturers` rows use `uuid().defaultRandom()` — there's no natural conflict key on the parent itself. `ON CONFLICT DO NOTHING` on the parent doesn't help; the conflict surface is the translation. Doing select-first lets us surface the existing parent UUID for the products-insert pass (so a re-run binds DEMO products to the existing category/manufacturer rows, not new ones).
- **Why select-then-insert over `INSERT ... ON CONFLICT DO NOTHING ... RETURNING`:** `RETURNING` does not return rows that were skipped by `ON CONFLICT DO NOTHING`. We need the existing UUID either way, so a SELECT-first followed by an INSERT-if-empty is simpler and avoids the no-return-on-conflict pitfall.
- **Admin-edit survival:** if the user runs `db:seed:demo`, then edits WIKA via the admin UI to set `isOfficialRep: true`, then re-runs `db:seed:demo`, the WIKA row is left untouched — the existing translation matches the uz slug, so the script skips the insert path entirely.
- **Clean URLs:** category slug `manometrlar` (not `demo-manometrlar`), product slug `wika-232-50-0-10-mpa` (not `demo-wika-...`). The `DEMO-` marker lives only in the product `sku` column (e.g. `DEMO-MAN-001`), which is not user-visible. This matches the plan's URL-aesthetic guardrail: a client viewing `/uz/categories/manometrlar` does not see scaffolding artifacts in the URL bar.

### D2. Skip `audit_log` writes from the seed

The seed does NOT insert `audit_log` rows. Justification:
- `audit_log` columns (`actor_email`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`) are all nullable; the table only enforces `id` (bigserial) and `at` (default now). There is no DB-level trigger or constraint requiring audit rows on insert. Audit is a Server-Action-layer convention, not a schema invariant.
- The seed is one-off scaffolding; auditing it would muddy the production audit trail with synthetic actor entries indistinguishable from human actions.
- Documented in the seed file's header comment block + scripts/README.md caveats.

## Idempotency Proof (theoretical — runtime DB run is the user's manual checkpoint)

**Pre-condition:** DB has zero rows where `sku LIKE 'DEMO-%'`. Whether categories/manufacturers exist is irrelevant.

**First run `pnpm db:seed:demo`:**
1. `DELETE FROM product WHERE sku LIKE 'DEMO-%'` — affects 0 rows.
2. `upsertCategories` — none of the 4 demo slugs exist → 4 INSERTs into `category` + 4 INSERTs into `category_translations`.
3. `upsertManufacturers` — none of the 6 demo slugs exist → 6 INSERTs into `manufacturer` + 6 INSERTs into `manufacturer_translations`.
4. `seedProducts` — 12 INSERTs into `product`, 12 into `product_translations`, 12 into `product_search` (uz). All with bound category/manufacturer UUIDs from step 2/3.
5. Final asserts: `12, 4, 6, 12`. PASS.

**Second run `pnpm db:seed:demo`:**
1. `DELETE FROM product WHERE sku LIKE 'DEMO-%'` — affects 12 rows. FK CASCADE removes 12 `product_translations` rows + 12 `product_search` rows.
2. `upsertCategories` — all 4 demo slugs exist → 4 SELECT lookups, 0 INSERTs. Returns same 4 UUIDs.
3. `upsertManufacturers` — all 6 demo slugs exist → 6 SELECT lookups, 0 INSERTs. Returns same 6 UUIDs.
4. `seedProducts` — 12 fresh INSERTs (UUIDs change because `product.id` is `defaultRandom()`, but counts and slugs are stable; the FK references in `product_translations` and `product_search` use the new UUIDs).
5. Final asserts: `12, 4, 6, 12`. PASS — counts unchanged.

**N-th run (N >= 2):** identical to second run.

**Admin-edit survival:** between run 1 and run 2, the user edits one of the 6 manufacturers via `/uz/admin` (e.g. sets `isOfficialRep: true` on WIKA, or adds a `relationshipNote`). Run 2 step 3 sees the existing translation, hits the `continue` branch, and does NOT touch the WIKA row. The admin's edit survives. Same logic for any of the 4 categories.

**Concurrency / partial-failure protection:** all writes are inside `db.transaction(...)`. If any step fails (FK violation, unique-slug collision, network drop), Postgres rolls back the entire transaction — the DB returns to the pre-run state. There is no halfway state where some demo products got inserted but the search rebuild failed.

**Runtime DB verification was deliberately not performed by this executor** per the plan's executor constraints (worktree has no `node_modules`; running a DB-mutating script from an agent without explicit user authorization is out of scope). The user runs `pnpm db:seed:demo` on the merged branch as the manual checkpoint.

## Cleanup Contract — `pnpm db:unseed:demo`

**Removes:**
- All rows in `product` where `sku LIKE 'DEMO-%'` (12 rows after a fresh seed).
- All `product_translations` rows for those products (FK CASCADE — 12 rows).
- All `product_search` rows for those products (FK CASCADE — 12 rows; locale=uz only because that's all the seed inserts).

**Preserves (untouched):**
- All 4 demo category rows in `category` (including any admin edits to `sortOrder`, `parentId`, etc.).
- All 4 demo `category_translations` rows in uz (admin's `description` edits survive).
- Any ru/en `category_translations` the admin added later — completely outside the seed's scope.
- All 6 demo manufacturer rows in `manufacturer` (including admin edits to `logoPublicId`, `websiteUrl`, `isOfficialRep`).
- All 6 demo `manufacturer_translations` rows in uz (admin's `description`, `relationshipNote` edits survive).
- Any ru/en manufacturer translations the admin added later.
- Every other table (`spec_field*`, `recipe*`, `industry*`, `contact_submission`, `admin_user`, `audit_log`, etc.) — never touched by either seed or unseed.

**Idempotency:** `pnpm db:unseed:demo` is safe to run any number of times. After the first run, subsequent runs delete 0 product rows.

## Deviations from Plan

**None — plan executed exactly as written**, with one micro-cleanup during Task 2 authoring:
- A draft of the DEMO-MAN-004 `shortDesc` literal initially landed with a `'ns:100mm radial...'.replace('ns:', '')` artifact (a stray prefix-stripping helper from a copy-paste). Cleaned to plain string `'100mm radial, 0–6 MPa, axiriy aniqlik 1.0'` before commit. Not a behavior change — the resulting string was identical either way.

The plan's Task 1 instructed `pnpm install` to fetch `tsx` and update the lockfile, plus `pnpm tsx --version` verification. The executor constraints explicitly override this: the worktree has no `node_modules`, and the lockfile mutation + `tsx --version` smoke check belong in the user's post-merge environment. I edited `package.json` directly (adding `"tsx": "^4.19.2"` to `devDependencies` alphabetically) without running `pnpm install`. The lockfile will update on the user's first `pnpm install` after merge. This was not a deviation from intent, only a deviation from the literal command sequence — the artifact is identical.

## Auth Gates

None — no auth required for this task.

## Verification Performed

| Check                                                  | Method                                                  | Result          |
|--------------------------------------------------------|---------------------------------------------------------|-----------------|
| `pnpm tsc --noEmit` exits 0 with new file in place     | Ran main repo's `./node_modules/.bin/tsc --noEmit` against a temporarily-copied `scripts/seed-demo.ts` | PASS (exit 0)   |
| Only expected files modified                           | `git diff --stat 9d9005c..HEAD`                          | PASS (3 files: `package.json` 3+, `scripts/README.md` 72+, `scripts/seed-demo.ts` 518+) |
| No edits to `src/`, `drizzle/`, `tests/`, schema       | Confirmed via `git diff --stat`                         | PASS            |
| 3 atomic commits, one per task                         | `git log --oneline -3`                                  | PASS (`fc7c375` docs, `a75ca4a` feat, `9c04d79` chore) |

**Runtime DB verification (deliberately deferred to user):**
- `pnpm db:seed:demo` runs successfully — user must verify on local Neon dev branch.
- Re-running `pnpm db:seed:demo` produces stable counts (products=12, demo categories=4, demo manufacturers=6, uz search rows=12).
- `pnpm db:unseed:demo` removes only DEMO products; the 4 categories and 6 manufacturers remain.
- `/uz/categories/manometrlar` and `/uz/products/wika-232-50-0-10-mpa` render in dev (placeholder images OK).
- `/ru/products/wika-232-50-0-10-mpa` returns 404.
- Admin-edit survival on re-run.

## Followups Deferred

- **Multilingual ru/en seed** — if the client showcase extends past uz audiences, add a `ru` and `en` translation block to each category/manufacturer/product and a corresponding `product_search` rebuild for those locales (the production `rebuildProductSearch` in `src/actions/products.ts` loops `LOCALES`; the seed's simplified version targets uz only).
- **Spec values + images for richer rendering** — populate `product_spec_values` rows and `imagePublicIds` arrays so the PDP renders specifications tables and real Cloudinary images instead of placeholders. Requires also seeding `spec_field` rows and uploading demo images to Cloudinary first.
- **Bilingual ribbon strings (recipes/industries)** — out of scope; this seed targets the catalog spine only.
- **Lockfile update** — user's responsibility on first `pnpm install` post-merge.

## Self-Check: PASSED

**Files claimed:**
- `scripts/seed-demo.ts` → FOUND (518 lines, commit `a75ca4a`)
- `scripts/README.md` → FOUND (72 lines, commit `fc7c375`)
- `package.json` modified → FOUND (commit `9c04d79`)

**Commits claimed:**
- `9c04d79` chore(260509-n9j) — FOUND in git log
- `a75ca4a` feat(260509-n9j) — FOUND in git log
- `fc7c375` docs(260509-n9j) — FOUND in git log

**Verification gate:** `pnpm tsc --noEmit` exits 0 (verified via main repo's tsc against the script).
