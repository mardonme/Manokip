import React, { useState } from 'react';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
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
      // Map the simplified form onto the existing /api/quotes schema.
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
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />

      <section style={{ padding: '80px 40px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">{t('contact.eyebrow')}</div>
          <h1 style={{ fontSize: 72, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>
            {t('contact.title')}
          </h1>
          <p style={{ fontSize: 17, color: '#3a3d44', marginTop: 24, maxWidth: 480, lineHeight: 1.55 }}>
            {t('contact.lead')}
          </p>
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            <ContactBlock
              eyebrow={t('contact.col.sales')}
              a="info@manokip.uz"
              b="+998 93 693-92-20"
            />
            <ContactBlock
              eyebrow={t('contact.col.service')}
              a="service@manokip.uz"
              b="+998 90 544-61-07"
            />
            <ContactBlock
              eyebrow={t('contact.col.hq')}
              a={t('contact.hq.district')}
              b={t('contact.hq.address')}
            />
            <ContactBlock
              eyebrow={t('contact.col.hours')}
              a={t('contact.hours.days')}
              b={t('contact.hours.tz')}
            />
          </div>
        </div>

        <form onSubmit={submit} style={{ background: '#fff', border: '1px solid var(--line)', padding: 32 }}>
          <div className="mk-eyebrow">{t('contact.form.title')}</div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label={t('contact.form.name')}  value={form.name}  onChange={(v) => update('name', v)}  placeholder={t('contact.form.namePh')}  required />
            <Field label={t('contact.form.phone')} value={form.phone} onChange={(v) => update('phone', v)} placeholder={t('contact.form.phonePh')} type="tel" required />
            <Field label={t('contact.form.email')} value={form.email} onChange={(v) => update('email', v)} placeholder={t('contact.form.emailPh')} type="email" required />

            <div>
              <div style={{ fontSize: 11.5, color: '#74777e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {t('contact.form.message')}
              </div>
              <textarea
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder={t('contact.form.messagePh')}
                required
                style={{ width: '100%', minHeight: 120, border: '1px solid var(--line-2)', padding: 12, fontSize: 14, outline: 'none', background: 'transparent', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="mk-btn mk-btn-primary"
              disabled={status.kind === 'sending'}
              style={{ alignSelf: 'flex-start', opacity: status.kind === 'sending' ? 0.7 : 1 }}
            >
              {status.kind === 'sending' ? t('contact.form.sending') : t('contact.form.submit')}
            </button>

            {status.kind === 'ok' && (
              <div style={{ fontSize: 13.5, color: '#1d7a4f' }}>
                {t('contact.form.ok')} (#{status.id})
              </div>
            )}
            {status.kind === 'err' && (
              <div style={{ fontSize: 13.5, color: '#b8531a' }}>{t('contact.form.err')} {status.message}</div>
            )}
            <div style={{ fontSize: 11.5, color: '#a7a9af' }}>{t('contact.form.hint')}</div>
          </div>
        </form>
      </section>

      <section style={{ padding: '0 40px 96px' }}>
        <div className="mk-eyebrow" style={{ marginBottom: 16 }}>{t('contact.map.eyebrow')}</div>
        <div style={{ border: '1px solid var(--line)', background: '#fff', overflow: 'hidden' }}>
          <iframe
            title="Manokip · OOO Manokip factory"
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d922.8003146055592!2d69.3746863!3d41.2471867!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae5fb9f75f62e5%3A0x53946016cd0b1f79!2sOOO%20%22Manokip%20factory%22!5e1!3m2!1sen!2s!4v1778862839518!5m2!1sen!2s"
            width="100%"
            height="450"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}

function ContactBlock({ eyebrow, a, b }) {
  return (
    <div>
      <div className="mk-eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>
      <div style={{ fontSize: 14.5 }}>{a}</div>
      <div className="mk-mono" style={{ fontSize: 13, color: '#74777e', marginTop: 4 }}>{b}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: '#74777e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--line-2)', padding: '8px 0', fontSize: 14.5, outline: 'none', background: 'transparent' }}
      />
    </div>
  );
}
