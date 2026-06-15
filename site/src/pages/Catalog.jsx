import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';

const PAGE_SIZE = 9;
const DIAMETERS = [50, 63, 100, 160, 250];
const ACCURACIES = ['0.4', '0.6', '1.0', '1.5', '2.5'];

export default function Catalog() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get('category') || '';
  const activeDia = params.get('dia') || '';
  const activeAcc = params.get('accuracy') || '';
  const activeSort = params.get('sort') || 'popular';
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
          accuracy: activeAcc || undefined,
          minDia: activeDia || undefined,
          maxDia: activeDia || undefined,
          sort: activeSort !== 'popular' ? activeSort : undefined,
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
  }, [activeCategory, activeDia, activeAcc, activeSort, page]);

  const activeCat = categories.find((c) => c.slug === activeCategory);
  const heading = activeCat ? activeCat.name : t('catalog.all');
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(activeCategory || activeDia || activeAcc || activeSort !== 'popular');

  // Mutate a single param and always reset pagination.
  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  }
  function setCategory(slug) { setParam('category', slug); }
  function setPage(p) {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  }
  function resetFilters() {
    setParams(new URLSearchParams());
  }

  const selectStyle = {
    appearance: 'none', WebkitAppearance: 'none', background: '#fff',
    border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 30px 8px 12px',
    fontSize: 13, color: '#14161b', cursor: 'pointer', fontFamily: 'inherit',
    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M1 3l4 4 4-4\' fill=\'none\' stroke=\'%2374777e\' stroke-width=\'1.5\'/></svg>")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  };

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

      {/* Wired filter bar: diameter + accuracy filter, sort, reset. */}
      <div style={{ padding: '16px 40px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9.5, color: '#a7a9af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('catalog.filter.diameter')}</span>
          <select style={selectStyle} value={activeDia} onChange={(e) => setParam('dia', e.target.value)}>
            <option value="">{t('catalog.filter.diameterAll')}</option>
            {DIAMETERS.map((d) => <option key={d} value={d}>Ø {d} mm</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9.5, color: '#a7a9af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('catalog.filter.accuracy')}</span>
          <select style={selectStyle} value={activeAcc} onChange={(e) => setParam('accuracy', e.target.value)}>
            <option value="">{t('catalog.filter.accuracyAll')}</option>
            {ACCURACIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 9.5, color: '#a7a9af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('catalog.sort')}</span>
          <select style={selectStyle} value={activeSort} onChange={(e) => setParam('sort', e.target.value === 'popular' ? '' : e.target.value)}>
            <option value="popular">{t('catalog.sort.popular')}</option>
            <option value="price_asc">{t('catalog.sort.priceAsc')}</option>
            <option value="price_desc">{t('catalog.sort.priceDesc')}</option>
            <option value="newest">{t('catalog.sort.newest')}</option>
          </select>
        </label>
        {hasFilters && (
          <button onClick={resetFilters} className="mk-btn mk-btn-sm mk-btn-light" style={{ alignSelf: 'flex-end' }}>
            {t('catalog.reset')}
          </button>
        )}
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
        </aside>

        <div style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, minHeight: 28 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {activeCat && (
                <span className="mk-tag mk-tag-solid" onClick={() => setCategory('')} style={{ cursor: 'pointer' }}>
                  {activeCat.name} ✕
                </span>
              )}
              {activeDia && (
                <span className="mk-tag mk-tag-solid" onClick={() => setParam('dia', '')} style={{ cursor: 'pointer' }}>
                  Ø {activeDia} mm ✕
                </span>
              )}
              {activeAcc && (
                <span className="mk-tag mk-tag-solid" onClick={() => setParam('accuracy', '')} style={{ cursor: 'pointer' }}>
                  {t('catalog.filter.accuracy')} {activeAcc} ✕
                </span>
              )}
              {hasFilters && (
                <button onClick={resetFilters} style={{ background: 'transparent', border: 'none', fontSize: 12, color: '#74777e', cursor: 'pointer' }}>
                  {t('catalog.clearAll')}
                </button>
              )}
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
