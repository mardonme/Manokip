import React from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { useLang } from '../lib/LangContext.jsx';

const SERVICES = [
  {
    n: '01',
    t: { ru: 'Калибровка и поверка', uz: 'Kalibrlash va tekshirish', en: 'Calibration & verification' },
    sub: { ru: 'Лаборатория «Узстандарт»', uz: '“Oʻzstandart” laboratoriyasi', en: "O'zStandart-accredited laboratory" },
    d: {
      ru: ['Государственная поверка манометров, термоманометров, термометров', 'Периодическая поверка 12 / 24 мес.', 'Калибровка и настройка мано- и вакуумметров'],
      uz: ['Manometrlar, termomanometrlar, termometrlarni davlat tekshiruvi', 'Davriy tekshirish 12 / 24 oy', 'Mano- va vakuummetrlarni kalibrlash va sozlash'],
      en: ['State verification of pressure gauges, thermomanometers and thermometers', 'Periodic verification on a 12 / 24-month cycle', 'Adjustment and calibration of mano- and vacuumeters'],
    },
    meta: ['48h', '±0.05%', '14 000+ / yr'],
  },
  {
    n: '02',
    t: { ru: 'Ремонт приборов', uz: 'Asboblarni taʼmirlash', en: 'Repair of measuring instruments' },
    sub: { ru: 'Manokip и сторонние', uz: 'Manokip va boshqa ishlab chiqaruvchilar', en: 'Manokip-built or third-party' },
    d: {
      ru: ['Ремонт биметаллических термометров (серия ТБф)', 'Ремонт термоманометров (ФТ, МТТ)', 'Ремонт мановакуумметров и манометров'],
      uz: ['Bimetallik termometrlarni taʼmirlash (TBf seriyasi)', 'Termomanometrlarni taʼmirlash (FT, MTT)', 'Vakuummetr va manometrlarni taʼmirlash'],
      en: ['Repair of bimetallic thermometers (TBf series)', 'Repair of thermomanometers (FT, MTT)', 'Repair of vacuum gauges and pressure gauges'],
    },
    meta: ['5 days', 'OEM', '12 mo'],
  },
  {
    n: '03',
    t: { ru: 'Документация', uz: 'Hujjatlar', en: 'Documentation & certification' },
    sub: { ru: 'Полный пакет', uz: 'Toʻliq paket', en: 'Full traceable paperwork' },
    d: {
      ru: ['Сертификаты калибровки с прослеживаемостью до национальных эталонов', 'Восстановление паспортов и руководств', 'Поддержка таможенных и экспортных деклараций'],
      uz: ['Milliy etalonlarga kuzatib boriladigan kalibrlash sertifikatlari', 'Pasport va qoʻllanmalarni tiklash', 'Bojxona va eksport deklaratsiyalarini qoʻllab-quvvatlash'],
      en: ['Calibration certificates traceable to national standards', 'Passport and operating manual reissue', 'Customs and export declaration support'],
    },
    meta: ['Same-day', 'RU/EN/UZ', 'Digital + stamped'],
  },
];

export default function Service() {
  const { lang, t } = useLang();
  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />
      <div style={{ padding: '20px 40px', borderBottom: '1px solid var(--line)' }} className="mk-mono">
        <span style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <Link to="/">{t('catalog.crumbHome')}</Link> / {t('nav.service')}
        </span>
      </div>
      <section style={{ padding: '72px 40px 56px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">{t('service.eyebrow')}</div>
          <h1 style={{ fontSize: 76, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>
            {t('service.title.a')}<br />{t('service.title.b')}
          </h1>
        </div>
        <div style={{ paddingTop: 80 }}>
          <p style={{ fontSize: 17, color: '#3a3d44', lineHeight: 1.6, margin: 0 }}>{t('service.lead')}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Link to="/contact"><button className="mk-btn mk-btn-primary mk-btn-sm">{t('service.schedule')}</button></Link>
            <button className="mk-btn mk-btn-light mk-btn-sm">{t('service.priceList')}</button>
          </div>
        </div>
      </section>
      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {SERVICES.map((s) => (
            <div key={s.n} style={{ background: '#fff', display: 'grid', gridTemplateColumns: '80px 1fr 1.4fr 1fr', gap: 32, padding: '40px 36px', alignItems: 'flex-start' }}>
              <span className="mk-mono" style={{ fontSize: 12, color: '#a7a9af', letterSpacing: '0.06em' }}>{s.n}</span>
              <div>
                <h3 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{s.t[lang] || s.t.en}</h3>
                <div style={{ fontSize: 13, color: '#74777e', marginTop: 6 }}>{s.sub[lang] || s.sub.en}</div>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(s.d[lang] || s.d.en).map((line) => (
                  <li key={line} style={{ fontSize: 14, color: '#1240e5', display: 'flex', gap: 10, lineHeight: 1.5 }}>
                    <span style={{ color: '#a7a9af', flexShrink: 0 }}>—</span>{line}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.meta.map((m) => (
                  <div key={m} className="mk-mono" style={{ fontSize: 13, color: '#14161b', textAlign: 'right' }}>{m}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}
