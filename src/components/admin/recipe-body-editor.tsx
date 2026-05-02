"use client";

// Plan 04-07 Task 7.1 — RecipeBodyEditor (CONT-01 / D-05 / D-06 / P4-1).
//
// Tiptap admin editor mounted as a client component, RHF-Controller-bound to
// one of `body.uz` / `body.ru` / `body.en`. The recipe form mounts THREE
// instances of this component (one per locale tab) inside a single
// FormProvider; this component reads `control` via useFormContext.
//
// CRITICAL — `immediatelyRender: false` is set on `useEditor`. This is the
// P4-1 mitigation (RESEARCH §Tiptap integration patterns). Without it, every
// SSR pass produces HTML that doesn't match the client's first render →
// React reports "Hydration failed". The `recipe-body-editor.test.tsx` spec
// asserts this option is set; do NOT remove it.
//
// Extension array: imported verbatim from `src/lib/tiptap-extensions.ts`
// (P4-3 single-source-of-truth — same array on the public renderer side).
// DO NOT redefine the extension list here. If a new extension is needed,
// add it to `tiptap-extensions.ts` so the public renderer (plan 04-09)
// picks it up in the same commit.
//
// Image upload: signed direct upload via the existing CldUploadWidget +
// /api/cloudinary/sign (Phase 2 plan 02-14). `options.folder='recipes'` —
// the FOLDER_ALLOWLIST in the sign endpoint accepts this folder (extended
// in plan 04-02). Inserted node uses the CloudinaryImage extension shape:
// `{ type: 'image', attrs: { publicId } }`. The renderer's nodeMapping.image
// override turns publicId into a Cloudinary URL at render time — `src` is
// structurally ignored (T-04-XSS-04 mitigation).

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Controller, useFormContext } from "react-hook-form";
import { CldUploadWidget } from "next-cloudinary";
import type { JSONContent } from "@tiptap/core";

import { TIPTAP_EXTENSIONS } from "@/lib/tiptap-extensions";
import { Button } from "@/components/ui/button";

/**
 * RHF dotted field path the editor controls. Plan 04-07-PLAN's must_haves
 * spell `body.uz | body.ru | body.en` as the canonical shape; the recipe
 * form schema actually nests body under translations.{locale}.body, so
 * either path is acceptable (deviation Rule 1 from 04-07-PLAN — locale-tab
 * swap shape is the contract, not the path syntax). Typed loose so callers
 * can pass either path without a Zod-tied generic.
 */
export type RecipeBodyEditorName = string;

export interface RecipeBodyEditorProps {
  /** RHF dotted field path. The recipe form provides `FormProvider` so we read `control` via context. */
  name: RecipeBodyEditorName;
}

/**
 * Outer Controller wrapper — reads `control` from FormProvider and bridges the
 * RHF field state into the Tiptap editor instance. The Controller's render
 * prop receives `field.value` (the persisted JSONContent) and `field.onChange`
 * (the upstream writer); we forward both to the inner mount.
 */
export function RecipeBodyEditor({ name }: RecipeBodyEditorProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <RecipeBodyEditorInner
          value={(field.value as JSONContent | null) ?? null}
          onChange={field.onChange}
        />
      )}
    />
  );
}

interface InnerProps {
  value: JSONContent | null;
  onChange: (json: JSONContent) => void;
}

function RecipeBodyEditorInner({ value, onChange }: InnerProps) {
  // Track the latest onChange in a ref so the editor's onUpdate closure
  // always calls the current writer. Without this the editor option binds
  // the FIRST onChange and silently drops subsequent re-renders' callbacks
  // — visible in jsdom Spec 2 as "onChange not called".
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: value ?? { type: "doc", content: [{ type: "paragraph" }] },
    // P4-1 — REQUIRED. Server can't synchronously render the editor; this
    // flag defers the first render to a useEffect on the client and avoids
    // hydration mismatch on every page load. DO NOT REMOVE.
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getJSON());
    },
  });

  if (!editor) return null;

  return (
    <div
      className="rounded border"
      data-tiptap-root
      data-testid="recipe-body-editor"
    >
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-slate p-4 min-h-[300px] focus:outline-none"
      />
    </div>
  );
}

