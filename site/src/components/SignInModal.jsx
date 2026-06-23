import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';
import Icon from './ui/Icon.jsx';

export default function SignInModal() {
  const { t } = useLang();
  const { signInOpen, closeSignIn, login, register } = useAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', company: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);

  // Escape to close + lock scroll + focus the first field when opened.
  useEffect(() => {
    if (!signInOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeSignIn(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const tmr = setTimeout(() => firstRef.current?.focus(), 30);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; clearTimeout(tmr); };
  }, [signInOpen, closeSignIn]);

  if (!signInOpen) return null;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await login(form.email, form.password);
      } else {
        await register({
          email: form.email, password: form.password,
          name: form.name || undefined, phone: form.phone || undefined, company: form.company || undefined,
        });
      }
      closeSignIn();
    } catch (e2) {
      setErr(e2.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mk mk-modal-scrim" onClick={closeSignIn}>
      <div className="mk-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
        <div className="mk-between" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
          <div className="mk-seg" role="tablist">
            <button className={mode === 'signin' ? 'is-active' : ''} aria-selected={mode === 'signin'} onClick={() => setMode('signin')}>{t('auth.signin.btn')}</button>
            <button className={mode === 'register' ? 'is-active' : ''} aria-selected={mode === 'register'} onClick={() => setMode('register')}>{t('auth.register.btn')}</button>
          </div>
          <button onClick={closeSignIn} className="mk-iconbtn" aria-label="Close"><Icon name="close" size={18} /></button>
        </div>

        <div className="mk-eyebrow">{mode === 'signin' ? t('auth.signin.eyebrow') : t('auth.register.eyebrow')}</div>
        <h2 id="auth-title" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 0' }}>
          {mode === 'signin' ? t('auth.signin.title') : t('auth.register.title')}
        </h2>

        <form onSubmit={submit} className="mk-stack" style={{ marginTop: 20, gap: 14 }}>
          {mode === 'register' && (
            <>
              <Field id="a-name" label={t('auth.field.name')} value={form.name} onChange={(v) => update('name', v)} autoComplete="name" />
              <Field id="a-company" label={t('auth.field.company')} value={form.company} onChange={(v) => update('company', v)} autoComplete="organization" />
              <Field id="a-phone" label={t('auth.field.phone')} value={form.phone} onChange={(v) => update('phone', v)} placeholder="+998 __ ___-__-__" type="tel" autoComplete="tel" />
            </>
          )}
          <Field ref={mode === 'signin' ? firstRef : undefined} id="a-email" label={t('auth.field.email')} type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="you@company.uz" autoComplete="email" required />
          <Field id="a-password" label={t('auth.field.password')} type="password" value={form.password} onChange={(v) => update('password', v)} placeholder={t('auth.field.passwordPh')} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />

          {err && <div className="mk-error" role="alert">{err}</div>}

          <button type="submit" disabled={busy} className="mk-btn mk-btn-primary mk-btn-lg" style={{ marginTop: 4 }}>
            {busy ? <span className="mk-spinner" /> : (mode === 'signin' ? t('auth.signin.btn') : t('auth.register.btn'))}
          </button>

          <div className="mk-muted mk-center" style={{ fontSize: 13, marginTop: 2 }}>
            {mode === 'signin'
              ? <>{t('auth.toRegister.q')} <button type="button" className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }} onClick={() => setMode('register')}>{t('auth.toRegister.a')}</button></>
              : <>{t('auth.toSignin.q')} <button type="button" className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }} onClick={() => setMode('signin')}>{t('auth.toSignin.a')}</button></>}
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = React.forwardRef(function Field({ id, label, value, onChange, type = 'text', placeholder, required, autoComplete }, ref) {
  return (
    <label className="mk-field" htmlFor={id}>
      <span className="mk-label">{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</span>
      <input ref={ref} id={id} className="mk-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} autoComplete={autoComplete} />
    </label>
  );
});
