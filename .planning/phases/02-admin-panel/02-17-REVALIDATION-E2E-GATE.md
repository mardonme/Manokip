---
phase: 02-admin-panel
plan: 17
type: execute
wave: 4
depends_on: [09, 13]
files_modified:
  - tests/e2e/admin-edit-revalidates.spec.ts
  - tests/e2e/admin-session-cap.spec.ts
  - .github/workflows/e2e-preview.yml
  - playwright.config.ts
autonomous: false
requirements: [OPS-01, ADMIN-01]
must_haves:
  truths:
    - "Playwright spec runs against Vercel preview URL: admin logs in via DB-direct verification_token (Pitfall #12) → edits a seed product's UZ name → reloads the public detail URL → asserts new name is visible within 5s"
    - "GitHub Actions workflow waits for Vercel preview ready, runs the spec with BASE_URL=$PREVIEW_URL, blocks merge on failure"
    - "admin-session-cap.spec.ts (plan 02-03) flipped from fixme → live, using the createActiveAdminSession fixture"
    - "Vercel Deployment Protection on previews disabled OR x-vercel-protection-bypass header threaded through Playwright (Pitfall #11)"
  artifacts:
    - path: "tests/e2e/admin-edit-revalidates.spec.ts"
      provides: "OPS-01 e2e gate"
      contains: "verification_tokens"
    - path: ".github/workflows/e2e-preview.yml"
      provides: "GH Actions workflow waiting for Vercel preview + running spec"
      contains: "wait-for-vercel-preview"
  key_links:
    - from: ".github/workflows/e2e-preview.yml"
      to: "tests/e2e/admin-edit-revalidates.spec.ts"
      via: "pnpm playwright test --grep \"OPS-01\""
      pattern: "playwright test"
---

<objective>
Land the OPS-01 gate: a Playwright spec that proves edit-then-refresh revalidation works end-to-end against a real Vercel preview deployment, plus a GitHub Actions workflow that runs it on every PR. This IS the definition-of-done for OPS-01 per CONTEXT D-13.

