import React, { useState, useEffect } from 'react';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Reveal, Icon } from '../components/ui/index.js';
import { useLang } from '../lib/LangContext.jsx';

// 7 certificates, each with a trilingual display name and an image in /certs.
const CERTIFICATES = [
  {
    file: 'sertifikat1.jpg',
    name: {
      ru: 'Сертификат соответствия — Манометры',
      uz: 'Muvofiqlik sertifikati — Manometrlar',
      en: 'Certificate of Conformity — Manometers',
    },
    issuer: { ru: 'Узстандарт', uz: 'Oʻzstandart', en: 'O\'zStandart' },
    year: '2024',
  },
  {
    file: 'sertifikat2.jpg',
    name: {
      ru: 'Свидетельство о поверке',
      uz: 'Tekshiruv guvohnomasi',
      en: 'Verification Certificate',
    },
    issuer: { ru: 'Узстандарт', uz: 'Oʻzstandart', en: 'O\'zStandart' },
    year: '2025',
  },
  {
    file: 'sertifikat3.png',
    name: {
      ru: 'Сертификат ISO 9001:2015',
      uz: 'ISO 9001:2015 sertifikati',
      en: 'ISO 9001:2015 Certificate',
    },
    issuer: { ru: 'TÜV International', uz: 'TÜV International', en: 'TÜV International' },
    year: '2023',
  },
  {
    file: 'sertifikat4.jpg',
    name: {
      ru: 'Декларация соответствия ЕАЭС',
      uz: 'EAII muvofiqlik deklaratsiyasi',
      en: 'EAEU Declaration of Conformity',
    },
    issuer: { ru: 'EAC', uz: 'EAC', en: 'EAC' },
    year: '2024',
  },
  {
    file: 'sertifikat5.jpg',
    name: {
      ru: 'Сертификат — Реле давления',
      uz: 'Sertifikat — Bosim relelari',
      en: 'Certificate — Pressure Switches',
    },
    issuer: { ru: 'Узстандарт', uz: 'Oʻzstandart', en: 'O\'zStandart' },
    year: '2024',
  },
  {
    file: 'sertifikat6.jpg',
    name: {
      ru: 'Сертификат — Солнечные панели',
      uz: 'Sertifikat — Quyosh panellari',
      en: 'Certificate — Solar Panels',
    },
    issuer: { ru: 'IEC', uz: 'IEC', en: 'IEC' },
    year: '2025',
  },
  {
    file: 'sertifikat7.jpg',
    name: {
      ru: 'Лицензия на производство',
      uz: 'Ishlab chiqarish litsenziyasi',
      en: 'Manufacturing Licence',
    },
    issuer: { ru: 'Министерство промышленности РУz', uz: 'OʻzR Sanoat vazirligi', en: 'Ministry of Industry of Uzbekistan' },
    year: '2022',
  },
];

export default function Documents() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(null);

  // Escape to close + lock scroll while the lightbox is open.
  useEffect(() => {
    if (open == null) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  // The translated "view original" copy ships with a trailing arrow glyph;
  // strip it so we can render a consistent icon instead.
  const viewFull = t('docs.viewFull').replace(/\s*→\s*$/, '');

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">

        <div className="mk-container" style={{ paddingTop: 72, paddingBottom: 48 }}>
          <div className="mk-split" style={{ alignItems: 'flex-end' }}>
            <Reveal variant="left">
              <div className="mk-eyebrow">{t('docs.eyebrow')}</div>
              <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.02, margin: '16px 0 0' }}>
                {t('docs.title')}
              </h1>
            </Reveal>
            <Reveal index={1}>
              <p className="mk-muted" style={{ fontSize: 17, lineHeight: 1.6, margin: 0, maxWidth: 460 }}>
                {t('docs.lead')}
              </p>
            </Reveal>
          </div>
        </div>

        <div className="mk-container" style={{ paddingBottom: 96 }}>
          <div className="mk-grid mk-cards-4">
            {CERTIFICATES.map((c, i) => {
              const label = c.name[lang] || c.name.en;
              return (
                <Reveal
                  key={c.file}
                  as="button"
                  index={i}
                  variant="up"
                  type="button"
                  onClick={() => setOpen(i)}
                  className="mk-card mk-card-hover"
                  aria-label={`${label} — ${viewFull}`}
                  style={{ padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{
                    aspectRatio: '3 / 4', width: '100%', overflow: 'hidden',
                    background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1px solid var(--line-soft)',
                  }}>
                    <img
                      src={`/certs/${c.file}`}
                      alt={`${label} — ${c.issuer[lang] || c.issuer.en}, ${c.year}`}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    />
                  </div>
                  <div style={{ padding: '18px 20px 20px' }}>
                    <div className="mk-mono mk-num" style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.08em' }}>
                      № {String(i + 1).padStart(2, '0')} · {c.year}
                    </div>
                    <div className="mk-row" style={{ gap: 8, marginTop: 8 }}>
                      <Icon name="file" size={16} style={{ color: 'var(--accent-ink)' }} />
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                        {label}
                      </div>
                    </div>
                    <div className="mk-muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                      {c.issuer[lang] || c.issuer.en}
                    </div>
                    <div className="mk-accent mk-row" style={{ fontSize: 12.5, marginTop: 12, gap: 6 }}>
                      {viewFull} <Icon name="arrow-right" size={15} className="mk-arrow" />
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

      </main>

      {open != null && (
        <div
          className="mk mk-modal-scrim"
          onClick={() => setOpen(null)}
          style={{ cursor: 'zoom-out' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={CERTIFICATES[open].name[lang] || CERTIFICATES[open].name.en}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '92%', maxHeight: '92%', cursor: 'default' }}
          >
            <img
              src={`/certs/${CERTIFICATES[open].file}`}
              alt={CERTIFICATES[open].name[lang] || CERTIFICATES[open].name.en}
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', background: 'var(--surface)', boxShadow: 'var(--shadow-pop)' }}
            />
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mk-iconbtn"
              aria-label="Close"
              autoFocus
              style={{ position: 'absolute', top: -48, right: 0, color: 'var(--on-ink)' }}
            >
              <Icon name="close" size={22} />
            </button>
          </div>
        </div>
      )}

      <StoreFooter />
    </div>
  );
}
