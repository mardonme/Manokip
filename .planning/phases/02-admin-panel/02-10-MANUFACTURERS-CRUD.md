---
phase: 02-admin-panel
plan: 10
type: execute
wave: 2
depends_on: [04, 05, 06, 09]
files_modified:
  - src/actions/manufacturers.ts
  - src/lib/zod/manufacturer.ts
  - src/components/admin/media-uploader.tsx
  - src/app/[locale]/admin/manufacturers/page.tsx
  - src/app/[locale]/admin/manufacturers/manufacturers-table.tsx
  - src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx
  - src/app/[locale]/admin/manufacturers/new/page.tsx
  - src/app/[locale]/admin/manufacturers/manufacturer-form.tsx
  - tests/actions/manufacturers.test.ts
autonomous: true
requirements: [ADMIN-04, ADMIN-11, OPS-01]
must_haves:
  truths:
    - "Admin can CRUD manufacturers with 3-locale translations + Cloudinary logo public_id"
    - "Logo upload uses CldUploadWidget signed via /api/cloudinary/sign (Phase 1) — DB stores public_id only"
    - "audit_log row written per mutation"
    - "revalidateManufacturer + revalidateTag('manufacturers-list') called AFTER tx.commit"
    - "MediaUploader component is reusable (used by plan 02-14 for product images)"
  artifacts:
    - path: "src/actions/manufacturers.ts"
      provides: "saveManufacturer + deleteManufacturer"
      contains: "withAdminAction"
    - path: "src/components/admin/media-uploader.tsx"
      provides: "Reusable single + multi-image uploader (with dnd-kit reordering)"
      contains: "CldUploadWidget"
  key_links:
    - from: "src/components/admin/media-uploader.tsx"
      to: "/api/cloudinary/sign"
      via: "signatureEndpoint prop"
      pattern: "signatureEndpoint=\"/api/cloudinary/sign\""
---

<objective>
Land manufacturer CRUD with logo upload (single image, no reordering needed). Also ships the reusable `MediaUploader` component that plan 02-14 (product media) will compose for multi-image + dnd-kit reorder.

Purpose: ADMIN-04 + foundation for ADMIN-07.
Output: Server Actions + Zod + 4 RSC pages + 1 form client component + reusable MediaUploader + integration tests.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@CLAUDE.md
@src/db/schema/manufacturers.ts
@src/lib/audit.ts
@src/lib/revalidation.ts
@src/lib/server-action.ts
@src/components/admin/locale-tabs.tsx
@src/components/admin/slug-input.tsx
@src/app/api/cloudinary/sign/route.ts
@src/actions/categories.ts

<interfaces>
From src/db/schema/manufacturers.ts (Phase 1):
```typescript
// manufacturers: { id, logoPublicId (text, nullable), createdAt, updatedAt }
// manufacturerTranslations: { manufacturerId, locale, name, slug, description }
```

