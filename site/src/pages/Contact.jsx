import React, { useState } from 'react';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Seo from '../components/Seo.jsx';
import { Reveal, Icon } from '../components/ui/index.js';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  focusFirstError, isNameValid, isPhoneValid, orderErrorToFields,
  saveContact, useOrderContact,
} from '../lib/order.js';

// Manokip sells instruments and the work around them. Picking a service is the
// fast path: one tap replaces writing out what the request is about.
const SERVICES = ['supply', 'custom', 'repair', 'calibration', 'consult'];

export default function Contact() {
  const { t } = useLang();
  const toast = useToast();
  const { contact, set } = useOrderContact();
  const [service, setService] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ kind: 'idle' });
  const [errors, setErrors] = useState({});

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!isNameValid(contact.name)) next.name = t('order.err.name');
    if (!isPhoneValid(contact.phone)) next.phone = t('order.err.phone');
    if (!service && !message.trim()) next.message = t('contact.form.err.message');
    setErrors(next);
    if (Object.keys(next).length) { focusFirstError('c', next); return; }

    setStatus({ kind: 'sending' });
    try {
      const specs = [service ? t(`contact.service.${service}`) : null, message.trim()]
        .filter(Boolean).join(' — ');
      const res = await api.post('/api/quotes', {
        companyName: contact.company.trim(),
        contactPerson: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        specs,
      });
      saveContact(contact);
      setStatus({ kind: 'ok', id: res.id });
      setMessage('');
      setService(null);
      toast.success(t('contact.form.ok'), `#${res.id}`);
    } catch (e2) {
      const failed = orderErrorToFields(e2, t);
      setErrors(failed);
      focusFirstError('c', failed);
      setStatus({ kind: 'err', message: failed.form || '' });
      toast.error(t('contact.form.err'), failed.form || failed.phone || failed.name || '');
    }
  }

  return (
    <div className="mk">
      <StoreHeader />
      <Seo title={t('seo.contact.title')} description={t('seo.contact.desc')} />
      <main id="main">
        <div className="mk-container" style={{ paddingTop: 72, paddingBottom: 48 }}>
          <div className="mk-2col">
            <Reveal variant="left">
              <div className="mk-eyebrow">{t('contact.eyebrow')}</div>
              <h1 style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>{t('contact.title')}</h1>
              <p className="mk-muted" style={{ fontSize: 17, marginTop: 22, maxWidth: 480, lineHeight: 1.55 }}>{t('contact.lead')}</p>
              <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                <ContactBlock icon="mail" eyebrow={t('contact.col.contacts')}
                  a="manokip@manometr.uz" b="+998 90 544 61 07" c="+998 55 501 61 07" />
                <ContactBlock icon="pin" eyebrow={t('contact.col.hq')} a={t('contact.hq.district')} b={t('contact.hq.address')} />
                <ContactBlock icon="clock" eyebrow={t('contact.col.hours')} a={t('contact.hours.days')} b={t('contact.hours.tz')} />
              </div>
            </Reveal>

            <Reveal as="form" index={1} onSubmit={submit} className="mk-card" style={{ padding: 32 }}>
              <div className="mk-eyebrow">{t('contact.form.title')}</div>
              <p className="mk-muted" style={{ fontSize: 13.5, margin: '10px 0 0', lineHeight: 1.5 }}>{t('contact.form.lead')}</p>

              <div style={{ marginTop: 20 }}>
                <span className="mk-label">{t('contact.service.title')}</span>
                <div className="mk-row mk-wrap" style={{ gap: 8, marginTop: 10 }}>
                  {SERVICES.map((key) => (
                    <button
                      key={key} type="button"
                      className={`mk-chip ${service === key ? 'is-active' : ''}`}
                      aria-pressed={service === key}
                      onClick={() => setService((s) => (s === key ? null : key))}
                    >
                      {t(`contact.service.${key}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mk-stack" style={{ marginTop: 20, gap: 16 }}>
                <Field id="c-name" label={t('contact.form.name')} value={contact.name} onChange={(v) => set('name', v)} placeholder={t('contact.form.namePh')} autoComplete="name" required error={errors.name} />
                <Field id="c-phone" label={t('contact.form.phone')} value={contact.phone} onChange={(v) => set('phone', v)} onFocus={() => { if (!contact.phone) set('phone', '+998 '); }} placeholder={t('contact.form.phonePh')} type="tel" autoComplete="tel" inputMode="tel" required error={errors.phone} />
                <Field id="c-company" label={`${t('contact.form.company')} · ${t('order.optional')}`} value={contact.company} onChange={(v) => set('company', v)} placeholder={t('contact.form.companyPh')} autoComplete="organization" />
                <Field id="c-email" label={`${t('contact.form.email')} · ${t('order.optional')}`} value={contact.email} onChange={(v) => set('email', v)} placeholder={t('contact.form.emailPh')} type="email" autoComplete="email" />
                <label className="mk-field" htmlFor="c-message">
                  <span className="mk-label">{t('contact.form.message')}{!service && <span style={{ color: 'var(--danger)' }}> *</span>}</span>
                  <textarea id="c-message" className="mk-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('contact.form.messagePh')} aria-invalid={errors.message ? 'true' : undefined} />
                  {errors.message && <span className="mk-error" role="alert">{errors.message}</span>}
                </label>

                <button type="submit" className="mk-btn mk-btn-primary mk-btn-lg" disabled={status.kind === 'sending'} style={{ alignSelf: 'flex-start' }}>
                  {status.kind === 'sending' ? <><span className="mk-spinner" /> {t('contact.form.sending')}</> : <>{t('contact.form.submit')} <Icon name="send" size={15} /></>}
                </button>

                <div aria-live="polite">
                  {status.kind === 'ok' && <div className="mk-row" style={{ fontSize: 13.5, color: 'var(--ok)', gap: 6 }}><Icon name="check-circle" size={15} />{t('contact.form.ok')} (#{status.id})</div>}
                  {status.kind === 'err' && status.message && <div className="mk-error" role="alert">{status.message}</div>}
                </div>
                <div className="mk-help">{t('contact.form.hint')} · {t('order.noAccount')}</div>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="mk-container" style={{ paddingBottom: 88 }}>
          <div className="mk-eyebrow" style={{ marginBottom: 16 }}>{t('contact.map.eyebrow')}</div>
          <div className="mk-card" style={{ overflow: 'hidden' }}>
            <iframe
              title="Manokip · OOO Manokip factory"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d922.8003146055592!2d69.3746863!3d41.2471867!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae5fb9f75f62e5%3A0x53946016cd0b1f79!2sOOO%20%22Manokip%20factory%22!5e1!3m2!1sen!2s!4v1778862839518!5m2!1sen!2s"
              width="100%" height="450" style={{ border: 0, display: 'block' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}

function ContactBlock({ icon, eyebrow, a, b, c }) {
  return (
    <div>
      <div className="mk-row mk-eyebrow" style={{ marginBottom: 10, gap: 7 }}><Icon name={icon} size={14} /> {eyebrow}</div>
      <div style={{ fontSize: 14.5 }}>{a}</div>
      <div className="mk-mono mk-muted" style={{ fontSize: 13, marginTop: 4 }}>{b}</div>
      {c && <div className="mk-mono mk-muted" style={{ fontSize: 13, marginTop: 2 }}>{c}</div>}
    </div>
  );
}

function Field({ id, label, value, onChange, onFocus, type = 'text', placeholder, required, autoComplete, inputMode, error }) {
  return (
    <label className="mk-field" htmlFor={id}>
      <span className="mk-label">{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</span>
      <input
        id={id} className="mk-input" type={type} value={value}
        onChange={(e) => onChange(e.target.value)} onFocus={onFocus}
        placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode}
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && <span id={`${id}-err`} className="mk-error" role="alert">{error}</span>}
    </label>
  );
}
