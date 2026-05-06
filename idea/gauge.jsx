// Gauge.jsx — premium technical dial illustration
function Gauge({ size = 280, value = 6.4, max = 10, unit = 'MPa', label = 'PRESSURE', danger = 8, theme = 'light' }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.42;
  const startA = 135, endA = 405;
  const sweep = endA - startA;
  const angleFor = (v) => startA + (v / max) * sweep;
  const polar = (a, rad) => {
    const t = (a * Math.PI) / 180;
    return [cx + Math.cos(t) * rad, cy + Math.sin(t) * rad];
  };
  const dark = theme === 'dark';
  const face = dark ? '#1d1f24' : '#fafaf7';
  const ring = dark ? '#2a2c32' : '#14161b';
  const tickC = dark ? '#a7a9af' : '#14161b';
  const tickMinor = dark ? '#4a4c52' : '#a7a9af';
  const txt = dark ? '#f5f3ee' : '#14161b';
  const dim = dark ? '#a7a9af' : '#74777e';

  const els = [];
  const N = 11, m = 5;
  for (let i = 0; i < N; i++) {
    const v = (i / (N - 1)) * max;
    const a = angleFor(v);
    const [x1, y1] = polar(a, r);
    const [x2, y2] = polar(a, r - size * 0.06);
    const isD = v >= danger;
    els.push(<line key={`M${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isD ? '#1240e5' : tickC} strokeWidth={1.8} />);
    const [tx, ty] = polar(a, r - size * 0.115);
    els.push(<text key={`N${i}`} x={tx} y={ty} fill={isD ? '#1240e5' : txt}
      fontFamily="JetBrains Mono" fontSize={size * 0.05} fontWeight={600}
      textAnchor="middle" dominantBaseline="central">{Math.round(v)}</text>);
    if (i < N - 1) for (let j = 1; j < m; j++) {
      const vm = v + (j / m) * (max / (N - 1));
      const am = angleFor(vm);
      const [a1, b1] = polar(am, r), [a2, b2] = polar(am, r - size * 0.022);
      els.push(<line key={`m${i}${j}`} x1={a1} y1={b1} x2={a2} y2={b2} stroke={tickMinor} strokeWidth={0.8} />);
    }
  }

  const [dx1, dy1] = polar(angleFor(danger), r + 4);
  const [dx2, dy2] = polar(angleFor(max), r + 4);
  const dArc = `M ${dx1} ${dy1} A ${r + 4} ${r + 4} 0 0 1 ${dx2} ${dy2}`;
  const nA = angleFor(Math.min(value, max));
  const [nx, ny] = polar(nA, r - size * 0.07);
  const [tlx, tly] = polar(nA + 180, size * 0.04);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r + size * 0.05} fill="none" stroke={ring} strokeWidth={size * 0.01} />
      <circle cx={cx} cy={cy} r={r + size * 0.022} fill={face} stroke={ring} strokeWidth={1} />
      <path d={dArc} stroke="#1240e5" strokeWidth={size * 0.014} fill="none" />
      {els}
      <text x={cx} y={cy - size * 0.13} textAnchor="middle"
        fontFamily="JetBrains Mono" fontSize={size * 0.04} fill={dim} letterSpacing="0.18em">{label}</text>
      <text x={cx} y={cy + size * 0.18} textAnchor="middle"
        fontFamily="JetBrains Mono" fontSize={size * 0.045} fill={dim} letterSpacing="0.14em">{unit}</text>
      <line x1={tlx} y1={tly} x2={nx} y2={ny} stroke="#1240e5" strokeWidth={size * 0.016} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={size * 0.038} fill={ring} />
      <circle cx={cx} cy={cy} r={size * 0.016} fill="#1240e5" />
    </svg>
  );
}
window.Gauge = Gauge;
