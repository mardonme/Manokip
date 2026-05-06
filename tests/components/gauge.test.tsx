// Plan 06-01 task 2 — Wave 0 RED gate for DESIGN-04 <Gauge> SVG component.
//
// Asserts the visual contract that Wave 3 (06-W3 task: create
// src/components/public/gauge.tsx, ported from idea/gauge.jsx) must honor:
//   - Root <svg data-testid="gauge-svg"> with viewBox `0 0 ${size} ${size}`.
//   - At least 11 major-tick <line> elements (idea/gauge.jsx emits 11 +
//     40 minor + 1 needle ≈ 52).
//   - At least one <path> for the danger-arc shape.
//   - Needle line stroke uses #1240e5 (the D-02 --accent raw value).
//   - `size` prop drives the viewBox ("size honors prop").
//
// Today this MUST be RED — the import `@/components/public/gauge` does not
// resolve (Wave 3 has not created the file yet).

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Gauge } from '@/components/public/gauge';

describe('Gauge — DESIGN-04 visual contract', () => {
  it('renders root <svg data-testid="gauge-svg"> with viewBox 0 0 280 280', () => {
    const { container } = render(<Gauge size={280} value={5} max={10} />);
    const svg = container.querySelector('svg[data-testid="gauge-svg"]');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 280 280');
  });

  it('renders at least 11 major-tick <line> elements', () => {
    const { container } = render(<Gauge size={280} value={5} max={10} />);
    const lines = container.querySelectorAll('line');
    // 11 major + (10 * 4 = 40 minor) + 1 needle ≈ 52
    expect(lines.length).toBeGreaterThanOrEqual(11);
  });

  it('renders at least one <path> for the danger arc', () => {
    const { container } = render(<Gauge size={280} value={5} max={10} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a needle line with stroke #1240e5 (accent color)', () => {
    const { container } = render(<Gauge size={280} value={6.4} max={10} danger={8} />);
    const accentLines = Array.from(container.querySelectorAll('line')).filter(
      (l) => l.getAttribute('stroke')?.toLowerCase() === '#1240e5',
    );
    expect(accentLines.length).toBeGreaterThanOrEqual(1);
  });

  it('honors size prop in viewBox', () => {
    const { container } = render(<Gauge size={400} value={3} max={10} />);
    const svg = container.querySelector('svg[data-testid="gauge-svg"]');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 400 400');
  });
});
