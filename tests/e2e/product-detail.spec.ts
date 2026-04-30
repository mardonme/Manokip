// Plan 03-05 Task 5.3 — Flipped GREEN tests for CAT-06 + CAT-07 + CAT-08
// + SEO-01 + SEO-02 (product detail page).
// Plan 03-01 originally seeded these as test.skip RED stubs; Plan 06 closes
// the SRCH-04 search→redirect case which remains skipped here.
//
// Fixture seed slug: `manometr-m-100` for uz (per tests/fixtures/seed-public.ts).
// Seeded uz name: "Manometr M-100".
//
// REQUIRES: tests/fixtures/seed-public.ts seedPublicFixture() must have run
// against the same Neon branch the BASE_URL backend points to. In CI the
// preview branch shares a Neon dev branch with the seed; locally the test
// runner can call seedPublicFixture() directly via setup.

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

// Pitfall #11 — Vercel Deployment Protection bypass passthrough.
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { 'x-vercel-protection-bypass': protectionBypass }
  : {};

test.describe('Product detail page (Plan 03-05)', () => {
  test('CAT-07: first-byte HTML response contains the product name (SSR not client-rendered)', async ({
    request,
  }) => {
    const r = await request.get(`${baseURL}/uz/products/manometr-m-100`, {
      headers: extraHeaders,
    });
    expect(r.status()).toBe(200);
    const html = await r.text();
    // SSR proof: the seeded uz name must appear in the first-byte HTML.
    expect(html).toMatch(/Manometr M-100/);
    // Page must emit at least one JSON-LD script.
    expect(html).toMatch(/<script type="application\/ld\+json">/);
  });

  test('CAT-06: product detail renders spec tables grouped + hero image', async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders(extraHeaders);
    await page.goto(`${baseURL}/uz/products/manometr-m-100`);
    await expect(page.getByTestId('product-name')).toBeVisible();
    // Spec table is rendered as a <table> inside [data-testid=spec-table].
    const specTable = page.getByTestId('spec-table');
    await expect(specTable).toBeVisible();
    const tables = specTable.locator('table');
    expect(await tables.count()).toBeGreaterThan(0);
    // Hero image is the first <img> in the gallery (CldImage renders <img>).
    const gallery = page.getByTestId('product-gallery');
    await expect(gallery).toBeVisible();
    const hero = gallery.locator('img').first();
    await expect(hero).toBeVisible();
  });

  test('CAT-08: Product JSON-LD does not include offers (D-08)', async ({
    request,
  }) => {
    const r = await request.get(`${baseURL}/uz/products/manometr-m-100`, {
      headers: extraHeaders,
    });
    const html = await r.text();
    // Match each <script type="application/ld+json">...</script> block. Use
    // a non-greedy capture so multiple JSON-LD scripts don't fuse together.
    const scripts = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ];
    expect(scripts.length).toBeGreaterThan(0);
    const parsed = scripts.map((m) => {
      // Reverse the XSS-hardening replace before JSON.parse.
      const raw = m[1]!.replace(/\\u003c/g, '<');
      return JSON.parse(raw) as Record<string, unknown>;
    });
    const productSchema = parsed.find((o) => o['@type'] === 'Product');
    expect(productSchema).toBeTruthy();
    expect(productSchema?.offers).toBeUndefined();
    // BreadcrumbList must also be present per D-09.
    const breadcrumbSchema = parsed.find(
      (o) => o['@type'] === 'BreadcrumbList',
    );
    expect(breadcrumbSchema).toBeTruthy();
  });

  test('SEO-01/02: product detail emits hreflang for uz/ru/en + x-default + canonical', async ({
    request,
  }) => {
    const r = await request.get(`${baseURL}/uz/products/manometr-m-100`, {
      headers: extraHeaders,
    });
    const html = await r.text();
    // Next.js renders hrefLang as `hrefLang="uz"`. Match either casing.
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+href[Ll]ang="uz"/);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+href[Ll]ang="ru"/);
    expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+href[Ll]ang="en"/);
    expect(html).toMatch(
      /<link[^>]+rel="alternate"[^>]+href[Ll]ang="x-default"/,
    );
    expect(html).toMatch(/<link[^>]+rel="canonical"/);
  });
});

// Plan 03-06 — SRCH-04 GREEN gates flipped from .skip to active. The search
// results page (src/app/[locale]/search/page.tsx) calls skuExactMatch BEFORE
// rendering and redirect()s when the trimmed lowercase SKU matches a
// published product. Both case variants exercise D-07.

test.describe('Search SKU short-circuit (Plan 03-06)', () => {
  test('SRCH-04: visiting /uz/search?q=M-100 302-redirects to /uz/products/manometr-m-100 (D-07)', async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders(extraHeaders);
    await page.goto(`${baseURL}/uz/search?q=M-100`);
    // After redirect the final URL is the uz product detail page for M-100.
    await expect(page).toHaveURL(/\/uz\/products\/[^/?#]+/);
    await expect(page.getByTestId('product-name')).toBeVisible();
  });

  test('SRCH-04: SKU match is case-insensitive — q=m-100 also redirects', async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders(extraHeaders);
    await page.goto(`${baseURL}/uz/search?q=m-100`);
    await expect(page).toHaveURL(/\/uz\/products\/[^/?#]+/);
    await expect(page.getByTestId('product-name')).toBeVisible();
  });

  test('SRCH-01: search for "manometr" renders results grid with manufacturer chip (D-06)', async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders(extraHeaders);
    await page.goto(`${baseURL}/uz/search?q=manometr`);
    // The results grid should be visible (the search-no-results message is
    // present only when result.rows.length === 0, so we assert results-grid).
    await expect(page.getByTestId('search-results')).toBeVisible();
    // ProductCard renders manufacturerName as a chip — at least one of the
    // seeded manufacturer names must appear inside the search-results region.
    const results = page.getByTestId('search-results');
    await expect(results).toContainText(/WIKA|BD Sensors|Метран/);
  });
});
