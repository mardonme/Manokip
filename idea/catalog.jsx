// catalog.jsx — catalog (PLP) screen
function CatalogPage() {
  return (
    <div className="mk" style={{ width: 1440, background: 'var(--bg)' }}>
      <StoreHeader active="Catalog" />

      {/* breadcrumb + page head */}
      <div style={{ padding: '40px 40px 24px' }}>
        <div className="mk-mono" style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>
          Home / Catalog / Pressure gauges
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>Pressure gauges</h1>
            <p style={{ fontSize: 16, color: '#3a3d44', marginTop: 12, maxWidth: 580 }}>
              Mechanical and digital instruments for measuring liquid and gas pressure. From compact MP2 series to vibration-resistant DM8008.
            </p>
          </div>
          <div className="mk-mono" style={{ fontSize: 12, color: '#74777e', textAlign: 'right' }}>
            <div>84 PRODUCTS</div>
            <div style={{ marginTop: 4 }}>9 SUBCATEGORIES</div>
          </div>
        </div>
      </div>

      {/* filter bar */}
      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {[
          ['Diameter', '40, 50, 63, 100, 160, 250'],
          ['Accuracy class', '0.4, 0.6, 1.0, 1.5, 2.5'],
          ['Connection', 'Radial · Axial'],
          ['Protection', 'IP40 — IP67'],
          ['Material', 'Steel · Brass · 316L'],
        ].map(([t, v]) => (
          <button key={t} className="mk-tag" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '6px 12px', textTransform: 'none', letterSpacing: 0, gap: 0 }}>
            <span style={{ fontSize: 9.5, color: '#a7a9af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t}</span>
            <span style={{ fontSize: 11.5, color: '#14161b', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{v} ▾</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="mk-btn mk-btn-sm mk-btn-light">All filters · 12</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0 }}>
        {/* sidebar */}
        <aside style={{ padding: '40px 24px 40px 40px', borderRight: '1px solid var(--line)' }}>
          <div className="mk-eyebrow" style={{ marginBottom: 16 }}>Subcategories</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['Technical gauges', 38, true],
              ['Electrocontact', 22, false],
              ['Reference & precision', 14, false],
              ['Corrosion-resistant', 19, false],
              ['Ammonia', 11, false],
              ['Explosion-proof', 8, false],
              ['Railway', 6, false],
              ['Vibration-resistant', 24, false],
              ['Digital', 9, false],
            ].map(([n, c, active]) => (
              <a key={n} style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
                background: active ? '#14161b' : 'transparent', color: active ? '#fff' : '#3a3d44',
                fontSize: 13.5, cursor: 'pointer', borderRadius: 4
              }}>
                <span>{n}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: active ? '#a7a9af' : '#a7a9af' }}>{c}</span>
              </a>
            ))}
          </div>

          <div className="mk-eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>Pressure range</div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 16, borderRadius: 4 }}>
            <div className="mk-mono" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span>−1 kgf/cm²</span><span>400 kgf/cm²</span>
            </div>
            <div style={{ position: 'relative', height: 4, background: 'var(--line)', borderRadius: 2 }}>
              <div style={{ position: 'absolute', left: '20%', right: '30%', top: 0, bottom: 0, background: '#1240e5' }} />
              <div style={{ position: 'absolute', left: '20%', top: -4, width: 12, height: 12, background: '#fff', border: '2px solid #1240e5', borderRadius: '50%', transform: 'translateX(-50%)' }} />
              <div style={{ position: 'absolute', left: '70%', top: -4, width: 12, height: 12, background: '#fff', border: '2px solid #1240e5', borderRadius: '50%', transform: 'translateX(-50%)' }} />
            </div>
            <div className="mk-mono" style={{ fontSize: 11.5, marginTop: 16, color: '#1240e5', display: 'flex', justifyContent: 'space-between' }}>
              <span>0 kgf/cm²</span><span>250 kgf/cm²</span>
            </div>
          </div>

          <div className="mk-eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>Certifications</div>
          {['GOST R', 'EAC', 'ATEX', 'O‘zStandart', 'CE'].map(c => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13 }}>
              <span style={{ width: 14, height: 14, border: '1.5px solid var(--line-2)', borderRadius: 3, background: c === 'GOST R' || c === 'EAC' ? '#1240e5' : '#fff', borderColor: c === 'GOST R' || c === 'EAC' ? '#1240e5' : 'var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}>
                {(c === 'GOST R' || c === 'EAC') && '✓'}
              </span>
              {c}
            </label>
          ))}
        </aside>

        {/* products */}
        <div style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="mk-tag mk-tag-solid">Ø100 ✕</span>
              <span className="mk-tag mk-tag-solid">Class 1.5 ✕</span>
              <span className="mk-tag mk-tag-solid">IP65 ✕</span>
              <button style={{ background: 'transparent', border: 'none', fontSize: 12, color: '#74777e', cursor: 'pointer' }}>Clear all</button>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: '#74777e' }}>Sort:</span>
              <span style={{ fontWeight: 500 }}>Most popular ▾</span>
              <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                <button style={{ padding: '6px 10px', background: '#14161b', color: '#fff', border: 'none', cursor: 'pointer' }}>▦</button>
                <button style={{ padding: '6px 10px', background: '#fff', border: 'none', borderLeft: '1px solid var(--line)', cursor: 'pointer', color: '#74777e' }}>≡</button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {PRODUCTS.slice(0, 9).map(p => <ProductCard key={p.id} p={p} />)}
          </div>
          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mk-mono" style={{ fontSize: 11.5, color: '#74777e' }}>Showing 1—9 of 84</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['1', '2', '3', '…', '10'].map((n, i) => (
                <button key={i} style={{
                  width: 32, height: 32, border: i === 0 ? '1px solid #14161b' : '1px solid var(--line)',
                  background: i === 0 ? '#14161b' : '#fff', color: i === 0 ? '#fff' : '#14161b',
                  fontSize: 13, cursor: 'pointer', borderRadius: 4, fontFamily: 'inherit'
                }}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <StoreFooter />
    </div>
  );
}
window.CatalogPage = CatalogPage;
