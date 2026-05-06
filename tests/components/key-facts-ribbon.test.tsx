// Plan 06-01 task 3 — Wave 0 RED gate for REUSE-02 KeyFactsRibbon reskin.
//
// Asserts the post-reskin contract:
//   - Variant grid columns drive from facts.length (3 → lg:grid-cols-3,
//     4 → lg:grid-cols-4, default → lg:grid-cols-6) — current impl
//     hardcodes lg:grid-cols-6 regardless of fact count.
//   - Each tile carries .mk-eyebrow on its label slot (D-03 helper class).
//
// Today this MUST be RED — the current src/components/public/key-facts-ribbon.tsx
// always emits "lg:grid-cols-6" and uses text-slate-* classes (no
// .mk-eyebrow). The 3-fact and 4-fact assertions fail; the .mk-eyebrow
// assertion fails. Wave 3 reskin flips it GREEN.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyFactsRibbon } from '@/components/public/key-facts-ribbon';

describe('KeyFactsRibbon — REUSE-02 variant grid columns', () => {
  it('renders lg:grid-cols-3 for 3 facts', () => {
    render(
      <KeyFactsRibbon
        facts={[
          { label: 'A', value: '1' },
          { label: 'B', value: '2' },
          { label: 'C', value: '3' },
        ]}
      />,
    );
    expect(screen.getByTestId('key-facts-ribbon').className).toContain('lg:grid-cols-3');
  });

  it('renders lg:grid-cols-4 for 4 facts', () => {
    render(
      <KeyFactsRibbon
        facts={[
          { label: 'A', value: '1' },
          { label: 'B', value: '2' },
          { label: 'C', value: '3' },
          { label: 'D', value: '4' },
        ]}
      />,
    );
    expect(screen.getByTestId('key-facts-ribbon').className).toContain('lg:grid-cols-4');
  });

  it('renders lg:grid-cols-6 for 6 facts', () => {
    render(
      <KeyFactsRibbon
        facts={[
          { label: 'A', value: '1' },
          { label: 'B', value: '2' },
          { label: 'C', value: '3' },
          { label: 'D', value: '4' },
          { label: 'E', value: '5' },
          { label: 'F', value: '6' },
        ]}
      />,
    );
    expect(screen.getByTestId('key-facts-ribbon').className).toContain('lg:grid-cols-6');
  });

  it('renders mk-eyebrow on each label', () => {
    const { container } = render(
      <KeyFactsRibbon
        facts={[
          { label: 'X', value: 'Y' },
          { label: 'X', value: 'Y' },
          { label: 'X', value: 'Y' },
        ]}
      />,
    );
    expect(container.querySelectorAll('.mk-eyebrow').length).toBeGreaterThanOrEqual(3);
  });
});
