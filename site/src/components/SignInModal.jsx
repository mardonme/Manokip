import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';

export default function SignInModal() {
  const { t } = useLang();
  const { signInOpen, closeSignIn, login, register } = useAuth();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', company: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!signInOpen) return null;

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await login(form.email, form.password);
      } else {
        await register({
          email: form.email,
          password: form.password,
          name: form.name || undefined,
          phone: form.phone || undefined,
          company: form.company || undefined,
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
    <div
      onClick={closeSignIn}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,22,27,0.55)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: 420, maxWidth: '100%', border: '1px solid var(--line)', padding: 32 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="mk-eyebrow">{mode === 'signin' ? t('auth.signin.eyebrow') : t('auth.register.eyebrow')}</div>
            <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: '8px 0 4px' }}>
              {mode === 'signin' ? t('auth.signin.title') : t('auth.register.title')}
            </h2>
          </div>
          <button onClick={closeSignIn} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#74777e' }}>×</button>
        </div>

        <form onSubmit={submit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <>
              <Field label={t('auth.field.name')}    value={form.name}    onChange={(v) => update('name', v)} />
              <Field label={t('auth.field.company')} value={form.company} onChange={(v) => update('company', v)} />
              <Field label={t('auth.field.phone')}   value={form.phone}   onChange={(v) => update('phone', v)} placeholder="+998 __ ___-__-__" />
            </>
          )}
          <Field label={t('auth.field.email')} type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="you@company.uz" required />
          <Field label={t('auth.field.password')} type="password" value={form.password} onChange={(v) => update('password', v)} placeholder={t('auth.field.passwordPh')} required />

          {err && <div style={{ color: '#b8531a', fontSize: 13 }}>{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="mk-btn mk-btn-primary"
            style={{ justifyContent: 'center', marginTop: 4, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? '…' : mode === 'signin' ? t('auth.signin.btn') : t('auth.register.btn')}
          </button>

          <div style={{ fontSize: 13, color: '#74777e', textAlign: 'center', marginTop: 4 }}>
            {mode === 'signin' ? (
              <>{t('auth.toRegister.q')} <a style={{ cursor: 'pointer', color: '#1240e5' }} onClick={() => setMode('register')}>{t('auth.toRegister.a')}</a></>
            ) : (
              <>{t('auth.toSignin.q')} <a style={{ cursor: 'pointer', color: '#1240e5' }} onClick={() => setMode('signin')}>{t('auth.toSignin.a')}</a></>
            )}
          </div>
        </form>
      </div>
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
