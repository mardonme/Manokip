import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Reveal, Icon, Section } from '../components/ui/index.js';
import { api } from '../lib/api.js';
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

// Build a CSV price list from the live catalog and trigger a download.
async function fetchAllProducts() {
  const first = await api.get('/api/products', { page: 1, limit: 60 });
  let items = first.items || [];
  const pages = first.pages || 1;
  for (let p = 2; p <= pages; p++) {
    const next = await api.get('/api/products', { page: p, limit: 60 });
    items = items.concat(next.items || []);
  }
  return items;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Service() {
  const { lang, t } = useLang();
  const [priceBusy, setPriceBusy] = useState(false);

  async function downloadPriceList() {
    setPriceBusy(true);
    try {
      const products = await fetchAllProducts();
      const header = ['SKU', 'Model', 'Category', 'Range', 'Accuracy', 'Price'];
      const rows = products.map((p) => [
        p.sku, p.model, p.category?.name || p.cat || '', p.range, p.accuracy || '', p.priceText,
      ]);
      const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manokip-price-list-${lang}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Price list failed:', e);
      window.alert(t('service.priceList.error'));
    } finally {
      setPriceBusy(false);
    }
  }

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">

        {/* BREADCRUMB */}
        <div className="mk-container mk-mono" style={{ paddingTop: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <span className="mk-eyebrow">
            <Link to="/" className="mk-ulink">{t('catalog.crumbHome')}</Link> / {t('nav.service')}
          </span>
        </div>

        {/* HERO */}
        <Section as="section" size="sm" style={{ paddingTop: 72, paddingBottom: 56 }}>
          <div className="mk-split">
            <Reveal variant="left">
              <div className="mk-eyebrow">{t('service.eyebrow')}</div>
              <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.02, margin: '16px 0 0' }}>
                {t('service.title.a')}<br />{t('service.title.b')}
              </h1>
            </Reveal>
            <Reveal index={1} style={{ alignSelf: 'center' }}>
              <p className="mk-muted" style={{ fontSize: 17, lineHeight: 1.6, margin: 0 }}>{t('service.lead')}</p>
              <div className="mk-row mk-wrap" style={{ gap: 12, marginTop: 24 }}>
                <Link to="/contact"><button className="mk-btn mk-btn-primary">{t('service.schedule')} <Icon name="arrow-right" size={15} className="mk-arrow" /></button></Link>
                <button className="mk-btn mk-btn-light" onClick={downloadPriceList} disabled={priceBusy}>
                  {priceBusy ? <><span className="mk-spinner" /> {t('service.priceList.preparing')}</> : <>{t('service.priceList')} <Icon name="file" size={15} /></>}
                </button>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* SERVICES */}
        <Section as="section" size="sm" style={{ paddingTop: 0, paddingBottom: 80 }}>
          <div className="mk-grid-hair">
            {SERVICES.map((s, i) => (
              <Reveal key={s.n} index={i} style={{ background: 'var(--surface)', padding: '40px 36px' }}>
                <div className="mk-2col" style={{ gap: 32 }}>
                  <div className="mk-row" style={{ alignItems: 'flex-start', gap: 24 }}>
                    <span className="mk-mono" style={{ fontSize: 12, color: 'var(--ink-4)', letterSpacing: '0.06em', flexShrink: 0 }}>{s.n}</span>
                    <div>
                      <h3 style={{ fontSize: 'clamp(22px,2.6vw,28px)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{s.t[lang] || s.t.en}</h3>
                      <div className="mk-muted" style={{ fontSize: 13, marginTop: 6 }}>{s.sub[lang] || s.sub.en}</div>
                    </div>
                  </div>
                  <div className="mk-row mk-wrap" style={{ alignItems: 'flex-start', gap: 32, justifyContent: 'space-between' }}>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 220 }}>
                      {(s.d[lang] || s.d.en).map((line) => (
                        <li key={line} className="mk-accent" style={{ fontSize: 14, display: 'flex', gap: 10, lineHeight: 1.5 }}>
                          <Icon name="check" size={15} style={{ color: 'var(--ink-4)', marginTop: 2 }} />{line}
                        </li>
                      ))}
                    </ul>
                    <div className="mk-stack" style={{ gap: 10 }}>
                      {s.meta.map((m) => (
                        <div key={m} className="mk-mono mk-num" style={{ fontSize: 13, color: 'var(--ink)' }}>{m}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

      </main>
      <StoreFooter />
    </div>
  );
}
