import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Seo from '../components/Seo.jsx';
import { Reveal, Icon, Skeleton } from '../components/ui/index.js';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';
import { readRecentOrders } from '../lib/order.js';

const OK_STATUSES = ['completed', 'complete', 'delivered', 'shipped', 'paid', 'done'];

export default function Orders() {
  const { t } = useLang();
  const { user, loading: authLoading, openSignIn } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // Guests never had an account to attach an order to, so the requests they
  // sent from this browser are read back from local storage.
  const [localOrders] = useState(readRecentOrders);

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

  const list = user ? orders : localOrders;

  return (
    <div className="mk">
      <StoreHeader />
      <Seo title={t('orders.title')} noindex />
      <main id="main">
        <div className="mk-container" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 1100 }}>
          <Reveal>
            <div className="mk-eyebrow">{t('orders.eyebrow')}</div>
            <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 32px' }}>
              {t('orders.title')}
            </h1>
          </Reveal>

          <div aria-live="polite">
            {authLoading || loading ? (
              <div className="mk-stack" style={{ gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="mk-card" style={{ padding: 24 }} aria-hidden="true">
                    <div className="mk-between" style={{ alignItems: 'flex-start' }}>
                      <div className="mk-stack" style={{ gap: 10 }}>
                        <Skeleton w={180} h={10} />
                        <Skeleton w={90} h={20} />
                      </div>
                      <Skeleton w={84} h={22} r={999} />
                    </div>
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Skeleton w="60%" h={12} />
                      <Skeleton w="45%" h={12} />
                    </div>
                  </div>
                ))}
              </div>
            ) : list.length === 0 ? (
              <Reveal className="mk-card mk-center" style={{ padding: '48px 32px' }}>
                <Icon name="cart" size={28} style={{ color: 'var(--ink-4)', margin: '0 auto 14px' }} />
                <p className="mk-muted" style={{ marginBottom: 16 }}>{t('orders.empty')}</p>
                <Link to="/catalog">
                  <button className="mk-btn mk-btn-primary">
                    {t('cart.browse')} <Icon name="arrow-right" size={16} className="mk-arrow" />
                  </button>
                </Link>
                {!user && (
                  <div className="mk-muted" style={{ marginTop: 18, fontSize: 13 }}>
                    {t('orders.guest.signInHint')}{' '}
                    <button onClick={openSignIn} className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }}>
                      {t('orders.signInBtn')}
                    </button>
                  </div>
                )}
              </Reveal>
            ) : (
              <div className="mk-stack" style={{ gap: 12 }}>
                {!user && (
                  <div className="mk-card mk-row" style={{ padding: 16, gap: 10, fontSize: 13, color: 'var(--ink-2)' }}>
                    <Icon name="user" size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                    <span>
                      {t('orders.guest.note')}{' '}
                      <button onClick={openSignIn} className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }}>
                        {t('orders.signInBtn')}
                      </button>
                    </span>
                  </div>
                )}
                {list.map((o, idx) => {
                  const isOk = OK_STATUSES.includes(String(o.status || '').toLowerCase());
                  return (
                    <Reveal key={o.id} index={idx} className="mk-card" style={{ padding: 24 }}>
                      <div className="mk-between mk-wrap" style={{ alignItems: 'baseline', gap: 12 }}>
                        <div>
                          <div className="mk-mono mk-muted mk-num" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
                            {t('orders.order')} #{o.id} · {new Date(o.createdAt).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
                            <span className="mk-num">{o.items.length}</span> {t('orders.line')}
                          </div>
                        </div>
                        <span className={`mk-tag ${isOk ? 'mk-tag-ok' : 'mk-tag-solid'}`}>
                          {isOk && <span className="mk-dot" />}{o.status}
                        </span>
                      </div>
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--line-soft)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {o.items.map((it, i) => (
                          <div key={it.id ?? i} style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                            <span className="mk-mono mk-num">{it.qty}</span> × {it.productModel}
                          </div>
                        ))}
                      </div>
                      {o.notes && (
                        <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-sunken)', fontSize: 13, color: 'var(--ink-2)' }}>
                          {t('orders.notes')} {o.notes}
                        </div>
                      )}
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
