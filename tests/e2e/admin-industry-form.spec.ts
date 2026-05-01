// Plan 04-04 Task 4.4 — Playwright RED stub for the admin industry authoring
// smoke flow.
//
// Mirror of admin-recipe-form.spec.ts — same 8-step round-trip, swapped
// entity. Flips to live in 04-12.
//
// FLIP-IN: 04-12-PLAN

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Admin industry authoring smoke [RED — flips in 04-12]', () => {
  test.fixme(
    'admin authors industry with Tiptap + insertImage + linked products → publish → public detail shows body',
    async ({ page }) => {
      // FLIP-IN: 04-12-PLAN
      // 1. loginAsAdminViaDirectToken(page)  // see admin-recipe-form.spec.ts re Rule 3
      // 2. visit /uz/admin/industries/new
      // 3. fill 3-locale tabs — title, slug, excerpt, body
      // 4. Tiptap editor + insertImage from Cloudinary
      // 5. select 1 linked product
      // 6. Save → expect redirect to edit page
      // 7. Publish → status='published', publishedAt set
      // 8. visit /uz/industries/<slug> → assert body content rendered
      void page;
      void baseURL;
    },
  );
});
