import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';

const PAGE_SIZE = 9;

export default function Catalog() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get('category') || '';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/api/categories');
        if (!cancelled) setCategories(data.items || []);
      } catch (e) { console.error('Categories load failed:', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await api.get('/api/products', {
          category: activeCategory || undefined,
          page,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setProducts(data.items || []);
        setTotal(data.total || 0);
      } catch (e) {
        console.error('Products load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeCategory, page]);

  const activeCat = categories.find((c) => c.slug === activeCategory);
  const heading = activeCat ? activeCat.name : t('catalog.all');
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function setCategory(slug) {
    const next = new URLSearchParams(params);
    if (slug) next.set('category', slug); else next.delete('category');
    next.delete('page');
    setParams(next);
  }

  function setPage(p) {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  }

  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />

      <div style={{ padding: '40px 40px 24px' }}>
        <div className="mk-mono" style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>
          <Link to="/">{t('catalog.crumbHome')}</Link> / <Link to="/catalog">{t('catalog.crumb')}</Link>{activeCat ? <> / {activeCat.name}</> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>{heading}</h1>
            <p style={{ fontSize: 16, color: '#3a3d44', marginTop: 12, maxWidth: 580 }}>
              {t('catalog.lead')}
            </p>
          </div>
          <div className="mk-mono" style={{ fontSize: 12, color: '#74777e', textAlign: 'right' }}>
            <div>{total} {t('catalog.products')}</div>
            <div style={{ marginTop: 4 }}>{categories.length} {t('catalog.categories')}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {[
          [t('catalog.filter.diameter'),    '50, 63, 100, 160, 250'],
          [t('catalog.filter.accuracy'),    '0.4, 0.6, 1.0, 1.5, 2.5'],
          [t('catalog.filter.connection'),  t('catalog.filter.connection.values')],
          [t('catalog.filter.protection'),  'IP40 — IP67'],
          [t('catalog.filter.material'),    t('catalog.filter.material.values')],
        ].map(([t1, v]) => (
          <button key={t1} className="mk-tag" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '6px 12px', textTransform: 'none', letterSpacing: 0, gap: 0 }}>
            <span style={{ fontSize: 9.5, color: '#a7a9af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t1}</span>
            <span style={{ fontSize: 11.5, color: '#14161b', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{v} ▾</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="mk-btn mk-btn-sm mk-btn-light">{t('catalog.filter.all')}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0 }}>
        <aside style={{ padding: '40px 24px 40px 40px', borderRight: '1px solid var(--line)' }}>
          <div className="mk-eyebrow" style={{ marginBottom: 16 }}>{t('catalog.cats')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <a onClick={() => setCategory('')} style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
              background: !activeCategory ? '#14161b' : 'transparent', color: !activeCategory ? '#fff' : '#3a3d44',
              fontSize: 13.5, cursor: 'pointer', borderRadius: 4,
            }}>
              <span>{t('catalog.catAll')}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#a7a9af' }}>{categories.reduce((n, c) => n + c.count, 0)}</span>
            </a>
            {categories.map((c) => (
              <a key={c.slug} onClick={() => setCategory(c.slug)} style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
                background: activeCategory === c.slug ? '#14161b' : 'transparent',
                color: activeCategory === c.slug ? '#fff' : '#3a3d44',
                fontSize: 13.5, cursor: 'pointer', borderRadius: 4,
              }}>
                <span>{c.name}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#a7a9af' }}>{c.count}</span>
              </a>
            ))}
          </div>

          <div className="mk-eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>{t('catalog.range')}</div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 16, borderRadius: 4 }}>
            <div className="mk-mono" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span>−1 kgf/cm²</span><span>400 kgf/cm²</span>
            </div>
            <div style={{ position: 'relative', height: 4, background: 'var(--line)', borderRadius: 2 }}>
              <div style={{ position: 'absolute', left: '20%', right: '30%', top: 0, bottom: 0, background: '#1240e5' }} />
              <div style={{ position: 'absolute', left: '20%', top: -4, width: 12, height: 12, background: '#fff', border: '2px solid #1240e5', borderRadius: '50%', transform: 'translateX(-50%)' }} />
              <div style={{ position: 'absolute', left: '70%', top: -4, width: 12, height: 12, background: '#fff', border: '2px solid #1240e5', borderRadius: '50%', transform: 'translateX(-50%)' }} />
            </div>
          </div>

          <div className="mk-eyebrow" style={{ marginTop: 36, marginBottom: 14 }}>{t('catalog.certs')}</div>
          {['GOST R', 'EAC', 'ATEX', "O'zStandart", 'CE'].map((c) => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13 }}>
              <span style={{
                width: 14, height: 14, border: '1.5px solid var(--line-2)', borderRadius: 3,
                background: c === 'GOST R' || c === 'EAC' ? '#1240e5' : '#fff',
                borderColor: c === 'GOST R' || c === 'EAC' ? '#1240e5' : 'var(--line-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10,
              }}>
                {(c === 'GOST R' || c === 'EAC') && '✓'}
              </span>
              {c}
            </label>
          ))}
        </aside>

        <div style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {activeCat && (
                <span className="mk-tag mk-tag-solid" onClick={() => setCategory('')} style={{ cursor: 'pointer' }}>
                  {activeCat.name} ✕
                </span>
              )}
              {activeCat && (
                <button onClick={() => setCategory('')} style={{ background: 'transparent', border: 'none', fontSize: 12, color: '#74777e', cursor: 'pointer' }}>
                  {t('catalog.clearAll')}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: '#74777e' }}>{t('catalog.sort')}</span>
              <span style={{ fontWeight: 500 }}>{t('catalog.popular')}</span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#74777e' }}>{t('catalog.loading')}</div>
          ) : products.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#74777e' }}>{t('catalog.empty')}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}

          {total > 0 && (
            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="mk-mono" style={{ fontSize: 11.5, color: '#74777e' }}>
                {t('catalog.showing')} {(page - 1) * PAGE_SIZE + 1}—{Math.min(page * PAGE_SIZE, total)} {t('catalog.of')} {total}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: totalPages }).slice(0, 10).map((_, i) => {
                  const n = i + 1;
                  const active = n === page;
                  return (
                    <button key={n} onClick={() => setPage(n)} style={{
                      width: 32, height: 32, border: active ? '1px solid #14161b' : '1px solid var(--line)',
                      background: active ? '#14161b' : '#fff', color: active ? '#fff' : '#14161b',
                      fontSize: 13, cursor: 'pointer', borderRadius: 4,
                    }}>{n}</button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <StoreFooter />
    </div>
  );
}
