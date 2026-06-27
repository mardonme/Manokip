import 'dotenv/config';
import { z } from 'zod';

// Fail-fast environment validation. In production a missing/weak secret or an
// unset DATABASE_URL/CORS_ORIGIN must stop the server from booting rather than
// silently falling back to insecure defaults.

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// Secrets we must never accept in production — these are the documented dev
// placeholders. If JWT_SECRET matches one of these, boot is refused.
const WEAK_JWT_SECRETS = new Set([
  'dev-secret',
  'secret',
  'change-me',
  'change-me-to-a-long-random-string',
]);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Prisma reads DATABASE_URL itself, but we validate it here so a missing/typo'd
  // value fails loudly at boot instead of as a confusing first-query crash.
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required' })
    .min(1, 'DATABASE_URL is required'),

  // In dev we fall back to a throwaway secret for convenience; production
  // strength is enforced separately below (see assertProductionSecrets).
  JWT_SECRET: z.string().min(1).default('dev-secret'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Comma-separated list of allowed frontend origins.
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

  // Telegram admin notifications. Optional — unset BOT_TOKEN skips notifications.
  BOT_TOKEN: z.string().default(''),
  ADMIN_CHAT_ID: z.string().default(''),
  TELEGRAM_POLLING: z.string().default('true'),

  // Google Gemini AI assistant. Unset GEMINI_API_KEY degrades /api/chat to the
  // operator fallback.
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  // Per-request timeout and a soft daily ceiling for outbound Gemini calls, to
  // bound cost and stop a hung request from holding a worker open.
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  AI_DAILY_CAP: z.coerce.number().int().positive().default(2_000),
});

// Treat empty-string env vars as unset, so a blank `JWT_SECRET=` in a .env file
// falls back to its default (in dev) rather than failing the .min(1) check.
const rawEnv = {};
for (const [k, v] of Object.entries(process.env)) {
  if (v !== '') rawEnv[k] = v;
}

const parsed = schema.safeParse(rawEnv);
if (!parsed.success) {
  console.error('[env] Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

const e = parsed.data;

// Production-only hardening: enforce real secrets and safe CORS. We read the
// RAW process.env values (not the zod-defaulted ones) so an *unset* JWT_SECRET
// is treated as missing rather than the dev fallback.
function assertProductionSecrets() {
  const problems = [];

  const rawSecret = process.env.JWT_SECRET || '';
  if (rawSecret.length < 32) {
    problems.push('JWT_SECRET must be set to at least 32 characters. Generate one: `openssl rand -hex 64`');
  } else if (WEAK_JWT_SECRETS.has(rawSecret)) {
    problems.push('JWT_SECRET is a known placeholder value — set a unique strong secret.');
  }

  if (!process.env.CORS_ORIGIN) {
    problems.push('CORS_ORIGIN must be set in production (comma-separated https origins).');
  } else {
    for (const origin of e.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (origin === '*') {
        problems.push('CORS_ORIGIN must not be "*" while credentials are enabled.');
      } else if (!origin.startsWith('https://')) {
        problems.push(`CORS_ORIGIN entry "${origin}" must use https:// in production.`);
      }
    }
  }

  if (problems.length) {
    console.error('[env] Refusing to start in production with insecure configuration:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

if (isProd) assertProductionSecrets();

export const env = {
  PORT: e.PORT,
  NODE_ENV: e.NODE_ENV,
  JWT_SECRET: e.JWT_SECRET,
  JWT_EXPIRES_IN: e.JWT_EXPIRES_IN,
  CORS_ORIGIN: e.CORS_ORIGIN,
  BOT_TOKEN: e.BOT_TOKEN,
  ADMIN_CHAT_ID: e.ADMIN_CHAT_ID,
  // Set TELEGRAM_POLLING=false to disable the /start chat-id helper bot loop.
  TELEGRAM_POLLING: e.TELEGRAM_POLLING !== 'false',
  GEMINI_API_KEY: e.GEMINI_API_KEY,
  GEMINI_MODEL: e.GEMINI_MODEL,
  AI_TIMEOUT_MS: e.AI_TIMEOUT_MS,
  AI_DAILY_CAP: e.AI_DAILY_CAP,
};
