import React, { useState } from 'react';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
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

  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />

      <section style={{ padding: '80px 40px 56px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">{t('docs.eyebrow')}</div>
          <h1 style={{ fontSize: 72, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>
            {t('docs.title')}
          </h1>
        </div>
        <div style={{ paddingTop: 80 }}>
          <p style={{ fontSize: 17, color: '#3a3d44', lineHeight: 1.6, margin: 0 }}>
            {t('docs.lead')}
          </p>
        </div>
      </section>

      <section style={{ padding: '0 40px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {CERTIFICATES.map((c, i) => (
            <button
              key={c.file}
              onClick={() => setOpen(i)}
              style={{
                background: '#fff', border: '1px solid var(--line)', padding: 0,
                cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column',
                transition: 'transform .18s, box-shadow .18s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(20,22,27,0.09)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{
                aspectRatio: '3 / 4', width: '100%', overflow: 'hidden',
                background: '#fafaf7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: '1px solid var(--line-soft)',
              }}>
                <img
                  src={`/certs/${c.file}`}
                  alt={c.name[lang] || c.name.en}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
              <div style={{ padding: '18px 20px 20px' }}>
                <div className="mk-mono" style={{ fontSize: 10.5, color: '#a7a9af', letterSpacing: '0.08em' }}>
                  № {String(i + 1).padStart(2, '0')} · {c.year}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                  {c.name[lang] || c.name.en}
                </div>
                <div style={{ fontSize: 12.5, color: '#74777e', marginTop: 6 }}>
                  {c.issuer[lang] || c.issuer.en}
                </div>
                <div style={{ fontSize: 12.5, color: '#1240e5', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t('docs.viewFull')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {open != null && (
        <div
          onClick={() => setOpen(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(20,22,27,0.78)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40, cursor: 'zoom-out',
          }}
        >
          <img
            src={`/certs/${CERTIFICATES[open].file}`}
            alt={CERTIFICATES[open].name[lang] || CERTIFICATES[open].name.en}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain', background: '#fff', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
          />
          <button
            onClick={() => setOpen(null)}
            style={{
              position: 'absolute', top: 24, right: 28, background: 'transparent',
              border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer',
            }}
          >×</button>
        </div>
      )}

      <StoreFooter />
    </div>
  );
}
