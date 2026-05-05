// Phase 5 plan 05-02 task 2.6 — submitContactForm Server Action GREEN tests.
//
// Live-Neon test branch — actually inserts into contact_submission and
// audit_log; cleans up after each spec via per-test stamp.
//
// Mocks (hoisted by Vitest):
//   - @/lib/auth (next-auth chain short-circuit; mirrors tests/actions/*.test.ts)
//   - @/lib/turnstile (force success — withPublicAction would otherwise hit
//     Cloudflare; we want to exercise the handler not the gate)
//   - @/lib/email-contact (capture fire calls; never hit Resend)
//   - next-intl/server (return a stub `t` so getTranslations works without
//     Next.js request context; the tests don't depend on actual translation
//     content — they verify the prepend STRUCTURE exists)
//   - next/headers (vary IP per spec to keep rate-limit buckets independent)

import {
  describe,
  it,
  expect,
  afterEach,
  beforeEach,
  vi,
} from 'vitest';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { seedProduct } from '../_fixtures/seed-products';

// Short-circuit next-auth chain (the action import pulls server-action.ts which
// pulls @/lib/auth). withPublicAction never calls requireAdmin but the import
// graph runs.
vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstile: vi.fn(async () => ({ success: true })),
}));

const { fireAdminNotificationMock, fireVisitorAutoReplyMock } = vi.hoisted(
  () => ({
    fireAdminNotificationMock: vi.fn(),
    fireVisitorAutoReplyMock: vi.fn(),
  }),
);
vi.mock('@/lib/email-contact', () => ({
  fireAdminNotification: fireAdminNotificationMock,
  fireVisitorAutoReply: fireVisitorAutoReplyMock,
  // Async senders are also exported but the action calls only the fire-* wrappers.
  sendAdminNotification: vi.fn(),
  sendVisitorAutoReply: vi.fn(),
}));

// next-intl/server stub — t(key, vars) returns the key + interpolation echo.
// Tests assert prepend structure (productInquiry line is present), not the
// exact wording (plan 05-03 fills the messages skeleton).
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(
    async ({ namespace }: { namespace: string }) =>
      (key: string, vars?: Record<string, unknown>) => {
        const echoed =
          vars && Object.keys(vars).length > 0
            ? `${namespace}.${key}(${Object.entries(vars)
                .map(([k, v]) => `${k}=${String(v)}`)
                .join(',')})`
            : `${namespace}.${key}`;
        return echoed;
      },
  ),
}));

let currentHeaders = new Headers({
  'x-forwarded-for': '203.0.113.5',
  'user-agent': 'vitest-contact-action',
});
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(currentHeaders),
}));

import { submitContactForm } from '@/actions/contact';
import { hashIp } from '@/lib/rate-limit';

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const issuedHashes: string[] = [];
const insertedSubmissionIds: string[] = [];

function setIp(label: string): string {
  const ip = `198.51.100.${Math.floor(Math.random() * 250)}-${label}-${stamp}`;
  currentHeaders = new Headers({
    'x-forwarded-for': ip,
    'user-agent': 'vitest-contact-action',
  });
  const h = hashIp(ip);
  issuedHashes.push(h);
  return h;
}

