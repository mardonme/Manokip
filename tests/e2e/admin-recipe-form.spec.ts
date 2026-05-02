// Plan 04-12 Task 12.2 — Phase-4 closure: flipped from test.fixme → live.
//
// Admin recipe authoring smoke flow (CONT-01). Drives the full Wave 1+ → Wave
// 3 pipeline end-to-end through the browser:
//   1. magic-link DB-direct login (Plan 02-17 pattern, extracted to
//      tests/fixtures/admin-magic-link.ts in this plan)
//   2. /uz/admin/recipes/new — fill 3-locale tabs (title + slug + excerpt) +
//      type body text in the Tiptap editor
//   3. Save → redirected to /[locale]/admin/recipes/<id>/edit
//   4. Publish → status flips to 'published'
//   5. Visit /uz/recipes/<slug> → assert recipe-body contains the typed text
//
// Cloudinary image-insert via the widget IS NOT exercised here — Cloudinary
// opens an iframe + external dialog the headless browser cannot easily drive
// (DEF-4-12-04 below; documented in 04-VERIFICATION.md). Basic text-edit +
// save + publish IS sufficient as the GREEN gate for CONT-01 per the plan's
// `<action>` block.
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

// Unique slug per run so re-runs don't collide on the per-locale unique slug.
const RUN_TAG = Date.now().toString(36);

test.describe.configure({ mode: 'serial' });

test.describe('Admin recipe authoring smoke (CONT-01; live Neon)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Phase-4 admin authoring e2e expects a Vercel preview URL with admin auth + Cloudinary signing wired; local-fallback skip',
  );

  test.afterAll(async () => {
    test.setTimeout(60_000);
    // Drop any verification_tokens we created so re-runs start clean.
    await cleanupAdminVerificationTokens(adminEmail);
    // Drop the recipe + translations we created (slug is unique per run).
    const db = await getTestDb();
    const titleUz = `e2e_recipe_${RUN_TAG}`;
    await db.execute(sql`
      DELETE FROM recipe_translations
       WHERE recipe_id IN (
         SELECT recipe_id FROM recipe_translations WHERE title = ${titleUz}
       )
    `);
    await db.execute(sql`
      DELETE FROM recipe
       WHERE id NOT IN (SELECT recipe_id FROM recipe_translations)
    `);
  });

  test('admin authors recipe → save → publish → public detail shows body', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    requireTestDatabaseUrl();

    // 1. Magic-link login.
    await loginAsAdminViaDirectToken(page, {
      baseURL,
      email: adminEmail,
      locale: 'uz',
      callbackPath: '/uz/admin/recipes',
      protectionBypassHeader: extraHeaders,
    });

    // 2. Visit the new-recipe form.
    await page.goto(`${baseURL}/uz/admin/recipes/new`);
    await expect(
      page.locator('[data-testid="recipe-save"]'),
    ).toBeVisible();

    // 3. Fill the 3-locale tabs. SlugInput auto-generates the slug on blur,
    //    but we set both fields explicitly so the assertions are deterministic.
    const locales = ['uz', 'ru', 'en'] as const;
    const titleByLocale: Record<typeof locales[number], string> = {
      uz: `e2e_recipe_${RUN_TAG}`,
      ru: `e2e_recipe_ru_${RUN_TAG}`,
      en: `e2e_recipe_en_${RUN_TAG}`,
    };
    const slugByLocale: Record<typeof locales[number], string> = {
      uz: `e2e-recipe-${RUN_TAG}`,
      ru: `e2e-recipe-ru-${RUN_TAG}`,
      en: `e2e-recipe-en-${RUN_TAG}`,
    };
    const bodyText = `Hello world ${RUN_TAG}`;

    for (const l of locales) {
      // Switch tab.
      const tab = page.locator(`[data-testid="tab-${l}"]`);
      if (await tab.isVisible()) await tab.click();

      // Title input — SlugInput's first <Input> registered against
      // translations.<l>.title.
      const titleInput = page.locator(
        `input[name="translations.${l}.title"]`,
      );
      await titleInput.waitFor({ state: 'visible' });
      await titleInput.fill(titleByLocale[l]);

      // Slug input — set explicitly to avoid blur-time slug regeneration ordering.
      const slugInput = page.locator(`input[name="translations.${l}.slug"]`);
      await slugInput.waitFor({ state: 'visible' });
      await slugInput.fill(slugByLocale[l]);

      // Excerpt textarea.
      const excerpt = page.locator(
        `textarea[name="translations.${l}.excerpt"]`,
      );
      if (await excerpt.isVisible()) {
        await excerpt.fill(`e2e excerpt ${l}`);
      }

      // Body — type into the Tiptap editor's contenteditable element.
      // The RecipeBodyEditor component renders [data-testid="recipe-body-editor"]
      // around the Tiptap mount; the inner [contenteditable] is what we type
      // into.
      const editor = page
        .locator('[data-testid="recipe-body-editor"]')
        .locator('[contenteditable]');
      await editor.click();
      // Clear any default paragraph content and type fresh text.
      await page.keyboard.press('Control+A');
      await page.keyboard.type(`${bodyText} ${l}`);
    }

    // 4. Save.
    await page.click('[data-testid="recipe-save"]');

    // Wait for redirect to /[locale]/admin/recipes/<id>/edit (Server Action
    // calls router.push after successful save in the form).
    await page.waitForURL(/\/uz\/admin\/recipes\/[0-9a-f-]+\/edit/, {
      timeout: 15_000,
    });

    // 5. Publish — status pill flips to 'published' once the action commits.
    const publishBtn = page.locator('[data-testid="recipe-publish"]');
    await publishBtn.waitFor({ state: 'visible' });
    await publishBtn.click();
    await expect(page.locator('[data-testid="status-display"]')).toContainText(
      /published/i,
      { timeout: 10_000 },
    );

    // 6. Public detail page — body content visible.
    await page.goto(`${baseURL}/uz/recipes/${slugByLocale.uz}`);
    const body = page.locator('[data-testid="recipe-body"]');
    await expect(body).toBeVisible();
    await expect(body).toContainText(bodyText);
  });
});
