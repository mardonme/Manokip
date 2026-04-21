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
  },
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL:           process.env.DATABASE_URL,
    DATABASE_URL_DIRECT:    process.env.DATABASE_URL_DIRECT,
    AUTH_SECRET:            process.env.AUTH_SECRET,
    AUTH_RESEND_KEY:        process.env.AUTH_RESEND_KEY,
    RESEND_FROM_EMAIL:      process.env.RESEND_FROM_EMAIL,
    BOOTSTRAP_ADMIN_EMAIL:  process.env.BOOTSTRAP_ADMIN_EMAIL,
    CLOUDINARY_CLOUD_NAME:  process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY:     process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET:  process.env.CLOUDINARY_API_SECRET,
    SENTRY_DSN:             process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN:      process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
});
