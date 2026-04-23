---
phase: 01-foundations
plan: 07
type: summary
status: tasks-complete / checkpoint-pending
requirements: [FOUND-07]
completed_at: "2026-04-23T00:00:00Z"
autonomous: false
deviations:
  - id: DEV-07-01
    task: 07.1
    note: "Plan references next.config.mjs; project standardized on next.config.ts since plan 01-04 — composed withSentryConfig over withNextIntl on next.config.ts instead. `import './src/env';` path preserved (plan's `./src/env.js` does not match our TS source layout)."
  - id: DEV-07-02
    task: 07.1
    note: "@sentry/nextjs v10 removed the v8 `hideSourceMaps: true` option from SentryBuildOptions. Replaced with `sourcemaps: { deleteSourcemapsAfterUpload: true }` — same security outcome (uploaded source maps are not left publicly served next to the bundle). Typecheck error TS2561 drove the change."
  - id: DEV-07-03
    task: 07.2
    note: "Plan placed the smoke endpoint under `/api/_smoke/sentry`. Next.js App Router convention: folders prefixed with `_` are PRIVATE folders that opt OUT of routing entirely — confirmed by the first `pnpm build` run which omitted the route from the final manifest. Renamed folder `_smoke` → `smoke` so the endpoint is actually reachable. The plan's stated intent (`Underscore prefix in the path segment _smoke signals 'internal, do not expose in sitemap.'`) is satisfied instead by: this is a POST-only endpoint, has no GET handler, and will not appear in Phase 2's sitemap (which enumerates known public routes, not all App Router files)."
  - id: DEV-07-04
    task: 07.1
    note: "`disableLogger: true` emits a @sentry/nextjs deprecation warning during Turbopack builds ('Use webpack.treeshake.removeDebugLogging instead. (Not supported with Turbopack.)'). Kept anyway — the plan's acceptance criteria do not list a replacement, removing it would violate the verbatim-from-interfaces rule on the other Sentry options, and the warning is not fatal. Flag for Phase 5 launch polish: when Next.js / @sentry/nextjs publish a Turbopack-compatible replacement, swap."
follow_ups:
  - "DEF-03 (Task 06.3 magic-link round-trip manual verification) is now unblocked because `instrumentation.ts` runs `bootstrapAdmin()` on Node cold start. Fold into Task 07.3 checkpoint."
  - "Task 07.3 is the manual deploy-smoke checkpoint and is still pending. Blocks Phase 1 verification."
---

# Plan 01-07 Summary — Sentry Observability + Bootstrap Boot Hook

## What landed (Tasks 07.1 + 07.2)

Six files touched: three Sentry runtime configs at repo root, one `src/instrumentation.ts` register hook, `next.config.ts` wrapped with `withSentryConfig`, and one admin-gated POST smoke endpoint.

### The three-runtime Sentry model

Sentry's Next.js SDK expects three separate initialization files because the three Next.js runtimes (Node, browser, Edge) each load a different bundle with different JavaScript globals available:

| File | Runtime | DSN var | Notes |
|---|---|---|---|
| `sentry.server.config.ts` | Node (`nodejs`) | `SENTRY_DSN` | Server-only var (never shipped to client). |
| `sentry.client.config.ts` | Browser | `NEXT_PUBLIC_SENTRY_DSN` | `NEXT_PUBLIC_*` is intentionally client-readable. DSNs are not secrets (see Sentry docs). Also disables session replay (`replaysSessionSampleRate: 0`) per CONTEXT.md Claude's Discretion — no v1 budget for replay. |
| `sentry.edge.config.ts` | Edge (middleware) | `SENTRY_DSN` | `proxy.ts` runs here. The `NEXT_PUBLIC_` prefix is not required because Edge Functions are server-side. |

All three share: `tracesSampleRate: 0.1` (10% of requests sampled for performance), `sampleRate: 1.0` (100% of errors captured), `enabled: process.env.NODE_ENV === 'production'` (no emission in dev or test), `sendDefaultPii: false` (PII scrubbing on).

**Where they live:** Sentry's Next.js SDK auto-discovers these files at the repo root (not under `src/`). This is non-negotiable in v10 — putting them under `src/` means they never load. The location is codified in the plan's Must-Have "truths" list.

### The instrumentation hook (`src/instrumentation.ts`)

Next.js 16 calls `register()` exactly once per process at cold start. The hook branches on `process.env.NEXT_RUNTIME`:

- `nodejs`: dynamically imports `../sentry.server.config` then `bootstrapAdmin()` from `./lib/bootstrap`. The bootstrap call is wrapped in `try/catch` so that a DB-down scenario captures to Sentry (tagged `phase: 'bootstrap-admin'`) but does not hang Node cold start.
- `edge`: dynamically imports `../sentry.edge.config`. No bootstrap (Edge runtime has no full Node DB driver; bootstrap runs only on Node).
- `onRequestError` export is bound to `Sentry.captureRequestError` — Next.js calls this for every unhandled error in a Server Component / route handler / Server Action, forwarding it into Sentry.

`src/instrumentation.ts` is the canonical location when the project uses `--src-dir` (Next.js 16 also accepts it at the repo root, but keeping it alongside other app code is preferred).

### D-12 bootstrap boot hook

The `bootstrapAdmin()` call in `register()` satisfies D-12: on every Node cold start, Manometr seeds the first admin row from `BOOTSTRAP_ADMIN_EMAIL` **idempotently**:

1. A module-level `bootstrapped` flag skips work on the second call within the same Node process.
2. A `SELECT 1 FROM admin_user LIMIT 1` pre-check skips the insert if any admin already exists (even if the env var now points at a different email — protects against stale-env-var reseeding).
3. `ON CONFLICT DO NOTHING` on `admin_user.email` handles the narrow window where two concurrent cold starts both pass the pre-check and race to `INSERT`.

