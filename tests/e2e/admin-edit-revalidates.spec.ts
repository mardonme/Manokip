// Plan 02-17 Task 17.1 — OPS-01 e2e gate.
//
// THE merge-blocking gate for "edit-then-public-refresh shows new content
// within 5 seconds." Designed to run against a real Vercel preview URL
// from the .github/workflows/e2e-preview.yml workflow (Task 17.3).
//
// What this spec proves end-to-end:
//   1. An admin can complete the magic-link login round-trip in CI without a
//      live Resend inbox — by reading the verification_tokens row directly
//      from Neon and following the /api/auth/callback/resend URL it implies
//      (Pitfall #12, RESEARCH §847-854).
//   2. The product editor's saveProduct Server Action (plan 02-13a) writes
//      a new uz name and the AFTER-tx revalidateProduct() call fires
//      correctly, so a subsequent reload of an admin RSC that reads the
//      same cache layer shows the new name within 5 seconds (Pitfall #2 +
//      Pitfall #3 — silent revalidate failure is the #1 silent-bug class
//      this gate is designed to catch).
//
// Pitfall #11 (Vercel Deployment Protection): if the Vercel project has
// preview Deployment Protection ON, set VERCEL_AUTOMATION_BYPASS_SECRET in
// the GH Actions workflow and the spec will thread it through every HTTP
// request and every page navigation as the `x-vercel-protection-bypass`
// header. If protection is OFF on previews, the env var is unset and the
// header object is empty.
//
// Phase scope note (RESEARCH assumption A2 + 02-PATTERNS §1002-1019):
// Phase 3 will own /uz/products/<slug> (the public product detail page).
// Until then, the OPS-01 gate asserts the new name is visible on the admin
// list page (/uz/admin/products), which reads through the SAME cache layer
// that revalidateProduct() invalidates — Pitfall #3 silent-bug detection
// works identically on either surface. When Phase 3 ships, migrate the
// reload assertion below to `${baseURL}/uz/products/${seed.slug}` (one-line
// change: replace the goto target).
//
// Local-fallback skip: this spec depends on a Vercel preview URL because
// it asserts CACHE invalidation that doesn't behave the same way on
// `next dev`. When BASE_URL is the local dev server (or unset), the test
// skips with a documented reason rather than producing a false-negative.
// In CI the BASE_URL env var is the wait-for-vercel-preview output; the
// skip gate is bypassed.

import { test, expect } from "@playwright/test";
import { sql } from "drizzle-orm";
import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";
import { seedProduct } from "../_fixtures/seed-products";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@manometr.uz";

// Pitfall #11 — Vercel Deployment Protection bypass. When set, every
// playwright HTTP and page navigation includes `x-vercel-protection-bypass`.
// When unset (Deployment Protection OFF on previews), `extraHeaders` is the
// empty object and Playwright sends no extra headers — same posture as the
// rest of the e2e suite.
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { "x-vercel-protection-bypass": protectionBypass }
  : {};

// Tests in this file are intentionally serial: they share a Neon dev branch
// and one logged-in admin context. Parallelism would require per-worker
// admin emails + per-worker session pools — overkill for a single OPS-01
// probe.
test.describe.configure({ mode: "serial" });

