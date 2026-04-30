// One-off verification script for Phase 3 Plan 02 Task 2.2.
// Confirms: extensions installed + 4 new columns present + migration row written.
// Usage: pnpm dlx tsx scripts/verify-extensions.ts (from worktree root)
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws as unknown as typeof globalThis.WebSocket;

async function main() {
  const url = process.env.DATABASE_URL_DIRECT;
  if (!url) throw new Error('DATABASE_URL_DIRECT not loaded');
  const pool = new Pool({ connectionString: url });

  const ext = await pool.query(
    `SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm') ORDER BY extname`,
  );
  console.log('Extensions:', ext.rows);

  const cols = await pool.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE (table_name = 'manufacturer' AND column_name = 'is_official_rep')
         OR (table_name = 'manufacturer_translations' AND column_name = 'relationship_note')
         OR (table_name = 'product' AND column_name IN ('image_public_ids','datasheet_public_ids'))
      ORDER BY table_name, column_name`,
  );
  console.log('Columns:', cols.rows);

  const mig = await pool.query(
    `SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5`,
  );
  console.log('Migrations:', mig.rows);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
