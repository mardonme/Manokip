// Plan 03-01 Task 1.3 — RED stubs for CAT-06 + CAT-07 + SRCH-04 (product
// detail page + SSR HTML + SKU short-circuit).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by:
//   Plan 05: CAT-06 (grouped spec tables) + CAT-07 (SSR HTML name presence)
//   Plan 06: SRCH-04 (search?q=<exact-sku> 302-redirects to product detail)

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.skip('CAT-06: product detail page renders grouped spec tables (closed by plan 05)', async ({
  page,
}) => {
  // TODO Plan 05: page.goto(`${baseURL}/uz/products/manometr-m-100`);
  // expect [data-testid=spec-table] visible with rows for pressure_max,
  // material, certified — grouped under spec-field-group headings if
  // assigned (D-09 from Phase 2 carry-forward).
  void page;
  void baseURL;
});

test.skip('CAT-07: SSR HTML response body contains the product name (closed by plan 05)', async ({
  request,
}) => {
  // TODO Plan 05: const res = await request.get(
  //   `${baseURL}/uz/products/manometr-m-100`); const body = await res.text();
  // expect(body).toContain('Manometr M-100'); — proves SSR (not just
  // client hydration) so Google/Yandex see content on first byte.
  void request;
  void baseURL;
});

test.skip('SRCH-04: visiting /[locale]/search?q=M-100 302-redirects to /[locale]/products/<slug> (closed by plan 06)', async ({
  page,
}) => {
  // TODO Plan 06: page.goto(`${baseURL}/uz/search?q=M-100`); expect final
  // URL to match /\/uz\/products\/manometr-m-100$/ per D-07 SKU
  // short-circuit.
  void page;
  void baseURL;
});

test.skip('SRCH-04: SKU match is case-insensitive — q=m-100 also redirects', async ({
  page,
}) => {
  // TODO Plan 06: lowercase variant also short-circuits.
  void page;
  void baseURL;
});
