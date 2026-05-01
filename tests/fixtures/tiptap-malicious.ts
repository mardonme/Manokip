// Malicious-text Tiptap doc fixture (T-04-XSS-01 regression locker).
//
// Per 04-RESEARCH §Code Examples lines 1046-1083. Three text nodes:
// - `<script>alert(1)</script>` raw — must escape to `&lt;script&gt;alert(1)&lt;/script&gt;`
// - `</p><img src=x onerror=alert(2)>` — must escape `<` so the img tag does not break the paragraph
// - `Normal text after.` — survives intact (escape doesn't drop characters)
//
// The static-renderer's built-in escapeHTML + escapeHTMLAttribute (verified at
// dist/pm/html-string/index.js by the researcher) is the actual mitigation; this
// fixture asserts the locked TIPTAP_EXTENSIONS array exposes that escape across
// every text-bearing node our editor produces.
import type { JSONContent } from '@tiptap/core';

export const MALICIOUS_TIPTAP_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '<script>alert(1)</script>' },
        {
          type: 'text',
          marks: [{ type: 'bold' }],
          text: '</p><img src=x onerror=alert(2)>',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Normal text after.' }],
    },
  ],
};
