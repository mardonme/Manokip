// home.jsx — premium homepage
function HomePage() {
  return (
    <div className="mk" style={{ width: 1440, background: 'var(--bg)' }}>
      <StoreHeader active="" />

      {/* HERO */}
      <section style={{ padding: '80px 40px 100px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
              <span className="mk-tag mk-tag-accent">● NEW · 2026</span>
              <span className="mk-eyebrow">Manokip series IV — pressure transducers</span>
            </div>
            <h1 style={{ fontSize: 92, fontWeight: 600, lineHeight: 0.96, letterSpacing: '-0.035em', margin: 0 }}>
              Precision instruments,<br />
              <span style={{ color: '#74777e' }}>quietly</span> engineered.
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.5, color: '#3a3d44', marginTop: 28, maxWidth: 520 }}>
              Manokip designs and manufactures pressure gauges, transducers, level meters and protection relays for industry. Calibrated in Tashkent. Trusted from oil & gas to HVAC across 14 sectors.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
              <button className="mk-btn mk-btn-primary">Browse catalog →</button>
              <button className="mk-btn mk-btn-light">Request a quote</button>
            </div>
            <div style={{ display: 'flex', gap: 48, marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--line)' }}>
              {[
              ['7+', 'years in production'],
              ['1 200+', 'enterprise clients'],
              ['ISO 9001', 'certified facility'],
              ['±0.5%', 'measurement class']].
              map(([n, l]) =>
              <div key={l}>
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{n}</div>
                  <div style={{ fontSize: 12.5, color: '#74777e', marginTop: 4 }}>{l}</div>
                </div>
              )}
            </div>
          </div>
          {/* hero gauge */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 500 }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }} className="mk-dotgrid" />
            <div style={{ position: 'relative' }}>
              <Gauge size={420} value={6.4} max={10} unit="MPa" label="MANOBAR PG · 0.5%" danger={8.5} />
              {/* technical callouts */}
              <div style={{ position: 'absolute', top: 30, right: -50, fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#74777e' }}>
                <div style={{ width: 60, height: 1, background: '#74777e', marginBottom: 4 }} />
                STAINLESS Ø100mm
              </div>
              <div style={{ position: 'absolute', bottom: 60, left: -70, fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#74777e', textAlign: 'right' }}>
                <div style={{ width: 60, height: 1, background: '#74777e', marginBottom: 4, marginLeft: 'auto' }} />
                4–20 mA · HART
              </div>
            </div>
          </div>
        </div>
        {/* ticker */}
        <div style={{ marginTop: 60, paddingTop: 28, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: 11, color: '#74777e', letterSpacing: '0.06em' }}>
          <span>TRUSTED BY</span>
          <span>NGMK</span><span>JPETROL</span><span>UZBEKNEFTEGAZ</span><span>TTZ</span><span>ENT-EN</span>
          <span>+1 200 MORE</span>
        </div>
      </section>

      {/* CATEGORIES STRIP */}
      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div className="mk-eyebrow">01 — Catalog</div>
            <h2 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.025em', margin: '12px 0 0' }}>Twelve product families.</h2>
          </div>
          <a style={{ fontSize: 14, color: '#1240e5', cursor: 'pointer' }}>See all 230 products →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {CATEGORIES.map((c, i) =>
          <div key={c.name} style={{ background: '#fff', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 200, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="mk-mono" style={{ fontSize: 11, color: '#a7a9af' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="mk-mono" style={{ fontSize: 11, color: '#74777e' }}>{c.count} items</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: '#74777e', marginTop: 4, fontFamily: 'JetBrains Mono' }}>{c.ru}</div>
              </div>
              <div style={{ fontSize: 13, color: '#1240e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                Browse <span style={{ fontSize: 16 }}>→</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div className="mk-eyebrow">02 — Featured</div>
            <h2 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.025em', margin: '12px 0 0' }}>This quarter's instruments.</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['All', 'Gauges', 'Transducers', 'Level', 'Relays'].map((t, i) =>
            <button key={t} className="mk-tag" style={i === 0 ? { background: '#14161b', color: '#fff', borderColor: '#14161b' } : {}}>{t}</button>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {PRODUCTS.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* SOLUTIONS BAND */}
      <section style={{ background: '#14161b', color: '#f5f3ee', padding: '88px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64 }}>
          <div>
            <div className="mk-eyebrow" style={{ color: '#a7a9af' }}>03 — Solutions</div>
            <h2 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.025em', margin: '12px 0 24px' }}>Built for the field.</h2>
            <p style={{ fontSize: 16, color: '#a7a9af', lineHeight: 1.6, maxWidth: 380 }}>
              From −60°C in Siberian wellheads to +200°C in Uzbek refineries — Manokip instruments are engineered to survive the conditions that destroy ordinary gauges.
            </p>
            <button className="mk-btn mk-btn-light" style={{ marginTop: 28, background: 'transparent', color: '#f5f3ee', borderColor: '#3a3d44' }}>All solutions →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: '#2a2c32' }}>
            {[
            ['Oil & Gas', 'Wellhead pressure, separator, transport pipelines', 'JPETROL · UZBEKNEFTEGAZ'],
            ['Mining', 'Hydraulic systems, ventilation, slurry pipelines', 'NGMK'],
            ['Chemical', 'Corrosion-resistant, ammonia-rated', 'ENT-EN'],
            ['Power & HVAC', 'Steam, condensate, chilled water loops', 'TTZ']].
            map(([t, d, c]) =>
            <div key={t} style={{ background: '#14161b', padding: '32px 28px' }}>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>{t}</div>
                <div style={{ fontSize: 13.5, color: '#a7a9af', marginTop: 6, lineHeight: 1.5 }}>{d}</div>
                <div className="mk-mono" style={{ fontSize: 10.5, color: '#74777e', marginTop: 18, letterSpacing: '0.08em' }}>↳ {c}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SERVICE / CTA */}
      <section style={{ padding: '88px 40px', width: "0px", height: "0px", lineHeight: "0", letterSpacing: "0px" }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          <div style={{ background: '#fff', padding: '48px 40px', width: "0px", height: "0px" }}>
            <div className="mk-eyebrow"></div>
            <h3 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', margin: '14px 0 16px' }}></h3>
            <p style={{ fontSize: 15, color: '#3a3d44', lineHeight: 1.55, maxWidth: 460 }}>
              Calibration, repair and verification of any pressure or temperature instrument — Manokip-built or otherwise. O‘zStandart-accredited laboratory.
            </p>
            <div style={{ display: 'flex', gap: 28, marginTop: 32, paddingTop: 28, borderTop: '1px solid var(--line-soft)' }}>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>48h</div><div style={{ fontSize: 12, color: '#74777e' }}>turnaround</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>±0.05%</div><div style={{ fontSize: 12, color: '#74777e' }}>uncertainty</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>14k+</div><div style={{ fontSize: 12, color: '#74777e' }}>verified / yr</div></div>
            </div>
          </div>
          <div style={{ background: '#fff', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: "0px", height: "0px" }}>
            <div>
              <div className="mk-eyebrow"></div>
              <h3 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', margin: '14px 0 16px' }}></h3>
              <p style={{ fontSize: 15, color: '#3a3d44', lineHeight: 1.55, maxWidth: 460 }}>

              </p>
            </div>
            <button className="mk-btn mk-btn-primary" style={{ alignSelf: 'flex-start', marginTop: 32 }}>rt an order →</button>
          </div>
        </div>
      </section>

      <StoreFooter />
    </div>);

}
window.HomePage = HomePage;