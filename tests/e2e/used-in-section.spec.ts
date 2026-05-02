// Plan 04-12 Task 12.2 — Phase-4 closure: flipped from test.fixme → live.
//
// Used-In is the reverse-direction render of product_recipes + product_industries
// (CONT-04 / D-04 / D-09). It surfaces on /[locale]/products/<slug> as a
// dedicated section listing recipes + industries that cross-link the product,
// capped at 6 per type per D-09.
//
// 2 specs:
//   1. visible (with cross-links): /uz/products/manometr-m-100 — seedPhase4Content
//      cross-links recipeOne + industryOne to productM100. Asserts
//      [data-testid="used-in-section"] is visible AND contains at least one
//      recipe link + one industry link.
//   2. hidden (no cross-links): /uz/products/manometr-m-300 — productM300 is
//      NOT cross-linked. Asserts [data-testid="used-in-section"] is NOT
//      attached to the DOM.
//
// FLIP-IN: 04-12-PLAN

import { test, expect } from '@playwright/test';
import { requireTestDatabaseUrl } from '../_fixtures/db';
import {
  seedPublicFixture,
  teardownPublicFixture,
  type PublicFixtureIds,
} from '../fixtures/seed-public';
import {
  seedPhase4Content,
  teardownPhase4Content,
} from '../fixtures/seed-content';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

test.describe('Used-in section on product detail (CONT-04; live Neon)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Phase-4 used-in e2e expects a Vercel preview URL with seed cross-links visible to the public RSC; local-fallback skip',
  );

  let publicIds: PublicFixtureIds | undefined;

  test.beforeAll(async () => {
    test.setTimeout(60_000);
    requireTestDatabaseUrl();
    publicIds = await seedPublicFixture();
    // seedPhase4Content cross-links productIds[0] (M-100) with recipeOne +
    // industryOne. productIds[2] (M-300) is intentionally NOT cross-linked
    // and is the spec-2 fixture.
    await seedPhase4Content({ products: publicIds.productIds });
  });

  test.afterAll(async () => {
    test.setTimeout(60_000);
    await teardownPhase4Content();
    if (publicIds) await teardownPublicFixture(publicIds);
  });

  test('used-in section visible with linked recipe + industry cross-links', async ({
    page,
  }) => {
    await page.goto(`${baseURL}/uz/products/manometr-m-100`);

    const section = page.locator('[data-testid="used-in-section"]');
    await expect(section).toBeVisible();

    // At least one recipe + one industry rendered (seed pairs recipeOne ↔
    // M-100 + industryOne ↔ M-100 — D-09 cap-at-6 doesn't kick in for the
    // 1+1 case).
    await expect(
      page.locator('[data-testid="used-in-recipes"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="used-in-industries"]'),
    ).toBeVisible();

    // Recipe title from seed content (uz_Manometrni toʻgʻri oʻrnatish) +
    // industry title (uz_Neft va gaz sanoati). Cards link via RecipeCard /
    // IndustryCard which render the localized title text.
    await expect(
      section.getByText('uz_Manometrni toʻgʻri oʻrnatish'),
    ).toBeVisible();
    await expect(section.getByText('uz_Neft va gaz sanoati')).toBeVisible();
  });

  test('used-in section hidden when product has 0 cross-links', async ({
    page,
  }) => {
    await page.goto(`${baseURL}/uz/products/manometr-m-300`);

    // The RSC returns null when both arrays are empty (D-09 hidden-when-empty
    // posture — see src/components/public/used-in-section.tsx). The element
    // is not in the DOM at all.
    const section = page.locator('[data-testid="used-in-section"]');
    await expect(section).toHaveCount(0);
  });
});
