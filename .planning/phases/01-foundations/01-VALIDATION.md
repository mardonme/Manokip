---
phase: 1
slug: foundations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (unit + integration) + Playwright (e2e) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `.env.test` — Wave 0 installs |
| **Quick run command** | `pnpm vitest run --reporter=verbose` |
| **Full suite command** | `pnpm vitest run && pnpm playwright test` |
| **Estimated runtime** | ~30s (quick) / ~90–180s (full, e2e against local `next dev` or Vercel preview) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose` (unit + integration only — must stay <60s)
- **After every plan wave:** Run `pnpm vitest run && pnpm playwright test` (full suite against Vercel preview or local `next dev`)
- **Before `/gsd-verify-work`:** Full suite must be green AND all 4 manual smokes must be documented-checked
- **Max feedback latency:** 60 seconds for quick run

---

## Per-Task Verification Map

> Task IDs are assigned in each PLAN.md; map is completed when plans land and reverified before execute-phase. Each row below is the **requirement-level** contract; per-task refinement is additive.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 1 | FOUND-01 | — | Every `*_translations` has PK `(entity_id, locale)` + `CHECK (locale IN ('uz','ru','en'))` + `UNIQUE(locale, slug)`; zero `_ru`/`_en`/`_uz` columns | unit (schema snapshot) | `pnpm vitest run tests/schema/translations.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | FOUND-01 | — | `product_translations` DB insert rejects `locale='de'` with CHECK violation | integration | `pnpm vitest run tests/db/locale-constraint.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | FOUND-02 | — | `spec_field.data_type` enum = `('number','text','enum','bool')` exactly (no `range`) | unit (schema snapshot) | `pnpm vitest run tests/schema/spec-field.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | FOUND-02 | — | `product_spec_values` has typed columns `num_value`, `text_value`, `bool_value`, `enum_value`, `unit`; no opaque `value TEXT` | unit (schema snapshot) | included in above | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | FOUND-02 | — | Insert `num_value=42.5`, range query returns the row | integration | `pnpm vitest run tests/db/spec-values.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-03 | T-LOC-01 | GET `/` with empty cookie + `Accept-Language: *` → 307 `/uz/` | e2e | `pnpm playwright test tests/e2e/locale-redirect.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-03 | T-LOC-01 | GET `/` with cookie `NEXT_LOCALE=ru` → 307 `/ru/` | e2e | included in above | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-03 | T-ADMIN-GATE | GET `/uz/admin/` without auth cookie → 307 `/uz/login` | e2e | `pnpm playwright test tests/e2e/admin-gate.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | FOUND-04 | — | `DATABASE_URL` uses `-pooler` hostname suffix; `DATABASE_URL_DIRECT` does not | unit (env check) | `pnpm vitest run tests/unit/env-validation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | FOUND-04 | — | `drizzle-kit migrate` succeeds in Vercel buildCommand against `DATABASE_URL_DIRECT`; all expected tables present | manual | Check Neon console after first Vercel deploy; confirm `_drizzle_migrations` row count | ❌ manual | ⬜ pending |
| TBD | TBD | 1 | FOUND-04 | — | Vercel deployment region is `fra1` | manual | `curl -I https://<preview-url>/api/health` → `x-vercel-id` contains `fra1` | ❌ manual | ⬜ pending |
| TBD | TBD | 2 | FOUND-05 | T-AUTH-01 | Bootstrap admin completes magic-link round-trip via Resend + Auth.js v5 database sessions | e2e | `pnpm playwright test tests/e2e/magic-link-login.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-05 | T-AUTH-02 | `signIn` callback rejects email not in `admin_user WHERE active=true` | integration | `pnpm vitest run tests/db/auth-signin-callback.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-05 | T-AUTH-03 | Successful login creates row in `sessions` table via DrizzleAdapter | integration | included in above | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-06 | T-CLD-01 | `POST /api/cloudinary/sign` with valid admin session returns `{signature, timestamp, folder, apiKey, cloudName}` with 15-min TTL | integration | `pnpm vitest run tests/api/cloudinary-sign.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-06 | T-CLD-02 | `POST /api/cloudinary/sign` without session → 401 | integration | included in above | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-06 | T-CLD-03 | `POST /api/cloudinary/sign` with folder outside allowlist (`products\|recipes\|industries\|manufacturers`) → 400 | integration | included in above | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-06 | T-SEC-ENV | `CLOUDINARY_API_SECRET` is absent from the client bundle (no `NEXT_PUBLIC_*` leak) | unit | `pnpm vitest run tests/unit/env-validation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-07 | — | Sentry DSN configured; thrown server error surfaces in Sentry dashboard within 60s | manual | Trigger `throw new Error('Phase 1 smoke')` in a Server Action; verify event in Sentry | ❌ manual | ⬜ pending |
| TBD | TBD | 2 | FOUND-07 | — | `<Analytics />` + `<SpeedInsights />` present in `/uz/` HTML | e2e | `pnpm playwright test tests/e2e/observability.spec.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | FOUND-07 | — | Vercel Web Analytics dashboard registers at least one pageview post-deploy | manual | Visit `/uz/`; check Vercel Analytics dashboard within 5 min | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Framework + config bootstrap:
- [ ] `vitest.config.ts` — `environment: 'node'`, `globals: true`, alias resolution matching `tsconfig.json`
- [ ] `playwright.config.ts` — `baseURL: process.env.TEST_BASE_URL`, single `chromium` project, 1 retry in CI
- [ ] `.env.test` — Neon test-branch URLs (`DATABASE_URL`/`DATABASE_URL_DIRECT`), Resend test key, `BOOTSTRAP_ADMIN_EMAIL` for e2e
- [ ] `package.json` scripts: `test`, `test:e2e`, `test:all`
- [ ] `tests/_fixtures/db.ts` — shared Drizzle client factory bound to `DATABASE_URL` test-branch

Schema snapshot tests (drive FOUND-01, FOUND-02):
- [ ] `tests/schema/translations.test.ts` — imports every `*_translations` schema; asserts no `_uz/_ru/_en` columns in any table; every translations table has composite PK `(entity_id, locale)` and CHECK on `locale`
- [ ] `tests/schema/spec-field.test.ts` — asserts `specDataTypeEnum.enumValues` is exactly `['number','text','enum','bool']`; asserts `product_spec_values` has `num_value`, `text_value`, `bool_value`, `enum_value`, `unit`

Integration tests (require live Neon test branch):
- [ ] `tests/db/locale-constraint.test.ts` — attempts DB insert with invalid locale, expects CHECK violation
- [ ] `tests/db/spec-values.test.ts` — inserts `num_value=42.5`, range query returns row
- [ ] `tests/db/auth-signin-callback.test.ts` — invokes `signIn` callback with non-admin email; expects rejection

API route tests:
- [ ] `tests/api/cloudinary-sign.test.ts` — covers 200 (valid admin), 401 (no session), 400 (folder not in allowlist), asserts signature shape + 15-min TTL

E2E tests (Playwright, require running `next dev` or Vercel preview):
- [ ] `tests/e2e/locale-redirect.spec.ts` — `/ → /uz/` default; cookie override; `Accept-Language` override
- [ ] `tests/e2e/admin-gate.spec.ts` — unauth `/uz/admin/` → `/uz/login`
- [ ] `tests/e2e/magic-link-login.spec.ts` — full magic-link round-trip via Resend test mode; bootstrap admin lands on `/uz/admin`
- [ ] `tests/e2e/observability.spec.ts` — `<Analytics />` + `<SpeedInsights />` scripts present in `/uz/` HTML

Unit tests:
- [ ] `tests/unit/env-validation.test.ts` — `DATABASE_URL` has `-pooler`; `DATABASE_URL_DIRECT` does not; `CLOUDINARY_API_SECRET` not in client bundle

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel region is `fra1` | FOUND-04 | Infra-layer fact not visible to test process | `curl -I https://<preview-url>/api/health` → `x-vercel-id` contains `fra1`, OR Vercel Dashboard → Project → Settings → Functions → Region = `fra1` |
| `drizzle-kit migrate` ran successfully in Vercel build | FOUND-04 | Build-step outcome verified on Neon side, not in app process | Neon Console → Tables → confirm `_drizzle_migrations` table exists with one row per expected migration after first deploy |
| Sentry receives a thrown error from production | FOUND-07 | Requires external Sentry dashboard to confirm receipt | In a deployed preview, trigger a Server Action that throws `new Error('Phase 1 smoke test')`; Sentry dashboard → Issues → event appears within 60 seconds |
| Vercel Web Analytics records pageviews | FOUND-07 | Analytics dashboard is the authoritative receiver | Visit any `/uz/` page post-deploy; within 5 min, Vercel Dashboard → Project → Analytics shows at least one pageview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
