---
phase: 05-contact-launch-polish
plan: 01
subsystem: schema-foundation
tags: [wave-0, blocking, schema, drizzle, migration, audit-extension, env-vars, messages-skeleton, red-stubs, contact-rate-limit]
requires: []
provides:
  - contact_rate_limit Drizzle table + 0004 migration applied to Neon dev branch (BLOCKING gate cleared)
  - scripts/verify-05-01-migration.ts — 7-check post-migration verifier (live-DB structural assertions)
  - AUDIT_ACTIONS extended from 13 → 16 verbs (spam_detected, rate_limited, contact_submission_create)
  - 4 new env vars validated at boot (TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, RATE_LIMIT_IP_SALT, ADMIN_NOTIFY_EMAILS)
  - public.contact namespace skeleton in messages/{uz,ru,en}.json (27 leaf keys/locale; 3-locale parity)
  - 12 RED stub files (49 stub cases total — 42 it.skip + 7 test.fixme) documenting Wave 1-3 contracts
affects:
  - tests/_fixtures/load-env.ts (test-env defaults extended for the 4 new keys — Rule 3 blocking deviation)
  - tests/lib/audit.test.ts (closed-enum sanity bumped 13 → 16 — Rule 3 blocking deviation)
tech-stack:
  added: []
  patterns:
    - Drizzle composite-PK + CHECK constraint as inline pgTable second-arg array
    - Hand-renamed migration file matching journal tag (drizzle-kit chimera-name → 0004_phase5_contact_rate_limit)
    - Post-migration structural verifier asserting LIVE DB shape (not SQL text) — 7 PASS checks
    - AUDIT_ACTIONS append-only tuple extension (closed enum, type-narrowed at compile time)
    - Runtime-string dynamicImport() helper for RED stubs that compile under tsc before SUT modules exist
    - 3-locale message namespace pre-creation with "TODO: 05-NN" placeholders so closure plans only fill values
    - test.fixme on Playwright + it.skip on Vitest 4 (no .fixme) for RED stubs that runner reports as skipped not failed
key-files:
  created:
    - src/db/schema/contact-rate-limit.ts
    - drizzle/0004_phase5_contact_rate_limit.sql
    - drizzle/meta/0004_snapshot.json
    - scripts/verify-05-01-migration.ts
    - tests/db/contact-rate-limit.test.ts
    - tests/lib/server-action-public.test.ts
    - tests/lib/turnstile.test.ts
    - tests/lib/rate-limit.test.ts
    - tests/lib/email-contact.test.ts
    - tests/actions/contact.test.ts
    - tests/components/contact-form.test.tsx
    - tests/components/contact-button.test.tsx
    - tests/e2e/contact-roundtrip.spec.ts
    - tests/e2e/cloudinary-widget-smoke.spec.ts
    - tests/e2e/glyph-render.spec.ts
  modified:
    - src/db/schema/index.ts
    - drizzle/meta/_journal.json
    - src/lib/audit.ts
    - src/env.ts
    - .env.example
    - messages/uz.json
    - messages/ru.json
    - messages/en.json
    - tests/api/sitemap.test.ts
    - tests/_fixtures/load-env.ts
    - tests/lib/audit.test.ts
decisions:
  - "PK enrichment from CONTEXT D-05 (ip_hash, window_start) → (ip_hash, window_kind, window_start) per RESEARCH §A2 — the 2-bucket model (5/hour AND 20/day per IP) requires window_kind to disambiguate the two sibling rows that share the same ip_hash + window_start during the same hour. Documented enrichment, not deviation."
  - "AUDIT_ACTIONS extended with 3 verbs (not 2 as initially planned in CONTEXT D-04/D-05): spam_detected, rate_limited, AND contact_submission_create. Third verb satisfies the CLAUDE.md 'every mutation writes audit row' invariant for the visitor-flow happy path (planner checker W-3 path A)."
  - "Migration filename hand-renamed from drizzle-kit's auto-generated 0004_watery_chimera.sql to 0004_phase5_contact_rate_limit.sql + journal tag updated to match. Mirrors Phase-1/2/3/4 phase-named migration convention (0001 was the only chimera-named migration; subsequent phases adopted phase-prefixed names)."
  - "RED stubs use a runtime-string dynamicImport() helper instead of literal `import('@/lib/rate-limit')` so tsc --noEmit passes BEFORE the SUT modules exist (Phase 4 plan 04-04 pattern). Static-resolved dynamic-import args are type-checked; runtime-built specifiers are typed Promise<unknown> and skipped."
  - "ADMIN_NOTIFY_EMAILS declared z.string().optional() (NOT defaulted to '') per Pitfall 5 + D-07 — Resend rejects empty recipients arrays, so empty/unset must short-circuit cleanly in the lib not throw. Test default left unset to preserve the empty-skip path under test."
