// Drizzle HTTP client — used everywhere except transactions.
// Uses the pooled DATABASE_URL per Pitfall 7 (serverless + Postgres meltdown
// is avoided by pooled connection routing through PgBouncer).
// For transactional work (bootstrap admin, Phase 3 product_search rebuild),
// use ./client-ws.ts instead.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '@/env';
import * as schema from './schema';

const sql = neon(env.DATABASE_URL);
// `casing: 'snake_case'` mirrors drizzle.config.ts so runtime queries emit
// the same column names drizzle-kit migrations created (e.g. createdAt ->
// "created_at"). Without this the camelCase JS field name is used verbatim
// at runtime, producing `column "createdAt" does not exist` 42703 errors
// on tables whose schema relies on the casing strategy rather than explicit
// per-column name strings (categories, products, manufacturers, recipes,
// industries — Phase-1 schema convention).
export const db = drizzle({ client: sql, schema, casing: 'snake_case' });
