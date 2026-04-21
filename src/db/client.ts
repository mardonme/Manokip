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
export const db = drizzle({ client: sql, schema });