metrics:
  duration_minutes: 35
  completed: 2026-05-05
  commits: 8
  tasks: 6
  files_created: 15
  files_modified: 11
---

# Phase 5 Plan 1: Wave 0 Foundation (contact_rate_limit + audit + env + RED stubs) Summary

**One-liner:** Wave 0 BLOCKING foundation for Phase 5: ships the contact_rate_limit Drizzle migration applied to Neon dev branch with a 7-check structural verifier, extends AUDIT_ACTIONS by 3 visitor-flow verbs, validates 4 new env vars at boot, pre-creates public.contact i18n namespace in 3 locales, and lays down 12 RED test stub files (49 cases total) documenting Wave 1-3 contracts so downstream plans only flip RED → GREEN.

## What Shipped

### 8 atomic commits (one per task + 1 deviation fix-up)

1. **Task 1.1** (`de4f0f9`) — `feat(05-01): add contact_rate_limit Drizzle schema + barrel re-export`
   - `src/db/schema/contact-rate-limit.ts` — pgTable with composite PK `(ip_hash, window_kind, window_start)`, CHECK constraint on `window_kind IN ('hour','day')`, btree index `contact_rate_limit_cleanup_idx` on `window_start` for opportunistic cleanup.
   - `src/db/schema/index.ts` — `export * from './contact-rate-limit'` re-export inserted between contact and translation-flags.

2. **Task 1.2** (`46e6424`) — `feat(05-01): apply 0004 migration + ship verifier for contact_rate_limit`
   - `pnpm drizzle-kit generate` produced `0004_watery_chimera.sql`; renamed to `0004_phase5_contact_rate_limit.sql` and updated `drizzle/meta/_journal.json` tag to match.
   - `pnpm drizzle-kit migrate` applied to Neon dev branch — drizzle.__drizzle_migrations now has 5 rows (0000–0004).
   - `scripts/verify-05-01-migration.ts` — 7 PASS checks against the live DB:
     1. `contact_rate_limit` table exists in public schema
     2. 4 columns with correct types + NOT NULL + count default 0
     3. composite PK is `(ip_hash, window_kind, window_start)`
     4. `contact_rate_limit_cleanup_idx` btree on `window_start` exists
     5. ON CONFLICT DO UPDATE increments count (1 then 2) — atomic UPSERT contract
     6. `contact_submission` unchanged (10 columns, no Phase-5 drift)
     7. `drizzle.__drizzle_migrations` has 5 entries
   - `pnpm tsx scripts/verify-05-01-migration.ts` exits 0 (BLOCKING gate cleared).

3. **Task 1.3** (`b8d7d67`) — `feat(05-01): extend AUDIT_ACTIONS + add 4 Phase-5 env vars`
   - `src/lib/audit.ts` — append `spam_detected`, `rate_limited`, `contact_submission_create` to the `as const` tuple. Existing 13 verbs unchanged in order.
   - `src/env.ts` — server schema gains `TURNSTILE_SECRET_KEY: z.string().min(1)`, `RATE_LIMIT_IP_SALT: z.string().min(32)`, `ADMIN_NOTIFY_EMAILS: z.string().optional()`. Client schema gains `NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1)` (build-time required per Pitfall 8).
   - `.env.example` — 4 new keys documented with Cloudflare test values (1x000…AA pattern).

4. **Task 1.4** (`a1d51e9`) — `feat(05-01): pre-create public.contact namespace skeleton in messages/{uz,ru,en}.json`
   - 27 leaf keys per locale: `cta` + `pageTitle` + `pageSubtitle` + `form.{name,company,email,phone,message,submit,submitting,successTitle,successBody,errorValidation,errorTurnstile,errorRateLimit,errorUnknown,honeypotLabel}` (14) + `productInquiry.inquiryAbout` (1) + `autoReply.{subject,preview,greeting,body,productLine,signature}` (6).
   - All values placeholder `"TODO: 05-03"` so plan 03 only fills, not creates.
   - 3-locale parity verified by `node -e` script (form keys identical across uz/ru/en).

