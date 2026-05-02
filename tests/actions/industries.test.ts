// Plan 04-06 Tasks 6.1 + 6.2 — GREEN live-Neon specs for the industry Server
// Action layer. Flips the 7 RED stubs from plan 04-04 by removing `it.skip`
// and providing live-Neon SUT bodies.
//
// Posture: lives in the `node` Vitest project (live-Neon HTTP). vi.mock chain
// mirrors tests/actions/recipes.test.ts (Wave 1 sibling) so the
// @/actions/industries import works through the next-auth import chain.
//
// Spec coverage matrix (per RESEARCH §Plan structure recommendation Wave 1):
//   1. saveIndustry creates industry + 3 translations + 0 linked products + audit
//   2. saveIndustry replace-on-save semantics for linked products (DELETE+INSERT)
//   3. saveIndustry with status=published but persisted=draft → throws
//      USE_PUBLISH_ACTION (W7 refusal-to-elevate, Phase 2 D-11 pattern)
//   4. publishIndustry atomic dual-column write (status + publishedAt) + audit
//   5. unpublishIndustry atomic dual-column write (status='draft', publishedAt=null)
//   6. deleteIndustry — audit BEFORE delete; FK cascade drops translations + junctions
//   7. saveIndustry revalidates "Used in" for old ∪ new linkedProductIds union

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { seedProduct } from '../_fixtures/seed-products';
import { seedIndustry, seedProductIndustries } from '../fixtures/seed-content';
import { SAMPLE_INDUSTRY_DOC } from '../fixtures/tiptap-sample';

// -- Mocks (must be hoisted by Vitest before the @/actions import) ------------

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(async () => ({
    user: { email: 'test-admin@manometr.uz' },
    sessionToken: 'stub-token',
  })),
}));

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Map<string, string>()),
}));

const { revalidateTag } = vi.hoisted(() => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/cache', () => ({
  revalidateTag,
}));

import {
  saveIndustry,
  publishIndustry,
  unpublishIndustry,
  deleteIndustry,
} from '@/actions/industries';
import type { IndustryInput } from '@/lib/zod/industry';

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Build a baseline saveIndustry input. Each test uses a unique slug-suffix to
 * avoid the (locale, slug) unique index collision across parallel runs.
 */