CldUploadWidget signed flow (Phase 1 sign endpoint):
- Endpoint: /api/cloudinary/sign
- Returns: { signature, timestamp, folder, apiKey, cloudName }
- Bytes never traverse Vercel.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 10.1: Reusable MediaUploader (single + multi mode)</name>
  <files>src/components/admin/media-uploader.tsx</files>
  <read_first>
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/components/admin/media-uploader.tsx (NEW)` — verbatim; uses RHF useFieldArray + dnd-kit + CldUploadWidget
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 3 (signed direct upload + sign endpoint contract; Pitfall #5 signature mismatch)
    - src/app/api/cloudinary/sign/route.ts (current sign endpoint shape)
  </read_first>
  <behavior>
    - Single mode: `<MediaUploader name="logoPublicId" multiple={false}>` renders one button; on success, sets the form field to the returned public_id (or null on remove).
    - Multi mode: `<MediaUploader name="imagePublicIds" multiple={true} maxFiles={10}>` uses RHF useFieldArray + dnd-kit SortableContext; supports reordering and removal. Each tile is a `<CldImage>` thumbnail.
    - Resource type defaults to 'image' with formats jpg/jpeg/png/webp; if `accept="pdf"` prop is passed, swap to `resourceType: 'auto'` + `clientAllowedFormats: ['pdf']`.
  </behavior>
  <action>
    Create `src/components/admin/media-uploader.tsx` (per PATTERNS verbatim):
    ```tsx
    "use client";
    import * as React from "react";
    import { CldUploadWidget, CldImage } from "next-cloudinary";
    import { useFormContext, useFieldArray } from "react-hook-form";
    import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, type DragEndEvent } from "@dnd-kit/core";
    import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
    import { CSS } from "@dnd-kit/utilities";
    import { Button } from "@/components/ui/button";

    type Mode = "single" | "multi";
    type Accept = "image" | "pdf";

    export interface MediaUploaderProps {
      name: string;
      mode?: Mode;
      maxFiles?: number;
      accept?: Accept;
      folder?: string;
    }

    function SortableTile({ id, publicId, onRemove }: { id: string; publicId: string; onRemove: () => void }) {
      const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
      const style = { transform: CSS.Transform.toString(transform), transition };
      return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative h-24 w-24 rounded border overflow-hidden">
          <CldImage src={publicId} width="96" height="96" alt="" />
          <button type="button" onClick={onRemove} className="absolute top-1 right-1 bg-white/80 rounded text-xs px-1">×</button>
        </div>
      );
    }

    export function MediaUploader({ name, mode = "single", maxFiles = 10, accept = "image", folder = "products" }: MediaUploaderProps) {
      const { control, setValue, watch } = useFormContext();
      const sensors = useSensors(useSensor(PointerSensor));

      const widgetOptions = {
        multiple: mode === "multi",
        maxFiles: mode === "multi" ? maxFiles : 1,
        folder,
        resourceType: accept === "pdf" ? ("auto" as const) : ("image" as const),
        clientAllowedFormats: accept === "pdf" ? ["pdf"] : ["jpg", "jpeg", "png", "webp"],
        maxFileSize: 10 * 1024 * 1024,
      };

      if (mode === "single") {
        const value = watch(name) as string | null | undefined;
        return (
          <div className="flex items-center gap-3">
            {value && <CldImage src={value} width="80" height="80" alt="" className="rounded border" />}
            <CldUploadWidget
              signatureEndpoint="/api/cloudinary/sign"
              options={widgetOptions}
              onSuccess={(result) => {
                if (typeof result.info === "object" && result.info && "public_id" in result.info) {
                  setValue(name, (result.info as { public_id: string }).public_id, { shouldDirty: true });
                }
              }}
            >
              {({ open }) => <Button type="button" variant="outline" onClick={() => open()}>{value ? "Replace" : "Upload"}</Button>}
            </CldUploadWidget>
            {value && <Button type="button" variant="ghost" onClick={() => setValue(name, null, { shouldDirty: true })}>Remove</Button>}
          </div>
        );
      }

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
              if (typeof result.info === "object" && result.info && "public_id" in result.info) {
                append({ publicId: (result.info as { public_id: string }).public_id });
              }
            }}
          >
            {({ open }) => <Button type="button" variant="outline" onClick={() => open()}>Add {accept === "pdf" ? "PDF" : "images"}</Button>}
          </CldUploadWidget>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map((f) => f.id)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2 mt-3">
                {fields.map((f, i) => (
                  <SortableTile
                    key={f.id} id={f.id}
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
    ```

    PITFALL #5 mitigation: the widget's signed parameters must match what /api/cloudinary/sign signs. Phase 1 signs `{ folder, timestamp }`. The widget options above pass ONLY those (resourceType, multiple, maxFileSize, clientAllowedFormats are CLIENT-side hints, not signed params). If a smoke upload fails with "Invalid Signature", widen `bodySchema` in `src/app/api/cloudinary/sign/route.ts:24-26` per PATTERNS.md §`src/components/admin/media-uploader.tsx` and re-test. This is documented as a follow-up if it occurs (executor records in SUMMARY).
  </action>
  <verify>
    <automated>pnpm tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'CldUploadWidget' src/components/admin/media-uploader.tsx` returns `>=1`
    - `grep -c 'signatureEndpoint="/api/cloudinary/sign"' src/components/admin/media-uploader.tsx` returns `>=2` (single + multi mode)
    - `grep -c 'useFieldArray' src/components/admin/media-uploader.tsx` returns `1`
    - `grep -c '@dnd-kit/sortable' src/components/admin/media-uploader.tsx` returns `1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>MediaUploader supports single + multi modes; ready for manufacturers logo + product images + datasheets.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 10.2: Manufacturers Server Actions + Zod + integration tests</name>
  <files>src/actions/manufacturers.ts, src/lib/zod/manufacturer.ts, tests/actions/manufacturers.test.ts</files>
  <read_first>
    - src/actions/categories.ts (closest analog — same Server Action shape)
    - src/db/schema/manufacturers.ts (column shapes; logoPublicId is on the base table, NOT translation)
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/actions/categories.ts / manufacturers.ts / ...` table — manufacturers extras = "logoPublicId set on base row"
    - tests/actions/categories.test.ts (from plan 02-09 — pattern for live-Neon assertion)
  </read_first>
  <behavior>
    - saveManufacturer: 1 manufacturers row + 3 manufacturer_translations rows + audit_log; revalidate AFTER tx.
    - deleteManufacturer: tx delete + audit; revalidateTag('manufacturers-list').
    - logoPublicId: stored on base row; can be null.
  </behavior>
  <action>
    Create `src/lib/zod/manufacturer.ts`:
    ```typescript
    import { z } from "zod";
    const localeFields = z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
      description: z.string().optional().nullable(),
    });
    export const manufacturerInsertSchema = z.object({
      id: z.string().uuid().optional(),
      logoPublicId: z.string().nullable().optional(),
      translations: z.object({ uz: localeFields, ru: localeFields, en: localeFields }),
    });
    export const manufacturerDeleteSchema = z.object({ id: z.string().uuid() });
    ```

    Create `src/actions/manufacturers.ts` mirroring `src/actions/categories.ts`:
    - Same withAdminAction → snapshot before → dbTx.transaction(insert/update + 3 translations + logAudit) → revalidateManufacturer(id).
    - deleteManufacturer parallel to deleteCategory.

    Create `tests/actions/manufacturers.test.ts` — 3 tests mirroring categories.test.ts but asserting logoPublicId persistence and that revalidateManufacturer's tag set was called.
  </action>
  <verify>
    <automated>pnpm vitest run tests/actions/manufacturers.test.ts --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'export const saveManufacturer = withAdminAction' src/actions/manufacturers.ts` returns `1`
    - `grep -c 'export const deleteManufacturer = withAdminAction' src/actions/manufacturers.ts` returns `1`
    - `grep -c 'logoPublicId' src/actions/manufacturers.ts` returns `>=1`
    - `grep -c 'revalidateManufacturer' src/actions/manufacturers.ts` returns `>=1`
    - `pnpm vitest run tests/actions/manufacturers.test.ts` exits 0; 3/3 pass
  </acceptance_criteria>
  <done>Manufacturers CRUD ships parallel to categories.</done>
</task>

<task type="auto">
  <name>Task 10.3: Manufacturers list + edit + new pages with logo uploader</name>
  <files>src/app/[locale]/admin/manufacturers/page.tsx, src/app/[locale]/admin/manufacturers/manufacturers-table.tsx, src/app/[locale]/admin/manufacturers/[id]/edit/page.tsx, src/app/[locale]/admin/manufacturers/new/page.tsx, src/app/[locale]/admin/manufacturers/manufacturer-form.tsx</files>
  <read_first>
    - src/app/[locale]/admin/categories/* (from plan 02-09 — closest analog; copy structure)
    - src/components/admin/media-uploader.tsx (from Task 10.1)
  </read_first>
  <action>
    Mirror the 5 categories pages from plan 02-09. The form differs by:
    - No `parentId` field
    - Add `<MediaUploader name="logoPublicId" mode="single" folder="manufacturers" />` outside the LocaleTabs (logo is shared across locales)
    - List page columns: name (current locale), slug (uz), logo thumb (CldImage of logoPublicId), updatedAt, actions.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - 5 files exist
    - `grep -c 'MediaUploader' src/app/[locale]/admin/manufacturers/manufacturer-form.tsx` returns `>=1`
    - `grep -c 'mode="single"' src/app/[locale]/admin/manufacturers/manufacturer-form.tsx` returns `>=1`
    - `pnpm build` exits 0
  </acceptance_criteria>
  <done>Manufacturer pages render and submit with logo uploader.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Cloudinary widget → /api/cloudinary/sign | signature must match params widget actually sends |
| widget upload → Cloudinary | bytes bypass Vercel |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-02-10-01 | Spoofing | Cloudinary signature replay (Pitfall §5 in RESEARCH) | mitigate | 15-min TTL on Phase-1 sign endpoint; Cloudinary rejects timestamp drift > 1h |
| T-02-10-02 | Tampering | invalid public_id stored | mitigate | Zod schema validates public_id is a string; Cloudinary's existence check happens at render time (CldImage 404) — acceptable |
| T-02-10-03 | DoS | huge file upload | mitigate | maxFileSize: 10MB hint; Cloudinary's signed-upload server-side limits enforce hard cap |
| T-02-10-04 | EoP | mass assignment | mitigate | withAdminAction + Zod manufacturerInsertSchema |
| T-02-10-05 | Repudiation | admin denies logo change | mitigate | logAudit row with before.logoPublicId / after.logoPublicId |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/actions/manufacturers.test.ts` exits 0
- `pnpm build` exits 0
</verification>

<success_criteria>
1. Manufacturer CRUD parallels categories with logo upload via MediaUploader.
2. MediaUploader exported as reusable single + multi mode component.
3. audit_log + revalidateManufacturer fan-out per mutation.
</success_criteria>

<output>
Create `.planning/phases/02-admin-panel/02-10-SUMMARY.md` documenting MediaUploader API + manufacturer test results + any signature-mismatch follow-ups.
</output>
