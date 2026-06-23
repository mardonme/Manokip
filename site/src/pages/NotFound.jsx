import React from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Icon } from '../components/ui/index.js';
import { useLang } from '../lib/LangContext.jsx';

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="mk">
      <StoreHeader />
      <main id="main" className="mk-container mk-center" style={{ padding: '110px 0', minHeight: '50vh' }}>
        <div className="mk-mono" style={{ fontSize: 'clamp(80px,16vw,120px)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {t('notfound.code')}
        </div>
        <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '16px 0 12px' }}>{t('notfound.title')}</h1>
        <p className="mk-muted" style={{ fontSize: 16, maxWidth: 460, margin: '0 auto 30px', lineHeight: 1.6 }}>{t('notfound.lead')}</p>
        <div className="mk-row" style={{ gap: 12, justifyContent: 'center' }}>
          <Link to="/"><button className="mk-btn mk-btn-primary">{t('notfound.home')}</button></Link>
          <Link to="/catalog"><button className="mk-btn mk-btn-light">{t('notfound.catalog')} <Icon name="arrow-right" size={15} className="mk-arrow" /></button></Link>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
