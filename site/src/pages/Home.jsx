import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Gauge from '../components/Gauge.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';

export default function Home() {
  const { t, lang } = useLang();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, prods] = await Promise.all([
          api.get('/api/categories'),
          api.get('/api/products', { limit: 4 }),
        ]);
        if (cancelled) return;
        setCategories(cats.items || []);
        setFeatured(prods.items || []);
        setTotalProducts(prods.total || 0);
      } catch (e) {
        console.error('Home load failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />

      {/* HERO */}
      <section style={{ padding: '80px 40px 100px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
              <span className="mk-tag mk-tag-accent">{t('home.badge')}</span>
              <span className="mk-eyebrow">{t('home.eyebrow')}</span>
            </div>
            <h1 style={{ fontSize: 92, fontWeight: 600, lineHeight: 0.96, letterSpacing: '-0.035em', margin: 0 }}>
              {t('home.hero.title.a')}<br />
              <span style={{ color: '#74777e' }}>{t('home.hero.title.b')}</span>
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.5, color: '#3a3d44', marginTop: 28, maxWidth: 580 }}>
              {t('home.hero.lead')}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
              <Link to="/catalog"><button className="mk-btn mk-btn-primary">{t('home.cta.browse')}</button></Link>
              <Link to="/contact"><button className="mk-btn mk-btn-light">{t('home.cta.quote')}</button></Link>
            </div>
            <div style={{ display: 'flex', gap: 48, marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--line)' }}>
              {[
                ['7+',     t('home.stat.years')],
                ['1 200+', t('home.stat.clients')],
                ['ISO 9001', t('home.stat.iso')],
                ['±0.5%',  t('home.stat.class')],
              ].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{n}</div>
                  <div style={{ fontSize: 12.5, color: '#74777e', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 500 }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }} className="mk-dotgrid" />
            <div style={{ position: 'relative' }}>
              <Gauge size={420} value={6.4} max={10} unit="MPa" label="MANOKIP PG · 0.5%" danger={8.5} />
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
        <div style={{ marginTop: 60, paddingTop: 28, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: 11, color: '#74777e', letterSpacing: '0.06em' }}>
          <span>{t('home.trustedBy')}</span>
          <span>NGMK</span><span>JPETROL</span><span>UZBEKNEFTEGAZ</span><span>TTZ</span><span>ENT-EN</span>
          <span>{t('home.more')}</span>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div className="mk-eyebrow">{t('home.cat.eyebrow')}</div>
            <h2 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.025em', margin: '12px 0 0' }}>{t('home.cat.title')}</h2>
          </div>
          <Link to="/catalog" style={{ fontSize: 14, color: '#1240e5' }}>
            {t('home.cat.seeAll')} ({totalProducts || 90})
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {categories.map((c, i) => (
            <Link key={c.slug} to={`/catalog?category=${c.slug}`} style={{ background: '#fff', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 200, color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="mk-mono" style={{ fontSize: 11, color: '#a7a9af' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="mk-mono" style={{ fontSize: 11, color: '#74777e' }}>{c.count} {t('home.cat.items')}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>{c.name}</div>
                {lang !== 'ru' && (
                  <div style={{ fontSize: 12.5, color: '#74777e', marginTop: 4, fontFamily: 'JetBrains Mono' }}>{c.nameRu}</div>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#1240e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('home.cat.browse')} <span style={{ fontSize: 16 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div className="mk-eyebrow">{t('home.feat.eyebrow')}</div>
            <h2 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.025em', margin: '12px 0 0' }}>{t('home.feat.title')}</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* SOLUTIONS BAND */}
      <section style={{ background: '#14161b', color: '#f5f3ee', padding: '88px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64 }}>
          <div>
            <div className="mk-eyebrow" style={{ color: '#a7a9af' }}>{t('home.sol.eyebrow')}</div>
            <h2 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.025em', margin: '12px 0 24px' }}>{t('home.sol.title')}</h2>
            <p style={{ fontSize: 16, color: '#a7a9af', lineHeight: 1.6, maxWidth: 420 }}>
              {t('home.sol.lead')}
            </p>
            <Link to="/solutions"><button className="mk-btn mk-btn-light" style={{ marginTop: 28, background: 'transparent', color: '#f5f3ee', borderColor: '#3a3d44' }}>{t('home.sol.allBtn')}</button></Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: '#2a2c32' }}>
            {[
              ['Oil & Gas',   { ru: 'Нефть и газ',  uz: 'Neft va gaz',  en: 'Oil & Gas' }],
              ['Mining',      { ru: 'Горнодобыча',  uz: 'Togʻ-kon',     en: 'Mining' }],
              ['Chemical',    { ru: 'Химия',        uz: 'Kimyo',         en: 'Chemical' }],
              ['Power & HVAC', { ru: 'Энергетика и ОВК', uz: 'Energetika va isitish', en: 'Power & HVAC' }],
            ].map(([key, names]) => (
              <div key={key} style={{ background: '#14161b', padding: '32px 28px' }}>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>{names[lang] || names.en}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE / CTA */}
      <section style={{ padding: '88px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          <div style={{ background: '#fff', padding: '48px 40px' }}>
            <div className="mk-eyebrow">{t('home.svc.eyebrow')}</div>
            <h3 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', margin: '14px 0 16px' }}>{t('home.svc.title')}</h3>
            <p style={{ fontSize: 15, color: '#3a3d44', lineHeight: 1.55, maxWidth: 460 }}>{t('home.svc.lead')}</p>
            <div style={{ display: 'flex', gap: 28, marginTop: 32, paddingTop: 28, borderTop: '1px solid var(--line-soft)' }}>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>48h</div><div style={{ fontSize: 12, color: '#74777e' }}>{t('home.svc.turnaround')}</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>±0.05%</div><div style={{ fontSize: 12, color: '#74777e' }}>{t('home.svc.uncertainty')}</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 600 }}>14k+</div><div style={{ fontSize: 12, color: '#74777e' }}>{t('home.svc.perYear')}</div></div>
            </div>
            <Link to="/service"><button className="mk-btn mk-btn-light" style={{ marginTop: 28 }}>{t('home.svc.learn')}</button></Link>
          </div>
          <div style={{ background: '#fff', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="mk-eyebrow">{t('home.bulk.eyebrow')}</div>
              <h3 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', margin: '14px 0 16px' }}>{t('home.bulk.title')}</h3>
              <p style={{ fontSize: 15, color: '#3a3d44', lineHeight: 1.55, maxWidth: 460 }}>{t('home.bulk.lead')}</p>
              <div style={{ display: 'flex', gap: 28, marginTop: 32, paddingTop: 28, borderTop: '1px solid var(--line-soft)' }}>
                <div><div style={{ fontSize: 24, fontWeight: 600 }}>1h</div><div style={{ fontSize: 12, color: '#74777e' }}>{t('home.bulk.response')}</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 600 }}>−18%</div><div style={{ fontSize: 12, color: '#74777e' }}>{t('home.bulk.discount')}</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 600 }}>14</div><div style={{ fontSize: 12, color: '#74777e' }}>{t('home.bulk.countries')}</div></div>
              </div>
            </div>
            <Link to="/contact" style={{ alignSelf: 'flex-start', marginTop: 32 }}><button className="mk-btn mk-btn-primary">{t('home.bulk.cta')}</button></Link>
          </div>
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}
