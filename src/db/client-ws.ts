// Drizzle WebSocket (Pool) client — ONLY for multi-statement transactions.
// The neon-serverless driver keeps a WebSocket connection open long enough
// for BEGIN..COMMIT semantics (neon-http cannot). Consumers: bootstrap admin
// INSERT..ON CONFLICT is a single statement and can stay on neon-http; the
// Phase 3 product_search rebuild writes three locale rows in one transaction
// and MUST use this client.
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { env } from '@/env';
import * as schema from './schema';

export const pool = new Pool({ connectionString: env.DATABASE_URL });
// `casing: 'snake_case'` mirrors drizzle.config.ts so runtime transactions
// emit the same column names drizzle-kit migrations created. Without it
// `tx.update(categories).set({ updatedAt: ... })` would target a literal
// "updatedAt" column that does not exist (the migration created
// "updated_at"). Phase-1 categories/products/manufacturers/recipes/
// industries schemas all rely on this convention rather than declaring
// explicit per-column name strings — see drizzle.config.ts:22.
export const dbTx = drizzle({ client: pool, schema, casing: 'snake_case' });
