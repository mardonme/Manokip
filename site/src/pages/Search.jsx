import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Reveal, Icon, ProductGridSkeleton } from '../components/ui/index.js';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';

export default function Search() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [draft, setDraft] = useState(q);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setDraft(q); }, [q]);

  useEffect(() => {
    const query = q.trim();
    if (!query) { setProducts([]); setTotal(0); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await api.get('/api/products', { q: query, limit: 60 });
        if (cancelled) return;
        setProducts(data.items || []);
        setTotal(data.total || 0);
      } catch (e) {
        console.error('Search failed:', e);
        if (!cancelled) { setProducts([]); setTotal(0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  function submit(e) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (draft.trim()) next.set('q', draft.trim()); else next.delete('q');
    setParams(next);
  }

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">
        <div className="mk-container" style={{ paddingTop: 60, paddingBottom: 24 }}>
          <Reveal>
            <div className="mk-eyebrow">{t('search.eyebrow')}</div>
            <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 24px' }}>
              {t('search.title')}
            </h1>

            <form onSubmit={submit} className="mk-field" style={{ maxWidth: 620 }}>
              <label className="mk-label" htmlFor="search-q">{t('search.eyebrow')}</label>
              <div className="mk-row" style={{ gap: 10 }}>
                <input
                  id="search-q"
                  className="mk-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('search.placeholder')}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button type="submit" className="mk-btn mk-btn-primary" aria-label={t('search.submit')}>
                  <Icon name="search" size={15} /> {t('search.submit')}
                </button>
              </div>
            </form>

            <div aria-live="polite">
              {q && !loading && (
                <div className="mk-mono mk-muted mk-num" style={{ fontSize: 12.5, marginTop: 16 }}>
                  {total} {t('search.results')} {t('search.for')} “{q}”
                </div>
              )}
            </div>
          </Reveal>
        </div>

        <div className="mk-container" style={{ paddingBottom: 80 }}>
          {loading ? (
            <div className="mk-grid mk-cards-4"><ProductGridSkeleton count={8} /></div>
          ) : !q.trim() ? (
            <Reveal className="mk-card mk-center" style={{ padding: '64px 32px' }}>
              <Icon name="search" size={28} style={{ color: 'var(--ink-4)', margin: '0 auto 14px' }} />
              <div style={{ fontSize: 17, fontWeight: 600 }}>{t('search.emptyQuery')}</div>
              <Link to="/catalog">
                <button className="mk-btn mk-btn-light mk-btn-sm" style={{ marginTop: 16 }}>
                  {t('cart.browse').replace(/\s*→\s*$/, '')} <Icon name="arrow-right" size={15} className="mk-arrow" />
                </button>
              </Link>
            </Reveal>
          ) : products.length === 0 ? (
            <Reveal className="mk-card mk-center" style={{ padding: '64px 32px' }}>
              <Icon name="search" size={28} style={{ color: 'var(--ink-4)', margin: '0 auto 14px' }} />
              <div style={{ fontSize: 17, fontWeight: 600 }}>{t('search.empty')}</div>
              <Link to="/catalog">
                <button className="mk-btn mk-btn-light mk-btn-sm" style={{ marginTop: 16 }}>
                  {t('cart.browse').replace(/\s*→\s*$/, '')} <Icon name="arrow-right" size={15} className="mk-arrow" />
                </button>
              </Link>
            </Reveal>
          ) : (
            <div className="mk-grid mk-cards-4">
              {products.map((p, i) => <ProductCard key={p.id} p={p} index={i % 4} />)}
            </div>
          )}
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
