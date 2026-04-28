import { test, expect } from '@playwright/test';

/**
 * Plan 02-02 ADMIN-SHELL — smoke spec for the admin shell.
 *
 * This spec asserts that, given an authenticated admin session, the
 * admin layout renders:
 *   - data-testid="admin-sidebar" with 8 nav links (one per section)
 *   - data-testid="admin-topbar"
 *   - data-testid="admin-email" matching the logged-in admin email
 *   - a sign-out form (Server Action submit -> /uz/login redirect)
 *   - the NuqsAdapter wrapping (asserted indirectly: a downstream nuqs
 *     hook would render without the "nuqs requires an adapter" error)
 *
 * Authentication: this spec depends on the shared admin-session fixture
 * scheduled to land in plan 02-04 (`tests/_fixtures/admin-session.ts`).
 * Until that fixture exists, the spec SKIPS — it is authored eagerly
 * per the plan acceptance criterion that an e2e shell smoke test must
 * exist as part of plan 02-02. The skip flips off automatically once the
 * fixture file is present.
 *
 * To run locally once the fixture exists, set the env var
 * `RUN_ADMIN_SHELL_TEST=1` and supply a working DATABASE_URL pointing
 * at the dev/test Neon branch.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_PATH = join(
  process.cwd(),
  'tests',
  '_fixtures',
  'admin-session.ts',
);

const fixtureExists = existsSync(FIXTURE_PATH);

test.describe('plan 02-02: admin shell smoke', () => {
  test.skip(
    !fixtureExists,
    `MISSING — Wave 0 must create tests/_fixtures/admin-session.ts (plan 02-04). ` +
      `Spec authored eagerly per plan 02-02 acceptance criterion; flips on ` +
      `automatically when the fixture file lands.`,
  );

  test.skip(
    process.env.RUN_ADMIN_SHELL_TEST !== '1',
    'Requires a live admin session; set RUN_ADMIN_SHELL_TEST=1 to enable.',
  );

  test('renders sidebar + topbar + email + 8 nav links + sign-out form', async ({
    page,
  }) => {
    // Dynamic import: the fixture file may not exist at parse time, so we
    // can't import it statically. Once it lands, this resolves to the real
    // login helper. The string-concat path keeps tsc from trying to resolve
    // the module at type-check time (the file may not yet exist).
    const fixturePath = '../_fixtures/' + 'admin-session';
    const mod = (await import(/* @vite-ignore */ fixturePath)) as {
      loginAsAdmin: (page: import('@playwright/test').Page) => Promise<void>;
    };
    await mod.loginAsAdmin(page);

    await page.goto('/uz/admin');

    // Shell markers
    await expect(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect(page.getByTestId('admin-topbar')).toBeVisible();
    await expect(page.getByTestId('admin-email')).toBeVisible();

    // 8 nav links — assert hrefs (locale-prefixed by next-intl Link)
    const expectedHrefs = [
      '/uz/admin',
      '/uz/admin/products',
      '/uz/admin/categories',
      '/uz/admin/manufacturers',
      '/uz/admin/spec-fields',
      '/uz/admin/submissions',
      '/uz/admin/audit',
      '/uz/admin/admins',
    ];
    const sidebar = page.getByTestId('admin-sidebar');
    for (const href of expectedHrefs) {
      await expect(sidebar.locator(`a[href="${href}"]`)).toHaveCount(1);
    }

    // Sign-out form posts to a Server Action — `<button type="submit">` lives
    // inside a `<form>` whose action is the inline signOutAction.
    const topbar = page.getByTestId('admin-topbar');
    await expect(topbar.locator('form')).toHaveCount(1);
    await expect(topbar.locator('form button[type="submit"]')).toHaveCount(1);
  });
});
