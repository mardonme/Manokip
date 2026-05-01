// Plan 04-04 Task 4.4 — jsdom RED stub for the industry-form admin component.
//
// Mirror of recipe-form.test.tsx (same posture, same 2-spec grid). Lives in
// the `dom` Vitest project; flips to live in 04-08.
//
// FLIP-IN: 04-08-PLAN

import { describe, it, expect } from 'vitest';

describe('IndustryForm component [RED — flips in 04-08]', () => {
  it.skip(
    'renders 3-locale tabs (uz/ru/en) and swaps content on tab click without losing un-saved state',
    async () => {
      // FLIP-IN: 04-08-PLAN
      // const { IndustryForm } = await import('@/components/admin/industry-form');
      // render(<IndustryForm initial={...} ... />)
      // type into uz title → switch to ru → assert uz preserved; switch back; both preserved
      expect(true).toBe(true);
    },
  );

  it.skip(
    'mounts a Tiptap editor for the body field (rich-text, not plain textarea)',
    async () => {
      // FLIP-IN: 04-08-PLAN
      // render(<IndustryForm ... />)
      // assert body field has [data-tiptap-root] / ProseMirror class
      // assert insertImage button is wired to Cloudinary picker (mocked)
      expect(true).toBe(true);
    },
  );
});
