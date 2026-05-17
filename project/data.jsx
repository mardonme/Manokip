// storefront.jsx — all storefront screens (home, catalog, product, solutions, about, contact)
// Each screen is exported on window so the canvas can pick them up.

const PRODUCTS = [
  { id: 1, model: 'DA8008-VU', desc: 'Vibration-resistant gauge', range: '−1…+24 kgf/cm²', dia: 100, price: 'from 474 000', cat: 'Vibration-resistant', acc: '1.5' },
  { id: 2, model: 'DM8008-VU', desc: 'Vibration-resistant gauge', range: '0–400 kgf/cm²', dia: 100, price: 'from 474 000', cat: 'Vibration-resistant', acc: '1.5' },
  { id: 3, model: 'DM8008-VU', desc: 'Vibration-resistant gauge', range: '0–2.5 kgf/cm²', dia: 100, price: 'from 420 000', cat: 'Vibration-resistant', acc: '1.5' },
  { id: 4, model: 'MVP2-U', desc: 'Vacuum / pressure gauge', range: '−1…+24 kgf/cm²', dia: 63, price: 'on request', cat: 'Compact', acc: '2.5' },
  { id: 5, model: 'MP2-Um', desc: 'Technical gauge', range: '0–2.5 kgf/cm²', dia: 63, price: 'from 62 800', cat: 'Compact', acc: '2.5' },
  { id: 6, model: 'MP2-Um', desc: 'Technical gauge', range: '−1…+3 kgf/cm²', dia: 63, price: 'from 63 000', cat: 'Compact', acc: '2.5' },
  { id: 7, model: 'MP2-Um', desc: 'Technical gauge', range: '0–60 kgf/cm²', dia: 63, price: 'on request', cat: 'Compact', acc: '2.5' },
  { id: 8, model: 'DM8008-VU', desc: 'Vibration-resistant gauge', range: '0–4 kgf/cm²', dia: 100, price: 'from 420 000', cat: 'Vibration-resistant', acc: '1.5' },
  { id: 9, model: 'VP3A-VU', desc: 'Ammonia vacuum gauge', range: '−1…0 kgf/cm²', dia: 100, price: 'from 215 000', cat: 'Ammonia', acc: '1.5' },
  { id: 10, model: 'MANOBAR PG', desc: 'Pressure transducer', range: '0–25 MPa', dia: null, price: 'request', cat: 'Transducers', acc: '0.5' },
  { id: 11, model: 'MANOBAR PD', desc: 'Differential transducer', range: '0–10 MPa', dia: null, price: 'request', cat: 'Transducers', acc: '0.5' },
  { id: 12, model: 'CYCLOP DEM-61', desc: 'Universal protection unit', range: '—', dia: null, price: 'on request', cat: 'Relays', acc: '—' },
  { id: 13, model: 'Umold-MLG', desc: 'Microimpulse level meter', range: '0–20 m', dia: null, price: 'request', cat: 'Level', acc: '0.5%' },
  { id: 14, model: 'Umold-RLG', desc: 'Radar level sensor', range: '0–35 m', dia: null, price: 'request', cat: 'Level', acc: '0.3%' },
];

const CATEGORIES = [
  { name: 'Pressure gauges', count: 84, ru: 'Манометры' },
  { name: 'Electrocontact gauges', count: 22, ru: 'Электроконтактные' },
  { name: 'Reference gauges', count: 14, ru: 'Образцовые' },
  { name: 'Corrosion-resistant', count: 19, ru: 'Коррозионностойкие' },
  { name: 'Ammonia gauges', count: 11, ru: 'Аммиачные' },
  { name: 'Explosion-proof', count: 8, ru: 'Взрывозащищённые' },
  { name: 'Railway gauges', count: 6, ru: 'Железнодорожные' },
  { name: 'Vibration-resistant', count: 24, ru: 'Виброустойчивые' },
  { name: 'Digital gauges', count: 9, ru: 'Цифровые' },
  { name: 'Pressure transducers', count: 17, ru: 'Преобразователи' },
  { name: 'Level meters', count: 12, ru: 'Уровнемеры' },
  { name: 'Protection relays', count: 5, ru: 'Реле защиты' },
];

