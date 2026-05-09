'use client';

// Quick task 260509-oha — homepage mock client island.
//
// THROWAWAY. Phase 8 plan 08-HOME-* will replace the entire homepage
// (and this component along with it). Only purpose here is the single
// mounted-on-load count-up animation for the hero stat strip — the
// outer page is RSC, so this small island is the only client boundary.

import * as React from 'react';

export interface HomeStatTickerProps {
  stats: Array<{ label: string; value: number; suffix?: string }>;
}

export function HomeStatTicker({ stats }: HomeStatTickerProps) {
  // Mounted-on-load count-up: each stat eases from 0 -> value over 1200ms.
  const [vals, setVals] = React.useState<number[]>(() => stats.map(() => 0));

  React.useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVals(stats.map((s) => Math.round(s.value * eased)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stats]);

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      data-testid="home-stat-ticker"
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="rounded-lg border border-line bg-surface px-4 py-3"
        >
          <div className="mk-eyebrow">{s.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-ink mk-mono">
            {vals[i]}
            {s.suffix ?? ''}
          </div>
        </div>
      ))}
    </div>
  );
}
