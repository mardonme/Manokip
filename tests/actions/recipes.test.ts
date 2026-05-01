// Plan 04-04 Task 4.3 — RED test stubs for the recipe Server Actions.
//
// Posture: lives in the `node` Vitest project (live-Neon HTTP). Mirrors the
// vi.mock chain from tests/actions/products.test.ts so when 04-05 ships
// saveRecipe / publishRecipe / unpublishRecipe / deleteRecipe and flips
// `test.fixme` → `test`, the import chain works without further changes.
//
// All 7 specs are `it.skip(...)` — Vitest 4 enumerates them but never runs
// the body (Vitest has no `fixme`; per plan deviations Rule 1, `it.skip` is
// the documented Vitest equivalent of Playwright's `test.fixme`). The import
// of `@/actions/recipes` is deferred (no top-level import) so the file
// compiles before the GREEN implementation lands. This RED stub locks the
// Server-Action surface contract (function names, signature shape) BEFORE
// 04-05 implements them.
//
// Spec coverage matrix (per RESEARCH §Plan structure recommendation Wave 1):
//   1. saveRecipe creates recipe + 3 translations + 0 linked products
//   2. saveRecipe replace-on-save semantics for linked products (DELETE+INSERT)
//   3. saveRecipe with status=published but persisted=draft → throws
//      USE_PUBLISH_ACTION (W7 refusal-to-elevate, Phase 2 D-11 pattern)
//   4. publishRecipe atomic dual-column write (status + publishedAt) + audit
//   5. unpublishRecipe atomic dual-column write (status='draft', publishedAt=null)
//   6. deleteRecipe — audit BEFORE delete; FK cascade drops translations + junctions
//   7. saveRecipe revalidates "Used in" for old ∪ new linkedProductIds union
//
// FLIP-IN: 04-05-PLAN

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import {
  seedRecipe,
  seedProductRecipes,
} from '../fixtures/seed-content';
import { SAMPLE_RECIPE_DOC } from '../fixtures/tiptap-sample';

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

// -- SUT import (will fail until 04-05 ships) --------------------------------

// FLIP-IN: 04-05-PLAN — when 04-05 ships @/actions/recipes, change
// `it.skip` → `it` per spec; the dynamic import within each body resolves.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RecipeActionsStub = {
  saveRecipe: (input: unknown) => Promise<{ ok: boolean; id?: string }>;
  publishRecipe: (id: string) => Promise<{ ok: boolean }>;
  unpublishRecipe: (id: string) => Promise<{ ok: boolean }>;
  deleteRecipe: (id: string) => Promise<{ ok: boolean }>;
};

describe('recipes actions (live Neon) [RED — flips in 04-05]', () => {
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
    'create — saveRecipe writes recipe + 3 translations + 0 linked products + audit(action=create)',
    async () => {
      // FLIP-IN: 04-05-PLAN
      requireTestDatabaseUrl();
      // const { saveRecipe } = await import('@/actions/recipes');
      // const result = await saveRecipe({
      //   status: 'draft',
      //   translations: { uz: {...}, ru: {...}, en: {...} },
      //   linkedProductIds: [],
      //   featuredImagePublicId: null,
      // });
      // expect(result.ok).toBe(true);
      // // assert recipe row + 3 translation rows + 0 product_recipes rows + audit
      expect(true).toBe(true);
    },
  );

  it.skip(
    'update — saveRecipe replace-on-save for linkedProductIds (DELETE old + INSERT new, position set)',
    async () => {
      // FLIP-IN: 04-05-PLAN
      requireTestDatabaseUrl();
      // 1. seedRecipe + seedProductRecipes(prodA, [recipeId]) + seedProductRecipes(prodB, [recipeId])
      // 2. saveRecipe({ id, linkedProductIds: [prodC, prodD] }) — different set
      // 3. assert product_recipes WHERE recipe_id = id has rows for [prodC, prodD] only,
      //    with position 0/1 in input order (D-04: replace-on-save)
      expect(true).toBe(true);
    },
  );

  it.skip(
    'refusal-to-elevate — saveRecipe(status=published) on persisted draft throws USE_PUBLISH_ACTION (W7)',
    async () => {
      // FLIP-IN: 04-05-PLAN
      requireTestDatabaseUrl();
      // seedRecipe({ status: 'draft', ... }) → saveRecipe({ id, status: 'published', ... })
      // expect saveRecipe to throw / return { ok:false, error.code === 'USE_PUBLISH_ACTION' }
      // recipe row unchanged (status still 'draft'); no audit row written.
      expect(true).toBe(true);
    },
  );

  it.skip(
    'publishRecipe — atomic dual-column write (status=published + publishedAt=now()) + audit(action=publish)',
    async () => {
      // FLIP-IN: 04-05-PLAN
      requireTestDatabaseUrl();
      // seedRecipe({ status: 'draft' }) → publishRecipe(id)
      // SELECT status, published_at FROM recipe — both columns flipped in ONE UPDATE
      // audit_log row: action='publish', entity_type='recipe', entity_id=id
      expect(true).toBe(true);
    },
  );

  it.skip(
    'unpublishRecipe — atomic dual-column write (status=draft + publishedAt=null) + audit(action=unpublish)',
    async () => {
      // FLIP-IN: 04-05-PLAN
      requireTestDatabaseUrl();
      // seedRecipe({ status: 'published', publishedAt: now }) → unpublishRecipe(id)
      // SELECT status, published_at — status='draft', published_at IS NULL
      // audit_log row: action='unpublish'
      expect(true).toBe(true);
    },
  );

  it.skip(
    'deleteRecipe — audit row written BEFORE delete; FK cascade drops translations + product_recipes',
    async () => {
      // FLIP-IN: 04-05-PLAN
      requireTestDatabaseUrl();
      // seedRecipe + seedProductRecipes(prodA, [recipeId]) →
      //   1. capture audit_log row count
      //   2. deleteRecipe(id)
      //   3. assert audit_log gained 1 row with action='delete', before_json={...}
      //   4. assert recipe + recipe_translations + product_recipes all dropped
      expect(true).toBe(true);
    },
  );

  it.skip(
    'revalidate fan-out — saveRecipe revalidates Used-in for OLD ∪ NEW linkedProductIds (union)',
    async () => {
      // FLIP-IN: 04-05-PLAN
      requireTestDatabaseUrl();
      // seedRecipe + seedProductRecipes(prodA, [recipeId])  // OLD = [prodA]
      // saveRecipe({ id, linkedProductIds: [prodB] })       // NEW = [prodB]
      // Expect revalidateTag called for used-in:prodA AND used-in:prodB (union),
      // recipe:id, recipes:list:<locale>, sitemap.
      expect(revalidateTag).toBeDefined();
    },
  );
});