5. **Task 1.5** (`a60d167`) — `test(05-01): author 6 vitest RED stubs for Phase-5 server-side contracts`
   - `tests/db/contact-rate-limit.test.ts` (4 it.skip — UPSERT/hour/day/cleanup)
   - `tests/lib/server-action-public.test.ts` (6 — withPublicAction triple-gate)
   - `tests/lib/turnstile.test.ts` (4 — verifyTurnstile shape)
   - `tests/lib/rate-limit.test.ts` (5 — hashIp + checkAndIncrement + parseClientIp)
   - `tests/lib/email-contact.test.ts` (5 — admin EN-only + auto-reply uz/ru/en + productLine)
   - `tests/actions/contact.test.ts` (5 — happy path + product prepend + sourcePage validation + Resend best-effort + ADMIN_NOTIFY_EMAILS empty)
   - 29 it.skip total; runtime-string `dynamicImport()` helper defeats tsc static path resolution.

6. **Task 1.6** (`8344902`) — `test(05-01): author 3 jsdom + 1 sitemap-extension + 3 Playwright RED stubs`
   - `tests/components/contact-form.test.tsx` (6 it.skip — RHF + Turnstile + honeypot + sourcePage + error/success)
   - `tests/components/contact-button.test.tsx` (4 it.skip — sticky button + Dialog + ContactForm mode='modal' + productContext)
   - `tests/api/sitemap.test.ts` — APPENDED new describe block `contact path coverage (Phase 5)` with 3 it.skip
   - `tests/e2e/contact-roundtrip.spec.ts` (2 test.fixme)
   - `tests/e2e/cloudinary-widget-smoke.spec.ts` (2 test.fixme — DEF-4-12-04 absorption)
   - `tests/e2e/glyph-render.spec.ts` (3 test.fixme — DEF-4-12-03 absorption)
   - All carry FLIP-IN: 05-NN-PLAN.md headers; pnpm playwright test --list returns 7 specs.

7. **Deviation fix-up** (`9c700ac`) — `fix(05-01): unblock test suite after env+audit additions`
   - `tests/_fixtures/load-env.ts` — added 3 placeholder defaults for the new env vars (TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, RATE_LIMIT_IP_SALT). ADMIN_NOTIFY_EMAILS left unset to preserve the empty-skip path under test.
   - `tests/lib/audit.test.ts` — bumped the closed-enum sanity assertion from 13 entries → 16 (extended with the 3 new visitor-flow verbs verbatim).
   - Both fixes are Rule 3 (blocking) — t3-env now requires the 4 new keys at boot, and the closed-enum sanity test was hard-coded to 13.

## Deviations from Plan

### Auto-fixed (Rule 3 — Blocking)

