import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Seo from '../components/Seo.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Reveal, Icon, ProductGridSkeleton } from '../components/ui/index.js';
import { api } from '../lib/api.js';
import { useSaved } from '../lib/SavedContext.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';

export default function Saved() {
  const { t } = useLang();
  const { ids, toggle } = useSaved();
  const { user, openSignIn } = useAuth();
  const [items, setItems] = useState(null); // null = loading

  // The context only holds ids (guest ids live in localStorage); the products
  // themselves come from the same listing endpoint the catalog uses.
  const idsKey = ids.join(',');
  useEffect(() => {
    let cancelled = false;
    if (!idsKey) { setItems([]); return; }
    (async () => {
      try {
        const data = await api.get('/api/products', { ids: idsKey, limit: 60 });
        if (cancelled) return;
        // The listing returns catalog order; show most recently saved first.
        const order = new Map(idsKey.split(',').map((id, i) => [Number(id), i]));
        setItems((data.items || []).slice().sort((a, b) => order.get(a.id) - order.get(b.id)));
      } catch (e) {
        console.error('Saved list load failed:', e);
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [idsKey]);

  return (
    <div className="mk">
      <StoreHeader />
      <Seo title={t('saved.title')} noindex />
      <main id="main">
        <div className="mk-container" style={{ paddingTop: 60, paddingBottom: 80 }}>
          <Reveal>
            <div className="mk-eyebrow">{t('saved.eyebrow')}</div>
            <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 16px' }}>
              {t('saved.title')}
            </h1>
            {!user && ids.length > 0 && (
              <p className="mk-muted" style={{ fontSize: 14, margin: '0 0 24px', maxWidth: 520 }}>
                {t('saved.guestHint')}{' '}
                <button onClick={openSignIn} className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }}>
                  {t('nav.signIn')}
                </button>
              </p>
            )}
          </Reveal>

          <div style={{ marginTop: 16 }}>
            {items === null ? (
              <div className="mk-grid mk-cards-4"><ProductGridSkeleton count={4} /></div>
            ) : items.length === 0 ? (
              <Reveal className="mk-card mk-center" style={{ padding: '48px 32px' }}>
                <Icon name="heart" size={28} style={{ color: 'var(--ink-4)', margin: '0 auto 14px' }} />
                <p className="mk-muted" style={{ marginBottom: 16 }}>{t('saved.empty')}</p>
                <Link to="/catalog">
                  <button className="mk-btn mk-btn-primary">
                    {t('cart.browse').replace(/\s*→\s*$/, '')} <Icon name="arrow-right" size={16} className="mk-arrow" />
                  </button>
                </Link>
              </Reveal>
            ) : (
              <div className="mk-grid mk-cards-4">
                {items.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ProductCard p={p} index={i} />
                    <button
                      onClick={() => toggle(p.id).catch(() => {})}
                      className="mk-ulink mk-row"
                      style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit', fontSize: 13, color: 'var(--ink-3)', gap: 6, alignSelf: 'flex-start' }}
                    >
                      <Icon name="close" size={14} /> {t('cart.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
