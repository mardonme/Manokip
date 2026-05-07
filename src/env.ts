import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL:          z.string().url(),
    DATABASE_URL_DIRECT:   z.string().url(),
    AUTH_SECRET:           z.string().min(32),
    AUTH_RESEND_KEY:       z.string().min(1),
    RESEND_FROM_EMAIL:     z.string().email(),
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY:    z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    SENTRY_DSN:            z.string().url().optional(),
    SENTRY_AUTH_TOKEN:     z.string().optional(),
    // Phase 5 plan 05-01 — contact form spam protection + rate limit + admin notify.
    // Pitfall 5: ADMIN_NOTIFY_EMAILS is .optional() (empty/unset → skip admin send);
    //            do NOT default to '' — Resend rejects empty recipients.
    // Pitfall 8: NEXT_PUBLIC_TURNSTILE_SITE_KEY must fail BUILD if missing
    //            (silent runtime fail otherwise).
    // A7: RATE_LIMIT_IP_SALT min 32 chars (>=32 bytes); generate via openssl rand -hex 32.
    //     MUST NOT be rotated post-launch (would invalidate hash → IP correlation across windows).
    TURNSTILE_SECRET_KEY:  z.string().min(1),
    RATE_LIMIT_IP_SALT:    z.string().min(32),
    ADMIN_NOTIFY_EMAILS:   z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  },
  // experimental__runtimeEnv lists ONLY client values — t3-env reads server
  // values directly from process.env on the server side. This is the
  // recommended pattern when env.ts can transitively land in a client bundle:
  // the previous `runtimeEnv` (with every process.env.SERVER_KEY reference)
  // would inline `undefined` into the client chunk and throw at module-load
  // ("Attempted to access a server-side environment variable on the client")
  // whenever the chunk was evaluated during SSR.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
});