This unblocks DEF-03 (plan 01-06 Task 06.3 magic-link round-trip) because the first admin row now exists before any sign-in attempt lands.

### `next.config.ts` composition

```
withSentryConfig( withNextIntl(nextConfig), sentryBuildOptions )
```

Composition order matters: the Sentry wrapper operates on the output of the Next-intl wrapper. Putting Sentry on the inside would mean next-intl's i18n plugin sees the Sentry-rewritten webpack config and may drop rewrites.

`turbopack.root` from plan 01-06 is preserved (the Windows-path-root workaround) so `proxy.ts` still resolves from the repo root, not from `C:\Users\hp elitebook\`.

### Sentry build options

| Option | Value | Why |
|---|---|---|
| `org`, `project`, `authToken` | from env | Consumed at build time for source-map upload. Missing values disable upload silently (local dev). |
| `silent: !process.env.CI` | true locally, false in CI | Hide verbose build logs in dev but show them in CI runs where they're useful. |
| `tunnelRoute: '/sentry-tunnel'` | enabled | Ad-block bypass. Browser sends Sentry events to the app's own `/sentry-tunnel` endpoint which proxies to sentry.io. Otherwise many users with uBlock / Brave never emit events. |
| `sourcemaps.deleteSourcemapsAfterUpload: true` | enabled | Replaces the v8 `hideSourceMaps: true` flag (removed in v10). Uploaded source maps are not left publicly accessible next to the production bundle. |
| `disableLogger: true` | enabled | Tree-shakes `Sentry.logger` calls out of the client bundle. Emits a deprecation warning under Turbopack; acceptable for Phase 1. |

### The admin-gated smoke endpoint (`/api/smoke/sentry/route.ts`)

POST-only. Calls `requireAdmin()` FIRST (unauthenticated callers get 401 with no Sentry event — T-SMOKE-ABUSE quota mitigation), then throws a labeled error `'Phase 1 Sentry smoke test — this is expected to surface in the Sentry dashboard'`. The error propagates to the Next.js error boundary, which triggers the `onRequestError` export, which forwards to `Sentry.captureRequestError`.

**Folder naming:** plan said `_smoke` but that's an App Router private folder — excluded from routing. Renamed to `smoke`. The POST-only surface + absence from Phase 2's sitemap will keep it out of public discovery. Phase 5 launch: decide whether to keep the endpoint (harmless, future re-use for "is Sentry alive?" checks) or delete.

### Verification run

```
pnpm typecheck                 # 0
pnpm build                     # 0 — routes manifest lists /api/smoke/sentry
pnpm vitest run                # 42/42 passed in 7.8s
```

The routes manifest in the build output confirms `/api/smoke/sentry` is registered:
```
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/cloudinary/sign
└ ƒ /api/smoke/sentry
```

One Turbopack deprecation warning is visible — `disableLogger is deprecated and will be removed in a future version. Use webpack.treeshake.removeDebugLogging instead. (Not supported with Turbopack.)`. It is not fatal (see DEV-07-04).

## Outstanding — Task 07.3 (manual deploy checkpoint)

`autonomous: false` on the plan applies ONLY to Task 07.3. Tasks 07.1 + 07.2 executed unattended and pass every automated check they can. Task 07.3 is the human-verified deploy smoke:

1. `git push origin master` → Vercel preview
2. Verify `x-vercel-id` header shows `fra1::...`
3. Log in via magic-link with `BOOTSTRAP_ADMIN_EMAIL` — confirms Resend + Neon session writes + middleware gate + bootstrap hook on cold start
4. From DevTools console on the authed preview: `fetch('/api/smoke/sentry', { method: 'POST' })` → expect 500 (the throw)
5. Sentry Issues: expect a new issue matching `'Phase 1 Sentry smoke test'` within 60s
6. Vercel Analytics: expect ≥1 pageview within 5 min
7. Vercel Speed Insights: expect ≥1 sample within 5 min
8. `curl -s https://<preview>/uz/ | grep -E 'API_SECRET|AUTH_SECRET|DATABASE_URL'` → expect no matches
9. Unauth `curl -X POST /api/smoke/sentry` → expect 401

Task 07.3 approval is the last checkpoint before Phase 1 exit. Resolves DEF-03 in the same manual run.

## Follow-ups for Phase 2+

- **Release tracking:** set `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` in Vercel so `withSentryConfig` can upload source maps per deploy. Configure Sentry release-tagging via CI git SHA.
- **Alert rule tuning:** route Sentry → Slack / email only for high-signal issues (ignore `NEXT_NOT_FOUND`, ignore 401s).
- **`<ErrorBoundary>` adoption:** add page-level error boundaries so end-users see graceful UZ/RU/EN error pages instead of Next's default. Pair with `Sentry.showReportDialog` behind an opt-in toggle.
- **`disableLogger` replacement:** swap for `webpack.treeshake.removeDebugLogging` once @sentry/nextjs publishes a Turbopack-compatible path (Phase 5 polish).
- **Smoke endpoint disposition:** Phase 5 launch checklist decides delete-vs-keep. Keeping it means Sentry-alive checks stay 1-line for operational debugging.

## State updates needed

- Flip DEF-03 to RESOLVED-PENDING-MANUAL-VERIFY in `deferred-items.md` (bootstrap now runs on cold start; magic-link round-trip moved to Task 07.3 checkpoint)
- `STATE.md` — after Task 07.3 approval, mark plan 01-07 complete + trigger phase verification
