// product.jsx — product detail page
function ProductPage() {
  const p = { model: 'DM8008-VU', desc: 'Vibration-resistant pressure gauge', range: '0–400 kgf/cm²', dia: 100, price: '474 000', cat: 'Vibration-resistant', acc: '1.5' };
  const specs = [
    ['Measurement range', '0 — 400 kgf/cm²'],
    ['Accuracy class', '1.5'],
    ['Case diameter', 'Ø 100 mm'],
    ['Case material', 'Stainless steel AISI 304'],
    ['Wetted parts', 'AISI 316L · brass option'],
    ['Process connection', 'M20×1.5 · ½" NPT · G½"'],
    ['Operating temperature', '−40 to +60 °C'],
    ['Process temperature', '−60 to +200 °C'],
    ['Filling', 'Glycerin 99.5%'],
    ['Protection class', 'IP65'],
    ['Vibration resistance', 'V.H.4 (GOST 12997)'],
    ['Verification interval', '24 months'],
  ];

  return (
    <div className="mk" style={{ width: 1440, background: 'var(--bg)' }}>
      <StoreHeader active="Catalog" />

      {/* breadcrumb */}
      <div style={{ padding: '20px 40px', borderBottom: '1px solid var(--line)' }} className="mk-mono">
        <span style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Home / Catalog / Pressure gauges / Vibration-resistant / DM8008-VU
        </span>
      </div>

      <section style={{ padding: '48px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        {/* gallery */}
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 60, position: 'relative', minHeight: 520 }}>
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
              <span className="mk-tag mk-tag-accent">● IN STOCK · 124</span>
              <span className="mk-tag">SHIPS 1–3 DAYS</span>
            </div>
            <div style={{ position: 'absolute', top: 16, right: 16 }} className="mk-mono">
              <span style={{ fontSize: 10.5, color: '#74777e', letterSpacing: '0.08em' }}>SKU · MK-DM8008-VU-400</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <Gauge size={400} value={120} max={400} unit="kgf/cm²" label="DM8008-VU" danger={350} />
            </div>
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontFamily: 'JetBrains Mono', fontSize: 10, color: '#a7a9af' }}>
              ↤ scroll · 4 views ↦
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="mk-ph" style={{ height: 80, border: i === 0 ? '1.5px solid #1240e5' : '1px solid var(--line)' }}>
                view {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* details */}
        <div>
          <div className="mk-eyebrow">{p.cat} · GOST 2405-88</div>
          <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 8px' }}>{p.model}</h1>
          <p style={{ fontSize: 17, color: '#3a3d44', marginTop: 0 }}>
            Vibration-resistant glycerin-filled gauge for hydraulic systems with continuous pulsation. Ø100 mm case, accuracy class 1.5, stainless construction.
          </p>

          <div style={{ marginTop: 32, padding: '20px 24px', background: '#fff', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div className="mk-eyebrow">Price · 1 unit</div>
                <div style={{ fontSize: 36, fontWeight: 600, marginTop: 4 }}>474 000 <span style={{ fontSize: 16, color: '#74777e', fontWeight: 400 }}>sum</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mk-eyebrow">Volume · 100+</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#1240e5', marginTop: 4 }}>−18%</div>
              </div>
            </div>
          </div>

          {/* configurator */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div className="mk-eyebrow" style={{ marginBottom: 10 }}>Range</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['0–2.5', '0–10', '0–60', '0–250', '0–400', '0–600'].map((r, i) => (
                  <button key={r} className="mk-tag" style={i === 4 ? { background: '#14161b', color: '#fff', borderColor: '#14161b' } : {}}>{r} kgf/cm²</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mk-eyebrow" style={{ marginBottom: 10 }}>Connection</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['M20×1.5', '½" NPT', 'G½"', 'G¼"'].map((r, i) => (
                  <button key={r} className="mk-tag" style={i === 0 ? { background: '#14161b', color: '#fff', borderColor: '#14161b' } : {}}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mk-eyebrow" style={{ marginBottom: 10 }}>Mount</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Radial', 'Axial', 'Axial w/ flange'].map((r, i) => (
                  <button key={r} className="mk-tag" style={i === 0 ? { background: '#14161b', color: '#fff', borderColor: '#14161b' } : {}}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mk-eyebrow" style={{ marginBottom: 10 }}>Quantity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 999, background: '#fff' }}>
                  <button style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>−</button>
                  <input defaultValue={1} style={{ width: 56, border: 'none', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 14, background: 'transparent' }} />
                  <button style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>+</button>
                </div>
                <span style={{ fontSize: 12.5, color: '#74777e' }}>124 in stock</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
            <button className="mk-btn mk-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Add to order</button>
            <button className="mk-btn mk-btn-light" style={{ flex: 1, justifyContent: 'center' }}>Request quote</button>
            <button className="mk-btn mk-btn-light" style={{ width: 44, justifyContent: 'center', padding: 0 }}>♡</button>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 24, fontSize: 12.5, color: '#74777e' }}>
            <span>✓ 24-month warranty</span>
            <span>✓ Calibration certificate included</span>
            <span>✓ Free shipping over 5 units</span>
          </div>
        </div>
      </section>

      {/* spec table */}
      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
          {['Specifications', 'Documentation', 'Calibration', 'Compatibility', 'Reviews · 38'].map((t, i) => (
            <button key={t} style={{
              padding: '16px 0', marginRight: 36, background: 'transparent', border: 'none',
              borderBottom: i === 0 ? '2px solid #14161b' : '2px solid transparent',
              fontSize: 14, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? '#14161b' : '#74777e', cursor: 'pointer'
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 32, background: 'var(--line)', border: '1px solid var(--line)', gap: 1 }}>
          {specs.map(([k, v], i) => (
            <div key={k} style={{ background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, color: '#74777e' }}>{k}</span>
              <span className="mk-mono" style={{ fontSize: 13, color: '#14161b' }}>{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* related */}
      <section style={{ padding: '0 40px 80px' }}>
        <div className="mk-eyebrow">Related instruments</div>
        <h3 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: '12px 0 24px' }}>Often paired with DM8008-VU</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {PRODUCTS.slice(2, 6).map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}
window.ProductPage = ProductPage;
