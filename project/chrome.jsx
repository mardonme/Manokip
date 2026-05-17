// chrome.jsx — shared header / footer / logo for storefront

function Logo({ dark = false, size = 13 }) {
  const c = dark ? '#f5f3ee' : '#14161b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width={size * 1.85} height={size * 1.85} viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="11.5" fill="none" stroke={c} strokeWidth="1.2" />
        <circle cx="14" cy="14" r="2.2" fill="#1240e5" />
        <line x1="14" y1="14" x2="20" y2="8.5" stroke="#1240e5" strokeWidth="1.8" strokeLinecap="round" />
        {[0, 90, 180, 270].map((a) => {
          const t = a * Math.PI / 180;
          return <line key={a} x1={14 + Math.cos(t) * 8.5} y1={14 + Math.sin(t) * 8.5}
          x2={14 + Math.cos(t) * 11} y2={14 + Math.sin(t) * 11} stroke={c} strokeWidth="1" />;
        })}
      </svg>
      <span style={{
        fontFamily: 'Inter Tight', fontSize: size, fontWeight: 700,
        letterSpacing: '0.22em', color: c, textTransform: 'uppercase'
      }}>MANOKIP</span>
    </div>);

}

function StoreHeader({ active = 'Catalog', dark = false }) {
  const items = ['Catalog', 'Solutions', 'Service', 'About', 'Contact'];
  const fg = dark ? '#f5f3ee' : '#14161b';
  const dim = dark ? '#a7a9af' : '#74777e';
  const line = dark ? '#2a2c32' : '#e5e1d8';
  const surf = dark ? '#14161b' : 'rgba(245,243,238,0.92)';
  return (
    <header style={{ borderBottom: `1px solid ${line}`, background: surf, backdropFilter: 'blur(14px)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 40px', borderBottom: `1px solid ${line}`,
        fontFamily: 'JetBrains Mono', fontSize: 10.5, color: dim, letterSpacing: '0.06em'
      }}>
        <div style={{ display: 'flex', gap: 22 }}>
          <span>● TASHKENT · MOSCOW · ALMATY</span>
          <span>SHIPS TO 14 COUNTRIES</span>
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          <a href="tel:+998936939220">+998 93 693-92-20</a>
          {/* <span>+998 93 693-92-20</span> */}
          <span>RU · EN · UZ</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 40px', gap: 40 }}>
        <Logo dark={dark} size={13} />
        <nav style={{ display: 'flex', gap: 30, flex: 1, justifyContent: 'center' }}>
          {items.map((it) =>
          <a key={it} style={{
            fontSize: 14, fontWeight: it === active ? 600 : 500,
            color: it === active ? fg : dim, textDecoration: 'none', cursor: 'pointer',
            borderBottom: it === active ? `2px solid #1240e5` : '2px solid transparent', paddingBottom: 4
          }}>{it}</a>
          )}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
            border: `1px solid ${line}`, padding: '8px 12px', borderRadius: 999,
            color: fg, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minWidth: 200
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <span style={{ color: dim, flex: 1, textAlign: 'left' }}>Search part №…</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: dim }}>⌘K</span>
          </button>
          <a style={{ fontSize: 13, color: fg, cursor: 'pointer' }}>Sign in</a>
          <button className="mk-btn mk-btn-sm mk-btn-primary">Request quote</button>
        </div>
      </div>
    </header>);

}

function StoreFooter() {
  const cols = [
  { t: 'Catalog', i: ['Pressure gauges', 'Electrocontact gauges', 'Vibration-resistant', 'Vacuum gauges', 'Pressure transducers', 'Level meters', 'Solar panels'] },
  { t: 'Solutions', i: ['Oil & gas', 'Mining', 'Chemical', 'HVAC', 'Railway', 'Power generation'] },
  { t: 'Service', i: ['Calibration', 'Verification', 'Repair', 'Custom orders', 'Documentation', 'Training'] },
  { t: 'Company', i: ['About Manokip', 'Manufacturing', 'Certificates', 'Partners', 'Press', 'Careers'] }];

  return (
    <footer style={{ background: '#14161b', color: '#f5f3ee', padding: '72px 40px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 56, paddingBottom: 48, borderBottom: '1px solid #2a2c32' }}>
        <div>
          <Logo dark size={14} />
          <p style={{ marginTop: 24, color: '#a7a9af', fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
            Production and supply of control & measuring instruments. Engineered in Tashkent, trusted across 14 industries from oil & gas to mining and HVAC.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['ISO 9001', 'GOST R', 'EAC', 'O\'zStandart'].map((t) =>
            <span key={t} className="mk-tag" style={{ background: 'transparent', borderColor: '#2a2c32', color: '#a7a9af' }}>{t}</span>
            )}
          </div>
        </div>
        {cols.map((c) =>
        <div key={c.t}>
            <div className="mk-eyebrow" style={{ color: '#74777e', marginBottom: 16 }}>{c.t}</div>
            {c.i.map((i) => <div key={i} style={{ fontSize: 13.5, marginBottom: 10, color: '#f5f3ee', cursor: 'pointer' }}>{i}</div>)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 28, fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#74777e', letterSpacing: '0.06em' }}>
        <span>© 2018–2026 MANOKIP — TASHKENT, UZBEKISTAN · BEKTEMIR DISTRICT, ROHAT 13A</span>
        <span>UPDATED 2026.04.30</span>
      </div>
    </footer>);

}

window.Logo = Logo;
window.StoreHeader = StoreHeader;
window.StoreFooter = StoreFooter;