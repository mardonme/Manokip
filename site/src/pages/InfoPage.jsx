import React from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Reveal, Icon } from '../components/ui/index.js';
import { useLang } from '../lib/LangContext.jsx';

// A simple, real content page used for the footer "Company" destinations.
// `page` selects which set of i18n keys to render. All content is trilingual.
export default function InfoPage({ page }) {
  const { t } = useLang();
  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">
        <div className="mk-container" style={{ paddingTop: 80, paddingBottom: 60 }}>
          <div className="mk-2col">
            <Reveal variant="left">
              <div className="mk-eyebrow">{t(`info.${page}.eyebrow`)}</div>
              <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.02, margin: '16px 0 0' }}>
                {t(`info.${page}.title`)}
              </h1>
            </Reveal>
            <Reveal index={1} style={{ paddingTop: 60 }}>
              <p className="mk-muted" style={{ fontSize: 17, lineHeight: 1.65, margin: 0 }}>
                {t(`info.${page}.body`)}
              </p>
              <Link to="/contact" style={{ display: 'inline-block', marginTop: 28 }}>
                <button className="mk-btn mk-btn-primary">
                  {t('info.contactUs').replace(/\s*→\s*$/, '')} <Icon name="arrow-right" size={16} className="mk-arrow" />
                </button>
              </Link>
            </Reveal>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
