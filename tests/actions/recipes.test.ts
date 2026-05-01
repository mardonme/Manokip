// Plan 04-05 Tasks 5.1 + 5.2 — GREEN live-Neon specs for the recipe Server
// Action layer. Flips the 7 RED stubs from plan 04-04 by removing `it.skip`
// and providing live-Neon SUT bodies.
//
// Posture: lives in the `node` Vitest project (live-Neon HTTP). vi.mock chain
// mirrors tests/actions/products.test.ts so the @/actions/recipes import
// works through the next-auth import chain unimpeded.
//
// Spec coverage matrix (per RESEARCH §Plan structure recommendation Wave 1):
//   1. saveRecipe creates recipe + 3 translations + 0 linked products + audit
//   2. saveRecipe replace-on-save semantics for linked products (DELETE+INSERT)
//   3. saveRecipe with status=published but persisted=draft → throws
//      USE_PUBLISH_ACTION (W7 refusal-to-elevate, Phase 2 D-11 pattern)
//   4. publishRecipe atomic dual-column write (status + publishedAt) + audit
//   5. unpublishRecipe atomic dual-column write (status='draft', publishedAt=null)
//   6. deleteRecipe — audit BEFORE delete; FK cascade drops translations + junctions
//   7. saveRecipe revalidates "Used in" for old ∪ new linkedProductIds union

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import { seedProduct } from '../_fixtures/seed-products';
import { seedRecipe, seedProductRecipes } from '../fixtures/seed-content';
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

import {
  saveRecipe,
  publishRecipe,
  unpublishRecipe,
  deleteRecipe,
} from '@/actions/recipes';
import type { RecipeInput } from '@/lib/zod/recipe';

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Build a baseline saveRecipe input. Each test uses a unique slug-suffix to
 * avoid the (locale, slug) unique index collision across parallel runs.
 */
