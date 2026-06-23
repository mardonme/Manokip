import React from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { Reveal, Icon, Section, SectionHead } from '../components/ui/index.js';
import { useLang } from '../lib/LangContext.jsx';

// Each solution maps to a real product category in the Manokip catalog.
// Tags list typical sectors where this category is deployed.
const SOL = [
  {
    n: '01',
    slug: 'manometers',
    t: { ru: 'Манометры', uz: 'Manometrlar', en: 'Manometers' },
    d: {
      ru: 'Механические и цифровые приборы для измерения избыточного давления, вакуума и мановакуума жидкостей и газов. Серии MP2, DM8008, EKM, VP3A — от компактных Ø50 до виброустойчивых Ø160.',
      uz: 'Suyuqlik va gaz bosimi, vakuum va vakuum-bosimni oʻlchash uchun mexanik va raqamli asboblar. MP2, DM8008, EKM, VP3A seriyalari — ixcham Ø50 dan tebranishga chidamli Ø160 gacha.',
      en: 'Mechanical and digital instruments for gauge, vacuum and compound pressure of liquids and gases. MP2, DM8008, EKM, VP3A series — from compact Ø50 to vibration-resistant Ø160.',
    },
    ind: {
      ru: ['Водоснабжение', 'Отопление', 'Компрессоры'],
      uz: ['Suv taʼminoti', 'Isitish', 'Kompressorlar'],
      en: ['Water supply', 'HVAC', 'Compressors'],
    },
  },
  {
    n: '02',
    slug: 'pressure-switches',
    t: { ru: 'Реле давления', uz: 'Bosim relelari', en: 'Pressure switches' },
    d: {
      ru: 'Механические реле RD-1U и реле перепада давления RD-2U для автоматического управления насосами, компрессорами и системами защиты. Диапазон от 0,05 до 25 бар.',
      uz: 'Nasoslar, kompressorlar va himoya tizimlarini avtomatik boshqarish uchun mexanik RD-1U relelari va RD-2U bosim farqi relelari. Diapazon 0,05 dan 25 barigacha.',
      en: 'Mechanical RD-1U pressure switches and RD-2U differential pressure switches for automatic control of pumps, compressors and protection systems. Range 0.05 to 25 bar.',
    },
    ind: {
      ru: ['Насосные станции', 'Котельные', 'Гидравлика'],
      uz: ['Nasos stansiyalari', 'Qozonxonalar', 'Gidravlika'],
      en: ['Pump stations', 'Boiler rooms', 'Hydraulics'],
    },
  },
  {
    n: '03',
    slug: 'solar-panels',
    t: { ru: 'Солнечные панели', uz: 'Quyosh panellari', en: 'Solar panels' },
    d: {
      ru: 'Моно- и поликристаллические панели MSP/PSP мощностью от 100 до 550 Вт для автономных и резервных систем электропитания: фермерские хозяйства, удалённые объекты, кровельные установки.',
      uz: 'Avtonom va zaxira elektr taʼminoti tizimlari uchun 100 dan 550 Vt gacha quvvatga ega mono va polikristalli MSP/PSP panellari: fermer xoʻjaliklari, uzoq obyektlar, tom oʻrnatmalari.',
      en: 'Monocrystalline and polycrystalline MSP/PSP panels from 100 W to 550 W for off-grid and backup power: farms, remote sites, rooftop installations.',
    },
    ind: {
      ru: ['Автономные системы', 'Сельское хозяйство', 'Резервное питание'],
      uz: ['Avtonom tizimlar', 'Qishloq xoʻjaligi', 'Zaxira quvvat'],
      en: ['Off-grid', 'Agriculture', 'Backup power'],
    },
  },
  {
    n: '04',
    slug: 'level-gauges',
    t: { ru: 'Уровнемеры', uz: 'Sath oʻlchagichlari', en: 'Level gauges' },
    d: {
      ru: 'Микроимпульсные (Umold-MLG, 0–20 м) и радарные (Umold-RLG, 0–35 м) уровнемеры для непрерывного измерения уровня жидкостей и сыпучих сред в резервуарах и силосах.',
      uz: 'Rezervuar va silos lardagi suyuqlik va sochiluvchi materiallar sathini uzluksiz oʻlchash uchun mikroimpulsli (Umold-MLG, 0–20 m) va radar (Umold-RLG, 0–35 m) sath oʻlchagichlari.',
      en: 'Microimpulse (Umold-MLG, 0–20 m) and radar (Umold-RLG, 0–35 m) level meters for continuous level measurement of liquids and bulk solids in tanks and silos.',
    },
    ind: {
      ru: ['Резервуары', 'Силосы', 'Водохранилища'],
      uz: ['Rezervuarlar', 'Siloslar', 'Suv omborlari'],
      en: ['Storage tanks', 'Silos', 'Reservoirs'],
    },
  },
  {
    n: '05',
    slug: 'protection-relays',
    t: { ru: 'Реле защиты', uz: 'Himoya relelari', en: 'Protection relays' },
    d: {
      ru: 'Универсальный блок защиты CYCLOP DEM-61 для контроля электрических параметров и аварийного отключения двигателей, насосов и трансформаторов в распределительных щитах.',
      uz: 'Taqsimot taxtalaridagi dvigatel, nasos va transformatorlarning elektr parametrlarini nazorat qilish va favqulodda oʻchirish uchun universal CYCLOP DEM-61 himoya bloki.',
      en: 'CYCLOP DEM-61 universal protection unit for monitoring electrical parameters and emergency shutdown of motors, pumps and transformers in distribution panels.',
    },
    ind: {
      ru: ['Распределительные щиты', 'Двигатели', 'Трансформаторы'],
      uz: ['Taqsimot taxtalari', 'Dvigatellar', 'Transformatorlar'],
      en: ['Switchgear', 'Motors', 'Transformers'],
    },
  },
];

