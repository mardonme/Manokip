// Plan 03-01 Task 1.3 — RED stub for CAT-05 (URL-state catalog filters).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 04 (FilterSidebar client island with nuqs URL state +
// active-filter pills).

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.skip('CAT-05: ticking material=steel updates URL with ?material=steel (closed by plan 04)', async ({
  page,
}) => {
  // TODO Plan 04: page.goto(`${baseURL}/uz/categories/manometr`); click
  // [data-testid=filter-material-steel]; expect URL to include
  // ?material=steel; expect grid filtered to M-100 only.
  void page;
  void baseURL;
});

test.skip('CAT-05: page reload preserves filter state from URL', async ({
  page,
}) => {
  // TODO Plan 04: navigate directly to
  // `${baseURL}/uz/categories/manometr?material=steel&pressureMaxMax=200`;
  // expect filter sidebar shows steel checked + pressure-max slider at 200.
  void page;
  void baseURL;
});

test.skip('CAT-05: clicking active-filter pill removes the filter from URL', async ({
  page,
}) => {
  // TODO Plan 04: with filter active, click the pill's × button → URL
  // drops the param and grid re-expands.
  void page;
  void baseURL;
});
