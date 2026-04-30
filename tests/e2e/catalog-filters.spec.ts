// Plan 03-04 Task 4.3 — GREEN e2e specs for CAT-02 / CAT-03 / CAT-05.
//
// Closes the URL-state catalog filter contract end-to-end against a running
// Next.js server (pnpm start on the Vercel preview or a local prod build).
// Pre-requisites: tests/fixtures/seed-public.ts seedPublicFixture() must
// have run against the same Neon branch the server is connected to. The
// fixture seeds the manometers category with 3 products carrying
// pressure_max + material + certified spec values.

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test('CAT-02 / CAT-03: visiting /uz/categories/manometr renders product cards', async ({
  page,
}) => {
  await page.goto(`${baseURL}/uz/categories/manometr`);
  // results-count testid surfaces the total + the grid contains
  // product-card slots.
  await expect(page.getByTestId('results-count')).toBeVisible();
  const cards = page.getByTestId('product-card');
  await expect(cards.first()).toBeVisible();
});

test('CAT-05: filter selection updates URL and reload preserves results', async ({
  page,
}) => {
  await page.goto(`${baseURL}/uz/categories/manometr`);
  await expect(page.getByTestId('results-count')).toBeVisible();
  const initialCount = await page
    .getByTestId('results-count')
    .textContent();

  // Set pressure_max upper bound to 500 (excludes M-300=600).
  await page.getByTestId('filter-pressure_max-max').fill('500');
  await page.keyboard.press('Tab');
  await expect(page).toHaveURL(/pressure_max_max=500/);

  // Reload and confirm filter survives.
  await page.reload();
  await expect(page).toHaveURL(/pressure_max_max=500/);
  const reloadedCount = await page
    .getByTestId('results-count')
    .textContent();

  expect(reloadedCount).toBeTruthy();
  expect(reloadedCount).not.toBe(initialCount);
});

test('CAT-05: clicking active-filter pill removes the filter from URL', async ({
  page,
}) => {
  // Navigate with filter pre-set.
  await page.goto(
    `${baseURL}/uz/categories/manometr?pressure_max_max=500`,
  );
  await expect(page.getByTestId('pill-pressure_max-max')).toBeVisible();

  // Click the X on the pill (the inner button).
  const pillX = page
    .getByTestId('pill-pressure_max-max')
    .getByRole('button', { name: 'Remove filter' });
  await pillX.click();

  await expect(page).not.toHaveURL(/pressure_max_max=500/);
});