Purpose: OPS-01 + ADMIN-01 (login flow) end-to-end. The gate blocks merge of any PR whose Server Action forgets a `revalidateTag` call (Pitfall #3 — silent failure).
Output: 2 e2e specs (1 new, 1 flipped from fixme) + 1 GH Actions workflow + Playwright config edits.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@CLAUDE.md
@playwright.config.ts
@tests/e2e/admin-gate.spec.ts
@tests/e2e/magic-link-login.spec.ts
@tests/e2e/admin-session-cap.spec.ts
@tests/_fixtures/admin-session.ts
@tests/_fixtures/seed-products.ts
@tests/_fixtures/db.ts

<assumptions>
- **Pitfall #12 (magic-link inbox in CI):** Locked — DB-direct token consumption. The CI Playwright spec reads `verification_tokens` from Neon directly, constructs the magic-link URL, and follows it. Bypasses Resend.
- **Pitfall #11 (Vercel preview auth):** Need user input on whether Deployment Protection is OFF on previews (this checkpoint). If ON, use `x-vercel-protection-bypass` header.
- Phase 3 will ship the public product detail page; Phase 2's e2e spec must work BEFORE Phase 3. Workaround: assert against the admin product list page or against an RSC-rendered admin product preview that calls the same cached read pattern. The spec MUST be authored to assert the cache invalidation behavior in a way that survives Phase 3's later refinement.
</assumptions>
</context>

<tasks>

<task type="auto">
  <name>Task 17.1: Author admin-edit-revalidates.spec.ts (OPS-01 gate)</name>
  <files>tests/e2e/admin-edit-revalidates.spec.ts</files>
  <read_first>
    - tests/e2e/admin-gate.spec.ts (Phase-1 e2e shape)
    - tests/e2e/magic-link-login.spec.ts (login flow scaffold)
    - tests/_fixtures/admin-session.ts (from plan 02-04)
    - tests/_fixtures/seed-products.ts (from plan 02-13)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`tests/e2e/admin-edit-revalidates.spec.ts (OPS-01 — the gate)` — verbatim skeleton + DB-direct token pattern (Pitfall #12)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pitfall 11 (Vercel preview auth) and §Pitfall 12 (magic-link in CI)
  </read_first>
  <action>
    Create `tests/e2e/admin-edit-revalidates.spec.ts`:
    ```typescript
    import { test, expect } from "@playwright/test";
    import { sql } from "drizzle-orm";
    import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";
    import { seedProduct } from "../_fixtures/seed-products";

    const baseURL = process.env.BASE_URL || "http://localhost:3000";
    const adminEmail = process.env.E2E_ADMIN_EMAIL || "e2e-admin@manometr.uz";

    // Vercel deployment protection bypass header (Pitfall #11)
    const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    const extraHeaders = protectionBypass ? { "x-vercel-protection-bypass": protectionBypass } : {};

    test.describe.configure({ mode: "serial" });

    test("OPS-01: admin edits product name (uz) → public reload shows new name within 5s", async ({ page, context }) => {
      requireTestDatabaseUrl();
      const db = await getTestDb();

      // 1. seed: ensure admin_user(active=true) + product
      await db.execute(sql`
        INSERT INTO admin_user (email, role, active)
        VALUES (${adminEmail}, 'admin', true)
        ON CONFLICT (email) DO UPDATE SET active = true
      `);
      const seed = await seedProduct({ name: "ops01-original" });
      try {
        // 2. trigger sign-in to write a verification_tokens row (Pitfall #12: DB-direct, not Resend)
        await page.request.post(`${baseURL}/uz/login`, {
          form: { email: adminEmail, locale: "uz" },
          headers: extraHeaders,
        });

        // 3. read the verification token from DB
        const tokenRow = await db.execute(sql`
          SELECT identifier, token, expires
            FROM verification_tokens
           WHERE identifier = ${adminEmail}
           ORDER BY expires DESC LIMIT 1
        `);
        const tokenRecord = tokenRow.rows[0] as { identifier: string; token: string; expires: Date } | undefined;
        if (!tokenRecord) throw new Error("verification_tokens row missing — sign-in did not register");

        // 4. visit the magic-link callback URL
        const callbackUrl = `${baseURL}/api/auth/callback/resend?email=${encodeURIComponent(adminEmail)}&token=${encodeURIComponent(tokenRecord.token)}&callbackUrl=${encodeURIComponent("/uz/admin/products")}`;
        await page.goto(callbackUrl);
        await expect(page).toHaveURL(/\/uz\/admin\/products/);

        // 5. navigate to the seed product's edit page
        await page.goto(`${baseURL}/uz/admin/products/${seed.productId}/edit`);
        await page.waitForSelector('[data-testid="product-save"]');

        // 6. change the uz name input + save
        // Click the uz tab if needed
        const uzTab = page.locator('[data-testid="tab-uz"]');
        if (await uzTab.isVisible()) await uzTab.click();
        const nameInput = page.locator('input[name="translations.uz.name"]');
        await nameInput.fill("ops01-updated");
        await page.click('[data-testid="product-save"]');

        // 7. confirm save persisted
        await page.waitForResponse((res) => res.url().includes("/edit") || res.status() === 200);

        // 8. reload the public detail page (Phase 3 will own /uz/products/<slug>; for Phase 2,
        //    assert via the admin list which uses the same cache layer pattern)
        // For OPS-01 specifically, the gate is "edit-then-public-refresh shows new name".
        // If Phase 3 is not yet shipped, fall back to asserting the admin list page reflects
        // the new name within 5s (DataTable RSC reads via db, but list reads can be cached too).
        await page.goto(`${baseURL}/uz/admin/products`);
        const start = Date.now();
        let visible = false;
        while (Date.now() - start < 5000) {
          await page.reload();
          if (await page.getByText("ops01-updated").count() > 0) { visible = true; break; }
          await page.waitForTimeout(500);
        }
        expect(visible).toBe(true);

      } finally {
        await seed.cleanup();
        await db.execute(sql`DELETE FROM verification_tokens WHERE identifier = ${adminEmail}`);
      }
    });
    ```

    The test SHOULD be migrated in Phase 3 to assert against the public product detail URL once it ships. For Phase 2, asserting the admin list reflects the new name AFTER reload-with-cache-bust is the OPS-01 proof point (the same revalidateTag call powers both surfaces).

    If running locally fails because BASE_URL=http://localhost:3000 doesn't have a Vercel preview, the test is allowed to skip when `process.env.CI !== 'true'` AND `process.env.BASE_URL === 'http://localhost:3000'` — guard via `test.skip(condition, reason)`.
  </action>
  <verify>
    <automated>pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts --list</automated>
  </verify>
  <acceptance_criteria>
    - File exists; spec lists 1 test
    - `grep -c 'verification_tokens' tests/e2e/admin-edit-revalidates.spec.ts` returns `>=2`
    - `grep -c 'x-vercel-protection-bypass' tests/e2e/admin-edit-revalidates.spec.ts` returns `>=1`
    - `grep -c 'ops01-updated' tests/e2e/admin-edit-revalidates.spec.ts` returns `>=2`
    - `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts --list` exits 0
  </acceptance_criteria>
  <done>OPS-01 spec authored; ready to run against a Vercel preview.</done>
</task>

<task type="auto">
  <name>Task 17.2: Flip admin-session-cap.spec.ts from fixme → live tests</name>
  <files>tests/e2e/admin-session-cap.spec.ts</files>
  <read_first>
    - tests/e2e/admin-session-cap.spec.ts (from plan 02-03 — currently fixme)
    - tests/_fixtures/admin-session.ts (from plan 02-04 — exports createActiveAdminSession)
  </read_first>
  <action>
    Edit `tests/e2e/admin-session-cap.spec.ts`:
    1. Uncomment the fixture import: `import { createActiveAdminSession } from "../_fixtures/admin-session";`
    2. Replace `test.fixme(...)` with `test(...)` for both cases.
    3. Inside each test, call `createActiveAdminSession({ absoluteExpiresOffsetSec: -3600 })` and `createActiveAdminSession()` respectively.
    4. Add `try/finally` block that calls `session.cleanup()`.
  </action>
  <verify>
    <automated>pnpm playwright test tests/e2e/admin-session-cap.spec.ts --list</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'test.fixme' tests/e2e/admin-session-cap.spec.ts` returns `0`
    - `grep -c 'createActiveAdminSession' tests/e2e/admin-session-cap.spec.ts` returns `>=2`
    - `pnpm playwright test tests/e2e/admin-session-cap.spec.ts --list` lists 2 live tests (no fixme)
  </acceptance_criteria>
  <done>admin-session-cap.spec.ts flipped to live tests using fixture from plan 02-04.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 17.3: GH Actions workflow + Vercel preview auth decision</name>
  <what-built>
    `.github/workflows/e2e-preview.yml` configured to: (1) wait for Vercel preview ready (using `wait-for-vercel-preview` action or `vercel/preview-deployment` API), (2) run `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts` with `BASE_URL=$PREVIEW_URL`, (3) block merge on failure.

    Vercel Deployment Protection decision: either disabled on preview deployments (project settings) OR a Protection Bypass for Automation token is provisioned and stored as `VERCEL_AUTOMATION_BYPASS_SECRET` GH secret.
  </what-built>
  <how-to-verify>
    Claude proposes the YAML workflow file:
    ```yaml
    name: e2e-preview
    on:
      pull_request:
        types: [opened, synchronize, reopened]
    jobs:
      e2e:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: pnpm/action-setup@v4
            with: { version: 9 }
          - uses: actions/setup-node@v4
            with: { node-version: '20', cache: 'pnpm' }
          - run: pnpm install --frozen-lockfile
          - run: pnpm exec playwright install --with-deps chromium
          - name: Wait for Vercel preview
            id: wait
            uses: patrickedqvist/wait-for-vercel-preview@v1.3.1
            with:
              token: ${{ secrets.GITHUB_TOKEN }}
              max_timeout: 600
          - name: Run OPS-01 spec
            env:
              BASE_URL: ${{ steps.wait.outputs.url }}
              DATABASE_URL: ${{ secrets.DATABASE_URL }}
              DATABASE_URL_DIRECT: ${{ secrets.DATABASE_URL_DIRECT }}
              VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
              E2E_ADMIN_EMAIL: e2e-admin@manometr.uz
            run: pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts
    ```

    Human verifies:
    1. Vercel project settings: Deployment Protection on previews — either OFF (simpler) or configured with a Protection Bypass for Automation token. Pick one and document in SUMMARY.
    2. GH repo secrets: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `VERCEL_AUTOMATION_BYPASS_SECRET` (if needed) are present.
    3. Open a draft PR, push a commit, observe the workflow runs against the preview URL and asserts the OPS-01 spec.
    4. Force a regression locally (e.g., comment out `revalidateProduct(result.id)` in saveProduct) and re-trigger the workflow; the spec MUST fail. Restore + re-push to confirm green.
  </how-to-verify>
  <resume-signal>Type "approved" once the workflow runs green on a draft PR (and red when revalidate is removed). Type "deferred-cf" if Deployment Protection cannot be configured this iteration (document follow-up).</resume-signal>
  <acceptance_criteria>
    - File `.github/workflows/e2e-preview.yml` exists with the workflow above
    - GH Actions run on a draft PR completes the OPS-01 spec green
    - A commit removing `revalidateProduct(...)` from saveProduct causes the workflow to fail
    - Either Deployment Protection is OFF on previews OR `VERCEL_AUTOMATION_BYPASS_SECRET` is provisioned and the spec succeeds with the bypass header
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| GH Actions runner → Vercel preview | preview URL discovery + auth |
| GH Actions → Neon dev branch | DB-direct verification_tokens read |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-17-01 | Spoofing | preview URL hijack | mitigate | wait-for-vercel-preview uses GitHub deployment statuses (signed by GH); preview URL discovered via API |
| T-02-17-02 | Information Disclosure | DATABASE_URL in GH secrets | accept | Standard CI secret pattern; Neon dev branch isolated from prod |
| T-02-17-03 | Tampering | bypass token leak (Pitfall #11) | mitigate | VERCEL_AUTOMATION_BYPASS_SECRET stored as GH secret; never logged |
| T-02-17-04 | Spoofing | OPS-01 false positive (cache hit reused) | mitigate | spec calls page.reload() in a loop with timeout; only `expect(visible).toBe(true)` after reload-cycle |
| T-02-17-05 | Repudiation | merge proceeds despite gate failure | mitigate | GH Actions workflow `required` status check (configured at branch-protection level) |
</threat_model>

<verification>
- `pnpm playwright test tests/e2e/admin-edit-revalidates.spec.ts --list` exits 0 with 1 test
- `pnpm playwright test tests/e2e/admin-session-cap.spec.ts --list` exits 0 with 2 live tests (no fixme)
- Workflow runs green on a draft PR (manual verify)
- Workflow runs red when `revalidateProduct` is removed (manual regression test)
</verification>

<success_criteria>
1. OPS-01 spec authored; uses DB-direct verification_tokens (Pitfall #12).
2. admin-session-cap spec flipped to live tests.
3. GH Actions workflow waits for preview + runs OPS-01 spec.
4. Vercel deployment protection decision documented (OFF or bypass token).
5. Forced regression (removing revalidateProduct) breaks the gate.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-17-SUMMARY.md` documenting:
- The deployment-protection decision
- Forced-regression test outcome
- Note for Phase 3: migrate the spec's "reload" assertion from `/uz/admin/products` to `/uz/products/<slug>` once the public detail page ships.
</output>
