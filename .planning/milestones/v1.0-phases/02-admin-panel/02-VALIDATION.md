---
phase: 2
slug: admin-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `02-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (unit + integration) + Playwright 1.59.1 (e2e) |
| **Config file** | `vitest.config.ts` (Phase 1) + `playwright.config.ts` (Phase 1) |
| **Quick run command** | `pnpm test` (Vitest, ~5–8s baseline) |
| **Full suite command** | `pnpm test:all` (Vitest + Playwright local against `pnpm dev`) |
| **E2E against preview** | `BASE_URL=https://<preview> pnpm playwright test` (CI: GH Actions wait-for-preview) |
| **Estimated runtime** | ~30s quick, ~3–5 min full suite (excluding preview e2e) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` (Vitest unit + integration)
- **After every plan wave:** Run `pnpm test:all` (Vitest + Playwright local)
- **Before `/gsd-verify-work`:** Full suite green + Playwright OPS-01 spec green against the Vercel preview deploy
- **Max feedback latency:** ~30 seconds per task; ~5 min per wave

---

## Per-Task Verification Map

> Task IDs follow `{phase}-{plan}-{task}` once the planner emits PLAN.md files. Wave assignments below match the recommended Wave structure from RESEARCH.md.

| Req ID | Plan (target) | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|---------------|------|----------|-----------|-------------------|-------------|--------|
| ADMIN-01 | login-session | 1 + 4 | Magic-link login + 24h idle + 7d absolute timeout | unit + e2e | `pnpm vitest run tests/lib/require-admin.test.ts` + `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts` (login step) | ❌ W0 | ⬜ pending |
| ADMIN-02 | admins-invite | 1 | Invite admin, single-use 48h token | integration (live Neon dev) | `pnpm vitest run tests/actions/admins.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-03 | categories-crud | 2 | Category CRUD + 3 translation rows in tx | integration | `pnpm vitest run tests/actions/categories.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-04 | manufacturers-crud | 2 | Manufacturer CRUD + logo upload (mock) | integration + unit | `pnpm vitest run tests/actions/manufacturers.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-05 | spec-fields-editor | 2 | Spec-field schema editor: rename, soft-delete, hard-delete, group CRUD | integration | `pnpm vitest run tests/actions/spec-fields.test.ts tests/actions/spec-field-groups.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-06 | products-crud | 3 | Product CRUD with locale tabs + typed specs + draft/published | integration (heaviest) | `pnpm vitest run tests/actions/products.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-07 | products-media | 3 | Cloudinary signed upload from widget | unit (mock) + e2e | `pnpm vitest run tests/components/media-uploader.test.tsx` (CI) + `pnpm playwright test tests/e2e/upload.spec.ts` (manual checkpoint, skipped in CI) | ❌ W0 | ⬜ pending |
| ADMIN-08 | products-crud | 3 | Duplicate product full clone | integration | `pnpm vitest run tests/actions/products.test.ts -t duplicate` | ❌ W0 | ⬜ pending |
| ADMIN-09 | products-crud | 3 | Per-field MT flag stored | integration | `pnpm vitest run tests/actions/products.test.ts -t machine-translated` | ❌ W0 | ⬜ pending |
| ADMIN-10 | translation-completeness | 2 | Translation-completeness view returns expected % | integration (against view) | `pnpm vitest run tests/db/translation-completeness-view.test.ts` | ❌ W0 | ⬜ pending |
| ADMIN-11 | audit-log | 1 + assertions in every action test | Audit log row written for every mutation | integration (assertion in every action test) | `pnpm vitest run tests/actions/*.test.ts` (audit_log row count assertion) | ❌ W0 | ⬜ pending |
| ADMIN-12 | submissions-inbox | 4 | Submissions inbox + CSV export | integration + unit | `pnpm vitest run tests/actions/submissions.test.ts tests/lib/csv.test.ts` | ❌ W0 | ⬜ pending |
| OPS-01 | revalidation-e2e | 4 | Edit-then-refresh on Vercel preview (revalidateTag end-to-end) | e2e (Playwright on preview URL) | `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts` (CI-only, BASE_URL=preview) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Plan column lists the target plan slug — the planner will assign final plan numbers (e.g., `02-01-LOGIN-SESSION`).*

---

## Wave 0 Requirements

Wave 0 tasks must land before Wave-1 implementation tasks so feedback sampling is continuous from task #1.

- [ ] `tests/_fixtures/admin-session.ts` — fixture creating an active admin row + Phase-1 sessions row + emitting a session cookie. Required by every integration test that calls `requireAdmin()`.
- [ ] `tests/_fixtures/seed-products.ts` — seed helper for product fixtures (used by products + duplicate + completeness tests).
- [ ] `tests/_fixtures/load-env.ts` — confirm Phase 1's loader handles `.env.test` for live-Neon-dev tests.
- [ ] `tests/lib/require-admin.test.ts` — unit-style coverage for D-15 7d absolute cap rejection (mocked Neon HTTP read).
- [ ] `tests/lib/audit.test.ts` — `logAudit` writes the right shape inside a transaction.
- [ ] `tests/lib/revalidation.test.ts` — typed helpers call `revalidateTag` with the right tags (mock `next/cache`).
- [ ] `.github/workflows/e2e-preview.yml` — GH Actions workflow that waits for Vercel preview ready, then runs OPS-01 spec.
- [ ] `tests/e2e/admin-edit-revalidates.spec.ts` — the OPS-01 spec.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cloudinary widget UX (drag-drop reorder, multi-image upload) | ADMIN-07 | Widget renders inside an iframe; Playwright cross-origin interactions are flaky | Manual smoke test on a Vercel preview: upload 3 images, reorder via drag, save, reload → confirm public_id order persisted |
| Resend email rendering (admin-invite + magic-link) | ADMIN-02, ADMIN-01 | React Email rendering across Gmail/Outlook/iOS Mail can't be asserted programmatically | After Wave 1, send an invite to a real inbox, view in Gmail web + iOS Mail, confirm CTA renders correctly |
| Sentry actor.email tag visible on admin errors | ADMIN-11 (security) | Requires real Sentry project; CI runs without DSN | After Wave 1, throw in an admin Server Action, confirm Sentry event has `actor.email` tag |
| Admin shell mobile-responsive smoke (P5 nice-to-have) | (Phase 5 polish) | Desktop-first per CONTEXT.md; not a Phase 2 gate | Defer to Phase 5 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for `pnpm test`, < 5 min for `pnpm test:all`
- [ ] `nyquist_compliant: true` set in frontmatter once planner has stamped tasks against this map

**Approval:** pending
