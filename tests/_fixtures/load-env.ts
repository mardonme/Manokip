// Vitest setup file — loads .env.local (which Next.js conventions use for
// developer-machine secrets; gitignored) so live-DB tests in tests/db/*
// see DATABASE_URL + DATABASE_URL_DIRECT + Neon creds.
//
// Precedence (first loaded wins by default):
//   1. .env.local   (developer machine secrets)
//   2. .env.test    (CI / test-branch-specific overrides, if present)
//   3. .env         (CI fallback / Vercel env-less local runs)
//
// Vitest itself does not load these files automatically.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env.test' });
loadEnv();

// Plan 02-04: dbTx (WebSocket Pool client) is required for transaction
// integration tests (logAudit). Node 22's global WebSocket sometimes fails
// to negotiate with Neon's serverless endpoint; the canonical fix
// (per https://github.com/neondatabase/serverless CONFIG.md) is to point
// neonConfig.webSocketConstructor at the `ws` package, which is already
// installed as a transitive dep of @neondatabase/serverless. Done at
// test-suite boot — has no effect outside of tests since this fixture is
// the vitest setupFiles entry only.
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws as unknown as typeof globalThis.WebSocket;

// The @/env boundary (src/env.ts, @t3-oss/env-nextjs) asserts all required
// server env vars at import time. Tests only exercise the DB path; Auth.js,
// Resend, and Sentry are wired in later plans. Until those plans add the
// real secrets to .env.local, we supply safe placeholder values so importing
// @/db/client (which pulls in @/env) doesn't throw at test-suite boot.
//
// Any var NOT already set by .env.local / .env.test / .env gets a dummy.
// Real values (DATABASE_URL, DATABASE_URL_DIRECT, CLOUDINARY_*) loaded above
// take precedence — dotenv's default behavior is first-loaded-wins.
const defaults: Record<string, string> = {
  AUTH_SECRET: 'test-secret-at-least-thirty-two-chars-placeholder',
  AUTH_RESEND_KEY: 're_test_placeholder',
  RESEND_FROM_EMAIL: 'test@manometr.uz',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
};
for (const [k, v] of Object.entries(defaults)) {
  if (!process.env[k]) process.env[k] = v;
}
