// Pitfall 3: drizzle-kit MUST use DATABASE_URL_DIRECT (non-pooled). Using the
// pooled DATABASE_URL silently fails DDL migrations under PgBouncer's
// transaction-mode pooling — the migration appears to succeed but the schema
// is never actually applied to the primary.
import 'dotenv/config';
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
