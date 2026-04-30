// Plan 03-07 Task 7.3 — MFG-01 + MFG-02 e2e specs (flipped from RED stubs).
//
// Closes the Wave-0 stubs by exercising the real /[locale]/manufacturers
// index + /[locale]/manufacturers/<slug> detail pages built in Task 7.2.
//
// Requires:
//   - tests/fixtures/seed-public.ts seed run before tests (Plan 02 fixture
//     extension wired is_official_rep=true on WIKA + per-locale
//     relationship_note + image_public_ids)
//   - BASE_URL env or `pnpm start` on :3000
//   - Vercel deployment-protection bypass header passed through when running
//     against a preview deployment

import { test, expect } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

const bypassHeaders: Record<string, string> = process.env.VERCEL_PROTECTION_BYPASS
  ? {
      'x-vercel-protection-bypass': process.env.VERCEL_PROTECTION_BYPASS,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : {};

test.describe('MFG-01 + MFG-02: public manufacturer pages (Plan 03-07)', () => {
  test('MFG-01: /uz/manufacturers index renders ≥3 manufacturer cards', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders(bypassHeaders);
    await page.goto(`${baseURL}/uz/manufacturers`);
    const list = page.getByTestId('manufacturers-list');
    await expect(list).toBeVisible();
    const cards = list.locator('a[data-testid^="manufacturer-card-"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test('MFG-01: WIKA card shows Authorized badge (is_official_rep=true)', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders(bypassHeaders);
    await page.goto(`${baseURL}/uz/manufacturers`);
    const wikaCard = page.getByTestId('manufacturer-card-wika');
    await expect(wikaCard).toBeVisible();
    // Badge label varies per locale (uz=Vakolatli / ru=Авторизованный /
    // en=Authorized) — match all 3 to keep the spec locale-agnostic if the
    // index ever defaults differently.
    await expect(
      wikaCard.locator('text=/Авторизованный|Authorized|Vakolatli/'),
    ).toBeVisible();
  });

  test('MFG-02: /uz/manufacturers/wika detail renders Verified badge + relationship note + scoped product grid', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders(bypassHeaders);
    await page.goto(`${baseURL}/uz/manufacturers/wika`);

    // Verified badge fires off is_official_rep=true (D-11).
    await expect(page.getByTestId('verified-badge')).toBeVisible();

    // Per-locale relationship note rendered (uz: "WIKA ning Oʻzbekistondagi
    // rasmiy vakili 2019-yildan beri" per seed-public.ts).
    await expect(page.getByTestId('relationship-note')).toBeVisible();

    // Products heading visible (count varies by seed — at least 1).
    await expect(page.getByTestId('products-heading')).toBeVisible();

    // Product grid scoped to WIKA — seed assigns M-100 + T-100 to WIKA per
    // round-robin, so expect ≥2 product cards.
    const products = page
      .getByTestId('manufacturer-products')
      .locator('a[href*="/uz/products/"]');
    expect(await products.count()).toBeGreaterThanOrEqual(2);
  });

  test('MFG-02: detail page emits BreadcrumbList JSON-LD with ≥3 items', async ({
    request,
  }) => {
    const r = await request.get(`${baseURL}/uz/manufacturers/wika`, {
      headers: bypassHeaders,
    });
    expect(r.ok()).toBe(true);
    const html = await r.text();

    // Pull every <script type="application/ld+json">…</script> block.
    const matches = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    );
    expect(matches, 'expected at least one JSON-LD <script> tag').toBeTruthy();
    const blocks = (matches ?? []).map((s) =>
      s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''),
    );

    // Reverse the XSS hardening (`<` → `<`) so JSON.parse succeeds.
    const schemas: unknown[] = [];
    for (const raw of blocks) {
      try {
        schemas.push(JSON.parse(raw.replace(/\\u003c/g, '<')));
      } catch {
        // Fragment was not JSON (next-intl emits rich-text payloads in some
        // configs); skip and continue.
      }
    }

    const breadcrumb = schemas.find(
      (s): s is { '@type': string; itemListElement: unknown[] } =>
        typeof s === 'object' &&
        s !== null &&
        (s as { '@type'?: string })['@type'] === 'BreadcrumbList',
    );
    expect(breadcrumb, 'expected BreadcrumbList JSON-LD').toBeTruthy();
    expect(breadcrumb!.itemListElement.length).toBeGreaterThanOrEqual(3);
  });
});
