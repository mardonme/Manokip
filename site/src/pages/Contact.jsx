import React, { useState } from 'react';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Reveal, Icon } from '../components/ui/index.js';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';

export default function Contact() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState({ kind: 'idle' });

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setStatus({ kind: 'sending' });
    try {
      const res = await api.post('/api/quotes', {
        companyName: form.name,
        contactPerson: form.name,
        email: form.email,
        phone: form.phone,
        specs: form.message,
      });
      setStatus({ kind: 'ok', id: res.id });
      setForm({ name: '', phone: '', email: '', message: '' });
    } catch (e2) {
      setStatus({ kind: 'err', message: e2.message });
    }
  }

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">
        <div className="mk-container" style={{ paddingTop: 72, paddingBottom: 48 }}>
          <div className="mk-2col">
            <Reveal variant="left">
              <div className="mk-eyebrow">{t('contact.eyebrow')}</div>
              <h1 style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>{t('contact.title')}</h1>
              <p className="mk-muted" style={{ fontSize: 17, marginTop: 22, maxWidth: 480, lineHeight: 1.55 }}>{t('contact.lead')}</p>
              <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                <ContactBlock icon="mail" eyebrow={t('contact.col.sales')} a="info@manokip.uz" b="+998 93 693-92-20" />
                <ContactBlock icon="award" eyebrow={t('contact.col.service')} a="service@manokip.uz" b="+998 90 544-61-07" />
                <ContactBlock icon="pin" eyebrow={t('contact.col.hq')} a={t('contact.hq.district')} b={t('contact.hq.address')} />
                <ContactBlock icon="clock" eyebrow={t('contact.col.hours')} a={t('contact.hours.days')} b={t('contact.hours.tz')} />
              </div>
            </Reveal>

            <Reveal as="form" index={1} onSubmit={submit} className="mk-card" style={{ padding: 32 }}>
              <div className="mk-eyebrow">{t('contact.form.title')}</div>
              <div className="mk-stack" style={{ marginTop: 20, gap: 16 }}>
                <Field id="c-name" label={t('contact.form.name')} value={form.name} onChange={(v) => update('name', v)} placeholder={t('contact.form.namePh')} autoComplete="name" required />
                <Field id="c-phone" label={t('contact.form.phone')} value={form.phone} onChange={(v) => update('phone', v)} placeholder={t('contact.form.phonePh')} type="tel" autoComplete="tel" required />
                <Field id="c-email" label={t('contact.form.email')} value={form.email} onChange={(v) => update('email', v)} placeholder={t('contact.form.emailPh')} type="email" autoComplete="email" required />
                <label className="mk-field" htmlFor="c-msg">
                  <span className="mk-label">{t('contact.form.message')} <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <textarea id="c-msg" className="mk-textarea" value={form.message} onChange={(e) => update('message', e.target.value)} placeholder={t('contact.form.messagePh')} required />
                </label>

                <button type="submit" className="mk-btn mk-btn-primary mk-btn-lg" disabled={status.kind === 'sending'} style={{ alignSelf: 'flex-start' }}>
                  {status.kind === 'sending' ? <><span className="mk-spinner" /> {t('contact.form.sending')}</> : <>{t('contact.form.submit')} <Icon name="send" size={15} /></>}
                </button>

                <div aria-live="polite">
                  {status.kind === 'ok' && <div className="mk-row" style={{ fontSize: 13.5, color: 'var(--ok)', gap: 6 }}><Icon name="check-circle" size={15} />{t('contact.form.ok')} (#{status.id})</div>}
                  {status.kind === 'err' && <div className="mk-error" role="alert">{t('contact.form.err')} {status.message}</div>}
                </div>
                <div className="mk-help">{t('contact.form.hint')}</div>
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

function ContactBlock({ icon, eyebrow, a, b }) {
  return (
    <div>
      <div className="mk-row mk-eyebrow" style={{ marginBottom: 10, gap: 7 }}><Icon name={icon} size={14} /> {eyebrow}</div>
      <div style={{ fontSize: 14.5 }}>{a}</div>
      <div className="mk-mono mk-muted" style={{ fontSize: 13, marginTop: 4 }}>{b}</div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = 'text', placeholder, required, autoComplete }) {
  return (
    <label className="mk-field" htmlFor={id}>
      <span className="mk-label">{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</span>
      <input id={id} className="mk-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} autoComplete={autoComplete} />
    </label>
  );
}
