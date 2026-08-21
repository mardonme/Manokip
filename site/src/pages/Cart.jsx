import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Seo from '../components/Seo.jsx';
import { Icon, ProductCardSkeleton } from '../components/ui/index.js';
import { ContactFields, OrderPlaced } from '../components/OrderForm.jsx';
import { useCart } from '../lib/CartContext.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';
import {
  focusFirstError, isNameValid, isPhoneValid, orderErrorToFields,
  rememberOrder, saveContact, useOrderContact,
} from '../lib/order.js';

export default function Cart() {
  const { t } = useLang();
  const { cart, loading, update, remove, checkout } = useCart();
  const { user, openSignIn } = useAuth();
  const { contact, set } = useOrderContact();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [placed, setPlaced] = useState(null);

  async function placeOrder(e) {
    e.preventDefault();
    const next = {};
    if (!isNameValid(contact.name)) next.name = t('order.err.name');
    if (!isPhoneValid(contact.phone)) next.phone = t('order.err.phone');
    setErrors(next);
    if (Object.keys(next).length) { focusFirstError('cart', next); return; }

    setSubmitting(true);
    try {
      const order = await checkout({
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim() || undefined,
        company: contact.company.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      saveContact(contact);
      rememberOrder(order);
      setNotes('');
      setPlaced(order);
    } catch (e2) {
      const failed = orderErrorToFields(e2, t);
      setErrors(failed);
      focusFirstError('cart', failed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mk">
      <StoreHeader />
      <Seo title={t('nav.cart')} noindex />
      <main id="main" className="mk-container" style={{ paddingTop: 56, paddingBottom: 72 }}>
        <div className="mk-eyebrow">{t('cart.eyebrow')}</div>
        <h1 style={{ fontSize: 'clamp(34px,4.5vw,56px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 28px' }}>
          {placed ? t('order.ok.title') : cart.count > 0 ? `${cart.count} ${t('cart.itemsIn')}` : t('cart.empty')}
        </h1>

        {placed ? (
          <div className="mk-card" style={{ padding: '48px 32px', maxWidth: 560, margin: '0 auto' }}>
            <OrderPlaced order={placed} phone={contact.phone}>
              {/* Guests get the same link — /orders reads their local history. */}
              <div style={{ marginTop: 14, fontSize: 13 }}>
                <Link to="/orders" className="mk-ulink">{t('order.ok.history')}</Link>
              </div>
            </OrderPlaced>
          </div>
        ) : loading ? (
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
                    {it.variant && <div className="mk-muted" style={{ fontSize: 12.5, marginTop: 1 }}>{it.variant}</div>}
                    <div className="mk-muted" style={{ fontSize: 13, marginTop: 2 }}>{it.desc}</div>
                    <div className="mk-mono mk-muted" style={{ fontSize: 12, marginTop: 6 }}>
                      SKU {it.sku} · {t(`avail.${it.availability || 'MADE_TO_ORDER'}`)}
                    </div>
                  </Link>
                  <div className="mk-stepper" style={{ height: 38 }}>
                    <button onClick={() => update(it.productId, Math.max(0, it.qty - 1))} aria-label="Decrease" style={{ height: 36, width: 34 }}><Icon name="minus" size={14} /></button>
                    <span className="mk-mono" style={{ width: 34, textAlign: 'center', fontSize: 13 }}>{it.qty}</span>
                    <button onClick={() => update(it.productId, it.qty + 1)} aria-label="Increase" style={{ height: 36, width: 34 }}><Icon name="plus" size={14} /></button>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button onClick={() => remove(it.productId)} className="mk-row" style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', gap: 4, marginLeft: 'auto' }}>
                      <Icon name="close" size={12} /> {t('cart.remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* The contact details live in the summary itself: an order is one
                form away, and registration never enters the flow. */}
            <form onSubmit={placeOrder} className="mk-card" style={{ padding: 24, position: 'sticky', top: 100, alignSelf: 'start' }}>
              <div className="mk-eyebrow">{t('cart.summary')}</div>
              <div className="mk-between" style={{ marginTop: 16, fontSize: 14 }}><span className="mk-muted">{t('cart.items')}</span><span className="mk-num">{cart.count}</span></div>
              <div className="mk-muted" style={{ marginTop: 6, fontSize: 12 }}>{t('cart.pricesNote')}</div>

              <div style={{ marginTop: 18 }}>
                <ContactFields contact={contact} set={set} errors={errors} idPrefix="cart" />
              </div>

              <label className="mk-field" htmlFor="cart-notes" style={{ marginTop: 14 }}>
                <span className="mk-label">{t('cart.notes')}</span>
                <textarea id="cart-notes" className="mk-textarea" style={{ minHeight: 72 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('cart.notesPh')} />
              </label>

              <button type="submit" disabled={submitting} className="mk-btn mk-btn-primary mk-btn-lg" style={{ width: '100%', marginTop: 16 }}>
                {submitting ? <span className="mk-spinner" /> : <>{t('cart.place')} <Icon name="arrow-right" size={16} className="mk-arrow" /></>}
              </button>

              <div className="mk-help mk-center" style={{ marginTop: 10 }}>{t('order.noAccount')}</div>

              {!user && (
                <div className="mk-muted mk-center" style={{ marginTop: 8, fontSize: 12.5 }}>
                  {t('order.signInPrompt.a')}{' '}
                  <button type="button" onClick={openSignIn} className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }}>
                    {t('order.signInPrompt.b')}
                  </button>
                </div>
              )}

              <div aria-live="polite">
                {errors.form && <div className="mk-error" style={{ marginTop: 12 }} role="alert">{errors.form}</div>}
              </div>
            </form>
          </div>
        )}
      </main>
      <StoreFooter />
    </div>
  );
}
