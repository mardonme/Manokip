---
phase: 02-admin-panel
plan: 14
type: execute
wave: 5
depends_on: [10, 13b]
files_modified:
  - src/app/[locale]/admin/products/product-form.tsx
  - src/app/api/cloudinary/sign/route.ts
  - tests/components/media-uploader.test.tsx
autonomous: false
requirements: [ADMIN-07, ADMIN-11, OPS-01]
must_haves:
  truths:
    - "Product editor uses MediaUploader (mode='multi', folder='products') for images and (mode='multi', folder='datasheets', accept='pdf') for datasheets"
    - "DB stores ONLY public_id arrays; bytes never traverse Vercel"
    - "/api/cloudinary/sign endpoint signs ONLY the params the widget actually sends; an explicit smoke checkpoint (Task 14.0) yields PARITY-OK or PARITY-MISMATCH before downstream tasks proceed (Pitfall #5)"
    - "Reordering via dnd-kit persists on save (sort order is the array index)"
    - "Vitest+jsdom unit test mocks CldUploadWidget and asserts MediaUploader appends a public_id on widget onSuccess"
  artifacts:
    - path: "src/app/[locale]/admin/products/product-form.tsx"
      provides: "Confirmed wiring of two MediaUploader instances"
      contains: "MediaUploader"
    - path: "src/app/api/cloudinary/sign/route.ts"
      provides: "If smoke checkpoint returns PARITY-MISMATCH, widen bodySchema to accept paramsToSign"
      contains: "paramsToSign"
  key_links:
    - from: "src/components/admin/media-uploader.tsx (plan 02-10)"
      to: "/api/cloudinary/sign"
      via: "signatureEndpoint prop"
      pattern: "signatureEndpoint=\"/api/cloudinary/sign\""
---

