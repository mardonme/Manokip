import React, { useRef, useState } from 'react';
import { useLang } from '../../lib/LangContext.jsx';
import { api, mediaUrl } from '../../lib/api.js';

// Shared, utilitarian admin UI primitives. Match the storefront's clean
// bordered look but tuned for dense data entry.

export function AdminModal({ title, onClose, children, footer }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,22,27,0.55)',
        zIndex: 120, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 20px', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: 560, maxWidth: '100%', border: '1px solid var(--line)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#74777e' }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--line)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Labeled({ label, children, hint }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11.5, color: '#74777e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}{hint && <span style={{ textTransform: 'none', letterSpacing: 0, color: '#a7a9af' }}> · {hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', border: '1px solid var(--line-2)', borderRadius: 4,
  padding: '9px 12px', fontSize: 14, background: '#fff', outline: 'none', boxSizing: 'border-box',
};

export function TextInput({ value, onChange, ...rest }) {
  return <input style={inputStyle} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function TextArea({ value, onChange, ...rest }) {
  return <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function NumberInput({ value, onChange, ...rest }) {
  return (
    <input
      type="number"
      style={inputStyle}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, ...rest }) {
  return (
    <select style={inputStyle} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Image picker with live preview. Uploads immediately to /api/admin/uploads
// and reports the stored URL back via onChange(url | null).
export function ImageUpload({ value, onChange, onError }) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    onError?.(null);
    try {
      const { url } = await api.upload('/api/admin/uploads', file);
      onChange(url);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
      {value ? (
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <img
            src={mediaUrl(value)}
            alt=""
            style={{ width: 96, height: 96, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 4, background: '#fafaf7' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LightBtn type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? t('admin.prod.imageUploading') : t('admin.prod.imageReplace')}
            </LightBtn>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#b8531a', padding: 0, textAlign: 'left' }}
            >
              {t('admin.prod.imageRemove')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            width: '100%', padding: '22px 12px', border: '1px dashed var(--line-2)', borderRadius: 4,
            background: '#fafaf7', cursor: 'pointer', fontSize: 14, color: '#74777e',
          }}
        >
          {busy ? t('admin.prod.imageUploading') : `+ ${t('admin.prod.imageChoose')}`}
        </button>
      )}
    </div>
  );
}

export function StatusPill({ label, tone = 'default' }) {
  const tones = {
    default: { bg: '#f0efe9', fg: '#3a3d44' },
    blue: { bg: '#e7ecfd', fg: '#1240e5' },
    green: { bg: '#e3f3ea', fg: '#1d7a4f' },
    amber: { bg: '#fbeede', fg: '#b8531a' },
    dark: { bg: '#14161b', fg: '#fff' },
  };
  const c = tones[tone] || tones.default;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11.5,
      fontFamily: 'JetBrains Mono', background: c.bg, color: c.fg, letterSpacing: '0.04em',
    }}>{label}</span>
  );
}

export function PrimaryBtn({ children, ...rest }) {
  return <button className="mk-btn mk-btn-primary mk-btn-sm" {...rest}>{children}</button>;
}
export function LightBtn({ children, ...rest }) {
  return <button className="mk-btn mk-btn-light mk-btn-sm" {...rest}>{children}</button>;
}

export function AdminError({ message }) {
  const { t } = useLang();
  if (!message) return null;
  return <div style={{ color: '#b8531a', fontSize: 13, marginTop: 4 }}>{t('admin.error')} {message}</div>;
}

export const tableStyles = {
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid var(--line)' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#74777e', borderBottom: '1px solid var(--line)', fontWeight: 600 },
  td: { padding: '12px 16px', fontSize: 13.5, borderBottom: '1px solid var(--line-soft)', verticalAlign: 'top' },
};
