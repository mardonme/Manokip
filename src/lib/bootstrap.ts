// First-admin bootstrap — D-12 verbatim "if admin_user is empty and the env
// var is set, insert one row" with onConflictDoNothing belt-and-suspenders.
//
// Called from src/instrumentation.ts (plan 07) at Node cold boot under
// `NEXT_RUNTIME === 'nodejs'`, so it runs once per Node process. The module-
// scope `bootstrapped` flag short-circuits repeat calls within the same
// process; the SELECT 1 pre-check protects against the stale-env-var case
// (BOOTSTRAP_ADMIN_EMAIL points at a new address after real admins exist);
// the ON CONFLICT handles the narrow concurrent-cold-start race on two
// processes passing the pre-check simultaneously (Pitfall 8).

import { db } from '@/db/client';
import { adminUsers } from '@/db/schema';
import { env } from '@/env';

let bootstrapped = false;

export async function bootstrapAdmin(): Promise<void> {
  if (bootstrapped) return;

  const email = env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    bootstrapped = true;
    return;
  }

  // D-12 VERBATIM: "if admin_user is empty, insert". ANY row already in the
  // table causes the bootstrap to no-op, even if `email` is a different
  // address. This protects against a stale env var being used to seed a
  // second admin outside the normal invite flow.
  const [existing] = await db
    .select({ email: adminUsers.email })
    .from(adminUsers)
    .limit(1);
  if (existing) {
    bootstrapped = true;
    return;
  }

  // Belt-and-suspenders: a concurrent cold start could have passed the
  // pre-check above and raced us to this insert. onConflictDoNothing on the
  // adminUsers.email primary key guarantees a no-op on duplicate.
  await db
    .insert(adminUsers)
    .values({ email, role: 'admin', active: true })
    .onConflictDoNothing();

  bootstrapped = true;
}
