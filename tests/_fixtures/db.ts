// Lazy Drizzle test client. Tests that call this must run AFTER plan 03's
// migration lands on the Neon test branch; this fixture itself only checks
// that DATABASE_URL points at a Neon test branch, without opening a connection.
export async function getTestDb() {
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
