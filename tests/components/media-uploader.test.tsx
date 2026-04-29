// Plan 02-14 Task 14.1 — MediaUploader handler unit test (ADMIN-07).
//
// Mocks `next-cloudinary`'s CldUploadWidget + CldImage so the test runs in
// jsdom without contacting Cloudinary. The mock widget exposes its
// `onSuccess` callback through the rendered render-prop's `open()` so the
// test can synthesize an upload-success event and assert that MediaUploader's
// handler writes the returned `public_id` into the RHF field.
//
// Coverage:
//   - mode='multi' appends `{ publicId }` to the field array on success
//     (used by the product editor for images + datasheets, plan 02-13b)
//   - mode='single' sets the field to the bare `public_id` string on success
//     (used by manufacturer-edit logo upload, plan 02-10)
//
// PITFALL #5 NOTE: this test only covers the client-side handler. The
// signature-parity smoke checkpoint (Task 14.0) covered the wire-format
// match between CldUploadWidget and /api/cloudinary/sign. Ergo a passing
// unit test here PLUS the widened sign endpoint (Task 14.2) PLUS the e2e
// upload smoke = full ADMIN-07 confidence.
//
// Environment: jsdom (configured in vitest.config.ts via the `dom` project).

import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

// Mock next-cloudinary BEFORE importing MediaUploader so the import chain
// resolves to the fake. The mocked widget renders its render-prop with an
// `open()` that fires the latest registered `onSuccess` with a fake
// public_id — exactly what the real widget does on a successful upload.
vi.mock("next-cloudinary", () => {
  return {
    CldUploadWidget: ({
      children,
      onSuccess,
    }: {
      children: (api: { open: () => void }) => React.ReactNode;
      onSuccess?: (result: { info: { public_id: string } }) => void;
    }) => {
      return children({
        open: () => {
          onSuccess?.({ info: { public_id: `fake/${Date.now()}` } });
        },
      });
    },
    // CldImage rendering is not under test — return a stable placeholder so
    // sortable tiles can still mount in jsdom without invoking Cloudinary
    // URL construction (which would need NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).
    CldImage: ({ src }: { src: string }) =>
      React.createElement("img", { "data-testid": "cld-image", src }),
  };
});

// Import AFTER the mock so the component sees the fake widget.
import { MediaUploader } from "@/components/admin/media-uploader";

interface WrapperProps {
  defaultValues: Record<string, unknown>;
  children: React.ReactNode;
}

function Wrapper({ defaultValues, children }: WrapperProps) {
  const form = useForm({ defaultValues });
  return (
    <FormProvider {...form}>
      {children}
      {/* Dump-button writes the live form values to window so the test can
          read the RHF state without poking into RHF internals. */}
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

describe("MediaUploader (plan 02-14)", () => {
  it("multi mode: appends a { publicId } row to the field array on widget onSuccess", async () => {
    render(
      <Wrapper defaultValues={{ imagePublicIds: [] }}>
        <MediaUploader name="imagePublicIds" mode="multi" />
      </Wrapper>,
    );

    // Trigger the widget — the mock invokes onSuccess synchronously with a
    // synthetic public_id.
    fireEvent.click(screen.getByRole("button", { name: /add images/i }));
    fireEvent.click(screen.getByTestId("dump"));

    await waitFor(() => {
      const v = (window as unknown as {
        __vals: { imagePublicIds: Array<{ publicId: string }> };
      }).__vals;
      expect(v.imagePublicIds).toHaveLength(1);
      expect(v.imagePublicIds[0]?.publicId).toMatch(/^fake\//);
    });
  });

  it("multi mode (accept='pdf'): trigger label switches to 'Add PDF' and still appends on success", async () => {
    render(
      <Wrapper defaultValues={{ datasheetPublicIds: [] }}>
        <MediaUploader name="datasheetPublicIds" mode="multi" accept="pdf" />
      </Wrapper>,
    );

    // PDF mode renames the trigger to "Add PDF" — confirming the accept
    // prop propagates to the UI label (and, by widget options, to
    // resourceType='auto' + clientAllowedFormats=['pdf'] under the hood).
    fireEvent.click(screen.getByRole("button", { name: /add pdf/i }));
    fireEvent.click(screen.getByTestId("dump"));

    await waitFor(() => {
      const v = (window as unknown as {
        __vals: { datasheetPublicIds: Array<{ publicId: string }> };
      }).__vals;
      expect(v.datasheetPublicIds).toHaveLength(1);
      expect(v.datasheetPublicIds[0]?.publicId).toMatch(/^fake\//);
    });
  });

  it("single mode: sets the field to the bare public_id string on widget onSuccess", async () => {
    render(
      <Wrapper defaultValues={{ logoPublicId: null }}>
        <MediaUploader name="logoPublicId" mode="single" />
      </Wrapper>,
    );

    // In single mode the trigger is "Upload" (no current value) or
    // "Replace" (existing value). Default-null fixture starts at "Upload".
    fireEvent.click(screen.getByRole("button", { name: /^upload$/i }));
    fireEvent.click(screen.getByTestId("dump"));

    await waitFor(() => {
      const v = (window as unknown as {
        __vals: { logoPublicId: string | null };
      }).__vals;
      expect(v.logoPublicId).toMatch(/^fake\//);
    });
  });
});