export default function Solutions() {
  const { lang, t } = useLang();
  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">

        {/* HERO */}
        <Section as="section" size="sm" style={{ paddingTop: 80, paddingBottom: 56 }}>
          <Reveal variant="left">
            <div className="mk-eyebrow">{t('solutions.eyebrow')}</div>
            <h1 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '16px 0 0', maxWidth: 900 }}>
              {t('solutions.title')}
            </h1>
            <p className="mk-muted" style={{ fontSize: 18, marginTop: 24, maxWidth: 660, lineHeight: 1.55 }}>{t('solutions.lead')}</p>
          </Reveal>
        </Section>

        {/* SOLUTIONS GRID */}
        <Section as="section" size="sm" style={{ paddingTop: 0, paddingBottom: 96 }}>
          <div className="mk-grid-hair mk-cards-2">
            {SOL.map((s, i) => (
              <Reveal key={s.n} index={i} style={{ background: 'var(--surface)', padding: '40px 36px', minHeight: 280, display: 'flex', flexDirection: 'column' }}>
                <div className="mk-between" style={{ alignItems: 'flex-start', marginBottom: 20 }}>
                  <span className="mk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{s.n}</span>
                  <div className="mk-row mk-wrap" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    {(s.ind[lang] || s.ind.en).map((ind) => <span key={ind} className="mk-tag">{ind}</span>)}
                  </div>
                </div>
                <h3 style={{ fontSize: 'clamp(24px,3vw,32px)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{s.t[lang] || s.t.en}</h3>
                <p className="mk-muted" style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 12, flex: 1 }}>{s.d[lang] || s.d.en}</p>
                <Link to={`/catalog?category=${s.slug}`} className="mk-row mk-accent" style={{ fontSize: 13, marginTop: 16, gap: 6 }}>
                  {t('solutions.recommended')} <Icon name="arrow-right" size={15} className="mk-arrow" />
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>

      </main>
      <StoreFooter />
    </div>
  );
}
