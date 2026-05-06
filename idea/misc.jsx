// misc.jsx — solutions, about, contact
function SolutionsPage() {
  const sol = [
    { t: 'Oil & Gas', d: 'Wellhead pressure monitoring, pipeline transport, separator skids. Built for −60°C ambient and explosive atmospheres.', ind: ['Upstream', 'Midstream', 'Refining'], n: '01' },
    { t: 'Mining', d: 'Hydraulic systems, slurry pipelines, ventilation networks. Vibration-resistant and abrasion-tolerant gauges.', ind: ['Open pit', 'Underground', 'Processing'], n: '02' },
    { t: 'Chemical', d: 'Ammonia-rated, corrosion-resistant 316L wetted parts. Compatible with NH₃, HCl, H₂SO₄ and process steam.', ind: ['Fertilizers', 'Petrochem', 'Pharmaceuticals'], n: '03' },
    { t: 'Power Generation', d: 'Steam, condensate, lubrication and chilled water loops. Class 0.6 reference gauges for boiler rooms.', ind: ['Thermal', 'Hydro', 'Cogeneration'], n: '04' },
    { t: 'HVAC & Utilities', d: 'District heating, water supply, gas distribution. IP65 enclosures and dual-scale dials.', ind: ['Commercial', 'Municipal', 'Industrial'], n: '05' },
    { t: 'Railway', d: 'Brake systems, locomotive air supply, signalling. GOST-certified vibration class V.H.4.', ind: ['Rolling stock', 'Depots', 'Infrastructure'], n: '06' },
  ];
  return (
    <div className="mk" style={{ width: 1440, background: 'var(--bg)' }}>
      <StoreHeader active="Solutions" />
      <section style={{ padding: '80px 40px 60px' }}>
        <div className="mk-eyebrow">Solutions</div>
        <h1 style={{ fontSize: 80, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0', maxWidth: 900 }}>
          Where our instruments work.
        </h1>
        <p style={{ fontSize: 18, color: '#3a3d44', marginTop: 24, maxWidth: 620 }}>
          Six industries. Fourteen process applications. One factory in Tashkent that designs, manufactures and calibrates every part.
        </p>
      </section>
      <section style={{ padding: '0 40px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {sol.map(s => (
            <div key={s.t} style={{ background: '#fff', padding: '40px 36px', minHeight: 280, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <span className="mk-mono" style={{ fontSize: 11, color: '#a7a9af' }}>{s.n}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {s.ind.map(i => <span key={i} className="mk-tag">{i}</span>)}
                </div>
              </div>
              <h3 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{s.t}</h3>
              <p style={{ fontSize: 14.5, color: '#3a3d44', lineHeight: 1.55, marginTop: 12, flex: 1 }}>{s.d}</p>
              <a style={{ fontSize: 13, color: '#1240e5', cursor: 'pointer', marginTop: 16 }}>Recommended instruments →</a>
            </div>
          ))}
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}

function AboutPage() {
  return (
    <div className="mk" style={{ width: 1440, background: 'var(--bg)' }}>
      <StoreHeader active="About" />
      <section style={{ padding: '80px 40px 60px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">About Manokip</div>
          <h1 style={{ fontSize: 76, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>
            Seven years.<br />
            <span style={{ color: '#74777e' }}>One quiet obsession:</span><br />
            measurement you can trust.
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 80 }}>
          <p style={{ fontSize: 16.5, color: '#3a3d44', lineHeight: 1.65, margin: 0 }}>
            Manokip began in 2018 in Bektemir, Tashkent — three engineers, a calibration bench, and a conviction that Central Asia deserved its own precision instrument industry.
          </p>
          <p style={{ fontSize: 16.5, color: '#3a3d44', lineHeight: 1.65, margin: 0 }}>
            Today we manufacture over 230 instruments across twelve product families and ship to fourteen countries. Every gauge that leaves our facility is verified against an O‘zStandart-traceable reference.
          </p>
        </div>
      </section>
      <section style={{ padding: '40px 40px 96px' }}>
        <div className="mk-ph" style={{ height: 380, fontSize: 12 }}>manufacturing facility · Bektemir district · Tashkent</div>
      </section>
      <section style={{ padding: '0 40px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {[
            ['7+', 'years in production', 'Founded 2018'],
            ['230+', 'instruments cataloged', '12 families'],
            ['1 200+', 'enterprise clients', 'Across 14 countries'],
            ['14 000+', 'units verified / year', 'O‘zStandart accredited'],
          ].map(([n, l, s]) => (
            <div key={l} style={{ background: '#fff', padding: '36px 28px' }}>
              <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 14, marginTop: 14 }}>{l}</div>
              <div style={{ fontSize: 12, color: '#74777e', marginTop: 4 }}>{s}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: '0 40px 96px' }}>
        <div className="mk-eyebrow">Timeline</div>
        <div style={{ marginTop: 32, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: 1, background: 'var(--line)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
            {[
              ['2018', 'Founded in Tashkent', 'Bektemir district facility'],
              ['2020', 'GOST R certification', 'First export contracts'],
              ['2022', 'MANOBAR transducer line', 'Digital instruments'],
              ['2024', 'ISO 9001 facility upgrade', '230+ products'],
              ['2026', 'Manokip series IV', 'Across 14 countries'],
            ].map(([y, t, s]) => (
              <div key={y}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1240e5', marginBottom: 22, position: 'relative', zIndex: 1 }} />
                <div className="mk-mono" style={{ fontSize: 12, color: '#1240e5', letterSpacing: '0.06em' }}>{y}</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{t}</div>
                <div style={{ fontSize: 12.5, color: '#74777e', marginTop: 4 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}

function ContactPage() {
  return (
    <div className="mk" style={{ width: 1440, background: 'var(--bg)' }}>
      <StoreHeader active="Contact" />
      <section style={{ padding: '80px 40px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">Contact</div>
          <h1 style={{ fontSize: 72, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>
            Let's specify your instruments together.
          </h1>
          <p style={{ fontSize: 17, color: '#3a3d44', marginTop: 24, maxWidth: 480, lineHeight: 1.55 }}>
            Send a parts list, a process diagram, or just a description of the conditions. We'll respond within one business hour with a quote and lead time.
          </p>
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {[
              ['Sales', 'manokip@manometr.uz', '+998 93 693-92-20'],
              ['Service', 'service@manometr.uz', '+998 90 544-61-07'],
              ['Headquarters', 'Bektemir district', 'Rohat 13A, Tashkent'],
              ['Hours', 'Mon–Fri · 09:00–18:00', 'UTC+5 (Tashkent)'],
            ].map(([t, a, b]) => (
              <div key={t}>
                <div className="mk-eyebrow" style={{ marginBottom: 10 }}>{t}</div>
                <div style={{ fontSize: 14.5 }}>{a}</div>
                <div className="mk-mono" style={{ fontSize: 13, color: '#74777e', marginTop: 4 }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 32 }}>
          <div className="mk-eyebrow">Request a quote</div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              ['Company name', 'Acme Engineering LLC'],
              ['Contact person', 'Aziz Karimov'],
              ['Email', 'a.karimov@acme.uz'],
              ['Phone', '+998 __ ___-__-__'],
            ].map(([l, p]) => (
              <div key={l}>
                <div style={{ fontSize: 11.5, color: '#74777e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{l}</div>
                <input placeholder={p} style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--line-2)', padding: '8px 0', fontSize: 14.5, fontFamily: 'inherit', outline: 'none', background: 'transparent' }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11.5, color: '#74777e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Industry</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Oil & gas', 'Mining', 'Chemical', 'Power', 'HVAC', 'Other'].map((s, i) =>
                  <span key={s} className="mk-tag" style={i === 0 ? { background: '#14161b', color: '#fff', borderColor: '#14161b' } : {}}>{s}</span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: '#74777e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Specifications / parts list</div>
              <textarea placeholder="DM8008-VU · 0–400 kgf/cm² · M20×1.5 · qty 24…" style={{ width: '100%', minHeight: 100, border: '1px solid var(--line-2)', padding: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'transparent', resize: 'vertical' }} />
            </div>
            <button className="mk-btn mk-btn-primary" style={{ alignSelf: 'flex-start' }}>Send request →</button>
            <div style={{ fontSize: 11.5, color: '#a7a9af' }}>We respond within 1 business hour.</div>
          </div>
        </div>
      </section>
      <section style={{ padding: '0 40px 80px' }}>
        <div className="mk-ph" style={{ height: 360, fontSize: 12 }}>map · Bektemir district, Rohat 13A, Tashkent</div>
      </section>
      <StoreFooter />
    </div>
  );
}

window.SolutionsPage = SolutionsPage;
window.AboutPage = AboutPage;
window.ContactPage = ContactPage;
