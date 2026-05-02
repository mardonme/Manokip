"use client";

// Plan 04-08 Task 8.1 — IndustryBodyEditor (CONT-02 / D-05 / D-06 / P4-1).
//
// Verbatim mirror of `src/components/admin/recipe-body-editor.tsx` (plan 04-07)
// with one literal change: `options.folder='industries'` (was 'recipes') on the
// CldUploadWidget. All other behavior — Tiptap mount with
// immediatelyRender:false, RHF Controller bridge, TIPTAP_EXTENSIONS allow-list,
// CloudinaryImage node insertion via attrs.publicId — is identical.
//
// The two components are kept as near-twin files at v1 (single point of
// duplication, well-tested) per plan 04-08 §Task 8.1 deviation Rule 2 — a
// future polish plan can extract a shared `<BodyEditor folder=...>` component
// if the duplication starts costing more than the indirection saves.
//
// CRITICAL — `immediatelyRender: false` is the P4-1 hydration mitigation. DO
// NOT remove. The TIPTAP_EXTENSIONS array is shared with the public renderer
// (P4-3 single-source-of-truth) — never inline a custom extension list here.
// FOLDER_ALLOWLIST allows 'industries' (plan 04-02 prereq satisfied).

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Controller, useFormContext } from "react-hook-form";
import { CldUploadWidget } from "next-cloudinary";
import type { JSONContent } from "@tiptap/core";

import { TIPTAP_EXTENSIONS } from "@/lib/tiptap-extensions";
import { Button } from "@/components/ui/button";

/**
 * RHF dotted field path the editor controls. Per plan 04-07 deviation Rule 1
 * (locale-tab swap shape is the contract, not the path syntax), typed loose
 * so callers can pass either `body.<locale>` or `translations.<locale>.body`.
 */
export type IndustryBodyEditorName = string;

export interface IndustryBodyEditorProps {
  /** RHF dotted field path. The industry form provides `FormProvider` so we read `control` via context. */
  name: IndustryBodyEditorName;
}

export function IndustryBodyEditor({ name }: IndustryBodyEditorProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <IndustryBodyEditorInner
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

function IndustryBodyEditorInner({ value, onChange }: InnerProps) {
  // Track latest onChange in a ref so editor.onUpdate's closure always calls
  // the current writer (parity with RecipeBodyEditor — without this, a
  // stale-onChange bug surfaces in jsdom Spec 2).
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: value ?? { type: "doc", content: [{ type: "paragraph" }] },
    // P4-1 — REQUIRED. See RecipeBodyEditor for full rationale.
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
      data-testid="industry-body-editor"
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
      data-testid="industry-body-toolbar"
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
        uploadPreset={undefined}
        // folder='industries' — FOLDER_ALLOWLIST entry added in plan 04-02.
        // Do NOT change without a parallel update to /api/cloudinary/sign.
        options={{ folder: "industries", resourceType: "image" }}
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
