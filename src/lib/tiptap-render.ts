// Plan 04-02 Task 2.3 — server-safe Tiptap JSON -> HTML renderer.
//
// Used by public RSC pages (recipe / industry detail) to render the jsonb body
// stored in *_translations.body to escaped HTML at request time. Zero client
// JS for body rendering — Slow-4G LCP budget per SEO-05 preserved.
//
// Security model (verified by researcher at @tiptap/static-renderer
// dist/pm/html-string/index.js):
// - Built-in escapeHTML + escapeHTMLAttribute for ALL text + attribute values
//   (covers `&` `<` `>` `"`). The locked TIPTAP_EXTENSIONS array IS the XSS
//   allow-list — no DOMPurify needed (T-04-XSS-01 mitigation).
// - `unhandledNode: () => ''` softens the renderer's default throw-on-unknown-node
//   to silent drop. Defense-in-depth: a stale doc with an extension we removed
//   renders empty rather than crashing the page (RESEARCH §Static-renderer
//   security model point 2).
// - nodeMapping.image override emits `<img>` with src derived from
//   getCldImageUrl({ src: publicId, ... }) NOT static-renderer's bare attrs.src.
//   Keeps responsive `f_auto,q_auto` consistency with Phase 3 <CldImage>;
//   prevents the publicId-vs-URL drift pitfall (P4-2) and the data:URI XSS
//   vector (T-04-XSS-04) by structurally ignoring the stored src.

import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import { getCldImageUrl } from 'next-cloudinary';
import type { JSONContent } from '@tiptap/core';
import { TIPTAP_EXTENSIONS } from './tiptap-extensions';

export function renderTiptapToHtml(doc: JSONContent): string {
  return renderToHTMLString({
    extensions: TIPTAP_EXTENSIONS,
    content: doc,
    options: {
      // Defense-in-depth: drop unknown nodes/marks to empty string rather than
      // throw. Aligns with T-04-XSS-01 mitigation (research §Static-renderer
      // security model). If an admin had a draft with an extension we later
      // removed, the page renders without that node rather than 500-ing.
      unhandledNode: () => '',
      unhandledMark: () => '',
      nodeMapping: {
        // Override the image node to emit a Cloudinary-derived URL via
        // getCldImageUrl rather than passing through static-renderer's bare
        // <img src={attrs.src}>. This is the structural mitigation for
        // T-04-XSS-04 (data:URI in src) and P4-2 (publicId vs src divergence):
        // we read ONLY attrs.publicId from the JSON. If publicId is missing,
        // the node renders as empty string (graceful — doesn't error the page).
        image: ({ node }: { node: { attrs?: Record<string, unknown> } }) => {
          const publicId =
            typeof node.attrs?.publicId === 'string'
              ? node.attrs.publicId
              : null;
          if (!publicId) return '';
          const src = getCldImageUrl({
            src: publicId,
            width: 1200,
            format: 'auto',
            quality: 'auto',
          });
          // Attribute-escape the alt text so a malicious alt cannot break out
          // of the attribute. static-renderer's escapeHTMLAttribute would also
          // catch this when the renderer walks the node — but we're emitting
          // the raw HTML string ourselves here, so the escape is our
          // responsibility.
          const altRaw = String(node.attrs?.alt ?? '');
          const alt = altRaw.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
          return `<img src="${src}" alt="${alt}" loading="lazy" />`;
        },
      },
    },
  });
}