**1. Test-suite env loader needed defaults for 4 new env vars**
- **Found during:** Task 1.5 verification (full vitest run after Task 1.3 env additions)
- **Issue:** `pnpm vitest run` failed with t3-env validation errors at module-import time across ~24 test files. The 4 new env vars added in Task 1.3 are required at `@/env.ts` boot; tests/_fixtures/load-env.ts only seeded the original 6 placeholder defaults.
- **Fix:** Added 3 placeholder defaults to `tests/_fixtures/load-env.ts` (TURNSTILE_SECRET_KEY = Cloudflare test key `1x000…AA`, NEXT_PUBLIC_TURNSTILE_SITE_KEY = corresponding test site key, RATE_LIMIT_IP_SALT = padded-to-32-chars placeholder). ADMIN_NOTIFY_EMAILS deliberately left unset (it's `.optional()` and Pitfall 5 + D-07 want the empty-skip path exercised under test).
- **Files modified:** `tests/_fixtures/load-env.ts`
- **Commit:** `9c700ac`

**2. AUDIT_ACTIONS closed-enum sanity test pinned to 13**
- **Found during:** Task 1.5 verification (vitest after env-loader fix)
- **Issue:** `tests/lib/audit.test.ts` "AUDIT_ACTIONS is a closed const tuple covering all 13 v1 actions" pinned the enum to 13 specific values. Task 1.3 extended the tuple to 16; this assertion must extend correspondingly so the closed-enum invariant remains structurally enforced.
- **Fix:** Bumped the assertion from 13 → 16, appending the 3 Phase-5 visitor-flow verbs verbatim. Test description updated to "all 16 v1 actions".
- **Files modified:** `tests/lib/audit.test.ts`
- **Commit:** `9c700ac`

### Documented enrichments (not deviations)

**Schema PK enrichment from D-05** — CONTEXT.md D-05 originally specified the contact_rate_limit PK as `(ip_hash, window_start)`. RESEARCH §A2 enriched this to `(ip_hash, window_kind, window_start)` because the 2-bucket model (5/hour AND 20/day per IP) needs `window_kind` to disambiguate sibling rows that share the same `ip_hash` and `window_start` during the same hour (one row for the 'hour' bucket, one for the 'day' bucket). Plan 05-01 implements the enriched 3-column PK; the verifier asserts the live shape.

**AUDIT_ACTIONS third verb** — checker iteration 1 W-3 raised that the visitor-flow happy path also needs an audit row per CLAUDE.md ("every mutation writes audit row"). Plan literal called for 2 verbs (spam_detected, rate_limited); checker resolution added `contact_submission_create` as the third happy-path verb. Plan 05-02 will write the audit row inside the same transaction as the contact_submission INSERT.

## Auth Gates

None — Task 1.2 used `DATABASE_URL_DIRECT` already configured in `.env.local`.

## Self-Check: PASSED

**Created files (15):**
- src/db/schema/contact-rate-limit.ts FOUND
- drizzle/0004_phase5_contact_rate_limit.sql FOUND
- drizzle/meta/0004_snapshot.json FOUND
- scripts/verify-05-01-migration.ts FOUND
- tests/db/contact-rate-limit.test.ts FOUND
- tests/lib/server-action-public.test.ts FOUND
- tests/lib/turnstile.test.ts FOUND
- tests/lib/rate-limit.test.ts FOUND
- tests/lib/email-contact.test.ts FOUND
- tests/actions/contact.test.ts FOUND
- tests/components/contact-form.test.tsx FOUND
- tests/components/contact-button.test.tsx FOUND
- tests/e2e/contact-roundtrip.spec.ts FOUND
- tests/e2e/cloudinary-widget-smoke.spec.ts FOUND
- tests/e2e/glyph-render.spec.ts FOUND

**Commits (8):**
- de4f0f9 FOUND (Task 1.1 schema + barrel)
- 46e6424 FOUND (Task 1.2 migration + verifier)
- b8d7d67 FOUND (Task 1.3 audit + env)
- a1d51e9 FOUND (Task 1.4 messages skeleton)
- a60d167 FOUND (Task 1.5 vitest server-side stubs)
- 8344902 FOUND (Task 1.6 jsdom + Playwright stubs)
- 9c700ac FOUND (deviation fix-up env defaults + audit closed-enum test bump)

**Verification gates:**
- `pnpm tsc --noEmit` exits 0
- `pnpm tsx scripts/verify-05-01-migration.ts` exits 0 (7/7 PASS)
- `pnpm vitest run` 1 file failed → 0 file failed after deviation fix-up; 208 passed | 42 skipped (251 total); the 42 skipped includes the 12 RED stubs from this plan (29 server-side + 10 jsdom + 3 sitemap)
- `pnpm playwright test --list tests/e2e/contact-roundtrip.spec.ts tests/e2e/cloudinary-widget-smoke.spec.ts tests/e2e/glyph-render.spec.ts` → 7 specs listed

## Wave 1+ Unblocked

- **Plan 05-02** can now author `src/lib/turnstile.ts`, `src/lib/rate-limit.ts`, `src/lib/server-action.ts withPublicAction`, `src/actions/contact.ts`, and the 2 React Email templates without authoring any new tests — only flip 6 vitest stub files (29 it.skip → it).
- **Plan 05-03** can populate the public.contact messages skeleton with real translations and ship the visitor UI (ContactForm + ContactButton); only flip 2 jsdom stub files (10 it.skip → it).
- **Plan 05-04** can extend `src/lib/sitemap.ts` with `/contact` per locale; only flip 3 it.skip → it in tests/api/sitemap.test.ts.
- **Plan 05-05** can flip the 3 Playwright stub files (7 test.fixme → test).

## TDD Gate Compliance

Plan 05-01 is `type: execute` (not `type: tdd`), so the RED→GREEN→REFACTOR plan-level gate sequence does not apply. The 12 RED stub files this plan ships are downstream-plan TDD substrate, not this plan's own gates. Per-task TDD discipline was not in scope.
