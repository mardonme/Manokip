// Plan 04-04 Task 4.4 — jsdom RED stub for the recipe-form admin component.
//
// Lives in the `dom` Vitest project. Specs are it.skip until 04-07 ships
// src/components/admin/recipe-form.tsx and flips them. Vitest 4 has no
// it.fixme — using it.skip per plan deviations Rule 1.
//
// Spec coverage (per RESEARCH §Test Map lines 985-997):
//   1. 3-locale tab swap — clicking uz/ru/en tabs swaps the visible
//      title/slug/excerpt/body inputs without losing un-saved state on
//      other tabs.
//   2. Tiptap editor mount — the body field renders a Tiptap editor (not
//      a plain <textarea>) and accepts insertImage from a Cloudinary picker.
//
// FLIP-IN: 04-07-PLAN

import { describe, it, expect } from 'vitest';

describe('RecipeForm component [RED — flips in 04-07]', () => {
  it.skip(
    'renders 3-locale tabs (uz/ru/en) and swaps content on tab click without losing un-saved state',
    async () => {
      // FLIP-IN: 04-07-PLAN
      // const { RecipeForm } = await import('@/components/admin/recipe-form');
      // render(<RecipeForm initial={...} categories={[]} ... />)
      // 1. type into uz title input → switch to ru tab → assert uz value preserved
      // 2. type into ru title → switch back to uz → both values still in form state
      // 3. assert tab list has aria-orientation + 3 tabs in DOM
      expect(true).toBe(true);
    },
  );

  it.skip(
    'mounts a Tiptap editor for the body field (rich-text, not plain textarea)',
    async () => {
      // FLIP-IN: 04-07-PLAN
      // render(<RecipeForm ... />)
      // assert body field has [data-tiptap-root] / ProseMirror class — NOT a textarea
      // assert insertImage button is wired to Cloudinary picker (mocked)
      expect(true).toBe(true);
    },
  );
});
