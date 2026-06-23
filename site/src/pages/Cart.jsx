import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Icon, ProductCardSkeleton } from '../components/ui/index.js';
import { useCart } from '../lib/CartContext.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';

export default function Cart() {
  const { t } = useLang();
  const { cart, loading, update, remove, checkout } = useCart();
  const { user, openSignIn } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function placeOrder() {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await checkout(notes || undefined);
      if (res.ok) navigate('/orders');
      else if (res.needsSignIn) setFeedback({ kind: 'info', text: t('cart.signInRequired') });
    } catch (e) {
      setFeedback({ kind: 'err', text: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main" className="mk-container" style={{ paddingTop: 56, paddingBottom: 72 }}>
        <div className="mk-eyebrow">{t('cart.eyebrow')}</div>
        <h1 style={{ fontSize: 'clamp(34px,4.5vw,56px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 28px' }}>
          {cart.count > 0 ? `${cart.count} ${t('cart.itemsIn')}` : t('cart.empty')}
        </h1>

        {loading ? (
          <div className="mk-cart-grid"><div className="mk-stack" style={{ gap: 10 }}><ProductCardSkeleton compact /><ProductCardSkeleton compact /></div><div /></div>
        ) : cart.items.length === 0 ? (
          <div className="mk-card mk-center" style={{ padding: '56px 32px' }}>
            <Icon name="cart" size={30} style={{ color: 'var(--ink-4)', margin: '0 auto 14px' }} />
            <p className="mk-muted" style={{ marginBottom: 18 }}>{t('cart.emptyHint')}</p>
            <Link to="/catalog"><button className="mk-btn mk-btn-primary">{t('cart.browse')} <Icon name="arrow-right" size={16} className="mk-arrow" /></button></Link>
          </div>
        ) : (
          <div className="mk-cart-grid">
            <div className="mk-stack" style={{ gap: 10 }}>
              {cart.items.map((it) => (
                <div key={it.productId} className="mk-card" style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 20, alignItems: 'center' }}>
                  <Link to={`/product/${it.productId}`} style={{ color: 'inherit', minWidth: 0 }}>
                    <div className="mk-mono mk-muted" style={{ fontSize: 10.5, letterSpacing: '0.08em' }}>{it.categoryName}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{it.model}</div>
                    <div className="mk-muted" style={{ fontSize: 13, marginTop: 2 }}>{it.desc}</div>
                    <div className="mk-mono mk-muted" style={{ fontSize: 12, marginTop: 6 }}>{it.range} · SKU {it.sku}</div>
                  </Link>
                  <div className="mk-stepper" style={{ height: 38 }}>
                    <button onClick={() => update(it.productId, Math.max(0, it.qty - 1))} aria-label="Decrease" style={{ height: 36, width: 34 }}><Icon name="minus" size={14} /></button>
                    <span className="mk-mono" style={{ width: 34, textAlign: 'center', fontSize: 13 }}>{it.qty}</span>
                    <button onClick={() => update(it.productId, it.qty + 1)} aria-label="Increase" style={{ height: 36, width: 34 }}><Icon name="plus" size={14} /></button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mk-mono" style={{ fontSize: 13, marginBottom: 6 }}>{it.priceText}</div>
                    <button onClick={() => remove(it.productId)} className="mk-row" style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', gap: 4, marginLeft: 'auto' }}>
                      <Icon name="close" size={12} /> {t('cart.remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="mk-card" style={{ padding: 24, position: 'sticky', top: 100, alignSelf: 'start' }}>
              <div className="mk-eyebrow">{t('cart.summary')}</div>
              <div className="mk-between" style={{ marginTop: 16, fontSize: 14 }}><span className="mk-muted">{t('cart.items')}</span><span className="mk-num">{cart.count}</span></div>
              <div className="mk-muted" style={{ marginTop: 6, fontSize: 12 }}>{t('cart.pricesNote')}</div>

              <label className="mk-field" htmlFor="cart-notes" style={{ marginTop: 18 }}>
                <span className="mk-label">{t('cart.notes')}</span>
                <textarea id="cart-notes" className="mk-textarea" style={{ minHeight: 80 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('cart.notesPh')} />
              </label>

              {!user && (
                <div className="mk-muted" style={{ marginTop: 16, padding: 12, background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>
                  {t('cart.signInPrompt.a')} <button onClick={openSignIn} className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }}>{t('cart.signInPrompt.b')}</button> {t('cart.signInPrompt.c')}
                </div>
              )}

              <button onClick={placeOrder} disabled={submitting} className="mk-btn mk-btn-primary mk-btn-lg" style={{ width: '100%', marginTop: 18 }}>
                {submitting ? <span className="mk-spinner" /> : <>{t('cart.place')} <Icon name="arrow-right" size={16} className="mk-arrow" /></>}
              </button>

              <div aria-live="polite">
                {feedback && <div style={{ marginTop: 12, fontSize: 13, color: feedback.kind === 'err' ? 'var(--danger)' : 'var(--ink-2)' }}>{feedback.text}</div>}
              </div>
            </aside>
          </div>
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
