// Plan 04-04 Task 4.3 — RED test stubs for the industry Server Actions.
//
// Mirror of tests/actions/recipes.test.ts (same posture, same 7-spec grid,
// swapped entity). Lives in the `node` Vitest project. Specs are it.fixme so
// Vitest enumerates but does not run them; flips to live in 04-06 when
// @/actions/industries ships.
//
// FLIP-IN: 04-06-PLAN

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import {
  seedIndustry,
  seedProductIndustries,
} from '../fixtures/seed-content';
import { SAMPLE_INDUSTRY_DOC } from '../fixtures/tiptap-sample';

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

// FLIP-IN: 04-06-PLAN — when 04-06 ships @/actions/industries, change
// `it.skip` → `it` per spec; the dynamic import within each body resolves.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type IndustryActionsStub = {
  saveIndustry: (input: unknown) => Promise<{ ok: boolean; id?: string }>;
  publishIndustry: (id: string) => Promise<{ ok: boolean }>;
  unpublishIndustry: (id: string) => Promise<{ ok: boolean }>;
  deleteIndustry: (id: string) => Promise<{ ok: boolean }>;
};

describe('industries actions (live Neon) [RED — flips in 04-06]', () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  it.skip(
    'create — saveIndustry writes industry + 3 translations + 0 linked products + audit(action=create)',
    async () => {
      // FLIP-IN: 04-06-PLAN
      requireTestDatabaseUrl();
      // const { saveIndustry } = await import('@/actions/industries');
      // const result = await saveIndustry({ status:'draft', translations:{...}, linkedProductIds: [], featuredImagePublicId: null });
      // expect(result.ok).toBe(true) + assert industry row + 3 translations + 0 junctions + audit
      expect(true).toBe(true);
    },
  );

  it.skip(
    'update — saveIndustry replace-on-save for linkedProductIds (DELETE old + INSERT new, position set)',
    async () => {
      // FLIP-IN: 04-06-PLAN
      requireTestDatabaseUrl();
      // seedIndustry + seedProductIndustries(prodA, [industryId]) →
      //   saveIndustry({ id, linkedProductIds: [prodC, prodD] }) →
      //   assert product_industries rows for prodC, prodD only, position 0/1
      expect(true).toBe(true);
    },
  );

  it.skip(
    'refusal-to-elevate — saveIndustry(status=published) on persisted draft throws USE_PUBLISH_ACTION (W7)',
    async () => {
      // FLIP-IN: 04-06-PLAN
      requireTestDatabaseUrl();
      // seedIndustry({ status: 'draft' }) → saveIndustry({ id, status: 'published' })
      // expect throw / { ok:false, error.code === 'USE_PUBLISH_ACTION' }; row unchanged
      expect(true).toBe(true);
    },
  );

  it.skip(
    'publishIndustry — atomic dual-column write (status=published + publishedAt=now()) + audit(action=publish)',
    async () => {
      // FLIP-IN: 04-06-PLAN
      requireTestDatabaseUrl();
      // seedIndustry({ status: 'draft' }) → publishIndustry(id)
      // SELECT status, published_at — both flipped in ONE UPDATE
      // audit_log row: action='publish', entity_type='industry'
      expect(true).toBe(true);
    },
  );

  it.skip(
    'unpublishIndustry — atomic dual-column write (status=draft + publishedAt=null) + audit(action=unpublish)',
    async () => {
      // FLIP-IN: 04-06-PLAN
      requireTestDatabaseUrl();
      // seedIndustry({ status: 'published' }) → unpublishIndustry(id)
      // SELECT — status='draft', published_at IS NULL; audit row action='unpublish'
      expect(true).toBe(true);
    },
  );

  it.skip(
    'deleteIndustry — audit row written BEFORE delete; FK cascade drops translations + product_industries',
    async () => {
      // FLIP-IN: 04-06-PLAN
      requireTestDatabaseUrl();
      // seedIndustry + seedProductIndustries(prodA, [industryId]) →
      //   capture audit_log count → deleteIndustry(id) → assert
      //   audit_log+1 row(action='delete', before_json) AND industry/translations/junctions all dropped
      expect(true).toBe(true);
    },
  );

  it.skip(
    'revalidate fan-out — saveIndustry revalidates Used-in for OLD ∪ NEW linkedProductIds (union)',
    async () => {
      // FLIP-IN: 04-06-PLAN
      requireTestDatabaseUrl();
      // seedIndustry + seedProductIndustries(prodA, [industryId])
      // saveIndustry({ id, linkedProductIds: [prodB] })
      // Expect revalidateTag called for used-in:prodA AND used-in:prodB (union),
      // industry:id, industries:list:<locale>, sitemap.
      expect(revalidateTag).toBeDefined();
    },
  );
});
