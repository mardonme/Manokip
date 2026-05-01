// Plan 04-04 Task 4.4 — Playwright RED stub for the admin recipe authoring
// smoke flow.
//
// 1 spec per plan: admin authors a new recipe (Tiptap editor + insertImage +
// linked products) → saves → publishes → visits the public detail URL +
// asserts the body content rendered. Validates the full Wave 1+ → Wave 3
// pipeline end-to-end.
//
// Authentication: re-uses the magic-link DB-direct token consumption pattern
// from Phase 2 plan 02-17 (tests/e2e/admin-edit-revalidates.spec.ts). The
// loginAsAdminViaDirectToken() helper expected by this stub doesn't exist as
// a standalone export yet — admin-edit-revalidates.spec.ts inlines the
// pattern. Per plan deviations Rule 3, when 04-12 flips this spec live it
// will either:
//   (a) extract the inline pattern into tests/fixtures/admin-magic-link.ts
//       (preferred — DRY for the 2 admin specs in this plan), OR
//   (b) inline the pattern here too, mirroring admin-edit-revalidates.spec.ts.
//
// REQUIRES (when flipped): admin_user(active=true) for E2E_ADMIN_EMAIL on
// the same Neon branch the BASE_URL backend points to.
//
// FLIP-IN: 04-12-PLAN

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Admin recipe authoring smoke [RED — flips in 04-12]', () => {
  test.fixme(
    'admin authors recipe with Tiptap + insertImage + linked products → publish → public detail shows body',
    async ({ page }) => {
      // FLIP-IN: 04-12-PLAN
      // 1. loginAsAdminViaDirectToken(page) — magic-link DB-direct token (Phase 2 02-17 pattern)
      //    The helper is either tests/fixtures/admin-magic-link.ts:loginAsAdminViaDirectToken
      //    OR an inline pattern copied from admin-edit-revalidates.spec.ts (Rule 3).
      // 2. visit /uz/admin/recipes/new
      // 3. fill 3-locale tabs (uz/ru/en) — title, slug, excerpt, body
      // 4. body field: type into Tiptap editor + click insertImage button +
      //    select a Cloudinary asset (mocked or real upload)
      // 5. select 1 linked product from LinkedProductsPicker
      // 6. click Save → expect green toast + redirect to /uz/admin/recipes/<id>/edit
      // 7. click Publish → expect status flips to "published" + publishedAt set
      // 8. visit /uz/recipes/<slug> → assert page.getByTestId('recipe-body')
      //    contains the typed text
      void page;
      void baseURL;
    },
  );
});
