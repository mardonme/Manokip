// Plan 04-04 Task 4.1 — well-formed Tiptap JSONContent fixtures for happy-path
// specs (component renders, public detail SSR, admin form save round-trips).
//
// SAMPLE_RECIPE_DOC + SAMPLE_INDUSTRY_DOC: 1 H2 + 2 paragraphs + 1 link mark
// + 1 image node each. The image node carries `attrs.publicId` matching the
// project's custom Tiptap image extension (Phase 04-02 lines 117-120 in
// 04-02-SUMMARY.md). The dummy public_id `manometr/sample/inline-1` is
// fixture-only — Cloudinary returns 404 if rendered, but these docs are
// consumed only by unit + integration tests (vitest jsdom + live-Neon) that
// stub the renderer or assert on the JSON shape, not by deployed pages.
//
// Why H2 (not H1): the public recipe/industry detail layout owns the H1 (the
// title). Body content starts at H2 per the markdown convention shared with
// product long_desc rendering.
//
// Pure data; no React, no test runtime.
import type { JSONContent } from '@tiptap/core';

export const SAMPLE_RECIPE_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'How to install a manometer correctly' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Mount the manometer perpendicular to the pipe with the dial facing the operator. ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: { href: 'https://example.com/installation-guide' },
            },
          ],
          text: 'See the full installation guide',
        },
        { type: 'text', text: ' for media and pressure-range guidance.' },
      ],
    },
    {
      type: 'image',
      attrs: { publicId: 'manometr/sample/inline-1', alt: 'Sample diagram' },
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Calibrate annually against a deadweight tester to keep readings within ±0.25 % FS.',
        },
      ],
    },
  ],
};

export const SAMPLE_INDUSTRY_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [
        { type: 'text', text: 'Pressure measurement in oil & gas operations' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Upstream wellhead, midstream pipeline, and downstream refinery sites all share the same core pressure-monitoring stack. ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'link',
              attrs: { href: 'https://example.com/oil-gas-overview' },
            },
          ],
          text: 'Read the industry overview',
        },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'image',
      attrs: {
        publicId: 'manometr/sample/inline-1',
        alt: 'Refinery pressure schematic',
      },
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Manometr supplies WIKA, BD Sensors, and Метран instrumentation calibrated for the temperature, vibration, and certification profiles each segment requires.',
        },
      ],
    },
  ],
};
