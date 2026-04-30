// Plan 03-01 Task 1.3 — RED stubs for MFG-01 + MFG-02 (manufacturer index +
// detail pages).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 07 (manufacturer pages — landing + index + verified
// badge + per-locale relationship_note).

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.skip('MFG-01: /[locale]/manufacturers index renders 3 manufacturer cards each with <img> logo (closed by plan 07)', async ({
  page,
}) => {
  // TODO Plan 07: page.goto(`${baseURL}/uz/manufacturers`); expect 3
  // [data-testid=manufacturer-card] elements (WIKA, BD Sensors, Метран),
  // each containing an <img> for the logo (Cloudinary CldImage).
  void page;
  void baseURL;
});

test.skip('MFG-01: official-rep manufacturers display Verified badge', async ({
  page,
}) => {
  // TODO Plan 07: WIKA seed gets is_official_rep=true in Plan 02 seed
  // extension; expect [data-testid=manufacturer-card-wika] contains
  // [data-testid=verified-badge].
  void page;
  void baseURL;
});

test.skip('MFG-02: /[locale]/manufacturers/<slug> detail shows description + paginated product grid (closed by plan 07)', async ({
  page,
}) => {
  // TODO Plan 07: page.goto(`${baseURL}/uz/manufacturers/wika`); expect
  // description text visible AND product grid scoped to WIKA's products
  // (M-100 + T-100 — round-robin manufacturer assignment in seed).
  void page;
  void baseURL;
});

test.skip('MFG-02: per-locale relationship_note renders when present', async ({
  page,
}) => {
  // TODO Plan 07: relationship_note is set by Plan 02 seed extension; the
  // text appears within the manufacturer detail page header per D-11.
  void page;
  void baseURL;
});
