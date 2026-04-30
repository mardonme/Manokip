// Plan 03-01 Task 1.3 — RED stub for CAT-02 (left-rail category nav tree).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 03 (CategoryNav client island in
// src/components/public/category-nav.tsx + public root layout).

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.skip('CAT-02: left-rail category tree renders both root categories (closed by plan 03)', async ({
  page,
}) => {
  // TODO Plan 03: page.goto(`${baseURL}/uz`); expect [data-testid=category-nav]
  // contains links for "Manometr" + "Bosim datchigi" (uz translations from
  // seed-public).
  void page;
  void baseURL;
});

test.skip('CAT-02: clicking a child category navigates to /[locale]/categories/<slug>', async ({
  page,
}) => {
  // TODO Plan 03: click "Manometr" link → URL is /uz/categories/manometr.
  void page;
  void baseURL;
});
