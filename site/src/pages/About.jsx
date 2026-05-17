import React from 'react';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import { useLang } from '../lib/LangContext.jsx';

const COPY = {
  intro1: {
    ru: 'Manokip основан в 2018 году в Бектемирском районе Ташкента — трое инженеров, поверочный стенд и убеждение, что Центральная Азия заслуживает собственного производства точных приборов.',
    uz: 'Manokip 2018-yilda Toshkentning Bektemir tumanida tashkil etilgan — uchta muhandis, kalibrlash stendi va Markaziy Osiyo oʻzining aniq asboblar sanoatiga loyiq degan ishonch.',
    en: 'Manokip began in 2018 in Bektemir, Tashkent — three engineers, a calibration bench, and a conviction that Central Asia deserved its own precision instrument industry.',
  },
  intro2: {
    ru: 'Сегодня мы выпускаем 90+ приборов в пяти товарных группах и отгружаем в четырнадцать стран. Каждый прибор, покидающий завод, поверен по эталону «Узстандарт».',
    uz: 'Bugun beshta mahsulot guruhida 90+ asbob ishlab chiqaramiz va oʻn toʻrt davlatga yetkazib beramiz. Zavoddan chiqayotgan har bir asbob “Oʻzstandart” etaloni boʻyicha tekshiriladi.',
    en: 'Today we manufacture 90+ instruments across five product families and ship to fourteen countries. Every gauge that leaves our facility is verified against an O\'zStandart-traceable reference.',
  },
};

const STATS = [
  { n: '7+',     l: { ru: 'лет производства',        uz: 'yillik ishlab chiqarish', en: 'years in production' }, s: { ru: 'основан в 2018', uz: '2018-yilda tashkil etilgan', en: 'Founded 2018' } },
  { n: '90+',   l: { ru: 'приборов в каталоге',     uz: 'katalogdagi asbob',       en: 'instruments cataloged' }, s: { ru: '5 групп',       uz: '5 guruh',                    en: '5 families' } },
  { n: '1 200+', l: { ru: 'корпоративных клиентов', uz: 'korxona mijozlari',       en: 'enterprise clients' },    s: { ru: '14 стран',     uz: '14 davlatda',                en: 'Across 14 countries' } },
  { n: '14 000+', l: { ru: 'поверок в год',         uz: 'yiliga tekshiruv',        en: 'units verified / year' }, s: { ru: '«Узстандарт»',  uz: '“Oʻzstandart”',             en: "O'zStandart accredited" } },
];

export default function About() {
  const { lang, t } = useLang();
  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />
      <section style={{ padding: '80px 40px 60px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 80 }}>
        <div>
          <div className="mk-eyebrow">{t('about.eyebrow')}</div>
          <h1 style={{ fontSize: 76, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1, margin: '16px 0 0' }}>
            {t('about.title.a')}<br />
            <span style={{ color: '#74777e' }}>{t('about.title.b')}</span><br />
            {t('about.title.c')}
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 80 }}>
          <p style={{ fontSize: 16.5, color: '#3a3d44', lineHeight: 1.65, margin: 0 }}>{COPY.intro1[lang] || COPY.intro1.en}</p>
          <p style={{ fontSize: 16.5, color: '#3a3d44', lineHeight: 1.65, margin: 0 }}>{COPY.intro2[lang] || COPY.intro2.en}</p>
        </div>
      </section>
      <section style={{ padding: '0 40px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {STATS.map((it) => (
            <div key={it.n} style={{ background: '#fff', padding: '36px 28px' }}>
              <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>{it.n}</div>
              <div style={{ fontSize: 14, marginTop: 14 }}>{it.l[lang] || it.l.en}</div>
              <div style={{ fontSize: 12, color: '#74777e', marginTop: 4 }}>{it.s[lang] || it.s.en}</div>
            </div>
          ))}
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}
