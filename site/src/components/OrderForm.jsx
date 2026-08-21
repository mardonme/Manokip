import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';
import { useFocusTrap } from '../lib/useFocusTrap.js';
import {
  isNameValid, isPhoneValid, rememberOrder, saveContact, useOrderContact,
} from '../lib/order.js';
import Icon from './ui/Icon.jsx';

/**
 * The two fields an order actually needs — plus company/email folded away
 * behind a toggle, so the default form stays at "name, phone, send".
 * Shared by the quick-order modal and the cart summary.
 */
export function ContactFields({ contact, set, errors = {}, idPrefix = 'ord' }) {
  const { t } = useLang();
  const [extrasOpen, setExtrasOpen] = useState(
    () => Boolean(contact.company || contact.email),
  );

  return (
    <div className="mk-stack" style={{ gap: 14 }}>
      <Field
        id={`${idPrefix}-name`} label={t('order.field.name')} required
        value={contact.name} onChange={(v) => set('name', v)}
        placeholder={t('order.field.namePh')} autoComplete="name" error={errors.name}
      />
      <Field
        id={`${idPrefix}-phone`} label={t('order.field.phone')} required type="tel"
        value={contact.phone} onChange={(v) => set('phone', v)}
        // An empty phone box gets the country code for free — one less thing to type.
        onFocus={() => { if (!contact.phone) set('phone', '+998 '); }}
        placeholder={t('order.field.phonePh')} autoComplete="tel" inputMode="tel" error={errors.phone}
      />

      {extrasOpen ? (
        <>
          <Field
            id={`${idPrefix}-company`} label={t('order.field.company')}
            value={contact.company} onChange={(v) => set('company', v)}
            placeholder={t('order.field.companyPh')} autoComplete="organization"
          />
          <Field
            id={`${idPrefix}-email`} label={t('order.field.email')} type="email"
            value={contact.email} onChange={(v) => set('email', v)}
            placeholder={t('order.field.emailPh')} autoComplete="email" error={errors.email}
          />
        </>
      ) : (
        <button
          type="button" onClick={() => setExtrasOpen(true)}
          className="mk-ulink"
          style={{ background: 'none', border: 0, padding: 0, font: 'inherit', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--ink-3)' }}
        >
          + {t('order.addExtras')}
        </button>
      )}
    </div>
  );
}

/**
 * Order a product straight from its page: no cart, no account — the visitor
 * leaves a name and a phone and sales calls back.
 *
 * @param {object[]} items   [{ productId, qty }] ordered directly.
 * @param {string}   summary Human label of what is being ordered.
 */
export default function OrderModal({ open, onClose, items, summary }) {
  const { t } = useLang();
  const { contact, set } = useOrderContact();
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);
  const containerRef = useFocusTrap(open, onClose);

  // Every opening starts clean — a stale success screen would hide the form.
  useEffect(() => {
    if (!open) return;
    setPlaced(null);
    setErrors({});
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!isNameValid(contact.name)) next.name = t('order.err.name');
    if (!isPhoneValid(contact.phone)) next.phone = t('order.err.phone');
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const order = await api.post('/api/orders', {
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim() || undefined,
        company: contact.company.trim() || undefined,
        notes: notes.trim() || undefined,
        items,
      });
      saveContact(contact);
      rememberOrder(order);
      setNotes('');
      setPlaced(order);
    } catch (e2) {
      setErrors({ form: e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mk mk-modal-scrim" onClick={onClose}>
      <div
        ref={containerRef} className="mk-modal" role="dialog" aria-modal="true"
        aria-labelledby="order-title" onClick={(e) => e.stopPropagation()}
      >
        <div className="mk-between" style={{ alignItems: 'flex-start', marginBottom: 4 }}>
          <div className="mk-eyebrow">{t('order.eyebrow')}</div>
          <button onClick={onClose} className="mk-iconbtn" aria-label={t('order.close')}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {placed ? (
          <OrderPlaced order={placed} phone={contact.phone} onClose={onClose} />
        ) : (
          <>
            <h2 id="order-title" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 0' }}>
              {t('order.modal.title')}
            </h2>
            <p className="mk-muted" style={{ fontSize: 13.5, margin: '8px 0 0', lineHeight: 1.5 }}>
              {t('order.modal.lead')}
            </p>

            {summary && (
              <div className="mk-row" style={{ gap: 8, marginTop: 16, padding: '10px 14px', background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', fontSize: 13.5 }}>
                <Icon name="cart" size={15} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <span>{summary}</span>
              </div>
            )}

            <form onSubmit={submit} className="mk-stack" style={{ marginTop: 18, gap: 14 }}>
              <ContactFields contact={contact} set={set} errors={errors} idPrefix="qo" />

              <label className="mk-field" htmlFor="qo-notes">
                <span className="mk-label">{t('order.field.notes')}</span>
                <textarea
                  id="qo-notes" className="mk-textarea" style={{ minHeight: 68 }}
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('order.field.notesPh')}
                />
              </label>

              {errors.form && <div className="mk-error" role="alert">{errors.form}</div>}

              <button type="submit" disabled={busy} className="mk-btn mk-btn-primary mk-btn-lg">
                {busy
                  ? <><span className="mk-spinner" /> {t('order.sending')}</>
                  : <>{t('order.submit')} <Icon name="arrow-right" size={16} className="mk-arrow" /></>}
              </button>

              <div className="mk-help mk-center">{t('order.noAccount')}</div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/** Shared confirmation body — the cart shows the same thing inline. */
export function OrderPlaced({ order, phone, onClose, children }) {
  const { t } = useLang();
  return (
    <div className="mk-center" style={{ padding: '8px 0 4px' }}>
      <Icon name="check-circle" size={34} style={{ color: 'var(--ok)', margin: '0 auto 12px' }} />
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
        {t('order.ok.title')}
      </h2>
      <p className="mk-muted" style={{ fontSize: 14, margin: '10px 0 0', lineHeight: 1.55 }}>
        {t('order.ok.body')}{phone ? <> <span className="mk-mono">{phone}</span></> : null}
      </p>
      <div className="mk-mono" style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', fontSize: 13 }}>
        {t('order.ok.number')} <strong>#{order.id}</strong>
      </div>
      {children}
      <div className="mk-row" style={{ gap: 8, marginTop: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
        {onClose && (
          <button className="mk-btn mk-btn-primary" onClick={onClose}>{t('order.ok.continue')}</button>
        )}
        <Link to="/catalog"><button className="mk-btn mk-btn-light">{t('order.ok.catalog')}</button></Link>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, onFocus, type = 'text', placeholder, required, autoComplete, inputMode, error }) {
  return (
    <label className="mk-field" htmlFor={id}>
      <span className="mk-label">
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </span>
      <input
        id={id} className="mk-input" type={type} value={value}
        onChange={(e) => onChange(e.target.value)} onFocus={onFocus}
        placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && <span id={`${id}-err`} className="mk-error" role="alert">{error}</span>}
    </label>
  );
}
