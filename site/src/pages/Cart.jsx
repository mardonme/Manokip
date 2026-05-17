import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
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
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />
      <section style={{ padding: '60px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="mk-eyebrow">{t('cart.eyebrow')}</div>
        <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 32px' }}>
          {cart.count > 0 ? `${cart.count} ${t('cart.itemsIn')}` : t('cart.empty')}
        </h1>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#74777e' }}>{t('cart.loading')}</div>
        ) : cart.items.length === 0 ? (
          <div style={{ background: '#fff', padding: 40, border: '1px solid var(--line)', textAlign: 'center' }}>
            <p style={{ color: '#74777e', marginBottom: 16 }}>{t('cart.emptyHint')}</p>
            <Link to="/catalog"><button className="mk-btn mk-btn-primary">{t('cart.browse')}</button></Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>
            <div>
              {cart.items.map((it) => (
                <div key={it.productId} style={{
                  background: '#fff', border: '1px solid var(--line)', padding: 20,
                  marginBottom: 10, display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: 24, alignItems: 'center',
                }}>
                  <div>
                    <Link to={`/product/${it.productId}`} style={{ color: 'inherit' }}>
                      <div className="mk-mono" style={{ fontSize: 10.5, color: '#74777e', letterSpacing: '0.08em' }}>{it.categoryName}</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{it.model}</div>
                      <div style={{ fontSize: 13, color: '#74777e', marginTop: 2 }}>{it.desc}</div>
                      <div className="mk-mono" style={{ fontSize: 12, color: '#74777e', marginTop: 6 }}>{it.range} · SKU {it.sku}</div>
                    </Link>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 999, background: '#fafaf7' }}>
                    <button onClick={() => update(it.productId, Math.max(0, it.qty - 1))} style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer' }}>−</button>
                    <span style={{ width: 36, textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{it.qty}</span>
                    <button onClick={() => update(it.productId, it.qty + 1)} style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mk-mono" style={{ fontSize: 13, marginBottom: 6 }}>{it.priceText}</div>
                    <button onClick={() => remove(it.productId)} style={{ background: 'transparent', border: 'none', color: '#b8531a', fontSize: 12, cursor: 'pointer' }}>{t('cart.remove')}</button>
                  </div>
                </div>
              ))}
            </div>

            <aside style={{ background: '#fff', border: '1px solid var(--line)', padding: 24, position: 'sticky', top: 100, alignSelf: 'start' }}>
              <div className="mk-eyebrow">{t('cart.summary')}</div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#3a3d44' }}>
                <span>{t('cart.items')}</span><span>{cart.count}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#74777e' }}>{t('cart.pricesNote')}</div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11.5, color: '#74777e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t('cart.notes')}</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('cart.notesPh')}
                  style={{ width: '100%', minHeight: 70, border: '1px solid var(--line-2)', padding: 10, fontSize: 13.5, background: 'transparent', resize: 'vertical' }}
                />
              </div>

              {!user && (
                <div style={{ marginTop: 16, padding: 12, background: '#fafaf7', border: '1px solid var(--line)', fontSize: 13, color: '#3a3d44' }}>
                  {t('cart.signInPrompt.a')} <a onClick={openSignIn} style={{ color: '#1240e5', cursor: 'pointer' }}>{t('cart.signInPrompt.b')}</a> {t('cart.signInPrompt.c')}
                </div>
              )}

              <button
                onClick={placeOrder}
                disabled={submitting}
                className="mk-btn mk-btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 18, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? '…' : t('cart.place')}
              </button>

              {feedback && (
                <div style={{
                  marginTop: 12, fontSize: 13,
                  color: feedback.kind === 'err' ? '#b8531a' : '#3a3d44',
                }}>{feedback.text}</div>
              )}
            </aside>
          </div>
        )}
      </section>
      <StoreFooter />
    </div>
  );
}
