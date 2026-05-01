// Plan 04-04 Task 4.4 — Playwright RED stubs for the "Used in" section on
// the public product detail page.
//
// Used-In is the reverse-direction render of product_recipes + product_industries
// (CONT-04 / D-04 / D-09). It surfaces on /[locale]/products/<slug> as a
// dedicated section listing recipes + industries that cross-link the product,
// capped at 6 per type per D-09.
//
// 2 specs per plan: visible (with cross-links) + hidden (no cross-links).
//
// REQUIRES (when flipped): seedPublicFixture() + seedPhase4Content() against
// the same Neon branch the BASE_URL backend reads from.
//
// FLIP-IN: 04-12-PLAN

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

test.describe('Used-in section on product detail [RED — flips in 04-12]', () => {
  test.fixme(
    'used-in section visible with linked recipe + industry cross-links',
    async ({ page }) => {
      // FLIP-IN: 04-12-PLAN
      // seedPhase4Content cross-links recipeOne ↔ M-100 + industryOne ↔ M-100
      // visit /uz/products/manometr-m-100
      // assert [data-testid=used-in] visible
      // assert at least 1 recipe link + 1 industry link rendered with title text
      // assert cap-at-6 per type holds (D-09)
      await page.context().setExtraHTTPHeaders(extraHeaders);
      await page.goto(`${baseURL}/uz/products/manometr-m-100`);
      // const usedIn = page.getByTestId('used-in');
      // await expect(usedIn).toBeVisible();
    },
  );

  test.fixme(
    'used-in section hidden when product has 0 cross-links',
    async ({ page }) => {
      // FLIP-IN: 04-12-PLAN
      // visit /uz/products/manometr-m-300 (NOT cross-linked by seedPhase4Content)
      // assert [data-testid=used-in] is NOT in the DOM (or hidden — verify which behavior)
      void page;
    },
  );
});
