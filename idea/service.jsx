// service.jsx — Service & calibration page (matches reference structure)
function ServicePage() {
  const services = [
    {
      n: '01',
      t: 'Calibration & verification',
      sub: 'O‘zStandart-accredited laboratory',
      d: [
        'State verification of pressure gauges, thermomanometers and thermometers',
        'Periodic verification on a 12 / 24-month cycle',
        'Adjustment and calibration of mano- and vacuumeters',
      ],
      meta: ['48h turnaround', '±0.05% uncertainty', '14 000+ units / year'],
    },
    {
      n: '02',
      t: 'Repair of measuring instruments',
      sub: 'Manokip-built or third-party',
      d: [
        'Repair of bimetallic thermometers (TBf series)',
        'Repair of thermomanometers (FT, MTT)',
        'Repair of vacuum gauges, mano-vacuum gauges and pressure gauges',
      ],
      meta: ['5-day average', 'OEM parts', '12-month warranty'],
    },
    {
      n: '03',
      t: 'Documentation & certification',
      sub: 'Full traceable paperwork',
      d: [
        'Calibration certificates traceable to national standards',
        'Passport and operating manual reissue',
        'Customs and export declaration support',
      ],
      meta: ['Same-day issue', 'Bilingual RU/EN', 'Digital + stamped'],
    },
  ];
  return (
    <div className="mk" style={{ width: 1440, background: 'var(--bg)' }}>
      <StoreHeader active="Service" />
      <div style={{ padding: '20px 40px', borderBottom: '1px solid var(--line)' }} className="mk-mono">
        <span style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Home / Service & calibration</span>
      </div>
      <section style={{ padding: '72px 40px 56px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">Services</div>
          <h1 style={{ fontSize: 76, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>
            We service<br />what we ship.
          </h1>
        </div>
        <div style={{ paddingTop: 80 }}>
          <p style={{ fontSize: 17, color: '#3a3d44', lineHeight: 1.6, margin: 0 }}>
            Three accredited services from the same facility that builds the instruments — calibration, repair, and documentation. Drop-off in Tashkent, mail-in from anywhere across Central Asia.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="mk-btn mk-btn-primary mk-btn-sm">Schedule pickup →</button>
            <button className="mk-btn mk-btn-light mk-btn-sm">Download price list</button>
          </div>
        </div>
      </section>
      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {services.map(s => (
            <div key={s.n} style={{ background: '#fff', display: 'grid', gridTemplateColumns: '80px 1fr 1.4fr 1fr', gap: 32, padding: '40px 36px', alignItems: 'flex-start' }}>
              <span className="mk-mono" style={{ fontSize: 12, color: '#a7a9af', letterSpacing: '0.06em' }}>{s.n}</span>
              <div>
                <h3 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{s.t}</h3>
                <div style={{ fontSize: 13, color: '#74777e', marginTop: 6 }}>{s.sub}</div>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.d.map(line => (
                  <li key={line} style={{ fontSize: 14, color: '#1240e5', display: 'flex', gap: 10, lineHeight: 1.5 }}>
                    <span style={{ color: '#a7a9af', flexShrink: 0 }}>—</span>{line}
                  </li>
                ))}
                <li style={{ marginTop: 8 }}>
                  <a style={{ fontSize: 13, color: '#14161b', textDecoration: 'underline', cursor: 'pointer' }}>More details →</a>
                </li>
              </ul>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.meta.map((m, i) => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, paddingBottom: 8, borderBottom: i === s.meta.length - 1 ? 'none' : '1px solid var(--line-soft)' }}>
                    <span style={{ color: '#74777e' }}>{['Turnaround', 'Quality', 'Capacity'][i]}</span>
                    <span className="mk-mono" style={{ color: '#14161b' }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ padding: '0 40px 96px' }}>
        <div style={{ background: '#14161b', color: '#f5f3ee', padding: '48px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div className="mk-eyebrow" style={{ color: '#a7a9af' }}>Field service</div>
            <h3 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', margin: '12px 0 12px' }}>Need it done on-site?</h3>
            <p style={{ fontSize: 15, color: '#a7a9af', lineHeight: 1.55, margin: 0 }}>
              Our mobile calibration team travels to wellsites, refineries and power stations across Uzbekistan and Kazakhstan with portable references traceable to national standards.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Pressure references to 600 bar', 'Temperature references −40 to +400 °C', 'On-site documentation issued'].map(l => (
              <div key={l} style={{ display: 'flex', gap: 12, fontSize: 14, paddingBottom: 14, borderBottom: '1px solid #2a2c32' }}>
                <span style={{ color: '#1240e5' }}>✓</span>{l}
              </div>
            ))}
            <button className="mk-btn mk-btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>Book field service →</button>
          </div>
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}
window.ServicePage = ServicePage;
