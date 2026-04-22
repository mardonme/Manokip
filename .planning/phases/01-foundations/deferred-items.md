# Phase 1 Deferred Items

Items discovered during execution that are out of scope for the current plan. Each entry documents the issue + the plan that should fix it.

---

## From Plan 01-04 (2026-04-21)

### DEF-01: Tailwind v4 / @tailwindcss/postcss transitive version skew breaks `next build` — RESOLVED

**Discovered during:** Plan 01-04 Task 04.2 build verification

**Resolved:** 2026-04-21 in commit `31062b4` — `fix(01-04): resolve tailwind v4 transitive skew (4.0.0 → 4.2.3) — DEF-01`. Direct deps bumped to exact 4.2.3 so the whole tailwind graph resolves consistently; no config changes needed. Verified with `pnpm build` (compiled 2.5s, 5 static pages), `pnpm typecheck` (0), `pnpm vitest run` (29/29), `pnpm dev` (Ready in 516ms, no PostCSS error).

**Issue:** `pnpm build` fails with
```
Error evaluating Node.js code
Error: Missing field `negated` on ScannerOptions.sources
at Object.Once (node_modules/.pnpm/@tailwindcss+postcss@4.0.0/node_modules/@tailwindcss/postcss/dist/index.js:8:4164)
```

`@tailwindcss/postcss@4.0.0` pulls in `@tailwindcss/node@4.2.3` and `@tailwindcss/oxide@4.2.3` via `^4` range, and those internal APIs have diverged from what the 4.0.0 postcss plugin expects.

**Scope:** Tailwind wiring was shipped by plan 01-01 (`src/app/globals.css` + `postcss.config.mjs` + tailwind deps). Plan 01-04 does not modify CSS/PostCSS. Build failed the same way before plan 01-04 was executed, except previously `next.config.mjs` failed earlier at `ERR_MODULE_NOT_FOUND` for `./src/env.js` (plan 01-04 fixed that by converting to `next.config.ts`), which masked this downstream issue.

**Pre-existing evidence:** No prior plan SUMMARY documents a successful `pnpm build` run. Plan 01-01 summary says "pnpm build: 0 after plan 03" but plan 03 also did not run `pnpm build` locally — it only set up `vercel.json` (which runs build inside Vercel's environment where dep resolution may differ).

**Fix applied:** Upgraded `tailwindcss` + `@tailwindcss/postcss` from exact `4.0.0` to exact `4.2.3` (option 1 of the recommendation). The overrides route (option 2) was not needed — the skew was purely a major-minor mismatch between direct pins and transitive resolution.

### DEF-02: .env.local lacks Auth.js + Resend secrets (expected until plan 01-05) — RESOLVED

**Discovered during:** Plan 01-04 Task 04.2 build verification

**Resolved:** 2026-04-21 during Plan 01-05 pre-flight setup — developer populated `.env.local` with real values before executor ran (executor prompt confirmed `.env.local` "verified clean, no duplicates" with real AUTH_SECRET (44-char base64), AUTH_RESEND_KEY (re_*), RESEND_FROM_EMAIL (onboarding@resend.dev — Resend test sender), BOOTSTRAP_ADMIN_EMAIL). Plan 01-05 commits (`862bc15`, `75d6387`, `1fa815d`) then exercised these values: `pnpm typecheck`, `pnpm vitest run` (33/33), and `pnpm build` (11 static pages in 5.8s) all loaded `.env.local` through `next.config.ts`'s `import './src/env'` without the Zod validator throwing.

**Issue:** `src/env.ts` declares `AUTH_SECRET`, `AUTH_RESEND_KEY`, `RESEND_FROM_EMAIL` as required. The developer `.env.local` only has DB + Cloudinary secrets from plan 01-01/01-03. Running `pnpm dev` or `pnpm build` (after DEF-01 is fixed) triggers the Zod validator and aborts before next-intl routing can be exercised.

**Workaround applied by plan 01-04:** Non-functional placeholder values appended to `.env.local` (gitignored, developer-machine only) so `next.config.ts`'s `import './src/env'` can load. Exact values documented in `.env.local` with a comment "awaiting plan 01-05". Tests/_fixtures/load-env.ts already uses the same pattern for test-suite boot (plan 01-03).

**Fix applied:** Real values populated in `.env.local` (gitignored, developer-machine only). `tests/_fixtures/load-env.ts` continues to supply placeholders only when a var is unset (first-loaded-wins, so real .env.local values take precedence on the developer machine; CI without .env.local falls through to placeholders). Production values for Vercel are still pending — will be entered in the Vercel dashboard before the first preview deploy (plan 01-07 deploy smoke).

---

## From Plan 01-06 (2026-04-22)

### DEF-03: Task 06.3 human checkpoint — magic-link round-trip manual verification not yet run

**Discovered during:** Plan 01-06 execution (auto mode — human checkpoint skipped by policy).

**Issue:** Plan 01-06 Task 06.3 is a blocking human checkpoint (10-step browser walkthrough) that drives `/uz/login → Resend email → magic link → /uz/admin` against a live Resend account and observes a fresh `sessions` row in Neon. The checkpoint is the authoritative Phase 1 verification for FOUND-05 (roadmap success criterion 4: "An invited admin can complete a magic-link login round-trip"). It requires either:
  1. Plan 07's `instrumentation.ts` to auto-invoke `bootstrapAdmin()` at dev/prod boot, OR
  2. A one-time manual `bootstrapAdmin()` call to seed the `admin_user` table with `BOOTSTRAP_ADMIN_EMAIL`.

Until an admin row exists, the magic-link `signIn` callback will reject every email (T-AUTH-02 integration test already proves this is the correct rejection behaviour — plan 05 commit `1fa815d`). So the round-trip cannot be driven end-to-end without one of the two pre-conditions.

**Scope:** Not a bug — the gate is by design and aligned with plan 07's deliverable. The auto-mode executor session for plan 06 does not run interactive human checkpoints.

**Fix plan:** Carry into plan 01-07. Plan 07 adds `instrumentation.ts` with the bootstrap boot hook; after plan 07 lands, the developer runs Task 06.3's 10-step walkthrough against their local `pnpm dev` + real Resend account + real `BOOTSTRAP_ADMIN_EMAIL`, then records the outcome in a short follow-up commit annotating DEF-03 as RESOLVED. The `tests/e2e/magic-link-login.spec.ts` Playwright scaffold (also from plan 06) remains in place for a future Phase 2 automation effort if/when email-intercept infra is budgeted.

**Acceptance of DEF-03:** Developer confirms steps 1–10 of Task 06.3 produce expected outcomes AND `psql "$DATABASE_URL_DIRECT" -c "SELECT COUNT(*) FROM sessions"` returns ≥ 1.

---
