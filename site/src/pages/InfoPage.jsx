import React from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { useLang } from '../lib/LangContext.jsx';

// A simple, real content page used for the footer "Company" destinations.
// `page` selects which set of i18n keys to render. All content is trilingual.
export default function InfoPage({ page }) {
  const { t } = useLang();
  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />
      <section style={{ padding: '80px 40px 60px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">{t(`info.${page}.eyebrow`)}</div>
          <h1 style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.02, margin: '16px 0 0' }}>
            {t(`info.${page}.title`)}
          </h1>
        </div>
        <div style={{ paddingTop: 60 }}>
          <p style={{ fontSize: 17, color: '#3a3d44', lineHeight: 1.65, margin: 0 }}>
            {t(`info.${page}.body`)}
          </p>
          <Link to="/contact" style={{ display: 'inline-block', marginTop: 28 }}>
            <button className="mk-btn mk-btn-primary">{t('info.contactUs')}</button>
          </Link>
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}
