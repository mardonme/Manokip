// Plan 03-03 Task 3.3 — GREEN spec for CAT-01 (locale switcher).
//
// Validates the LocaleSwitcher client island wired into the public root
// layout via SiteHeader. Two scenarios per the plan:
//   - Clicking RU on /uz/ navigates to /ru/ (path preserved, locale prefix
//     swapped).
//   - The switcher is visible site-wide (rendered by every layout-bound
//     page) and the current locale's button is the `default` variant
//     (aria-pressed=true).

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test('CAT-01: clicking RU on /uz/ navigates to /ru/', async ({ page }) => {
  await page.goto(`${baseURL}/uz`);
  await page.locator('[data-testid="locale-ru"]').click();
  await expect(page).toHaveURL(/\/ru(\/|$)/);
});

test('CAT-01: locale switcher renders 3 buttons site-wide and highlights current locale', async ({
  page,
}) => {
  await page.goto(`${baseURL}/uz`);
  await expect(
    page.getByRole('group', { name: 'Locale switcher' }),
  ).toBeVisible();
  // UZ active on /uz: aria-pressed=true; RU + EN aria-pressed=false
  await expect(page.locator('[data-testid="locale-uz"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-testid="locale-ru"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('[data-testid="locale-en"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});