test.describe("OPS-01: admin edit → public refresh revalidation gate", () => {
  // Local-only skip (CI is the deployment-protection-aware path).
  test.skip(
    process.env.CI !== "true" && baseURL === "http://localhost:3000",
    "OPS-01 gate requires a Vercel preview URL (set BASE_URL); local-fallback skip",
  );

  test("admin edits product name (uz) → admin list reload shows new name within 5s", async ({
    page,
  }) => {
    requireTestDatabaseUrl();
    const db = await getTestDb();

    // 1. seed: admin_user(active=true) + a product whose uz name we will edit.
    //    The fixture cleanup at finally{} drops every row this test inserts.
    await db.execute(sql`
      INSERT INTO admin_user (email, role, active)
      VALUES (${adminEmail}, 'admin', true)
      ON CONFLICT (email) DO UPDATE SET active = true, role = 'admin'
    `);
    const seed = await seedProduct({ name: "ops01-original" });

    try {
      // 2. trigger sign-in to write a verification_tokens row. We POST
      //    multipart/form-data to /uz/login the same way the LoginForm's
      //    useActionState submit would. Auth.js's Resend provider writes a
      //    verification_tokens(identifier, token, expires) row even when the
      //    Resend send is mocked — RESEARCH §Pitfall 12 DB-direct path.
      await page.request.post(`${baseURL}/uz/login`, {
        form: { email: adminEmail, locale: "uz" },
        headers: extraHeaders,
        maxRedirects: 0,
      });

      // 3. read the verification token DB-direct (Pitfall #12 — bypasses
      //    Resend; production deliverability is NOT exercised by OPS-01,
      //    that's outside this gate's scope).
      const tokenRow = await db.execute(sql`
        SELECT identifier, token, expires
          FROM verification_tokens
         WHERE identifier = ${adminEmail}
         ORDER BY expires DESC
         LIMIT 1
      `);
      const tokenRecord = tokenRow.rows[0] as
        | { identifier: string; token: string; expires: Date }
        | undefined;
      if (!tokenRecord) {
        throw new Error(
          "verification_tokens row missing — sign-in did not register a token. " +
            "Either sendVerificationRequest short-circuited (admin not in admin_user) " +
            "or the Resend provider is misconfigured.",
        );
      }

      // 4. follow the magic-link callback URL Auth.js Resend would have sent.
      //    The URL shape is the documented Auth.js v5 Resend provider
      //    callback: GET /api/auth/callback/resend?email=...&token=...
      //    On success, Auth.js sets the session cookie and redirects to
      //    callbackUrl (we want /uz/admin/products).
      const callbackParams = new URLSearchParams({
        callbackUrl: `${baseURL}/uz/admin/products`,
        token: tokenRecord.token,
        email: adminEmail,
      });
      const callbackUrl = `${baseURL}/api/auth/callback/resend?${callbackParams.toString()}`;

      // Inject the protection-bypass header for the page navigation. (HTTP
      // request-level extraHTTPHeaders applies to page.goto() too when set
      // on the context — but Playwright's `page.context().setExtraHTTPHeaders`
      // is the reliable knob.)
      await page.context().setExtraHTTPHeaders(extraHeaders);
      await page.goto(callbackUrl);
      await expect(page).toHaveURL(/\/uz\/admin\/products/);

      // 5. navigate to the seeded product's edit page (slug-rendered URL is
      //    /uz/admin/products/<id>/edit per src/app/[locale]/admin/products/[id]/edit).
      await page.goto(`${baseURL}/uz/admin/products/${seed.productId}/edit`);
      await page.waitForSelector('[data-testid="product-save"]');

      // 6. swap the uz tab if it's not already active, then update the uz
      //    name input. The form registers translations.<locale>.name via
      //    SlugInput; RHF emits `name="translations.uz.name"` on the <input>.
      const uzTab = page.locator('[data-testid="tab-uz"]');
      if (await uzTab.isVisible()) {
        await uzTab.click();
      }
      const nameInput = page.locator('input[name="translations.uz.name"]');
      await nameInput.waitFor({ state: "visible" });
      await nameInput.fill("ops01-updated");

      // Click Save and wait for the Server Action to settle. saveProduct
      // (plan 02-13a) calls revalidateProduct() AFTER tx.commit; if that
      // call is missing/broken (Pitfall #3 silent failure), step 8 below
      // will not see the new name within 5 seconds and the test fails.
      await page.click('[data-testid="product-save"]');
      // The Server Action's response is internal to RHF + nuqs; wait for
      // the Save button's pending state to clear by polling the input value
      // (a heuristic — RHF disables the Save button while submitting).
      await page.waitForFunction(
        () => {
          const btn = document.querySelector(
            '[data-testid="product-save"]',
          ) as HTMLButtonElement | null;
          return btn !== null && !btn.disabled;
        },
        { timeout: 10_000 },
      );

      // 7. reload the admin list (the SAME RSC that's read-cached behind
      //    revalidateTag('products-list')). If revalidateProduct() fired,
      //    the new name is visible within 5 seconds. If it didn't fire, the
      //    cached list keeps showing 'ops01-original' until the natural ISR
      //    expiry — well past the 5-second budget.
      //
      //    Phase-3 migration note (see file header): replace this goto with
      //    `${baseURL}/uz/products/${seed.slug}` once the public detail page
      //    ships. The 5-second budget + reload-loop assertion stays.
      await page.goto(`${baseURL}/uz/admin/products`);
      const start = Date.now();
      let visible = false;
      while (Date.now() - start < 5_000) {
        if ((await page.getByText("ops01-updated").count()) > 0) {
          visible = true;
          break;
        }
        await page.waitForTimeout(500);
        await page.reload();
      }
      expect(
        visible,
        "saveProduct's revalidateProduct() did not invalidate the products-list cache within 5s — " +
          "OPS-01 gate FAILED. Either revalidateProduct() was removed (Pitfall #3) or " +
          "the cache layer behaved unexpectedly. Diagnose by checking the saveProduct call site.",
      ).toBe(true);
    } finally {
      // Cleanup in reverse FK order. seedProduct.cleanup() drops product +
      // translations + spec values + audit rows scoped to the product/category.
      // We additionally drop the verification_tokens rows we created and the
      // admin_user row if it was created by this test (idempotent ON CONFLICT
      // DO UPDATE means we may have only updated an existing row — leaving
      // the admin_user behind is harmless across runs; deleting it would be
      // wrong if a developer's bootstrap-admin email happens to collide).
      await seed.cleanup();
      await db.execute(
        sql`DELETE FROM verification_tokens WHERE identifier = ${adminEmail}`,
      );
    }
  });
});
