// Plan 04-02 Task 2.3 — renderTiptapToHtml unit specs.
//
// Spec 1 (T-04-XSS-01): MALICIOUS_TIPTAP_DOC fixture asserts the static-renderer's
// built-in escapeHTML correctly escapes `<` `>` `&` in text content so that an
// admin authoring `<script>alert(1)</script>` in the body does not produce a
// hot script tag in the public HTML output.
//
// Mitigation locked: TIPTAP_EXTENSIONS array (the allow-list of extensions the
// renderer recognizes) + built-in escapeHTML/escapeHTMLAttribute + nodeMapping.image
// override that emits a Cloudinary URL via getCldImageUrl rather than `attrs.src`
// (which would let an admin paste an external `data:` URI bypassing Cloudinary).
import { describe, it, expect } from 'vitest';
import { renderTiptapToHtml } from '@/lib/tiptap-render';
import { MALICIOUS_TIPTAP_DOC } from '../fixtures/tiptap-malicious';

describe('renderTiptapToHtml', () => {
  it('escapes < > & in text content (T-04-XSS-01)', () => {
    const html = renderTiptapToHtml(MALICIOUS_TIPTAP_DOC);
    // Raw <script> tag MUST NOT appear in output
    expect(html).not.toContain('<script>');
    // Escaped form MUST appear
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // Bolded paragraph-break attempt is escaped (the < is escaped, breaking the
    // would-be tag injection). The literal substring `&lt;/p&gt;&lt;img` is the
    // canonical signal that the second text node was escaped end-to-end.
    expect(html).toContain('&lt;/p&gt;&lt;img');
    // Normal text after the malicious nodes survives intact (escape doesn't
    // drop characters — defense-in-depth: malicious input doesn't blank the page).
    expect(html).toContain('Normal text after.');
  });
});