// ──────────────────────────────────────────────
// Generic product placeholder card art
function ProductArt({ model, kind = 'gauge', size = 200 }) {
  // a refined placeholder: faint rings + model number + ph-corner crops
  return (
    <div className="mk-ph mk-ph-corners" style={{ width: '100%', height: size, position: 'relative', background: '#fafaf7' }}>
      {kind === 'gauge' ? (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#d6d2c8" strokeWidth="1" />
          <circle cx="50" cy="50" r="36" fill="#fff" stroke="#d6d2c8" strokeWidth="0.6" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
            return <line key={i}
              x1={50 + Math.cos(a) * 32} y1={50 + Math.sin(a) * 32}
              x2={50 + Math.cos(a) * 36} y2={50 + Math.sin(a) * 36}
              stroke="#a7a9af" strokeWidth={i % 6 === 0 ? 1.2 : 0.5} />;
          })}
          <line x1="50" y1="50" x2="68" y2="34" stroke="#1240e5" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="50" cy="50" r="2.5" fill="#14161b" />
          <rect x="46" y="86" width="8" height="10" fill="#a7a9af" />
        </svg>
      ) : kind === 'transducer' ? (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100">
          <rect x="34" y="20" width="32" height="38" rx="2" fill="#fff" stroke="#d6d2c8" />
          <rect x="40" y="26" width="20" height="14" fill="#14161b" />
          <text x="50" y="36" fill="#1240e5" fontSize="6" fontFamily="JetBrains Mono" textAnchor="middle">12.4</text>
          <rect x="44" y="58" width="12" height="22" fill="#d6d2c8" />
          <line x1="50" y1="80" x2="50" y2="92" stroke="#a7a9af" strokeWidth="2" />
        </svg>
      ) : (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100">
          <rect x="20" y="30" width="60" height="40" rx="3" fill="#fff" stroke="#d6d2c8" />
          <circle cx="35" cy="50" r="5" fill="#1240e5" />
          <rect x="50" y="44" width="22" height="3" fill="#d6d2c8" />
          <rect x="50" y="50" width="16" height="3" fill="#d6d2c8" />
          <rect x="50" y="56" width="20" height="3" fill="#d6d2c8" />
        </svg>
      )}
      <div style={{ position: 'absolute', top: 12, right: 14, fontFamily: 'JetBrains Mono', fontSize: 9, color: '#74777e', letterSpacing: '0.1em' }}>{model}</div>
      <div style={{ position: 'absolute', bottom: 10, left: 14, fontFamily: 'JetBrains Mono', fontSize: 9, color: '#a7a9af', letterSpacing: '0.05em' }}>product render</div>
    </div>
  );
}

function ProductCard({ p, compact = false }) {
  const kind = p.cat === 'Transducers' ? 'transducer' : (p.cat === 'Relays' || p.cat === 'Level') ? 'box' : 'gauge';
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 18, borderBottom: '1px solid var(--line-soft)' }}>
        <ProductArt model={p.model} kind={kind} size={compact ? 150 : 180} />
      </div>
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div className="mk-mono" style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.cat}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{p.model}</div>
            <div style={{ fontSize: 13, color: '#74777e', marginTop: 1 }}>{p.desc}</div>
          </div>
          {p.dia && <span className="mk-tag">Ø {p.dia}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          <div>
            <div style={{ fontSize: 10.5, color: '#a7a9af', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Range</div>
            <div className="mk-mono" style={{ fontSize: 12.5, color: '#14161b', marginTop: 2 }}>{p.range}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10.5, color: '#a7a9af', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Price</div>
            <div className="mk-mono" style={{ fontSize: 12.5, color: '#14161b', marginTop: 2 }}>{p.price}<span style={{ color: '#a7a9af' }}> sum</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.PRODUCTS = PRODUCTS;
window.CATEGORIES = CATEGORIES;
window.ProductCard = ProductCard;
window.ProductArt = ProductArt;
