import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

// Phase 1 manual smoke test: verifies Sentry receives thrown errors from the
// Node runtime. requireAdmin() gates the throw so unauthenticated callers get
// 401 and never reach it (T-SMOKE-ABUSE). Authenticated POSTs throw a labeled
// error that instrumentation.ts's onRequestError export forwards to Sentry
// within 60s. POST-only to keep crawlers/previews from triggering events.
export async function POST() {
  await requireAdmin();
  throw new Error('Phase 1 Sentry smoke test — this is expected to surface in the Sentry dashboard');
}
