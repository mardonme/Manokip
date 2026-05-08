// Phase 6 plan 06-04 — REUSE-02 KeyFactsRibbon reskin (in place; props frozen).
//
// v1.1 design canvas reskin. Variant grid columns are driven by `facts.length`:
//   - 3 facts -> lg:grid-cols-3 (service trust strip)
//   - 4 facts -> lg:grid-cols-4 (home stats / PDP key facts)
//   - default -> lg:grid-cols-6 (legacy 6-tile spec strip)
// Tile chrome: bg-surface + border-line (D-02 tokens). Label uses .mk-eyebrow
// (D-03 helper, mono / 11px / uppercase / 0.14em letter-spacing); value uses
// .mk-mono tabular-nums (JetBrains Mono via D-04 alias inside .mk scope).
//
// Pure RSC. KeyFact + KeyFactsRibbonProps interfaces are FROZEN per REUSE-02.

import * as React from 'react';

export interface KeyFact {
  label: string;
  value: string;
}

export interface KeyFactsRibbonProps {
  facts: KeyFact[];
}

export function KeyFactsRibbon({ facts }: KeyFactsRibbonProps): React.JSX.Element | null {
  if (facts.length === 0) return null;

  // Phase 6 REUSE-02 — variant grid columns by facts.length.
  // Used by: home (4 stats), PDP (4 facts), service (3 trust facts).
  const gridCols =
    facts.length === 3
      ? 'lg:grid-cols-3'
      : facts.length === 4
        ? 'lg:grid-cols-4'
        : 'lg:grid-cols-6';

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 ${gridCols} gap-3`}
      data-testid="key-facts-ribbon"
    >
      {facts.map((fact, idx) => (
        <div
          key={`${fact.label}-${idx}`}
          className="rounded-lg border border-line bg-surface px-3 py-2.5"
        >
          <div className="mk-eyebrow">{fact.label}</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-ink mk-mono">
            {fact.value}
          </div>
        </div>
      ))}
    </div>
  );
}