function buildInput(overrides: {
  id?: string;
  status?: 'draft' | 'published';
  slugPrefix?: string;
  linkedProductIds?: Array<{ productId: string; position: number }>;
}): IndustryInput {
  const slugPrefix =
    overrides.slugPrefix ??
    `ind-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    ...(overrides.id ? { id: overrides.id } : {}),
    status: overrides.status ?? 'draft',
    publishedAt: null,
    featuredImagePublicId: null,
    translations: {
      uz: {
        title: `${slugPrefix} uz title`,
        slug: `${slugPrefix}-uz`,
        excerpt: null,
        body: SAMPLE_INDUSTRY_DOC,
      },
      ru: {
        title: `${slugPrefix} ru title`,
        slug: `${slugPrefix}-ru`,
        excerpt: null,
        body: SAMPLE_INDUSTRY_DOC,
      },
      en: {
        title: `${slugPrefix} en title`,
        slug: `${slugPrefix}-en`,
        excerpt: null,
        body: SAMPLE_INDUSTRY_DOC,
      },
    },
    linkedProductIds: overrides.linkedProductIds ?? [],
  };
}

describe('industries actions (live Neon)', () => {
  const cleanups: Array<() => Promise<void>> = [];

  beforeEach(() => {
    revalidateTag.mockClear();
  });

  afterEach(async () => {
    for (let i = cleanups.length - 1; i >= 0; i--) {
      await cleanups[i]!();
    }
    cleanups.length = 0;
  });

  /** Cleanup helper for an industry id — drops audit_log + junctions + translations + industry. */
  function pushIndustryCleanup(id: string) {
    cleanups.push(async () => {
      const db = await getTestDb();
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(
        sql`DELETE FROM product_industries WHERE industry_id = ${id}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM industry_translations WHERE industry_id = ${id}::uuid`,
      );
      await db.execute(sql`DELETE FROM industry WHERE id = ${id}::uuid`);
    });
  }

  // ── Spec 1 — create + 0 linked products + audit ──────────────────────────
  it(
    'create — saveIndustry writes industry + 3 translations + 0 linked products + audit(action=create)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const result = await saveIndustry(
        buildInput({ slugPrefix: `i1-${stamp}` }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('unreachable');
      const id = result.data.id;
      pushIndustryCleanup(id);

      // 1 industry row
      const industryRows = await db.execute(
        sql`SELECT id, status, published_at FROM industry WHERE id = ${id}::uuid`,
      );
      expect(industryRows.rows.length).toBe(1);
      expect((industryRows.rows[0] as { status: string }).status).toBe('draft');

      // 3 translation rows (uz, ru, en).
      const trRows = await db.execute(
        sql`SELECT locale FROM industry_translations WHERE industry_id = ${id}::uuid`,
      );
      expect(trRows.rows.length).toBe(3);
      const locales = (trRows.rows as Array<{ locale: string }>)
        .map((r) => r.locale)
        .sort();
      expect(locales).toEqual(['en', 'ru', 'uz']);

      // 0 product_industries junction rows.
      const junctionRows = await db.execute(
        sql`SELECT product_id FROM product_industries WHERE industry_id = ${id}::uuid`,
      );
      expect(junctionRows.rows.length).toBe(0);

      // Audit row, action='create', entity_type='industry', before_json IS NULL.
      const auditRows = await db.execute(sql`
        SELECT action, entity_type, entity_id, actor_email, before_json
          FROM audit_log
         WHERE entity_id = ${id}
         ORDER BY at DESC LIMIT 1
      `);
      expect(auditRows.rows[0]).toMatchObject({
        action: 'create',
        entity_type: 'industry',
        entity_id: id,
        actor_email: 'test-admin@manometr.uz',
        before_json: null,
      });

      // revalidateIndustry(id) fan-out: industry:<id>, industries:list:<l>, sitemap.
      const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain(`industry:${id}`);
      expect(calls).toContain('industries:list:uz');
      expect(calls).toContain('industries:list:ru');
      expect(calls).toContain('industries:list:en');
      expect(calls).toContain('sitemap');
    },
    25_000,
  );

  // ── Spec 2 — replace-on-save for linkedProductIds ────────────────────────
  it(
    'update — saveIndustry replace-on-save for linkedProductIds (DELETE old + INSERT new, position set)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      // Seed 3 products.
      const sp1 = await seedProduct({ name: `i2a-${stamp}`, locales: { uz: true } });
      const sp2 = await seedProduct({ name: `i2b-${stamp}`, locales: { uz: true } });
      const sp3 = await seedProduct({ name: `i2c-${stamp}`, locales: { uz: true } });
      cleanups.push(async () => {
        await sp1.cleanup();
        await sp2.cleanup();
        await sp3.cleanup();
      });

      // First save — industry + linkedProductIds = [A, B] @ positions 0, 1.
      const first = await saveIndustry(
        buildInput({
          slugPrefix: `i2-${stamp}`,
          linkedProductIds: [
            { productId: sp1.productId, position: 0 },
            { productId: sp2.productId, position: 1 },
          ],
        }),
      );
      expect(first.ok).toBe(true);
      if (!first.ok) throw new Error('unreachable');
      const id = first.data.id;
      pushIndustryCleanup(id);

      let junctionRows = await db.execute(
        sql`SELECT product_id, position FROM product_industries
              WHERE industry_id = ${id}::uuid ORDER BY position ASC`,
      );
      expect(junctionRows.rows.length).toBe(2);
      const firstSet = (junctionRows.rows as Array<{ product_id: string }>)
        .map((r) => r.product_id)
        .sort();
      expect(firstSet).toEqual([sp1.productId, sp2.productId].sort());

      // Second save — replace linkedProductIds with [B, C] @ positions 0, 1.
      const second = await saveIndustry(
        buildInput({
          id,
          slugPrefix: `i2-${stamp}`,
          linkedProductIds: [
            { productId: sp2.productId, position: 0 },
            { productId: sp3.productId, position: 1 },
          ],
        }),
      );
      expect(second.ok).toBe(true);

      junctionRows = await db.execute(
        sql`SELECT product_id, position FROM product_industries
              WHERE industry_id = ${id}::uuid ORDER BY position ASC`,
      );
      expect(junctionRows.rows.length).toBe(2);
      const secondSet = junctionRows.rows as Array<{ product_id: string; position: number }>;
      expect(secondSet[0]!.product_id).toBe(sp2.productId);
      expect(secondSet[0]!.position).toBe(0);
      expect(secondSet[1]!.product_id).toBe(sp3.productId);
      expect(secondSet[1]!.position).toBe(1);
    },
    30_000,
  );

  // ── Spec 3 — W7 refusal-to-elevate ───────────────────────────────────────
  it(
    'refusal-to-elevate — saveIndustry(status=published) on persisted draft throws USE_PUBLISH_ACTION (W7)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const industryId = randomUUID();
      const slugBase = `i3-${stamp}-${industryId.slice(0, 8)}`;
      await seedIndustry({
        id: industryId,
        status: 'draft',
        translations: {
          uz: {
            title: 'uz draft',
            slug: `${slugBase}-uz`,
            excerpt: null,
            body: SAMPLE_INDUSTRY_DOC,
          },
          ru: {
            title: 'ru draft',
            slug: `${slugBase}-ru`,
            excerpt: null,
            body: SAMPLE_INDUSTRY_DOC,
          },
          en: {
            title: 'en draft',
            slug: `${slugBase}-en`,
            excerpt: null,
            body: SAMPLE_INDUSTRY_DOC,
          },
        },
      });
      pushIndustryCleanup(industryId);

      // saveIndustry with status='published' on a persisted draft must refuse
      // and surface as { ok: false } via withAdminAction's catch.
      const result = await saveIndustry(
        buildInput({
          id: industryId,
          status: 'published',
          slugPrefix: slugBase,
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('unreachable');
      // withAdminAction maps non-Zod, non-Unauthorized errors to 'unknown'.
      expect(result.error).toBe('unknown');

      // Industry row UNCHANGED — status still 'draft'.
      const row = await db.execute(
        sql`SELECT status FROM industry WHERE id = ${industryId}::uuid`,
      );
      expect((row.rows[0] as { status: string }).status).toBe('draft');

      // No audit_log row written for this industry id.
      const auditRows = await db.execute(
        sql`SELECT id FROM audit_log WHERE entity_id = ${industryId}`,
      );
      expect(auditRows.rows.length).toBe(0);
    },
    25_000,
  );

  // ── Spec 4 — publishIndustry atomic dual-column write + audit ───────────
  it(
    'publishIndustry — atomic dual-column write (status=published + publishedAt=now()) + audit(action=publish)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const industryId = randomUUID();
      const slugBase = `i4-${stamp}-${industryId.slice(0, 8)}`;
      await seedIndustry({
        id: industryId,
        status: 'draft',
        publishedAt: null,
        translations: {
          uz: { title: 'uz', slug: `${slugBase}-uz`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
          ru: { title: 'ru', slug: `${slugBase}-ru`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
          en: { title: 'en', slug: `${slugBase}-en`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
        },
      });
      pushIndustryCleanup(industryId);

      const result = await publishIndustry({ id: industryId });
      expect(result.ok).toBe(true);

      const row = await db.execute(
        sql`SELECT status, published_at FROM industry WHERE id = ${industryId}::uuid`,
      );
      expect((row.rows[0] as { status: string }).status).toBe('published');
      expect(
        (row.rows[0] as { published_at: Date | string | null }).published_at,
      ).not.toBeNull();

      const auditRows = await db.execute(sql`
        SELECT action, entity_type, entity_id
          FROM audit_log
         WHERE entity_id = ${industryId} AND action = 'publish'
         ORDER BY at DESC LIMIT 1
      `);
      expect(auditRows.rows[0]).toMatchObject({
        action: 'publish',
        entity_type: 'industry',
        entity_id: industryId,
      });
    },
    25_000,
  );

  // ── Spec 5 — unpublishIndustry atomic dual-column write + audit ─────────
  it(
    'unpublishIndustry — atomic dual-column write (status=draft + publishedAt=null) + audit(action=unpublish)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const industryId = randomUUID();
      const slugBase = `i5-${stamp}-${industryId.slice(0, 8)}`;
      await seedIndustry({
        id: industryId,
        status: 'published',
        publishedAt: new Date(),
        translations: {
          uz: { title: 'uz', slug: `${slugBase}-uz`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
          ru: { title: 'ru', slug: `${slugBase}-ru`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
          en: { title: 'en', slug: `${slugBase}-en`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
        },
      });
      pushIndustryCleanup(industryId);

      const result = await unpublishIndustry({ id: industryId });
      expect(result.ok).toBe(true);

      const row = await db.execute(
        sql`SELECT status, published_at FROM industry WHERE id = ${industryId}::uuid`,
      );
      expect((row.rows[0] as { status: string }).status).toBe('draft');
      expect(
        (row.rows[0] as { published_at: Date | string | null }).published_at,
      ).toBeNull();

      const auditRows = await db.execute(sql`
        SELECT action, entity_type
          FROM audit_log
         WHERE entity_id = ${industryId} AND action = 'unpublish'
         ORDER BY at DESC LIMIT 1
      `);
      expect(auditRows.rows[0]).toMatchObject({
        action: 'unpublish',
        entity_type: 'industry',
      });
    },
    25_000,
  );

  // ── Spec 6 — deleteIndustry + cascade + audit-before ────────────────────
  it(
    'deleteIndustry — audit row written BEFORE delete; FK cascade drops translations + product_industries',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const sp1 = await seedProduct({ name: `i6a-${stamp}`, locales: { uz: true } });
      const sp2 = await seedProduct({ name: `i6b-${stamp}`, locales: { uz: true } });
      cleanups.push(async () => {
        await sp1.cleanup();
        await sp2.cleanup();
      });

      const industryId = randomUUID();
      const slugBase = `i6-${stamp}-${industryId.slice(0, 8)}`;
      await seedIndustry({
        id: industryId,
        status: 'published',
        publishedAt: new Date(),
        translations: {
          uz: { title: 'uz', slug: `${slugBase}-uz`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
          ru: { title: 'ru', slug: `${slugBase}-ru`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
          en: { title: 'en', slug: `${slugBase}-en`, excerpt: null, body: SAMPLE_INDUSTRY_DOC },
        },
      });
      await seedProductIndustries(sp1.productId, [industryId]);
      await seedProductIndustries(sp2.productId, [industryId]);
      cleanups.push(async () => {
        await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${industryId}`);
      });

      const result = await deleteIndustry({ id: industryId });
      expect(result.ok).toBe(true);

      const industryRows = await db.execute(
        sql`SELECT id FROM industry WHERE id = ${industryId}::uuid`,
      );
      expect(industryRows.rows.length).toBe(0);

      const trRows = await db.execute(
        sql`SELECT industry_id FROM industry_translations WHERE industry_id = ${industryId}::uuid`,
      );
      expect(trRows.rows.length).toBe(0);

      const junctionRows = await db.execute(
        sql`SELECT product_id FROM product_industries WHERE industry_id = ${industryId}::uuid`,
      );
      expect(junctionRows.rows.length).toBe(0);

      const auditRows = await db.execute(sql`
        SELECT action, before_json, after_json
          FROM audit_log
         WHERE entity_id = ${industryId} AND action = 'delete'
         ORDER BY at DESC LIMIT 1
      `);
      expect(auditRows.rows.length).toBe(1);
      const auditRow = auditRows.rows[0] as {
        action: string;
        before_json: Record<string, unknown> | null;
        after_json: Record<string, unknown> | null;
      };
      expect(auditRow.action).toBe('delete');
      expect(auditRow.before_json).not.toBeNull();
      expect(auditRow.before_json?.['status']).toBe('published');
      expect(auditRow.after_json).toBeNull();
    },
    30_000,
  );

  // ── Spec 7 — saveIndustry revalidate fan-out (OLD ∪ NEW) ────────────────
  it(
    'revalidate fan-out — saveIndustry revalidates Used-in for OLD ∪ NEW linkedProductIds (union)',
    async () => {
      requireTestDatabaseUrl();

      const sp1 = await seedProduct({ name: `i7a-${stamp}`, locales: { uz: true } });
      const sp2 = await seedProduct({ name: `i7b-${stamp}`, locales: { uz: true } });
      const sp3 = await seedProduct({ name: `i7c-${stamp}`, locales: { uz: true } });
      cleanups.push(async () => {
        await sp1.cleanup();
        await sp2.cleanup();
        await sp3.cleanup();
      });

      const first = await saveIndustry(
        buildInput({
          slugPrefix: `i7-${stamp}`,
          linkedProductIds: [
            { productId: sp1.productId, position: 0 },
            { productId: sp2.productId, position: 1 },
          ],
        }),
      );
      expect(first.ok).toBe(true);
      if (!first.ok) throw new Error('unreachable');
      const id = first.data.id;
      pushIndustryCleanup(id);

      revalidateTag.mockClear();

      const second = await saveIndustry(
        buildInput({
          id,
          slugPrefix: `i7-${stamp}`,
          linkedProductIds: [
            { productId: sp2.productId, position: 0 },
            { productId: sp3.productId, position: 1 },
          ],
        }),
      );
      expect(second.ok).toBe(true);

      const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain(`industry:${id}`);
      expect(calls).toContain('sitemap');
      expect(calls).toContain(`used-in:${sp1.productId}`);
      expect(calls).toContain(`used-in:${sp2.productId}`);
      expect(calls).toContain(`used-in:${sp3.productId}`);
      expect(calls).toContain(`product:${sp1.productId}`);
      expect(calls).toContain(`product:${sp2.productId}`);
      expect(calls).toContain(`product:${sp3.productId}`);
    },
    35_000,
  );
});