function buildInput(overrides: {
  id?: string;
  status?: 'draft' | 'published';
  slugPrefix?: string;
  linkedProductIds?: Array<{ productId: string; position: number }>;
}): RecipeInput {
  const slugPrefix = overrides.slugPrefix ?? `rec-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
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
        body: SAMPLE_RECIPE_DOC,
      },
      ru: {
        title: `${slugPrefix} ru title`,
        slug: `${slugPrefix}-ru`,
        excerpt: null,
        body: SAMPLE_RECIPE_DOC,
      },
      en: {
        title: `${slugPrefix} en title`,
        slug: `${slugPrefix}-en`,
        excerpt: null,
        body: SAMPLE_RECIPE_DOC,
      },
    },
    linkedProductIds: overrides.linkedProductIds ?? [],
  };
}

describe('recipes actions (live Neon)', () => {
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

  /** Cleanup helper for a recipe id — drops audit_log + junctions + translations + recipe. */
  function pushRecipeCleanup(id: string) {
    cleanups.push(async () => {
      const db = await getTestDb();
      await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${id}`);
      await db.execute(
        sql`DELETE FROM product_recipes WHERE recipe_id = ${id}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM recipe_translations WHERE recipe_id = ${id}::uuid`,
      );
      await db.execute(sql`DELETE FROM recipe WHERE id = ${id}::uuid`);
    });
  }

  // ── Spec 1 — create + 0 linked products + audit ──────────────────────────
  it(
    'create — saveRecipe writes recipe + 3 translations + 0 linked products + audit(action=create)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const result = await saveRecipe(
        buildInput({ slugPrefix: `s1-${stamp}` }),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('unreachable');
      const id = result.data.id;
      pushRecipeCleanup(id);

      // 1 recipe row
      const recipeRows = await db.execute(
        sql`SELECT id, status, published_at FROM recipe WHERE id = ${id}::uuid`,
      );
      expect(recipeRows.rows.length).toBe(1);
      expect((recipeRows.rows[0] as { status: string }).status).toBe('draft');

      // 3 translation rows (uz, ru, en).
      const trRows = await db.execute(
        sql`SELECT locale FROM recipe_translations WHERE recipe_id = ${id}::uuid`,
      );
      expect(trRows.rows.length).toBe(3);
      const locales = (trRows.rows as Array<{ locale: string }>)
        .map((r) => r.locale)
        .sort();
      expect(locales).toEqual(['en', 'ru', 'uz']);

      // 0 product_recipes junction rows.
      const junctionRows = await db.execute(
        sql`SELECT product_id FROM product_recipes WHERE recipe_id = ${id}::uuid`,
      );
      expect(junctionRows.rows.length).toBe(0);

      // Audit row, action='create', entity_type='recipe', before_json IS NULL.
      const auditRows = await db.execute(sql`
        SELECT action, entity_type, entity_id, actor_email, before_json
          FROM audit_log
         WHERE entity_id = ${id}
         ORDER BY at DESC LIMIT 1
      `);
      expect(auditRows.rows[0]).toMatchObject({
        action: 'create',
        entity_type: 'recipe',
        entity_id: id,
        actor_email: 'test-admin@manometr.uz',
        before_json: null,
      });

      // revalidateRecipe(id) fan-out: recipe:<id>, recipes:list:<l> per locale, sitemap.
      const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain(`recipe:${id}`);
      expect(calls).toContain('recipes:list:uz');
      expect(calls).toContain('recipes:list:ru');
      expect(calls).toContain('recipes:list:en');
      expect(calls).toContain('sitemap');
    },
    25_000,
  );

  // ── Spec 2 — replace-on-save for linkedProductIds ────────────────────────
  it(
    'update — saveRecipe replace-on-save for linkedProductIds (DELETE old + INSERT new, position set)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      // Seed 4 products via seedProduct (one each — separate categories)
      // so we can swap the linked set independently.
      const sp1 = await seedProduct({ name: `s2a-${stamp}`, locales: { uz: true } });
      const sp2 = await seedProduct({ name: `s2b-${stamp}`, locales: { uz: true } });
      const sp3 = await seedProduct({ name: `s2c-${stamp}`, locales: { uz: true } });
      cleanups.push(async () => {
        await sp1.cleanup();
        await sp2.cleanup();
        await sp3.cleanup();
      });

      // First save — recipe + linkedProductIds = [A, B] @ positions 0, 1.
      const first = await saveRecipe(
        buildInput({
          slugPrefix: `s2-${stamp}`,
          linkedProductIds: [
            { productId: sp1.productId, position: 0 },
            { productId: sp2.productId, position: 1 },
          ],
        }),
      );
      expect(first.ok).toBe(true);
      if (!first.ok) throw new Error('unreachable');
      const id = first.data.id;
      pushRecipeCleanup(id);

      let junctionRows = await db.execute(
        sql`SELECT product_id, position FROM product_recipes
              WHERE recipe_id = ${id}::uuid ORDER BY position ASC`,
      );
      expect(junctionRows.rows.length).toBe(2);
      const firstSet = (junctionRows.rows as Array<{ product_id: string }>)
        .map((r) => r.product_id)
        .sort();
      expect(firstSet).toEqual([sp1.productId, sp2.productId].sort());

      // Second save — replace linkedProductIds with [B, C] @ positions 0, 1.
      // A is removed; B is preserved (position re-applied verbatim from input);
      // C is added.
      const second = await saveRecipe(
        buildInput({
          id,
          slugPrefix: `s2-${stamp}`, // same slugs to match the row we already wrote
          linkedProductIds: [
            { productId: sp2.productId, position: 0 },
            { productId: sp3.productId, position: 1 },
          ],
        }),
      );
      expect(second.ok).toBe(true);

      junctionRows = await db.execute(
        sql`SELECT product_id, position FROM product_recipes
              WHERE recipe_id = ${id}::uuid ORDER BY position ASC`,
      );
      expect(junctionRows.rows.length).toBe(2);
      const secondSet = (junctionRows.rows as Array<{ product_id: string; position: number }>);
      expect(secondSet[0]!.product_id).toBe(sp2.productId);
      expect(secondSet[0]!.position).toBe(0);
      expect(secondSet[1]!.product_id).toBe(sp3.productId);
      expect(secondSet[1]!.position).toBe(1);
    },
    30_000,
  );

  // ── Spec 3 — W7 refusal-to-elevate ───────────────────────────────────────
  it(
    'refusal-to-elevate — saveRecipe(status=published) on persisted draft throws USE_PUBLISH_ACTION (W7)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      // Seed a draft recipe directly via the fixture helper (bypass saveRecipe
      // so we can prove the W7 guard fires on persisted draft, not on freshly
      // saved row).
      const recipeId = randomUUID();
      const slugBase = `s3-${stamp}-${recipeId.slice(0, 8)}`;
      await seedRecipe({
        id: recipeId,
        status: 'draft',
        translations: {
          uz: {
            title: 'uz draft',
            slug: `${slugBase}-uz`,
            excerpt: null,
            body: SAMPLE_RECIPE_DOC,
          },
          ru: {
            title: 'ru draft',
            slug: `${slugBase}-ru`,
            excerpt: null,
            body: SAMPLE_RECIPE_DOC,
          },
          en: {
            title: 'en draft',
            slug: `${slugBase}-en`,
            excerpt: null,
            body: SAMPLE_RECIPE_DOC,
          },
        },
      });
      pushRecipeCleanup(recipeId);

      // saveRecipe with status='published' on a persisted draft must refuse
      // and surface as { ok: false } via withAdminAction's catch.
      const result = await saveRecipe(
        buildInput({
          id: recipeId,
          status: 'published',
          slugPrefix: slugBase,
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('unreachable');
      // withAdminAction maps non-Zod, non-Unauthorized errors to 'unknown'.
      expect(result.error).toBe('unknown');

      // Recipe row UNCHANGED — status still 'draft'.
      const row = await db.execute(
        sql`SELECT status FROM recipe WHERE id = ${recipeId}::uuid`,
      );
      expect((row.rows[0] as { status: string }).status).toBe('draft');

      // No audit_log row written for this recipe id.
      const auditRows = await db.execute(
        sql`SELECT id FROM audit_log WHERE entity_id = ${recipeId}`,
      );
      expect(auditRows.rows.length).toBe(0);
    },
    25_000,
  );

  // ── Spec 4 — publishRecipe atomic dual-column write + audit ─────────────
  it(
    'publishRecipe — atomic dual-column write (status=published + publishedAt=now()) + audit(action=publish)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const recipeId = randomUUID();
      const slugBase = `s4-${stamp}-${recipeId.slice(0, 8)}`;
      await seedRecipe({
        id: recipeId,
        status: 'draft',
        publishedAt: null,
        translations: {
          uz: { title: 'uz', slug: `${slugBase}-uz`, excerpt: null, body: SAMPLE_RECIPE_DOC },
          ru: { title: 'ru', slug: `${slugBase}-ru`, excerpt: null, body: SAMPLE_RECIPE_DOC },
          en: { title: 'en', slug: `${slugBase}-en`, excerpt: null, body: SAMPLE_RECIPE_DOC },
        },
      });
      pushRecipeCleanup(recipeId);

      const result = await publishRecipe({ id: recipeId });
      expect(result.ok).toBe(true);

      // Both columns flipped (status=published AND publishedAt IS NOT NULL).
      const row = await db.execute(
        sql`SELECT status, published_at FROM recipe WHERE id = ${recipeId}::uuid`,
      );
      expect((row.rows[0] as { status: string }).status).toBe('published');
      expect((row.rows[0] as { published_at: Date | string | null }).published_at).not.toBeNull();

      // Audit row action='publish' entity_type='recipe'.
      const auditRows = await db.execute(sql`
        SELECT action, entity_type, entity_id
          FROM audit_log
         WHERE entity_id = ${recipeId} AND action = 'publish'
         ORDER BY at DESC LIMIT 1
      `);
      expect(auditRows.rows[0]).toMatchObject({
        action: 'publish',
        entity_type: 'recipe',
        entity_id: recipeId,
      });
    },
    25_000,
  );

  // ── Spec 5 — unpublishRecipe atomic dual-column write + audit ───────────
  it(
    'unpublishRecipe — atomic dual-column write (status=draft + publishedAt=null) + audit(action=unpublish)',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      const recipeId = randomUUID();
      const slugBase = `s5-${stamp}-${recipeId.slice(0, 8)}`;
      await seedRecipe({
        id: recipeId,
        status: 'published',
        publishedAt: new Date(),
        translations: {
          uz: { title: 'uz', slug: `${slugBase}-uz`, excerpt: null, body: SAMPLE_RECIPE_DOC },
          ru: { title: 'ru', slug: `${slugBase}-ru`, excerpt: null, body: SAMPLE_RECIPE_DOC },
          en: { title: 'en', slug: `${slugBase}-en`, excerpt: null, body: SAMPLE_RECIPE_DOC },
        },
      });
      pushRecipeCleanup(recipeId);

      const result = await unpublishRecipe({ id: recipeId });
      expect(result.ok).toBe(true);

      // Both columns flipped (status=draft AND publishedAt IS NULL).
      const row = await db.execute(
        sql`SELECT status, published_at FROM recipe WHERE id = ${recipeId}::uuid`,
      );
      expect((row.rows[0] as { status: string }).status).toBe('draft');
      expect((row.rows[0] as { published_at: Date | string | null }).published_at).toBeNull();

      // Audit row action='unpublish' entity_type='recipe'.
      const auditRows = await db.execute(sql`
        SELECT action, entity_type
          FROM audit_log
         WHERE entity_id = ${recipeId} AND action = 'unpublish'
         ORDER BY at DESC LIMIT 1
      `);
      expect(auditRows.rows[0]).toMatchObject({
        action: 'unpublish',
        entity_type: 'recipe',
      });
    },
    25_000,
  );

  // ── Spec 6 — deleteRecipe + cascade + audit-before ──────────────────────
  it(
    'deleteRecipe — audit row written BEFORE delete; FK cascade drops translations + product_recipes',
    async () => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      // Seed 1 recipe (published) + 3 translations + 2 junction rows
      // (linked to 2 separate products).
      const sp1 = await seedProduct({ name: `s6a-${stamp}`, locales: { uz: true } });
      const sp2 = await seedProduct({ name: `s6b-${stamp}`, locales: { uz: true } });
      cleanups.push(async () => {
        await sp1.cleanup();
        await sp2.cleanup();
      });

      const recipeId = randomUUID();
      const slugBase = `s6-${stamp}-${recipeId.slice(0, 8)}`;
      await seedRecipe({
        id: recipeId,
        status: 'published',
        publishedAt: new Date(),
        translations: {
          uz: { title: 'uz', slug: `${slugBase}-uz`, excerpt: null, body: SAMPLE_RECIPE_DOC },
          ru: { title: 'ru', slug: `${slugBase}-ru`, excerpt: null, body: SAMPLE_RECIPE_DOC },
          en: { title: 'en', slug: `${slugBase}-en`, excerpt: null, body: SAMPLE_RECIPE_DOC },
        },
      });
      await seedProductRecipes(sp1.productId, [recipeId]);
      await seedProductRecipes(sp2.productId, [recipeId]);
      // Final audit_log cleanup (recipe rows are gone after deleteRecipe).
      cleanups.push(async () => {
        await db.execute(sql`DELETE FROM audit_log WHERE entity_id = ${recipeId}`);
      });

      const result = await deleteRecipe({ id: recipeId });
      expect(result.ok).toBe(true);

      // Recipe row gone.
      const recipeRows = await db.execute(
        sql`SELECT id FROM recipe WHERE id = ${recipeId}::uuid`,
      );
      expect(recipeRows.rows.length).toBe(0);

      // recipe_translations gone (FK cascade).
      const trRows = await db.execute(
        sql`SELECT recipe_id FROM recipe_translations WHERE recipe_id = ${recipeId}::uuid`,
      );
      expect(trRows.rows.length).toBe(0);

      // product_recipes gone (FK cascade).
      const junctionRows = await db.execute(
        sql`SELECT product_id FROM product_recipes WHERE recipe_id = ${recipeId}::uuid`,
      );
      expect(junctionRows.rows.length).toBe(0);

      // audit_log row: action='delete', before_json populated, after_json NULL.
      const auditRows = await db.execute(sql`
        SELECT action, before_json, after_json
          FROM audit_log
         WHERE entity_id = ${recipeId} AND action = 'delete'
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

  // ── Spec 7 — saveRecipe revalidate fan-out (OLD ∪ NEW) ──────────────────
  it(
    'revalidate fan-out — saveRecipe revalidates Used-in for OLD ∪ NEW linkedProductIds (union)',
    async () => {
      requireTestDatabaseUrl();

      const sp1 = await seedProduct({ name: `s7a-${stamp}`, locales: { uz: true } });
      const sp2 = await seedProduct({ name: `s7b-${stamp}`, locales: { uz: true } });
      const sp3 = await seedProduct({ name: `s7c-${stamp}`, locales: { uz: true } });
      cleanups.push(async () => {
        await sp1.cleanup();
        await sp2.cleanup();
        await sp3.cleanup();
      });

      // First save — linkedProductIds = [A, B]. Captures OLD = [A, B] when
      // the second save reads pre-tx.
      const first = await saveRecipe(
        buildInput({
          slugPrefix: `s7-${stamp}`,
          linkedProductIds: [
            { productId: sp1.productId, position: 0 },
            { productId: sp2.productId, position: 1 },
          ],
        }),
      );
      expect(first.ok).toBe(true);
      if (!first.ok) throw new Error('unreachable');
      const id = first.data.id;
      pushRecipeCleanup(id);

      // Reset spy so we observe ONLY the second save's fan-out (the union).
      revalidateTag.mockClear();

      // Second save — linkedProductIds = [B, C]. NEW = [B, C]. Union with OLD
      // = {A, B, C}. revalidateUsedIn fires used-in:<pid> + product:<pid> for
      // each pid in the union.
      const second = await saveRecipe(
        buildInput({
          id,
          slugPrefix: `s7-${stamp}`,
          linkedProductIds: [
            { productId: sp2.productId, position: 0 },
            { productId: sp3.productId, position: 1 },
          ],
        }),
      );
      expect(second.ok).toBe(true);

      const calls = revalidateTag.mock.calls.map((c) => c[0] as string);
      // Recipe-side tags fired for the recipe itself.
      expect(calls).toContain(`recipe:${id}`);
      expect(calls).toContain('sitemap');
      // Used-in fan-out covers all 3 products in the union (OLD A + NEW C +
      // unchanged B). revalidateUsedIn emits both used-in:<pid> and
      // product:<pid> per pid.
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
