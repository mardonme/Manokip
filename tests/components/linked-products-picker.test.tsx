// Plan 04-04 Task 4.4 — jsdom RED stub for the LinkedProductsPicker component.
//
// Used by recipe-form + industry-form to select cross-link products. Spec
// shape per plan: client-side filter + multi-select.
//
// Lives in the `dom` Vitest project; flips to live in 04-07.
//
// FLIP-IN: 04-07-PLAN

import { describe, it, expect } from 'vitest';

describe('LinkedProductsPicker component [RED — flips in 04-07]', () => {
  it.skip(
    'filters product options client-side based on the search input',
    async () => {
      // FLIP-IN: 04-07-PLAN
      // const { LinkedProductsPicker } = await import('@/components/admin/linked-products-picker');
      // render(<LinkedProductsPicker products={[...6 seed products]} value={[]} onChange={fn} />)
      // 1. type "manometer" into the search box → assert only manometer-typed
      //    options remain visible (3 of 6)
      // 2. clear search → all 6 visible again
      expect(true).toBe(true);
    },
  );

  it.skip(
    'multi-select: clicking options toggles them in/out of the value array',
    async () => {
      // FLIP-IN: 04-07-PLAN
      // const onChange = vi.fn();
      // render(<LinkedProductsPicker products={[...]} value={[]} onChange={onChange} />)
      // click product A option → onChange called with [A]
      // click product B option → onChange called with [A, B]
      // click product A option again → onChange called with [B] (toggled out)
      expect(true).toBe(true);
    },
  );
});
