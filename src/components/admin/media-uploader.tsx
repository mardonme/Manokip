"use client";

// Plan 02-10 Task 10.1 — MediaUploader (ADMIN-04 + foundation for ADMIN-07).
//
// Reusable Cloudinary upload primitive with two modes:
//
//   1. mode="single" — bound to a single string field (e.g. logoPublicId on
//      manufacturers). On success, sets the form field to the returned
//      public_id; on remove, sets it to null. Used by 02-10 manufacturers.
//
//   2. mode="multi"  — bound to a RHF useFieldArray collection. Supports
//      drag-and-drop reordering via @dnd-kit and per-tile removal. Each
//      field is `{ publicId: string }`. Used by 02-13b products gallery.
//
// Both modes call the same /api/cloudinary/sign endpoint (Phase 1 plan 01-06),
// which signs ONLY `{ folder, timestamp }` per Pitfall #5 mitigation. The
// other widget options (multiple, maxFiles, resourceType, clientAllowedFormats,
// maxFileSize) are CLIENT-side hints not part of the HMAC payload — Cloudinary
// validates them server-side from its account settings.
//
// `accept="pdf"` swaps resourceType to 'auto' + clientAllowedFormats to
// ['pdf'] so the same component supports product datasheets in plan 02-14.
//
// DB invariant (CLAUDE.md guardrail): we persist ONLY the Cloudinary
// `public_id` (no full URLs, no asset_id, no version). Render-time
// <CldImage src={publicId} /> resolves to the optimized URL.

import * as React from "react";
import { CldUploadWidget, CldImage } from "next-cloudinary";
import { useFormContext, useFieldArray } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";

type Mode = "single" | "multi";
type Accept = "image" | "pdf";

export interface MediaUploaderProps {
  /**
   * RHF dotted field path. In single mode this is bound to a string|null
   * (e.g. `"logoPublicId"`). In multi mode it must point at an array of
   * `{ publicId: string }` (e.g. `"images"` against
   * `images: [{ publicId: '...' }, ...]`).
   */
  name: string;
  mode?: Mode;
  /** Max files for multi mode. Ignored when mode='single'. */
  maxFiles?: number;
  /** image (default) → jpg/png/webp; pdf → application/pdf via resourceType:'auto'. */
  accept?: Accept;
  /**
   * Cloudinary folder allowlisted by /api/cloudinary/sign (
   * `products` | `recipes` | `industries` | `manufacturers` per
   * src/app/api/cloudinary/sign/route.ts:22).
   */
  folder?: string;
}

interface CloudinaryUploadInfo {
  public_id: string;
}

function isUploadInfo(info: unknown): info is CloudinaryUploadInfo {
  return (
    typeof info === "object" &&
    info !== null &&
    "public_id" in info &&
    typeof (info as { public_id: unknown }).public_id === "string"
  );
}

interface SortableTileProps {
  id: string;
  publicId: string;
  onRemove: () => void;
}

function SortableTile({ id, publicId, onRemove }: SortableTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative h-24 w-24 overflow-hidden rounded border"
    >
      <CldImage src={publicId} width="96" height="96" alt="" />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute right-1 top-1 rounded bg-white/80 px-1 text-xs leading-tight"
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}

export function MediaUploader({
  name,
  mode = "single",
  maxFiles = 10,
  accept = "image",
  folder = "products",
}: MediaUploaderProps) {
  const { control, setValue, watch } = useFormContext();
  const sensors = useSensors(useSensor(PointerSensor));

  // Widget options. Only `folder` + `timestamp` are part of the HMAC payload
  // (see /api/cloudinary/sign Pitfall #5 comment). Everything below is a
  // CLIENT-side hint — Cloudinary enforces upload-preset constraints
  // server-side. Adding more signed params in the widget would force
  // bodySchema in the sign route to widen, hence the comment block in
  // 02-10-PLAN.md §"PITFALL #5 mitigation".
  const widgetOptions = {
    multiple: mode === "multi",
    maxFiles: mode === "multi" ? maxFiles : 1,
    folder,
    resourceType: accept === "pdf" ? ("auto" as const) : ("image" as const),
    clientAllowedFormats:
      accept === "pdf" ? ["pdf"] : ["jpg", "jpeg", "png", "webp"],
    maxFileSize: 10 * 1024 * 1024,
  };

  if (mode === "single") {
    const value = watch(name) as string | null | undefined;
    return (
      <div className="flex items-center gap-3">
        {value ? (
          <CldImage
            src={value}
            width="80"
            height="80"
            alt=""
            className="rounded border"
          />
        ) : null}
        <CldUploadWidget
          signatureEndpoint="/api/cloudinary/sign"
          options={widgetOptions}
          onSuccess={(result) => {
            if (isUploadInfo(result.info)) {
              setValue(name, result.info.public_id, { shouldDirty: true });
            }
          }}
        >
          {({ open }) => (
            <Button
              type="button"
              variant="outline"
              onClick={() => open()}
            >
              {value ? "Replace" : "Upload"}
            </Button>
          )}
        </CldUploadWidget>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setValue(name, null, { shouldDirty: true })}
          >
            Remove
          </Button>
        ) : null}
      </div>
    );
  }

  // mode === "multi" branch.
  const { fields, append, remove, move } = useFieldArray({ control, name });

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIdx = fields.findIndex((f) => f.id === active.id);
      const newIdx = fields.findIndex((f) => f.id === over.id);
      if (oldIdx >= 0 && newIdx >= 0) move(oldIdx, newIdx);
    }
  }

  return (
    <div>
      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        options={widgetOptions}
        onSuccess={(result) => {
          if (isUploadInfo(result.info)) {
            append({ publicId: result.info.public_id });
          }
        }}
      >
        {({ open }) => (
          <Button type="button" variant="outline" onClick={() => open()}>
            Add {accept === "pdf" ? "PDF" : "images"}
          </Button>
        )}
      </CldUploadWidget>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={rectSortingStrategy}
        >
          <div className="mt-3 flex flex-wrap gap-2">
            {fields.map((f, i) => (
              <SortableTile
                key={f.id}
                id={f.id}
                publicId={(f as unknown as { publicId: string }).publicId}
                onRemove={() => remove(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
