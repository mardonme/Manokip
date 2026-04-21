# Phase 1 Deferred Items

Items discovered during execution that are out of scope for the current plan. Each entry documents the issue + the plan that should fix it.

---

## From Plan 01-04 (2026-04-21)

### DEF-01: Tailwind v4 / @tailwindcss/postcss transitive version skew breaks `next build`

**Discovered during:** Plan 01-04 Task 04.2 build verification

**Issue:** `pnpm build` fails with
```
Error evaluating Node.js code
Error: Missing field `negated` on ScannerOptions.sources
at Object.Once (node_modules/.pnpm/@tailwindcss+postcss@4.0.0/node_modules/@tailwindcss/postcss/dist/index.js:8:4164)
```

`@tailwindcss/postcss@4.0.0` pulls in `@tailwindcss/node@4.2.3` and `@tailwindcss/oxide@4.2.3` via `^4` range, and those internal APIs have diverged from what the 4.0.0 postcss plugin expects.

**Scope:** Tailwind wiring was shipped by plan 01-01 (`src/app/globals.css` + `postcss.config.mjs` + tailwind deps). Plan 01-04 does not modify CSS/PostCSS. Build failed the same way before plan 01-04 was executed, except previously `next.config.mjs` failed earlier at `ERR_MODULE_NOT_FOUND` for `./src/env.js` (plan 01-04 fixed that by converting to `next.config.ts`), which masked this downstream issue.

**Pre-existing evidence:** No prior plan SUMMARY documents a successful `pnpm build` run. Plan 01-01 summary says "pnpm build: 0 after plan 03" but plan 03 also did not run `pnpm build` locally — it only set up `vercel.json` (which runs build inside Vercel's environment where dep resolution may differ).

**Recommended fix:** Either:
- Upgrade `tailwindcss` + `@tailwindcss/postcss` to matching newer versions (both `^4.2.3` or latest stable), OR
- Add `"overrides"` to `package.json` pinning `@tailwindcss/node` + `@tailwindcss/oxide` to `4.0.0`.

**Suggested landing plan:** Fold into Plan 01-05 pre-flight or raise a separate chore plan. Not urgent for Phase 1 correctness if Vercel's build environment resolves the peer differently, but should be verified against a Vercel preview build before Phase 1 closes.

**Workaround in place:** None. `pnpm dev` and `pnpm build` both fail on developer machine. Plan 01-04's source code deliverables (i18n config + [locale] layout + messages + e2e specs) are nonetheless correct per typecheck, and the e2e specs are seeded for future execution against a working server (Plan 06 locally or Plan 07 Vercel preview).

### DEF-02: .env.local lacks Auth.js + Resend secrets (expected until plan 01-05)

**Discovered during:** Plan 01-04 Task 04.2 build verification

**Issue:** `src/env.ts` declares `AUTH_SECRET`, `AUTH_RESEND_KEY`, `RESEND_FROM_EMAIL` as required. The developer `.env.local` only has DB + Cloudinary secrets from plan 01-01/01-03. Running `pnpm dev` or `pnpm build` (after DEF-01 is fixed) triggers the Zod validator and aborts before next-intl routing can be exercised.

**Workaround applied by plan 01-04:** Non-functional placeholder values appended to `.env.local` (gitignored, developer-machine only) so `next.config.ts`'s `import './src/env'` can load. Exact values documented in `.env.local` with a comment "awaiting plan 01-05". Tests/_fixtures/load-env.ts already uses the same pattern for test-suite boot (plan 01-03).

**Recommended fix:** Plan 01-05 will generate real `AUTH_SECRET` (`openssl rand -base64 32`) and provide real `AUTH_RESEND_KEY` + `RESEND_FROM_EMAIL` from the developer's Resend dashboard. Replacing the placeholders in `.env.local` is a plan 01-05 setup step.

---
