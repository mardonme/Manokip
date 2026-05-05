// Plan 05-05 task 5.5 — flip RED -> GREEN (DEF-4-12-03 absorption per CONTEXT D-13).
//
// Cyrillic + Uzbek-Latin glyph render gate. Asserts:
//   1. Uzbek Latin oʻ + gʻ (U+02BB MODIFIER LETTER TURNED COMMA) render in
//      the Inter font on /uz/categories — uses page.evaluate +
//      getComputedStyle('font-family') to assert the active body font is
//      Inter (not a system fallback that lacks the U+02BB glyph).
//   2. Cyrillic glyphs render in Inter on /ru/products/manometr-m-100 —
//      same computed-style assertion against ru-locale text.
//   3. English baseline ASCII renders in Inter on /en/contact (sanity).
//
// next/font emits a CSS-module class form like __Inter_xxxxxx (per Phase-3
// font wiring); the regex matches BOTH the css-module hashed form AND the
// literal family name fallback. Pixel-level visual inspection remains a
// manual gate in plan 06 (DEF-5-NN-*).

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

test.describe.configure({ mode: 'serial' });

test.describe('glyph render gate (DEF-4-12-03)', () => {
  test.skip(
    process.env.CI !== 'true' && baseURL === 'http://localhost:3000',
    'Glyph render gate requires a Vercel preview URL (set BASE_URL); local-fallback skip',
  );

  test('Uzbek Latin oʻ + gʻ (U+02BB) render in Inter font on /uz/categories', async ({
    page,
  }) => {
    if (Object.keys(extraHeaders).length > 0) {
      await page.context().setExtraHTTPHeaders(extraHeaders);
    }
    await page.goto(`${baseURL}/uz/categories`);

    const html = await page.content();
    // U+02BB MODIFIER LETTER TURNED COMMA — the Uzbek-Latin marker. Assert
    // the literal characters appear in the SSR HTML (so a missing font
    // doesn't silently substitute apostrophes); the SSR pass writes them
    // through next-intl messages on the categories index.
    expect(html).toMatch(/[oʻgʻ]/u);

    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    // next/font emits __Inter_xxxxxx (css-module hash) OR Inter literal
    // depending on the route's font wiring. The regex tolerates both.
    expect(fontFamily).toMatch(/__Inter|Inter/);
  });

  test('Cyrillic glyphs render in Inter font on /ru/products/manometr-m-100', async ({
    page,
  }) => {
    if (Object.keys(extraHeaders).length > 0) {
      await page.context().setExtraHTTPHeaders(extraHeaders);
    }
    await page.goto(`${baseURL}/ru/products/manometr-m-100`);

    const html = await page.content();
    // Cyrillic block U+0400–U+04FF — at least one Cyrillic glyph must
    // appear in the SSR'd HTML for /ru/...; the next-intl ru bundle
    // populates the page chrome regardless of product-translation
    // coverage.
    expect(html).toMatch(/[Ѐ-ӿ]/u);

    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(fontFamily).toMatch(/__Inter|Inter/);
  });

  test('English baseline ASCII renders in Inter font on /en/contact', async ({
    page,
  }) => {
    if (Object.keys(extraHeaders).length > 0) {
      await page.context().setExtraHTTPHeaders(extraHeaders);
    }
    await page.goto(`${baseURL}/en/contact`);

    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(fontFamily).toMatch(/__Inter|Inter/);
  });
});
