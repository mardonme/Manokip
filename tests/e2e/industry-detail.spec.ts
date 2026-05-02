// Plan 04-12 Task 12.1 — Phase-4 closure: flipped from test.fixme → live.
//
// Mirror of recipe-detail.spec.ts for industries (CONT-03 + CONT-06). Same
// 2-spec shape, same seed posture, same local-fallback skip.
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
  seedIndustry,
} from '../fixtures/seed-content';
import { SAMPLE_INDUSTRY_DOC } from '../fixtures/tiptap-sample';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

test.describe('Industry detail page (CONT-03 + CONT-06; live Neon)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Phase-4 detail e2e expects a Vercel preview URL with seed content visible to the public RSC; local-fallback skip',
  );

  let publicIds: PublicFixtureIds | undefined;
  const ONLY_UZ_INDUSTRY_ID = '00000000-0000-4000-8000-000000000fce';
  const ONLY_UZ_SLUG_PREFIX = 'phase4-industry-only-uz';

  test.beforeAll(async () => {
    test.setTimeout(60_000);
    requireTestDatabaseUrl();
    publicIds = await seedPublicFixture();
    await seedPhase4Content({ products: publicIds.productIds });

    const db = await getTestDb();
    await db.execute(
      sql`DELETE FROM industry_translations WHERE industry_id = ${ONLY_UZ_INDUSTRY_ID}::uuid`,
    );
    await db.execute(
      sql`DELETE FROM industry WHERE id = ${ONLY_UZ_INDUSTRY_ID}::uuid`,
    );
    await seedIndustry({
      id: ONLY_UZ_INDUSTRY_ID,
      status: 'published',
      featuredImagePublicId: null,
      translations: {
        uz: {
          title: 'uz_Industry fallback probe',
          slug: `${ONLY_UZ_SLUG_PREFIX}-uz`,
          excerpt: 'uz_Probe excerpt.',
          body: SAMPLE_INDUSTRY_DOC,
        },
        ru: {
          title: 'ru_Industry fallback probe',
          slug: `${ONLY_UZ_SLUG_PREFIX}-ru`,
          excerpt: null,
          body: null,
        },
        en: {
          title: 'en_Industry fallback probe',
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
        sql`DELETE FROM industry_translations WHERE industry_id = ${ONLY_UZ_INDUSTRY_ID}::uuid`,
      );
      await db.execute(
        sql`DELETE FROM industry WHERE id = ${ONLY_UZ_INDUSTRY_ID}::uuid`,
      );
    } catch {
      // best-effort
    }
    await teardownPhase4Content();
    if (publicIds) await teardownPublicFixture(publicIds);
  });

  test('visitor reads /uz/industries/<slug> with prose body + JSON-LD TechArticle', async ({
    page,
  }) => {
    await page.goto(`${baseURL}/uz/industries/uz-oil-and-gas`);

    const title = page.locator('[data-testid="industry-title"]');
    await expect(title).toContainText('uz_Neft va gaz sanoati');
    await expect(page.locator('[data-testid="industry-body"]')).toBeVisible();

    const ldScripts = page.locator('script[type="application/ld+json"]');
    await expect(ldScripts.first()).toBeAttached();
    const raw = await ldScripts.first().evaluate(
      (el) => el.textContent ?? '',
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
    await page.goto(`${baseURL}/ru/industries/${ONLY_UZ_SLUG_PREFIX}-ru`);

    const banner = page.locator('[data-testid="locale-fallback-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-fallback-locale', 'uz');
    await expect(banner).toHaveAttribute('data-requested-locale', 'ru');
    await expect(banner).toHaveAttribute('data-entity-type', 'industry');

    await expect(page.locator('[data-testid="industry-body"]')).toBeVisible();
  });
});
