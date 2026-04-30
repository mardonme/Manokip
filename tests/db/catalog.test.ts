// Plan 03-01 Task 1.3 — RED stub for CAT-03 + CAT-04 (catalog queries).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 04 (catalog filter pipeline + EAV facets).

import { describe, it } from 'vitest';

// import { seedPublicFixture } from '../fixtures/seed-public'; // Plan 04 wires this up

describe.skip('catalog queries (CAT-03, CAT-04; closed by plan 04)', () => {
  it('CAT-03: product count for category — returns count of published products in manometers category', () => {
    // TODO Plan 04: seed → call src/lib/facets.ts (or src/lib/catalog.ts)
    // count helper → assert returns 3 (M-100, M-200, M-300 published).
  });
  it('CAT-04: numeric range filter — pressure_max ≤ 250 returns M-100 + M-200', () => {
    // TODO Plan 04: build EAV filter on pressure_max range; assert exactly
    // 2 products returned (M-100 num_value=100, M-200 num_value=250). M-300
    // (num_value=600) excluded.
  });
  it('CAT-04: enum filter — material=steel returns only M-100', () => {
    // TODO Plan 04: enum filter on material returns M-100 (enum_value='steel').
  });
  it('CAT-04: bool filter — certified=true returns M-100 + M-300', () => {
    // TODO Plan 04: bool filter on certified=true returns M-100 + M-300.
  });
  it('CAT-04: combined filters — pressure_max ≤ 600 AND material=inox returns M-300', () => {
    // TODO Plan 04: AND of multiple EAV EXISTS subqueries — only M-300 fits.
  });
});
