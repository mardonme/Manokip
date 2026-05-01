// Plan 04-02 Task 2.2 — shared TIPTAP_EXTENSIONS array + CloudinaryImage extension.
//
// CRITICAL: NO 'use client' directive. The admin editor (plan 04-07) imports this
// AND the public renderer (src/lib/tiptap-render.ts in plan 04-09 / this plan)
// imports this — both paths must work. The extensions themselves are React-free
// data structures; only `useEditor` from `@tiptap/react` (consumed by the admin
// client island) is React-coupled, and `useEditor` lives in the editor's own
// client-only module — NOT here.
//
// This is the P4-3 single-source-of-truth: same extension array on both sides
// prevents the admin/public drift pitfall (RESEARCH §Phase 4-specific). If the
// admin enables an extension (e.g. code-block) and the public renderer doesn't
// have it, renderToHTMLString throws on saved content because the rendered doc
// references an unknown node type.

import { StarterKit } from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

// Custom Image extension — stores Cloudinary public_id in a `publicId` attribute
// rendered as `data-public-id` so existing rendered HTML can round-trip the
// attribute. The actual `src` attribute is left to whatever was inserted by the
// admin (CldUploadWidget inserts a node with `attrs.publicId` set; src can be
// empty or a transient Cloudinary URL). Public RSC's nodeMapping.image override
// reads ONLY `attrs.publicId` and builds the URL via getCldImageUrl — the
// stored src is structurally ignored, which is the T-04-XSS-04 mitigation
// against `data:` URIs in src.
//
// Pattern verified at 04-RESEARCH §Tiptap integration patterns / Recommendation
// pattern (b) lines 326-374; Image.extend with addAttributes returning
// { ...this.parent?.(), publicId: { default, parseHTML, renderHTML } } is the
// canonical Tiptap v3 extension-extension shape.
export const CloudinaryImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      publicId: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-public-id'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.publicId ? { 'data-public-id': String(attrs.publicId) } : {},
      },
    };
  },
});

// Locked extension list — D-05 (4 heading levels, no codeBlock, link with
// safe defaults, custom CloudinaryImage, full table set). Length = 7. The
// downstream renderer's allow-list IS this array; adding a new extension here
// requires shipping the same change to the admin editor AND the public renderer
// in the same commit.
export const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] }, // D-05: H1 reserved for page title; editor uses H1-H4
    codeBlock: false, // D-05 defers code-block syntax highlighting to v1.1
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: {
      target: '_blank',
      rel: 'nofollow noopener noreferrer',
    },
  }),
  CloudinaryImage,
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
];
