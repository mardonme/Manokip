// Plan 04-04 Task 4.4 — Playwright RED stubs for the public recipe detail page.
//
// Both specs ship as `test.fixme(...)` so Playwright enumerates them in
// `playwright test --list` but does not run them. They flip to live in 04-12
// (Wave 4 closure plan) once the public detail RSC + locale-fallback banner
// land.
//
// REQUIRES (when flipped): seedPhase4Content() against the Neon test branch
// the BASE_URL backend points to. Slugs hardcoded to match the deterministic
// fixture (uz-manometr-installation, etc.).

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

test.describe('Recipe detail page [RED — flips in 04-12]', () => {
  test.fixme(
    'visitor reads /uz/recipes/<slug> with prose body + JSON-LD TechArticle',
    async ({ page, request }) => {
      // FLIP-IN: 04-12-PLAN
      // const r = await request.get(`${baseURL}/uz/recipes/uz-manometr-installation`, { headers: extraHeaders });
      // expect(r.status()).toBe(200);
      // const html = await r.text();
      // expect(html).toMatch(/uz_Manometrni toʻgʻri oʻrnatish/);
      // expect(html).toMatch(/<script type="application\/ld\+json">/);
      // assert TechArticle JSON-LD shape (no offers field — D-08)
      void page; void request; void baseURL; void extraHeaders;
    },
  );

  test.fixme(
    'locale fallback shows banner when requested locale body is empty (D-05)',
    async ({ page }) => {
      // FLIP-IN: 04-12-PLAN
      // seed a recipe with uz body filled, en body null → visit /en/recipes/<slug>
      // assert banner with [data-testid=locale-fallback-banner] is visible
      // assert page renders the uz body (cascade fallback)
      void page;
    },
  );
});
