// Plan 04-08 Task 8.3 — IndustryForm jsdom specs (flipped from 04-04 RED).
//
// Two specs (mirroring plan 04-07's recipe-form spec posture):
//
//   1. IndustryBodyEditor mounts without hydration error and exposes the
//      Tiptap root sentinel (data-tiptap-root) — same shape as recipe spec.
//   2. IndustryForm LocaleTabs swap — switching uz → ru re-binds the title /
//      slug / excerpt inputs to the ru-locale RHF paths so the active tab's
//      inputs write into the ru slot of `translations`. Regression-locks the
//      Pitfall P4-3 analog (form-state-drift across locales).
//
// Mock chain (mirrors recipe-form.test.tsx):
//   - next-cloudinary: CldUploadWidget render-prop stub + CldImage <img> stub.
//   - next/navigation: useRouter no-op.
//   - @/i18n/navigation: Link → bare <a>.
//   - @/actions/industries: every action returns { ok: true }.
//
// Environment: jsdom (configured in vitest.config.ts via the `dom` project).

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

// --- Module mocks (must come BEFORE module imports) ----------------------

vi.mock("next-cloudinary", () => {
  return {
    CldUploadWidget: ({
      children,
    }: {
      children: (api: { open: () => void }) => React.ReactNode;
    }) => children({ open: () => {} }),
    CldImage: ({ src }: { src: string }) =>
      React.createElement("img", { "data-testid": "cld-image", src }),
  };
});

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    }),
  };
});

vi.mock("@/i18n/navigation", () => {
  return {
    Link: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement("a", props as Record<string, unknown>, children),
  };
});

vi.mock("@/actions/industries", () => {
  return {
    saveIndustry: vi.fn(async () => ({ ok: true, data: { id: "fake" } })),
    publishIndustry: vi.fn(async () => ({ ok: true })),
    unpublishIndustry: vi.fn(async () => ({ ok: true })),
    deleteIndustry: vi.fn(async () => ({ ok: true })),
  };
});

// --- Imports (after mocks) -----------------------------------------------

import { IndustryBodyEditor } from "@/components/admin/industry-body-editor";
import { IndustryForm } from "@/components/admin/industry-form";

interface WrapperProps {
  defaultValues: Record<string, unknown>;
  children: React.ReactNode;
}

function Wrapper({ defaultValues, children }: WrapperProps) {
  const form = useForm({ defaultValues });
  return <FormProvider {...form}>{children}</FormProvider>;
}

beforeEach(() => {
  cleanup();
});

describe("IndustryBodyEditor [GREEN — flipped from 04-04 RED in 04-08]", () => {
  it("mounts the Tiptap editor without hydration error and exposes the data-tiptap-root sentinel", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <Wrapper
        defaultValues={{
          body: { uz: null, ru: null, en: null },
        }}
      >
        <IndustryBodyEditor name="body.uz" />
      </Wrapper>,
    );

    // After the deferred (immediatelyRender:false) mount, the root sentinel
    // appears in the DOM and the ProseMirror contenteditable is wired.
    const root = await screen.findByTestId("industry-body-editor");
    expect(root).toBeTruthy();
    expect(root.querySelector(".ProseMirror")).toBeTruthy();
    expect(root.hasAttribute("data-tiptap-root")).toBe(true);

    // No console errors from React (hydration warnings would land here).
    const errs = consoleErrorSpy.mock.calls.map((c) => String(c[0] ?? ""));
    const hydrationErrs = errs.filter((m) =>
      /hydrat|immediatelyRender/i.test(m),
    );
    expect(hydrationErrs).toEqual([]);

    consoleErrorSpy.mockRestore();
  });
});

describe("IndustryForm LocaleTabs swap [GREEN — flipped from 04-04 RED in 04-08]", () => {
  it("switching tab from uz → ru re-binds title/slug/excerpt inputs to the ru-locale RHF paths", async () => {
    render(
      <IndustryForm
        locale="uz"
        productOptions={[]}
        // no `initial` → empty form, status='draft'
      />,
    );

    // Initial tab is uz. Verify the uz title/slug/excerpt inputs are wired
    // to translations.uz.* — the SlugInput renders the title field with the
    // RHF-registered `name` attribute we drive into it.
    const uzTitle = await screen.findByPlaceholderText("Title in UZ");
    expect(uzTitle.getAttribute("name")).toBe("translations.uz.title");

    // Excerpt input (Textarea has the name attribute from form.register).
    const uzExcerpt = document.querySelector(
      'textarea[name="translations.uz.excerpt"]',
    );
    expect(uzExcerpt).toBeTruthy();

    // Click the ru tab (LocaleTabs renders `data-testid="tab-ru"`).
    const ruTab = screen.getByTestId("tab-ru");
    fireEvent.click(ruTab);

    // After the swap, the active panel renders the ru-bound inputs. The
    // SlugInput placeholder for the ru tab is "Title in RU" — find it and
    // assert its `name` attribute is now translations.ru.title (form-state
    // drift would either lose the swap or reuse the uz path; either fails
    // the assertion).
    const ruTitle = await screen.findByPlaceholderText("Title in RU");
    expect(ruTitle.getAttribute("name")).toBe("translations.ru.title");

    // The ru excerpt textarea is also wired into the ru slot.
    const ruExcerpt = document.querySelector(
      'textarea[name="translations.ru.excerpt"]',
    );
    expect(ruExcerpt).toBeTruthy();
  });
});