interface ToolbarProps {
  editor: Editor;
}

/**
 * Fixed top toolbar. Buttons are uncontrolled — they call editor.chain()
 * commands directly and rely on Tiptap's own active-state queries for
 * pressed-state styling.
 */
function Toolbar({ editor }: ToolbarProps) {
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  function handleSetLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("Link URL", previous ?? "https://");
    if (next === null) return;
    if (next === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: next })
      .run();
  }

  function setHeading(level: 2 | 3 | 4) {
    editor.chain().focus().toggleHeading({ level }).run();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1"
      data-testid="recipe-body-toolbar"
    >
      <ToolbarButton
        active={isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="B"
        title="Bold"
        testId="tb-bold"
      />
      <ToolbarButton
        active={isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="I"
        title="Italic"
        testId="tb-italic"
      />
      <ToolbarButton
        active={isActive("link")}
        onClick={handleSetLink}
        label="Link"
        title="Insert / edit link"
        testId="tb-link"
      />
      <ToolbarSeparator />
      <ToolbarButton
        active={isActive("heading", { level: 2 })}
        onClick={() => setHeading(2)}
        label="H2"
        title="Heading 2"
        testId="tb-h2"
      />
      <ToolbarButton
        active={isActive("heading", { level: 3 })}
        onClick={() => setHeading(3)}
        label="H3"
        title="Heading 3"
        testId="tb-h3"
      />
      <ToolbarButton
        active={isActive("heading", { level: 4 })}
        onClick={() => setHeading(4)}
        label="H4"
        title="Heading 4"
        testId="tb-h4"
      />
      <ToolbarSeparator />
      <ToolbarButton
        active={isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="• List"
        title="Bullet list"
        testId="tb-bullet"
      />
      <ToolbarButton
        active={isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="1. List"
        title="Ordered list"
        testId="tb-ordered"
      />
      <ToolbarButton
        active={isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Quote"
        title="Blockquote"
        testId="tb-quote"
      />
      <ToolbarSeparator />
      <ToolbarButton
        active={false}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        label="Table"
        title="Insert table"
        testId="tb-table"
      />
      <ToolbarSeparator />
      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        // Force the signed-upload branch — Phase 2 plan 02-14 contract.
        uploadPreset={undefined}
        // folder='recipes' is the P4-2 FOLDER_ALLOWLIST entry. Do NOT change
        // without a parallel update to /api/cloudinary/sign.
        options={{ folder: "recipes", resourceType: "image" }}
        onSuccess={(result) => {
          if (
            typeof result === "object" &&
            result !== null &&
            "info" in result &&
            typeof (result as { info: unknown }).info === "object" &&
            (result as { info: unknown }).info !== null &&
            "public_id" in
              ((result as { info: Record<string, unknown> }).info as object)
          ) {
            const info = (result as { info: { public_id: string } }).info;
            // Inserts a CloudinaryImage node — attrs.publicId is the canonical
            // attribute the public renderer reads (T-04-XSS-04 mitigation).
            editor
              .chain()
              .focus()
              .insertContent({
                type: "image",
                attrs: { publicId: info.public_id, alt: "" },
              })
              .run();
          }
        }}
      >
        {({ open }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => open?.()}
            data-testid="tb-image"
          >
            Insert image
          </Button>
        )}
      </CldUploadWidget>
    </div>
  );
}

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
  testId: string;
}

function ToolbarButton({
  active,
  onClick,
  label,
  title,
  testId,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      title={title}
      data-testid={testId}
      data-active={active ? "true" : "false"}
    >
      {label}
    </Button>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}