<objective>
Confirm the media upload flow end-to-end on the product editor: images + datasheets via signed direct upload, dnd-kit reorder, public_id-only persistence. Investigate and resolve any Cloudinary signature mismatch (Pitfall #5) by running an explicit signature-parity smoke checkpoint (Task 14.0) and widening the sign endpoint only if the smoke checkpoint reports PARITY-MISMATCH.

Purpose: ADMIN-07 — the only requirement that's NOT covered by plan 02-13's structural wiring (which uses MediaUploader from plan 02-10 already). This plan is the "smoke test + harden" pass for media specifically. Depends on 13b's product editor pages being live so the smoke checkpoint has a real form to upload through.
Output: Explicit smoke checkpoint outcome (PARITY-OK | PARITY-MISMATCH) + confirmed wiring + (conditionally) widened sign endpoint + unit test of widget handler.
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
@src/components/admin/media-uploader.tsx
@src/app/api/cloudinary/sign/route.ts
@src/app/[locale]/admin/products/product-form.tsx
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 14.0: Cloudinary signature parity smoke test</name>
  <read_first>
    - src/app/api/cloudinary/sign/route.ts (Phase-1 endpoint — currently signs `{ folder, timestamp }` only)
    - src/components/admin/media-uploader.tsx (from plan 02-10 — wires CldUploadWidget with signatureEndpoint)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pitfall 5 (Cloudinary signature parity — exact param-set the widget sends vs what we sign)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/components/admin/media-uploader.tsx` Pitfall §5 note
  </read_first>
  <what-built>
    Nothing has been built in this task — this is a pre-implementation gate. Claude has set up a Vercel preview deployment with the current widget config (the existing `media-uploader.tsx` from plan 02-10 wired into the Manufacturer-edit page from plan 02-10 OR the Product-edit page from plan 02-13b once wave 4 ships).
  </what-built>
  <action>
    Deploy a Vercel preview with the current widget config; sign-in as admin; open the Manufacturer-edit page (or Product-edit page once 13b is live); click the upload trigger; attempt to upload one test image. Observe the Cloudinary widget response (Network tab + widget UI).
  </action>
  <how-to-verify>
    Human verifies (or Claude reports if running interactively in a session with browser access):

    1. Open the Vercel preview URL for the current branch and sign in as an admin (DB-direct token consumption from Phase-1 magic-link helper, OR an active session created via `tests/_fixtures/admin-session.ts`).
    2. Navigate to the Manufacturer-edit page (logo upload — already shipped in plan 02-10) OR the Product-edit page once 13b's wave 4 is live (image upload).
    3. Click the upload trigger button (e.g. "Add images" / "Upload logo"). The Cloudinary widget should appear.
    4. Pick one small test image (jpg/png, &lt; 1 MB). Click upload.
    5. Observe network tab + widget UI:
       - **Pass case (PARITY-OK):** Cloudinary returns HTTP 200; widget reports success; the form's hidden `imagePublicIds` / `logoPublicId` field gets populated; no "Invalid Signature" error in the widget banner.
       - **Fail case (PARITY-MISMATCH):** Cloudinary returns HTTP 401 with body containing `"Invalid Signature"`, OR the widget banner shows "Upload failed: Invalid Signature". Inspect the POST to `/api/cloudinary/sign` and the subsequent Cloudinary upload request to compare signed-param-set vs. actually-sent-param-set.

    Document the outcome verbatim in the resume signal.
  </how-to-verify>
  <acceptance_criteria>
    - **If the upload succeeds with HTTP 200:** report **"PARITY-OK"** in the resume signal. Task 14.1 then proceeds without widening `bodySchema`. Task 14.2 confirms the existing `tests/api/cloudinary-sign.test.ts` (9 tests from Phase 1) still passes.
    - **If Cloudinary returns "Invalid Signature" / 401:** report **"PARITY-MISMATCH"** in the resume signal AND include the exact param keys observed in the widget's upload request that are absent from `/api/cloudinary/sign`'s current signed set (e.g., `source`, `resource_type`, `eager`, `tags`). Task 14.1 then widens `bodySchema` to include those additional widget params and re-signs them; Task 14.2 adds a regression test asserting `paramsToSign` is included in the signed string.
  </acceptance_criteria>
  <resume-signal>Type "PARITY-OK" if the smoke upload succeeded; type "PARITY-MISMATCH: &lt;list-of-missing-params&gt;" if the upload failed with Invalid Signature. Either way, include a short note for SUMMARY documenting the observed widget-sent param-set.</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 14.1: Vitest+jsdom unit test for MediaUploader handler</name>
  <files>tests/components/media-uploader.test.tsx</files>
  <read_first>
    - src/components/admin/media-uploader.tsx (from plan 02-10)
    - tests/api/cloudinary-sign.test.ts (Phase-1 vi.mock pattern)
    - .planning/phases/02-admin-panel/02-VALIDATION.md §Per-Task Verification Map (ADMIN-07 unit test)
    - Task 14.0 resume-signal outcome (PARITY-OK or PARITY-MISMATCH) — drives whether Task 14.2 widens the sign endpoint
  </read_first>
  <behavior>
    - Mock `next-cloudinary`'s `CldUploadWidget` with a child render-prop that immediately invokes `onSuccess({ info: { public_id: 'fake/abc' } })` when its render-prop's `open` callback fires.
    - Render `<MediaUploader name="imagePublicIds" mode="multi" />` inside a FormProvider with `useForm({ defaultValues: { imagePublicIds: [] } })`.
    - Assert: after clicking the rendered "Add images" button, the form's `imagePublicIds` array contains `[{ publicId: 'fake/abc' }]`.
  </behavior>
  <action>
    Create `tests/components/media-uploader.test.tsx`:
    ```tsx
    import { describe, it, expect, vi } from "vitest";
    import { render, screen, fireEvent, waitFor } from "@testing-library/react";
    import { FormProvider, useForm } from "react-hook-form";
    import { MediaUploader } from "@/components/admin/media-uploader";

    vi.mock("next-cloudinary", () => {
      let lastSuccess: ((r: { info: { public_id: string } }) => void) | null = null;
      return {
        CldUploadWidget: ({ children, onSuccess }: { children: (api: { open: () => void }) => React.ReactNode; onSuccess: (r: { info: { public_id: string } }) => void }) => {
          lastSuccess = onSuccess;
          return children({
            open: () => lastSuccess?.({ info: { public_id: `fake/${Date.now()}` } }),
          });
        },
        CldImage: () => null,
      };
    });

    function Wrapper({ children, defaultValues }: { children: React.ReactNode; defaultValues: Record<string, unknown> }) {
      const form = useForm({ defaultValues });
      return (
        <FormProvider {...form}>
          {children}
          <button data-testid="dump" type="button" onClick={() => {
            (window as unknown as { __vals: unknown }).__vals = form.getValues();
          }}>dump</button>
        </FormProvider>
      );
    }

    describe("MediaUploader", () => {
      it("appends a public_id to the field array on widget onSuccess (multi mode)", async () => {
        render(
          <Wrapper defaultValues={{ imagePublicIds: [] }}>
            <MediaUploader name="imagePublicIds" mode="multi" />
          </Wrapper>,
        );
        fireEvent.click(screen.getByRole("button", { name: /add images/i }));
        fireEvent.click(screen.getByTestId("dump"));
        await waitFor(() => {
          const v = (window as unknown as { __vals: { imagePublicIds: Array<{ publicId: string }> } }).__vals;
          expect(v.imagePublicIds).toHaveLength(1);
          expect(v.imagePublicIds[0].publicId).toMatch(/^fake\//);
        });
      });

      it("sets a single public_id field in single mode", async () => {
        render(
          <Wrapper defaultValues={{ logoPublicId: null }}>
            <MediaUploader name="logoPublicId" mode="single" />
          </Wrapper>,
        );
        fireEvent.click(screen.getByRole("button", { name: /upload/i }));
        fireEvent.click(screen.getByTestId("dump"));
        await waitFor(() => {
          const v = (window as unknown as { __vals: { logoPublicId: string | null } }).__vals;
          expect(v.logoPublicId).toMatch(/^fake\//);
        });
      });
    });
    ```
  </action>
  <verify>
    <automated>pnpm vitest run tests/components/media-uploader.test.tsx --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm vitest run tests/components/media-uploader.test.tsx` exits 0; 2/2 tests pass
    - File exists with both single + multi mode tests
  </acceptance_criteria>
  <done>MediaUploader handler unit-tested with mocked widget.</done>
</task>

<task type="auto">
  <name>Task 14.2: Apply signature-parity outcome (no-op OR widen sign endpoint)</name>
  <files>src/app/api/cloudinary/sign/route.ts</files>
  <read_first>
    - src/app/api/cloudinary/sign/route.ts (Phase-1 — currently signs `{ folder, timestamp }` only)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 3 + §Pitfall 5
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/components/admin/media-uploader.tsx` Pitfall §5 note
    - Task 14.0 resume-signal outcome (PARITY-OK or PARITY-MISMATCH)
  </read_first>
  <behavior>
    - **If Task 14.0 resolved PARITY-OK:** No code change. Re-run all `tests/api/cloudinary-sign.test.ts` to confirm Phase-1 baseline still passes (9/9). Document in SUMMARY that paramsToSign was not needed.
    - **If Task 14.0 resolved PARITY-MISMATCH:** Widen `bodySchema` per PATTERNS guidance:
      ```typescript
      const bodySchema = z.object({
        folder: z.string().regex(/^[a-z0-9_/-]+$/),
        paramsToSign: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      });
      ```
      Pass `paramsToSign` (merged with `{ folder, timestamp }`) into `cloudinary.utils.api_sign_request(allParams, secret)`.
  </behavior>
  <action>
    Branch on Task 14.0's resume-signal:

    **PARITY-OK branch:** Leave the endpoint untouched, document in SUMMARY that paramsToSign was not needed. Re-run `pnpm vitest run tests/api/cloudinary-sign.test.ts` to confirm regressions are absent.

    **PARITY-MISMATCH branch:**
    1. Update `src/app/api/cloudinary/sign/route.ts` bodySchema to accept optional `paramsToSign`.
    2. Build the merged param set: `{ ...paramsToSign, folder, timestamp }`.
    3. Call `cloudinary.utils.api_sign_request(merged, secret)` with the merged set.
    4. Return the same response shape but include all signed param keys in the response if needed by the widget.
    5. Add a NEW test to `tests/api/cloudinary-sign.test.ts` asserting that when `paramsToSign` is present in the request body, the signed string includes those keys.
    6. Re-run all `tests/api/cloudinary-sign.test.ts` (10 tests now: 9 Phase-1 + 1 new) to confirm all pass.
  </action>
  <verify>
    <automated>pnpm vitest run tests/api/cloudinary-sign.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - **PARITY-OK branch:** `tests/api/cloudinary-sign.test.ts` still passes (9/9 from Phase 1) with no code change.
    - **PARITY-MISMATCH branch:** sign endpoint widened with `paramsToSign`, all 9 Phase-1 tests still pass, AND a NEW test asserts paramsToSign is included in the signed string (10/10 total).
  </acceptance_criteria>
  <done>Sign endpoint either confirmed sufficient OR widened with paramsToSign + new test added — outcome consistent with Task 14.0 resume-signal.</done>
</task>

<task type="auto">
  <name>Task 14.3: Confirm product-form wiring + add audit row on media-only changes</name>
  <files>src/app/[locale]/admin/products/product-form.tsx</files>
  <read_first>
    - src/app/[locale]/admin/products/product-form.tsx (from plan 02-13b)
    - src/actions/products.ts (saveProduct already replaces imagePublicIds + datasheetPublicIds via the base row update)
  </read_first>
  <action>
    Verify the form already includes:
    - `<MediaUploader name="imagePublicIds" mode="multi" maxFiles={10} folder="products" />` — outside LocaleTabs
    - `<MediaUploader name="datasheetPublicIds" mode="multi" maxFiles={5} folder="datasheets" accept="pdf" />` — outside LocaleTabs
    Both should be in plan 02-13b's product-form.tsx; this task is a confirmation pass + adding a "media changed" indicator (e.g., a Save-button label that shows when imagePublicIds or datasheetPublicIds were dirty since last save).

    No new files. Patch only if missing pieces are found.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'name="imagePublicIds"' src/app/[locale]/admin/products/product-form.tsx` returns `1`
    - `grep -c 'name="datasheetPublicIds"' src/app/[locale]/admin/products/product-form.tsx` returns `1`
    - `grep -c 'accept="pdf"' src/app/[locale]/admin/products/product-form.tsx` returns `1`
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Product form wires both MediaUploader instances correctly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| browser → Cloudinary direct | bytes never traverse Vercel |
| /api/cloudinary/sign | signs upload params |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-14-01 | Spoofing | signature replay (Pitfall #5) | mitigate | 15-min Cloudinary TTL + signed timestamp; explicit smoke checkpoint (Task 14.0) catches mismatch before downstream tasks proceed |
| T-02-14-02 | DoS | abusive upload size | mitigate | Cloudinary's signed-upload server-side max enforced via account settings |
| T-02-14-03 | Tampering | client modifies public_id post-upload | accept | DB stores public_id; render via CldImage; admin sees broken image at render time if id is invalid |
| T-02-14-04 | Information Disclosure | api_secret leak in sign response | mitigate | Phase-1 endpoint never returns api_secret (T-SEC-ENV); confirmed by Phase-1 verifier |
</threat_model>

<verification>
- Task 14.0 resume-signal recorded as PARITY-OK or PARITY-MISMATCH
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/components/media-uploader.test.tsx` exits 0
- `pnpm vitest run tests/api/cloudinary-sign.test.ts` exits 0
- `pnpm build` exits 0
</verification>

<success_criteria>
1. Signature-parity smoke checkpoint executed; outcome recorded.
2. MediaUploader unit-tested with mocked widget; both single + multi mode persist public_id.
3. Sign endpoint either confirmed sufficient (PARITY-OK) or widened with paramsToSign (PARITY-MISMATCH).
4. Product form wires images + datasheets correctly.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-14-SUMMARY.md` documenting: smoke-checkpoint outcome (PARITY-OK | PARITY-MISMATCH + observed param keys), whether paramsToSign was needed, MediaUploader test coverage.
</output>
