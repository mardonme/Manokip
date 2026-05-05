// FLIP-IN: 05-05-PLAN.md
//
// Plan 05-01 RED stub for DEF-4-12-03 — Cyrillic + Uzbek-Latin glyph render
// gate folded into Phase 5 e2e per CONTEXT D-13. Wave 3 plan 05-05 flips
// test.fixme → test() and asserts:
//   1. Uzbek Latin oʻ + gʻ (U+02BB MODIFIER LETTER TURNED COMMA) render in
//      the Inter font on /uz/categories — uses page.evaluate +
//      getComputedStyle('font-family') to assert the active font is Inter
//      (not a system fallback that lacks the U+02BB glyph).
//   2. Cyrillic glyphs render in Inter on /ru/products/<seed-slug> — same
//      computed-style assertion against ru-locale text.
//   3. English baseline ASCII renders in Inter on /en/contact (sanity).

import { test } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};
void extraHeaders;
void baseURL;

test.describe.configure({ mode: 'serial' });

test.describe('glyph render gate (DEF-4-12-03)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Glyph render gate requires a Vercel preview URL (set BASE_URL); local-fallback skip',
  );

  test.fixme(
    'Uzbek Latin oʻ + gʻ (U+02BB) render in Inter font on /uz/categories',
    async ({ page }) => {
      void page;
      // FLIP-IN 05-05 — assert the literal characters oʻ and gʻ appear in the
      // rendered page text AND getComputedStyle returns "Inter, ...".
    },
  );

  test.fixme(
    'Cyrillic glyphs render in Inter font on /ru/products/<seed-slug>',
    async ({ page }) => {
      void page;
      // FLIP-IN 05-05.
    },
  );

  test.fixme(
    'English baseline ASCII renders in Inter font on /en/contact',
    async ({ page }) => {
      void page;
      // FLIP-IN 05-05.
    },
  );
});