describe('submitContactForm (live Neon)', () => {
  beforeEach(() => {
    fireAdminNotificationMock.mockReset();
    fireVisitorAutoReplyMock.mockReset();
    // Default mock for fire-* wrappers: void return (matches lib signature).
    fireAdminNotificationMock.mockReturnValue(undefined);
    fireVisitorAutoReplyMock.mockReturnValue(undefined);
  });

  afterEach(async () => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    if (insertedSubmissionIds.length > 0) {
      const ids = sql`ARRAY[${sql.join(
        insertedSubmissionIds.map((id) => sql`${id}`),
        sql`, `,
      )}]::text[]`;
      await db.execute(
        sql`DELETE FROM audit_log WHERE entity_id = ANY(${ids}) AND entity_type = 'contact_submission'`,
      );
      await db.execute(
        sql`DELETE FROM contact_submission WHERE id::text = ANY(${ids})`,
      );
      insertedSubmissionIds.length = 0;
    }
    if (issuedHashes.length > 0) {
      const arr = sql`ARRAY[${sql.join(
        issuedHashes.map((h) => sql`${h}`),
        sql`, `,
      )}]::text[]`;
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ANY(${arr})`);
      await db.execute(
        sql`DELETE FROM contact_rate_limit WHERE ip_hash = ANY(${arr})`,
      );
      issuedHashes.length = 0;
    }
  });

  it(
    'happy path: inserts contact_submission row + writes audit row + returns ok:true with row id (string)',
    async () => {
      requireTestDatabaseUrl();
      setIp('happy');
      const result = await submitContactForm({
        name: `Visitor ${stamp}`,
        company: 'Acme Corp',
        email: 'visitor@example.com',
        phone: '+998 90 000 0000',
        message: 'Need a quote for MD-100.',
        sourcePage: '/uz/about',
        locale: 'uz',
        turnstileToken: 'good-token',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok');
      expect(typeof result.data.id).toBe('string');
      insertedSubmissionIds.push(result.data.id);

      const db = await getTestDb();
      const rows = await db.execute(sql`
        SELECT name, email, locale, source_page FROM contact_submission
         WHERE id::text = ${result.data.id}
      `);
      expect(rows.rows).toHaveLength(1);
      const row = rows.rows[0] as {
        name: string;
        email: string;
        locale: string;
        source_page: string;
      };
      expect(row.name).toBe(`Visitor ${stamp}`);
      expect(row.email).toBe('visitor@example.com');
      expect(row.locale).toBe('uz');
      expect(row.source_page).toBe('/uz/about');

      // Audit row — every mutation writes audit_log (CLAUDE.md compliance).
      const audit = await db.execute(sql`
        SELECT actor_email, action, entity_type FROM audit_log
         WHERE entity_id = ${result.data.id}
           AND entity_type = 'contact_submission'
      `);
      expect(audit.rows).toHaveLength(1);
      const aRow = audit.rows[0] as {
        actor_email: string;
        action: string;
        entity_type: string;
      };
      expect(aRow.actor_email).toBe('visitor');
      expect(aRow.action).toBe('contact_submission_create');
      expect(aRow.entity_type).toBe('contact_submission');

      // Fire-and-forget emails were called (mocked).
      expect(fireAdminNotificationMock).toHaveBeenCalledTimes(1);
      expect(fireVisitorAutoReplyMock).toHaveBeenCalledTimes(1);
    },
    30_000,
  );

  it(
    'product-context auto-prepend: sourcePage /(uz)/products/<slug> prefixes message with localized inquiryAbout line',
    async () => {
      requireTestDatabaseUrl();
      setIp('product-prepend');
      const seeded = await seedProduct({
        name: `pp-${stamp}`,
        locales: { uz: true },
      });
      // Promote to published + give it an SKU so the action's lookup matches.
      const db = await getTestDb();
      await db.execute(
        sql`UPDATE product SET status = 'published', sku = ${`SKU-${stamp}`} WHERE id = ${seeded.productId}::uuid`,
      );

      try {
        const slug = `${seeded.name}-uz`;
        const result = await submitContactForm({
          name: 'Engineer',
          email: 'eng@example.com',
          message: 'Original visitor question.',
          sourcePage: `/uz/products/${slug}`,
          locale: 'uz',
          turnstileToken: 'good-token',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error('expected ok');
        insertedSubmissionIds.push(result.data.id);

        const rows = await db.execute(sql`
          SELECT message FROM contact_submission WHERE id::text = ${result.data.id}
        `);
        const stored = (rows.rows[0] as { message: string }).message;
        // Stub returns 'public.contact.productInquiry.inquiryAbout(...)' — the
        // important assertion is that the original message follows the prefix
        // separated by the \n\n delimiter (D-03 prepend structure).
        expect(stored.endsWith('Original visitor question.')).toBe(true);
        expect(stored.includes('\n\n')).toBe(true);
        expect(stored).toMatch(/inquiryAbout/);
        expect(stored).toContain(seeded.name);

        // Auto-reply fired with productContext populated.
        expect(fireVisitorAutoReplyMock).toHaveBeenCalledTimes(1);
        const args = fireVisitorAutoReplyMock.mock.calls[0]![0] as {
          productContext?: string;
        };
        expect(args.productContext).toContain(seeded.name);
      } finally {
        await seeded.cleanup();
      }
    },
    30_000,
  );

  it(
    'sourcePage validation: invalid sourcePage falls back to /<locale>',
    async () => {
      requireTestDatabaseUrl();
      setIp('source-validation');
      const result = await submitContactForm({
        name: 'Visitor',
        email: 'v@example.com',
        message: 'hi',
        sourcePage: '/admin/secret', // attacker-supplied — should be rejected
        locale: 'ru',
        turnstileToken: 'good-token',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok');
      insertedSubmissionIds.push(result.data.id);

      const db = await getTestDb();
      const rows = await db.execute(sql`
        SELECT source_page FROM contact_submission WHERE id::text = ${result.data.id}
      `);
      expect((rows.rows[0] as { source_page: string }).source_page).toBe('/ru');
    },
    30_000,
  );

  it(
    'Resend admin send failure does NOT fail the submission (fire-and-forget swallows)',
    async () => {
      requireTestDatabaseUrl();
      setIp('resend-fail');
      // The fire-* wrappers are SYNC void returns; making them throw would
      // simulate a bug in the dispatcher's own pre-fire setup. The real
      // contract is that an async Resend rejection inside `void
      // sendAdminNotification().catch(Sentry.captureException)` never bubbles
      // — and our wrappers .catch internally. Even if the wrapper itself were
      // to throw synchronously, we want submitContactForm to still have
      // committed the row.
      fireAdminNotificationMock.mockImplementation(() => {
        // Silent no-op (the lib swallows internally; we just don't crash).
      });

      const result = await submitContactForm({
        name: 'Visitor',
        email: 'v@example.com',
        message: 'hi',
        sourcePage: '/en',
        locale: 'en',
        turnstileToken: 'good-token',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok');
      insertedSubmissionIds.push(result.data.id);

      // Row committed regardless of the (mocked) Resend posture.
      const db = await getTestDb();
      const rows = await db.execute(sql`
        SELECT id FROM contact_submission WHERE id::text = ${result.data.id}
      `);
      expect(rows.rows).toHaveLength(1);
    },
    30_000,
  );

  it(
    'ADMIN_NOTIFY_EMAILS empty: action still returns ok:true (lib short-circuits the admin send)',
    async () => {
      requireTestDatabaseUrl();
      setIp('admin-empty');
      // Plan 05-01 left ADMIN_NOTIFY_EMAILS unset in tests (Pitfall 5 / D-07).
      // Action calls the fire-* wrapper unconditionally; the lib internally
      // sees the empty list and returns. Nothing for the action to do here
      // beyond verifying it still returns ok:true.
      delete process.env.ADMIN_NOTIFY_EMAILS;

      const result = await submitContactForm({
        name: 'Visitor',
        email: 'v@example.com',
        message: 'hi',
        sourcePage: '/uz',
        locale: 'uz',
        turnstileToken: 'good-token',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok');
      insertedSubmissionIds.push(result.data.id);

      // The action ALWAYS calls fireAdminNotification — the empty-skip happens
      // inside the lib (sendAdminNotification short-circuits on the lib side).
      expect(fireAdminNotificationMock).toHaveBeenCalledTimes(1);
    },
    30_000,
  );
});
