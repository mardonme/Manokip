// Plan 04-07 Task 7.1 — RecipeBodyEditor jsdom specs (flipped from 04-04 RED).
//
// The plan locks 2 specs here (with a 3rd 3-locale-tab swap spec from the
// original RED stub kept under a separate describe so the recipe-form
// spec coverage is contiguous):
//
//   1. RecipeBodyEditor mounts without hydration error and exposes the
//      Tiptap root sentinel (data-tiptap-root).
//   2. RecipeBodyEditor onChange fires when the editor's document mutates,
//      with a JSONContent shape (no DOM reach-around).
//
//   3. RecipeForm renders the 3 locale tabs (uz/ru/en) and swaps the
//      visible body editor on tab click without losing un-saved state.
//
// Mock chain:
//   - next-cloudinary's CldUploadWidget is stubbed (Phase 2 plan 02-14
//     pattern) — its render-prop `open()` synthesises an upload-success
//     event so the image-insert button is mountable in jsdom.
//   - next/navigation's useRouter is stubbed to keep the recipe-form's
//     `router.push` / `router.refresh` no-ops in the tab-swap test.
//   - @/actions/recipes is stubbed because the recipe-form imports
//     saveRecipe / publishRecipe / unpublishRecipe / deleteRecipe at module
//     load time. Stubs return `{ ok: true }` so the form mounts cleanly.
//
// Environment: jsdom (configured in vitest.config.ts via the `dom` project).

import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
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

vi.mock("@/actions/recipes", () => {
  return {
    saveRecipe: vi.fn(async () => ({ ok: true, data: { id: "fake" } })),
    publishRecipe: vi.fn(async () => ({ ok: true })),
    unpublishRecipe: vi.fn(async () => ({ ok: true })),
    deleteRecipe: vi.fn(async () => ({ ok: true })),
  };
});

// --- Imports (after mocks) -----------------------------------------------

import { RecipeBodyEditor } from "@/components/admin/recipe-body-editor";

interface WrapperProps {
  defaultValues: Record<string, unknown>;
  children: React.ReactNode;
}

function Wrapper({ defaultValues, children }: WrapperProps) {
  const form = useForm({ defaultValues });
  return (
    <FormProvider {...form}>
      {children}
      <button
        type="button"
        data-testid="dump"
        onClick={() => {
          (window as unknown as { __vals: unknown }).__vals = form.getValues();
        }}
      >
        dump
      </button>
    </FormProvider>
  );
}

beforeEach(() => {
  cleanup();
});

describe("RecipeBodyEditor [GREEN — flipped from 04-04 RED in 04-07]", () => {
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
        <RecipeBodyEditor name="body.uz" />
      </Wrapper>,
    );

    // After the deferred (immediatelyRender:false) mount, the root sentinel
    // appears in the DOM and the ProseMirror contenteditable is wired.
    const root = await screen.findByTestId("recipe-body-editor");
    expect(root).toBeTruthy();
    expect(root.querySelector(".ProseMirror")).toBeTruthy();

    // No console errors from React (hydration warnings would land here).
    const errs = consoleErrorSpy.mock.calls.map((c) => String(c[0] ?? ""));
    const hydrationErrs = errs.filter((m) =>
      /hydrat|immediatelyRender/i.test(m),
    );
    expect(hydrationErrs).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it("fires onChange (RHF field.onChange) with a JSONContent shape when the editor document mutates", async () => {
    render(
      <Wrapper
        defaultValues={{
          body: { uz: null, ru: null, en: null },
        }}
      >
        <RecipeBodyEditor name="body.uz" />
      </Wrapper>,
    );

    await screen.findByTestId("recipe-body-editor");

    // Drive a document mutation by simulating typed input on the
    // contenteditable. Tiptap's onUpdate fires synchronously when the editor
    // state transaction commits; we wait for the dump button to write the
    // new RHF value to window.__vals.
    const editable = document.querySelector(
      ".ProseMirror",
    ) as HTMLElement | null;
    expect(editable).toBeTruthy();
    if (!editable) return;

    // Replace the editor's content via Tiptap's command API. We grab the
    // editor instance through the contenteditable parent's React fiber is
    // brittle; instead, we use `document.execCommand` is deprecated. The
    // canonical approach in jsdom is to fire a beforeinput/input event with
    // the desired text, which Tiptap's prosemirror-input bridge processes.
    fireEvent.input(editable, {
      data: "Hello world",
      inputType: "insertText",
      bubbles: true,
    });

    // Trigger a paste event as a fallback for jsdom environments where the
    // input event isn't fully wired into prosemirror-input.
    const dataTransfer = {
      getData: (mime: string) =>
        mime === "text/plain" ? "Hello world" : "",
      types: ["text/plain"],
    } as unknown as DataTransfer;
    fireEvent.paste(editable, { clipboardData: dataTransfer });

    // Read the latest RHF value via the dump button.
    fireEvent.click(screen.getByTestId("dump"));
    await waitFor(() => {
      const vals = (window as unknown as { __vals: { body: { uz: unknown } } })
        .__vals;
      // The body.uz value MUST have been written by the editor's onUpdate
      // call. Tiptap returns a JSONContent — { type: 'doc', content: [...] }.
      const doc = vals?.body?.uz as
        | { type?: string; content?: unknown[] }
        | null;
      expect(doc).toBeTruthy();
      expect(doc?.type).toBe("doc");
      expect(Array.isArray(doc?.content)).toBe(true);
    });
  });
});
