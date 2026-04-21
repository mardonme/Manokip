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
export const dbTx = drizzle({ client: pool, schema });
