// Phase 6 plan 06-04 — <Gauge> RSC SVG component (DESIGN-04).
// Ported verbatim from idea/gauge.jsx (geometry preserved exactly).
// Pure RSC — no 'use client'. Consumed by home hero (Phase 8 HOME-02) and PDP gallery (Phase 9 PDP-02).

import * as React from 'react';

export interface GaugeProps {
  size?: number;        // default 280
  value: number;
  max?: number;         // default 10
  unit?: string;        // default 'MPa'
  label?: string;       // default 'PRESSURE'
  danger?: number;      // default 8 (matches idea/gauge.jsx default)
  theme?: 'light' | 'dark';
}

type Point = readonly [number, number];

export function Gauge({
  size = 280,
  value,
  max = 10,
  unit = 'MPa',
  label = 'PRESSURE',
  danger = 8,
  theme = 'light',
}: GaugeProps): React.JSX.Element {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const startA = 135;
  const endA = 405;
  const sweep = endA - startA;
  const angleFor = (v: number): number => startA + (v / max) * sweep;
  const polar = (a: number, rad: number): Point => {
    const t = (a * Math.PI) / 180;
    return [cx + Math.cos(t) * rad, cy + Math.sin(t) * rad] as const;
  };

  const dark = theme === 'dark';
  const face = dark ? '#1d1f24' : '#fafaf7';
  const ring = dark ? '#2a2c32' : '#14161b';
  const tickC = dark ? '#a7a9af' : '#14161b';
  const tickMinor = dark ? '#4a4c52' : '#a7a9af';
  const txt = dark ? '#f5f3ee' : '#14161b';
  const dim = dark ? '#a7a9af' : '#74777e';

  const els: React.ReactElement[] = [];
  const N = 11;
  const m = 5;
  for (let i = 0; i < N; i++) {
    const v = (i / (N - 1)) * max;
    const a = angleFor(v);
    const [x1, y1] = polar(a, r);
    const [x2, y2] = polar(a, r - size * 0.06);
    const isD = v >= danger;
    els.push(
      <line
        key={`M${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isD ? '#1240e5' : tickC}
        strokeWidth={1.8}
      />,
    );
    const [tx, ty] = polar(a, r - size * 0.115);
    els.push(
      <text
        key={`N${i}`}
        x={tx}
        y={ty}
        fill={isD ? '#1240e5' : txt}
        fontFamily="var(--mono)"
        fontSize={size * 0.05}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {Math.round(v)}
      </text>,
    );
    if (i < N - 1) {
      for (let j = 1; j < m; j++) {
        const vm = v + (j / m) * (max / (N - 1));
        const am = angleFor(vm);
        const [a1, b1] = polar(am, r);
        const [a2, b2] = polar(am, r - size * 0.022);
        els.push(
          <line
            key={`m${i}${j}`}
            x1={a1}
            y1={b1}
            x2={a2}
            y2={b2}
            stroke={tickMinor}
            strokeWidth={0.8}
          />,
        );
      }
    }
  }

  const [dx1, dy1] = polar(angleFor(danger), r + 4);
  const [dx2, dy2] = polar(angleFor(max), r + 4);
  const dArc = `M ${dx1} ${dy1} A ${r + 4} ${r + 4} 0 0 1 ${dx2} ${dy2}`;
  const nA = angleFor(Math.min(value, max));
  const [nx, ny] = polar(nA, r - size * 0.07);
  const [tlx, tly] = polar(nA + 180, size * 0.04);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      data-testid="gauge-svg"
      style={{ display: 'block' }}
      role="img"
      aria-label={`${label} ${value} ${unit}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r + size * 0.05}
        fill="none"
        stroke={ring}
        strokeWidth={size * 0.01}
      />
      <circle cx={cx} cy={cy} r={r + size * 0.022} fill={face} stroke={ring} strokeWidth={1} />
      <path d={dArc} stroke="#1240e5" strokeWidth={size * 0.014} fill="none" />
      {els}
      <text
        x={cx}
        y={cy - size * 0.13}
        textAnchor="middle"
        fontFamily="var(--mono)"
        fontSize={size * 0.04}
        fill={dim}
        letterSpacing="0.18em"
      >
        {label}
      </text>
      <text
        x={cx}
        y={cy + size * 0.18}
        textAnchor="middle"
        fontFamily="var(--mono)"
        fontSize={size * 0.045}
        fill={dim}
        letterSpacing="0.14em"
      >
        {unit}
      </text>
      <line
        x1={tlx}
        y1={tly}
        x2={nx}
        y2={ny}
        stroke="#1240e5"
        strokeWidth={size * 0.016}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={size * 0.038} fill={ring} />
      <circle cx={cx} cy={cy} r={size * 0.016} fill="#1240e5" />
    </svg>
  );
}
