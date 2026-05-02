// Plan 04-12 Task 12.1 — Phase-4 closure: flipped from test.fixme → live.
//
// 2 specs:
//   1. visitor reads /uz/recipes/<seed-slug> → 200 + uz title + prose body +
//      JSON-LD TechArticle with parseable shape
//   2. locale fallback banner shows when requested locale's translation body
//      is missing — seeds a recipe with only the uz translation populated
//      (ru/en translations have null body), navigates to /ru/recipes/<slug>,
//      asserts [data-testid=locale-fallback-banner] is visible and the page
//      still renders the uz body content.
//
// Seeding posture: live-Neon DB-direct via getTestDb() + seedPhase4Content()
// (Phase 3 plan 03-01 / Phase 4 plan 04-04 fixture orchestrator). Cleanup in
// finally{} via teardownPhase4Content + teardownPublicFixture.
//
// Local-fallback skip: when BASE_URL is the local dev server AND CI is not
// set, the spec self-skips with a documented reason (Phase 2 plan 02-17
// pattern). The spec is the merge gate against a Vercel preview URL.
//
// FLIP-IN: 04-12-PLAN

import { test, expect } from '@playwright/test';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import {
  seedPublicFixture,
  teardownPublicFixture,
  type PublicFixtureIds,
} from '../fixtures/seed-public';
import {
  seedPhase4Content,
  teardownPhase4Content,
  seedRecipe,
} from '../fixtures/seed-content';
import { SAMPLE_RECIPE_DOC } from '../fixtures/tiptap-sample';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

// Tests share a Neon test branch + seed fixture lifecycle.
test.describe.configure({ mode: 'serial' });

test.describe('Recipe detail page (CONT-03 + CONT-06; live Neon)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Phase-4 detail e2e expects a Vercel preview URL with seed content visible to the public RSC; local-fallback skip',
  );

  let publicIds: PublicFixtureIds | undefined;
  // Deterministic id for the only-uz recipe used by spec 2 (separate from the
  // orchestrator's seeded recipes so we can teardown independently).
  const ONLY_UZ_RECIPE_ID = '00000000-0000-4000-8000-000000000fbe';
  const ONLY_UZ_SLUG_PREFIX = 'phase4-only-uz';

  test.beforeAll(async () => {
    test.setTimeout(60_000);
    requireTestDatabaseUrl();
    publicIds = await seedPublicFixture();
    await seedPhase4Content({ products: publicIds.productIds });

    // Spec 2 fixture: a recipe with uz body filled, ru/en bodies null. The
    // public RSC's getRecipeBySlug + locale-fallback resolver will render the
    // uz translation when requested locale's body is empty (Phase 4 D-07).
    const db = await getTestDb();
    // Defensive cleanup so re-runs don't conflict.
    await db.execute(
      sql`DELETE FROM recipe_translations WHERE recipe_id = ${ONLY_UZ_RECIPE_ID}::uuid`,
    );
    await db.execute(
      sql`DELETE FROM recipe WHERE id = ${ONLY_UZ_RECIPE_ID}::uuid`,
    );
    await seedRecipe({
      id: ONLY_UZ_RECIPE_ID,
      status: 'published',
      featuredImagePublicId: null,
      translations: {
        uz: {
          title: 'uz_Locale fallback probe',
          slug: `${ONLY_UZ_SLUG_PREFIX}-uz`,
          excerpt: 'uz_Probe excerpt for locale-fallback assertion.',
          body: SAMPLE_RECIPE_DOC,
        },
        ru: {
          title: 'ru_Locale fallback probe',
          slug: `${ONLY_UZ_SLUG_PREFIX}-ru`,
          excerpt: null,
          // body deliberately null — Phase 4 D-07 cascade fires on this.
          body: null,
        },
        en: {
          title: 'en_Locale fallback probe',
          slug: `${ONLY_UZ_SLUG_PREFIX}-en`,
          excerpt: null,
          body: null,
        },
      },
    });
  });

  test.afterAll(async () => {
    test.setTimeout(60_000);
    const db = await getTestDb();
    try {
      await db.execute(
        sql`DELETE FROM recipe_translations WHERE recipe_id = ${ONLY_UZ_RECIPE_ID}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM recipe WHERE id = ${ONLY_UZ_RECIPE_ID}::uuid`,
      );
    } catch {
      // best-effort
    }
    await teardownPhase4Content();
    if (publicIds) await teardownPublicFixture(publicIds);
  });

  test('visitor reads /uz/recipes/<slug> with prose body + JSON-LD TechArticle', async ({
    page,
  }) => {
    // Seed orchestrator created a recipe at slug 'uz-manometr-installation'.
    await page.goto(`${baseURL}/uz/recipes/uz-manometr-installation`);

    // Title + body wrappers from src/app/[locale]/recipes/[slug]/page.tsx.
    const title = page.locator('[data-testid="recipe-title"]');
    await expect(title).toContainText('uz_Manometrni toʻgʻri oʻrnatish');
    await expect(page.locator('[data-testid="recipe-body"]')).toBeVisible();

    // JSON-LD TechArticle shape (CONT-06 / D-10). The page emits it as a
    // <script type="application/ld+json"> with `<` escaped as <
    // (T-04-XSS-02 mitigation). innerText returns the raw text which JSON.parse
    // accepts after un-escaping the < sequences.
    const ldScripts = page.locator('script[type="application/ld+json"]');
    await expect(ldScripts.first()).toBeAttached();
    const raw = await ldScripts.first().innerText({ timeout: 5_000 }).catch(
      async () => {
        // innerText doesn't read non-rendered scripts in headless Chromium —
        // fall back to evaluating the text content directly.
        return await ldScripts.first().evaluate(
          (el) => el.textContent ?? '',
        );
      },
    );
    expect(raw.length).toBeGreaterThan(0);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed['@type']).toBe('TechArticle');
    expect(parsed.headline).toBeDefined();
    expect(parsed.datePublished).toBeDefined();
  });

  test('locale fallback shows banner when requested locale body is empty (D-07)', async ({
    page,
  }) => {
    // Seed posture: this recipe has uz body filled, ru body null. Visiting
    // /ru/recipes/<ru-slug> should render uz body + show the banner.
    await page.goto(`${baseURL}/ru/recipes/${ONLY_UZ_SLUG_PREFIX}-ru`);

    // Banner asserts (Phase 4 D-07 + LocaleFallbackBanner component).
    const banner = page.locator('[data-testid="locale-fallback-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-fallback-locale', 'uz');
    await expect(banner).toHaveAttribute('data-requested-locale', 'ru');
    await expect(banner).toHaveAttribute('data-entity-type', 'recipe');

    // Body still rendered (cascade fallback wrote the uz body's HTML in).
    await expect(page.locator('[data-testid="recipe-body"]')).toBeVisible();
  });
});
