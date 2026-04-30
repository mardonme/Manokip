// Plan 03-01 Task 1.3 — RED stub for SRCH-03 (autocomplete endpoint).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 06 (autocomplete API route at
// src/app/api/search/autocomplete/route.ts).

import { describe, it } from 'vitest';

// import { seedPublicFixture } from '../fixtures/seed-public'; // Plan 06 wires this up

describe.skip('autocomplete API (SRCH-03; closed by plan 06)', () => {
  it('SRCH-03: prefix query "Mano" in en locale returns Manometer products by name prefix', () => {
    // TODO Plan 06: hit GET /api/search/autocomplete?q=Mano&locale=en →
    // expect Manometer M-100/M-200/M-300 in suggestions sorted by
    // ts_rank_cd. Each suggestion includes manufacturer + category
    // breadcrumb chips per D-06.
  });
  it('SRCH-03: exact SKU prefix "M-1" returns M-100 highlighted at top', () => {
    // TODO Plan 06: SKU prefix UNION'd with name prefix; SKU matches rank
    // first per D-06.
  });
  it('SRCH-03: special chars !&|() in query are sanitized (no to_tsquery injection)', () => {
    // TODO Plan 06: send q='M-100!&|()' → expect 200 OK (no SQL exception)
    // and at minimum the M-100 SKU match.
  });
  it('SRCH-03: q shorter than 2 chars returns empty suggestions list', () => {
    // TODO Plan 06: q='M' → suggestions: [] (no DB hit).
  });
});
