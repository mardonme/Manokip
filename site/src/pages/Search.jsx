import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import ProductCard from '../components/ProductCard.jsx';
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
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />
      <section style={{ padding: '60px 40px 24px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div className="mk-eyebrow">{t('search.eyebrow')}</div>
        <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 24px' }}>
          {t('search.title')}
        </h1>

        <form onSubmit={submit} style={{ display: 'flex', gap: 10, maxWidth: 620 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('search.placeholder')}
            autoFocus
            style={{
              flex: 1, border: '1px solid var(--line-2)', borderRadius: 999,
              padding: '12px 20px', fontSize: 15, background: '#fff', outline: 'none',
            }}
          />
          <button type="submit" className="mk-btn mk-btn-primary">{t('search.submit')}</button>
        </form>

        {q && !loading && (
          <div className="mk-mono" style={{ fontSize: 12.5, color: '#74777e', marginTop: 16 }}>
            {total} {t('search.results')} {t('search.for')} “{q}”
          </div>
        )}
      </section>

      <section style={{ padding: '24px 40px 80px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#74777e' }}>{t('search.loading')}</div>
        ) : !q.trim() ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#74777e' }}>{t('search.emptyQuery')}</div>
        ) : products.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#74777e' }}>{t('search.empty')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <StoreFooter />
    </div>
  );
}
