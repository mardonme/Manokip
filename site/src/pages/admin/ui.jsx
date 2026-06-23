import React, { useRef, useState, useEffect } from 'react';
import { useLang } from '../../lib/LangContext.jsx';
import { api, mediaUrl } from '../../lib/api.js';
import Icon from '../../components/ui/Icon.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

// Shared admin UI primitives — built on the storefront design system,
// tuned for dense data entry.

export function PageHead({ title, action }) {
  return (
    <div className="mk-adm-head">
      <h1>{title}</h1>
      {action}
    </div>
  );
}

export function AdminModal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="mk mk-modal-scrim mk-modal-scrim-top" onClick={onClose}>
      <div className="mk-modal mk-modal-lg" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ padding: 0 }}>
        <div className="mk-between" style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="mk-iconbtn" aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <div className="mk-stack" style={{ padding: 24, gap: 14 }}>{children}</div>
        {footer && (
          <div className="mk-row" style={{ justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--line)' }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Labeled({ label, children, hint }) {
  return (
    <label className="mk-field">
      <span className="mk-label">
        {label}{hint && <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)', fontWeight: 400 }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return <input className="mk-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function TextArea({ value, onChange, ...rest }) {
  return <textarea className="mk-textarea" style={{ minHeight: 76 }} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
export function NumberInput({ value, onChange, ...rest }) {
  return <input type="number" className="mk-input" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} />;
}
export function Select({ value, onChange, options, ...rest }) {
  return (
    <select className="mk-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Image picker with live preview; uploads immediately and reports stored URL.
export function ImageUpload({ value, onChange, onError }) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
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
        <div className="mk-row" style={{ gap: 14, alignItems: 'flex-start' }}>
          <img src={mediaUrl(value)} alt="" style={{ width: 96, height: 96, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--surface-sunken)' }} />
          <div className="mk-stack" style={{ gap: 8 }}>
            <LightBtn type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? t('admin.prod.imageUploading') : t('admin.prod.imageReplace')}
            </LightBtn>
            <button type="button" onClick={() => onChange(null)} disabled={busy} className="mk-linkbtn mk-linkbtn-danger" style={{ marginLeft: 0, textAlign: 'left' }}>
              {t('admin.prod.imageRemove')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="mk-dropzone">
          {busy ? <><span className="mk-spinner" /> {t('admin.prod.imageUploading')}</> : <><Icon name="plus" size={16} /> {t('admin.prod.imageChoose')}</>}
        </button>
      )}
    </div>
  );
}

export function StatusPill({ label, tone = 'default' }) {
  const tones = {
    default: { background: 'var(--bg-2)', color: 'var(--ink-2)' },
    blue: { background: 'var(--accent-soft)', color: 'var(--accent-ink)' },
    green: { background: 'rgba(26,110,71,0.12)', color: 'var(--ok)' },
    amber: { background: 'rgba(168,72,26,0.12)', color: 'var(--warn)' },
    dark: { background: 'var(--ink)', color: '#fff' },
  };
  return <span className="mk-pill" style={tones[tone] || tones.default}><span className="mk-dot" />{label}</span>;
}

export function PrimaryBtn({ children, ...rest }) {
  return <button className="mk-btn mk-btn-primary mk-btn-sm" {...rest}>{children}</button>;
}
export function LightBtn({ children, ...rest }) {
  return <button className="mk-btn mk-btn-light mk-btn-sm" {...rest}>{children}</button>;
}

export function RowActions({ onEdit, onDelete }) {
  const { t } = useLang();
  return (
    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
      <button onClick={onEdit} className="mk-linkbtn">{t('admin.edit')}</button>
      <button onClick={onDelete} className="mk-linkbtn mk-linkbtn-danger">{t('admin.delete')}</button>
    </td>
  );
}

export function AdminError({ message }) {
  const { t } = useLang();
  if (!message) return null;
  return <div className="mk-error" role="alert" style={{ marginTop: 4 }}><Icon name="close" size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{t('admin.error')} {message}</div>;
}

// Loading / empty states for data tables.
export function AdminLoading({ rows = 5 }) {
  return (
    <div className="mk-stack" style={{ gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="mk-between" style={{ background: 'var(--surface)', padding: '14px 16px', gap: 16 }}>
          <Skeleton w="30%" h={14} /><Skeleton w={80} h={12} /><Skeleton w={60} h={12} /><Skeleton w={48} h={12} />
        </div>
      ))}
    </div>
  );
}

export function AdminEmpty({ icon = 'file', text }) {
  return (
    <div className="mk-card mk-center" style={{ padding: '56px 32px' }}>
      <Icon name={icon} size={28} style={{ color: 'var(--ink-4)', margin: '0 auto 12px' }} />
      <div className="mk-muted">{text}</div>
    </div>
  );
}
