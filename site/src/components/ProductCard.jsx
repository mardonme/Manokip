import React from 'react';
import { Link } from 'react-router-dom';

export function ProductArt({ model, kind = 'gauge', size = 200 }) {
  return (
    <div className="mk-ph mk-ph-corners" style={{ width: '100%', height: size, position: 'relative', background: '#fafaf7' }}>
      {kind === 'gauge' ? (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#d6d2c8" strokeWidth="1" />
          <circle cx="50" cy="50" r="36" fill="#fff" stroke="#d6d2c8" strokeWidth="0.6" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
            return (
              <line key={i}
                x1={50 + Math.cos(a) * 32} y1={50 + Math.sin(a) * 32}
                x2={50 + Math.cos(a) * 36} y2={50 + Math.sin(a) * 36}
                stroke="#a7a9af" strokeWidth={i % 6 === 0 ? 1.2 : 0.5} />
            );
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

export default function ProductCard({ p, compact = false }) {
  // Use the category slug (stable across languages) to pick the icon style.
  const slug = p.category?.slug || '';
  const kind = slug === 'solar-panels' ? 'box'
    : slug === 'level-gauges' || slug === 'protection-relays' || slug === 'pressure-switches' ? 'box'
    : 'gauge';
  return (
    <Link to={`/product/${p.id}`} style={{ background: '#fff', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', color: 'inherit', transition: 'transform .18s, box-shadow .18s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(20,22,27,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
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
    </Link>
  );
}
