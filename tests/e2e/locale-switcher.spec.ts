// Plan 03-01 Task 1.3 — RED stub for CAT-01 (locale switcher).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 03 (LocaleSwitcher client island in
// src/components/public/locale-switcher.tsx + root layout integration).

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.skip('CAT-01: clicking RU button navigates from /uz/... to /ru/... (closed by plan 03)', async ({
  page,
}) => {
  // TODO Plan 03: page.goto(`${baseURL}/uz`); click [data-testid=locale-ru] →
  // expect URL to match /^.*\/ru\/?$/ — same path, locale prefix swapped.
  void page;
  void baseURL;
});

test.skip('CAT-01: locale switcher highlights the current locale (active variant)', async ({
  page,
}) => {
  // TODO Plan 03: on /uz, the UZ button has variant=default; RU + EN have
  // variant=outline. After clicking RU, RU becomes default.
  void page;
  void baseURL;
});
