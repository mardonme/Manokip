import React from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { useLang } from '../lib/LangContext.jsx';

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />
      <section style={{ padding: '120px 40px', textAlign: 'center', minHeight: '50vh' }}>
        <div className="mk-mono" style={{ fontSize: 120, fontWeight: 700, color: '#1240e5', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {t('notfound.code')}
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em', margin: '16px 0 12px' }}>
          {t('notfound.title')}
        </h1>
        <p style={{ fontSize: 16, color: '#3a3d44', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
          {t('notfound.lead')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/"><button className="mk-btn mk-btn-primary">{t('notfound.home')}</button></Link>
          <Link to="/catalog"><button className="mk-btn mk-btn-light">{t('notfound.catalog')}</button></Link>
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}
