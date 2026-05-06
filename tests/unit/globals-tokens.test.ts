// Plan 06-01 task 1 — Wave 0 RED gate for DESIGN-01 / DESIGN-02 / DESIGN-03.
//
// File-as-text grep for the 14 raw D-02 design-canvas color tokens, the 12
// D-03 helper-class selectors ported verbatim from idea/styles.css, and the
// Tailwind v4 @theme inline namespace `--color-mk-*` (Pitfall #3 from
// 06-RESEARCH.md — must NOT be `--color-accent` to avoid colliding with
// shadcn's existing `--color-accent` token).
//
// This test runs in the `node` Vitest project (tests/**/*.test.ts excludes
// tests/components/**, see vitest.config.ts) — no jsdom needed because we
// only `readFileSync` the CSS source.
//
// Today this MUST be RED: src/app/globals.css does not yet declare any of
// the --bg / --ink / --line / .mk* / --color-mk-accent symbols. Wave 2
// (D-02 + D-03 token + helper port) flips it GREEN.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

const RAW_TOKENS = [
  ['--bg', '#f5f3ee'],
  ['--bg-2', '#ebe8e1'],
  ['--surface', '#ffffff'],
  ['--ink', '#14161b'],
  ['--ink-2', '#3a3d44'],
  ['--ink-3', '#74777e'],
  ['--ink-4', '#a7a9af'],
  ['--line', '#e5e1d8'],
  ['--line-2', '#d6d2c8'],
  ['--line-soft', '#efece5'],
  ['--accent', '#1240e5'],
  ['--accent-soft', '#e8edff'],
  ['--accent-ink', '#0926a8'],
  ['--warn', '#b8531a'],
  ['--ok', '#1d7a4f'],
] as const;

const HELPER_CLASSES = [
  '.mk',
  '.mk-mono',
  '.mk-eyebrow',
  '.mk-ph',
  '.mk-ph-corners',
  '.mk-btn',
  '.mk-btn-primary',
  '.mk-btn-ghost',
  '.mk-btn-light',
  '.mk-btn-sm',
  '.mk-tag',
  '.mk-tag-solid',
  '.mk-tag-accent',
] as const;

describe('globals.css — DESIGN-01 design canvas tokens (D-02 raw)', () => {
  for (const [name, value] of RAW_TOKENS) {
    it(`declares ${name} with value ${value}`, () => {
      const re = new RegExp(
        `${name.replace(/-/g, '\\-')}\\s*:\\s*${value.replace('#', '\\#')}\\s*;`,
        'i',
      );
      expect(css).toMatch(re);
    });

    it(`declares ${name} at least once`, () => {
      const matches = css.match(new RegExp(`${name.replace(/-/g, '\\-')}\\s*:`, 'g')) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  }
});

describe('globals.css — DESIGN-01 Tailwind @theme namespace (Pitfall #3)', () => {
  it('exposes --color-mk-accent (NOT --color-accent — shadcn collision)', () => {
    expect(css).toMatch(/--color-mk-accent\s*:\s*var\(--accent\)/);
  });

  it('exposes --color-bg, --color-ink, --color-line, --color-mk-accent-soft, --color-mk-accent-ink, --color-warn, --color-ok in the theme block', () => {
    expect(css).toMatch(/--color-bg\s*:\s*var\(--bg\)/);
    expect(css).toMatch(/--color-ink\s*:\s*var\(--ink\)/);
    expect(css).toMatch(/--color-line\s*:\s*var\(--line\)/);
    expect(css).toMatch(/--color-mk-accent-soft\s*:\s*var\(--accent-soft\)/);
    expect(css).toMatch(/--color-mk-accent-ink\s*:\s*var\(--accent-ink\)/);
    expect(css).toMatch(/--color-warn\s*:\s*var\(--warn\)/);
    expect(css).toMatch(/--color-ok\s*:\s*var\(--ok\)/);
  });
});

describe('globals.css — DESIGN-03 .mk-* helper classes (verbatim port of idea/styles.css)', () => {
  for (const sel of HELPER_CLASSES) {
    it(`declares selector ${sel}`, () => {
      const re = new RegExp(`${sel.replace('.', '\\.')}\\s*[\\{,]`);
      expect(css).toMatch(re);
    });
  }

  it('.mk-eyebrow uses var(--mono) for font-family', () => {
    const block = css.match(/\.mk-eyebrow\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toMatch(/font-family\s*:\s*var\(--mono\)/);
  });

  it('.mk maps --font and --mono to next/font CSS variables (D-04 alias)', () => {
    const block = css.match(/\.mk\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toMatch(/--font\s*:\s*var\(--font-inter-tight\)/);
    expect(block).toMatch(/--mono\s*:\s*var\(--font-jetbrains-mono\)/);
  });
});
