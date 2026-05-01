// Plan 04-04 Task 4.4 — Playwright RED stubs for the public industry detail page.
//
// Mirror of recipe-detail.spec.ts. Flips to live in 04-12.

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

test.describe('Industry detail page [RED — flips in 04-12]', () => {
  test.fixme(
    'visitor reads /uz/industries/<slug> with prose body + JSON-LD TechArticle',
    async ({ page, request }) => {
      // FLIP-IN: 04-12-PLAN
      // request /uz/industries/uz-oil-and-gas → 200, HTML contains uz_Neft va gaz sanoati
      // assert at least one <script type="application/ld+json"> emitted (TechArticle, no offers)
      void page; void request; void baseURL; void extraHeaders;
    },
  );

  test.fixme(
    'locale fallback shows banner when requested locale body is empty (D-05)',
    async ({ page }) => {
      // FLIP-IN: 04-12-PLAN
      // seed industry uz=filled, en=null → visit /en/industries/<slug>
      // assert [data-testid=locale-fallback-banner] visible + uz body rendered
      void page;
    },
  );
});
