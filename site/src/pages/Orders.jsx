import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';

export default function Orders() {
  const { t } = useLang();
  const { user, loading: authLoading, openSignIn } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/api/orders');
        if (!cancelled) setOrders(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />
      <section style={{ padding: '60px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="mk-eyebrow">{t('orders.eyebrow')}</div>
        <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 32px' }}>{t('orders.title')}</h1>

        {authLoading || loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#74777e' }}>{t('orders.loading')}</div>
        ) : !user ? (
          <div style={{ background: '#fff', padding: 40, border: '1px solid var(--line)', textAlign: 'center' }}>
            <p style={{ color: '#74777e', marginBottom: 16 }}>{t('orders.signIn')}</p>
            <button className="mk-btn mk-btn-primary" onClick={openSignIn}>{t('orders.signInBtn')}</button>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ background: '#fff', padding: 40, border: '1px solid var(--line)', textAlign: 'center' }}>
            <p style={{ color: '#74777e', marginBottom: 16 }}>{t('orders.empty')}</p>
            <Link to="/catalog"><button className="mk-btn mk-btn-primary">{t('cart.browse')}</button></Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map((o) => (
              <div key={o.id} style={{ background: '#fff', border: '1px solid var(--line)', padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <div className="mk-mono" style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.08em' }}>
                      {t('orders.order')} #{o.id} · {new Date(o.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                      {o.items.length} {t('orders.line')}
                    </div>
                  </div>
                  <span className="mk-tag" style={{ background: '#14161b', color: '#fff', borderColor: '#14161b' }}>
                    {o.status}
                  </span>
                </div>
                <div style={{ marginTop: 16, borderTop: '1px solid var(--line-soft)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {o.items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#3a3d44' }}>
                      <span>{it.qty} × {it.productModel}</span>
                      <span className="mk-mono" style={{ color: '#74777e' }}>{it.priceText}</span>
                    </div>
                  ))}
                </div>
                {o.notes && (
                  <div style={{ marginTop: 12, padding: 12, background: '#fafaf7', fontSize: 13, color: '#3a3d44' }}>
                    {t('orders.notes')} {o.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <StoreFooter />
    </div>
  );
}
