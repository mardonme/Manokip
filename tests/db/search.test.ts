// Plan 03-01 Task 1.3 — RED stub for SRCH-01 + SRCH-02 (FTS + locale fallback).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 06 (search + autocomplete + locale fallback).

import { describe, it } from 'vitest';

// import { seedPublicFixture } from '../fixtures/seed-public'; // Plan 06 wires this up

describe.skip('FTS + locale fallback (SRCH-01, SRCH-02; closed by plan 06)', () => {
  it('SRCH-01: query "manometr" in uz locale returns ranked results from product_search uz row', () => {
    // TODO Plan 06: seed (Plan-02 saveProduct populates product_search) →
    // call src/lib/search.ts searchProducts('manometr', 'uz') → assert
    // top hits are M-100/M-200/M-300 sorted by ts_rank_cd descending.
  });
  it('SRCH-02: zero hits in current locale cascades uz → ru → en, banner data signals fallback locale', () => {
    // TODO Plan 06: query a term that exists only in `en` (e.g. "stainless")
    // from `uz` locale → expect empty uz hits, then en cascade hits +
    // bannerLocale='en' so the page can render the "Showing en results"
    // banner per D-05.
  });
  it('SRCH-02: stops at first non-empty fallback locale (does not aggregate across locales)', () => {
    // TODO Plan 06: if uz has 0 hits, ru has 1 hit, en has 5 hits — return
    // ONLY the ru hit (1 result), NOT 6.
  });
});
