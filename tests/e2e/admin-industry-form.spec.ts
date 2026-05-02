// Plan 04-12 Task 12.2 — Phase-4 closure: flipped from test.fixme → live.
//
// Mirror of admin-recipe-form.spec.ts for industries (CONT-01). Same 6-step
// round-trip, swapped entity. Cloudinary image-insert deferred (DEF-4-12-04)
// — basic text-edit + save + publish suffices as the GREEN gate.
//
// FLIP-IN: 04-12-PLAN

import { test, expect } from '@playwright/test';
import { sql } from 'drizzle-orm';
import { getTestDb, requireTestDatabaseUrl } from '../_fixtures/db';
import {
  loginAsAdminViaDirectToken,
  cleanupAdminVerificationTokens,
} from '../fixtures/admin-magic-link';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@manometr.uz';

const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

const RUN_TAG = Date.now().toString(36);

test.describe.configure({ mode: 'serial' });

test.describe('Admin industry authoring smoke (CONT-01; live Neon)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Phase-4 admin authoring e2e expects a Vercel preview URL with admin auth + Cloudinary signing wired; local-fallback skip',
  );

  test.afterAll(async () => {
    test.setTimeout(60_000);
    await cleanupAdminVerificationTokens(adminEmail);
    const db = await getTestDb();
    const titleUz = `e2e_industry_${RUN_TAG}`;
    await db.execute(sql`
      DELETE FROM industry_translations
       WHERE industry_id IN (
         SELECT industry_id FROM industry_translations WHERE title = ${titleUz}
       )
    `);
    await db.execute(sql`
      DELETE FROM industry
       WHERE id NOT IN (SELECT industry_id FROM industry_translations)
    `);
  });

  test('admin authors industry → save → publish → public detail shows body', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    requireTestDatabaseUrl();

    await loginAsAdminViaDirectToken(page, {
      baseURL,
      email: adminEmail,
      locale: 'uz',
      callbackPath: '/uz/admin/industries',
      protectionBypassHeader: extraHeaders,
    });

    await page.goto(`${baseURL}/uz/admin/industries/new`);
    await expect(
      page.locator('[data-testid="industry-save"]'),
    ).toBeVisible();

    const locales = ['uz', 'ru', 'en'] as const;
    const titleByLocale: Record<typeof locales[number], string> = {
      uz: `e2e_industry_${RUN_TAG}`,
      ru: `e2e_industry_ru_${RUN_TAG}`,
      en: `e2e_industry_en_${RUN_TAG}`,
    };
    const slugByLocale: Record<typeof locales[number], string> = {
      uz: `e2e-industry-${RUN_TAG}`,
      ru: `e2e-industry-ru-${RUN_TAG}`,
      en: `e2e-industry-en-${RUN_TAG}`,
    };
    const bodyText = `Industry body ${RUN_TAG}`;

    for (const l of locales) {
      const tab = page.locator(`[data-testid="tab-${l}"]`);
      if (await tab.isVisible()) await tab.click();

      const titleInput = page.locator(
        `input[name="translations.${l}.title"]`,
      );
      await titleInput.waitFor({ state: 'visible' });
      await titleInput.fill(titleByLocale[l]);

      const slugInput = page.locator(`input[name="translations.${l}.slug"]`);
      await slugInput.waitFor({ state: 'visible' });
      await slugInput.fill(slugByLocale[l]);

      const excerpt = page.locator(
        `textarea[name="translations.${l}.excerpt"]`,
      );
      if (await excerpt.isVisible()) {
        await excerpt.fill(`e2e industry excerpt ${l}`);
      }

      const editor = page
        .locator('[data-testid="industry-body-editor"]')
        .locator('[contenteditable]');
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(`${bodyText} ${l}`);
    }

    await page.click('[data-testid="industry-save"]');
    await page.waitForURL(/\/uz\/admin\/industries\/[0-9a-f-]+\/edit/, {
      timeout: 15_000,
    });

    const publishBtn = page.locator('[data-testid="industry-publish"]');
    await publishBtn.waitFor({ state: 'visible' });
    await publishBtn.click();
    await expect(page.locator('[data-testid="status-display"]')).toContainText(
      /published/i,
      { timeout: 10_000 },
    );

    await page.goto(`${baseURL}/uz/industries/${slugByLocale.uz}`);
    const body = page.locator('[data-testid="industry-body"]');
    await expect(body).toBeVisible();
    await expect(body).toContainText(bodyText);
  });
});
