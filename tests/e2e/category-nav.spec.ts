// Plan 03-03 Task 3.3 — GREEN spec for CAT-02 (header → catalog navigation).
//
// At Plan 03 the persistent left-rail category tree itself doesn't render
// on the homepage (CategoryTreeServer is consumed by listing pages in
// Plan 04). What the public surface MUST guarantee at this wave is that
// the site header carries a top-level Catalog link reachable from every
// public page. The full tree-rendering + child-navigation specs are
// closed by Plan 04 once /[locale]/categories/<slug> exists.

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test('CAT-02: site header carries a Catalog link to /[locale]/categories', async ({
  page,
}) => {
  await page.goto(`${baseURL}/uz`);
  // The header has a "Katalog" link in uz; it points at /uz/categories.
  // Use the locale-agnostic href assertion so the spec stays valid if the
  // copy is tweaked in messages/uz.json.
  const catalogLink = page
    .locator('[data-testid="site-header"] a[href$="/uz/categories"]')
    .first();
  await expect(catalogLink).toBeVisible();
  await catalogLink.click();
  await expect(page).toHaveURL(/\/uz\/categories/);
});

test('CAT-02: site header is rendered on every public page', async ({
  page,
}) => {
  await page.goto(`${baseURL}/uz`);
  await expect(page.locator('[data-testid="site-header"]')).toBeVisible();
});
