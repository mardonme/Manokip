// Lazy Drizzle test client; plan 02 creates @/db/client, plan 03 runs the migration
// against the test branch. Tests that call this must run AFTER plan 03.
// The @ts-expect-error silences TS2307 until plan 02 lands src/db/client.ts —
// at that point the directive becomes an error and MUST be removed.
export async function getTestDb() {
  // @ts-expect-error — @/db/client is created in plan 02; this import is lazy + runtime-only
  const { db } = await import('@/db/client');
  return db;
}

export function requireTestDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.includes('neon.tech')) {
    throw new Error(
      'tests/_fixtures/db.ts: DATABASE_URL must point to a Neon test branch. Copy .env.test.example to .env.test and fill in the test-branch URL.',
    );
  }
}
