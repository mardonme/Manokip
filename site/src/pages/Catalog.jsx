import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Reveal, Icon, ProductGridSkeleton } from '../components/ui/index.js';
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

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  }
  const setCategory = (slug) => setParam('category', slug);
  function setPage(p) {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  }
  const resetFilters = () => setParams(new URLSearchParams());

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">
        <div className="mk-container" style={{ paddingTop: 36, paddingBottom: 20 }}>
          <nav className="mk-mono" aria-label="Breadcrumb" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 22 }}>
            <Link to="/" className="mk-ulink">{t('catalog.crumbHome')}</Link> / <Link to="/catalog" className="mk-ulink">{t('catalog.crumb')}</Link>{activeCat ? <> / {activeCat.name}</> : null}
          </nav>
          <div className="mk-between mk-wrap" style={{ alignItems: 'flex-end', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>{heading}</h1>
              <p className="mk-muted" style={{ fontSize: 16, marginTop: 10, maxWidth: 580 }}>{t('catalog.lead')}</p>
            </div>
            <div className="mk-mono mk-muted" style={{ fontSize: 12, textAlign: 'right' }}>
              <div className="mk-num">{total} {t('catalog.products')}</div>
              <div style={{ marginTop: 4 }} className="mk-num">{categories.length} {t('catalog.categories')}</div>
            </div>
          </div>
        </div>

        {/* Filter toolbar */}
        <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div className="mk-container mk-row mk-wrap" style={{ padding: '14px 40px', gap: 16 }}>
            <label className="mk-field">
              <span className="mk-label">{t('catalog.filter.diameter')}</span>
              <select className="mk-select" value={activeDia} onChange={(e) => setParam('dia', e.target.value)}>
                <option value="">{t('catalog.filter.diameterAll')}</option>
                {DIAMETERS.map((d) => <option key={d} value={d}>Ø {d} mm</option>)}
              </select>
            </label>
            <label className="mk-field">
              <span className="mk-label">{t('catalog.filter.accuracy')}</span>
              <select className="mk-select" value={activeAcc} onChange={(e) => setParam('accuracy', e.target.value)}>
                <option value="">{t('catalog.filter.accuracyAll')}</option>
                {ACCURACIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <div style={{ flex: 1 }} />
            <label className="mk-field">
              <span className="mk-label">{t('catalog.sort')}</span>
              <select className="mk-select" value={activeSort} onChange={(e) => setParam('sort', e.target.value === 'popular' ? '' : e.target.value)}>
                <option value="popular">{t('catalog.sort.popular')}</option>
                <option value="price_asc">{t('catalog.sort.priceAsc')}</option>
                <option value="price_desc">{t('catalog.sort.priceDesc')}</option>
                <option value="newest">{t('catalog.sort.newest')}</option>
              </select>
            </label>
            {hasFilters && (
              <button onClick={resetFilters} className="mk-btn mk-btn-sm mk-btn-light" style={{ alignSelf: 'flex-end' }}>{t('catalog.reset')}</button>
            )}
          </div>
        </div>

        <div className="mk-container">
          <div className="mk-catalog">
            <aside className="mk-catalog-aside" aria-label={t('catalog.cats')}>
              <div className="mk-eyebrow" style={{ marginBottom: 14 }}>{t('catalog.cats')}</div>
              <div className="mk-stack" style={{ gap: 2 }}>
                <button onClick={() => setCategory('')} className={`mk-filterlink ${!activeCategory ? 'is-active' : ''}`} aria-pressed={!activeCategory}>
                  <span>{t('catalog.catAll')}</span>
                  <span className="mk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{categories.reduce((n, c) => n + c.count, 0)}</span>
                </button>
                {categories.map((c) => (
                  <button key={c.slug} onClick={() => setCategory(c.slug)} className={`mk-filterlink ${activeCategory === c.slug ? 'is-active' : ''}`} aria-pressed={activeCategory === c.slug}>
                    <span>{c.name}</span>
                    <span className="mk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{c.count}</span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="mk-catalog-main">
              {(activeCat || activeDia || activeAcc) && (
                <div className="mk-row mk-wrap" style={{ gap: 8, marginBottom: 22 }}>
                  {activeCat && <button className="mk-tag mk-tag-solid" onClick={() => setCategory('')} style={{ cursor: 'pointer' }}>{activeCat.name} <Icon name="close" size={11} /></button>}
                  {activeDia && <button className="mk-tag mk-tag-solid" onClick={() => setParam('dia', '')} style={{ cursor: 'pointer' }}>Ø {activeDia} mm <Icon name="close" size={11} /></button>}
                  {activeAcc && <button className="mk-tag mk-tag-solid" onClick={() => setParam('accuracy', '')} style={{ cursor: 'pointer' }}>{t('catalog.filter.accuracy')} {activeAcc} <Icon name="close" size={11} /></button>}
                  <button onClick={resetFilters} style={{ background: 'transparent', border: 'none', fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer' }}>{t('catalog.clearAll')}</button>
                </div>
              )}

              {loading ? (
                <div className="mk-grid mk-cards-3"><ProductGridSkeleton count={PAGE_SIZE} /></div>
              ) : products.length === 0 ? (
                <div className="mk-card mk-center" style={{ padding: '64px 32px' }}>
                  <Icon name="search" size={28} style={{ color: 'var(--ink-4)', margin: '0 auto 14px' }} />
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{t('catalog.empty')}</div>
                  {hasFilters && <button onClick={resetFilters} className="mk-btn mk-btn-light mk-btn-sm" style={{ marginTop: 16 }}>{t('catalog.reset')}</button>}
                </div>
              ) : (
                <div className="mk-grid mk-cards-3">
                  {products.map((p, i) => <ProductCard key={p.id} p={p} index={i % 3} />)}
                </div>
              )}

              {total > 0 && (
                <div className="mk-between mk-wrap" style={{ marginTop: 36, gap: 12 }}>
                  <div className="mk-mono mk-muted mk-num" style={{ fontSize: 11.5 }}>
                    {t('catalog.showing')} {(page - 1) * PAGE_SIZE + 1}—{Math.min(page * PAGE_SIZE, total)} {t('catalog.of')} {total}
                  </div>
                  <div className="mk-row" style={{ gap: 6 }}>
                    <button className="mk-pagebtn" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><Icon name="chevron-right" size={15} style={{ transform: 'rotate(180deg)' }} /></button>
                    {Array.from({ length: totalPages }).slice(0, 8).map((_, i) => {
                      const n = i + 1;
                      return <button key={n} onClick={() => setPage(n)} className={`mk-pagebtn ${n === page ? 'is-active' : ''}`} aria-current={n === page ? 'page' : undefined}>{n}</button>;
                    })}
                    <button className="mk-pagebtn" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page"><Icon name="chevron-right" size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
