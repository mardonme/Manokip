// Pitfall 3: drizzle-kit MUST use DATABASE_URL_DIRECT (non-pooled). Using the
// pooled DATABASE_URL silently fails DDL migrations under PgBouncer's
// transaction-mode pooling — the migration appears to succeed but the schema
// is never actually applied to the primary.
//
// Env loading: Next.js convention is .env.local for developer-machine secrets
// (gitignored). dotenv's default loads `.env` only, so we load .env.local
// first (higher precedence) and then fall through to `.env` for CI/Vercel.
// On Vercel, env vars come from the project dashboard — neither file exists.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv(); // falls back to .env if it exists
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT!,
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
